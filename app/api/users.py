from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, UserRole

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/users/login")


# ── Helpers ───────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_minutes: int = None) -> str:
    exp = expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=exp)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    creds_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if not user_id:
            raise creds_exc
    except JWTError:
        raise creds_exc

    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user or not user.is_active:
        raise creds_exc
    return user


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    total_orders: int
    total_spent: float
    churn_risk_score: float

    class Config:
        from_attributes = True


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserOut, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=uuid.uuid4(),
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        phone=req.phone,
        role=UserRole.customer,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "role": user.role,
        "full_name": user.full_name,
    }


# ── Profile ───────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Churn score updater (called by background job) ────────────────────────────

def compute_churn_score(user: User) -> float:
    """
    Simple rule-based churn score:
      - 0 orders        → 0.5 baseline
      - Inactive 90d+   → +0.4
      - Inactive 30-89d → +0.2
      - High spend (>10k) → -0.2 (loyal)
      - Low avg order   → +0.1
    Clamp to [0, 1].
    """
    score = 0.0
    if user.total_orders == 0:
        return 0.5

    days = user.days_since_last_order or 0
    if days >= 90:
        score += 0.4
    elif days >= 30:
        score += 0.2

    if user.total_spent > 10000:
        score -= 0.2
    elif user.total_spent < 500:
        score += 0.1

    if user.avg_order_value and user.avg_order_value < 300:
        score += 0.1

    return round(max(0.0, min(1.0, score)), 3)


@router.post("/admin/update-churn-scores")
def update_churn_scores(db: Session = Depends(get_db)):
    """Recalculate churn scores for all users. Run nightly."""
    users = db.query(User).filter(User.is_active == True).all()
    for user in users:
        user.churn_risk_score = compute_churn_score(user)
    db.commit()
    return {"updated": len(users), "message": "Churn scores refreshed"}
