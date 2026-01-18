# Backend Hosting Guide

Complete step-by-step guide for hosting the RAG Comparator Backend in production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup (NeonDB)](#database-setup-neondb)
4. [Vector Database Setup (Pinecone)](#vector-database-setup-pinecone)
5. [Deployment Options](#deployment-options)
   - [Option A: Docker Deployment](#option-a-docker-deployment-recommended)
   - [Option B: Traditional VM/Server](#option-b-traditional-vmserver)
   - [Option C: Cloud Platforms](#option-c-cloud-platforms)
   - [Option D: Digital Ocean Deployment](#option-d-digital-ocean-deployment)
6. [SSL/HTTPS Configuration](#sslhttps-configuration)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

1. **OpenAI API Account**

   - For GPT-4o vision processing and embeddings
   - Get API key from: https://platform.openai.com/api-keys

2. **NeonDB PostgreSQL Database** (or any PostgreSQL provider)

   - Serverless PostgreSQL database
   - Sign up at: https://neon.tech
   - Alternative: AWS RDS, Google Cloud SQL, Azure PostgreSQL

3. **Pinecone Vector Database**
   - For semantic search and vector storage
   - Sign up at: https://www.pinecone.io
   - Free tier available (100k vectors)

### System Requirements

| Resource | Minimum | Recommended | Production  |
| -------- | ------- | ----------- | ----------- |
| CPU      | 2 cores | 4 cores     | 8+ cores    |
| RAM      | 4 GB    | 8 GB        | 16+ GB      |
| Storage  | 10 GB   | 50 GB SSD   | 100+ GB SSD |
| Python   | 3.11+   | 3.11-3.13   | 3.11-3.13   |

---

## Environment Setup

### Step 1: Clone and Navigate to Backend

```bash
cd backend
```

### Step 2: Create Environment File

Create a `.env` file in the backend directory with the following variables:

```env
# =============================================================================
# REQUIRED ENVIRONMENT VARIABLES
# =============================================================================

# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
OPENAI_VISION_MODEL=gpt-4o
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.3

# Database Configuration (REQUIRED)
DATABASE_URL=postgresql://username:password@host.region.neon.tech/dbname?sslmode=require
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20

# Pinecone Configuration (REQUIRED)
PINECONE_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PINECONE_DENSE_INDEX_NAME=rag-comparator-dense
PINECONE_SPARSE_INDEX_NAME=rag-comparator-sparse
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
PINECONE_NAMESPACE=documents

# =============================================================================
# OPTIONAL CONFIGURATION
# =============================================================================

# Application Settings
APP_NAME=RAG Comparator Backend
APP_VERSION=1.0.0
DEBUG=false

# Processing Configuration
ENABLE_MULTIMODAL_PROCESSING=true
DEFAULT_PROCESSING_STRATEGY=hi_res
ENABLE_AI_ENHANCEMENT=true

# Chunking Parameters
MAX_CHUNK_CHARACTERS=3000
NEW_CHUNK_AFTER_N_CHARS=2400
MIN_CHUNK_CHARACTERS=500

# File Handling
MAX_FILE_SIZE_MB=50

# Logging
LOG_LEVEL=INFO
LOG_AI_USAGE=true

# CORS (comma-separated origins)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Server Configuration
HOST=0.0.0.0
PORT=8000
WORKERS=4
```

### Step 3: Secure Your Environment File

```bash
# Linux/Mac
chmod 600 .env

# Windows (PowerShell)
icacls .env /inheritance:r /grant:r "$env:USERNAME:(R)"
```

⚠️ **IMPORTANT**: Never commit `.env` to version control. Ensure `.env` is in `.gitignore`.

---

## Database Setup (NeonDB)

### Step 1: Create NeonDB Account

1. Go to https://neon.tech
2. Sign up for free account
3. Create a new project

### Step 2: Get Connection String

1. In NeonDB dashboard, go to your project
2. Click "Connection Details"
3. Copy the connection string (should look like):
   ```
   postgresql://username:password@ep-xxx-xxx.region.neon.tech/dbname?sslmode=require
   ```
4. Add it to your `.env` file as `DATABASE_URL`

### Step 3: Initialize Database Schema

The backend automatically creates tables on startup, but you can manually verify:

```bash
# Activate virtual environment first (if using one)
python setup_database.py
```

Expected output:

```
🔗 Connecting to NeonDB...
✅ Connected successfully!
📋 Creating tables...
✅ Database schema initialized!
```

### Alternative: Other PostgreSQL Providers

<details>
<summary>AWS RDS PostgreSQL</summary>

1. Create RDS PostgreSQL instance
2. Note the endpoint, username, password
3. Connection string format:
   ```
   postgresql://username:password@database-1.xxxxx.region.rds.amazonaws.com:5432/dbname
   ```
   </details>

<details>
<summary>Google Cloud SQL</summary>

1. Create Cloud SQL PostgreSQL instance
2. Enable Cloud SQL Admin API
3. Use connection string or Cloud SQL Proxy
</details>

---

## Vector Database Setup (Pinecone)

### Step 1: Create Pinecone Account

1. Go to https://www.pinecone.io
2. Sign up (free tier includes 100k vectors)
3. Create API key from dashboard

### Step 2: Create Indexes

You need to create TWO indexes for hybrid search:

#### Dense Index (Semantic Search)

```python
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="your-api-key")

# Create dense index
pc.create_index(
    name="rag-comparator-dense",
    dimension=4096,  # llama-text-embed-v2 dimension
    metric="cosine",
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1"
    )
)
```

#### Sparse Index (Lexical Search)

```python
# Create sparse index
pc.create_index(
    name="rag-comparator-sparse",
    dimension=30000,  # pinecone-sparse-english-v0 dimension
    metric="dotproduct",
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1"
    )
)
```

### Step 3: Add to Environment

```env
PINECONE_API_KEY=your-api-key-here
PINECONE_DENSE_INDEX_NAME=rag-comparator-dense
PINECONE_SPARSE_INDEX_NAME=rag-comparator-sparse
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
```

---

## Deployment Options

## Option A: Docker Deployment (Recommended)

### Step 1: Create Dockerfile

Create `Dockerfile` in backend directory:

```dockerfile
FROM python:3.11-slim

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    build-essential \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app

USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Step 2: Create docker-compose.yml

```yaml
version: "3.8"

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - PINECONE_API_KEY=${PINECONE_API_KEY}
      - PINECONE_DENSE_INDEX_NAME=${PINECONE_DENSE_INDEX_NAME}
      - PINECONE_SPARSE_INDEX_NAME=${PINECONE_SPARSE_INDEX_NAME}
      - PINECONE_CLOUD=${PINECONE_CLOUD}
      - PINECONE_REGION=${PINECONE_REGION}
      - LOG_LEVEL=INFO
      - DEBUG=false
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Step 3: Build and Run

```bash
# Build image
docker build -t rag-backend .

# Run with docker-compose
docker-compose up -d

# Or run directly
docker run -d \
  --name rag-backend \
  -p 8000:8000 \
  --env-file .env \
  --restart unless-stopped \
  rag-backend

# Check logs
docker logs -f rag-backend

# Check status
docker ps
```

### Step 4: Verify Deployment

```bash
# Health check
curl http://localhost:8000/health

# API docs
curl http://localhost:8000/docs
```

---

## Option B: Traditional VM/Server

### Step 1: Install System Dependencies

#### Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    build-essential \
    libpq-dev \
    nginx \
    supervisor
```

#### CentOS/RHEL:

```bash
sudo yum install -y \
    python311 \
    python311-pip \
    poppler-utils \
    tesseract \
    gcc \
    postgresql-devel \
    nginx \
    supervisor
```

### Step 2: Create Virtual Environment

```bash
cd /opt/rag-backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Create Systemd Service

Create `/etc/systemd/system/rag-backend.service`:

```ini
[Unit]
Description=RAG Comparator Backend
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/rag-backend
Environment="PATH=/opt/rag-backend/venv/bin"
EnvironmentFile=/opt/rag-backend/.env
ExecStart=/opt/rag-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=always

[Install]
WantedBy=multi-user.target
```

### Step 4: Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable rag-backend

# Start service
sudo systemctl start rag-backend

# Check status
sudo systemctl status rag-backend

# View logs
sudo journalctl -u rag-backend -f
```

### Step 5: Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/rag-backend`:

```nginx
upstream rag_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://rag_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts for large file uploads
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        send_timeout 300;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/rag-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Option C: Cloud Platforms

### AWS (Elastic Beanstalk)

1. Install EB CLI:

   ```bash
   pip install awsebcli
   ```

2. Initialize:

   ```bash
   eb init -p python-3.11 rag-backend
   ```

3. Create `.ebextensions/01_packages.config`:

   ```yaml
   packages:
     yum:
       poppler-utils: []
       tesseract: []
   ```

4. Deploy:
   ```bash
   eb create rag-backend-env
   eb setenv OPENAI_API_KEY=xxx DATABASE_URL=xxx PINECONE_API_KEY=xxx
   eb deploy
   ```

### Google Cloud Platform (Cloud Run)

1. Create `cloudbuild.yaml`:

   ```yaml
   steps:
     - name: "gcr.io/cloud-builders/docker"
       args: ["build", "-t", "gcr.io/$PROJECT_ID/rag-backend", "."]
     - name: "gcr.io/cloud-builders/docker"
       args: ["push", "gcr.io/$PROJECT_ID/rag-backend"]
   ```

2. Deploy:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   gcloud run deploy rag-backend \
     --image gcr.io/$PROJECT_ID/rag-backend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars "OPENAI_API_KEY=xxx,DATABASE_URL=xxx"
   ```

### Azure (App Service)

1. Create `startup.txt`:

   ```bash
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
   ```

2. Deploy:
   ```bash
   az webapp up --name rag-backend --runtime PYTHON:3.11
   az webapp config appsettings set --name rag-backend \
     --settings OPENAI_API_KEY=xxx DATABASE_URL=xxx
   ```

### Heroku

1. Create `Procfile`:

   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4
   ```

2. Create `Aptfile`:

   ```
   poppler-utils
   tesseract-ocr
   tesseract-ocr-eng
   ```

3. Deploy:
   ```bash
   heroku create rag-backend
   heroku buildpacks:add --index 1 heroku-community/apt
   heroku buildpacks:add --index 2 heroku/python
   heroku config:set OPENAI_API_KEY=xxx DATABASE_URL=xxx
   git push heroku main
   ```

---

## Option D: Digital Ocean Deployment

Digital Ocean provides two excellent options for deploying your FastAPI backend: **App Platform** (PaaS - easiest) or **Droplets** (VPS - more control).

### 🚀 Option D1: Digital Ocean App Platform (Recommended for Beginners)

App Platform is Digital Ocean's Platform-as-a-Service offering - it's the easiest way to deploy.

#### Prerequisites

1. **Digital Ocean Account**: Sign up at https://www.digitalocean.com
2. **GitHub/GitLab Repository**: Your code should be in a git repository
3. **Environment Variables Ready**: Have your `.env` values ready

#### Step 1: Prepare Your Repository

Ensure you have these files in your backend root:

**requirements.txt** ✅ (Already exists)

**Dockerfile** (Create if not exists):

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies (Poppler, Tesseract)
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    build-essential \
    libpq-dev \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Production command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

**.dockerignore** (Create to reduce image size):

```
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
.venv/
venv/
env/
.env
.git/
.gitignore
*.md
tests/
.pytest_cache/
htmlcov/
.coverage
response.json
```

#### Step 2: Create App on Digital Ocean

**Via Web Dashboard:**

1. Log in to Digital Ocean
2. Click **"Create"** → **"Apps"**
3. Connect your GitHub/GitLab account
4. Select your repository and branch (e.g., `main`)
5. Digital Ocean will auto-detect your Dockerfile

**Via CLI (Alternative):**

```bash
# Install doctl CLI
# Windows: scoop install doctl
# Mac: brew install doctl
# Linux: snap install doctl

# Authenticate
doctl auth init

# Create app spec file (app.yaml)
cat > app.yaml << 'EOF'
name: rag-backend
services:
  - name: backend
    github:
      repo: your-username/your-repo
      branch: main
      deploy_on_push: true
    dockerfile_path: backend/Dockerfile
    http_port: 8000
    instance_count: 1
    instance_size_slug: professional-xs  # $12/month, 1GB RAM
    health_check:
      http_path: /health
    envs:
      - key: OPENAI_API_KEY
        scope: RUN_TIME
        type: SECRET
      - key: DATABASE_URL
        scope: RUN_TIME
        type: SECRET
      - key: PINECONE_API_KEY
        scope: RUN_TIME
        type: SECRET
      - key: PINECONE_DENSE_INDEX_NAME
        value: rag-comparator-dense
      - key: PINECONE_SPARSE_INDEX_NAME
        value: rag-comparator-sparse
      - key: PINECONE_CLOUD
        value: aws
      - key: PINECONE_REGION
        value: us-east-1
      - key: LOG_LEVEL
        value: INFO
      - key: DEBUG
        value: "false"
      - key: ALLOWED_ORIGINS
        value: "https://your-frontend.ondigitalocean.app"
EOF

# Deploy
doctl apps create --spec app.yaml
```

#### Step 3: Configure Environment Variables

In the Digital Ocean App Platform dashboard:

1. Go to your app → **Settings** → **App-Level Environment Variables**
2. Add these variables (mark sensitive ones as "Encrypted"):

```
OPENAI_API_KEY=sk-proj-xxx...  (Encrypted)
DATABASE_URL=postgresql://...  (Encrypted)
PINECONE_API_KEY=xxx...        (Encrypted)
PINECONE_DENSE_INDEX_NAME=rag-comparator-dense
PINECONE_SPARSE_INDEX_NAME=rag-comparator-sparse
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
OPENAI_VISION_MODEL=gpt-4o
MAX_FILE_SIZE_MB=50
LOG_LEVEL=INFO
DEBUG=false
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

#### Step 4: Deploy

Click **"Deploy"** button or push to your git branch. Digital Ocean will:

1. Build your Docker image
2. Deploy to their infrastructure
3. Provide a URL like: `https://rag-backend-xxxxx.ondigitalocean.app`

#### Step 5: Verify Deployment

```bash
# Check health
curl https://your-app.ondigitalocean.app/health

# Check API docs
curl https://your-app.ondigitalocean.app/docs

# Test upload (optional)
curl -X POST https://your-app.ondigitalocean.app/api/v1/documents/upload \
  -F "file=@test.pdf" \
  -F "namespace=test"
```

#### App Platform Pricing

| Plan            | vCPU | RAM   | Price/month |
| --------------- | ---- | ----- | ----------- |
| Basic           | 0.5  | 512MB | $5          |
| Professional XS | 1    | 1GB   | $12         |
| Professional S  | 1    | 2GB   | $24         |
| Professional M  | 2    | 4GB   | $48         |

**Recommended**: Start with **Professional XS** ($12/month) for testing, scale to **Professional S** ($24/month) for production.

---

### 🖥️ Option D2: Digital Ocean Droplet (More Control)

For maximum control and customization, deploy on a Droplet (Virtual Private Server).

#### Step 1: Create Droplet

**Via Web Dashboard:**

1. Go to **Create** → **Droplets**
2. Choose:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic ($12/month - 2GB RAM, 1 vCPU)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH key (recommended) or password
   - **Hostname**: `rag-backend`

**Via CLI:**

```bash
# Create droplet
doctl compute droplet create rag-backend \
  --size s-2vcpu-2gb \
  --image ubuntu-22-04-x64 \
  --region nyc1 \
  --ssh-keys YOUR_SSH_KEY_ID

# Get IP address
doctl compute droplet list
```

#### Step 2: Initial Server Setup

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Create app user
adduser raguser
usermod -aG sudo raguser

# Setup firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw allow 8000  # Temporarily for testing
ufw --force enable

# Switch to app user
su - raguser
```

#### Step 3: Install Dependencies

```bash
# Install Python 3.11
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Install system dependencies
sudo apt install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    build-essential \
    libpq-dev \
    nginx \
    git \
    supervisor

# Verify installations
python3.11 --version
pdftotext -v
tesseract --version
```

#### Step 4: Deploy Application

```bash
# Clone your repository
cd /opt
sudo mkdir rag-backend
sudo chown raguser:raguser rag-backend
cd rag-backend
git clone https://github.com/your-username/your-repo.git .

# Or upload via SCP from your local machine:
# scp -r C:\Users\iamas\Storage\Codes\LLMs\RAG\Rag-Compentator\backend raguser@YOUR_DROPLET_IP:/opt/rag-backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install Python packages
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
nano .env
# Paste your environment variables (see "Environment Setup" section above)
# Save with Ctrl+X, Y, Enter

# Test the application
python3.11 -m uvicorn main:app --host 0.0.0.0 --port 8000

# Test from another terminal
curl http://YOUR_DROPLET_IP:8000/health
```

#### Step 5: Setup Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/rag-backend.service
```

Paste this configuration:

```ini
[Unit]
Description=RAG Comparator FastAPI Backend
After=network.target

[Service]
Type=simple
User=raguser
Group=raguser
WorkingDirectory=/opt/rag-backend
Environment="PATH=/opt/rag-backend/venv/bin:/usr/bin"
EnvironmentFile=/opt/rag-backend/.env
ExecStart=/opt/rag-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10
StandardOutput=append:/var/log/rag-backend/access.log
StandardError=append:/var/log/rag-backend/error.log

[Install]
WantedBy=multi-user.target
```

Create log directory:

```bash
sudo mkdir -p /var/log/rag-backend
sudo chown raguser:raguser /var/log/rag-backend
```

Enable and start service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable (start on boot)
sudo systemctl enable rag-backend

# Start service
sudo systemctl start rag-backend

# Check status
sudo systemctl status rag-backend

# View logs
sudo journalctl -u rag-backend -f
```

#### Step 6: Configure Nginx Reverse Proxy

```bash
# Create nginx config
sudo nano /etc/nginx/sites-available/rag-backend
```

Paste this configuration:

```nginx
upstream rag_backend {
    server 127.0.0.1:8000 fail_timeout=10s max_fails=3;
}

server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    # Max upload size (must match MAX_FILE_SIZE_MB in .env)
    client_max_body_size 50M;

    # Timeouts for large file uploads
    client_body_timeout 300s;
    client_header_timeout 300s;

    # Logs
    access_log /var/log/nginx/rag-backend-access.log;
    error_log /var/log/nginx/rag-backend-error.log;

    location / {
        proxy_pass http://rag_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (for future streaming features)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://rag_backend/health;
        access_log off;
    }
}
```

Enable and test:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/rag-backend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

#### Step 7: Setup SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose: Redirect HTTP to HTTPS (option 2)

# Test auto-renewal
sudo certbot renew --dry-run
```

Your nginx config will be automatically updated with SSL settings.

#### Step 8: Point Domain to Droplet

1. Go to your domain registrar (Namecheap, GoDaddy, etc.)
2. Add/Update DNS A record:
   ```
   Type: A
   Host: @ (or subdomain like "api")
   Value: YOUR_DROPLET_IP
   TTL: 300
   ```
3. Wait 5-30 minutes for DNS propagation

#### Step 9: Verify Everything Works

```bash
# Check service status
sudo systemctl status rag-backend nginx

# Test health endpoint
curl https://your-domain.com/health

# Test API docs
curl https://your-domain.com/docs

# Check logs
sudo tail -f /var/log/rag-backend/error.log
sudo tail -f /var/log/nginx/rag-backend-error.log
```

---

### Digital Ocean Additional Configuration

#### Enable Monitoring

Digital Ocean provides free monitoring:

1. Go to your Droplet/App → **Monitoring**
2. Install agent (for Droplets):
   ```bash
   curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash
   ```
3. View metrics: CPU, Memory, Disk, Network

#### Setup Automated Backups

**For App Platform**: Automatic backups included

**For Droplets**:

1. Go to Droplet → **Backups**
2. Enable backups (adds 20% to monthly cost)
3. Schedule: Weekly automatic snapshots

Or create manual backup script:

```bash
# Install doctl if not installed
snap install doctl

# Create backup
doctl compute droplet-action snapshot YOUR_DROPLET_ID --snapshot-name "rag-backend-$(date +%Y%m%d)"
```

#### Setup Managed Database (Optional but Recommended)

Instead of NeonDB, you can use Digital Ocean Managed PostgreSQL:

1. Go to **Databases** → **Create Database**
2. Choose:
   - Engine: PostgreSQL 15
   - Plan: Basic ($15/month for 1GB RAM)
   - Datacenter: Same as your droplet/app
3. Add your droplet/app to trusted sources
4. Copy connection string → Update `DATABASE_URL` in `.env`

#### Scaling Tips

**App Platform Scaling:**

- Go to app → **Components** → **Edit Plan**
- Increase instance size or add more instances

**Droplet Scaling:**

```bash
# Resize droplet (requires restart)
doctl compute droplet-action resize YOUR_DROPLET_ID --size s-4vcpu-8gb

# Or create snapshot and restore to larger droplet
```

#### Cost Breakdown (Digital Ocean)

**Option D1: App Platform**

```
App (Professional XS): $12/month
Managed PostgreSQL (Basic): $15/month (optional, can use NeonDB free tier)
Total: $12-27/month
```

**Option D2: Droplet**

```
Droplet (2GB RAM): $12/month
Backups (optional): +$2.40/month
Managed PostgreSQL (optional): $15/month
Total: $12-29/month
```

**Plus External Services:**

```
Pinecone (Starter): $0-70/month
OpenAI API: $50-500/month (usage-based)
```

---

### Digital Ocean Troubleshooting

#### Issue: "Connection Refused" after deployment

```bash
# Check if service is running
sudo systemctl status rag-backend

# Check if port is listening
sudo netstat -tlnp | grep 8000

# Check firewall
sudo ufw status

# View error logs
sudo journalctl -u rag-backend -n 50
```

#### Issue: PDF processing fails

```bash
# Verify Poppler installation
pdftotext -v

# Verify Tesseract
tesseract --version

# If missing, reinstall:
sudo apt install --reinstall poppler-utils tesseract-ocr
```

#### Issue: Out of memory

```bash
# Check memory usage
free -h
htop

# Reduce workers in systemd service:
# Edit /etc/systemd/system/rag-backend.service
# Change: --workers 2  (instead of 4)
sudo systemctl daemon-reload
sudo systemctl restart rag-backend
```

#### Issue: 502 Bad Gateway (Nginx)

```bash
# Check backend is running
curl http://127.0.0.1:8000/health

# Check nginx error log
sudo tail -f /var/log/nginx/error.log

# Restart both services
sudo systemctl restart rag-backend nginx
```

---

## SSL/HTTPS Configuration

### Option 1: Let's Encrypt (Free SSL)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

### Option 2: Cloudflare (Free SSL + CDN)

1. Add your domain to Cloudflare
2. Update DNS to point to your server
3. Enable SSL/TLS in Cloudflare dashboard
4. Use "Full" SSL mode

### Option 3: AWS Certificate Manager (ACM)

For AWS deployments (ELB, CloudFront):

1. Request certificate in ACM
2. Validate via DNS or email
3. Attach to load balancer

---

## Monitoring & Health Checks

### Health Check Endpoint

The backend provides a health check endpoint:

```bash
GET /health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2026-01-07T12:00:00Z",
  "version": "1.0.0"
}
```

### Setup Monitoring

#### UptimeRobot (Free)

1. Go to https://uptimerobot.com
2. Add HTTP(s) monitor
3. URL: `https://yourdomain.com/health`
4. Check interval: 5 minutes

#### Pingdom

1. Create account at https://pingdom.com
2. Add uptime check
3. Configure alerts (email/SMS)

#### AWS CloudWatch

```bash
# Create alarm
aws cloudwatch put-metric-alarm \
  --alarm-name rag-backend-health \
  --alarm-description "RAG Backend Health Check" \
  --metric-name HealthCheckStatus \
  --namespace AWS/Route53 \
  --statistic Average \
  --period 60 \
  --threshold 1 \
  --comparison-operator LessThanThreshold
```

### Application Monitoring

#### Sentry (Error Tracking)

1. Install:

   ```bash
   pip install sentry-sdk[fastapi]
   ```

2. Add to [main.py](main.py):

   ```python
   import sentry_sdk

   sentry_sdk.init(
       dsn="your-sentry-dsn",
       traces_sample_rate=1.0,
   )
   ```

#### LogTail (Log Management)

1. Sign up at https://logtail.com
2. Add to `.env`:

   ```env
   LOGTAIL_SOURCE_TOKEN=your-token
   ```

3. Configure logging to send to LogTail

---

## Backup & Recovery

### Database Backups

#### NeonDB Automatic Backups

NeonDB provides automatic backups:

- Point-in-time recovery (PITR)
- 7-day retention (free tier)
- 30-day retention (paid plans)

#### Manual Backup Script

Create `backup.sh`:

```bash
#!/bin/bash

# Configuration
DB_URL="your-database-url"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="rag_backup_${DATE}.sql"

# Create backup
pg_dump $DB_URL > "${BACKUP_DIR}/${FILENAME}"

# Compress
gzip "${BACKUP_DIR}/${FILENAME}"

# Upload to S3 (optional)
aws s3 cp "${BACKUP_DIR}/${FILENAME}.gz" s3://your-bucket/backups/

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${FILENAME}.gz"
```

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * /opt/rag-backend/backup.sh
```

### Restore Database

```bash
# Decompress
gunzip rag_backup_20260107_020000.sql.gz

# Restore
psql $DATABASE_URL < rag_backup_20260107_020000.sql
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows

# Kill process
kill -9 <PID>  # Linux/Mac
taskkill /PID <PID> /F  # Windows
```

#### 2. PDF Processing Fails

**Symptom**: Error about missing poppler or tesseract

**Solution**:

```bash
# Ubuntu/Debian
sudo apt-get install poppler-utils tesseract-ocr

# Mac
brew install poppler tesseract

# Windows
# Download and install:
# - Poppler: https://github.com/oschwartz10612/poppler-windows/releases
# - Tesseract: https://github.com/UB-Mannheim/tesseract/wiki
# Add bin/ folders to PATH
```

#### 3. Database Connection Error

**Symptom**: `connection refused` or `timeout`

**Check**:

```bash
# Test connection
psql $DATABASE_URL

# Verify SSL mode
# NeonDB requires ?sslmode=require
```

#### 4. Out of Memory

**Symptom**: Backend crashes during large PDF processing

**Solution**:

- Increase server RAM (minimum 8GB recommended)
- Reduce `MAX_FILE_SIZE_MB` in `.env`
- Process documents in smaller batches

#### 5. OpenAI API Errors

**Symptom**: `401 Unauthorized` or rate limit errors

**Check**:

```bash
# Verify API key
echo $OPENAI_API_KEY

# Test API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Enable Debug Logging

```env
# .env
DEBUG=true
LOG_LEVEL=DEBUG
```

Restart backend and check logs:

```bash
# Docker
docker logs -f rag-backend

# Systemd
sudo journalctl -u rag-backend -f

# Direct run
uvicorn main:app --reload --log-level debug
```

### Performance Issues

#### Slow Response Times

1. **Check server resources**:

   ```bash
   top
   htop
   df -h
   ```

2. **Increase workers**:

   ```bash
   uvicorn main:app --workers 8
   ```

3. **Enable caching** (future enhancement)

4. **Optimize chunking parameters** in `.env`:
   ```env
   MAX_CHUNK_CHARACTERS=2000
   NEW_CHUNK_AFTER_N_CHARS=1600
   ```

### Contact & Support

- Check [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for API details
- Review [TESTING_GUIDE.md](TESTING_GUIDE.md) for testing procedures
- See [DEPLOYMENT.md](DEPLOYMENT.md) for advanced deployment options

---

## Security Checklist

Before going to production, ensure:

- [ ] `.env` file is NOT in git repository
- [ ] `.env` has restricted permissions (600)
- [ ] All API keys are kept secret
- [ ] Database uses SSL connections
- [ ] HTTPS/SSL is enabled
- [ ] CORS is properly configured
- [ ] File upload size limits are set
- [ ] Rate limiting is implemented (if needed)
- [ ] Regular backups are scheduled
- [ ] Monitoring and alerts are active
- [ ] Error logging doesn't expose secrets
- [ ] Non-root user runs the application (Docker)
- [ ] Security headers are configured (nginx)

---

## Cost Estimation

### Monthly Costs (Typical Usage)

| Service                | Tier          | Monthly Cost         |
| ---------------------- | ------------- | -------------------- |
| NeonDB                 | Free / Pro    | $0 - $19             |
| Pinecone               | Starter       | $0 - $70             |
| OpenAI API             | Pay-as-you-go | $50 - $500\*         |
| Server (AWS t3.medium) | -             | $30 - $50            |
| **Total**              |               | **$80 - $640/month** |

\*Depends heavily on document processing volume

### Cost Optimization Tips

1. **Use smaller models** when possible
2. **Cache AI results** for repeated documents
3. **Batch processing** for large volumes
4. **Monitor API usage** with `LOG_AI_USAGE=true`
5. **Right-size server** based on actual usage
6. **Use serverless** for variable traffic

---

## Next Steps

After deployment:

1. ✅ Test all API endpoints
2. ✅ Upload sample document
3. ✅ Verify vector storage in Pinecone
4. ✅ Check database entries
5. ✅ Monitor logs for errors
6. ✅ Set up automated backups
7. ✅ Configure domain and SSL
8. ✅ Enable monitoring alerts
9. ✅ Document your specific setup
10. ✅ Train your team on API usage

---

**Your backend is now ready for production! 🚀**

For questions or issues, refer to the other documentation files in this repository.
