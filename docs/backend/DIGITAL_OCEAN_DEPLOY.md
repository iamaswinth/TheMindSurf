# Digital Ocean Deployment - Quick Start Guide

**FastAPI Backend Deployment on Digital Ocean**

This is a streamlined guide specifically for deploying the RAG Comparator backend to Digital Ocean. Choose between **App Platform** (easiest) or **Droplet** (more control).

---

## 🎯 Quick Decision Guide

| Factor          | App Platform                | Droplet                     |
| --------------- | --------------------------- | --------------------------- |
| **Difficulty**  | ⭐ Easy (5 minutes)         | ⭐⭐⭐ Moderate (30+ min)   |
| **Cost**        | $12/month                   | $12/month                   |
| **Setup Time**  | 5 minutes                   | 30-60 minutes               |
| **Maintenance** | Automatic                   | Manual updates needed       |
| **Best For**    | Quick deployment, beginners | Full control, customization |

**Recommendation**: Start with **App Platform** for simplicity, migrate to Droplet later if you need more control.

---

## 🚀 Option 1: App Platform (Recommended)

Perfect for: Quick deployment, automatic scaling, zero maintenance

### Prerequisites

- Digital Ocean account: https://www.digitalocean.com
- Your code in a Git repository (GitHub/GitLab)
- Environment variables ready (.env file values)

### Step-by-Step Deployment

#### 1. Create Required Files

**Create `Dockerfile` in your backend directory:**

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install Poppler and Tesseract (required for PDF processing)
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

# Copy application
COPY . .

# Security: Create non-root user
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Start server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

**Create `.dockerignore`:**

```
__pycache__/
*.pyc
.Python
.venv/
venv/
.env
.git/
*.md
tests/
response.json
```

#### 2. Push to Git

```bash
# From your Windows machine
cd C:\Users\iamas\Storage\Codes\LLMs\RAG\Rag-Compentator\backend

git add Dockerfile .dockerignore
git commit -m "Add Docker configuration for Digital Ocean"
git push origin main
```

#### 3. Deploy on Digital Ocean

**Via Web Dashboard:**

1. Log in to https://cloud.digitalocean.com
2. Click **"Create"** → **"Apps"**
3. **Source**:

   - Connect GitHub/GitLab
   - Select your repository
   - Select branch: `main`
   - **Source Directory**: If backend is in subfolder, specify path (e.g., `backend`)

4. **Resources**:

   - Digital Ocean will detect your Dockerfile
   - Name: `rag-backend`
   - Port: `8000`
   - Health Check: `/health`

5. **Plan**:

   - Select **Professional XS** ($12/month, 1GB RAM)
   - 1 container instance

6. **Environment Variables** (Click "Edit" → "Add Variable"):

   ```
   OPENAI_API_KEY=sk-proj-your-key-here              (Encrypt: ✓)
   DATABASE_URL=postgresql://user:pass@host/db       (Encrypt: ✓)
   PINECONE_API_KEY=your-pinecone-key                (Encrypt: ✓)
   PINECONE_DENSE_INDEX_NAME=rag-comparator-dense
   PINECONE_SPARSE_INDEX_NAME=rag-comparator-sparse
   PINECONE_CLOUD=aws
   PINECONE_REGION=us-east-1
   OPENAI_VISION_MODEL=gpt-4o
   MAX_FILE_SIZE_MB=50
   LOG_LEVEL=INFO
   DEBUG=false
   ALLOWED_ORIGINS=https://your-frontend.com
   ```

7. Click **"Create Resources"**

8. Wait 5-10 minutes for deployment

#### 4. Get Your URL

After deployment completes, Digital Ocean will provide a URL:

```
https://rag-backend-xxxxx.ondigitalocean.app
```

#### 5. Test Your Deployment

```powershell
# From your Windows PowerShell
$APP_URL = "https://rag-backend-xxxxx.ondigitalocean.app"

# Test health endpoint
Invoke-RestMethod "$APP_URL/health"

# View API documentation
Start-Process "$APP_URL/docs"
```

#### 6. Setup Custom Domain (Optional)

1. In App Platform, go to **Settings** → **Domains**
2. Add your domain: `api.yourdomain.com`
3. Update DNS at your registrar:
   ```
   Type: CNAME
   Host: api
   Value: rag-backend-xxxxx.ondigitalocean.app
   ```
4. Wait for DNS propagation (5-30 minutes)
5. SSL is automatically configured

✅ **Done!** Your backend is live on Digital Ocean App Platform!

---

## 🖥️ Option 2: Droplet (Full Control)

Perfect for: Custom configurations, long-term projects, learning Linux

### Step 1: Create Droplet

