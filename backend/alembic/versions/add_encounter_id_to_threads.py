"""
Add encounter_id to threads.

Nullable foreign key to encounters.id — a thread can optionally be linked
to the clinical encounter that triggered it (e.g. a case discussion started
during a visit). SET NULL on encounter delete preserves the thread.

Nullable → no backfill needed. This is the trivial case of the 3-step
pattern (see DECISIONS.md D014).

Revision ID: add_encounter_id_001
Revises: add_is_archived_001
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_encounter_id_001"
down_revision: Union[str, None] = "add_is_archived_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "threads",
        sa.Column("encounter_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_threads_encounter_id_encounters",
        "threads",
        "encounters",
        ["encounter_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_threads_encounter_id",
        "threads",
        ["encounter_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_threads_encounter_id", table_name="threads")
    op.drop_constraint("fk_threads_encounter_id_encounters", "threads", type_="foreignkey")
    op.drop_column("threads", "encounter_id")
