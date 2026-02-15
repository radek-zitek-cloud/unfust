from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.widget import DashboardLayout


class WidgetLayoutService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_layout(self, user_id: str) -> DashboardLayout | None:
        result = await self.db.execute(
            select(DashboardLayout).where(DashboardLayout.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def save_layout(self, user_id: str, widgets: list[dict]) -> DashboardLayout:
        layout = await self.get_layout(user_id)
        if layout is None:
            layout = DashboardLayout(user_id=user_id, widgets=widgets)
            self.db.add(layout)
        else:
            layout.widgets = widgets
        await self.db.commit()
        await self.db.refresh(layout)
        return layout
