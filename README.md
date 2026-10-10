# Bersabeh Clinic Platform

A role-based hospital management platform for a real clinic in Addis Ababa, Ethiopia.
Cross-platform (iOS, Android, Web) from one Expo codebase, backed by FastAPI + PostgreSQL.

## Prerequisites (macOS)

- Homebrew 4+
- Git 2.40+
- Python 3.14
- Node.js 20+
- Docker Desktop
- WeasyPrint system libs: pango, cairo, gdk-pixbuf, libffi
- VS Code

## First-time setup

    git clone <repo> ~/Projects/bersabeh
    cd ~/Projects/bersabeh
    cp .env.example .env
    # generate JWT secrets:
    echo "JWT_SECRET_KEY=$(openssl rand -hex 32)"
    echo "JWT_REFRESH_SECRET_KEY=$(openssl rand -hex 32)"
    # paste into .env

    docker compose up -d
    docker compose ps

    cd backend
    python3.14 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt

    # WeasyPrint on Apple Silicon:
    echo 'export DYLD_FALLBACK_LIBRARY_PATH="/opt/homebrew/lib:$DYLD_FALLBACK_LIBRARY_PATH"' >> ~/.zshrc
    source ~/.zshrc

## Services

- PostgreSQL: localhost:5432 (bersabeh / bersabeh_dev_password)
- MailHog: http://localhost:8025
- pgAdmin: http://localhost:5050 (admin@bersabeh.local / admin)

## Daily workflow

    docker compose up -d      # start infra
    open -a Docker            # if whale is not running
    docker compose down       # stop (data persists)
    docker compose down -v    # WARNING: destroys data

## Structure

    bersabeh/
    ├── backend/     FastAPI + SQLAlchemy + Alembic
    ├── mobile/      Expo + React Native + Expo Router
    ├── docs/        Design notes (later)
    ├── docker-compose.yml
    ├── MILESTONES.md
    ├── DECISIONS.md
    └── README.md

## Tech stack

Backend: Python 3.14, FastAPI, PostgreSQL 16, SQLAlchemy 2.0 async, Alembic, Pydantic v2, JWT, WebSockets, WeasyPrint
Mobile: React Native (Expo SDK 51+), Expo Router, TypeScript, Zustand, TanStack Query, React Hook Form + Zod, i18next (en/am/ti), lucide-react-native

## License

Proprietary — Bersabeh Clinic, Addis Ababa, Ethiopia.
