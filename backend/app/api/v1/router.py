"""
API Router Configuration

Aggregates all API version routers for inclusion in the main application.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import documents, search, namespaces, chat, auth, admin

# Create main API v1 router
api_router = APIRouter()

# Include authentication router (no auth required for these endpoints)
api_router.include_router(
    auth.router,
    tags=["authentication"]
)

# Include admin router
api_router.include_router(
    admin.router,
    tags=["admin"]
)

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
