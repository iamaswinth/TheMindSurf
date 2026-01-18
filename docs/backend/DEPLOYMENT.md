# Deployment Guide: Multimodal RAG Backend

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Deployment Options](#deployment-options)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Provider Recommendations](#cloud-provider-recommendations)
5. [Performance Optimization](#performance-optimization)
6. [Environment Configuration](#environment-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Security Considerations](#security-considerations)
9. [Cost Optimization](#cost-optimization)

---

## System Requirements

### Minimum Requirements

| Resource | Minimum | Recommended |
| -------- | ------- | ----------- |
| CPU      | 2 cores | 4+ cores    |
| RAM      | 4 GB    | 8-16 GB     |
| Storage  | 10 GB   | 50+ GB SSD  |

### Required System Dependencies

- **Python 3.11+** (3.13 supported)
- **Poppler** - PDF rendering
- **Tesseract OCR** - Text extraction from images

> ⚠️ **Important**: Multimodal PDF processing is CPU and memory intensive. Large PDFs with many images can consume 2-4GB RAM during processing.

---

## Deployment Options

### Option 1: Docker (Recommended) ⭐

Best for: Consistency, portability, easy scaling

### Option 2: Cloud VM (AWS EC2, GCP Compute, Azure VM)

Best for: Full control, persistent workloads

### Option 3: Serverless (AWS Lambda, Google Cloud Run)

Best for: Variable traffic, cost optimization

> ⚠️ Note: Cold starts can be 10-30 seconds due to model loading

### Option 4: Kubernetes

Best for: High availability, auto-scaling, enterprise deployments

---

## Docker Deployment

### Dockerfile

Create `Dockerfile` in your backend directory:

```dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Poppler for PDF processing
    poppler-utils \
    # Tesseract OCR
    tesseract-ocr \
    tesseract-ocr-eng \
    # Build dependencies
    build-essential \
    libpq-dev \
    # Cleanup
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/documents/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DEBUG=false
      - MAX_FILE_SIZE_MB=50
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G

  # Optional: Redis for caching
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
```

### Build & Run

```bash
# Build the image
docker build -t rag-backend:latest .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f backend
```

---

## Cloud Provider Recommendations

### 🏆 Best for Speed: GPU-Enabled Instances

For fastest multimodal processing, use GPU instances:

| Provider  | Instance Type      | GPU | Monthly Cost (est.) |
| --------- | ------------------ | --- | ------------------- |
| **AWS**   | g4dn.xlarge        | T4  | ~$380               |
| **GCP**   | n1-standard-4 + T4 | T4  | ~$350               |
| **Azure** | NC4as_T4_v3        | T4  | ~$400               |

### 💰 Best Value: CPU Optimized

For good performance without GPU costs:

| Provider         | Instance Type       | vCPU | RAM  | Monthly Cost (est.) |
| ---------------- | ------------------- | ---- | ---- | ------------------- |
| **AWS**          | c6i.xlarge          | 4    | 8GB  | ~$125               |
| **GCP**          | c2-standard-4       | 4    | 16GB | ~$130               |
| **Azure**        | F4s_v2              | 4    | 8GB  | ~$120               |
| **DigitalOcean** | CPU-Optimized 4vCPU | 4    | 8GB  | ~$85                |
| **Hetzner**      | CPX41               | 8    | 16GB | ~$30                |

### 🚀 Serverless Options

| Provider             | Service    | Cold Start | Best For           |
| -------------------- | ---------- | ---------- | ------------------ |
| **Google Cloud Run** | Cloud Run  | 5-15s      | Variable traffic   |
| **AWS**              | App Runner | 3-10s      | Simple deployments |
| **Railway**          | Railway    | 2-5s       | Fast iteration     |
| **Render**           | Render     | 5-10s      | Easy deployment    |

### Regional Deployment for Speed

Deploy close to your users:

- **US East**: `us-east-1` (AWS), `us-east1` (GCP)
- **US West**: `us-west-2` (AWS), `us-west1` (GCP)
- **Europe**: `eu-west-1` (AWS), `europe-west1` (GCP)
- **Asia**: `ap-northeast-1` (AWS), `asia-east1` (GCP)

---

## Performance Optimization

### 1. Uvicorn Workers

```bash
# Production: Use multiple workers (rule: 2-4 × CPU cores)
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 2. Gunicorn with Uvicorn Workers

```bash
# Better process management
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Add to `requirements.txt`:

```
gunicorn>=21.0.0
```

### 3. Nginx Reverse Proxy

```nginx
upstream backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 100M;  # For large PDFs

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Connection "";

        # Timeout for long processing
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### 4. Processing Strategy

```python
# For speed over accuracy, use "fast" strategy
strategy=fast  # 3-5x faster than hi_res

# For accuracy (default)
strategy=hi_res
```

### 5. Caching (Optional)

Add Redis caching for repeated document processing:

```python
# Add to requirements.txt
redis>=5.0.0

# Example caching logic
import hashlib
import redis

r = redis.Redis()

def get_cached_result(file_hash):
    return r.get(f"pdf:{file_hash}")

def cache_result(file_hash, result, ttl=3600):
    r.setex(f"pdf:{file_hash}", ttl, result)
```

---

## Environment Configuration

### Production `.env` File

```bash
# Application
DEBUG=false
APP_NAME=RAG-Backend
APP_VERSION=1.0.0

# OpenAI (Required for AI enhancement)
OPENAI_API_KEY=sk-your-production-key
OPENAI_VISION_MODEL=gpt-4o

# Processing Limits
MAX_FILE_SIZE_MB=50
MAX_CHUNK_CHARACTERS=3000

# Security
CORS_ORIGINS=["https://your-frontend.com"]

# Logging
LOG_LEVEL=INFO
```

### Environment Variables by Provider

**AWS (Systems Manager Parameter Store)**

```bash
aws ssm put-parameter --name "/rag/OPENAI_API_KEY" --value "sk-xxx" --type SecureString
```

**GCP (Secret Manager)**

```bash
echo -n "sk-xxx" | gcloud secrets create OPENAI_API_KEY --data-file=-
```

**Docker**

```bash
docker run -e OPENAI_API_KEY=$OPENAI_API_KEY rag-backend:latest
```

---

## Monitoring & Logging

### Structured Logging

The application already uses Python logging. For production, add:

```python
# In main.py or config.py
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        })
```

### Recommended Monitoring Stack

| Tool                     | Purpose              | Cost                |
| ------------------------ | -------------------- | ------------------- |
| **Prometheus + Grafana** | Metrics & dashboards | Free (self-hosted)  |
| **Datadog**              | Full observability   | ~$15/host/month     |
| **New Relic**            | APM                  | Free tier available |
| **Sentry**               | Error tracking       | Free tier available |

### Health Check Endpoint

Already available at: `GET /api/v1/documents/health`

---

## Security Considerations

### 1. API Authentication

Add API key authentication:

```python
# middleware/auth.py
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key")

async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != settings.API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key
```

### 2. Rate Limiting

```python
# Add to requirements.txt
slowapi>=0.1.9

# In main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/v1/documents/process-multimodal")
@limiter.limit("10/minute")
async def process_multimodal(...):
    ...
```

### 3. HTTPS

Always use HTTPS in production. Use:

- **Let's Encrypt** (free)
- **Cloudflare** (free tier)
- **AWS Certificate Manager** (free with AWS)

### 4. File Validation

Already implemented - validates file type and size.

---

## Cost Optimization

### 1. Spot/Preemptible Instances

- **AWS Spot**: 60-90% savings
- **GCP Preemptible**: 60-80% savings
- **Azure Spot**: 60-90% savings

> ⚠️ Only for stateless workloads with proper handling

### 2. Auto-Scaling

```yaml
# Kubernetes HPA example
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: rag-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rag-backend
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### 3. Optimize AI Calls

```python
# Only use AI enhancement for chunks with tables/images
enable_ai_enhancement=true  # Only enhances multimodal chunks

# Skip AI for text-only processing
enable_ai_enhancement=false  # Faster, cheaper
```

### 4. Estimated Monthly Costs

| Setup                  | Traffic         | Est. Cost |
| ---------------------- | --------------- | --------- |
| Small (Render/Railway) | 100 docs/day    | $20-50    |
| Medium (DigitalOcean)  | 500 docs/day    | $85-150   |
| Large (AWS/GCP)        | 2000+ docs/day  | $300-500  |
| Enterprise (K8s)       | 10000+ docs/day | $1000+    |

**OpenAI API costs** (additional):

- GPT-4o: ~$5-15/1000 pages with AI enhancement
- Without AI enhancement: $0

---

## Quick Start Deployment Commands

### Railway (Easiest)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Render

1. Connect GitHub repo
2. Set environment variables
3. Deploy automatically

### AWS App Runner

```bash
# Using AWS CLI
aws apprunner create-service \
  --service-name rag-backend \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "your-ecr-repo/rag-backend:latest",
      "ImageRepositoryType": "ECR"
    }
  }'
```

### Google Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/rag-backend

# Deploy
gcloud run deploy rag-backend \
  --image gcr.io/PROJECT_ID/rag-backend \
  --platform managed \
  --memory 4Gi \
  --cpu 2 \
  --timeout 300 \
  --set-env-vars OPENAI_API_KEY=$OPENAI_API_KEY
```

---

## Checklist Before Deployment

- [ ] Set `DEBUG=false`
- [ ] Configure production `OPENAI_API_KEY`
- [ ] Set appropriate `CORS_ORIGINS`
- [ ] Configure file size limits
- [ ] Set up HTTPS/TLS
- [ ] Configure logging
- [ ] Set up monitoring/alerts
- [ ] Test health endpoint
- [ ] Load test with expected traffic
- [ ] Set up backup strategy (if storing data)
- [ ] Document rollback procedure

---

## Troubleshooting

### Common Issues

**1. Poppler not found**

```bash
# Docker: Already included in Dockerfile
# Linux: apt-get install poppler-utils
# Mac: brew install poppler
# Windows: Download from GitHub releases
```

**2. Tesseract not found**

```bash
# Docker: Already included in Dockerfile
# Linux: apt-get install tesseract-ocr
# Mac: brew install tesseract
# Windows: winget install UB-Mannheim.TesseractOCR
```

**3. Out of memory**

- Increase container memory limit
- Process smaller PDFs
- Use `strategy=fast`

**4. Timeout errors**

- Increase proxy timeout (nginx: `proxy_read_timeout`)
- Use async processing with job queue for large files

---

## Support

For issues specific to:

- **Unstructured.io**: https://github.com/Unstructured-IO/unstructured
- **FastAPI**: https://fastapi.tiangolo.com/
- **OpenAI API**: https://platform.openai.com/docs
