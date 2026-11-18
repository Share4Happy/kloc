FROM python:3.12-slim

# Install system dependencies required for psycopg2 and python-docx
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install uv (blazing fast Python package installer)
RUN pip install uv

# Copy uv dependency files
COPY pyproject.toml .

# Install dependencies (ignoring virtualenv, installing system-wide for Docker)
RUN uv pip install --system -r pyproject.toml

# Copy application code
COPY . .

# Copy entrypoint script and make it executable
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Expose API port
EXPOSE 8000

# Run entrypoint script (Handles migrations then starts server)
ENTRYPOINT ["./entrypoint.sh"]
