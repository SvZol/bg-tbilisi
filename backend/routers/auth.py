import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.user import UserRegister, UserLogin, UserOut, Token
from core.security import hash_password, verify_password, create_access_token, get_current_user
from core.email import send_verification_email, send_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])


def _make_token() -> str:
    return secrets.token_urlsafe(32)


def _send_safe(fn, *args):
    """Обёртка для фоновой отправки email — ошибки не роняют запрос."""
    try:
        fn(*args)
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")


@router.post("/register", response_model=UserOut)
def register(data: UserRegister, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
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
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def get_me(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user


@router.get("/users/search")
def search_users(q: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    users = db.query(User).filter(
        (User.email.ilike(f"%{q}%")) | (User.full_name.ilike(f"%{q}%"))
    ).limit(10).all()
    return [{"id": str(u.id), "full_name": u.full_name, "email": u.email} for u in users]


# --- Подтверждение email ---

@router.post("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_token == token).first()
    if not user:
        raise HTTPException(400, "Неверная или устаревшая ссылка")
    if user.email_token_expires and user.email_token_expires < datetime.now(timezone.utc):
        raise HTTPException(400, "Ссылка истекла. Запросите новую.")
    user.is_verified = True
    user.email_token = None
    user.email_token_expires = None
    db.commit()
    return {"ok": True, "message": "Email подтверждён!"}


@router.post("/resend-verification")
def resend_verification(email: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
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
    user = db.query(User).filter(User.email == email).first()
    if user:
        token = _make_token()
        user.reset_token = token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        background_tasks.add_task(_send_safe, send_reset_email, user.email, token)
    return {"ok": True, "message": "Если такой email зарегистрирован, письмо отправлено"}


@router.post("/reset-password")
def reset_password(token: str, new_password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == token).first()
    if not user:
        raise HTTPException(400, "Неверная или устаревшая ссылка")
    if user.reset_token_expires and user.reset_token_expires < datetime.now(timezone.utc):
        raise HTTPException(400, "Ссылка истекла. Запросите сброс пароля заново.")
    if len(new_password) < 6:
        raise HTTPException(400, "Пароль должен быть минимум 6 символов")

    user.password_hash = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"ok": True, "message": "Пароль успешно изменён"}
