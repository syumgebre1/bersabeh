"""
Room + bed assignment endpoints.

Role permissions:
                            Patient  Doctor  Nurse  Reception  Lab  Admin
  GET    /rooms               ❌      ✅      ✅      ✅        ❌   ✅
  GET    /rooms/{id}          ❌      ✅      ✅      ✅        ❌   ✅
  GET    /rooms/available     ❌      ❌      ✅      ✅        ❌   ✅
  POST   /rooms               ❌      ❌      ❌      ❌        ❌   ✅
  PATCH  /rooms/{id}          ❌      ❌      ❌      ❌        ❌   ✅
  POST   /rooms/{id}/assign   ❌      ❌      ✅      ✅        ❌   ✅
  POST   /rooms/{id}/discharge ❌     ❌      ✅      ✅        ❌   ✅
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.models.room import BedAssignment, Room, RoomType
from app.models.user import User, UserRole
from app.schemas.room import (
    BedAssignmentCreate,
    BedAssignmentDischarge,
    BedAssignmentRead,
    CurrentOccupant,
    RoomCreate,
    RoomRead,
    RoomUpdate,
)
from app.schemas.user import UserPublic


router = APIRouter(prefix="/rooms", tags=["rooms"])


# ============================================================
# Helpers
# ============================================================
def _can_view(user: User) -> bool:
    return user.role in (
        UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTION,
        UserRole.ADMIN, UserRole.SUPER_ADMIN,
    )


def _can_manage_rooms(user: User) -> bool:
    return user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)


def _can_assign(user: User) -> bool:
    return user.role in (
        UserRole.NURSE, UserRole.RECEPTION,
        UserRole.ADMIN, UserRole.SUPER_ADMIN,
    )


async def _get_active_assignment(
    db: AsyncSession, room_id: uuid.UUID,
) -> BedAssignment | None:
    result = await db.execute(
        select(BedAssignment)
        .where(BedAssignment.room_id == room_id)
        .where(BedAssignment.discharged_at.is_(None))
    )
    return result.scalar_one_or_none()


def _build_room_read(room: Room, assignment: BedAssignment | None) -> RoomRead:
    """Compose a RoomRead with computed occupancy."""
    payload = RoomRead.model_validate(room)
    if assignment is not None:
        payload.is_occupied = True
        payload.current_occupant = CurrentOccupant(
            assignment_id=assignment.id,
            patient=UserPublic.model_validate(assignment.patient),
            assigned_by=UserPublic.model_validate(assignment.assigned_by),
            admitted_at=assignment.admitted_at,
            notes=assignment.notes,
        )
    else:
        payload.is_occupied = False
        payload.current_occupant = None
    return payload


async def _get_room_or_404(db: AsyncSession, room_id: uuid.UUID) -> Room:
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


# ============================================================
# GET /rooms — list all rooms with occupancy
# ============================================================
@router.get("", response_model=list[RoomRead], summary="List all rooms")
async def list_rooms(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[RoomRead]:
    if not _can_view(current_user):
        raise HTTPException(status_code=403, detail="Not allowed to view rooms")

    rooms_res = await db.execute(select(Room).order_by(Room.ward, Room.number))
    rooms = rooms_res.scalars().all()

    # Load active assignments in one query
    assign_res = await db.execute(
        select(BedAssignment).where(BedAssignment.discharged_at.is_(None))
    )
    active_by_room: dict[uuid.UUID, BedAssignment] = {
        a.room_id: a for a in assign_res.scalars().all()
    }

    return [_build_room_read(r, active_by_room.get(r.id)) for r in rooms]


# ============================================================
# GET /rooms/available — empty rooms
# ============================================================
@router.get("/available", response_model=list[RoomRead], summary="List available rooms")
async def list_available_rooms(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[RoomRead]:
    if not _can_assign(current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    # Rooms with no active assignment
    active_res = await db.execute(
        select(BedAssignment.room_id).where(BedAssignment.discharged_at.is_(None))
    )
    occupied_ids = {row[0] for row in active_res.all()}

    rooms_res = await db.execute(
        select(Room)
        .where(Room.is_active.is_(True))
        .order_by(Room.ward, Room.number)
    )
    rooms = [r for r in rooms_res.scalars().all() if r.id not in occupied_ids]

    return [_build_room_read(r, None) for r in rooms]


# ============================================================
# GET /rooms/{id} — single room
# ============================================================
@router.get("/{room_id}", response_model=RoomRead, summary="Get one room")
async def get_room(
    room_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> RoomRead:
    if not _can_view(current_user):
        raise HTTPException(status_code=403, detail="Not allowed")

    room = await _get_room_or_404(db, room_id)
    assignment = await _get_active_assignment(db, room_id)
    return _build_room_read(room, assignment)


# ============================================================
# POST /rooms — create room (admin)
# ============================================================
@router.post(
    "",
    response_model=RoomRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a room (admin)",
)
async def create_room(
    payload: RoomCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> RoomRead:
    if not _can_manage_rooms(current_user):
        raise HTTPException(status_code=403, detail="Only admins can create rooms")

    # Check unique number
    existing = await db.execute(select(Room).where(Room.number == payload.number))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Room number already exists")

    room = Room(
        number=payload.number,
        ward=payload.ward,
        floor=payload.floor,
        room_type=payload.room_type,
        capacity=payload.capacity,
        notes=payload.notes,
    )
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return _build_room_read(room, None)


# ============================================================
# PATCH /rooms/{id} — update room (admin)
# ============================================================
@router.patch(
    "/{room_id}",
    response_model=RoomRead,
    summary="Update a room (admin)",
)
async def update_room(
    room_id: uuid.UUID,
    payload: RoomUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> RoomRead:
    if not _can_manage_rooms(current_user):
        raise HTTPException(status_code=403, detail="Only admins can update rooms")

    room = await _get_room_or_404(db, room_id)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(room, k, v)

    await db.commit()
    await db.refresh(room)
    assignment = await _get_active_assignment(db, room_id)
    return _build_room_read(room, assignment)


# ============================================================
# POST /rooms/{id}/assign — assign patient to room
# ============================================================
@router.post(
    "/{room_id}/assign",
    response_model=BedAssignmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Assign a patient to a room",
)
async def assign_patient(
    room_id: uuid.UUID,
    payload: BedAssignmentCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> BedAssignmentRead:
    if not _can_assign(current_user):
        raise HTTPException(status_code=403, detail="Not allowed to assign rooms")

    room = await _get_room_or_404(db, room_id)
    if not room.is_active:
        raise HTTPException(status_code=400, detail="Room is inactive")

    # Room must be empty
    existing = await _get_active_assignment(db, room_id)
    if existing is not None:
        raise HTTPException(status_code=400, detail="Room is already occupied")

    # Patient must exist and be a patient
    patient_res = await db.execute(select(User).where(User.id == payload.patient_id))
    patient = patient_res.scalar_one_or_none()
    if patient is None or patient.is_deleted or patient.role != UserRole.PATIENT:
        raise HTTPException(status_code=400, detail="Invalid patient")

    # Patient must not already be in another room
    patient_assign_res = await db.execute(
        select(BedAssignment)
        .where(BedAssignment.patient_id == payload.patient_id)
        .where(BedAssignment.discharged_at.is_(None))
    )
    if patient_assign_res.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Patient is already assigned to a room")

    assignment = BedAssignment(
        room_id=room_id,
        patient_id=payload.patient_id,
        assigned_by_id=current_user.id,
        notes=payload.notes,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return BedAssignmentRead.model_validate(assignment)


# ============================================================
# POST /rooms/{id}/discharge
# ============================================================
@router.post(
    "/{room_id}/discharge",
    response_model=BedAssignmentRead,
    summary="Discharge the current patient from a room",
)
async def discharge_patient(
    room_id: uuid.UUID,
    payload: BedAssignmentDischarge,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> BedAssignmentRead:
    if not _can_assign(current_user):
        raise HTTPException(status_code=403, detail="Not allowed to discharge")

    await _get_room_or_404(db, room_id)

    assignment = await _get_active_assignment(db, room_id)
    if assignment is None:
        raise HTTPException(status_code=400, detail="Room is already empty")

    assignment.discharged_at = datetime.now(timezone.utc)
    assignment.discharge_reason = payload.discharge_reason

    await db.commit()
    await db.refresh(assignment)
    return BedAssignmentRead.model_validate(assignment)
