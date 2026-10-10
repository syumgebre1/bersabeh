"""
Bersabeh Clinic — canonical clinic information.

SINGLE SOURCE OF TRUTH for clinic metadata at boot.
The Admin CMS (via `content_blocks`) can OVERRIDE any of these at runtime.
This file provides the defaults.

See DECISIONS.md for why this lives in Python AND mobile/constants/clinic.ts.
"""

from typing import TypedDict


class ClinicInfo(TypedDict):
    name: str
    tagline: str
    city: str
    neighborhood: str
    full_address: str
    landmark: str
    years_operating: int
    emergency_phone: str
    reception_phone: str
    email: str
    license_number: str
    working_hours: str
    parking_note: str


CLINIC: ClinicInfo = {
    "name": "Bersabeh Clinic",
    "tagline": "Trusted care for Addis Ababa since 2009",
    "city": "Addis Ababa",
    "neighborhood": "Bole",
    "full_address": "Bole Road, near Getu Commercial Center, Addis Ababa, Ethiopia",
    "landmark": "Opposite Getu Commercial Center, 2nd floor",
    "years_operating": 16,
    "emergency_phone": "+251 11 555 0199",
    "reception_phone": "+251 11 555 0177",
    "email": "info@bersabehclinic.com",
    "license_number": "MoH/AA/CL/2009/0421",
    "working_hours": "Mon–Sat 08:00–20:00 · Sun 09:00–13:00",
    "parking_note": "Street parking available; paid lot next door at Getu Center.",
}


DEPARTMENTS_SEED = [
    {"key": "internal_medicine", "name_en": "Internal Medicine", "description_en": "General adult care, chronic conditions, and diagnostics.", "icon": "stethoscope", "sort_order": 1},
    {"key": "general_surgery",   "name_en": "General Surgery",   "description_en": "Minor and major surgical procedures with post-op care.", "icon": "scissors", "sort_order": 2},
    {"key": "gastroenterology",  "name_en": "Gastroenterology",  "description_en": "Digestive system, liver, and endoscopic procedures.", "icon": "activity", "sort_order": 3},
    {"key": "cardiology",        "name_en": "Cardiology",        "description_en": "Heart health, ECG, echocardiography, and follow-up.", "icon": "heart-pulse", "sort_order": 4},
    {"key": "nephrology",        "name_en": "Nephrology",        "description_en": "Kidney function assessment and chronic kidney care.", "icon": "droplet", "sort_order": 5},
    {"key": "pulmonology",       "name_en": "Pulmonology",       "description_en": "Respiratory conditions, asthma, and pulmonary function.", "icon": "wind", "sort_order": 6},
    {"key": "post_op_care",      "name_en": "Post-op Care",      "description_en": "Recovery monitoring and wound management after surgery.", "icon": "bed", "sort_order": 7},
    {"key": "wound_care",        "name_en": "Wound Care",        "description_en": "Dressing, debridement, and chronic wound management.", "icon": "bandage", "sort_order": 8},
]


SERVICES_SEED = [
    {"key": "consultation",            "name_en": "General Consultation",    "description_en": "Initial or follow-up visit with a physician.", "price_min_etb": 300, "price_max_etb": 800,  "sort_order": 1},
    {"key": "specialist_consultation", "name_en": "Specialist Consultation", "description_en": "Visit with a specialist physician.",           "price_min_etb": 600, "price_max_etb": 1500, "sort_order": 2},
    {"key": "lab_basic",               "name_en": "Basic Lab Panel",         "description_en": "CBC, blood chemistry, urinalysis.",            "price_min_etb": 400, "price_max_etb": 1200, "sort_order": 3},
    {"key": "ecg",                     "name_en": "ECG",                     "description_en": "12-lead electrocardiogram with interpretation.","price_min_etb": 500, "price_max_etb": 900,  "sort_order": 4},
    {"key": "wound_dressing",          "name_en": "Wound Dressing",          "description_en": "Cleaning, dressing, and follow-up assessment.", "price_min_etb": 200, "price_max_etb": 600,  "sort_order": 5},
]


DOCTORS_SEED = [
    {"full_name": "Dr. Selam Tesfaye", "specialty": "Internal Medicine",  "years_experience": 12, "department_key": "internal_medicine"},
    {"full_name": "Dr. Dawit Bekele",  "specialty": "General Surgery",    "years_experience": 15, "department_key": "general_surgery"},
    {"full_name": "Dr. Hana Girma",    "specialty": "Gastroenterology",   "years_experience": 9,  "department_key": "gastroenterology"},
    {"full_name": "Dr. Yonas Alemu",   "specialty": "Cardiology",         "years_experience": 18, "department_key": "cardiology"},
]