1. Go to https://cloud.digitalocean.com
2. Click **"Create"** → **"Droplets"**
3. Configure:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic Shared CPU
   - **CPU Options**: Regular - $12/month (2GB RAM, 1 vCPU, 50GB SSD)
   - **Datacenter**: Choose closest to your users (e.g., New York, San Francisco)
   - **Authentication**:
     - Create SSH key (recommended) OR
     - Set root password
   - **Hostname**: `rag-backend`
4. Click **"Create Droplet"**
5. Note the IP address: `xxx.xxx.xxx.xxx`

### Step 2: Connect to Your Droplet

**From Windows PowerShell:**

```powershell
# If you used SSH key
ssh root@YOUR_DROPLET_IP

# If you used password, you'll be prompted to enter it
```

### Step 3: Initial Setup

```bash
# Update system
apt update && apt upgrade -y

# Install Python 3.11 and dependencies
apt install -y software-properties-common
add-apt-repository ppa:deadsnakes/ppa -y
apt update
apt install -y python3.11 python3.11-venv python3.11-dev

# Install system dependencies
apt install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    build-essential \
    libpq-dev \
    nginx \
    git \
    curl

# Create app user
adduser raguser
# Set password when prompted
usermod -aG sudo raguser

# Setup firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

# Switch to app user
su - raguser
```

### Step 4: Deploy Your Application

```bash
# Create application directory
cd /opt
sudo mkdir rag-backend
sudo chown raguser:raguser rag-backend
cd rag-backend

# Option A: Clone from Git
git clone https://github.com/your-username/your-repo.git .

# Option B: Upload from Windows
# In a NEW PowerShell window on your local machine:
# scp -r C:\Users\iamas\Storage\Codes\LLMs\RAG\Rag-Compentator\backend\* raguser@YOUR_DROPLET_IP:/opt/rag-backend/

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create environment file
nano .env
```

**Paste your environment variables in nano:**

```env
OPENAI_API_KEY=sk-proj-your-key
DATABASE_URL=postgresql://user:pass@host/db
PINECONE_API_KEY=your-key
PINECONE_DENSE_INDEX_NAME=rag-comparator-dense
PINECONE_SPARSE_INDEX_NAME=rag-comparator-sparse
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
OPENAI_VISION_MODEL=gpt-4o
MAX_FILE_SIZE_MB=50
LOG_LEVEL=INFO
DEBUG=false
```

**Save**: Ctrl+X, then Y, then Enter

```bash
# Secure the .env file
chmod 600 .env
```

### Step 5: Create Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/rag-backend.service
```

**Paste this configuration:**

```ini
[Unit]
Description=RAG Comparator Backend
After=network.target

[Service]
Type=simple
User=raguser
Group=raguser
WorkingDirectory=/opt/rag-backend
Environment="PATH=/opt/rag-backend/venv/bin"
EnvironmentFile=/opt/rag-backend/.env
ExecStart=/opt/rag-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Save**: Ctrl+X, then Y, then Enter

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable rag-backend
sudo systemctl start rag-backend

# Check status
sudo systemctl status rag-backend

