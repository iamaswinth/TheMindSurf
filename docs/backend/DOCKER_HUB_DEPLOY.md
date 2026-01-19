# Docker Hub Deployment Guide

Complete instructions for building and pushing the RAG Comparator backend to Docker Hub.

---

## 📋 Prerequisites

1. **Docker Desktop** installed and running

   - Windows: https://docs.docker.com/desktop/install/windows-install/
   - Mac: https://docs.docker.com/desktop/install/mac-install/
   - Linux: https://docs.docker.com/desktop/install/linux-install/

2. **Docker Hub Account**

   - Sign up at: https://hub.docker.com/signup
   - Note your Docker Hub username

3. **Project Files Ready**
   - `Dockerfile` in the backend directory
   - `requirements.txt` with all dependencies
   - Application code ready to deploy

---

## 🚀 Quick Start

### 1. Login to Docker Hub

Open PowerShell/Terminal in the backend directory and login:

```powershell
docker login
```

Enter your Docker Hub username and password when prompted.

**Alternative: Login with Access Token (More Secure)**

```powershell
docker login -u YOUR_USERNAME
```

Then enter your access token as the password. Create tokens at: https://hub.docker.com/settings/security

---

### 2. Build the Docker Image

Build the image with your Docker Hub username:

```powershell
# Navigate to backend directory
cd C:\Users\iamas\Storage\Codes\LLMs\RAG\Rag-Compentator\backend

# Build the image
docker build -t YOUR_DOCKERHUB_USERNAME/rag-backend:latest .
```

**Example:**

```powershell
docker build -t iamaswinth/rag-backend:latest .
```

**With version tag:**

```powershell
docker build -t iamaswinth/rag-backend:v1.0.0 -t iamaswinth/rag-backend:latest .
```

---

### 3. Test the Image Locally (Optional but Recommended)

Before pushing, test the image works:

```powershell
# Run the container
docker run -p 8000:8080 `
  -e OPENAI_API_KEY="your-key" `
  -e DATABASE_URL="your-db-url" `
  -e PINECONE_API_KEY="your-pinecone-key" `
  -e JWT_SECRET_KEY="your-secret" `
  iamaswinth/rag-backend:latest
```

Visit http://localhost:8000/docs to verify the API is running.

Stop the container:

```powershell
docker ps  # Find container ID
docker stop CONTAINER_ID
```

---

### 4. Push to Docker Hub

Push the image to Docker Hub:

```powershell
docker push YOUR_DOCKERHUB_USERNAME/rag-backend:latest
```

**Example:**

```powershell
docker push iamaswinth/rag-backend:latest
```

**Push multiple tags:**

```powershell
docker push iamaswinth/rag-backend:v1.0.0
docker push iamaswinth/rag-backend:latest
```

---

## 📦 Complete Workflow

Here's the complete workflow in one script:

```powershell
# 1. Navigate to backend directory
cd C:\Users\iamas\Storage\Codes\LLMs\RAG\Rag-Compentator\backend

# 2. Login to Docker Hub
docker login

# 3. Build the image
docker build -t iamaswinth/rag-backend:latest .

# 4. (Optional) Tag with version
docker tag iamaswinth/rag-backend:latest iamaswinth/rag-backend:v1.0.0

# 5. Test locally (optional)
docker run -p 8000:8080 --env-file .env iamaswinth/rag-backend:latest

# 6. Push to Docker Hub
docker push iamaswinth/rag-backend:latest
docker push iamaswinth/rag-backend:v1.0.0
```

---

## 🏷️ Tagging Strategy

Use semantic versioning for better version control:

```powershell
# Major release
docker tag iamaswinth/rag-backend:latest iamaswinth/rag-backend:v1.0.0

# Minor release
docker tag iamaswinth/rag-backend:latest iamaswinth/rag-backend:v1.1.0

# Patch release
docker tag iamaswinth/rag-backend:latest iamaswinth/rag-backend:v1.0.1

# Environment-specific tags
docker tag iamaswinth/rag-backend:latest iamaswinth/rag-backend:production
docker tag iamaswinth/rag-backend:latest iamaswinth/rag-backend:staging
```

Push all tags:

```powershell
docker push iamaswinth/rag-backend --all-tags
```

---

## 🔄 Update Workflow

When you make changes to your application:

```powershell
# 1. Navigate to backend
cd C:\Users\iamas\Storage\Codes\LLMs\RAG\Rag-Compentator\backend

# 2. Build new version
docker build -t iamaswinth/rag-backend:v1.1.0 -t iamaswinth/rag-backend:latest .

# 3. Push updated images
docker push iamaswinth/rag-backend:v1.1.0
docker push iamaswinth/rag-backend:latest
```

---

## 🐳 Docker Compose Usage

Pull and run using docker-compose:

**docker-compose.yml:**

```yaml
services:
  backend:
    image: iamaswinth/rag-backend:latest
    container_name: rag-backend
    ports:
      - "8000:8080"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - PINECONE_API_KEY=${PINECONE_API_KEY}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      # ... other environment variables
    restart: unless-stopped
```

**Usage:**

```powershell
# Pull latest image
docker-compose pull

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 🔍 Verify Your Image

### Check on Docker Hub

1. Visit: https://hub.docker.com/r/YOUR_USERNAME/rag-backend
2. Verify the image appears with correct tags
3. Check the image size and last updated time

### Pull and Test from Another Machine

