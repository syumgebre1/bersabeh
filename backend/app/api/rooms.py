from typing import Annotated
"""
Rooms + bed assignments.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, require_roles
from app.db.session import get_db
from app.models.bed_assignment import BedAssignment
from app.models.room import Room
from app.models.user import User, UserRole
from app.schemas.room import (
    AssignPatientIn,
    DischargeIn,
    RoomCreate,
    RoomOut,
    RoomUpdate,
)

router = APIRouter(prefix="/rooms", tags=["rooms"])

STAFF = (
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.RECEPTION,
)


@router.get("", response_model=list[RoomOut])
async def list_rooms(
    ward: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: Annotated[User, Depends(require_roles(*STAFF))] = None,
):
    stmt = select(Room).where(Room.is_active.is_(True)).order_by(Room.number)
    if ward:
        stmt = stmt.where(Room.ward == ward)
    rooms = (await db.execute(stmt)).scalars().all()

    # Load active assignments for all rooms
    room_ids = [r.id for r in rooms]
    active_map: dict[uuid.UUID, BedAssignment] = {}
    if room_ids:
        a_stmt = (
            select(BedAssignment)
            .where(
                BedAssignment.room_id.in_(room_ids),
                BedAssignment.discharged_at.is_(None),
            )
            .options(selectinload(BedAssignment.patient))
        )
        for a in (await db.execute(a_stmt)).scalars().all():
            active_map[a.room_id] = a

    out: list[RoomOut] = []
    for r in rooms:
        assignment = active_map.get(r.id)
        room_out = RoomOut.model_validate(r)
        if assignment:
            room_out.current_patient = assignment.patient
            room_out.current_assignment_id = assignment.id
            room_out.occupied = 1
        out.append(room_out)
    return out


@router.get("/{room_id}", response_model=RoomOut)
async def get_room(
    room_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Annotated[User, Depends(require_roles(*STAFF))] = None,
):
    room = (await db.execute(select(Room).where(Room.id == room_id))).scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    a_stmt = (
        select(BedAssignment)
        .where(
            BedAssignment.room_id == room_id,
            BedAssignment.discharged_at.is_(None),
        )
        .options(selectinload(BedAssignment.patient))
    )
    assignment = (await db.execute(a_stmt)).scalar_one_or_none()

    room_out = RoomOut.model_validate(room)
    if assignment:
        room_out.current_patient = assignment.patient
        room_out.current_assignment_id = assignment.id
        room_out.occupied = 1
    return room_out


@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
async def create_room(
    payload: RoomCreate,
    db: AsyncSession = Depends(get_db),
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN))] = None,
):
    exists = (
        await db.execute(select(Room).where(Room.number == payload.number))
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Room number already exists")

    room = Room(**payload.model_dump())
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return RoomOut.model_validate(room)


@router.patch("/{room_id}", response_model=RoomOut)
async def update_room(
    room_id: uuid.UUID,
    payload: RoomUpdate,
    db: AsyncSession = Depends(get_db),
    _: Annotated[User, Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN))] = None,
):
    room = (await db.execute(select(Room).where(Room.id == room_id))).scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(room, k, v)
    await db.commit()
    await db.refresh(room)
    return RoomOut.model_validate(room)


@router.post("/{room_id}/assign", response_model=RoomOut)
async def assign_patient(
    room_id: uuid.UUID,
    payload: AssignPatientIn,
    db: AsyncSession = Depends(get_db),
    current: Annotated[User, Depends(require_roles(*STAFF))] = None,
):
    room = (await db.execute(select(Room).where(Room.id == room_id))).scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Check no active assignment on this room
    existing = (
        await db.execute(
            select(BedAssignment).where(
                BedAssignment.room_id == room_id,
                BedAssignment.discharged_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Room already occupied")

    # Check patient not already admitted
    patient_active = (
        await db.execute(
            select(BedAssignment).where(
                BedAssignment.patient_id == payload.patient_id,
                BedAssignment.discharged_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    if patient_active:
        raise HTTPException(status_code=409, detail="Patient already admitted")

    # Verify patient exists
    patient = (
        await db.execute(select(User).where(User.id == payload.patient_id))
    ).scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    assignment = BedAssignment(
        patient_id=payload.patient_id,
        room_id=room_id,
        assigned_by_id=current.id,
        notes=payload.reason,
    )
    db.add(assignment)
    await db.commit()

    # Reload with patient
    a_stmt = (
        select(BedAssignment)
        .where(BedAssignment.id == assignment.id)
        .options(selectinload(BedAssignment.patient))
    )
    assignment = (await db.execute(a_stmt)).scalar_one()

    room_out = RoomOut.model_validate(room)
    room_out.current_patient = assignment.patient
    room_out.current_assignment_id = assignment.id
    room_out.occupied = 1
    return room_out


@router.post("/{room_id}/discharge", response_model=RoomOut)
async def discharge_patient(
    room_id: uuid.UUID,
    payload: DischargeIn,
    db: AsyncSession = Depends(get_db),
    _: Annotated[User, Depends(require_roles(*STAFF))] = None,
):
    assignment = (
        await db.execute(
            select(BedAssignment).where(
                BedAssignment.room_id == room_id,
                BedAssignment.discharged_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="No active assignment in this room")

    assignment.discharged_at = datetime.now(timezone.utc)
    assignment.discharged_at = datetime.now(timezone.utc)
    if payload.notes:
        assignment.reason = (assignment.reason or "") + f"\n[discharge] {payload.notes}"
    await db.commit()

    room = (await db.execute(select(Room).where(Room.id == room_id))).scalar_one()
    return RoomOut.model_validate(room)
