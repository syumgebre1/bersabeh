"""
ORM models package.

Every model is imported here so that `import app.models` (from alembic/env.py)
registers all tables with Base.metadata.
"""

from app.models.appointment import Appointment, AppointmentStatus
from app.models.audit_log import AuditAction, AuditLog
from app.models.billing import Bill, BillItem, BillStatus, PaymentMethod
from app.models.call import CallStatus, VideoCall
from app.models.content import ContentBlock, ContentCategory
from app.models.encounter import Encounter, EncounterStatus, EncounterType
from app.models.lab import (
    LabOrder,
    LabOrderStatus,
    LabPriority,
    LabResult,
    LabResultType,
)
from app.models.messaging import (
    Message,
    MessageAttachment,
    Thread,
    ThreadKind,
    ThreadParticipant,
)
from app.models.notification import (
    Notification,
    NotificationChannel,
    NotificationKind,
)
from app.models.prescription import (
    Prescription,
    PrescriptionItem,
    PrescriptionStatus,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User, UserRole, UserStatus
from app.models.vital import Vital

__all__ = [
    # User & auth
    "User",
    "UserRole",
    "UserStatus",
    "RefreshToken",
    # Clinical
    "Appointment",
    "AppointmentStatus",
    "Encounter",
    "EncounterStatus",
    "EncounterType",
    "Prescription",
    "PrescriptionItem",
    "PrescriptionStatus",
    "Vital",
    "LabOrder",
    "LabOrderStatus",
    "LabPriority",
    "LabResult",
    "LabResultType",
    # Messaging & notifications
    "Thread",
    "ThreadKind",
    "ThreadParticipant",
    "Message",
    "MessageAttachment",
    "Notification",
    "NotificationKind",
    "NotificationChannel",
    # Video
    "VideoCall",
    "CallStatus",
    # Billing
    "Bill",
    "BillItem",
    "BillStatus",
    "PaymentMethod",
    # Audit
    "AuditLog",
    "AuditAction",
    # Content
    "ContentBlock",
    "ContentCategory",
]
