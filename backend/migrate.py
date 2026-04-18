"""Run once to add new columns to existing tables."""
from database import engine
from sqlalchemy import text

migrations = [
    "ALTER TABLE events ADD COLUMN IF NOT EXISTS city VARCHAR",
    "ALTER TABLE teams ADD COLUMN IF NOT EXISTS captain_name VARCHAR",
    "ALTER TABLE teams ADD COLUMN IF NOT EXISTS captain_phone VARCHAR",
    "ALTER TABLE teams ADD COLUMN IF NOT EXISTS member_count INTEGER",
    "ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT",
]

with engine.connect() as conn:
    for sql in migrations:
        conn.execute(text(sql))
        print(f"OK: {sql}")
    conn.commit()
print("Migration complete.")
