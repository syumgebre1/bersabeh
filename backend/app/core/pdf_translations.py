"""
PDF label translations for printed documents.

Kept as a static Python dict (not DB-backed) so PDF generation is:
  - Fast (no DB round-trip per download)
  - Deterministic (same input always produces same output)
  - Reliable (no dependency on DB state for a patient's printed record)

If we later want admin-editable PDF labels, we migrate this to
content_blocks with key prefix `pdf.` and keep this as fallback.
"""

from __future__ import annotations


TRANSLATIONS: dict[str, dict[str, str]] = {

    # ─────── English ───────
    "en": {
        "prescription": "Prescription",
        "labReport": "Lab Report",
        "bill": "Bill",
        "invoice": "Invoice",
        "issued": "Issued",
        "license": "License",
        "patient": "Patient",
        "name": "Name",
        "phone": "Phone",
        "prescriber": "Prescriber",
        "prescriberSignature": "Prescriber signature",
        "labSignature": "Lab technologist signature",
        "scanToVerify": "Scan to verify",
        "electronic": "This document was generated electronically",
        "verifyAt": "Verify at",
        "medications": "Medications",
        "medication": "Medication",
        "dose": "Dose",
        "frequency": "Frequency",
        "duration": "Duration",
        "days": "Days",
        "instructions": "Instructions",
        "total": "Total",
        "subtotal": "Subtotal",
        "tax": "Tax",
        "paid": "Paid",
        "balanceDue": "Balance due",
        "testOrdered": "Test Ordered",
        "test": "Test",
        "orderedBy": "Ordered by",
        "priority": "Priority",
        "orderedAt": "Ordered at",
        "result": "Result",
        "units": "Units",
        "referenceRange": "Reference range",
        "interpretation": "Interpretation",
        "labNotes": "Lab Notes",
        "notes": "Notes",
        "followUp": "Follow-up",
        "date": "Date",
    },

    # ─────── Amharic ───────
    "am": {
        "prescription": "የሕክምና ማዘዣ",
        "labReport": "የላቦራቶሪ ሪፖርት",
        "bill": "የሂሳብ መጠየቂያ",
        "invoice": "ደረሰኝ",
        "issued": "የተሰጠበት",
        "license": "ፍቃድ",
        "patient": "ታካሚ",
        "name": "ስም",
        "phone": "ስልክ",
        "prescriber": "አዛዥ ሐኪም",
        "prescriberSignature": "የሐኪሙ ፊርማ",
        "labSignature": "የላቦራቶሪ ባለሙያ ፊርማ",
        "scanToVerify": "ለማረጋገጥ ይቃኙ",
        "electronic": "ይህ ሰነድ በኤሌክትሮኒክስ መንገድ የተዘጋጀ ነው",
        "verifyAt": "በሚከተለው አድራሻ ያረጋግጡ",
        "medications": "መድኃኒቶች",
        "medication": "መድኃኒት",
        "dose": "መጠን",
        "frequency": "የድግግሞሽ መጠን",
        "duration": "የቆይታ ጊዜ",
        "days": "ቀናት",
        "instructions": "መመሪያዎች",
        "total": "ጠቅላላ",
        "subtotal": "ንዑስ ድምር",
        "tax": "ግብር",
        "paid": "የተከፈለ",
        "balanceDue": "የሚቀረው ቀሪ ሂሳብ",
        "testOrdered": "የታዘዘ ፈተና",
        "test": "ፈተና",
        "orderedBy": "ያዘዘው",
        "priority": "ቅድሚያ",
        "orderedAt": "የታዘዘበት ሰዓት",
        "result": "ውጤት",
        "units": "መለኪያዎች",
        "referenceRange": "መደበኛ ክልል",
        "interpretation": "ትርጉም",
        "labNotes": "የላቦራቶሪ ማስታወሻዎች",
        "notes": "ማስታወሻዎች",
        "followUp": "ክትትል",
        "date": "ቀን",
    },

    # ─────── Tigrigna ───────
    "ti": {
        "prescription": "ናይ ሕክምና ትእዛዝ",
        "labReport": "ናይ ላቦራቶሪ ሪፖርት",
        "bill": "ቢል",
        "invoice": "ንውኢት",
        "issued": "ዝተዋህበ",
        "license": "ፍቓድ",
        "patient": "ሕሙም",
        "name": "ስም",
        "phone": "ቁጽሪ ስልኪ",
        "prescriber": "ዝኣዘዘ ሓኪም",
        "prescriberSignature": "ፊርማ ሓኪም",
        "labSignature": "ፊርማ ሰብ ሞያ ላቦራቶሪ",
        "scanToVerify": "ንምርግጋጽ ስካን ግበር",
        "electronic": "እዚ ሰነድ በኤሌክትሮኒክስ ዝተዳለወ እዩ",
        "verifyAt": "ኣብዚ ኣረጋግጽ",
        "medications": "መድሃኒታት",
        "medication": "መድሃኒት",
        "dose": "መጠን",
        "frequency": "ድግግሞሽ",
        "duration": "ቆይታ",
        "days": "መዓልትታት",
        "instructions": "መመርሒታት",
        "total": "ጠቕላላ",
        "subtotal": "ንኡስ ድምር",
        "tax": "ግብሪ",
        "paid": "ዝተከፍለ",
        "balanceDue": "ዝተረፈ ክፍያ",
        "testOrdered": "ዝተኣዘዘ መርመራ",
        "test": "መርመራ",
        "orderedBy": "ዝኣዘዞ",
        "priority": "ቀዳምነት",
        "orderedAt": "ዝተኣዘዘሉ ሰዓት",
        "result": "ውጽኢት",
        "units": "መለክዒታት",
        "referenceRange": "መወከሲ መጠን",
        "interpretation": "ትርጉም",
        "labNotes": "ናይ ላቦራቶሪ መዘኻኸሪታት",
        "notes": "መዘኻኸሪታት",
        "followUp": "ክትትል",
        "date": "ዕለት",
    },
}


