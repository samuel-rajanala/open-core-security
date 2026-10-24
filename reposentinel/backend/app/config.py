from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemma_model: str = "gemma-4-26b-a4b-it"
    github_token: str = ""
    frontend_origin: str = "http://localhost:5173"
    max_files: int = 12
    max_file_bytes: int = 45_000
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
