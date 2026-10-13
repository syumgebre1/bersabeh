#!/usr/bin/env bash
#
# safe_migration.sh — Alembic autogenerate wrapper that refuses no-op migrations.
#
# Usage:
#   ./scripts/safe_migration.sh "add bills table"
#
# Behavior:
#   1. Runs alembic revision --autogenerate with the given message.
#   2. Inspects the newly-created migration file.
#   3. If the migration is a no-op (no op.create_table / op.add_column /
#      op.alter_column / op.drop_* calls), it deletes the file and exits
#      with a warning.
#   4. Otherwise it leaves the file in place and prints the path.
#
# Why?
#   Repeated autogenerate runs with no schema change produce empty stub
#   migrations that pollute the chain (see DECISIONS.md D020-D023).
#   This script makes that impossible.

set -e

if [ -z "$1" ]; then
    echo "❌ Usage: $0 \"migration message\""
    exit 1
fi

MESSAGE="$1"
cd "$(dirname "$0")/.."

echo "════════════════════════════════════════════════════════════"
echo "  Running alembic revision --autogenerate -m \"$MESSAGE\""
echo "════════════════════════════════════════════════════════════"

# Snapshot the versions directory before
BEFORE=$(ls alembic/versions/*.py 2>/dev/null | sort | md5)

# Run autogenerate
alembic revision --autogenerate -m "$MESSAGE"

# Snapshot after
AFTER=$(ls alembic/versions/*.py 2>/dev/null | sort | md5)

if [ "$BEFORE" = "$AFTER" ]; then
    echo ""
    echo "❌ No new migration file was created (nothing to migrate?)"
    exit 0
fi

# Find the newest migration file
NEW_FILE=$(ls -t alembic/versions/*.py | head -1)
echo ""
echo "  Created: $NEW_FILE"

# Count real operations
OP_COUNT=$(grep -cE "op\.(create_table|add_column|alter_column|drop_table|drop_column|create_index|drop_index|create_foreign_key)" "$NEW_FILE" || true)

if [ "$OP_COUNT" -eq 0 ]; then
    echo ""
    echo "⚠️  This migration is a NO-OP (0 real operations)."
    echo "⚠️  Deleting it to keep the chain clean."
    rm -v "$NEW_FILE"
    echo ""
    echo "✅  No-op migration removed. The chain is unchanged."
    exit 0
fi

echo ""
echo "✅  Migration has $OP_COUNT real operation(s)."
echo ""
echo "  Next steps:"
echo "    alembic upgrade head"
echo "    git add alembic/versions/$NEW_FILE"
echo ""
