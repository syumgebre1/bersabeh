# Bersabeh Clinic Platform — Milestone Plan

Legend: pending · in-progress · done

## DONE — M0 Foundation
Monorepo, Docker infra (Postgres 16 + MailHog + pgAdmin), Python 3.14 venv, config files, docs.

## NEXT — M1 Backend skeleton
FastAPI boots, /health returns 200, DB connected, Alembic initialized, CORS configured.

## M2 Auth + Users
Register, login, refresh, logout, /users/me, role guards, JWT rotation, rate limiting.

## M3 Seeding + patient approval flow
seed.py creates all roles. Admin approve/reject with reason.

## M4 Appointments + Encounters
Full CRUD, role-filtered, encounters as first-class.

## M5 Prescriptions, Vitals, Labs, PDF export
WeasyPrint PDFs with wordmark + QR code.

## M6 Messaging + WebSocket + uploads
Threads with allowed-pairs matrix. WS push. Multi-attachment uploads.

## M7 Video calls
Request flow, reception triage, doctor acceptance, Jitsi room URL, audit.

## M8 Billing + audit log
Bill CRUD with status flag. Read API for audit_log.

## M9 Content CMS backend
content_blocks table, grouped read, admin write, reorder endpoints.

## M10 Mobile shell + landing page
Expo Router, i18n (en/am/ti), Urban Ethio design system, public site.

## M11 Role dashboards
7 visually distinct dashboards.

## M12 Admin CMS (no-code)
Staff, patients, content, departments, services CRUD.

## M13 Polish + demo
Screenshots, walkthrough, final i18n pass, README polish.
