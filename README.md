# Bersabeh Clinic Platform

A role-based hospital management platform for a real clinic in Addis Ababa,
Ethiopia. Cross-platform (iOS, Android, Web) from one Expo codebase, backed
by FastAPI + PostgreSQL.

---

## What it does

Seven roles, one platform:

| Role | Capabilities |
|------|--------------|
| **Patient** | Book appointments, view prescriptions and lab results, chat with their doctor, join video calls |
| **Doctor** | See daily schedule, run encounters, write prescriptions, order labs, request video calls |
| **Nurse** | Record vitals, triage queue, mark appointments as checked-in |
| **Reception** | Schedule appointments, check patients in, manage the front desk |
| **Lab** | Receive lab orders, upload results, hand them back to the ordering doctor |
| **Admin** | Approve patient registrations, manage staff, edit all CMS content |
| **Super Admin** | Everything above, plus audit log and system-wide config |

Plus a public-facing landing page whose hero, departments, services, and
doctor cards are all editable from the admin CMS without a redeploy.

---

## Tech stack

| Layer | Tools |
|-------|-------|
| Backend | FastAPI 0.115, SQLAlchemy 2.1 (async), Alembic, PostgreSQL 16 |
| Auth | JWT (python-jose) with separate access/refresh secrets, bcrypt cost 12 |
| Frontend | Expo SDK 51, React Native 0.74, expo-router |
| State | TanStack Query for server state, Zustand for client state |
| Forms | react-hook-form |
| Files | WeasyPrint (PDF export), qrcode, fastapi-mail |
| Infra | Docker Compose (Postgres only), ruff for lint, pytest for tests |

---

## Quickstart

Full walkthrough with demo scenarios: see [docs/DEMO.md](docs/DEMO.md).

### Prerequisites (macOS)

- Homebrew 4+
- Git 2.40+
- Python 3.14 (see `DECISIONS.md` for why 3.14, not 3.12)
- Node.js 20+
- Docker Desktop

### First-time setup

    git clone <repo> ~/Projects/bersabeh
    cd ~/Projects/bersabeh
    cp .env.example .env
    echo "JWT_SECRET_KEY=$(openssl rand -hex 32)"
    echo "JWT_REFRESH_SECRET_KEY=$(openssl rand -hex 32)"
    # paste the two generated values into .env

    docker compose up -d
    docker compose ps

    cd backend
    python3.14 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    alembic upgrade head

    cd ../mobile
    npm install

### Seed demo data

    cd ../backend
    source venv/bin/activate
    python scripts/seed.py
    python scripts/seed_demo.py

All demo accounts share the password **DemoPass123!**

To reset back to a clean demo state at any time:

    python scripts/seed_demo.py --reset
    python scripts/seed_demo.py

### Run everything

Terminal A (Postgres):

    docker compose up -d postgres

Terminal B (Backend):

    cd ~/Projects/bersabeh/backend
    source venv/bin/activate
    uvicorn app.main:app --reload --port 8000

Swagger UI: http://localhost:8000/docs

Terminal C (Expo):

    cd ~/Projects/bersabeh/mobile
    npx expo start --web

App: http://localhost:8081

---

## Demo credentials

| Role | Email |
|------|-------|
| Super Admin | superadmin@bersabehclinic.com |
| Admin | admin@bersabehclinic.com |
| Doctor | selam.tesfaye@bersabehclinic.com |
| Doctor | dawit.bekele@bersabehclinic.com |
| Nurse | hana.bekele@bersabehclinic.com |
| Reception | meron.tadesse@bersabehclinic.com |
| Lab | yohannes.getachew@bersabehclinic.com |
| Patient | abebe.kebede@example.com |

Password for all: **DemoPass123!**

---

## Milestones shipped

| # | Feature | Commit |
|---|---------|--------|
| M0 | Monorepo scaffold + foundation | cfe5ceb, 19ca533 |
| M1 | FastAPI skeleton | 78022c0 |
| M2 | Auth, users, roles | 9833c89 |
| M3 | Seed script + patient approval flow | d861b38 |
| M4 | Appointments + encounters | 6155520 |
| M5 | Prescriptions, vitals, labs, PDF export | df12d1c |
| M6 | Messaging + WebSocket + file uploads | 0872470 |
| M7 | Video calls (Jitsi) | cf89a0a |
| M8 | Billing + audit log | c3634a8 |
| M9 | Content CMS backend | 5b43a11 |
| M10 | Landing page (11 CMS-driven sections) | e69b9be ... d23a5b5 |
| M11 | Role dashboards (nurse, reception, lab, admin, super-admin) | ebb8545 ... 09e5b8d |
| M12 | CMS hub + staff directory + patient approvals | b69a7a3 ... 193aeef |
| M13 | Demo seeder + walkthrough doc | bd655f1, 2987fcd |

---

## Architecture

    bersabeh/
    ├── backend/
    │   ├── app/
    │   │   ├── api/         # FastAPI routers, grouped by domain
    │   │   ├── core/        # config, security, deps, rate limit
    │   │   ├── db/          # async session, base
    │   │   ├── models/      # SQLAlchemy models (User, Appointment, ...)
    │   │   ├── schemas/     # Pydantic request/response schemas
    │   │   ├── services/    # business logic (audit, mail, PDF, ...)
    │   │   └── main.py
    │   ├── alembic/         # migrations
    │   ├── scripts/         # seed.py, seed_demo.py, safe_migration.sh
    │   └── requirements.txt
    ├── mobile/
    │   ├── app/             # expo-router routes
    │   │   ├── (auth)/      # login, register
    │   │   ├── (app)/       # authed area
    │   │   │   ├── admin/   # staff, patients, content CMS
    │   │   │   ├── doctor/
    │   │   │   ├── nurse/
    │   │   │   ├── reception/
    │   │   │   ├── lab/
    │   │   │   └── patient/
    │   │   └── index.tsx    # public landing
    │   ├── components/      # shared UI
    │   ├── lib/             # api client, queries, hooks
    │   ├── store/           # Zustand stores
    │   └── theme/           # colors, typography, spacing
    ├── docs/
    │   ├── DEMO.md          # 15-minute walkthrough
    │   └── DECISIONS.md     # architecture decision records
    ├── DECISIONS.md
    ├── MILESTONES.md
    └── docker-compose.yml

---

## Docs

- **[docs/DEMO.md](docs/DEMO.md)** — 15-minute scripted walkthrough
- **[DECISIONS.md](DECISIONS.md)** — ADRs (bcrypt over passlib, Python 3.14, separate JWT secrets, ...)
- **[MILESTONES.md](MILESTONES.md)** — build log per milestone

---

## Roadmap

- Live video call polish (recording, screen share)
- Bilingual UI (Amharic / English) via locale store
- SMS appointment reminders
- Deployment recipe (Fly.io backend, Vercel web, EAS mobile builds)
- Full test coverage on the appointment + prescription flows

---

## License

Private. All rights reserved.
