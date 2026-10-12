"""
Seed script — creates a demo clinic with realistic users.

Idempotent: running this script multiple times will NOT create duplicates.
Every user created here has `is_seed_data = True`, so the admin CMS can
offer a one-click "delete all demo data" that anonymizes them.

Run:
    cd backend
    source venv/bin/activate
    python scripts/seed.py

All seeded passwords are:  DemoPass123!
(Change before any real deployment — this script is dev/demo only.)
"""

import asyncio
import sys
from datetime import datetime, timezone

# Make sure `app` is importable when running as `python scripts/seed.py`
sys.path.insert(0, ".")

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole, UserStatus


# ============================================================
# Seed data
# ============================================================
DEMO_PASSWORD = "DemoPass123!"

USERS = [
    # ---- Super Admin ----
    {
        "email": "superadmin@bersabehclinic.com",
        "full_name": "System Administrator",
        "role": UserRole.SUPER_ADMIN,
        "status": UserStatus.ACTIVE,
        "phone": "+251911000001",
    },
    # ---- Admin ----
    {
        "email": "admin@bersabehclinic.com",
        "full_name": "Rahel Kidane",
        "role": UserRole.ADMIN,
        "status": UserStatus.ACTIVE,
        "phone": "+251911000002",
    },
    # ---- Doctor 1 ----
    {
        "email": "selam.tesfaye@bersabehclinic.com",
        "full_name": "Dr. Selam Tesfaye",
        "role": UserRole.DOCTOR,
        "status": UserStatus.ACTIVE,
        "phone": "+251911000003",
        "specialty": "Internal Medicine",
        "years_experience": 12,
        "license_number": "MoH/MD/2013/0089",
        "bio": "Specialist in internal medicine with a focus on chronic conditions.",
        "is_on_duty": True,
    },
    # ---- Doctor 2 ----
    {
        "email": "dawit.bekele@bersabehclinic.com",
        "full_name": "Dr. Dawit Bekele",
        "role": UserRole.DOCTOR,
        "status": UserStatus.ACTIVE,
        "phone": "+251911000004",
        "specialty": "General Surgery",
        "years_experience": 15,
        "license_number": "MoH/MD/2010/0233",
        "bio": "General surgeon with post-operative care experience.",
        "is_on_duty": True,
    },
    # ---- Nurse ----
    {
        "email": "hana.bekele@bersabehclinic.com",
        "full_name": "Hana Bekele",
        "role": UserRole.NURSE,
        "status": UserStatus.ACTIVE,
        "phone": "+251911000005",
        "license_number": "MoH/RN/2018/0451",
        "bio": "Registered nurse, ward care and post-op monitoring.",
        "is_on_duty": True,
    },
    # ---- Receptionist ----
    {
        "email": "meron.tadesse@bersabehclinic.com",
        "full_name": "Meron Tadesse",
        "role": UserRole.RECEPTION,
        "status": UserStatus.ACTIVE,
        "phone": "+251911000006",
    },
    # ---- Lab Technician ----
    {
        "email": "yohannes.getachew@bersabehclinic.com",
        "full_name": "Yohannes Getachew",
        "role": UserRole.LAB,
        "status": UserStatus.ACTIVE,
        "phone": "+251911000007",
        "license_number": "MoH/LT/2019/0122",
        "bio": "Laboratory technologist, hematology and chemistry.",
    },
    # ---- Patient 1 ----
    {
        "email": "abebe.kebede@example.com",
        "full_name": "Abebe Kebede",
        "role": UserRole.PATIENT,
        "status": UserStatus.ACTIVE,        # already approved for demo convenience
        "phone": "+251911100001",
    },
    # ---- Patient 2 ----
    {
        "email": "sara.haile@example.com",
        "full_name": "Sara Haile",
        "role": UserRole.PATIENT,
        "status": UserStatus.ACTIVE,
        "phone": "+251911100002",
    },
]


# ============================================================
# Seeder
# ============================================================
async def seed() -> None:
    print("=" * 68)
    print("  Bersabeh Clinic — Seed Script")
    print("=" * 68)

    created = 0
    skipped = 0

    async with AsyncSessionLocal() as db:
        for entry in USERS:
            email = entry["email"]

            # Idempotency: skip if already present.
            existing = await db.execute(select(User).where(User.email == email))
            if existing.scalar_one_or_none() is not None:
                print(f"  ⏭  skipped (already exists): {email}")
                skipped += 1
                continue

            user = User(
                email=email,
                full_name=entry["full_name"],
                phone=entry.get("phone"),
                hashed_password=hash_password(DEMO_PASSWORD),
                role=entry["role"],
                status=entry["status"],
                specialty=entry.get("specialty"),
                years_experience=entry.get("years_experience"),
                license_number=entry.get("license_number"),
                bio=entry.get("bio"),
                is_on_duty=entry.get("is_on_duty", False),
                is_seed_data=True,                                   # ← the crucial flag
                approved_at=datetime.now(timezone.utc) if entry["status"] == UserStatus.ACTIVE else None,
            )
            db.add(user)
            print(f"  ✅  created: {email:48s} [{entry['role'].value}]")
            created += 1

        await db.commit()

    # ------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------
    print("=" * 68)
    print(f"  Done. {created} created, {skipped} skipped.")
    print("=" * 68)
    print()
    print("  Login credentials (all users share the same password):")
    print(f"  Password:  {DEMO_PASSWORD}")
    print()
    print("  ── Super Admin ──")
    print("     superadmin@bersabehclinic.com")
    print()
    print("  ── Admin ──")
    print("     admin@bersabehclinic.com")
    print()
    print("  ── Doctors ──")
    print("     selam.tesfaye@bersabehclinic.com")
    print("     dawit.bekele@bersabehclinic.com")
    print()
    print("  ── Nurse ──")
    print("     hana.bekele@bersabehclinic.com")
    print()
    print("  ── Reception ──")
    print("     meron.tadesse@bersabehclinic.com")
    print()
    print("  ── Lab ──")
    print("     yohannes.getachew@bersabehclinic.com")
    print()
    print("  ── Patients ──")
    print("     abebe.kebede@example.com")
    print("     sara.haile@example.com")
    print()
    print("  ⚠️  These are DEMO accounts. Do not use in production.")
    print()


if __name__ == "__main__":
    asyncio.run(seed())
