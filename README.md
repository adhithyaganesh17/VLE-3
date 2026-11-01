# MEDORA — Smart Healthcare Operations Platform

[![CI/CD: Jenkins](https://img.shields.io/badge/CI%2FCD-Jenkins%20Declarative-blue?logo=jenkins)](./Jenkinsfile)
[![Kubernetes: Blue-Green](https://img.shields.io/badge/Kubernetes-Blue--Green%20Deployment-326CE5?logo=kubernetes)](./k8s/)
[![DevSecOps: Gitleaks | Bandit | Trivy](https://img.shields.io/badge/DevSecOps-Gitleaks%20%7C%20Bandit%20%7C%20Trivy-teal?logo=shield)](./security/)
[![Backend: FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.12-009688?logo=fastapi)](./backend/)
[![Frontend: React + Vite + TS](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Vite-61DAFB?logo=react)](./frontend/)
[![Database: PostgreSQL 16](https://img.shields.io/badge/Database-PostgreSQL%2016-336791?logo=postgresql)](./docker-compose.yml)
[![Monitoring: Prometheus + Grafana](https://img.shields.io/badge/Monitoring-Prometheus%20%2B%20Grafana-E6522C?logo=prometheus)](./monitoring/)

> **A production-style academic engineering project demonstrating all three PBL-III objectives:**
> 1. **CI/CD Pipeline** to deploy a Dockerized application on Kubernetes using Jenkins.
> 2. **Automated Blue-Green Deployment** with zero-downtime traffic cutover.
> 3. **Secure DevOps (DevSecOps)** implementation for a healthcare management system.

---

## Table of Contents
1. [Project Overview & Problem Statement](#1-project-overview--problem-statement)
2. [PBL-III Objectives & Realization](#2-pbl-iii-objectives--realization)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Application Modules & Demo Accounts](#5-application-modules--demo-accounts)
6. [Database Schema & Data Model](#6-database-schema--data-model)
7. [API Endpoints Documentation](#7-api-endpoints-documentation)
8. [Quick Start: Docker Compose](#8-quick-start-docker-compose)
9. [Kubernetes Implementation](#9-kubernetes-implementation)
10. [Automated Blue-Green Deployment](#10-automated-blue-green-deployment)
11. [Jenkins CI/CD 15-Stage Pipeline](#11-jenkins-cicd-15-stage-pipeline)
12. [DevSecOps Security Implementation](#12-devsecops-security-implementation)
13. [Prometheus & Grafana Telemetry](#13-prometheus--grafana-telemetry)
14. [Testing Suite & Verification](#14-testing-suite--verification)
15. [Practical AWS EC2 Setup Guide](#15-practical-aws-ec2-setup-guide)
16. [Troubleshooting & FAQ](#16-troubleshooting--faq)
17. [Viva Voce Questions & Answers](#17-viva-voce-questions--answers)

---

## 1. Project Overview & Problem Statement

### Problem Statement
Healthcare operations platforms require 24/7/365 uninterrupted uptime, strict patient privacy compliance (HIPAA / GDPR), and zero-downtime software delivery. Traditional in-place deployments cause service interruptions, dropped appointment requests, and potential clinical data corruption during upgrades. Furthermore, code vulnerabilities and hardcoded secrets pose existential security risks to sensitive Electronic Protected Health Information (ePHI).

### The Solution: MEDORA
MEDORA is an enterprise healthcare operations platform that connects **Patients**, **Doctors**, and **Hospital Administrators** through an intuitive, secure portal. Under the hood, it features an automated 15-stage Jenkins CI/CD pipeline, instant Blue-Green traffic routing via Kubernetes Service selectors, and multi-layered DevSecOps scanning (Gitleaks, Bandit, Trivy, SonarQube, non-root containers, and Network Policies).

> **Note**: MEDORA uses synthetic clinical demonstration data only. No real patient data is used.

---

## 2. PBL-III Objectives & Realization

| PBL-III Objective | Technical Implementation in MEDORA | Verified Artifacts |
| :--- | :--- | :--- |
| **Objective 1: CI/CD Pipeline on Kubernetes using Jenkins** | 15-stage declarative Jenkins pipeline: Checkout, Dependency installation, Linting, Backend/Frontend testing, Docker container builds, Registry push, K8s deployment, and probe verification. | [`Jenkinsfile`](./Jenkinsfile), [`k8s/`](./k8s/) |
| **Objective 2: Automated Blue-Green Deployment** | Zero-downtime deployment mechanism where candidate version deploys to inactive environment (`GREEN`), verifies via synthetic `/health` and `/ready` probes, and switches traffic atomically by patching Kubernetes Service selector. | [`jenkins/scripts/switch-blue-green.sh`](./jenkins/scripts/switch-blue-green.sh), [`docs/blue-green.md`](./docs/blue-green.md) |
| **Objective 3: Secure DevOps (DevSecOps) for Healthcare** | Pre-commit secret scanning (`Gitleaks`), Python AST security (`Bandit`), container & FS CVE auditing (`Trivy`), code quality gate (`SonarQube`), non-root container execution (`UID 10001`), Kubernetes `NetworkPolicies`, RBAC least privilege, and HIPAA audit trails. | [`.gitleaks.toml`](./.gitleaks.toml), [`security/`](./security/), [`docs/security.md`](./docs/security.md) |

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with custom healthcare palette (Dark Navy `#0B1220`, Teal `#14B8A6`, Sky Blue `#38BDF8`, Slate `#111827`)
- **Iconography**: Lucide React
- **Data Visualization**: Recharts (Responsive SVG Area and Bar charts)
- **State & Routing**: Single Page Application (SPA) architecture with role-driven view routing

### Backend
- **Framework**: Python FastAPI (ASGI Asynchronous Execution)
- **Data Validation**: Pydantic v2 with strict type models
- **Database Engine**: PostgreSQL 16 (production) with automatic fallback to SQLite for test isolation
- **ORM**: SQLAlchemy 2.0
- **Authentication**: JWT (JSON Web Tokens) with HMAC-SHA256 and Bcrypt password hashing
- **System Telemetry**: `psutil` real OS process metrics + `prometheus-client`

### DevOps & Infrastructure
- **Containerization**: Multi-stage Docker builds with non-root unprivileged execution (`UID 10001`)
- **Orchestration**: Kubernetes (v1.28+) with Blue-Green Service selector routing
- **CI/CD Automation**: Declarative Jenkinsfile (15 stages) with automated rollbacks
- **Monitoring**: Prometheus (pull-based metric scraping) and Grafana (pre-configured telemetry dashboard)
- **Security Tools**: Gitleaks v8, Bandit 1.7, Trivy 0.50, SonarQube Scanner 5.0

---

## 4. System Architecture

```mermaid
graph TD
    User([Patients, Doctors, Administrators]) -->|Port 80/443| Ingress[Kubernetes Ingress-NGINX]

    subgraph K8S_CLUSTER [Kubernetes Namespace: medora]
        Ingress --> FrontendSvc[medora-frontend-svc\nSelector: environment=blue/green]
        Ingress --> BackendSvc[medora-backend-svc\nSelector: environment=blue/green]

        subgraph BLUE_ENVIRONMENT [Active Environment: BLUE (v1.0.0)]
            FrontendBlue[medora-frontend-blue\n2 Replicas | Nginx Unprivileged]
            BackendBlue[medora-backend-blue\n2 Replicas | FastAPI Non-Root]
        end

        subgraph GREEN_ENVIRONMENT [Standby / Candidate: GREEN (v1.1.0)]
            FrontendGreen[medora-frontend-green\n2 Replicas | Pre-warmed]
            BackendGreen[medora-backend-green\n2 Replicas | Pre-warmed]
        end

        FrontendSvc -.->|Selector: blue| FrontendBlue
        BackendSvc -.->|Selector: blue| BackendBlue

        BackendBlue -->|Port 5432| PostgresSvc[medora-postgres-svc]
        BackendGreen -->|Port 5432| PostgresSvc

        PostgresSvc --> PostgresDB[(PostgreSQL 16\nPersistentVolumeClaim)]
    end

    subgraph OBSERVABILITY [Telemetry & Monitoring]
        Prometheus[Prometheus Server\nScrapes /metrics] --> BackendBlue
        Prometheus --> BackendGreen
        Grafana[Grafana Dashboard] --> Prometheus
    end
```

---

## 5. Application Modules & Demo Accounts

MEDORA provides 4 distinct role-based modules:
1. **Patient Dashboard**: Appointment booking, history, cancellations, active prescriptions, and lab diagnostics.
2. **Doctor Workstation**: Today's appointment queue, clinical diagnoses, consultation notes, and digital prescription issuance.
3. **Admin Operations**: Hospital-wide analytics, department utilization, user account governance, and HIPAA audit trails.
4. **DevOps Control Centre (`/devops`)**: Real-time deployment status (BLUE vs GREEN indicator), live traffic cutover switch, Kubernetes Pod health, CPU/memory telemetry, and 15-stage CI/CD visualizer.

### Instant Demo Accounts (Viva Evaluation)

For fast testing during college project evaluations, the login page features **1-click quick-login buttons**:

| Role | Email | Password | Scope & Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@medora.health` | `Admin@12345` | Full hospital administration, user management, audit trails, and platform telemetry |
| **Doctor** | `doctor.sarah@medora.health` | `Doctor@12345` | Dr. Sarah Jenkins (Cardiology) - manage patient queue, record diagnoses, issue prescriptions |
| **Patient** | `patient.john@medora.health` | `Patient@12345` | Johnathan Doe - schedule appointments, view prescriptions, inspect lab reports |

---

## 6. Database Schema & Data Model

PostgreSQL relational database schema with foreign keys, cascading rules, and indexes:

- `users`: User identity, hashed passwords, roles (`patient`, `doctor`, `admin`), phone, active status.
- `patients`: Linked to `users.id` (1:1), blood group, allergies, emergency contact, medical history.
- `doctors`: Linked to `users.id` (1:1), department, specialization, license number, consultation fee, availability.
- `appointments`: Foreign keys to `patient_id` and `doctor_id`, appointment date, time slot, reason, and status (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
- `consultations`: Linked 1:1 to `appointments.id`, diagnosis, symptoms, clinical notes, follow-up date.
- `prescriptions`: Linked to `consultations.id`, drug name, dosage, frequency, duration in days, instructions.
- `lab_reports`: Diagnostic tests (CBC, Lipid Panel, MRI), results summary, category, status (`PENDING`, `COMPLETED`, `CRITICAL`).
- `audit_logs`: Regulatory audit trail recording user, action, target resource, IP address, user-agent, status, and UTC timestamp.

---

## 7. API Endpoints Documentation

FastAPI auto-generates interactive Swagger documentation at `http://localhost:8000/docs`.

### Authentication
- `POST /api/auth/register` — Register a new patient profile.
- `POST /api/auth/login` — Authenticate and receive a signed JWT token.
- `GET /api/auth/me` — Retrieve currently authenticated user profile.
- `GET /api/auth/demo-accounts` — List pre-seeded synthetic test accounts.

### Appointments & Consultations
- `GET /api/appointments` — List appointments (scoped by patient/doctor role).
- `POST /api/appointments` — Book a new appointment.
- `PUT /api/appointments/{id}` — Update appointment status or reschedule.
- `DELETE /api/appointments/{id}` — Cancel an appointment (audited).
- `GET /api/consultations` — List clinical consultations.
- `POST /api/consultations` — Record diagnosis, notes, and issue prescriptions (transitions appointment to `COMPLETED`).

### Prescriptions & Lab Reports
- `GET /api/prescriptions` — List active medications.
- `POST /api/prescriptions` — Issue a new prescription.
- `GET /api/lab-reports` — View clinical diagnostic lab reports.

### Admin & Regulatory Governance
- `GET /api/admin/analytics` — Aggregated KPI metrics, monthly volume trends, and status distribution.
- `GET /api/admin/audit-logs` — HIPAA regulatory access and modification audit trail.
- `GET /api/admin/users` — List registered user accounts.
- `PUT /api/admin/users/{id}/status` — Activate or suspend a user account.

### Health Probes & DevOps
- `GET /health` — Kubernetes Liveness Probe (`200 OK`, active environment, version).
- `GET /ready` — Kubernetes Readiness Probe (`200 OK` when PostgreSQL is connected).
- `GET /metrics` — Prometheus metrics scrape endpoint.
- `GET /api/devops/status` — Live process CPU, memory RSS, container status, active pods.
- `GET /api/devops/security-scans` — Live findings from Gitleaks, Bandit, Trivy, SonarQube.
- `POST /api/devops/switch-env` — Trigger Blue-Green traffic cutover between environments.

---

## 8. Quick Start: Docker Compose

Launch the full stack locally with one command:

```bash
docker compose up --build -d
```

### Accessing the Services
- **Web Application**: `http://localhost:3000`
- **Backend API (BLUE)**: `http://localhost:8000`
- **Backend API (GREEN)**: `http://localhost:8001`
- **Prometheus Telemetry**: `http://localhost:9090`
- **Grafana Dashboard**: `http://localhost:3001` (Credentials: `admin` / `admin`)

---

## 9. Kubernetes Implementation

The `k8s/` directory contains complete production manifests:

```bash
# 1. Create namespace with Pod Security Standards (Restricted)
kubectl apply -f k8s/namespace.yaml

# 2. Deploy ConfigMaps and Secrets
kubectl apply -f k8s/config/
kubectl apply -f k8s/security/secrets-template.yaml

# 3. Apply RBAC and Network Policies
kubectl apply -f k8s/security/rbac.yaml
kubectl apply -f k8s/security/network-policies.yaml

# 4. Deploy PostgreSQL Database
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/services/postgres-service.yaml

# 5. Deploy Blue (Active) Environment & Services
kubectl apply -f k8s/blue/
kubectl apply -f k8s/services/backend-service.yaml
kubectl apply -f k8s/services/frontend-service.yaml
kubectl apply -f k8s/ingress.yaml
```

---

## 10. Automated Blue-Green Deployment

### Traffic Cutover Mechanism
The Kubernetes Service selector acts as a zero-downtime router:

```yaml
# k8s/services/backend-service.yaml
spec:
  selector:
    app: medora
    component: backend
    environment: blue  # <-- Patched to 'green' during deployment
```

### Executing the Automated Switch
```bash
./jenkins/scripts/switch-blue-green.sh
```

### Instant Rollback
If any health check fails or an anomaly is detected, rollback occurs instantly by repatching the selector:
```bash
./jenkins/scripts/rollback.sh
```

---

## 11. Jenkins CI/CD 15-Stage Pipeline

The declarative pipeline in [`Jenkinsfile`](./Jenkinsfile) automates the delivery lifecycle:

```
[1. Checkout] ─> [2. Install Deps] ─> [3. Lint Frontend] ─> [4. Backend Tests] ─> [5. Frontend Tests]
      │
[6. SonarQube] ─> [7. Gitleaks Scan] ─> [8. Bandit Scan] ─> [9. Trivy FS Scan] ─> [10. Docker Build]
      │
[11. Image Scan] ─> [12. Push Registry] ─> [13. K8s Deploy] ─> [14. Health Probes] ─> [15. Blue-Green Cutover]
```

---

## 12. DevSecOps Security Implementation

1. **Gitleaks**: Evaluates `.gitleaks.toml` to block any committed API keys, tokens, or credentials.
2. **Bandit**: Analyzes Python AST for security anti-patterns (no raw string formatting in SQL, no hardcoded secrets, no insecure temp files).
3. **Trivy**: Scans filesystems and container images for known Common Vulnerabilities and Exposures (CVEs).
4. **SonarQube**: Enforces code quality, maintainability, and test coverage (>80%).
5. **Non-Root Containers**: `UID 10001` unprivileged user execution (`runAsNonRoot: true`).
6. **Network Policies**: Zero-trust namespace microsegmentation.

---

## 13. Prometheus & Grafana Telemetry

The application exposes real-time Prometheus metrics on `/metrics`:
- `medora_http_requests_total`: Counter tracking total requests by method, endpoint, status code, and environment.
- `medora_http_request_duration_seconds`: Histogram tracking P95 latency.
- `medora_active_environment`: Gauge indicating current active environment (1=Blue, 2=Green).

The pre-configured Grafana dashboard ([`medora-dashboard.json`](./monitoring/grafana/dashboards/medora-dashboard.json)) automatically loads panels for active deployment color, request volume, error rates, and response latency.

---

## 14. Testing Suite & Verification

The project includes an automated test suite executed with `pytest`:

```bash
# Run backend test suite
./backend/venv/bin/pytest backend/tests -v
```

### Test Coverage Results (14 / 14 Passed)
- `test_liveness_probe` (PASSED)
- `test_readiness_probe` (PASSED)
- `test_prometheus_metrics` (PASSED)
- `test_login_admin_success` (PASSED)
- `test_login_doctor_success` (PASSED)
- `test_login_patient_success` (PASSED)
- `test_login_invalid_password` (PASSED)
- `test_register_new_patient` (PASSED)
- `test_patient_cannot_access_admin_analytics` (PASSED)
- `test_admin_can_access_analytics_and_audit_logs` (PASSED)
- `test_patient_appointment_workflow` (PASSED)
- `test_devops_status_and_metrics` (PASSED)
- `test_devops_security_scan_data` (PASSED)
- `test_devops_blue_green_switch` (PASSED)

---

## 15. Practical AWS EC2 Setup Guide

Detailed instructions for deploying MEDORA on AWS EC2:

1. **Launch Instance**: `t3.medium`, Ubuntu 24.04 LTS, 30 GB gp3 storage.
2. **Security Group Inbound Rules**:
   - `22` (SSH) — Your IP
   - `80` (HTTP) — `0.0.0.0/0`
   - `3000` (Frontend) — `0.0.0.0/0`
   - `8000` (Backend) — Internal / Test IP
   - `3001` (Grafana) — `0.0.0.0/0`
3. **Install Docker & Clone**:
   ```bash
   sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git
   sudo usermod -aG docker ubuntu
   newgrp docker
   git clone https://github.com/medora-health/medora.git && cd medora
   docker compose up --build -d
   ```
4. Access `http://<EC2-PUBLIC-IP>:3000` in your browser.

---

## 16. Troubleshooting & FAQ

- **Database Connection Refused**: Ensure PostgreSQL container is healthy before backend boots (`depends_on: { condition: service_healthy }`).
- **Blue-Green Switch doesn't change color**: Verify browser cache or check that `/api/devops/switch-env` returns `200 OK`.
- **Port Conflict on 5432 / 8000**: If local services use these ports, adjust mappings in `docker-compose.yml`.

---

## 17. Viva Voce Questions & Answers

See [`docs/viva.md`](./docs/viva.md) for 35+ comprehensive questions and answers covering:
- CI/CD & Jenkins Declarative Pipelines
- Kubernetes Service Selector Cutover & Rollbacks
- DevSecOps Defense-in-Depth (Gitleaks, Bandit, Trivy, SonarQube)
- Non-Root Container Execution & Pod Security Standards
- HIPAA Audit Compliance & Relational Data Modeling

---

## License & Academic Disclaimer
Developed as a PBL-III Engineering Capstone Demonstration Project. All healthcare records and patient identities are synthetic.
