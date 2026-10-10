# Bersabeh Clinic Platform — Decisions Log

Every non-obvious technical or product decision, with reasoning.

---

## D001 — Monorepo (backend + mobile + docs in one repo)
Single git repo with backend/, mobile/, root docs. Keeps shared types, seed data, and contracts in sync.

## D002 — Python 3.14 (not 3.12)
Target the version already installed on the dev machine. Risk mitigated by D003 and D004.

## D003 — Drop passlib, use bcrypt directly
passlib unmaintained since 2020, broken on Python 3.13+. Direct bcrypt is what passlib wrapped anyway.

## D004 — Pin pydantic==2.12.1 and pydantic-settings==2.10.0
Earlier 2.10.x ships pydantic-core 2.27.x, which uses an old PyO3 that refuses to build for Python 3.14. 2.12.x has pre-built wheels.

## D005 — No email verification for patient accounts
Patients self-register → admin manually approves (or rejects with reason).

## D006 — Anonymize on user delete, not hard delete
is_deleted=true, PII scrubbed, but prescriptions, messages, and audit trail preserved.

## D007 — Video calls via Jitsi
Backend manages call requests, routing, audit. Media via Jitsi room link.

## D008 — content_blocks table for CMS-managed content
All user-editable content stored as (key, locale, value_jsonb).

## D009 — 7 roles (not 5)
SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTION, LAB, PATIENT.

## D010 — encounters as first-class entity
Prescriptions, vitals, labs, bills, clinical messages reference encounter_id.

## D011 — Local /uploads behind StorageService abstraction
Local dev zero-config. Swap implementation for S3/R2 at deploy time.

## D012 — English placeholders in am.json / ti.json
Machine-translated Amharic/Tigrigna is often wrong. Clinic will translate properly.

## D013 — Pin WeasyPrint behind DYLD_FALLBACK_LIBRARY_PATH
On Apple Silicon, Homebrew libs live in /opt/homebrew/lib. python.org Python does not search there by default.
