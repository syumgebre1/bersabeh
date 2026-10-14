"""
Medication scheduler.

Expands prescriptions into concrete scheduled_doses rows.

Decision 2 (Hybrid): pre-compute the full dose schedule at prescription-write
time, so shift queries are fast and audit trails are clear.

Frequency → times-of-day mapping (strict):

  "1x daily"       → [08:00]
  "2x daily"       → [08:00, 20:00]
  "3x daily"       → [08:00, 14:00, 20:00]
  "4x daily"       → [06:00, 12:00, 18:00, 22:00]
  "every 6 hours"  → [06:00, 12:00, 18:00, 00:00]
  "every 8 hours"  → [06:00, 14:00, 22:00]
  "every 12 hours" → [08:00, 20:00]
  "once daily"     → [08:00]
  "twice daily"    → [08:00, 20:00]
  "three times daily" → [08:00, 14:00, 20:00]

  "as needed" / "prn" → NO schedule (doses given ad-hoc by nurse)

Unknown frequencies are NOT scheduled. The scheduler logs a warning;
nurse can still administer ad-hoc via the API.

All timestamps are in UTC. All doses are anchored to the prescription's
`created_at` date (dose 1 is on the same day, unless that day's time has passed
for that dose — then dose 1 is next day).
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.medication import DoseStatus, ScheduledDose
from app.models.prescription import (
    Prescription,
    PrescriptionItem,
    PrescriptionStatus,
)


logger = logging.getLogger(__name__)


# ============================================================
# Frequency map
# ============================================================

# Key: normalized lowercase string
# Value: list of hours (local clinic time) at which doses are given
FREQUENCY_TIMES: dict[str, list[int]] = {
    "1x daily": [8],
    "2x daily": [8, 20],
    "3x daily": [8, 14, 20],
    "4x daily": [6, 12, 18, 22],
    "once daily": [8],
    "twice daily": [8, 20],
    "three times daily": [8, 14, 20],
    "every 6 hours": [6, 12, 18, 0],
    "every 8 hours": [6, 14, 22],
    "every 12 hours": [8, 20],
}

# Frequencies that explicitly DON'T create schedules
UNSCHEDULED_FREQUENCIES = {
    "as needed",
    "prn",
    "when required",
    "sos",
}


# ============================================================
# Core
# ============================================================

def _dose_hours_for(frequency: str) -> list[int] | None:
    """
    Returns list of hours for the frequency, or None if:
      - the frequency is explicitly "as needed" (skip scheduling)
      - the frequency is unknown (log warning, skip scheduling)
    """
    key = frequency.strip().lower()

    if key in UNSCHEDULED_FREQUENCIES:
        return None

    if key in FREQUENCY_TIMES:
        return FREQUENCY_TIMES[key]

    logger.warning("Scheduler: unknown frequency %r — no doses generated", frequency)
    return None


async def schedule_prescription(
    db: AsyncSession,
    prescription: Prescription,
) -> int:
    """
    Expand a prescription into scheduled_doses rows.

    Returns the number of doses created.
    Safe to call multiple times — the (item_id, scheduled_for) unique
    constraint prevents duplicates.

    Caller is responsible for commit.
    """
    if prescription.status != PrescriptionStatus.ACTIVE:
        return 0

    # Load items explicitly (they may not be loaded on the instance)
    items_res = await db.execute(
        select(PrescriptionItem)
        .where(PrescriptionItem.prescription_id == prescription.id)
        .order_by(PrescriptionItem.sort_order)
    )
    items = items_res.scalars().all()

    if not items:
        return 0

    # Anchor: start of the prescription's day in UTC.
    # `created_at` is timezone-aware.
    anchor = prescription.created_at.astimezone(timezone.utc)
    anchor_day = anchor.replace(hour=0, minute=0, second=0, microsecond=0)
    now = datetime.now(timezone.utc)

    created = 0
    for item in items:
        hours = _dose_hours_for(item.frequency)
        if hours is None:
            continue  # PRN or unknown — no schedule

        duration = item.duration_days or 7  # safe default

        for day_offset in range(duration):
            day_start = anchor_day + timedelta(days=day_offset)
            for hour in hours:
                scheduled_for = day_start.replace(hour=hour)

                # Skip doses already in the past on prescription day
                if scheduled_for < now - timedelta(minutes=30):
                    continue

                dose = ScheduledDose(
                    prescription_item_id=item.id,
                    patient_id=prescription.patient_id,
                    medication_name=item.medication_name,
                    dose=item.dose,
                    frequency=item.frequency,
                    scheduled_for=scheduled_for,
                    status=DoseStatus.PENDING,
                )
                db.add(dose)
                try:
                    await db.flush()  # triggers unique constraint
                    created += 1
                except IntegrityError:
                    await db.rollback()
                    # Already scheduled — skip silently
                    continue

    return created


async def cancel_prescription_doses(
    db: AsyncSession,
    prescription: Prescription,
) -> int:
    """
    Mark all PENDING doses for a prescription's items as CANCELLED.
    Doses already administered or skipped are left untouched.
    Returns count of cancelled doses.
    """
    items_res = await db.execute(
        select(PrescriptionItem.id).where(
            PrescriptionItem.prescription_id == prescription.id
        )
    )
    item_ids = [row[0] for row in items_res.all()]
    if not item_ids:
        return 0

    doses_res = await db.execute(
        select(ScheduledDose)
        .where(ScheduledDose.prescription_item_id.in_(item_ids))
        .where(ScheduledDose.status == DoseStatus.PENDING)
    )
    doses = doses_res.scalars().all()

    for d in doses:
        d.status = DoseStatus.CANCELLED

    return len(doses)
