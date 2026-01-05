"""
API Router Configuration

Aggregates all API version routers for inclusion in the main application.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import documents, search, namespaces, chat

# Create main API v1 router
api_router = APIRouter()

# Include endpoint routers
api_router.include_router(
    documents.router,
    tags=["documents"]
)

api_router.include_router(
    search.router,
    tags=["search"]
)

api_router.include_router(
    namespaces.router,
    tags=["namespaces"]
)

api_router.include_router(
    chat.router,
    tags=["chat"]
)
