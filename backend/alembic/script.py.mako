"""Alembic migration script configuration."""
from logging.config import fileConfig

from alembic import context

config = context.config
fileConfig(config.config_file_name)

# Empty script — actual migrations will be generated via:
#   alembic revision --autogenerate -m "initial"
#   alembic upgrade head
