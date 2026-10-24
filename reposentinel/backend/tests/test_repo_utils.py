import pytest
from fastapi import HTTPException

from app.github_client import parse_repo
from app.main import relevant_paths

def test_parse_full_github_url():
    assert parse_repo("https://github.com/psf/requests") == ("psf", "requests")

def test_parse_owner_repo_shorthand():
    assert parse_repo("psf/requests") == ("psf", "requests")

def test_reject_non_github_url():
    with pytest.raises(HTTPException):
        parse_repo("https://example.com/owner/repo")

def test_relevant_paths_prioritizes_matching_names():
    files = [
        {"path": "src/authentication.py"},
        {"path": "docs/usage.md"},
        {"path": "src/database.py"},
    ]
    result = relevant_paths(files, "authentication login token issue", 2)
    assert result[0]["path"] == "src/authentication.py"
