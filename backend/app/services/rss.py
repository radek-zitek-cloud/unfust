import logging
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.widget import RssFeed

logger = logging.getLogger(__name__)


def _parse_date(date_str: str | None) -> datetime | None:
    """Parse RSS date string to datetime object."""
    if not date_str:
        return None
    try:
        # Try RFC 2822 format first (most common in RSS)
        return parsedate_to_datetime(date_str)
    except Exception:
        try:
            # Try ISO format
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except Exception:
            return None


class RssService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_feeds(self, user_id: str) -> list[RssFeed]:
        result = await self.db.execute(
            select(RssFeed).where(RssFeed.user_id == user_id)
        )
        return list(result.scalars().all())

    async def add_feed(self, user_id: str, url: str) -> RssFeed:
        feed = RssFeed(user_id=user_id, url=url)
        self.db.add(feed)
        await self.db.commit()
        await self.db.refresh(feed)
        # Try to fetch immediately (best effort)
        try:
            await self._refresh_feed(feed)
        except Exception:
            logger.warning("Failed initial fetch for feed %s", url)
        return feed

    async def delete_feed(self, user_id: str, feed_id: str) -> bool:
        result = await self.db.execute(
            select(RssFeed).where(RssFeed.id == feed_id, RssFeed.user_id == user_id)
        )
        feed = result.scalar_one_or_none()
        if feed is None:
            return False
        await self.db.delete(feed)
        await self.db.commit()
        return True

    async def get_items(self, user_id: str) -> list[dict]:
        feeds = await self.list_feeds(user_id)
        items = []
        for feed in feeds:
            if feed.cached_items:
                for item in feed.cached_items:
                    item["source"] = feed.title or feed.url
                    items.append(item)
        # Sort by published_iso (newest first), fallback to published string if iso not available
        items.sort(
            key=lambda x: x.get("published_iso", x.get("published", "")), reverse=True
        )
        return items

    async def _refresh_feed(self, feed: RssFeed) -> None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(feed.url, timeout=15, follow_redirects=True)
            resp.raise_for_status()

        parsed = feedparser.parse(resp.text)
        if parsed.feed.get("title"):
            feed.title = parsed.feed.title

        items = []
        for entry in parsed.entries[:50]:
            # Parse the published date and store as ISO format for sorting
            published_str = entry.get("published", "")
            published_dt = _parse_date(published_str)
            published_iso = published_dt.isoformat() if published_dt else ""

            items.append(
                {
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "published": published_str,  # Original format for display
                    "published_iso": published_iso,  # ISO format for sorting
                }
            )

        feed.cached_items = items
        feed.last_fetched_at = datetime.now(timezone.utc)
        await self.db.commit()

    async def refresh_all_feeds(self) -> None:
        result = await self.db.execute(select(RssFeed))
        feeds = result.scalars().all()
        for feed in feeds:
            try:
                await self._refresh_feed(feed)
            except Exception:
                logger.warning("Failed to refresh feed %s", feed.url)
