from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from database import Base

class Post(Base):
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_published = Column(Boolean, default=False)
    image_filename = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Page(Base):
    __tablename__ = "pages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    is_published = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class EventResult(Base):
    __tablename__ = "event_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    rank = Column(String, nullable=True)
    score = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

class EventPhoto(Base):
    __tablename__ = "event_photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    filename = Column(String, nullable=False)
    caption = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class EventQuestion(Base):
    __tablename__ = "event_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    number = Column(Integer, nullable=False)
    kp_type = Column(String, nullable=True)  # КП, фотоКП, Старт, Финиш, Задача и т.д.
    text = Column(Text, nullable=False)
    correct_answer = Column(Text, nullable=True)
    max_points = Column(Integer, default=1)
    is_published = Column(Boolean, default=False)
    image_filename = Column(String, nullable=True)  # для фото-КП и задач с картинкой

    results = relationship("TeamQuestionResult", back_populates="question")


class TeamQuestionResult(Base):
    __tablename__ = "team_question_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey("event_questions.id"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    points_earned = Column(Integer, default=0)
    team_answer = Column(Text, nullable=True)

    question = relationship("EventQuestion", back_populates="results")


class EventPdf(Base):
    __tablename__ = "event_pdfs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    filename = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))