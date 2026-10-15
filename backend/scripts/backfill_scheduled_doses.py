"""
Backfill scheduled_doses for prescription items that were created
before the scheduler was wired into the prescriptions endpoint.

Safe to run multiple times — schedule_prescription() is idempotent.

Usage:
  cd backend
  source venv/bin/activate
  python scripts/backfill_scheduled_doses.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.prescription import Prescription, PrescriptionItem
from app.services.medication_scheduler import schedule_prescription


async def main() -> None:
    async with AsyncSessionLocal() as db:
        # Find every prescription with at least one item and zero doses
        stmt = (
            select(Prescription)
            .order_by(Prescription.created_at)
        )
        result = await db.execute(stmt)
        prescriptions = result.scalars().all()

        print(f"Found {len(prescriptions)} prescriptions. Checking each...\n")

        total_created = 0
        for p in prescriptions:
            # Check whether this prescription already has doses
            items_res = await db.execute(
                select(PrescriptionItem.id).where(
                    PrescriptionItem.prescription_id == p.id
                )
            )
            item_ids = [r[0] for r in items_res.all()]
            if not item_ids:
                continue

            # Does it have any scheduled doses already?
            from app.models.medication import ScheduledDose
            existing_res = await db.execute(
                select(ScheduledDose.id).where(
                    ScheduledDose.prescription_item_id.in_(item_ids)
                ).limit(1)
            )
            if existing_res.first():
                print(f"  ✓ Prescription {p.id} — already scheduled, skipping")
                continue

            created = await schedule_prescription(db, p)
            total_created += created
            print(f"  + Prescription {p.id} — created {created} doses")

        await db.commit()
        print(f"\n✅ Backfill complete. Total doses created: {total_created}")


if __name__ == "__main__":
    asyncio.run(main())
