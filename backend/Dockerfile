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

# Pre-download NLTK packages to a shared location to avoid race conditions
# Download as root to /usr/local/share/nltk_data (system-wide location)
RUN mkdir -p /usr/local/share/nltk_data && \
    python -c "import nltk; nltk.download('punkt_tab', quiet=True, download_dir='/usr/local/share/nltk_data'); nltk.download('averaged_perceptron_tagger', quiet=True, download_dir='/usr/local/share/nltk_data')" && \
    chmod -R 755 /usr/local/share/nltk_data

# Copy application code
COPY . .

# Create non-root user for security best practices
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app

USER appuser

# Expose port (DigitalOcean App Platform expects 8080)
EXPOSE 8080

# Set NLTK_DATA to use pre-downloaded packages (accessible by all users)
ENV NLTK_DATA=/usr/local/share/nltk_data

# Health check to verify the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

# Run application with production-ready settings
# Using 1 worker initially to avoid any remaining race conditions, can increase later
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
