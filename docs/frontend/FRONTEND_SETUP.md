# 🚀 Frontend Environment Setup Guide

## ✅ Environment Variables Configured

Your `.env.local` file is already set up with:

### Required Variables

| Variable              | Value                          | Description              |
| --------------------- | ------------------------------ | ------------------------ |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | FastAPI backend URL      |
| `DATABASE_URL`        | `postgresql://...`             | NeonDB connection string |
| `NODE_ENV`            | `development`                  | Node environment         |

---

## 🔧 Setup Steps

### 1. Install Dependencies

The error you're seeing is because npm packages haven't been installed yet:

```bash
cd rag-compentator
npm install
```

This will install:

- ✅ `@neondatabase/serverless` - For database queries
- ✅ `@tanstack/react-query` - For data fetching
- ✅ `next` - Next.js framework
- ✅ `react` & `react-dom` - React libraries
- ✅ All other dependencies

### 2. Verify Backend is Running

Make sure your FastAPI backend is running on port 8000:

```bash
cd ../backend
python main.py
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 3. Start Development Server

```bash
cd ../rag-compentator
npm run dev
```

Expected output:

```
▲ Next.js 16.1.1
- Local:        http://localhost:3000
- Ready in 2.5s
```

---

## 📋 Environment Variables Explained

### `NEXT_PUBLIC_API_URL`

- **Purpose:** Base URL for FastAPI backend
- **Used in:** API client for all backend requests
- **Prefix `NEXT_PUBLIC_`:** Makes it available in browser (client-side)
- **Default:** `http://localhost:8000/api/v1`
- **Production:** Change to your deployed backend URL

### `DATABASE_URL`

- **Purpose:** NeonDB PostgreSQL connection string
- **Used in:** Next.js API routes for fast document listing
- **Security:** Server-side only (NOT exposed to browser)
- **Format:** `postgresql://user:pass@host/db?sslmode=require`
- **Get from:** https://console.neon.tech/

### `NODE_ENV`

- **Purpose:** Determines environment mode
- **Values:** `development`, `production`, `test`
- **Used in:** React Query devtools, logging, optimizations

---

## 🔍 Verification Checklist

After running `npm install` and `npm run dev`:

- [ ] No "Module not found" errors
- [ ] `@neondatabase/serverless` is installed
- [ ] Development server starts on http://localhost:3000
- [ ] API calls go to http://localhost:8000/api/v1
- [ ] NeonDB queries work in API routes

---

## 🐛 Troubleshooting

### Error: "Module not found: @neondatabase/serverless"

**Solution:** Run `npm install`

### Error: "DATABASE_URL environment variable is not set"

**Solution:** Check `.env.local` has the `DATABASE_URL` line uncommented

### Error: "Failed to fetch from API"

**Solutions:**

1. Verify backend is running: `curl http://localhost:8000/health`
2. Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. Check CORS is enabled in FastAPI backend

### Error: "Database connection failed"

**Solutions:**

1. Verify NeonDB credentials in `DATABASE_URL`
2. Test connection: `psql <DATABASE_URL>`
3. Check firewall/network access

---

## 📦 Package.json Overview

Your installed packages:

```json
{
  "dependencies": {
    "@neondatabase/serverless": "^0.10.4", // ✅ Database client
    "@tanstack/react-query": "^5.90.16", // ✅ Data fetching
    "@tanstack/react-query-devtools": "^5.91.2", // ✅ Dev tools
    "next": "16.1.1", // ✅ Framework
    "react": "19.2.3", // ✅ React
    "react-dom": "19.2.3" // ✅ React DOM
  }
}
```

---

## 🎯 Next Steps

1. **Run:** `npm install` (to install packages)
2. **Run:** `npm run dev` (to start dev server)
3. **Open:** http://localhost:3000
4. **Test:** Upload a document and chat with it

---

## 📚 Related Files

- **`.env`** - Checked into version control (with example values)
- **`.env.local`** - Your actual values (NOT in git)
- **`.env.example`** - Template for new developers
- **`.gitignore`** - Excludes `.env.local` from git

---

**Last Updated:** January 6, 2026  
**Status:** ✅ Ready to install and run
