import sys
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

try:
    from api.document import router as document_router
    from api.organise import router as organise_router
    from api.edit import router as edit_router
    from api.stamp import router as stamp_router
    from api.convert import router as convert_router
    from api.finish import router as finish_router
    from utils.storage import init_storage, purge_all_temp_storage
    from security.guards import LocalhostSecurityMiddleware
except ImportError:
    from .api.document import router as document_router
    from .api.organise import router as organise_router
    from .api.edit import router as edit_router
    from .api.stamp import router as stamp_router
    from .api.convert import router as convert_router
    from .api.finish import router as finish_router
    from .utils.storage import init_storage, purge_all_temp_storage
    from .security.guards import LocalhostSecurityMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure clean sandbox storage
    init_storage()
    print("PDF Studio Backend started at http://127.0.0.1:8000 (Loopback only)")
    yield
    # Shutdown
    print("PDF Studio Backend shutting down.")

app = FastAPI(
    title="PDF Studio API",
    description="Offline-first PDF Studio Localhost Processing Service",
    version="1.0.3",
    lifespan=lifespan
)

# Enforce loopback security middleware
app.add_middleware(LocalhostSecurityMiddleware)

# Enforce strict localhost CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(document_router)
app.include_router(organise_router)
app.include_router(edit_router)
app.include_router(stamp_router)
app.include_router(convert_router)
app.include_router(finish_router)

@app.get("/api/status")
async def api_status():
    return {
        "name": "PDF Studio Service",
        "version": "1.0.3",
        "status": "online",
        "security": "offline-localhost-only"
    }

# If frontend production build exists, mount it at root so PDF Studio can be served locally directly
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.isdir(frontend_dist) and os.path.isfile(os.path.join(frontend_dist, "index.html")):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {
            "name": "PDF Studio Service",
            "version": "1.0.3",
            "status": "online",
            "security": "offline-localhost-only"
        }

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PDF_STUDIO_PORT", 8001))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
