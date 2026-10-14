"""
Add is_archived to threads.

Note: `last_message_at` already exists in the DB (from the original M6
migration). This migration ONLY adds `is_archived`.

Pattern (3-step for NOT NULL on populated table):
  1. Add column as nullable.
  2. Backfill existing rows with FALSE.
  3. Alter column to NOT NULL.

See DECISIONS.md D014.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_is_archived_001"
down_revision: Union[str, None] = "17109222cf93"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add as nullable
    op.add_column(
        "threads",
        sa.Column("is_archived", sa.Boolean(), nullable=True),
    )
    # 2. Backfill existing rows
    op.execute("UPDATE threads SET is_archived = FALSE WHERE is_archived IS NULL")
    # 3. Set NOT NULL
    op.alter_column("threads", "is_archived", nullable=False)
    # 4. Index
    op.create_index("ix_threads_is_archived", "threads", ["is_archived"])


def downgrade() -> None:
    op.drop_index("ix_threads_is_archived", table_name="threads")
    op.drop_column("threads", "is_archived")
