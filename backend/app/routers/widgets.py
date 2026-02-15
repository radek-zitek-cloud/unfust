from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.widget import WidgetLayoutResponse, WidgetLayoutUpdateRequest
from app.services.widget import WidgetLayoutService

router = APIRouter(prefix="/api/widgets", tags=["widgets"])


@router.get("/layout", response_model=WidgetLayoutResponse)
async def get_layout(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WidgetLayoutService(db)
    layout = await service.get_layout(user.id)
    if layout is None:
        return WidgetLayoutResponse(widgets=[])
    return WidgetLayoutResponse(widgets=layout.widgets)


@router.put("/layout", response_model=WidgetLayoutResponse)
async def save_layout(
    body: WidgetLayoutUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WidgetLayoutService(db)
    layout = await service.save_layout(
        user.id, [w.model_dump() for w in body.widgets]
    )
    return WidgetLayoutResponse(widgets=layout.widgets)
