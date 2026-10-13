# Bersabeh Clinic - Demo Walkthrough

A scripted tour of the platform, designed to be run live in ~15 minutes.

## 0. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Docker Desktop | latest | for Postgres |
| Python | 3.12+ | backend venv |
| Node | 20+ | mobile/Expo |
| Expo Go | latest | on your phone, or use web |

## 1. Boot the stack

Terminal A (Postgres):
    cd ~/Projects/bersabeh
    docker compose up -d postgres
    docker ps

Terminal B (Backend):
    cd ~/Projects/bersabeh/backend
    source venv/bin/activate
    uvicorn app.main:app --reload --port 8000

Swagger UI: http://localhost:8000/docs

Terminal C (Expo):
    cd ~/Projects/bersabeh/mobile
    npx expo start --web

App: http://localhost:8081

## 2. Seed the demo data

    cd ~/Projects/bersabeh/backend
    source venv/bin/activate
    python scripts/seed.py
    python scripts/seed_demo.py

Reset at any time:

    python scripts/seed_demo.py --reset
    python scripts/seed_demo.py

## 3. Login credentials

All seeded accounts share the password: DemoPass123!

| Role        | Email                                 | What to show              |
|-------------|---------------------------------------|---------------------------|
| Super Admin | superadmin@bersabehclinic.com         | audit log, model registry |
| Admin       | admin@bersabehclinic.com              | approvals, staff, CMS     |
| Doctor      | selam.tesfaye@bersabehclinic.com      | encounters, prescriptions |
| Doctor      | dawit.bekele@bersabehclinic.com       | alternate doctor view     |
| Nurse       | hana.bekele@bersabehclinic.com        | vitals, triage            |
| Reception   | meron.tadesse@bersabehclinic.com      | appointments, check-in    |
| Lab         | yohannes.getachew@bersabehclinic.com  | lab orders and results    |
| Patient     | abebe.kebede@example.com              | booking, chat             |

Demo-only accounts:

| State    | Email                                | Purpose                    |
|----------|--------------------------------------|----------------------------|
| Pending  | patient.pending@bersabehclinic.com   | for the approve flow       |
| Rejected | patient.rejected@bersabehclinic.com  | shows rejection_reason UI  |
| Disabled | patient.disabled@bersabehclinic.com  | edge case                  |

## 4. Demo script (15 min)

### Scene 1 - Public landing (2 min)
- Open http://localhost:8081 logged out
- Show hero, departments, services, doctors (all CMS-driven)

### Scene 2 - Patient registration and approval (3 min)
- Register a new patient
- Log in as admin@bersabehclinic.com
- Admin -> Patients
- Approve one, reject another with a reason
- Verify:
    docker exec -i bersabeh_postgres psql -U bersabeh -d bersabeh_db -c "SELECT email, status FROM users WHERE is_seed_data=false ORDER BY created_at DESC LIMIT 5;"

### Scene 3 - Staff directory (1 min)
- Admin -> Team
- Search, group by role, show phone numbers

### Scene 4 - Doctor workflow (3 min)
- Log in as selam.tesfaye@bersabehclinic.com
- Show today's appointments
- Add a prescription inside an encounter

### Scene 5 - CMS live edit (3 min)
- Admin -> Content -> Clinic info
- Change clinic name, save
- Reload landing page - it is live
- Audit:
    docker exec -i bersabeh_postgres psql -U bersabeh -d bersabeh_db -c "SELECT action, entity_type, description, created_at FROM audit_logs WHERE entity_type='ContentBlock' ORDER BY created_at DESC LIMIT 3;"

### Scene 6 - Lab loop (2 min)
- Log in as yohannes.getachew@bersabehclinic.com
- Upload a lab result
- Switch back to doctor, result is visible

### Scene 7 - Reset and repeat (1 min)
    python scripts/seed_demo.py --reset
    python scripts/seed_demo.py

Real users and content_blocks are never touched.

## 5. Common gotchas

- Metro cache stale: npx expo start -c
- Postgres port 5432 in use: edit docker-compose.yml
- JWT secrets in backend/.env - do not commit
- bcrypt cost 12 is intentional (~250 ms per hash)
- Demo passwords are for dev only

## 6. Quick links

| Purpose    | Command or URL                                                          |
|------------|-------------------------------------------------------------------------|
| API docs   | http://localhost:8000/docs                                              |
| App (web)  | http://localhost:8081                                                   |
| Postgres   | docker exec -it bersabeh_postgres psql -U bersabeh -d bersabeh_db       |
| Reset demo | python scripts/seed_demo.py --reset && python scripts/seed_demo.py      |

Last updated: 2026-10-13 (M13)