```powershell
# Pull the image
docker pull iamaswinth/rag-backend:latest

# Run it
docker run -p 8000:8080 --env-file .env iamaswinth/rag-backend:latest
```

---

## 🛠️ Useful Docker Commands

### View Local Images

```powershell
docker images | Select-String "rag-backend"
```

### Remove Old Images

```powershell
# Remove specific image
docker rmi iamaswinth/rag-backend:v1.0.0

# Remove all untagged images
docker image prune

# Remove all unused images
docker image prune -a
```

### Check Image Details

```powershell
# Inspect image
docker inspect iamaswinth/rag-backend:latest

# View image history
docker history iamaswinth/rag-backend:latest
```

### View Container Logs

```powershell
docker logs CONTAINER_ID

# Follow logs
docker logs -f CONTAINER_ID
```

---

## 🌐 Deploying from Docker Hub

### Digital Ocean App Platform

1. **Create New App** in Digital Ocean
2. **Select Docker Hub** as source
3. **Enter image:** `iamaswinth/rag-backend:latest`
4. **Configure:**
   - HTTP Port: `8080`
   - Instance Size: Basic ($12/month recommended)
5. **Add Environment Variables** (all required variables)
6. **Deploy**

### AWS ECS/Fargate

```bash
# Pull from Docker Hub
docker pull iamaswinth/rag-backend:latest

# Tag for ECR (optional)
docker tag iamaswinth/rag-backend:latest AWS_ACCOUNT.dkr.ecr.region.amazonaws.com/rag-backend:latest

# Push to ECR (if using ECR)
docker push AWS_ACCOUNT.dkr.ecr.region.amazonaws.com/rag-backend:latest
```

### Any Server with Docker

```bash
# Pull image
docker pull iamaswinth/rag-backend:latest

# Run container
docker run -d \
  --name rag-backend \
  -p 8000:8080 \
  --env-file .env \
  --restart unless-stopped \
  iamaswinth/rag-backend:latest
```

---

## 🔒 Security Best Practices

### 1. Use Multi-Stage Builds (Already Implemented)

Your Dockerfile uses a slim Python image to reduce attack surface.

### 2. Run as Non-Root User (Already Implemented)

Your Dockerfile creates and uses an `appuser`.

### 3. Scan for Vulnerabilities

```powershell
# Docker Scout (built into Docker Desktop)
docker scout cves iamaswinth/rag-backend:latest

# Trivy
trivy image iamaswinth/rag-backend:latest
```

### 4. Use Private Repositories for Production

Upgrade to Docker Hub Pro for private repositories: https://hub.docker.com/billing/plan

### 5. Use Docker Content Trust

```powershell
# Enable content trust
$env:DOCKER_CONTENT_TRUST=1

# Sign and push
docker push iamaswinth/rag-backend:latest
```

---

## 📊 Image Size Optimization

### Current Image Analysis

```powershell
docker images iamaswinth/rag-backend:latest
```

### Optimization Tips

1. **Use .dockerignore** (Create in backend directory):

```
__pycache__
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.env
.git
.gitignore
*.md
tests/
*.log
.pytest_cache
.coverage
htmlcov/
```

2. **Multi-stage builds** for even smaller images:

```dockerfile
# Build stage
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Runtime stage
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
# ... rest of Dockerfile
```

---

## ❓ Troubleshooting

### Build Fails

```powershell
# Clear build cache
docker builder prune

# Build without cache
docker build --no-cache -t iamaswinth/rag-backend:latest .
```

### Login Issues

```powershell
# Logout and login again
docker logout
docker login
```

### Push Fails - "denied: requested access to the resource is denied"

- Verify you're logged in: `docker login`
- Check image name matches your Docker Hub username
- Ensure repository name is lowercase

### Image Too Large

- Check image size: `docker images`
- Create `.dockerignore` file
- Remove unnecessary files from image
- Use multi-stage builds

### Container Won't Start

```powershell
# Check logs
docker logs CONTAINER_ID

# Run interactively to debug
docker run -it --entrypoint /bin/bash iamaswinth/rag-backend:latest
```

---

## 📚 Additional Resources

- **Docker Documentation:** https://docs.docker.com/
- **Docker Hub:** https://hub.docker.com/
- **Best Practices:** https://docs.docker.com/develop/dev-best-practices/
- **Dockerfile Reference:** https://docs.docker.com/engine/reference/builder/
- **Docker Security:** https://docs.docker.com/engine/security/

---

## ✅ Deployment Checklist

- [ ] Docker Desktop installed and running
- [ ] Docker Hub account created
- [ ] Logged in to Docker Hub (`docker login`)
- [ ] `.dockerignore` file created
- [ ] Dockerfile tested locally
- [ ] Environment variables prepared
- [ ] Image built successfully
- [ ] Image tested locally
- [ ] Image tagged appropriately
- [ ] Image pushed to Docker Hub
- [ ] Image verified on Docker Hub
- [ ] Pulled and tested from Docker Hub
- [ ] Deployed to production environment
- [ ] Monitoring and logging configured

---

## 📞 Support

If you encounter issues:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review Docker logs: `docker logs CONTAINER_ID`
3. Verify environment variables are set correctly
4. Check Docker Hub for successful push: https://hub.docker.com/

---

**Last Updated:** January 18, 2026
**Docker Image:** `iamaswinth/rag-backend:latest`
**Port:** `8080` (internal), map to `8000` (external)
