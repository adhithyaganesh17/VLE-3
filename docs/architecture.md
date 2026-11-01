# MEDORA — System Architecture & Design Specification

## 1. Executive Summary

**MEDORA** (Smart Healthcare Operations Platform) is an enterprise-grade cloud-native clinical operations system designed to fulfill all three **PBL-III Objectives**:
1. **CI/CD Pipeline** deploying a Dockerized application on Kubernetes using Jenkins.
2. **Automated Blue-Green Deployment** with zero-downtime traffic cutover.
3. **Secure DevOps (DevSecOps)** implementation with shift-left vulnerability scanning, container hardening, and Kubernetes zero-trust policies.

---

## 2. Architectural Blueprint

The MEDORA architecture follows a decoupled multi-tier micro-service pattern designed for high availability, compliance, and rapid rollback.

```mermaid
graph TD
    User([Patients, Doctors, Administrators]) -->|HTTPS / Port 80, 443| Ingress[Kubernetes Ingress-NGINX]

    subgraph K8S_CLUSTER [Kubernetes Namespace: medora]
        Ingress -->|Static UI / SPA Routing| FrontendSvc[medora-frontend-svc\nSelector: environment=blue/green]
        Ingress -->|REST API Calls /api/*| BackendSvc[medora-backend-svc\nSelector: environment=blue/green]

        subgraph BLUE_ENVIRONMENT [Active Environment: BLUE (v1.0.0)]
            FrontendBlue[medora-frontend-blue\n2 Replicas | Nginx Unprivileged]
            BackendBlue[medora-backend-blue\n2 Replicas | FastAPI Non-Root]
        end

        subgraph GREEN_ENVIRONMENT [Standby / Candidate: GREEN (v1.1.0)]
            FrontendGreen[medora-frontend-green\n2 Replicas | Pre-warmed]
            BackendGreen[medora-backend-green\n2 Replicas | Pre-warmed]
        end

        FrontendSvc -.->|Selector| FrontendBlue
        BackendSvc -.->|Selector| BackendBlue

        BackendBlue -->|SQL Pool / Port 5432| PostgresSvc[medora-postgres-svc]
        BackendGreen -->|SQL Pool / Port 5432| PostgresSvc

        PostgresSvc --> PostgresDB[(PostgreSQL 16\nPersistentVolumeClaim)]
    end

    subgraph OBSERVABILITY [Telemetry & Monitoring]
        Prometheus[Prometheus Server\nScrapes /metrics every 10s] -->|Scrape| BackendBlue
        Prometheus -->|Scrape| BackendGreen
        Grafana[Grafana Dashboard\nTelemetry Visualization] -->|PromQL| Prometheus
    end

    subgraph CICD_DEVSECOPS [Jenkins Declarative Pipeline]
        Jenkins[Jenkins Master] --> Gitleaks[Gitleaks Secret Scan]
        Jenkins --> Bandit[Bandit Python AST Scan]
        Jenkins --> Trivy[Trivy Image Scan]
        Jenkins --> Sonar[SonarQube Quality Gate]
        Jenkins -->|Switch Selector| BackendSvc
    end
```

---

## 3. Technology Stack Rationale

| Tier | Technology | Technical Justification |
| :--- | :--- | :--- |
| **Frontend UI** | React 18 + Vite + TypeScript | Blazing fast build time, strict typing, responsive single-page architecture. |
| **Design System** | Tailwind CSS + Lucide Icons | Clean healthcare SaaS design palette (Dark Navy `#0B1220`, Teal `#14B8A6`, Sky Blue `#38BDF8`). |
| **Data Viz** | Recharts | Declarative SVG charting for clinical analytics and operational volume. |
| **Backend API** | Python FastAPI (ASGI) | High-performance asynchronous execution, automatic OpenAPI schema generation, Pydantic validation. |
| **ORM / Data** | SQLAlchemy 2.0 + PostgreSQL 16 | Relational consistency, foreign key constraints, and transactional integrity. |
| **Orchestration**| Kubernetes (v1.28+) | Pod scheduling, rolling updates, self-healing, Service selector routing, and NetworkPolicies. |
| **CI/CD** | Jenkins Declarative Pipeline | Enterprise standard 15-stage automated delivery pipeline. |
| **DevSecOps** | Gitleaks, Bandit, Trivy, SonarQube | Multi-layered defense: secrets, code security, dependency CVEs, container vulnerabilities. |
| **Metrics** | Prometheus + Grafana | Pull-based telemetry tracking request counts, latencies, error spikes, and active deployment color. |

---

## 4. Data Flow & Security Boundaries

1. **Client Interaction**: Web clients authenticate via `/api/auth/login` to obtain an HMAC-SHA256 signed JSON Web Token (JWT).
2. **Access Governance**:
   - Every request is validated by FastAPI middleware and role-checker dependencies (`require_role`).
   - Patients can strictly view and modify their own records.
   - Doctors can access assigned patients, record diagnoses, and issue digital prescriptions.
   - Administrators monitor hospital analytics, manage users, and inspect regulatory audit logs.
3. **Audit Trail**: Every authentication attempt and medical modification generates an immutable record in `audit_logs` tracking user, IP address, user-agent, action, and timestamp according to HIPAA §164.312(b).
