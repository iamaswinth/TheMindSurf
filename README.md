# RAG Compensator

A full-stack **Retrieval-Augmented Generation (RAG)** application with multimodal document processing capabilities, featuring intelligent chunking, vector storage, and AI-powered chat.

🌐 **Live Demo**: [https://www.themindsurf.tech/](https://www.themindsurf.tech/)

## 🌟 Features

### Backend (FastAPI)

- **Multimodal Document Processing**: Extract text, tables, and images from PDFs
- **AI-Enhanced Chunking**: GPT-4o vision-based chunk summarization for improved retrieval
- **Semantic Chunking**: Intelligent content segmentation using Unstructured.io
- **Vector Storage**: Pinecone integration for efficient similarity search
- **Metadata Storage**: PostgreSQL (NeonDB) for fast document and namespace management
- **Streaming RAG**: Real-time streaming responses with citation support
- **Authentication & Authorization**: JWT-based user authentication
- **Credit System**: Usage tracking and rate limiting
- **RESTful API**: Comprehensive FastAPI endpoints with automatic documentation

### Frontend (Next.js)

- **Modern UI**: Built with React 19 and Next.js 16 (App Router)
- **Real-time Chat**: Streaming AI responses using Vercel AI SDK
- **Document Management**: Upload, view, and organize documents by namespace
- **User Profiles**: Authentication with profile management
- **Admin Dashboard**: Monitor system usage and manage users
- **React Query**: Efficient data fetching, caching, and synchronization
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (Next.js)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Chat UI   │  │  Documents   │  │  Auth/Profile   │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
│         │                 │                    │             │
│         └─────────────────┴────────────────────┘             │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │ HTTP/REST
┌───────────────────────────┼──────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API Layer (FastAPI Routes)                         │   │
│  │  • /documents  • /chat  • /auth  • /namespaces     │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌────────────┬───────────┴──────────┬────────────────┐   │
│  │ Multimodal │  Chunking Service    │  RAG Response  │   │
│  │ Processor  │  (Split & Embed)     │   Generator    │   │
│  │ (Extract)  │  + AI Enhancement    │ (Query + Gen)  │   │
│  └────────────┴──────────────────────┴────────────────┘   │
│       │                │                      │             │
│       │                │                      │             │
│       ▼                ▼                      ▼             │
│  ┌──────────────┐  ┌──────────┐      ┌──────────────┐    │
│  │ Unstructured │  │ Pinecone │      │    OpenAI    │    │
│  │  (Poppler +  │  │ (Vectors)│      │ (Embeddings  │    │
│  │  Tesseract)  │  │          │      │   + GPT-4)   │    │
│  └──────────────┘  └──────────┘      └──────────────┘    │
│                          │                   ▲              │
│                          │                   │              │
│                          ▼                   │              │
│                    ┌──────────┐             │              │
│                    │  NeonDB  │─────────────┘              │
│                    │   (PG)   │ Metadata Storage           │
│                    └──────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.13+** (Backend)
- **Node.js 20+** (Frontend)
- **Docker** (Optional, for containerized deployment)
- **System Dependencies** (Windows):
  - [Poppler](https://github.com/oschwartz10612/poppler-windows/releases/) for PDF processing
  - [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) for OCR support

### 1. Clone Repository

```bash
git clone <repository-url>
cd Rag-Compentator
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Create .env file with:
cat > .env << EOL
# Database
DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require

# API Keys
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...

# Pinecone Configuration
PINECONE_INDEX_NAME=rag-documents
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1

# Security
SECRET_KEY=your-secret-key-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Optional
DEBUG=True
MAX_FILE_SIZE_MB=50
EOL

# Initialize database
python setup_database.py

# Run backend
python main.py
# or with uvicorn:
# uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: http://localhost:8000

- API Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 3. Frontend Setup

```bash
cd ../rag-compentator

# Install dependencies
npm install

# Configure environment variables
# Create .env.local file with:
cat > .env.local << EOL
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Database (for direct queries)
DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require
EOL

# Run development server
npm run dev
```

Frontend will be available at: http://localhost:3000

## 📦 Deployment

### Backend Deployment (Docker)

```bash
cd backend

# Build image
docker build -t rag-backend:latest .

# Run container
docker run -d \
  --name rag-backend \
  -p 8000:8000 \
  --env-file .env \
  rag-backend:latest
```

Or use Docker Compose:

```bash
docker-compose up -d
```

See [DEPLOYMENT.md](docs/backend/DEPLOYMENT.md) for detailed deployment guides (Railway, DigitalOcean, etc.)

### Frontend Deployment (Vercel)

```bash
cd rag-compentator

# Build
npm run build

# Deploy to Vercel
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

## 📚 Documentation

All documentation is organized in the `docs/` directory for easy navigation.

### Backend Documentation

- [Architecture Guide](docs/backend/ARCHITECTURE.md) - Complete system architecture and data flow
- [API Documentation](docs/backend/API_DOCUMENTATION.md) - REST API endpoints and usage
- [Streaming RAG](docs/backend/STREAMING_RAG.md) - Streaming implementation details
- [Testing Guide](docs/backend/TESTING_GUIDE.md) - How to test the backend
- [Deployment Guide](docs/backend/DEPLOYMENT.md) - Production deployment instructions
- [Hosting Guide](docs/backend/HOSTING_GUIDE.md) - Platform-specific hosting
- [Digital Ocean Deploy](docs/backend/DIGITAL_OCEAN_DEPLOY.md) - DigitalOcean deployment

### Frontend Documentation

- [Frontend Setup](docs/frontend/FRONTEND_SETUP.md) - Detailed frontend configuration
- [API Integration](docs/frontend/API_INTEGRATION_SUMMARY.md) - Backend integration patterns
- [React Query Setup](docs/frontend/REACT-QUERY-SETUP.md) - Data fetching architecture
- [Document Management](docs/frontend/DOCUMENT_MANAGEMENT_INTEGRATION.md) - Document handling
- [Document Upload](docs/frontend/DOCUMENT_UPLOAD_INTEGRATION.md) - Upload integration
- [Upload Flow Diagram](docs/frontend/UPLOAD_FLOW_DIAGRAM.md) - Document upload workflow
- [Upload Quick Reference](docs/frontend/UPLOAD_QUICK_REFERENCE.md) - Quick upload reference
- [Prefetching Guide](docs/frontend/PREFETCHING.md) - Data prefetching strategies
- [Prefetching Quickstart](docs/frontend/PREFETCHING-QUICKSTART.md) - Quick prefetching setup
- [Backend Requirements](docs/frontend/BACKEND-REQUIREMENTS.md) - Backend API requirements

### Setup & Testing Guides

- [MVP Implementation](docs/guides/MVP_IMPLEMENTATION_SUMMARY.md) - NeonDB + Pinecone integration
- [MVP Quick Start](docs/guides/MVP_QUICKSTART.md) - 5-minute setup guide
- [MVP Testing Guide](docs/guides/MVP_TESTING_GUIDE.md) - End-to-end testing procedures
- [Backend Missing Features](docs/guides/BACKEND_MISSING_FEATURES_PROMPT.md) - Known limitations
- [Vercel AI SDK Implementation](docs/guides/FRONTEND_VERCEL_AI_SDK_IMPLEMENTATION.md) - Vercel AI SDK guide

## 🔧 Development

### Backend Development

```bash
cd backend

# Run with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest tests/

# Test streaming
python test_streaming_client.py
```

### Frontend Development

```bash
cd rag-compentator

# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🧪 Testing

### Test Document Upload

```bash
# Upload a document
curl -X POST http://localhost:8000/api/v1/documents/process-multimodal \
  -F "file=@test.pdf" \
  -F "namespace=test" \
  -F "strategy=hi_res" \
  -F "enable_ai_enhancement=true" \
  -F "upsert_to_pinecone=true"
```

### Test Streaming Chat

```bash
# Using Python client
cd backend
python test_streaming_client.py

# Or open test page
# http://localhost:8000/static/test_streaming.html
```

See [MVP_TESTING_GUIDE.md](docs/guides/MVP_TESTING_GUIDE.md) for comprehensive testing procedures.

## 🗂️ Project Structure

```
Rag-Compentator/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Configuration
│   │   ├── db/             # Database layer
│   │   ├── models/         # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── tests/              # Backend tests
│   ├── main.py             # Application entry point
│   └── requirements.txt    # Python dependencies
│
├── rag-compentator/        # Next.js frontend
│   ├── app/                # App router pages
│   ├── components/         # React components
│   ├── lib/                # Utilities & API clients
│   └── public/             # Static assets
│
└── docs/                   # Documentation files
```

## 🔑 Key Technologies

### Backend

- **FastAPI** - Modern Python web framework
- **Unstructured.io** - Document parsing and extraction
- **OpenAI GPT-4o** - AI-powered enhancements and generation
- **Pinecone** - Vector database for semantic search
- **PostgreSQL (NeonDB)** - Metadata and relational data
- **asyncpg** - Async PostgreSQL driver
- **JWT** - Authentication tokens

### Frontend

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **Vercel AI SDK** - Streaming AI responses
- **React Query** - Data synchronization
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - Type safety

## 🔐 Environment Variables

### Backend (.env)

```env
# =============================================================================
# Database
# =============================================================================
DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require

# =============================================================================
# LLM Provider Configuration
# =============================================================================
# Choose provider: 'openai' or 'gemini'
LLM_PROVIDER=openai

# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_VISION_MODEL=gpt-4o
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.3

# Gemini Configuration (if using Gemini)
GEMINI_API_KEY=your-gemini-key

# =============================================================================
# Pinecone Vector Database (Hybrid Search)
# =============================================================================
PINECONE_API_KEY=pcsk_...
PINECONE_DENSE_INDEX_NAME=rag-comparator-dense
PINECONE_SPARSE_INDEX_NAME=rag-comparator-sparse
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
PINECONE_NAMESPACE=documents

# Pinecone Embedding Models
PINECONE_DENSE_MODEL=llama-text-embed-v2
PINECONE_SPARSE_MODEL=pinecone-sparse-english-v0
PINECONE_RERANK_MODEL=bge-reranker-v2-m3

# Search Parameters
PINECONE_TOP_K=5
PINECONE_RERANK_TOP_N=5
PINECONE_UPSERT_BATCH_SIZE=40

# =============================================================================
# Authentication & Security
# =============================================================================
JWT_SECRET_KEY=your-super-secret-jwt-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# GitHub OAuth (Optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=https://your-backend.com/api/v1/auth/github/callback

# Frontend URL (for OAuth redirects)
FRONTEND_URL=https://your-frontend.com

# =============================================================================
# Application Settings
# =============================================================================
APP_NAME=RAG Comparator Backend
APP_VERSION=1.0.0
DEBUG=false

# Credit System
INITIAL_USER_CREDITS=3
AI_ENHANCED_UPLOAD_COST=1

# =============================================================================
# Multimodal Processing
# =============================================================================
ENABLE_MULTIMODAL_PROCESSING=true
DEFAULT_PROCESSING_STRATEGY=hi_res
ENABLE_AI_ENHANCEMENT=true
AI_ENHANCEMENT_TIMEOUT=60

# =============================================================================
# Chunking Parameters
# =============================================================================
MAX_CHUNK_CHARACTERS=3000
NEW_CHUNK_AFTER_N_CHARS=2400
MIN_CHUNK_CHARACTERS=500

# =============================================================================
# File Handling & Logging
# =============================================================================
MAX_FILE_SIZE_MB=50
LOG_LEVEL=INFO
LOG_AI_USAGE=true
```

> ⚠️ **Security Warning**: Never commit `.env` files with real credentials to git. Add `.env` to your `.gitignore` and rotate any exposed keys immediately.

### Frontend (.env.local)

```env
# Required
NEXT_PUBLIC_API_URL=http://localhost:8000
DATABASE_URL=postgresql://...

# Optional
NEXT_PUBLIC_APP_NAME=RAG Compensator
```

## 📝 API Endpoints

### Documents

- `POST /api/v1/documents/process-multimodal` - Upload and process document
- `GET /api/v1/documents` - List documents
- `DELETE /api/v1/documents/{id}` - Delete document

### Chat

- `POST /api/v1/chat/query` - Query with RAG (non-streaming)
- `POST /api/v1/chat/query-stream` - Streaming RAG query

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user

### Namespaces

- `GET /api/v1/namespaces` - List namespaces
- `POST /api/v1/namespaces` - Create namespace

See [API_DOCUMENTATION.md](docs/backend/API_DOCUMENTATION.md) for complete API reference.

## 🐛 Troubleshooting

### Backend Issues

**Poppler not found:**

```bash
# Download from https://github.com/oschwartz10612/poppler-windows/releases/
# Add bin/ folder to PATH
```

**Database connection error:**

```bash
# Test connection
python setup_database.py
# Check DATABASE_URL format
```

**Import errors:**

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Frontend Issues

**API connection error:**

- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Ensure backend is running on correct port

**Build errors:**

```bash
# Clear cache
rm -rf .next
npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙋 Support

For issues and questions:

- Check the [documentation](docs/backend/ARCHITECTURE.md)
- Review [troubleshooting guides](docs/backend/TESTING_GUIDE.md)
- Open an issue on GitHub

## 🎯 Roadmap

- [ ] Multi-language support
- [ ] Advanced document types (DOCX, PPTX, HTML)
- [ ] Real-time collaboration
- [ ] Enhanced admin analytics
- [ ] Custom embedding models
- [ ] Hybrid search (keyword + semantic)
- [ ] Document versioning
- [ ] Advanced citation tracking

---

**Built with ❤️ using FastAPI and Next.js**
