"""Notes schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NoteBase(BaseModel):
    title: str = Field(default="", max_length=200)
    content: str = Field(default="")
    color: str = Field(default="#FFF9C4", pattern=r"^#[0-9A-Fa-f]{6}$")


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    content: str | None = None
    color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")


class NotePositionUpdate(BaseModel):
    x: int
    y: int
    w: int
    h: int


class NoteResponse(NoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    x: int
    y: int
    w: int
    h: int
    z_index: int
    created_at: datetime
    updated_at: datetime


class NoteListResponse(BaseModel):
    notes: list[NoteResponse]
