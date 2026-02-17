"""Notes service."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.note import Note
from app.schemas.note import NoteCreate, NotePositionUpdate, NoteUpdate


class NoteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_notes(self, user_id: str) -> list[Note]:
        """Get all notes for a user, ordered by z_index desc, then created_at."""
        result = await self.db.execute(
            select(Note)
            .where(Note.user_id == user_id)
            .order_by(Note.z_index.desc(), Note.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_note(self, user_id: str, note_id: str) -> Note | None:
        """Get a specific note by ID."""
        result = await self.db.execute(
            select(Note).where(Note.id == note_id, Note.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_note(self, user_id: str, data: NoteCreate) -> Note:
        """Create a new note with default position."""
        # Find next available position
        x, y = await self._find_next_position(user_id)

        # Get max z_index
        max_z_result = await self.db.execute(
            select(func.max(Note.z_index)).where(Note.user_id == user_id)
        )
        max_z = max_z_result.scalar_one_or_none()
        z_index = (max_z or 0) + 1

        note = Note(
            user_id=user_id,
            title=data.title,
            content=data.content,
            color=data.color,
            x=x,
            y=y,
            z_index=z_index,
        )
        self.db.add(note)
        await self.db.commit()
        await self.db.refresh(note)
        return note

    async def update_note(
        self, user_id: str, note_id: str, data: NoteUpdate
    ) -> Note | None:
        """Update note content, title, or color."""
        note = await self.get_note(user_id, note_id)
        if note is None:
            return None

        if data.title is not None:
            note.title = data.title
        if data.content is not None:
            note.content = data.content
        if data.color is not None:
            note.color = data.color

        await self.db.commit()
        await self.db.refresh(note)
        return note

    async def update_position(
        self, user_id: str, note_id: str, data: NotePositionUpdate
    ) -> Note | None:
        """Update note grid position."""
        note = await self.get_note(user_id, note_id)
        if note is None:
            return None

        note.x = data.x
        note.y = data.y
        note.w = data.w
        note.h = data.h

        await self.db.commit()
        await self.db.refresh(note)
        return note

    async def bring_to_front(self, user_id: str, note_id: str) -> Note | None:
        """Bring a note to the front by setting highest z_index."""
        note = await self.get_note(user_id, note_id)
        if note is None:
            return None

        # Get current max z_index
        max_z_result = await self.db.execute(
            select(func.max(Note.z_index)).where(Note.user_id == user_id)
        )
        max_z = max_z_result.scalar_one_or_none()

        # Only update if not already at front
        if max_z is not None and note.z_index < max_z:
            note.z_index = max_z + 1
            await self.db.commit()
            await self.db.refresh(note)

        return note

    async def delete_note(self, user_id: str, note_id: str) -> bool:
        """Delete a note."""
        note = await self.get_note(user_id, note_id)
        if note is None:
            return False

        await self.db.delete(note)
        await self.db.commit()
        return True

    async def _find_next_position(self, user_id: str) -> tuple[int, int]:
        """Find the next available grid position for a new note."""
        # Get all existing positions
        result = await self.db.execute(
            select(Note.x, Note.y, Note.w, Note.h).where(Note.user_id == user_id)
        )
        positions = result.all()

        # Simple strategy: place at x=0, y=max_y+1
        if not positions:
            return 0, 0

        max_y = max(y for _, y, _, _ in positions)
        return 0, max_y + 3  # Leave some space between notes
