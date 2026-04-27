"""Run once to add new columns to existing tables."""
from database import engine
from sqlalchemy import text

migrations = [
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS city VARCHAR",
    "ALTER TABLE teams ADD COLUMN IF NOT EXISTS captain_name VARCHAR",
    "ALTER TABLE teams ADD COLUMN IF NOT EXISTS captain_phone VARCHAR",
    "ALTER TABLE teams ADD COLUMN IF NOT EXISTS member_count INTEGER",
    "ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT",
    "ALTER TABLE teams ADD COLUMN IF NOT EXISTS invite_code VARCHAR(12)",
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS results_pdf VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_imported BOOLEAN DEFAULT FALSE",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_teams_invite_code ON teams (invite_code) WHERE invite_code IS NOT NULL",
    "ALTER TABLE event_questions ADD COLUMN IF NOT EXISTS kp_type VARCHAR",
]

with engine.connect() as conn:
    for sql in migrations:
        conn.execute(text(sql))
        print(f"OK: {sql}")
    conn.commit()
print("Migration complete.")
