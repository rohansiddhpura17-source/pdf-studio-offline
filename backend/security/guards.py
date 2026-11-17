from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class LocalhostSecurityMiddleware(BaseHTTPMiddleware):
    """
    Guarantees that only requests originating from loopback (127.0.0.1 or localhost)
    can communicate with the PDF Studio backend, mitigating DNS rebinding attacks.
    """
    async def dispatch(self, request: Request, call_next):
        # Verify client host
        client_host = request.client.host if request.client else ""
        if client_host not in ("127.0.0.1", "::1", "localhost", "testclient"):
            return JSONResponse(
                status_code=403,
                content={"detail": "Access restricted strictly to local machine loopback."}
            )
            
        # Verify Host header
        host_header = request.headers.get("host", "").split(":")[0]
        if host_header not in ("127.0.0.1", "localhost", "testclient"):
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid Host header; PDF Studio operates exclusively on localhost."}
            )
            
        response = await call_next(request)
        return response
