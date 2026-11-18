import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter

from app.api.auth import router as auth_router
from app.api.campaign import router as campaign_router
from app.api.contract import router as contract_router
from app.api.dashboard import router as dashboard_router
from app.api.kol import router as kol_router
from app.api.lead import router as lead_router
from app.api.order import router as order_router
from app.api.payout import router as payout_router
from app.api.ui_config import router as ui_config_router
from app.api.user import router as user_router
from app.api.notification import router as notification_router

app = FastAPI(
    title="KOL/KOC Booking Platform API",
    version="0.1.0",
)

# ── CORS Middleware ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, change to specific domains like ["https://kloc.talab.io.vn", "https://kloc.vn"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate Limiter ─────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Global Exception Handler ───────────────────────────────────────────────────
logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log exception for internal tracing, return generic 500 error to user
    logger.exception(f"Unhandled Exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Lỗi hệ thống nội bộ, vui lòng thử lại sau."},
    )

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(campaign_router)
app.include_router(dashboard_router)
app.include_router(kol_router)
app.include_router(lead_router)
app.include_router(contract_router)
app.include_router(order_router)
app.include_router(payout_router)
app.include_router(ui_config_router)
app.include_router(user_router)
app.include_router(notification_router)


# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok"}
