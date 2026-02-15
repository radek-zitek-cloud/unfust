from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.widget import BookmarkCreate, BookmarkResponse, BookmarkUpdate
from app.services.bookmark import BookmarkService

router = APIRouter(prefix="/api/bookmarks", tags=["bookmarks"])


@router.get("", response_model=list[BookmarkResponse])
async def list_bookmarks(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = BookmarkService(db)
    return await service.list_bookmarks(user.id)


@router.post("", response_model=BookmarkResponse)
async def create_bookmark(
    body: BookmarkCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = BookmarkService(db)
    return await service.create_bookmark(
        user.id,
        title=body.title,
        url=body.url,
        category=body.category,
        position=body.position,
    )


@router.patch("/{bookmark_id}", response_model=BookmarkResponse)
async def update_bookmark(
    bookmark_id: str,
    body: BookmarkUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = BookmarkService(db)
    bookmark = await service.update_bookmark(
        user.id,
        bookmark_id,
        title=body.title,
        url=body.url,
        category=body.category,
        position=body.position,
    )
    if bookmark is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found"
        )
    return bookmark


@router.delete("/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bookmark(
    bookmark_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = BookmarkService(db)
    deleted = await service.delete_bookmark(user.id, bookmark_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found"
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
