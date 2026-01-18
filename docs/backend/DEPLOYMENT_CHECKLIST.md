# Deployment Checklist for Digital Ocean

Use this checklist to ensure a smooth deployment of your RAG Comparator backend.

## Pre-Deployment Checklist

### ✅ Environment Setup

- [ ] Created Digital Ocean account
- [ ] Have OpenAI API key ready
- [ ] Have NeonDB or PostgreSQL connection string
- [ ] Have Pinecone API key and indexes created
- [ ] Code is in a Git repository (for App Platform)

### ✅ Configuration Files

- [ ] Created `.env` file with all required variables
- [ ] Created `Dockerfile`
- [ ] Created `.dockerignore`
- [ ] Updated `ALLOWED_ORIGINS` in `.env` with frontend URL
- [ ] Secured `.env` file (not in Git repository)

### ✅ Database Setup

- [ ] NeonDB/PostgreSQL database created
- [ ] Connection string tested
- [ ] Database schema initialized (run `setup_database.py`)

### ✅ Pinecone Setup

- [ ] Dense index created (dimension: 4096, metric: cosine)
- [ ] Sparse index created (dimension: 30000, metric: dotproduct)
- [ ] API key configured
- [ ] Indexes are in correct region

---

## Digital Ocean App Platform Deployment

### Step 1: Preparation

- [ ] Code pushed to GitHub/GitLab
- [ ] `Dockerfile` in repository root or backend folder
- [ ] `.dockerignore` configured

### Step 2: App Creation

- [ ] Created app on Digital Ocean
- [ ] Connected Git repository
- [ ] Selected correct branch (main)
- [ ] Specified source directory (if backend is in subfolder)

### Step 3: Configuration

- [ ] Selected plan (Professional XS minimum for production)
- [ ] Port set to 8000
- [ ] Health check path set to `/health`
- [ ] All environment variables added and encrypted

### Step 4: Deployment

- [ ] Clicked "Create Resources"
- [ ] Build completed successfully
- [ ] Health checks passing
- [ ] URL accessible

### Step 5: Testing

- [ ] Health endpoint responds: `curl https://your-app.ondigitalocean.app/health`
- [ ] API docs accessible: `https://your-app.ondigitalocean.app/docs`
- [ ] Test document upload
- [ ] Test search functionality
- [ ] Check logs for errors

### Step 6: Domain & SSL

- [ ] Custom domain configured (if applicable)
- [ ] DNS records updated
- [ ] SSL certificate active
- [ ] Updated `ALLOWED_ORIGINS` with production domain

---

## Digital Ocean Droplet Deployment

### Step 1: Server Setup

- [ ] Created droplet (Ubuntu 22.04, 2GB RAM minimum)
- [ ] SSH access configured
- [ ] Firewall configured (ports 22, 80, 443)
- [ ] Created non-root user

### Step 2: Software Installation

- [ ] Python 3.11 installed
- [ ] Poppler-utils installed
- [ ] Tesseract-OCR installed
- [ ] Nginx installed
- [ ] Git installed

### Step 3: Application Deployment

- [ ] Code cloned/uploaded to `/opt/rag-backend`
- [ ] Virtual environment created
- [ ] Dependencies installed from `requirements.txt`
- [ ] `.env` file created with correct values
- [ ] `.env` file secured (chmod 600)

### Step 4: Service Configuration

- [ ] Systemd service file created (`/etc/systemd/system/rag-backend.service`)
- [ ] Service enabled and started
- [ ] Service status shows "active (running)"
- [ ] No errors in logs (`journalctl -u rag-backend`)

### Step 5: Nginx Configuration

- [ ] Nginx config file created (`/etc/nginx/sites-available/rag-backend`)
- [ ] Config symlinked to sites-enabled
- [ ] Nginx config tested (`nginx -t`)
- [ ] Nginx restarted
- [ ] Can access via HTTP

### Step 6: SSL Setup

- [ ] Domain pointing to droplet IP
- [ ] Certbot installed
- [ ] SSL certificate obtained
- [ ] HTTPS working
- [ ] HTTP redirects to HTTPS

### Step 7: Testing

- [ ] Health endpoint responds via HTTPS
- [ ] API docs accessible
- [ ] Test document upload
- [ ] Test search functionality
- [ ] Check all logs for errors

---

## Post-Deployment

### Monitoring Setup

- [ ] Monitoring agent installed (for Droplets)
- [ ] Uptime monitoring configured (UptimeRobot, Pingdom, etc.)
- [ ] Log monitoring configured
- [ ] Error alerts configured

