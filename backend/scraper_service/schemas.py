from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SubredditIn(BaseModel):
    name: str


class SubredditOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    name: str
    active: bool
    added_at: datetime


class ScrapeResult(BaseModel):
    subreddit: str
    fetched: int
    new_posts: int


class PostOut(BaseModel):
    model_config = {"from_attributes": True}
    id: UUID
    reddit_id: str
    subreddit: str
    title: str
    author: str
    upvote_score: int
    url: str
    created_utc: datetime
    fetched_at: datetime
