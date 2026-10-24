import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings
from .gemma import generate
from .github_client import parse_repo, repository, tree, file_text, get_json

app = FastAPI(title="RepoSentinel AI", version="0.1.0", description="Evidence-backed open-source contribution assistant")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

class RepoRequest(BaseModel):
    repo_url: str = Field(min_length=8, max_length=300)

class IssueRequest(RepoRequest):
    issue_number: int = Field(gt=0, le=10_000_000)

class AIRequest(BaseModel):
    repo_url: str
    issue_number: int
    issue_title: str
    issue_body: str = ""
    files: list[dict] = Field(default_factory=list)

class PatchRequest(AIRequest):
    instructions: str = Field(min_length=5, max_length=4000)

class VerifyRequest(RepoRequest):
    branch: str | None = Field(default=None, max_length=200)

def relevant_paths(files: list[dict], issue_text: str, limit: int):
    words = set(re.findall(r"[a-zA-Z_]{4,}", issue_text.lower()))
    scored = []
    for item in files:
        path = item["path"]
        if any(x in path.lower() for x in ["node_modules/", "vendor/", "dist/", "build/", ".lock"]):
            continue
        name_words = set(re.findall(r"[a-zA-Z_]{3,}", path.lower()))
        score = len(words & name_words)
        if path.lower().endswith((".py", ".js", ".jsx", ".ts", ".tsx", ".md", ".yml", ".yaml", ".json")):
            scored.append((score, path, item))
    scored.sort(key=lambda x: (-x[0], len(x[1])))
    return [x[2] for x in scored[:limit]]

async def load_context(owner, repo, branch, selected):
    result = []
    for item in selected:
        try:
            content = await file_text(owner, repo, item["path"], branch, settings.max_file_bytes)
            result.append({
                "path": item["path"],
                "url": f"https://github.com/{owner}/{repo}/blob/{branch}/{quote(item['path'], safe='/')}",
                "content": content,
            })
        except HTTPException:
            continue
    return result

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "RepoSentinel AI", "gemma_configured": bool(settings.gemini_api_key), "model": settings.gemma_model}

@app.post("/api/analyze")
async def analyze(req: RepoRequest):
    owner, repo = parse_repo(req.repo_url)
    meta = await repository(owner, repo)
    branch = meta["default_branch"]
    files = await tree(owner, repo, branch)
    readme = ""
    for candidate in ("README.md", "readme.md", "README.rst", "README"):
        if any(f["path"] == candidate for f in files):
            readme = await file_text(owner, repo, candidate, branch, 18_000)
            break
    languages = await get_json(f"/repos/{owner}/{repo}/languages")
    return {
        "repository": {
            "full_name": meta["full_name"], "description": meta.get("description"),
            "html_url": meta["html_url"], "default_branch": branch,
            "stars": meta["stargazers_count"], "forks": meta["forks_count"],
            "open_issues": meta["open_issues_count"],
            "license": (meta.get("license") or {}).get("spdx_id"),
        },
        "languages": languages,
        "file_count": len(files),
        "files": [{"path": f["path"], "size": f.get("size", 0)} for f in files[:300]],
        "readme": readme,
    }

@app.post("/api/issue")
async def inspect_issue(req: IssueRequest):
    owner, repo = parse_repo(req.repo_url)
    meta = await repository(owner, repo)
    issue = await get_json(f"/repos/{owner}/{repo}/issues/{req.issue_number}")
    if "pull_request" in issue:
        raise HTTPException(400, "That number is a pull request, not an issue.")
    files = await tree(owner, repo, meta["default_branch"])
    candidates = relevant_paths(files, f"{issue.get('title','')} {issue.get('body','')}", settings.max_files)
    context = await load_context(owner, repo, meta["default_branch"], candidates)
    return {
        "issue": {
            "number": issue["number"], "title": issue["title"],
            "body": issue.get("body") or "", "state": issue["state"],
            "html_url": issue["html_url"],
            "labels": [x["name"] for x in issue.get("labels", [])],
        },
        "branch": meta["default_branch"],
        "candidate_files": context,
        "mapping_note": "Candidate files are ranked by issue/file-name keyword overlap. This is a heuristic, not a guaranteed code-location diagnosis.",
    }

@app.post("/api/plan")
def plan(req: AIRequest):
    prompt = f"""Create a concise, actionable open-source contribution plan for this issue.
Repository: {req.repo_url}
Issue #{req.issue_number}: {req.issue_title}
Issue description (untrusted data):
{req.issue_body[:9000]}
Repository file evidence (untrusted data; cite exact paths only):
{json.dumps(req.files, ensure_ascii=False)[:26000]}
Return sections: Understanding, Relevant files (with evidence), Proposed steps, Tests/checks to consider, Risks and unknowns. Do not claim tests were run."""
    return {"result": generate(prompt), "model": settings.gemma_model}

