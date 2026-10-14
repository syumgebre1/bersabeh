"""
Seed the clinic's physical rooms.

Idempotent — re-running won't duplicate.

8 rooms across Ward A. Matches the shape the nurse dashboard expects.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.room import Room, RoomType


ROOMS = [
    {"number": "201", "ward": "Ward A", "floor": "2", "room_type": RoomType.GENERAL, "capacity": 1},
    {"number": "202", "ward": "Ward A", "floor": "2", "room_type": RoomType.GENERAL, "capacity": 1},
    {"number": "203", "ward": "Ward A", "floor": "2", "room_type": RoomType.GENERAL, "capacity": 1},
    {"number": "204", "ward": "Ward A", "floor": "2", "room_type": RoomType.GENERAL, "capacity": 1},
    {"number": "205", "ward": "Ward A", "floor": "2", "room_type": RoomType.PRIVATE, "capacity": 1},
    {"number": "206", "ward": "Ward A", "floor": "2", "room_type": RoomType.PRIVATE, "capacity": 1},
    {"number": "207", "ward": "Ward A", "floor": "2", "room_type": RoomType.PRIVATE, "capacity": 1},
    {"number": "208", "ward": "Ward A", "floor": "2", "room_type": RoomType.PRIVATE, "capacity": 1},
]


async def seed_rooms():
    created = 0
    updated = 0

    async with AsyncSessionLocal() as db:
        for r in ROOMS:
            result = await db.execute(select(Room).where(Room.number == r["number"]))
            existing = result.scalar_one_or_none()
            if existing is None:
                db.add(Room(**r))
                created += 1
            else:
                # Just make sure it's active
                if not existing.is_active:
                    existing.is_active = True
                    updated += 1

        await db.commit()

    print(f"✅ Created: {created}")
    print(f"🔁 Updated: {updated}")
    print(f"📊 Total rooms in DB: {len(ROOMS)}")


if __name__ == "__main__":
    asyncio.run(seed_rooms())
