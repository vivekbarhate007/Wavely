from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = {"schema": "sentiment"}

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reddit_id    = Column(String(32),  nullable=False, unique=True)
    subreddit    = Column(String(128), nullable=False)
    title        = Column(Text,        nullable=False)
    body         = Column(Text,        nullable=False, default="")
    author       = Column(String(128), nullable=False, default="[deleted]")
    upvote_score = Column(Integer,     nullable=False, default=0)
    url          = Column(Text,        nullable=False)
    created_utc  = Column(DateTime(timezone=True), nullable=False)
    fetched_at   = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class WatchedSubreddit(Base):
    __tablename__ = "watched_subreddits"
    __table_args__ = {"schema": "sentiment"}

    id       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name     = Column(String(128), nullable=False, unique=True)
    active   = Column(Boolean, nullable=False, default=True)
    added_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
