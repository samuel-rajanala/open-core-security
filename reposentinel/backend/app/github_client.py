import re
import base64
from urllib.parse import quote
import httpx
from fastapi import HTTPException
from .config import settings

API = "https://api.github.com"
REPO_RE = re.compile(r"^(?:https?://github\.com/)?([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?$")

def parse_repo(value: str) -> tuple[str, str]:
    match = REPO_RE.match(value.strip())
    if not match:
        raise HTTPException(400, "Enter a public GitHub repository URL like https://github.com/owner/repo")
    return match.group(1), match.group(2)

def headers():
    h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if settings.github_token:
        h["Authorization"] = f"Bearer {settings.github_token}"
    return h

async def get_json(path: str):
    async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
        response = await client.get(f"{API}{path}", headers=headers())
    if response.status_code == 404:
        raise HTTPException(404, "GitHub repository, issue, or resource not found.")
    if response.status_code == 403:
        raise HTTPException(429, "GitHub API rate limit or access restriction. Add a GitHub token to backend/.env.")
    if response.is_error:
        raise HTTPException(response.status_code, "GitHub API request failed.")
    return response.json()

async def repository(owner: str, repo: str):
    data = await get_json(f"/repos/{owner}/{repo}")
    if data.get("private") or data.get("visibility") == "private":
        raise HTTPException(403, "RepoSentinel MVP only supports public repositories.")
    return data

async def tree(owner: str, repo: str, branch: str):
    data = await get_json(f"/repos/{owner}/{repo}/git/trees/{quote(branch, safe='') }?recursive=1")
    return [x for x in data.get("tree", []) if x.get("type") == "blob"]

async def file_text(owner: str, repo: str, path: str, ref: str, max_bytes: int):
    data = await get_json(f"/repos/{owner}/{repo}/contents/{quote(path, safe='/')}?ref={quote(ref)}")
    if data.get("encoding") != "base64":
        return ""
    raw = base64.b64decode(data.get("content", ""))
    if len(raw) > max_bytes:
        return raw[:max_bytes].decode("utf-8", errors="replace") + "\n[TRUNCATED]"
    return raw.decode("utf-8", errors="replace")
