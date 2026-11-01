import time
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

from backend.app.core.config import settings
from backend.app.core.database import engine, Base, SessionLocal, get_db
from backend.app.services.seed_data import seed_database
from backend.app.services.devops_service import get_active_environment

from backend.app.api.auth import router as auth_router
from backend.app.api.patients import router as patients_router
from backend.app.api.doctors import router as doctors_router
from backend.app.api.appointments import router as appointments_router
from backend.app.api.consultations import router as consultations_router
from backend.app.api.prescriptions import router as prescriptions_router
from backend.app.api.lab_reports import router as lab_reports_router
from backend.app.api.admin import router as admin_router
from backend.app.api.devops import router as devops_router

# --- Prometheus Metrics Definitions ---
HTTP_REQUESTS_TOTAL = Counter(
    "medora_http_requests_total",
    "Total HTTP requests received",
    ["method", "endpoint", "status_code", "environment"]
)
REQUEST_LATENCY = Histogram(
    "medora_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["endpoint", "environment"]
)
ACTIVE_ENVIRONMENT_GAUGE = Gauge(
    "medora_active_environment",
    "Current active deployment environment (1=Blue, 2=Green)",
    ["environment"]
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed default demo data
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        seed_database(db)
        db.close()
    except Exception as e:
        print(f"[STARTUP WARNING] Error initializing database tables: {e}")
    
    yield
    # Shutdown logic if needed


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Secure Healthcare Operations Platform with CI/CD, Kubernetes, Blue-Green Deployment, and DevSecOps.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing & Prometheus tracking middleware
@app.middleware("http")
async def prometheus_and_timing_middleware(request, call_next):
    start_time = time.time()
    current_env = get_active_environment()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time * 1000, 2)) + "ms"
    response.headers["X-Deployment-Environment"] = current_env.upper()
    response.headers["X-App-Version"] = settings.APP_VERSION
    
    # Record metrics for Prometheus (skip pure metrics scrapes to avoid noise)
    if not request.url.path.startswith("/metrics"):
        endpoint = request.url.path
        HTTP_REQUESTS_TOTAL.labels(
            method=request.method,
            endpoint=endpoint,
            status_code=response.status_code,
            environment=current_env
        ).inc()
        REQUEST_LATENCY.labels(
            endpoint=endpoint,
            environment=current_env
        ).observe(process_time)
        
    return response


# --- Probes & Monitoring Endpoints ---
@app.get("/health", tags=["Monitoring & Probes"])
def liveness_probe():
    """
    Kubernetes Liveness Probe.
    Returns 200 OK if container runtime is alive and responding.
    """
    active_env = get_active_environment()
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": active_env.upper(),
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/ready", tags=["Monitoring & Probes"])
def readiness_probe(response: Response, db: Session = Depends(get_db)):
    """
    Kubernetes Readiness Probe.
    Returns 200 OK if database and backend dependencies are ready to serve traffic.
    Returns 503 SERVICE_UNAVAILABLE if database connection fails.
    """
    active_env = get_active_environment()
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "database": "connected",
            "environment": active_env.upper(),
            "version": settings.APP_VERSION,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "database": "disconnected",
            "error": str(e),
            "environment": active_env.upper()
        }


@app.get("/metrics", tags=["Monitoring & Probes"])
def metrics():
    """
    Prometheus metrics endpoint. Exposes standard metrics, custom latencies,
    and active environment gauges.
    """
    active_env = get_active_environment()
    env_code = 1 if active_env == "blue" else 2
    ACTIVE_ENVIRONMENT_GAUGE.labels(environment=active_env).set(env_code)
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


# --- Register Routers ---
app.include_router(auth_router)
app.include_router(patients_router)
app.include_router(doctors_router)
app.include_router(appointments_router)
app.include_router(consultations_router)
app.include_router(prescriptions_router)
app.include_router(lab_reports_router)
app.include_router(admin_router)
app.include_router(devops_router)


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to MEDORA — Smart Healthcare Operations Platform API",
        "docs": "/docs",
        "health": "/health",
        "ready": "/ready",
        "metrics": "/metrics",
        "environment": get_active_environment().upper(),
        "version": settings.APP_VERSION
    }
