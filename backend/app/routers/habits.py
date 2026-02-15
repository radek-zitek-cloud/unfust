"""Habit Tracker router."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.habit import (
    HabitBadgeResponse,
    HabitChallengeProgressResponse,
    HabitCreate,
    HabitLogCreate,
    HabitLogResponse,
    HabitResponse,
    HabitSummaryResponse,
    HabitUpdate,
)
from app.services.habit import HabitService

router = APIRouter(prefix="/api/habits", tags=["habits"])


async def get_habit_service(db: AsyncSession = Depends(get_db)) -> HabitService:
    return HabitService(db)


@router.get("", response_model=list[HabitResponse])
async def list_habits(
    user: User = Depends(get_current_user),
    service: HabitService = Depends(get_habit_service),
):
    """List all habits for current user."""
    return await service.get_habits(user.id)


@router.post("", response_model=HabitResponse, status_code=status.HTTP_201_CREATED)
async def create_habit(
    data: HabitCreate,
    user: User = Depends(get_current_user),
    service: HabitService = Depends(get_habit_service),
):
    """Create a new habit."""
    return await service.create_habit(user.id, data)


@router.get("/summary", response_model=HabitSummaryResponse)
async def get_summary(
    user: User = Depends(get_current_user),
    service: HabitService = Depends(get_habit_service),
):
    """Get dashboard summary."""
    return await service.get_summary(user.id)


@router.get("/badges", response_model=list[HabitBadgeResponse])
async def list_badges(
    user: User = Depends(get_current_user),
    service: HabitService = Depends(get_habit_service),
):
    """List earned badges."""
    badges = await service.get_badges(user.id)
    return badges


@router.get("/challenges", response_model=list[HabitChallengeProgressResponse])
async def list_challenges(
    user: User = Depends(get_current_user),
    service: HabitService = Depends(get_habit_service),
):
    """List active challenges with progress."""
    progress = await service.get_challenges(user.id)
    return progress


@router.get("/{habit_id}", response_model=HabitResponse)
async def get_habit(
    habit_id: str,
    user: User = Depends(get_current_user),
    service: HabitService = Depends(get_habit_service),
):
    """Get a specific habit."""
    habit = await service.get_habit(habit_id, user.id)
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    return habit


@router.patch("/{habit_id}", response_model=HabitResponse)
async def update_habit(
    habit_id: str,
    data: HabitUpdate,
    user: User = Depends(get_current_user),
    service: HabitService = Depends(get_habit_service),
):
    """Update a habit."""
    habit = await service.update_habit(habit_id, user.id, data)
    if not habit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    return habit


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_habit(
    habit_id: str,
    user: User = Depends(get_current_user),
    service: HabitService = Depends(get_habit_service),
):
    """Archive (soft delete) a habit."""
    success = await service.delete_habit(habit_id, user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")


@router.post("/{habit_id}/logs", response_model=HabitLogResponse, status_code=status.HTTP_201_CREATED)
async def log_completion(
    habit_id: str,
    data: HabitLogCreate,
    user: User = Depends(get_current_user),
    service: HabitService = Depends(get_habit_service),
):
    """Log a habit completion (check-in)."""
    log = await service.log_completion(
        habit_id, user.id, data.logged_date, data.notes
    )
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    return log


@router.get("/{habit_id}/logs", response_model=list[HabitLogResponse])
async def get_logs(
    habit_id: str,
    start: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end: date = Query(..., description="End date (YYYY-MM-DD)"),
    user: User = Depends(get_current_user),
    service: HabitService = Depends(get_habit_service),
):
    """Get log history for a habit."""
    logs = await service.get_log_history(habit_id, user.id, start, end)
    return logs


@router.delete("/{habit_id}/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def undo_log(
    habit_id: str,
    log_id: str,
    user: User = Depends(get_current_user),
    service: HabitService = Depends(get_habit_service),
):
    """Delete a log entry (undo check-in)."""
    success = await service.undo_log(log_id, user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")
