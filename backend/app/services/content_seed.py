"""
Content seed — idempotent populator of the content_blocks table.

Seeds ~60 content blocks per locale derived from clinic_config.py.
Running this multiple times will only INSERT missing (key, locale) pairs.

For locales "am" and "ti", the value is a COPY of the English text and the
description is prefixed with "[TODO: translate] ". This is intentional —
machine-translated Amharic/Tigrigna is often subtly wrong, and the clinic
will translate properly via the CMS (see DECISIONS.md D012).
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clinic_config import CLINIC, DEPARTMENTS_SEED, SERVICES_SEED
from app.models.content import ContentBlock, ContentCategory


# ============================================================
# Build the full seed list
# ============================================================
def _build_seed_blocks() -> list[dict[str, Any]]:
    """Return every default content block (en locale only — call sites duplicate for other locales)."""
    blocks: list[dict[str, Any]] = []

    # ── Landing ──
    landing = [
        ("landing.hero.headline", f"Trusted care for {CLINIC['city']} since {2009 + CLINIC['years_operating'] - 16}", ContentCategory.LANDING, "Hero headline", 10),
        ("landing.hero.subhead", "Modern medicine, delivered by experienced physicians in the heart of the city. From routine check-ups to specialist consultations.", ContentCategory.LANDING, "Hero subheadline", 20),
        ("landing.hero.cta_primary", "Book Appointment", ContentCategory.LANDING, "Primary CTA button label", 30),
        ("landing.hero.cta_secondary", "Patient Portal", ContentCategory.LANDING, "Secondary CTA button label", 40),
        ("landing.trust.licensed", "MoH licensed", ContentCategory.LANDING, "Trust strip: license status", 50),
        ("landing.trust.doctors_count", "4 specialists", ContentCategory.LANDING, "Trust strip: doctors count", 60),
        ("landing.trust.years", f"Since {2009 + CLINIC['years_operating'] - 16}", ContentCategory.LANDING, "Trust strip: years operating", 70),
        ("landing.trust.emergency", "24/7 emergency line", ContentCategory.LANDING, "Trust strip: emergency", 80),
        ("landing.footer.tagline", "Bersabeh Clinic — trusted care for Addis Ababa.", ContentCategory.LANDING, "Footer tagline", 90),
        ("landing.footer.copyright", "© Bersabeh Clinic. All rights reserved.", ContentCategory.LANDING, "Footer copyright", 100),
    ]
    for key, value, cat, desc, order in landing:
        blocks.append({"key": key, "value": value, "category": cat, "description": desc, "sort_order": order})

    # ── Clinic info ──
    clinic_info = [
        ("clinic_info.name", CLINIC["name"], ContentCategory.CLINIC_INFO, "Clinic name", 10),
        ("clinic_info.neighborhood", CLINIC["neighborhood"], ContentCategory.CLINIC_INFO, "Neighborhood", 20),
        ("clinic_info.address.full", CLINIC["full_address"], ContentCategory.CLINIC_INFO, "Full address", 30),
        ("clinic_info.landmark", CLINIC["landmark"], ContentCategory.CLINIC_INFO, "Landmark", 40),
        ("clinic_info.phones.emergency", CLINIC["emergency_phone"], ContentCategory.CLINIC_INFO, "Emergency phone", 50),
        ("clinic_info.phones.reception", CLINIC["reception_phone"], ContentCategory.CLINIC_INFO, "Reception phone", 60),
        ("clinic_info.email", CLINIC["email"], ContentCategory.CLINIC_INFO, "Contact email", 70),
        ("clinic_info.hours.weekday", "Mon–Sat 08:00–20:00", ContentCategory.CLINIC_INFO, "Weekday hours", 80),
        ("clinic_info.hours.weekend", "Sun 09:00–13:00", ContentCategory.CLINIC_INFO, "Weekend hours", 90),
        ("clinic_info.license_number", CLINIC["license_number"], ContentCategory.CLINIC_INFO, "MoH license number", 100),
        ("clinic_info.parking_note", CLINIC["parking_note"], ContentCategory.CLINIC_INFO, "Parking note", 110),
    ]
    for key, value, cat, desc, order in clinic_info:
        blocks.append({"key": key, "value": value, "category": cat, "description": desc, "sort_order": order})

    # ── Departments ──
    for dept in DEPARTMENTS_SEED:
        k = dept["key"]
        blocks.append({"key": f"departments.{k}.name", "value": dept["name_en"], "category": ContentCategory.DEPARTMENTS, "description": f"{dept['name_en']} — name", "sort_order": dept["sort_order"] * 10})
        blocks.append({"key": f"departments.{k}.description", "value": dept["description_en"], "category": ContentCategory.DEPARTMENTS, "description": f"{dept['name_en']} — description", "sort_order": dept["sort_order"] * 10 + 1})
        blocks.append({"key": f"departments.{k}.icon", "value": dept["icon"], "category": ContentCategory.DEPARTMENTS, "description": f"{dept['name_en']} — lucide icon name", "sort_order": dept["sort_order"] * 10 + 2})

    # ── Services ──
    for svc in SERVICES_SEED:
        k = svc["key"]
        blocks.append({"key": f"services.{k}.name", "value": svc["name_en"], "category": ContentCategory.SERVICES, "description": f"{svc['name_en']} — name", "sort_order": svc["sort_order"] * 10})
        blocks.append({"key": f"services.{k}.description", "value": svc["description_en"], "category": ContentCategory.SERVICES, "description": f"{svc['name_en']} — description", "sort_order": svc["sort_order"] * 10 + 1})
        blocks.append({"key": f"services.{k}.price_range_etb", "value": {"min": svc["price_min_etb"], "max": svc["price_max_etb"]}, "category": ContentCategory.SERVICES, "description": f"{svc['name_en']} — price range", "sort_order": svc["sort_order"] * 10 + 2})

    return blocks


# ============================================================
# Seeder
# ============================================================
LOCALES = ["en", "am", "ti"]


async def seed_content(db: AsyncSession) -> dict[str, int]:
    """
    Insert any missing content blocks. Returns {'created': N, 'skipped': M}.
    Safe to run repeatedly.
    """
    en_blocks = _build_seed_blocks()
    created = 0
    skipped = 0

    for locale in LOCALES:
        for block in en_blocks:
            key = block["key"]

            # Idempotency check
            existing = await db.execute(
                select(ContentBlock.id)
                .where(ContentBlock.key == key)
                .where(ContentBlock.locale == locale)
            )
            if existing.scalar_one_or_none() is not None:
                skipped += 1
                continue

            # For non-English locales, mark as TODO + copy English text.
            if locale == "en":
                description = block["description"]
                value = block["value"]
            else:
                description = f"[TODO: translate] {block['description']}"
                value = block["value"]

            db.add(ContentBlock(
                key=key,
                locale=locale,
                value=value,
                category=block["category"],
                description=description,
                is_active=True,
                sort_order=block["sort_order"],
            ))
            created += 1

    await db.commit()
    return {"created": created, "skipped": skipped}
