from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.note import (
    NoteCreate,
    NoteListResponse,
    NotePositionUpdate,
    NoteResponse,
    NoteUpdate,
)
from app.services.note_service import NoteService

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("", response_model=NoteListResponse)
async def list_notes(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all notes for the current user."""
    service = NoteService(db)
    notes = await service.get_notes(user.id)
    return NoteListResponse(notes=notes)


@router.post("", response_model=NoteResponse)
async def create_note(
    body: NoteCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new note."""
    service = NoteService(db)
    return await service.create_note(user.id, body)


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    body: NoteUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update note content, title, or color."""
    service = NoteService(db)
    note = await service.update_note(user.id, note_id, body)
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Note not found"
        )
    return note


@router.patch("/{note_id}/position", response_model=NoteResponse)
async def update_note_position(
    note_id: str,
    body: NotePositionUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update note grid position and size."""
    service = NoteService(db)
    note = await service.update_position(user.id, note_id, body)
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Note not found"
        )
    return note


@router.post("/{note_id}/bring-to-front", response_model=NoteResponse)
async def bring_note_to_front(
    note_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bring a note to the front (highest z-index)."""
    service = NoteService(db)
    note = await service.bring_to_front(user.id, note_id)
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Note not found"
        )
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a note."""
    service = NoteService(db)
    deleted = await service.delete_note(user.id, note_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Note not found"
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
