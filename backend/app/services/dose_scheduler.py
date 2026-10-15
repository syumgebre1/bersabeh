"""
Prescription → ScheduledDose materialization.

Turns a PrescriptionItem (Amoxicillin 500mg, 3x daily, 7 days) into a
list of ScheduledDose rows — one per administration time, per day.

Idempotent: relies on the uq_scheduled_doses_item_time constraint.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.medication import DoseStatus, ScheduledDose
from app.models.prescription import Prescription, PrescriptionItem


# ── Frequency table ─────────────────────────────────────────────────────────
# Values are (hour, minute) pairs — local clinic time. If we later support
# per-clinic timezone, this is the single place to change.
FREQUENCY_TIMES: dict[str, list[tuple[int, int]]] = {
    "1x daily":         [(9, 0)],
    "once daily":       [(9, 0)],
    "qd":               [(9, 0)],

    "2x daily":         [(9, 0), (21, 0)],
    "twice daily":      [(9, 0), (21, 0)],
    "bid":              [(9, 0), (21, 0)],

    "3x daily":         [(9, 0), (14, 0), (21, 0)],
    "three times daily":[(9, 0), (14, 0), (21, 0)],
    "tid":              [(9, 0), (14, 0), (21, 0)],

    "4x daily":         [(9, 0), (13, 0), (17, 0), (21, 0)],
    "four times daily": [(9, 0), (13, 0), (17, 0), (21, 0)],
    "qid":              [(9, 0), (13, 0), (17, 0), (21, 0)],

    "every 4 hours":    [(6, 0), (10, 0), (14, 0), (18, 0), (22, 0)],
    "q4h":              [(6, 0), (10, 0), (14, 0), (18, 0), (22, 0)],

    "every 6 hours":    [(6, 0), (12, 0), (18, 0), (0, 0)],
    "q6h":              [(6, 0), (12, 0), (18, 0), (0, 0)],

    "every 8 hours":    [(6, 0), (14, 0), (22, 0)],
    "q8h":              [(6, 0), (14, 0), (22, 0)],

    "every 12 hours":   [(8, 0), (20, 0)],
    "q12h":             [(8, 0), (20, 0)],
}

# Frequencies that DO NOT create scheduled doses.
# PRN meds are logged manually by the nurse when given.
NO_SCHEDULE_FREQUENCIES: set[str] = {
    "as needed", "prn", "sos", "if needed",
}


def times_for_frequency(frequency: str) -> list[tuple[int, int]]:
    """
    Returns [(hour, minute), ...] for the given frequency string.
    Falls back to a single 09:00 dose if unknown.
    Returns [] for PRN frequencies.
    """
    key = frequency.strip().lower()

    if key in NO_SCHEDULE_FREQUENCIES:
        return []

    if key in FREQUENCY_TIMES:
        return FREQUENCY_TIMES[key]

    # Loose fallback: "Nx daily" for any N 1..8
    for n in range(1, 9):
        if key in (f"{n}x daily", f"{n}x/day", f"{n} x daily"):
            if n == 1:
                return [(9, 0)]
            if n == 2:
                return [(9, 0), (21, 0)]
            if n == 3:
                return [(9, 0), (14, 0), (21, 0)]
            if n == 4:
                return [(9, 0), (13, 0), (17, 0), (21, 0)]
            # Spread evenly from 09:00 onwards
            step = max(2, 12 // n)
            return [(9 + step * i, 0) for i in range(n)]

    return [(9, 0)]


def _start_day_for(created_at: datetime | date | None) -> date:
    """
    Doses start the day AFTER the prescription was written,
    or today if created_at is unknown.
    """
    if created_at is None:
        return datetime.now(timezone.utc).date()
    if isinstance(created_at, datetime):
        return created_at.date() + timedelta(days=1)
    return created_at + timedelta(days=1)


async def generate_doses_for_item(
    db: AsyncSession,
    item: PrescriptionItem,
    patient_id: uuid.UUID,
    start_day: date | None = None,
    max_days: int | None = None,
) -> list[ScheduledDose]:
    """
    Materialize ScheduledDose rows for one prescription item.

    Returns the newly-created (or already-existing) dose rows.
    Idempotent — re-running for the same item won't create duplicates.
    """
    times = times_for_frequency(item.frequency)
    if not times:
        # PRN — no scheduled doses
        return []

    days = item.duration_days if item.duration_days is not None else 7
    if max_days is not None:
        days = min(days, max_days)

    if start_day is None:
        start_day = _start_day_for(item.prescription.created_at if item.prescription else None)

    # Pre-load existing doses for this item (idempotency)
    existing_rows = (
        await db.execute(
            select(ScheduledDose.scheduled_for).where(
                ScheduledDose.prescription_item_id == item.id
            )
        )
    ).scalars().all()
    existing_times: set[datetime] = set(existing_rows)

    created: list[ScheduledDose] = []

    for offset in range(days):
        day = start_day + timedelta(days=offset)
        for (hh, mm) in times:
            local_dt = datetime.combine(day, time(hour=hh, minute=mm))
            scheduled_utc = local_dt.replace(tzinfo=timezone.utc)

            if scheduled_utc in existing_times:
                continue

            dose = ScheduledDose(
                prescription_item_id=item.id,
                patient_id=patient_id,
                medication_name=item.medication_name,
                dose=item.dose,
                frequency=item.frequency,
                scheduled_for=scheduled_utc,
                status=DoseStatus.PENDING,
            )
            db.add(dose)
            created.append(dose)

    return created