### Backup Configuration

- [ ] Database backups enabled
- [ ] Backup schedule configured
- [ ] Backup restoration tested

### Documentation

- [ ] Deployment details documented
- [ ] Server credentials stored securely
- [ ] API endpoints documented
- [ ] Team trained on API usage

### Security

- [ ] `.env` file NOT in Git repository
- [ ] All API keys kept secret
- [ ] Firewall properly configured
- [ ] SSL/HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting configured (if needed)
- [ ] Security headers configured

### Performance Optimization

- [ ] Worker count optimized for server resources
- [ ] File size limits appropriate
- [ ] Chunking parameters tuned
- [ ] Response times acceptable

---

## Testing Checklist

### Basic Functionality

```powershell
# Set your app URL
$APP_URL = "https://your-app-url.com"

# Test health endpoint
Invoke-RestMethod "$APP_URL/health"

# Expected: {"status":"healthy","timestamp":"...","version":"1.0.0"}
```

### Document Upload

```powershell
# Upload a test PDF
$file = "path\to\test.pdf"
curl -X POST "$APP_URL/api/v1/documents/upload" `
  -F "file=@$file" `
  -F "namespace=test"

# Expected: {"document_id":"...","status":"success"}
```

### Search Functionality

```powershell
# Test semantic search
curl -X POST "$APP_URL/api/v1/search" `
  -H "Content-Type: application/json" `
  -d '{"query":"test query","namespace":"test","top_k":5}'

# Expected: {"results":[...],"total":...}
```

### API Documentation

- [ ] Visit `https://your-app-url.com/docs`
- [ ] All endpoints listed
- [ ] Try out interactive API calls

---

## Rollback Plan

### App Platform

1. Go to app → **Deployments**
2. Find last working deployment
3. Click **"Rollback"**

### Droplet

```bash
# Revert to previous version
cd /opt/rag-backend
git log
git checkout <previous-commit-hash>
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart rag-backend
```

---

## Common Issues & Solutions

### Build Fails

- **Check**: Dockerfile syntax
- **Check**: All dependencies in requirements.txt
- **Check**: Build logs for specific errors

### Health Check Fails

- **Check**: `/health` endpoint exists
- **Check**: Environment variables set correctly
- **Check**: Runtime logs for startup errors

### 502 Bad Gateway

- **Check**: Backend service is running
- **Check**: Port 8000 is listening
- **Check**: Nginx configuration

### PDF Processing Fails

- **Check**: Poppler and Tesseract installed
- **Check**: System dependencies in Dockerfile

### Database Connection Fails

- **Check**: DATABASE_URL format
- **Check**: SSL mode (NeonDB requires `?sslmode=require`)
- **Check**: Network connectivity

---

## Cost Tracking

### Monthly Costs to Monitor

| Service                   | Expected Cost | Actual Cost |
| ------------------------- | ------------- | ----------- |
| Digital Ocean App/Droplet | $12-24        |             |
| NeonDB                    | $0-19         |             |
| Pinecone                  | $0-70         |             |
| OpenAI API                | $50-500       |             |
| Domain (optional)         | $1-15/year    |             |
| **Total**                 | **$62-613**   |             |

### Cost Optimization Tips

- [ ] Monitor OpenAI API usage with `LOG_AI_USAGE=true`
- [ ] Use smaller models when possible
- [ ] Right-size server based on actual usage
- [ ] Enable caching for repeated operations
- [ ] Set up spending alerts

---

## Contact Information

**Digital Ocean Support:**

- Dashboard: https://cloud.digitalocean.com
- Docs: https://docs.digitalocean.com
- Community: https://www.digitalocean.com/community
- Tickets: https://www.digitalocean.com/support

**Project Documentation:**

- Full Hosting Guide: `HOSTING_GUIDE.md`
- API Documentation: `API_DOCUMENTATION.md`
- Testing Guide: `TESTING_GUIDE.md`
- Digital Ocean Quick Start: `DIGITAL_OCEAN_DEPLOY.md`

---

## Success Criteria

Your deployment is successful when:

- ✅ Health endpoint returns 200 OK
- ✅ API documentation is accessible
- ✅ Can upload and process PDF documents
- ✅ Search returns relevant results
- ✅ HTTPS is enabled and working
- ✅ No errors in application logs
- ✅ Response times are acceptable
- ✅ Frontend can connect to backend
- ✅ Monitoring and alerts are active
- ✅ Backups are configured and tested

---

**🎉 Congratulations on your deployment!**

Save this checklist and update it as you complete each step.
