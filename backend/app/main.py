from contextlib import asynccontextmanager
import hashlib
import hmac
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .config import settings
from .database import Base, engine, get_db
from .dependencies import current_user, admin_user
from .models import Announcement, Challenge, ContactMessage, Submission, User
from .schemas import RegisterIn, LoginIn, UserOut, TokenOut, ContactIn, ChallengeIn, ChallengeOut, SubmissionIn, AnnouncementIn
from .security import hash_password, verify_password, create_access_token

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Convenience for the initial deployment. Use Alembic migrations before schema changes.
    Base.metadata.create_all(bind=engine)
    if settings.jwt_secret == "CHANGE_ME_TO_A_LONG_RANDOM_SECRET" and settings.environment == "production":
        raise RuntimeError("Set a unique JWT_SECRET before production startup")
    if settings.bootstrap_admin_email:
        from sqlalchemy import select
        with Session(engine) as db:
            admin = db.scalar(select(User).where(User.email == settings.bootstrap_admin_email.lower()))
            if admin:
                admin.role = "admin"
                db.commit()
    yield

app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=False, allow_methods=["GET","POST","PATCH","DELETE"], allow_headers=["Authorization","Content-Type"])

@app.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name}

@app.post("/api/auth/register", response_model=TokenOut, status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    email = str(data.email).lower()
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(409, "An account with this email already exists")
    user = User(name=data.name.strip(), email=email, password_hash=hash_password(data.password), role="admin" if settings.bootstrap_admin_email and email == settings.bootstrap_admin_email.lower() else "member")
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account with this email already exists")
    db.refresh(user)
    return {"access_token": create_access_token(str(user.id)), "user": user}

@app.post("/api/auth/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == str(data.email).lower()).first()
    if not user or not user.is_active or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Email or password is incorrect")
    return {"access_token": create_access_token(str(user.id)), "user": user}

@app.get("/api/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user

@app.post("/api/contact", status_code=201)
def create_contact(data: ContactIn, db: Session = Depends(get_db)):
    item = ContactMessage(name=data.name.strip(), email=str(data.email).lower(), subject=data.subject.strip(), message=data.message.strip())
    db.add(item)
    db.commit()
    return {"message": "Your message has been received"}

@app.get("/api/admin/messages")
def list_messages(db: Session = Depends(get_db), _: User = Depends(admin_user)):
    rows = db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(200).all()
    return [{"id":x.id,"name":x.name,"email":x.email,"subject":x.subject,"message":x.message,"status":x.status,"created_at":x.created_at} for x in rows]

@app.get("/api/challenges", response_model=list[ChallengeOut])
def challenges(db: Session = Depends(get_db)):
    return db.query(Challenge).filter(Challenge.is_published.is_(True)).order_by(Challenge.points.asc()).all()

@app.post("/api/admin/challenges", response_model=ChallengeOut, status_code=201)
def create_challenge(data: ChallengeIn, db: Session = Depends(get_db), _: User = Depends(admin_user)):
    item = Challenge(title=data.title.strip(), description=data.description.strip(), category=data.category, difficulty=data.difficulty, points=data.points, flag_hash=hashlib.sha256(data.flag.encode()).hexdigest(), is_published=data.is_published)
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A challenge with this title already exists")
    db.refresh(item)
    return item

@app.delete("/api/admin/challenges/{challenge_id}", status_code=204)
def delete_challenge(challenge_id: int, db: Session = Depends(get_db), _: User = Depends(admin_user)):
    item = db.get(Challenge, challenge_id)
    if not item:
        raise HTTPException(404, "Challenge not found")
    db.delete(item)
    db.commit()

@app.post("/api/challenges/{challenge_id}/submissions")
def submit_flag(challenge_id: int, data: SubmissionIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    challenge = db.get(Challenge, challenge_id)
    if not challenge or not challenge.is_published:
        raise HTTPException(404, "Challenge not found")
    if db.query(Submission).filter_by(user_id=user.id, challenge_id=challenge_id, is_correct=True).first():
        return {"correct": True, "message": "You have already solved this challenge"}
    submitted_hash = hashlib.sha256(data.flag.encode()).hexdigest()
    correct = hmac.compare_digest(submitted_hash, challenge.flag_hash)
    row = Submission(user_id=user.id, challenge_id=challenge_id, is_correct=correct)
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A submission has already been recorded for this challenge")
    return {"correct": correct, "message": "Correct flag!" if correct else "Not quite. Keep investigating."}

@app.get("/api/leaderboard")
def leaderboard(db: Session = Depends(get_db)):
    rows = db.query(User.id, User.name, func.coalesce(func.sum(Challenge.points), 0).label("score"), func.count(Submission.id).label("solves")).join(Submission, Submission.user_id == User.id).join(Challenge, Challenge.id == Submission.challenge_id).filter(Submission.is_correct.is_(True), User.is_active.is_(True)).group_by(User.id, User.name).order_by(func.sum(Challenge.points).desc(), User.name.asc()).limit(100).all()
    return [{"user_id":r.id,"name":r.name,"score":int(r.score),"solves":int(r.solves)} for r in rows]

@app.get("/api/announcements")
def announcements(db: Session = Depends(get_db)):
    rows = db.query(Announcement).filter(Announcement.is_published.is_(True)).order_by(Announcement.created_at.desc()).limit(50).all()
    return [{"id":x.id,"title":x.title,"body":x.body,"created_at":x.created_at} for x in rows]

@app.post("/api/admin/announcements", status_code=201)
def create_announcement(data: AnnouncementIn, db: Session = Depends(get_db), _: User = Depends(admin_user)):
    item = Announcement(title=data.title.strip(), body=data.body.strip(), is_published=data.is_published)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id":item.id,"title":item.title,"is_published":item.is_published}

@app.get("/api/admin/members")
def members(db: Session = Depends(get_db), _: User = Depends(admin_user)):
    rows = db.query(User).order_by(User.created_at.desc()).limit(500).all()
    return [{"id":u.id,"name":u.name,"email":u.email,"role":u.role,"is_active":u.is_active,"created_at":u.created_at} for u in rows]
