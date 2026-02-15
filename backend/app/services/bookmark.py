from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.widget import Bookmark


class BookmarkService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_bookmarks(self, user_id: str) -> list[Bookmark]:
        result = await self.db.execute(
            select(Bookmark)
            .where(Bookmark.user_id == user_id)
            .order_by(Bookmark.category, Bookmark.position)
        )
        return list(result.scalars().all())

    async def create_bookmark(self, user_id: str, **kwargs) -> Bookmark:
        bookmark = Bookmark(user_id=user_id, **kwargs)
        self.db.add(bookmark)
        await self.db.commit()
        await self.db.refresh(bookmark)
        return bookmark

    async def update_bookmark(
        self, user_id: str, bookmark_id: str, **kwargs
    ) -> Bookmark | None:
        result = await self.db.execute(
            select(Bookmark).where(
                Bookmark.id == bookmark_id, Bookmark.user_id == user_id
            )
        )
        bookmark = result.scalar_one_or_none()
        if bookmark is None:
            return None
        for key, value in kwargs.items():
            if value is not None:
                setattr(bookmark, key, value)
        await self.db.commit()
        await self.db.refresh(bookmark)
        return bookmark

    async def delete_bookmark(self, user_id: str, bookmark_id: str) -> bool:
        result = await self.db.execute(
            select(Bookmark).where(
                Bookmark.id == bookmark_id, Bookmark.user_id == user_id
            )
        )
        bookmark = result.scalar_one_or_none()
        if bookmark is None:
            return False
        await self.db.delete(bookmark)
        await self.db.commit()
        return True