# Medical-map keys (used to translate medication frequency + instructions
# that come from the doctor's free-text input)
MEDICAL_MAP: dict[str, dict[str, str]] = {
    "en": {
        "3x daily": "Take three times daily",
        "2x daily": "Take twice daily",
        "1x daily": "Take once daily",
        "as needed": "Take as needed",
        "Take with food": "Take with food",
        "For headache, max 3g/day": "For headache, max 3g/day",
        "Take 30 min before breakfast": "Take 30 min before breakfast",
    },
    "am": {
        "3x daily": "በቀን ሦስት ጊዜ ይውሰዱ",
        "2x daily": "በቀን ሁለት ጊዜ ይውሰዱ",
        "1x daily": "በቀን አንድ ጊዜ ይውሰዱ",
        "as needed": "እንደ አስፈላጊነቱ ይውሰዱ",
        "Take with food": "ከምግብ ጋር ይውሰዱ",
        "For headache, max 3g/day": "ለራስ ምታት፣ በቀን ከ3 ግራም በላይ አይውሰዱ",
        "Take 30 min before breakfast": "ከቁርስ ከ30 ደቂቃ በፊት ይውሰዱ",
    },
    "ti": {
        "3x daily": "ኣብ መዓልቲ ሰለስተ ጊዜ ውሰዱ",
        "2x daily": "ኣብ መዓልቲ ክልተ ጊዜ ውሰዱ",
        "1x daily": "ኣብ መዓልቲ ሓደ ጊዜ ውሰዱ",
        "as needed": "ከም ዘድልየኩም መጠን ውሰዱ",
        "Take with food": "ምስ ምግቢ ውሰዱ",
        "For headache, max 3g/day": "ንርእሲ ሕማም፣ ኣብ መዓልቲ ካብ 3 ግራም ንላዕሊ ኣይትውሰዱ",
        "Take 30 min before breakfast": "ቁርሲ ቅድሚ ምብላዕኩም 30 ደቂቕ ኣቐዲምኩም ውሰዱ",
    },
}


def get_pdf_translations(locale: str) -> dict[str, str]:
    """
    Return the PDF label dict for the given locale.
    Falls back to English if locale is unknown.
    """
    return TRANSLATIONS.get(locale, TRANSLATIONS["en"])


def get_medical_translations(locale: str) -> dict[str, str]:
    """
    Return the medical value map (frequency, instructions) for the locale.
    """
    return MEDICAL_MAP.get(locale, MEDICAL_MAP["en"])
