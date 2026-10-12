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

## D014 — Three-step pattern for adding NOT NULL columns
When adding a NOT NULL column to a populated table, Alembic autogenerate writes a
single ALTER TABLE that fails. The correct pattern is: (1) add as nullable, (2) backfill
existing rows, (3) ALTER to NOT NULL. Do this manually for any new NOT NULL column.

## D015 — Never hardcode UUIDs in scripts
A single mis-typed character in a hardcoded UUID breaks every downstream query with
no error message beyond "not found". Always extract IDs from the database or a fresh
API response. Environment variables or psql output are the source of truth.

## D016 — Use `docker exec -i` (no `-t`) when parsing output
macOS TTY allocation with `-t` appends `\r` to output lines, silently breaking string
comparisons in scripts. Use `-i` only (no `-t`) for any non-interactive command.

## D017 — Raise AUTH_RATE_LIMIT for dev
Production limit is 5/15min per IP (correct for a clinic). During development, set
`AUTH_RATE_LIMIT=1000/15minutes` in `.env`. Restart uvicorn after changing — `--reload`
watches only `.py` files, not `.env`.

## D018 — Always set `created_by_id` on audit-tracked entities
Every auditable model (Appointment, Encounter, and future Prescriptions, Labs, Bills)
has a NOT NULL `created_by_id`. The endpoint that creates the row must set it —
Python can't inject `current_user` at the model layer.

## D019 — PDF generation via WeasyPrint + embedded Jinja2 templates
Prescription, lab report, and (future) encounter summary PDFs are rendered
server-side with WeasyPrint. Templates live in app/services/pdf.py as Python
string constants (not a separate templates/ folder) to keep the service
self-contained. If templates grow past ~100 lines each, extract them.
Each PDF includes a QR code linking to a verify URL — the CMS can later
add a public /verify/{id} endpoint that shows a signed summary.

## D019 — PDF generation via WeasyPrint + embedded Jinja2 templates
Prescription, lab report, and (future) encounter summary PDFs are rendered
server-side with WeasyPrint. Templates live in app/services/pdf.py as Python
string constants (not a separate templates/ folder) to keep the service
self-contained. If templates grow past ~100 lines each, extract them.
Each PDF includes a QR code linking to a verify URL — the CMS can later
add a public /verify/{id} endpoint that shows a signed summary.

## D020 — Removed a no-op migration during M5
Running `alembic revision --autogenerate` twice in quick succession produced
two migrations: 6b7a0ea0ebe8 (the real one, which creates prescriptions, vitals,
lab_orders, lab_results) and 4823b3a4268a (an empty `pass` stub, because the
diff was already captured). To keep the history clean, we deleted the stub
file and manually updated `alembic_version` to point at 6b7a0ea0ebe8.
All tables are intact.

## D020 — Removed a no-op migration during M5
Running `alembic revision --autogenerate` twice in quick succession produced
two migrations: 6b7a0ea0ebe8 (the real one, which creates prescriptions, vitals,
lab_orders, lab_results) and 4823b3a4268a (an empty `pass` stub, because the
diff was already captured). To keep the history clean, we deleted the stub
file and manually updated `alembic_version` to point at 6b7a0ea0ebe8.
All tables are intact.

## D022 — Reset migrations to a single clean baseline
After M6 migration cleanup went sideways (multiple no-op files, tangled chain),
we deleted ALL migration files, cleared alembic_version, and generated a single
new empty migration (4ca1fd4f1c17) that reflects the current schema, then
`alembic stamp head` to mark it as applied. The DB schema is unchanged.
From now on: one migration per change, no re-runs, clean immediately if a
no-op appears.

## D022 — Reset migrations to a single clean baseline
After M6 migration cleanup went sideways (multiple no-op files, tangled chain),
we deleted ALL migration files, cleared alembic_version, and generated a single
new empty migration (4ca1fd4f1c17) that reflects the current schema, then
`alembic stamp head` to mark it as applied. The DB schema is unchanged.
From now on: one migration per change, no re-runs, clean immediately if a
no-op appears.
