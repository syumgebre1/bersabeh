"""
Demo seeder - layers appointments and non-active patients on top of seed.py.

Modes:
    python scripts/seed_demo.py           insert (idempotent)
    python scripts/seed_demo.py --reset   delete only demo data
"""

import argparse
import asyncio
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, ".")

from sqlalchemy import delete, select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.appointment import Appointment, AppointmentStatus
from app.models.user import User, UserRole, UserStatus


DEMO_PASSWORD = "DemoPass123!"
DEMO_APPT_TAG = "[DEMO]"

DEMO_PATIENTS = [
    {
        "email": "patient.pending@bersabehclinic.com",
        "full_name": "Selamawit Bekele",
        "phone": "+251911200001",
        "status": UserStatus.PENDING_ADMIN,
    },
    {
        "email": "patient.rejected@bersabehclinic.com",
        "full_name": "Tesfaye Alemu",
        "phone": "+251911200002",
        "status": UserStatus.REJECTED,
        "rejection_reason": "Incomplete ID verification - resubmit with a clear Kebele ID photo.",
    },
    {
        "email": "patient.disabled@bersabehclinic.com",
        "full_name": "Marta Girma",
        "phone": "+251911200003",
        "status": UserStatus.DISABLED,
    },
]


def _appt_specs(now):
    return [
        (now - timedelta(days=1, hours=2), AppointmentStatus.COMPLETED,  "Follow-up consultation"),
        (now - timedelta(days=1),          AppointmentStatus.CANCELLED,  "Rescheduled by patient"),
        (now + timedelta(hours=1),         AppointmentStatus.CONFIRMED,  "Annual checkup"),
        (now + timedelta(hours=3),         AppointmentStatus.CHECKED_IN, "Blood pressure review"),
        (now + timedelta(days=1, hours=2), AppointmentStatus.SCHEDULED,  "New patient intake"),
        (now + timedelta(days=1, hours=5), AppointmentStatus.SCHEDULED,  "Lab results review"),
        (now + timedelta(days=2),          AppointmentStatus.SCHEDULED,  "Vaccination"),
    ]


async def reset_demo(session):
    print("Resetting demo data...")

    appt_result = await session.execute(
        delete(Appointment).where(Appointment.reason.like(f"{DEMO_APPT_TAG}%"))
    )
    print(f"   Deleted {appt_result.rowcount} demo appointments")

    demo_emails = [p["email"] for p in DEMO_PATIENTS]
    user_result = await session.execute(
        delete(User).where(
            User.is_seed_data.is_(True),
            User.email.in_(demo_emails),
        )
    )
    print(f"   Deleted {user_result.rowcount} demo patients")

    await session.commit()
    print("Reset complete.")
    print()


async def seed_demo(session):
    now = datetime.now(timezone.utc)

    created_patients = 0
    for spec in DEMO_PATIENTS:
        existing = await session.execute(select(User).where(User.email == spec["email"]))
        user = existing.scalar_one_or_none()
        if user is None:
            user = User(
                email=spec["email"],
                full_name=spec["full_name"],
                phone=spec.get("phone"),
                hashed_password=hash_password(DEMO_PASSWORD),
                role=UserRole.PATIENT,
                status=spec["status"],
                is_on_duty=False,
                is_deleted=False,
                is_seed_data=True,
                rejection_reason=spec.get("rejection_reason"),
            )
            session.add(user)
            await session.flush()
            created_patients += 1

    doc = (await session.execute(
        select(User).where(User.role == UserRole.DOCTOR, User.is_seed_data.is_(True)).limit(1)
    )).scalar_one_or_none()

    pat = (await session.execute(
        select(User).where(
            User.role == UserRole.PATIENT,
            User.status == UserStatus.ACTIVE,
            User.is_seed_data.is_(True),
        ).limit(1)
    )).scalar_one_or_none()

    if doc is None or pat is None:
        print("No seed doctor / active seed patient. Run scripts/seed.py first.")
        await session.commit()
        return

    actor = (await session.execute(
        select(User).where(
            User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
            User.is_seed_data.is_(True),
        ).limit(1)
    )).scalar_one_or_none() or doc

    created_appts = 0
    for when, status, reason in _appt_specs(now):
        full_reason = f"{DEMO_APPT_TAG} {reason}"
        dup = (await session.execute(
            select(Appointment).where(Appointment.reason == full_reason)
        )).scalar_one_or_none()
        if dup:
            continue

        appt = Appointment(
            patient_id=pat.id,
            doctor_id=doc.id,
            created_by_id=actor.id,
            scheduled_at=when,
            duration_minutes=30,
            status=status,
            reason=full_reason,
        )
        if status == AppointmentStatus.CONFIRMED:
            appt.confirmed_at = when
        elif status == AppointmentStatus.CHECKED_IN:
            appt.confirmed_at = when
            appt.checked_in_at = when
        elif status == AppointmentStatus.COMPLETED:
            appt.confirmed_at = when
            appt.checked_in_at = when
            appt.completed_at = when
        elif status == AppointmentStatus.CANCELLED:
            appt.cancelled_at = when
            appt.cancellation_reason = "Patient requested reschedule"

        session.add(appt)
        created_appts += 1

    await session.commit()

    print()
    print("Demo data seeded")
    print(f"    {created_patients} new demo patients")
    print(f"    {created_appts} new demo appointments (doctor: {doc.full_name})")
    print()
    print(f"  Login credentials (all passwords: {DEMO_PASSWORD})")
    print("     Admin     : admin@bersabehclinic.com")
    print("     Doctor    : selam.tesfaye@bersabehclinic.com")
    print("     Nurse     : hana.bekele@bersabehclinic.com")
    print("     Reception : meron.tadesse@bersabehclinic.com")
    print("     Lab       : yohannes.getachew@bersabehclinic.com")
    print("     Patient   : abebe.kebede@example.com")
    print("     Pending   : patient.pending@bersabehclinic.com")
    print("     Rejected  : patient.rejected@bersabehclinic.com")
    print()


async def main(reset: bool):
    async with AsyncSessionLocal() as session:
        if reset:
            await reset_demo(session)
        else:
            await seed_demo(session)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Demo data seeder")
    parser.add_argument("--reset", action="store_true", help="Delete demo data only")
    args = parser.parse_args()
    asyncio.run(main(reset=args.reset))
