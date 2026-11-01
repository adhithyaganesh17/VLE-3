import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.core.database import Base, get_db
from backend.app.services.seed_data import seed_database

# Create an in-memory SQLite database specifically for test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


# --- 1. Health and Probe Tests ---
def test_liveness_probe():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "environment" in data


def test_readiness_probe():
    response = client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"


def test_prometheus_metrics():
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "medora_http_requests_total" in response.text
    assert "medora_active_environment" in response.text


# --- 2. Authentication & JWT Tests ---
def test_login_admin_success():
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@medora.health", "password": "Admin@12345"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "admin"
    assert data["email"] == "admin@medora.health"


def test_login_doctor_success():
    response = client.post(
        "/api/auth/login",
        json={"email": "doctor.sarah@medora.health", "password": "Doctor@12345"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "doctor"


def test_login_patient_success():
    response = client.post(
        "/api/auth/login",
        json={"email": "patient.john@medora.health", "password": "Patient@12345"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "patient"


def test_login_invalid_password():
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@medora.health", "password": "WrongPassword999"}
    )
    assert response.status_code == 401


def test_register_new_patient():
    new_email = "new.patient.test@medora.health"
    response = client.post(
        "/api/auth/register",
        json={
            "email": new_email,
            "password": "SecurePassword@123",
            "full_name": "Test Patient Alpha",
            "phone": "+1 555-019-9999",
            "role": "patient",
            "blood_group": "B+",
            "gender": "Female"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == new_email
    assert data["role"] == "patient"
    assert "access_token" in data


# --- 3. Role-Based Access Control (RBAC) Tests ---
def test_patient_cannot_access_admin_analytics():
    # Login as patient
    login_res = client.post(
        "/api/auth/login",
        json={"email": "patient.john@medora.health", "password": "Patient@12345"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to access admin analytics
    analytics_res = client.get("/api/admin/analytics", headers=headers)
    assert analytics_res.status_code == 403
    assert "Access denied" in analytics_res.json()["detail"]


def test_admin_can_access_analytics_and_audit_logs():
    login_res = client.post(
        "/api/auth/login",
        json={"email": "admin@medora.health", "password": "Admin@12345"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    analytics_res = client.get("/api/admin/analytics", headers=headers)
    assert analytics_res.status_code == 200
    data = analytics_res.json()
    assert data["total_patients"] >= 2
    assert data["total_doctors"] >= 3

    logs_res = client.get("/api/admin/audit-logs", headers=headers)
    assert logs_res.status_code == 200
    assert len(logs_res.json()) > 0


# --- 4. Appointment Workflow Tests ---
def test_patient_appointment_workflow():
    # 1. Login as patient
    login_res = client.post(
        "/api/auth/login",
        json={"email": "patient.john@medora.health", "password": "Patient@12345"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get doctors list
    doctors_res = client.get("/api/doctors", headers=headers)
    assert doctors_res.status_code == 200
    doctors = doctors_res.json()
    assert len(doctors) > 0
    target_doctor_id = doctors[0]["id"]

    # 3. Book appointment
    book_res = client.post(
        "/api/appointments",
        headers=headers,
        json={
            "doctor_id": target_doctor_id,
            "appointment_date": "2026-11-20",
            "appointment_time": "09:00 AM",
            "reason": "Test routine cardiac checkup"
        }
    )
    assert book_res.status_code == 201
    apt = book_res.json()
    apt_id = apt["id"]
    assert apt["status"] == "SCHEDULED"

    # 4. View appointment list
    my_apts_res = client.get("/api/appointments", headers=headers)
    assert my_apts_res.status_code == 200
    assert any(a["id"] == apt_id for a in my_apts_res.json())

    # 5. Cancel appointment
    cancel_res = client.delete(f"/api/appointments/{apt_id}", headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"


# --- 5. DevOps Control Centre & Blue-Green Toggle Tests ---
def test_devops_status_and_metrics():
    response = client.get("/api/devops/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "system_metrics" in data
    assert "active_pods" in data
    assert data["environment"] in ["blue", "green"]


def test_devops_security_scan_data():
    response = client.get("/api/devops/security-scans")
    assert response.status_code == 200
    data = response.json()
    assert data["overall_status"] == "SECURE_PASSED"
    assert "gitleaks" in data
    assert "bandit" in data
    assert "trivy" in data
    assert "sonarqube" in data


def test_devops_blue_green_switch():
    # Test switching environment to green
    res_green = client.post("/api/devops/switch-env?target_environment=green")
    assert res_green.status_code == 200
    assert res_green.json()["active_environment"] == "GREEN"

    # Verify status reflects green
    status_res = client.get("/api/devops/status")
    assert status_res.json()["environment"] == "green"

    # Switch back to blue
    res_blue = client.post("/api/devops/switch-env?target_environment=blue")
    assert res_blue.status_code == 200
    assert res_blue.json()["active_environment"] == "BLUE"
