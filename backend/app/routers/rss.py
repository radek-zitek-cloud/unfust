from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.widget import RssFeedCreate, RssFeedResponse, RssItemResponse
from app.services.rss import RssService

router = APIRouter(prefix="/api/rss", tags=["rss"])


@router.get("/feeds", response_model=list[RssFeedResponse])
async def list_feeds(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RssService(db)
    return await service.list_feeds(user.id)


@router.post("/feeds", response_model=RssFeedResponse)
async def add_feed(
    body: RssFeedCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RssService(db)
    return await service.add_feed(user.id, body.url)


@router.delete("/feeds/{feed_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feed(
    feed_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RssService(db)
    deleted = await service.delete_feed(user.id, feed_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Feed not found"
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/items", response_model=list[RssItemResponse])
async def get_items(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = RssService(db)
    return await service.get_items(user.id)


@router.post("/refresh", status_code=status.HTTP_200_OK)
async def refresh_feeds(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Refresh all RSS feeds for the current user."""
    service = RssService(db)
    feeds = await service.list_feeds(user.id)
    refreshed_count = 0
    for feed in feeds:
        try:
            await service._refresh_feed(feed)
            refreshed_count += 1
        except Exception:
            pass
    return {"refreshed": refreshed_count}
