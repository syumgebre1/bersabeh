"""
Seed medical_map content blocks into the CMS.

These blocks power the patient-facing translation of prescription
frequency and instruction values that doctors enter as free text.

Structure:
  key:    medical_map.frequency.3x_daily
  locale: en | am | ti
  value:  the translation string
  category: clinic_info

Run: python scripts/seed_medical_map.py
Idempotent — safely re-runnable.
"""

import asyncio
import sys
from pathlib import Path

# Allow "python scripts/seed_medical_map.py" from backend/ root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.content import ContentBlock, ContentCategory


# ============================================================
# The complete mapping
# ============================================================

MAPPINGS = {
    # ---- Frequency patterns (from prescriptions.items.frequency) ----
    "medical_map.frequency.1x_daily": {
        "en": "Take once daily",
        "am": "በቀን አንድ ጊዜ ይውሰዱ",
        "ti": "ኣብ መዓልቲ ሓደ ጊዜ ውሰዱ",
    },
    "medical_map.frequency.2x_daily": {
        "en": "Take twice daily",
        "am": "በቀን ሁለት ጊዜ ይውሰዱ",
        "ti": "ኣብ መዓልቲ ክልተ ጊዜ ውሰዱ",
    },
    "medical_map.frequency.3x_daily": {
        "en": "Take three times daily",
        "am": "በቀን ሦስት ጊዜ ይውሰዱ",
        "ti": "ኣብ መዓልቲ ሰለስተ ጊዜ ውሰዱ",
    },
    "medical_map.frequency.4x_daily": {
        "en": "Take four times daily",
        "am": "በቀን አራት ጊዜ ይውሰዱ",
        "ti": "ኣብ መዓልቲ ኣርባዕተ ጊዜ ውሰዱ",
    },
    "medical_map.frequency.as_needed": {
        "en": "Take as needed",
        "am": "እንደ አስፈላጊነቱ ይውሰዱ",
        "ti": "ከም ዘድልየኩም መጠን ውሰዱ",
    },
    "medical_map.frequency.every_6_hours": {
        "en": "Take every 6 hours",
        "am": "በየስድስት ሰዓቱ ይውሰዱ",
        "ti": "ኣብ ነፍሲ ወከፍ 6 ሰዓት ውሰዱ",
    },

    # ---- Instruction phrases (from prescriptions.items.instructions) ----
    "medical_map.instruction.take_with_food": {
        "en": "Take with food",
        "am": "ከምግብ ጋር ይውሰዱ",
        "ti": "ምስ ምግቢ ውሰዱ",
    },
    "medical_map.instruction.for_headache_max_3g_day": {
        "en": "For headache, max 3g/day",
        "am": "ለራስ ምታት፣ በቀን ከ3 ግራም በላይ አይውሰዱ",
        "ti": "ንርእሲ ሕማም፣ ኣብ መዓልቲ ካብ 3 ግራም ንላዕሊ ኣይትውሰዱ",
    },
    "medical_map.instruction.take_30_min_before_breakfast": {
        "en": "Take 30 min before breakfast",
        "am": "ቁርስ ከመመገብዎ ከ30 ደቂቃ በፊት ይውሰዱ",
        "ti": "ቁርሲ ቅድሚ ምብላዕኩም 30 ደቂቕ ኣቐዲምኩም ውሰዱ",
    },
}


# ============================================================
# Seeder
# ============================================================

async def seed_medical_map():
    created = 0
    updated = 0

    async with AsyncSessionLocal() as db:
        for key, by_locale in MAPPINGS.items():
            for locale, value in by_locale.items():
                result = await db.execute(
                    select(ContentBlock)
                    .where(ContentBlock.key == key)
                    .where(ContentBlock.locale == locale)
                )
                existing = result.scalar_one_or_none()

                if existing is None:
                    db.add(ContentBlock(
                        key=key,
                        locale=locale,
                        value=value,
                        category=ContentCategory.CLINIC_INFO,
                        description=f"Medical map: {key}",
                        is_active=True,
                        sort_order=0,
                    ))
                    created += 1
                else:
                    if existing.value != value:
                        existing.value = value
                        updated += 1

        await db.commit()

    print(f"✅ Created: {created}")
    print(f"🔁 Updated: {updated}")
    print(f"📊 Total blocks: {len(MAPPINGS) * 3}")
    print()
    print("Sample rows:")
    print(f"  medical_map.frequency.3x_daily (am) = በቀን ሦስት ጊዜ ይውሰዱ")
    print(f"  medical_map.instruction.take_with_food (ti) = ምስ ምግቢ ውሰዱ")


if __name__ == "__main__":
    asyncio.run(seed_medical_map())
