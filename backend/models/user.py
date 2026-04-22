from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    role = Column(String, default="user")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login_at = Column(DateTime, nullable=True)

    # Email verification
    email_token = Column(String, nullable=True)
    email_token_expires = Column(DateTime, nullable=True)

    # Password reset
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
