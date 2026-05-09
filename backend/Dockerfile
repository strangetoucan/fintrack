FROM python:3.11-slim

# Create a non-root user with /app as home
RUN useradd -m -d /app finance

WORKDIR /app

# Install deps before copying source so this layer is cached
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source, owned by the app user
COPY --chown=finance:finance . .

EXPOSE 8000

USER finance

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
