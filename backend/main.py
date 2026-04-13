from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import Base, engine
from routers import auth, events, teams, admin
import models
import os

Base.metadata.create_all(bind=engine)

# Добавляем новые колонки если они ещё не существуют (без Alembic)
from sqlalchemy import text
with engine.connect() as conn:
    conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_filename VARCHAR"))
    conn.execute(text("ALTER TABLE team_question_results ADD COLUMN IF NOT EXISTS team_answer TEXT"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_token VARCHAR"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_token_expires TIMESTAMP"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP"))
    conn.execute(text("ALTER TABLE teams ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'adult'"))
    conn.execute(text("ALTER TABLE event_questions ADD COLUMN IF NOT EXISTS image_filename VARCHAR"))
    conn.commit()

os.makedirs("uploads", exist_ok=True)

app = FastAPI(title="Event Platform API")

# CORS — читаем из env, по умолчанию localhost для разработки
_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(teams.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"status": "ok"}
