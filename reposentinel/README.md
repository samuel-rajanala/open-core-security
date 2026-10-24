# RepoSentinel AI

Open Core | Hacktoberfest Hack Day Meerut × ECELL IIMT | PS 04

A cybersecurity-aware open-source contribution assistant. It inspects public GitHub repositories, investigates issues, grounds plans in repository evidence, runs static security checks, drafts reviewable patches, and reports CI verification without executing untrusted repository code.

## Stack
- React + Vite frontend
- FastAPI + httpx backend
- Google Gemma 4 through the Gemini API (google-genai)
- Optional Semgrep static analysis
- GitHub REST API

## Requirements
Python 3.11+, Node.js 20+, and a Google AI Studio API key. A GitHub token is optional and improves API rate limits for public repositories.

## Run locally

Backend terminal:
    cd reposentinel/backend
    python -m venv .venv
    # Windows PowerShell: .venv\Scripts\Activate.ps1
    # macOS/Linux: source .venv/bin/activate
    pip install -r requirements.txt
    copy .env.example .env
    # Add GEMINI_API_KEY to .env
    uvicorn app.main:app --reload --port 8000

Frontend terminal:
    cd reposentinel/frontend
    npm install
    npm run dev

Open http://localhost:5173. API docs: http://localhost:8000/docs.

## Model
Default model: gemma-4-26b-a4b-it. You can use gemma-4-31b-it by changing GEMMA_MODEL in backend/.env. The API key remains on the backend; never expose it through Vite environment variables.

## Workflow
1. Enter a public GitHub repository URL.
2. Inspect metadata, languages, README and file tree.
3. Enter an issue number and inspect the issue plus likely source files.
4. Generate an evidence-backed contribution plan with Gemma 4.
5. Run optional Semgrep static analysis on fetched Python files.
6. Draft a unified diff for human review.
7. Check GitHub Actions status for the latest branch commit.

## Safety
- Public repositories only; no arbitrary URL fetching.
- Repository source is untrusted data and is never executed.
- Static scanning is read-only.
- Generated patches are previews only: no automatic apply, commit, push, merge or PR creation.
- Verification reports remote GitHub check-run status; it does not claim tests were run locally.
- AI security observations are suggestions, not confirmed vulnerabilities.

## MVP limitations
Issue-to-file mapping is heuristic and model-assisted. Semgrep is optional. Unauthenticated GitHub API rate limits may apply. CI status reflects checks GitHub reports for the selected branch's latest commit.
