import logging
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy import func
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.user import UserRegister, UserLogin, UserOut, Token
from core.security import (
    hash_password, verify_password, validate_password, create_access_token,
    get_current_user, get_current_admin,
)
from core.email import send_verification_email, send_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])
log = logging.getLogger(__name__)

# Хеш для выравнивания времени ответа, когда пользователь не найден (защита от перебора email)
_DUMMY_HASH = hash_password("dummy-password")


def _make_token() -> str:
    return secrets.token_urlsafe(32)


def _send_safe(fn, *args):
    """Обёртка для фоновой отправки email — ошибки не роняют запрос."""
    try:
        fn(*args)
    except Exception as e:
        log.error("Ошибка отправки письма: %s", e)


@router.post("/register", response_model=UserOut)
def register(data: UserRegister, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    validate_password(data.password)
    existing = db.query(User).filter(func.lower(User.email) == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email уже используется")

    token = _make_token()
    expires = datetime.now(timezone.utc) + timedelta(hours=24)

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        email_token=token,
        email_token_expires=expires,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    background_tasks.add_task(_send_safe, send_verification_email, user.email, token)

    return user


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == data.email).first()
    if not user:
        verify_password(data.password, _DUMMY_HASH)
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def get_me(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user


@router.get("/users/search")
def search_users(q: str = Query(min_length=3, max_length=50), db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    """Поиск пользователей — только для администратора (иначе утекают email всех пользователей)."""
    pattern = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
    users = db.query(User).filter(
        (User.email.ilike(pattern, escape="\\")) | (User.full_name.ilike(pattern, escape="\\"))
    ).limit(10).all()
    return [{"id": str(u.id), "full_name": u.full_name, "email": u.email} for u in users]


# --- Подтверждение email ---

@router.post("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_token == token).first()
    if not user:
        # Возможно токен уже использован — email уже подтверждён
        return {"ok": True, "message": "Email уже подтверждён! Можете войти."}
    if user.email_token_expires and user.email_token_expires < datetime.utcnow():
        raise HTTPException(400, "Ссылка истекла. Запросите новую.")
    user.is_verified = True
    user.email_token = None
    user.email_token_expires = None
    db.commit()
    return {"ok": True, "message": "Email подтверждён!"}


@router.post("/resend-verification")
def resend_verification(email: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == email.strip().lower()).first()
    if not user:
        return {"ok": True}
    if user.is_verified:
        return {"ok": True, "message": "Email уже подтверждён"}

    token = _make_token()
    user.email_token = token
    user.email_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    db.commit()

    background_tasks.add_task(_send_safe, send_verification_email, user.email, token)

    return {"ok": True}


# --- Сброс пароля ---

@router.post("/forgot-password")
def forgot_password(email: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == email.strip().lower()).first()
    if user:
        token = _make_token()
        user.reset_token = token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        background_tasks.add_task(_send_safe, send_reset_email, user.email, token)
    return {"ok": True, "message": "Если такой email зарегистрирован, письмо отправлено"}


class ResetPassword(BaseModel):
    token: str = Field(max_length=200)
    new_password: str = Field(max_length=128)


@router.post("/reset-password")
def reset_password(data: ResetPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == data.token).first()
    if not user:
        raise HTTPException(400, "Неверная или устаревшая ссылка")
    if user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
        raise HTTPException(400, "Ссылка истекла. Запросите сброс пароля заново.")
    validate_password(data.new_password)

    user.password_hash = hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"ok": True, "message": "Пароль успешно изменён"}


# --- Смена пароля авторизованным пользователем ---

class ChangePassword(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(max_length=128)

@router.post("/change-password")
def change_password(data: ChangePassword, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(400, "Неверный текущий пароль")
    validate_password(data.new_password)
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True}


class UpdateProfile(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=30)

@router.patch("/me", response_model=UserOut)
def update_profile(data: UpdateProfile, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.phone is not None:
        user.phone = data.phone
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)
