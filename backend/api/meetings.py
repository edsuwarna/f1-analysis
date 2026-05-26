"""
Meetings API — Race weekend endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database import get_db
from backend.models.models import Meeting, Session

router = APIRouter()


@router.get("/meetings")
async def list_meetings(year: int | None = None, db: AsyncSession = Depends(get_db)):
    """List all race weekends, optionally filtered by year."""
    query = select(Meeting).order_by(Meeting.date_start.desc())
    if year:
        query = query.where(Meeting.year == year)
    result = await db.execute(query)
    meetings = result.scalars().all()
    return [
        {
            "id": m.id,
            "year": m.year,
            "name": m.name,
            "official_name": m.official_name,
            "location": m.location,
            "country_name": m.country_name,
            "circuit_name": m.circuit_name,
            "date_start": str(m.date_start) if m.date_start else None,
            "date_end": str(m.date_end) if m.date_end else None,
        }
        for m in meetings
    ]


@router.get("/meetings/{meeting_id}")
async def get_meeting(meeting_id: int, db: AsyncSession = Depends(get_db)):
    """Get details for a specific race weekend."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {
        "id": meeting.id,
        "year": meeting.year,
        "name": meeting.name,
        "official_name": meeting.official_name,
        "location": meeting.location,
        "country_code": meeting.country_code,
        "country_name": meeting.country_name,
        "circuit_name": meeting.circuit_name,
        "circuit_type": meeting.circuit_type,
        "date_start": str(meeting.date_start) if meeting.date_start else None,
        "date_end": str(meeting.date_end) if meeting.date_end else None,
        "gmt_offset": meeting.gmt_offset,
    }


@router.get("/meetings/{meeting_id}/sessions")
async def get_meeting_sessions(meeting_id: int, db: AsyncSession = Depends(get_db)):
    """List all sessions in a race weekend."""
    result = await db.execute(
        select(Session)
        .where(Session.meeting_id == meeting_id)
        .order_by(Session.date_start)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id,
            "session_key": s.session_key,
            "session_type": s.session_type,
            "session_name": s.session_name,
            "date_start": str(s.date_start) if s.date_start else None,
        }
        for s in sessions
    ]
