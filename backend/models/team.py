from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from database import Base

class Team(Base):
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    status = Column(String, default="registered")
    category = Column(String, default="adult")  # "adult" | "child"
    captain_name = Column(String, nullable=True)
    captain_phone = Column(String, nullable=True)
    member_count = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    invite_code = Column(String(12), unique=True, nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    event = relationship("Event", back_populates="teams")
    members = relationship("TeamMember", back_populates="team")

class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    guest_name = Column(String, nullable=True)
    guest_email = Column(String, nullable=True)
    role = Column(String, default="member")
    is_registered = Column(Boolean, default=False)

    team = relationship("Team", back_populates="members")