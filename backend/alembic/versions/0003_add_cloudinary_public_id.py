"""Add cloudinary_public_id to files table

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-19
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "files",
        sa.Column("cloudinary_public_id", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("files", "cloudinary_public_id")
