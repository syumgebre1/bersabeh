"""
Messaging permission matrix.

Defines WHO can message WHO, and WHICH KINDS of threads are allowed for
each pair of roles.

Two layers of control:
  1. ALLOWED_PAIRS          — can these two roles message each other at all?
  2. KIND_REQUIRED_ROLES    — for a specific thread "kind", which role pairs
                              are permitted to participate?

`is_pair_allowed(a, b)` is direction-agnostic (symmetric).
`validate_thread_participants` enforces kind-specific rules on thread creation.

Design notes:
  - Patients CANNOT message other patients (privacy + clinical safety).
  - Patients CAN message: their doctor, nurse, reception (Option 1).
  - Patients CANNOT message lab directly — lab results are discussed by doctor.
  - Admin/Super Admin can message anyone (operational necessity).
  - Nurses can message doctors, other nurses, patients, reception, lab.
"""

from itertools import combinations

from app.models.user import UserRole


# ============================================================
# Layer 1 — Who can message whom at all
# ============================================================
ALLOWED_PAIRS: set[frozenset[UserRole]] = {
    # ── Patient ↔ (doctor, nurse, reception) ──
    frozenset({UserRole.DOCTOR, UserRole.PATIENT}),
    frozenset({UserRole.NURSE, UserRole.PATIENT}),       # Option 1: nurse directly messages patient
    frozenset({UserRole.RECEPTION, UserRole.PATIENT}),

    # ── Patient CANNOT message lab, admin, or other patients ──
    # (intentionally absent)

    # ── Clinical staff internal ──
    frozenset({UserRole.DOCTOR, UserRole.DOCTOR}),
    frozenset({UserRole.DOCTOR, UserRole.NURSE}),
    frozenset({UserRole.DOCTOR, UserRole.RECEPTION}),
    frozenset({UserRole.DOCTOR, UserRole.LAB}),
    frozenset({UserRole.DOCTOR, UserRole.ADMIN}),
    frozenset({UserRole.DOCTOR, UserRole.SUPER_ADMIN}),

    frozenset({UserRole.NURSE, UserRole.NURSE}),
    frozenset({UserRole.NURSE, UserRole.RECEPTION}),
    frozenset({UserRole.NURSE, UserRole.LAB}),
    frozenset({UserRole.NURSE, UserRole.ADMIN}),
    frozenset({UserRole.NURSE, UserRole.SUPER_ADMIN}),

    frozenset({UserRole.RECEPTION, UserRole.RECEPTION}),
    frozenset({UserRole.RECEPTION, UserRole.LAB}),
    frozenset({UserRole.RECEPTION, UserRole.ADMIN}),
    frozenset({UserRole.RECEPTION, UserRole.SUPER_ADMIN}),

    frozenset({UserRole.LAB, UserRole.LAB}),
    frozenset({UserRole.LAB, UserRole.ADMIN}),
    frozenset({UserRole.LAB, UserRole.SUPER_ADMIN}),

    frozenset({UserRole.ADMIN, UserRole.ADMIN}),
    frozenset({UserRole.ADMIN, UserRole.SUPER_ADMIN}),
    frozenset({UserRole.ADMIN, UserRole.PATIENT}),       # appointment / account notices
    frozenset({UserRole.SUPER_ADMIN, UserRole.SUPER_ADMIN}),
}


def is_pair_allowed(role_a: UserRole, role_b: UserRole) -> bool:
    """Direction-agnostic: can A and B be in a thread together?"""
    return frozenset({role_a, role_b}) in ALLOWED_PAIRS


def can_send(from_role: UserRole, to_role: UserRole) -> bool:
    """Direction-aware. For now, all rules are symmetric."""
    return is_pair_allowed(from_role, to_role)


# ============================================================
# Layer 2 — Which role pairs are allowed per thread kind
# ============================================================
KIND_REQUIRED_ROLES: dict[str, set[frozenset[UserRole]]] = {
    "case": {
        frozenset({UserRole.DOCTOR, UserRole.PATIENT}),      # classic: patient sees doctor
        frozenset({UserRole.DOCTOR, UserRole.NURSE}),        # doctor + nurse coordination
        frozenset({UserRole.DOCTOR, UserRole.DOCTOR}),       # doctor ↔ doctor consultation
        frozenset({UserRole.RECEPTION, UserRole.PATIENT}),   # reception flagged a case
        frozenset({UserRole.NURSE, UserRole.PATIENT}),       # Option 1: nurse ↔ patient case
    },
    "appointment": {
        frozenset({UserRole.RECEPTION, UserRole.PATIENT}),
        frozenset({UserRole.DOCTOR, UserRole.RECEPTION}),
    },
    "referral": {
        frozenset({UserRole.DOCTOR, UserRole.DOCTOR}),
    },
    "logistics": {
        # Nurse ↔ Patient: room assignment, medication time, general coordination
        frozenset({UserRole.NURSE, UserRole.PATIENT}),
        # Nurse ↔ Reception: bed assignment, admissions, discharge
        frozenset({UserRole.NURSE, UserRole.RECEPTION}),
        # Reception ↔ Patient: bed-related updates, check-in logistics
        frozenset({UserRole.RECEPTION, UserRole.PATIENT}),
    },
    "broadcast": {
        # Only admins can originate broadcasts; we handle creator check separately.
        frozenset({UserRole.ADMIN, UserRole.DOCTOR}),
        frozenset({UserRole.ADMIN, UserRole.NURSE}),
        frozenset({UserRole.ADMIN, UserRole.RECEPTION}),
        frozenset({UserRole.ADMIN, UserRole.LAB}),
        frozenset({UserRole.ADMIN, UserRole.PATIENT}),
    },
}


# ============================================================
# Validation
# ============================================================
def validate_thread_participants(
    *,
    kind: str,
    creator_role: UserRole,
    participant_roles: list[UserRole],
) -> None:
    """
    Raise ValueError if the given participant roles are not allowed together
    for a thread of this kind.

    `participant_roles` should include the creator (typically as the first element).
    """
    if len(participant_roles) < 2:
        raise ValueError("A thread must have at least 2 participants")

    # All pairs must be allowed.
    for a, b in combinations(participant_roles, 2):
        if not is_pair_allowed(a, b):
            raise ValueError(
                f"Roles '{a.value}' and '{b.value}' are not allowed to message each other"
            )

    # Kind-specific checks.
    if kind in KIND_REQUIRED_ROLES:
        allowed_kinds = KIND_REQUIRED_ROLES[kind]
        # Every distinct unordered pair in the thread must appear in allowed_kinds.
        for a, b in combinations(participant_roles, 2):
            if frozenset({a, b}) not in allowed_kinds:
                raise ValueError(
                    f"Thread kind '{kind}' does not permit {a.value!r} ↔ {b.value!r}"
                )

    # Broadcasts must be created by admin-level roles.
    if kind == "broadcast" and creator_role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise ValueError("Only admins and super admins can create broadcast threads")
