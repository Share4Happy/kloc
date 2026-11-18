#!/bin/bash
# entrypoint.sh

set -e

# Wait for database to be ready (Fallback if depends_on healthcheck misses)
echo "Waiting for PostgreSQL database to be ready..."
while ! nc -z kloc_db 5432; do
  sleep 1
done
echo "PostgreSQL is up and running!"

# Run Alembic migrations
echo "Running database migrations..."
alembic upgrade head
echo "Migrations completed."

# Start the FastAPI application
echo "Starting Uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
