"""
Allowed messaging matrix — the single source of truth for who can talk to whom.

This module is imported by the messaging API and consulted on every
thread creation. It is NOT consulted on message sends — if a thread exists,
its participants are already valid.

If you ever need to change who can message whom, you change ONE tuple below.
No API code changes required.

Design:
  - `ALLOWED_PAIRS` is a set of frozensets — direction-agnostic.
    Each frozenset contains two UserRole values.
  - Symmetric rule for all pairs (if A can message B, B can message A).
  - If a future feature requires asymmetric rules (e.g., "anyone can message
    admin, but admin can only reply"), add an `ASYMMETRIC_ALLOWED` set and
    check it in `can_send`.
"""

from __future__ import annotations

from itertools import combinations

from app.models.user import UserRole


# ============================================================
# The matrix
# ============================================================
# Each frozenset = one allowed pair. Symmetric.
# ============================================================

ALLOWED_PAIRS: set[frozenset[UserRole]] = {
    # ── Clinical ──
    frozenset({UserRole.DOCTOR, UserRole.PATIENT}),      # case-specific
    frozenset({UserRole.DOCTOR, UserRole.NURSE}),        # care instructions
    frozenset({UserRole.DOCTOR, UserRole.DOCTOR}),       # referral / 2nd opinion
    frozenset({UserRole.DOCTOR, UserRole.RECEPTION}),    # patient X arrived
    frozenset({UserRole.DOCTOR, UserRole.LAB}),          # follow-up on results

    # ── Reception ──
    frozenset({UserRole.RECEPTION, UserRole.PATIENT}),   # appointment confirmations

    # ── Nurse ──
    frozenset({UserRole.NURSE, UserRole.RECEPTION}),     # ward coordination
    frozenset({UserRole.NURSE, UserRole.NURSE}),         # shift handover

    # ── Lab ──
    frozenset({UserRole.LAB, UserRole.NURSE}),           # sample collection

    # ── Admin broadcasts ──
    frozenset({UserRole.ADMIN, UserRole.SUPER_ADMIN}),
    frozenset({UserRole.ADMIN, UserRole.DOCTOR}),
    frozenset({UserRole.ADMIN, UserRole.NURSE}),
    frozenset({UserRole.ADMIN, UserRole.RECEPTION}),
    frozenset({UserRole.ADMIN, UserRole.LAB}),
    frozenset({UserRole.ADMIN, UserRole.PATIENT}),       # appointment / account notices

    frozenset({UserRole.SUPER_ADMIN, UserRole.DOCTOR}),
    frozenset({UserRole.SUPER_ADMIN, UserRole.NURSE}),
    frozenset({UserRole.SUPER_ADMIN, UserRole.RECEPTION}),
    frozenset({UserRole.SUPER_ADMIN, UserRole.LAB}),
    frozenset({UserRole.SUPER_ADMIN, UserRole.PATIENT}),
}


# ============================================================
# Convenience — thread "kind" constraints
# ============================================================
# Some kinds are only valid for certain role combinations.

KIND_REQUIRED_ROLES: dict[str, set[frozenset[UserRole]]] = {
    "case": {
        frozenset({UserRole.DOCTOR, UserRole.PATIENT}),
        frozenset({UserRole.DOCTOR, UserRole.NURSE}),
        frozenset({UserRole.DOCTOR, UserRole.DOCTOR}),
        frozenset({UserRole.RECEPTION, UserRole.PATIENT}),
    },
    "appointment": {
        frozenset({UserRole.RECEPTION, UserRole.PATIENT}),
        frozenset({UserRole.DOCTOR, UserRole.RECEPTION}),
    },
    "referral": {
        frozenset({UserRole.DOCTOR, UserRole.DOCTOR}),
    },
    "broadcast": {
        # Only admins can originate broadcasts; we handle creator check separately.
        frozenset({UserRole.ADMIN, UserRole.DOCTOR}),
        frozenset({UserRole.ADMIN, UserRole.NURSE}),
        frozenset({UserRole.ADMIN, UserRole.RECEPTION}),
        frozenset({UserRole.ADMIN, UserRole.LAB}),
        frozenset({UserRole.ADMIN, UserRole.PATIENT}),
        frozenset({UserRole.SUPER_ADMIN, UserRole.DOCTOR}),
        frozenset({UserRole.SUPER_ADMIN, UserRole.NURSE}),
        frozenset({UserRole.SUPER_ADMIN, UserRole.RECEPTION}),
        frozenset({UserRole.SUPER_ADMIN, UserRole.LAB}),
        frozenset({UserRole.SUPER_ADMIN, UserRole.PATIENT}),
    },
    # "general" has no extra restriction beyond ALLOWED_PAIRS.
}


# ============================================================
# Public API
# ============================================================

def is_pair_allowed(role_a: UserRole, role_b: UserRole) -> bool:
    """Direction-agnostic: can A and B be in a thread together?"""
    return frozenset({role_a, role_b}) in ALLOWED_PAIRS


def can_send(from_role: UserRole, to_role: UserRole) -> bool:
    """Direction-aware. For now, all rules are symmetric — same as is_pair_allowed."""
    return is_pair_allowed(from_role, to_role)


def validate_thread_participants(
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
                f"Roles {a.value!r} and {b.value!r} are not allowed to message each other"
            )

    # Kind-specific checks.
    if kind in KIND_REQUIRED_ROLES:
        allowed_kinds = KIND_REQUIRED_ROLES[kind]
        # Every distinct unordered pair in the thread must appear in allowed_kinds.
        for a, b in combinations(participant_roles, 2):
            if frozenset({a, b}) not in allowed_kinds:
                raise ValueError(
                    f"Thread kind {kind!r} does not permit {a.value!r} ↔ {b.value!r}"
                )

    # Broadcasts must be created by admin-level roles.
    if kind == "broadcast" and creator_role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise ValueError("Only admins and super admins can create broadcast threads")
