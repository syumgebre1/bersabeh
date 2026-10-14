"""
Seed a sample active nurse shift for the demo user Hana Bekele.
Idempotent — re-running won't duplicate.
"""

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.shift import NurseShift
from app.models.user import User


NURSE_EMAIL = "hana.bekele@bersabehclinic.com"


async def seed_nurse_shift():
    async with AsyncSessionLocal() as db:
        nurse_res = await db.execute(select(User).where(User.email == NURSE_EMAIL))
        nurse = nurse_res.scalar_one_or_none()
        if nurse is None:
            print(f"❌ Nurse {NURSE_EMAIL} not found — run seed.py first")
            return

        # Check for existing active shift
        existing_res = await db.execute(
            select(NurseShift)
            .where(NurseShift.nurse_id == nurse.id)
            .where(NurseShift.ended_at.is_(None))
        )
        existing = existing_res.scalar_one_or_none()
        if existing is not None:
            print(f"ℹ️  Active shift already exists for {nurse.full_name}")
            print(f"   ID: {existing.id}")
            print(f"   Started: {existing.started_at.isoformat()}")
            return

        shift = NurseShift(
            nurse_id=nurse.id,
            ward="Ward A",
            started_at=datetime.now(timezone.utc),
        )
        db.add(shift)
        await db.commit()
        await db.refresh(shift)

        print(f"✅ Active shift created")
        print(f"   Nurse: {nurse.full_name}")
        print(f"   Ward:  {shift.ward}")
        print(f"   ID:    {shift.id}")


if __name__ == "__main__":
    asyncio.run(seed_nurse_shift())
