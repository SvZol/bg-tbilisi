import os
from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from database import get_db

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY") or ""
# Алгоритм зафиксирован в коде: значение из env позволяло бы подменить его на слабый
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))

if len(SECRET_KEY) < 32:
    raise RuntimeError("SECRET_KEY не задан или короче 32 символов — проверьте .env")

MIN_PASSWORD_LENGTH = 8

bearer_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def validate_password(password: str) -> None:
    """bcrypt учитывает только первые 72 байта — длиннее не принимаем."""
    if len(password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(400, f"Пароль должен быть минимум {MIN_PASSWORD_LENGTH} символов")
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(400, "Пароль слишком длинный (максимум 72 байта)")


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def _user_id_from_credentials(credentials: HTTPAuthorizationCredentials) -> str:
    try:
        user_id = decode_token(credentials.credentials).get("sub")
        UUID(str(user_id))
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Невалидный токен")
    return user_id


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> str:
    """Возвращает id пользователя; токен удалённого пользователя отклоняется."""
    from models.user import User
    user_id = _user_id_from_credentials(credentials)
    if not db.query(User.id).filter(User.id == user_id).first():
        raise HTTPException(status_code=401, detail="Невалидный токен")
    return user_id


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    from models.user import User
    user_id = _user_id_from_credentials(credentials)
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Нет прав доступа")
    return user
