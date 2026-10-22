from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr
    role: str
    created_at: datetime

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=160)
    message: str = Field(min_length=10, max_length=5000)

class ChallengeIn(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=10000)
    category: str = Field(min_length=2, max_length=60)
    difficulty: str = Field(pattern="^(beginner|intermediate|advanced)$")
    points: int = Field(ge=1, le=5000)
    flag: str = Field(min_length=4, max_length=256)
    is_published: bool = False

class ChallengeOut(BaseModel):
    id: int
    title: str
    description: str
    category: str
    difficulty: str
    points: int
    is_published: bool
    created_at: datetime

class SubmissionIn(BaseModel):
    flag: str = Field(min_length=1, max_length=256)

class AnnouncementIn(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    body: str = Field(min_length=5, max_length=10000)
    is_published: bool = False