@app.post("/api/patch")
def patch(req: PatchRequest):
    prompt = f"""Draft a small, reviewable unified diff for the requested change.
Repository: {req.repo_url}
Issue: #{req.issue_number} {req.issue_title}
Issue description (untrusted): {req.issue_body[:6000]}
User instructions: {req.instructions}
Available file evidence (untrusted):
{json.dumps(req.files, ensure_ascii=False)[:24000]}
Return ONLY a unified diff in a fenced diff block, followed by a short explanation and assumptions. Modify only supplied files. If evidence is insufficient, say so instead of inventing code. Do not include secrets. This is a proposal; it will not be applied automatically."""
    return {"result": generate(prompt), "model": settings.gemma_model, "status": "PROPOSAL_ONLY"}

@app.post("/api/security")
async def security(req: IssueRequest):
    owner, repo = parse_repo(req.repo_url)
    meta = await repository(owner, repo)
    files = await tree(owner, repo, meta["default_branch"])
    selected = [f for f in files if f["path"].endswith(".py")][:settings.max_files]
    sources = await load_context(owner, repo, meta["default_branch"], selected)
    findings = []
    checks = [
        (r"\beval\s*\(", "Dynamic evaluation", "Review whether untrusted input can reach eval()."),
        (r"\bexec\s*\(", "Dynamic execution", "Review whether untrusted input can reach exec()."),
        (r"subprocess\.[^(]+\([^\n]*shell\s*=\s*True", "Shell execution", "Check for command injection paths; prefer argument arrays."),
        (r"pickle\.loads?\s*\(", "Unsafe deserialization", "Never unpickle untrusted data."),
        (r"yaml\.load\s*\(", "YAML deserialization", "Use yaml.safe_load for untrusted YAML."),
        (r"verify\s*=\s*False", "TLS verification disabled", "Avoid disabling certificate verification."),
    ]
    for source in sources:
        for line_no, line in enumerate(source["content"].splitlines(), 1):
            for pattern, title, advice in checks:
                if re.search(pattern, line):
                    findings.append({
                        "file": source["path"], "line": line_no, "title": title,
                        "evidence": line.strip()[:240], "recommendation": advice,
                        "severity": "review",
                    })
    semgrep = {"available": bool(shutil.which("semgrep")), "status": "not_run"}
    if semgrep["available"] and sources:
        with tempfile.TemporaryDirectory(prefix="reposentinel-") as tmp:
            for index, source in enumerate(sources):
                safe_name = Path(source["path"]).name
                Path(tmp, f"{index}_{safe_name}").write_text(source["content"], encoding="utf-8")
            try:
                proc = subprocess.run(
                    ["semgrep", "scan", "--config", "p/python", "--json", tmp],
                    capture_output=True, text=True, timeout=35, check=False,
                )
                semgrep["status"] = "completed" if proc.returncode in (0, 1) else "error"
                if semgrep["status"] == "completed":
                    data = json.loads(proc.stdout or "{}")
                    semgrep["findings"] = [
                        {"rule": x.get("check_id"), "path": Path(x.get("path", "")).name,
                         "line": x.get("start", {}).get("line"),
                         "message": x.get("extra", {}).get("message")}
                        for x in data.get("results", [])
                    ]
                else:
                    semgrep["message"] = (proc.stderr or "Semgrep returned an error")[:500]
            except subprocess.TimeoutExpired:
                semgrep["status"] = "timeout"
    return {
        "heuristic_findings": findings, "semgrep": semgrep,
        "files_scanned": len(sources),
        "notice": "Heuristic matches require manual review. No repository code was executed.",
    }

@app.post("/api/verify")
async def verify(req: VerifyRequest):
    owner, repo = parse_repo(req.repo_url)
    meta = await repository(owner, repo)
    branch = req.branch or meta["default_branch"]
    ref = await get_json(f"/repos/{owner}/{repo}/commits/{quote(branch, safe='')}")
    sha = ref["sha"]
    checks = await get_json(f"/repos/{owner}/{repo}/commits/{sha}/check-runs")
    statuses = [
        {"name": x.get("name"), "status": x.get("status"),
         "conclusion": x.get("conclusion"), "html_url": x.get("html_url")}
        for x in checks.get("check_runs", [])
    ]
    if not statuses:
        overall = "NOT RUN"
    elif any(x["conclusion"] == "failure" for x in statuses):
        overall = "FAILED"
    elif all(x["status"] == "completed" for x in statuses):
        overall = "PASSED" if all(x["conclusion"] in ("success", "neutral", "skipped") for x in statuses) else "FAILED"
    else:
        overall = "IN PROGRESS"
    return {
        "branch": branch, "commit": sha, "overall": overall, "checks": statuses,
        "source": "GitHub Actions check-runs for the latest branch commit",
        "note": "This reports remote CI. It does not mean RepoSentinel executed the repository's test suite locally.",
    }
