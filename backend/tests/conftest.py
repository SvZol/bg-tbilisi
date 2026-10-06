"""Тесты гоняются на SQLite и без отправки реальной почты — ни БД, ни SMTP не нужны."""
import os
import sys
import tempfile
import uuid

_workdir = tempfile.mkdtemp()
os.chdir(_workdir)  # uploads/ создаётся относительно текущей папки
os.environ.update(
    DATABASE_URL=f"sqlite:///{_workdir}/test.db",
    SECRET_KEY="test-secret-key-" + "x" * 32,
    ACCESS_TOKEN_EXPIRE_MINUTES="60",
)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.sql import sqltypes

# Postgres принимает UUID строкой, SQLite — нет; приводим поведение к одному.
_orig_bind = sqltypes.Uuid.bind_processor


def _bind(self, dialect):
    f = _orig_bind(self, dialect)
    return f and (lambda v: f(uuid.UUID(v) if isinstance(v, str) else v))


sqltypes.Uuid.bind_processor = _bind

import core.email as email_module
import models  # noqa: F401
from core.security import hash_password
from database import Base, SessionLocal, engine
from models.user import User
from routers import admin, auth, events, teams

PASSWORD = "password123"


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def outbox(monkeypatch):
    """Перехваченные письма: список (to, subject, html)."""
    sent = []
    monkeypatch.setattr(email_module, "send_email", lambda to, subject, html: sent.append((to, subject, html)))
    return sent


@pytest.fixture
def client(outbox):
    app = FastAPI()
    for r in (auth, events, teams, admin):
        app.include_router(r.router)
    return TestClient(app)


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


def make_user(db, email, role="user", verified=True, name=None):
    user = User(email=email, password_hash=hash_password(PASSWORD), full_name=name or email.split("@")[0],
                role=role, is_verified=verified)
    db.add(user)
    db.commit()
    return user


def auth_headers(client, email):
    token = client.post("/auth/login", json={"email": email, "password": PASSWORD}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_h(client, db):
    make_user(db, "admin@x.com", role="admin")
    return auth_headers(client, "admin@x.com")


@pytest.fixture
def user_h(client, db):
    make_user(db, "user@x.com")
    return auth_headers(client, "user@x.com")


@pytest.fixture
def event_id(client, admin_h):
    r = client.post("/admin/events", headers=admin_h, json={
        "title": "Игра", "starts_at": "2026-10-11T12:00:00", "ends_at": "2026-10-11T16:00:00",
        "reg_deadline": "2026-10-09T23:59:00"})
    assert r.status_code == 200
    client.patch(f"/admin/events/{r.json()['id']}/status?status=open", headers=admin_h)
    return r.json()["id"]
