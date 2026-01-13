FROM python:3.11-slim

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies required for PDF processing
# - poppler-utils: For PDF to image conversion (pdf2image)
# - tesseract-ocr: For OCR capabilities on scanned PDFs
# - build-essential: For compiling Python packages
# - libpq-dev: For PostgreSQL connectivity
# - libgl1, libglib2.0-0: For OpenCV/unstructured-inference
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    build-essential \
    libpq-dev \
    curl \
    libgl1 \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security best practices
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app

USER appuser

# Expose port
EXPOSE 8000

# Health check to verify the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run application with production-ready settings
# Using 2 workers as default - adjust based on your server resources
# Formula: (2 x CPU cores) + 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