# If there are errors, view logs:
sudo journalctl -u rag-backend -n 50
```

### Step 6: Configure Nginx

```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/rag-backend
```

**Paste this configuration:**

```nginx
upstream rag_backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name YOUR_DROPLET_IP;  # Replace with your IP or domain

    client_max_body_size 50M;
    client_body_timeout 300s;

    location / {
        proxy_pass http://rag_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

**Save**: Ctrl+X, then Y, then Enter

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

### Step 7: Test Your Deployment

```bash
# On the server
curl http://localhost:8000/health

# From your Windows machine (PowerShell)
Invoke-RestMethod "http://YOUR_DROPLET_IP/health"

# Open API docs in browser
Start-Process "http://YOUR_DROPLET_IP/docs"
```

### Step 8: Setup SSL (Recommended)

```bash
# On your droplet
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Option A: With a domain
sudo certbot --nginx -d yourdomain.com
# Follow prompts, choose redirect HTTP to HTTPS

# Option B: Without a domain (use Droplet IP)
# SSL not available for IP addresses, you need a domain
```

**To get a free domain for testing:**

- Use services like FreeDNS, No-IP, or DuckDNS
- Or buy a cheap domain from Namecheap ($1-10/year)

### Step 9: Setup Custom Domain

1. **Purchase a domain** (if you don't have one)

   - Namecheap, GoDaddy, Google Domains, etc.

2. **Update DNS records** at your domain registrar:

   ```
   Type: A
   Host: @ (for root) or api (for subdomain)
   Value: YOUR_DROPLET_IP
   TTL: 300
   ```

3. **Update nginx configuration**:

   ```bash
   sudo nano /etc/nginx/sites-available/rag-backend
   # Change: server_name YOUR_DROPLET_IP;
   # To:     server_name yourdomain.com;

   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Get SSL certificate**:

   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

5. **Wait for DNS propagation** (5-30 minutes)

✅ **Done!** Your backend is live at `https://yourdomain.com`

---

## 🔧 Maintenance & Operations

### View Logs

**App Platform:**

- Go to app → **Runtime Logs** tab
- Real-time streaming logs

**Droplet:**

```bash
# View service logs
sudo journalctl -u rag-backend -f

# View nginx access logs
sudo tail -f /var/log/nginx/access.log

# View nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Update Your Application

**App Platform:**

1. Push changes to your Git repository
2. Digital Ocean automatically rebuilds and redeploys

**Droplet:**

```bash
# SSH into droplet
ssh raguser@YOUR_DROPLET_IP

# Navigate to app directory
cd /opt/rag-backend

# Pull latest changes
git pull origin main

# Activate virtual environment
source venv/bin/activate

# Update dependencies (if changed)
pip install -r requirements.txt

# Restart service
sudo systemctl restart rag-backend

# Check status
sudo systemctl status rag-backend
```

### Restart Services

**App Platform:**

- Go to app → **Actions** → **Force Rebuild and Deploy**

**Droplet:**

```bash
# Restart backend
sudo systemctl restart rag-backend

# Restart nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status rag-backend nginx
```

### Monitor Resources

**App Platform:**

- Built-in monitoring dashboard
- View CPU, Memory, Bandwidth usage

**Droplet:**

```bash
# Install monitoring agent
curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash

# View resources
htop  # or top
df -h  # disk space
free -h  # memory
```

---

## 💰 Cost Comparison

### App Platform

```
Professional XS (1GB RAM):     $12/month
Professional S (2GB RAM):      $24/month
Professional M (4GB RAM):      $48/month

Features:
✅ Automatic scaling
✅ Zero maintenance
✅ Automatic HTTPS
✅ Built-in monitoring
✅ Automatic backups
```

### Droplet

```
Basic (2GB RAM):               $12/month
Regular (4GB RAM):             $24/month
Optional Backups:              +20% ($2.40-4.80/month)

Features:
✅ Full control
✅ SSH access
✅ Custom configurations
❌ Manual maintenance
❌ Self-managed backups
```

### External Services (Both Options)

```
NeonDB PostgreSQL:             $0-19/month
Pinecone Vector DB:            $0-70/month
OpenAI API:                    $50-500/month (usage-based)

Total: $62-601/month
```

---

## ❓ Troubleshooting

### App Platform Issues

**Issue: Build fails**

```
Solution:
- Check build logs in App Platform dashboard
- Verify Dockerfile syntax
- Ensure all dependencies in requirements.txt
```

**Issue: Health check fails**

```
Solution:
- Verify /health endpoint exists in your app
- Check environment variables are set correctly
- View runtime logs for errors
```

### Droplet Issues

**Issue: Can't connect via SSH**

```bash
# Check firewall
sudo ufw status

# Ensure SSH is allowed
sudo ufw allow OpenSSH
```

**Issue: Service won't start**

```bash
# Check for errors
sudo journalctl -u rag-backend -n 100

# Common fixes:
# 1. Check .env file exists and has correct values
# 2. Verify virtual environment path in service file
# 3. Check Python dependencies are installed
```

**Issue: 502 Bad Gateway**

```bash
# Check if backend is running
sudo systemctl status rag-backend

# Test backend directly
curl http://localhost:8000/health

# Check nginx error log
sudo tail -f /var/log/nginx/error.log

# Restart both services
sudo systemctl restart rag-backend nginx
```

**Issue: PDF processing fails**

```bash
# Verify Poppler and Tesseract are installed
pdftotext -v
tesseract --version

# If missing, reinstall
sudo apt install --reinstall poppler-utils tesseract-ocr
```

---

## 📚 Next Steps

After successful deployment:

1. ✅ **Test all endpoints**: Upload a PDF, run searches, check chat
2. ✅ **Update CORS**: Add your frontend domain to `ALLOWED_ORIGINS`
3. ✅ **Setup monitoring**: Enable alerts for downtime
4. ✅ **Configure backups**: Enable automated backups
5. ✅ **Document your setup**: Save IP addresses, domains, credentials
6. ✅ **Deploy frontend**: Follow similar process for Next.js frontend

---

## 🆘 Getting Help

- **Digital Ocean Docs**: https://docs.digitalocean.com
- **Community Forum**: https://www.digitalocean.com/community
- **Support**: https://www.digitalocean.com/support
- **Full Hosting Guide**: See `HOSTING_GUIDE.md` for detailed information

---

**🎉 Congratulations! Your backend is now running on Digital Ocean!**

Remember to:

- Keep your `.env` file secure
- Monitor your usage and costs
- Update dependencies regularly
- Setup automated backups
