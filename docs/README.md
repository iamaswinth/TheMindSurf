# Documentation Structure Guide

This directory contains all project documentation organized by category for easy navigation.

## 📁 Directory Structure

```
docs/
├── README.md (this file)
├── backend/                    # Backend-specific documentation
│   ├── ARCHITECTURE.md
│   ├── API_DOCUMENTATION.md
│   ├── STREAMING_RAG.md
│   ├── TESTING_GUIDE.md
│   ├── DEPLOYMENT.md
│   ├── DIGITAL_OCEAN_DEPLOY.md
│   ├── DEPLOYMENT_CHECKLIST.md
│   └── HOSTING_GUIDE.md
│
├── frontend/                   # Frontend-specific documentation
│   ├── FRONTEND_SETUP.md
│   ├── API_INTEGRATION_SUMMARY.md
│   ├── REACT-QUERY-SETUP.md
│   ├── DOCUMENT_MANAGEMENT_INTEGRATION.md
│   ├── DOCUMENT_UPLOAD_INTEGRATION.md
│   ├── UPLOAD_FLOW_DIAGRAM.md
│   ├── UPLOAD_QUICK_REFERENCE.md
│   ├── PREFETCHING.md
│   ├── PREFETCHING-QUICKSTART.md
│   └── BACKEND-REQUIREMENTS.md
│
└── guides/                     # Setup and testing guides
    ├── MVP_IMPLEMENTATION_SUMMARY.md
    ├── MVP_QUICKSTART.md
    ├── MVP_TESTING_GUIDE.md
    ├── BACKEND_MISSING_FEATURES_PROMPT.md
    └── FRONTEND_VERCEL_AI_SDK_IMPLEMENTATION.md
```

## 📝 File Migration Guide

Move your existing markdown files to the appropriate locations:

### From Root Directory → `docs/guides/`

- `MVP_IMPLEMENTATION_SUMMARY.md`
- `MVP_QUICKSTART.md`
- `MVP_TESTING_GUIDE.md`
- `BACKEND_MISSING_FEATURES_PROMPT.md`
- `FRONTEND_VERCEL_AI_SDK_IMPLEMENTATION.md`

### From `backend/` → `docs/backend/`

- `ARCHITECTURE.md`
- `API_DOCUMENTATION.md`
- `STREAMING_RAG.md`
- `TESTING_GUIDE.md`
- `DEPLOYMENT.md`
- `DIGITAL_OCEAN_DEPLOY.md`
- `DEPLOYMENT_CHECKLIST.md`
- `HOSTING_GUIDE.md`

### From `rag-compentator/` → `docs/frontend/`

- `FRONTEND_SETUP.md`
- `API_INTEGRATION_SUMMARY.md`
- `REACT-QUERY-SETUP.md`
- `DOCUMENT_MANAGEMENT_INTEGRATION.md`
- `DOCUMENT_UPLOAD_INTEGRATION.md`
- `UPLOAD_FLOW_DIAGRAM.md`
- `UPLOAD_QUICK_REFERENCE.md`
- `PREFETCHING.md`
- `PREFETCHING-QUICKSTART.md`
- `BACKEND-REQUIREMENTS.md`

## 🔧 PowerShell Migration Commands

⚠️ **IMPORTANT**: Run these commands from the **project root** directory!

```powershell
# First, navigate to project root
cd C:\Users\iamas\Storage\Codes\LLMs\RAG\Rag-Compentator

# Verify you're in the correct directory
Get-Location  # Should show: ...\Rag-Compentator

# Move root markdown files to docs/guides/
Move-Item -Path "MVP_IMPLEMENTATION_SUMMARY.md" -Destination "docs/guides/" -ErrorAction SilentlyContinue
Move-Item -Path "MVP_QUICKSTART.md" -Destination "docs/guides/" -ErrorAction SilentlyContinue
Move-Item -Path "MVP_TESTING_GUIDE.md" -Destination "docs/guides/" -ErrorAction SilentlyContinue
Move-Item -Path "BACKEND_MISSING_FEATURES_PROMPT.md" -Destination "docs/guides/" -ErrorAction SilentlyContinue
Move-Item -Path "FRONTEND_VERCEL_AI_SDK_IMPLEMENTATION.md" -Destination "docs/guides/" -ErrorAction SilentlyContinue

# Move backend docs
Move-Item -Path "backend/ARCHITECTURE.md" -Destination "docs/backend/" -ErrorAction SilentlyContinue
Move-Item -Path "backend/API_DOCUMENTATION.md" -Destination "docs/backend/" -ErrorAction SilentlyContinue
Move-Item -Path "backend/STREAMING_RAG.md" -Destination "docs/backend/" -ErrorAction SilentlyContinue
Move-Item -Path "backend/TESTING_GUIDE.md" -Destination "docs/backend/" -ErrorAction SilentlyContinue
Move-Item -Path "backend/DEPLOYMENT.md" -Destination "docs/backend/" -ErrorAction SilentlyContinue
Move-Item -Path "backend/DIGITAL_OCEAN_DEPLOY.md" -Destination "docs/backend/" -ErrorAction SilentlyContinue
Move-Item -Path "backend/DEPLOYMENT_CHECKLIST.md" -Destination "docs/backend/" -ErrorAction SilentlyContinue
Move-Item -Path "backend/HOSTING_GUIDE.md" -Destination "docs/backend/" -ErrorAction SilentlyContinue

# Move frontend docs
Move-Item -Path "rag-compentator/FRONTEND_SETUP.md" -Destination "docs/frontend/" -ErrorAction SilentlyContinue
Move-Item -Path "rag-compentator/API_INTEGRATION_SUMMARY.md" -Destination "docs/frontend/" -ErrorAction SilentlyContinue
Move-Item -Path "rag-compentator/REACT-QUERY-SETUP.md" -Destination "docs/frontend/" -ErrorAction SilentlyContinue
Move-Item -Path "rag-compentator/DOCUMENT_MANAGEMENT_INTEGRATION.md" -Destination "docs/frontend/" -ErrorAction SilentlyContinue
Move-Item -Path "rag-compentator/DOCUMENT_UPLOAD_INTEGRATION.md" -Destination "docs/frontend/" -ErrorAction SilentlyContinue
Move-Item -Path "rag-compentator/UPLOAD_FLOW_DIAGRAM.md" -Destination "docs/frontend/" -ErrorAction SilentlyContinue
Move-Item -Path "rag-compentator/UPLOAD_QUICK_REFERENCE.md" -Destination "docs/frontend/" -ErrorAction SilentlyContinue
Move-Item -Path "rag-compentator/PREFETCHING.md" -Destination "docs/frontend/" -ErrorAction SilentlyContinue
Move-Item -Path "rag-compentator/PREFETCHING-QUICKSTART.md" -Destination "docs/frontend/" -ErrorAction SilentlyContinue
Move-Item -Path "rag-compentator/BACKEND-REQUIREMENTS.md" -Destination "docs/frontend/" -ErrorAction SilentlyContinue
```

## ✅ After Migration

1. Verify all files are in the correct locations
2. Remove the old markdown files from their original locations
3. Update your `.gitignore` to exclude markdown files except in `docs/` and root `README.md`
4. Commit the reorganized structure

## 📋 Keep in Root Directory

These files should remain in their original locations:

- `README.md` (project root) - Main project documentation
- Code files (`.py`, `.ts`, `.tsx`, etc.)
- Configuration files (`.env`, `package.json`, etc.)
- Build artifacts and dependencies
