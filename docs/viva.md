# MEDORA — Comprehensive Viva Examination & Defense Guide

This guide contains **35+ high-yield viva questions, detailed technical answers, and architectural explanations** designed for engineering college project evaluations and external viva defense.

---

## 1. Project Overview & PBL-III Objectives

### Q1: What is MEDORA, and what are the three core PBL-III objectives it fulfills?
**Answer:**
MEDORA (Smart Healthcare Operations Platform) is a cloud-native healthcare management platform designed for hospital patient-doctor coordination, clinical appointments, prescriptions, and health record tracking.
It fulfills the three required PBL-III objectives:
1. **CI/CD Pipeline with Jenkins & Kubernetes**: A 15-stage declarative Jenkins pipeline that automatically lints, tests, builds Docker containers, and deploys to Kubernetes.
2. **Automated Blue-Green Deployment**: A zero-downtime deployment mechanism where a candidate version is deployed to an idle environment (`GREEN`), verified via synthetic probes, and transitioned atomically using Kubernetes Service label selectors.
3. **Secure DevOps (DevSecOps)**: Shift-left security embedding Gitleaks (secrets scanning), Bandit (AST code security), Trivy (filesystem & container CVEs), SonarQube (quality gates), Kubernetes non-root security contexts, Network Policies, and HIPAA-compliant audit logging.

---

## 2. CI/CD & Jenkins Pipeline Questions

### Q2: Why did you use a Declarative Jenkinsfile instead of a Scripted pipeline?
**Answer:**
A Declarative Jenkinsfile provides:
- **Strict, readable syntax**: Clear stage hierarchy with `stages`, `steps`, `environment`, and `post` blocks.
- **Built-in error handling**: Automated `post { failure { ... } }` and `post { success { ... } }` blocks.
- **Robust linting and validation**: Can be syntactically validated before execution.
- **Maintainability**: Clear separation of build steps and environment definitions, reducing brittle Groovy script logic.

### Q3: Walk me through the 15 stages of your Jenkins CI/CD pipeline.
**Answer:**
1. **Checkout SCM**: Clones the commit from source control.
2. **Install Dependencies**: Prepares Python virtual environment (`requirements.txt`) and Node modules (`npm ci`).
3. **Lint Frontend**: Runs ESLint / TypeScript compiler checks to ensure clean code structure.
4. **Backend Tests**: Executes `pytest` across 14 API, auth, RBAC, and probe tests, generating JUnit XML reports.
5. **Frontend Tests**: Validates component rendering and state transitions.
6. **SonarQube Analysis**: Runs static code quality and security gate checks.
7. **Gitleaks Secret Scan**: Evaluates git history against 160 secret rules to detect committed keys or tokens.
8. **Bandit Security Scan**: Parses Python Abstract Syntax Tree (AST) for SQLi, insecure tempfiles, and dangerous eval calls.
9. **Trivy Filesystem Scan**: Audits project dependencies and OS libraries for known CVEs.
10. **Docker Build**: Executes multi-stage builds for frontend and backend tagged with `${BUILD_NUMBER}`.
11. **Docker Image Scan**: Runs Trivy on built container images to catch OS-level container CVEs before pushing.
12. **Push Image to Registry**: Pushes tagged images to the Docker container registry using Jenkins Credential Manager.
13. **Kubernetes Deployment**: Applies deployment manifests to the inactive candidate environment (`BLUE` or `GREEN`).
14. **Health Verification**: Executes synthetic HTTP probes against `/health` and `/ready` endpoints of candidate pods.
15. **Blue-Green Cutover & Report**: Atomically patches the Kubernetes Service selector (`app=medora, environment=candidate`) to route 100% of production traffic, logging the deployment record.

### Q4: How are secrets and credentials handled in your pipeline?
**Answer:**
We strictly follow **Principle of Zero Hardcoded Secrets**:
- Credentials (Docker registry passwords, SonarQube tokens, Kubernetes kubeconfig) are stored in Jenkins Credentials Manager and injected dynamically into stages using `withCredentials([usernamePassword(...)])`.
- Application secrets in Kubernetes are managed using `Secret` resources and mounted as environment variables (`envFrom: secretRef`).
- Gitleaks is integrated in CI Stage 7 to fail the build if any developer accidentally commits an API key or password.

---

## 3. Blue-Green Deployment & Kubernetes Questions

### Q5: How does Blue-Green deployment achieve zero downtime in Kubernetes?
**Answer:**
In traditional rolling updates, pods are killed and replaced incrementally, which can cause connection resets or intermediate state bugs.
In Blue-Green:
1. The live version runs in **BLUE** (e.g., 2 replicas of backend and frontend).
2. The new release is deployed in **GREEN** on separate pods.
3. The Kubernetes Service (`medora-backend-svc`) has a selector `environment: blue`.
4. While traffic remains on BLUE, automated health checks test GREEN.
5. Once GREEN is 100% healthy, the Service selector is updated to `environment: green`.
6. Kubernetes Endpoints controller instantly redirects incoming TCP traffic to the GREEN pods. Existing in-flight requests complete on BLUE. Cutover time is less than 50 milliseconds.

### Q6: What happens if the candidate deployment in GREEN fails health checks?
**Answer:**
The pipeline detects the failure during Stage 14 (Health Verification). Because the Service selector still points to BLUE:
- Production user traffic is **never touched** and continues uninterrupted on BLUE.
- The pipeline aborts the cutover and marks the build as failed.
- The Jenkins `post { failure { ... } }` block triggers `rollback.sh` to clean up the bad deployment and notify engineers.

### Q7: What is the difference between a Liveness Probe and a Readiness Probe?
**Answer:**
- **Liveness Probe (`/health`)**: Tells Kubernetes if the container process is alive. If the probe fails 3 consecutive times, kubelet restarts the container.
- **Readiness Probe (`/ready`)**: Tells Kubernetes if the container is ready to accept incoming traffic (e.g., database connection established, cache warmed up). If this probe fails, the pod is removed from the Service Endpoints list so no user traffic hits it, but the container is **not** restarted.

### Q8: How is the database handled during a Blue-Green deployment?
**Answer:**
In MEDORA:
- The PostgreSQL database runs as a shared central service (`medora-postgres-svc`) decoupled from the ephemeral application pods.
- Database schema changes follow the **Expand and Contract pattern**:
  1. *Expand*: Additive migrations (new nullable columns, new tables) are applied so both BLUE and GREEN can read and write simultaneously.
  2. *Cutover*: Switch traffic to GREEN.
  3. *Contract*: Deprecate old columns in a subsequent maintenance release after rollback is no longer required.

---

## 4. DevSecOps & Security Hardening Questions

### Q9: What tools do you use for DevSecOps, and what layer does each secure?
**Answer:**
We implement defense-in-depth across 5 layers:
1. **Source Code Secrets**: `Gitleaks` detects committed private keys, JWT secrets, and API credentials.
2. **Code Logic**: `Bandit` scans Python AST for syntax-level security vulnerabilities.
3. **Code Quality**: `SonarQube` assesses maintainability, duplicate code, test coverage, and security hotspots.
4. **Containers & OS**: `Trivy` scans OS packages in base images and external dependencies for CVEs.
5. **Runtime Cluster**: Kubernetes `NetworkPolicies` (microsegmentation), `RBAC` (least privilege), and `securityContext` (`runAsNonRoot: true`, unprivileged UID 10001).

### Q10: Why is running containers as a non-root user critical in healthcare applications?
**Answer:**
If an attacker exploits a remote code execution vulnerability (e.g., file upload or template injection) in a container running as `root` (`UID 0`):
- They share root privileges with the underlying Linux host kernel.
- They can mount host disks, alter iptables, sniff network traffic, and escape the container to access protected patient health information (PHI) across the cluster.
By setting `runAsNonRoot: true` and `runAsUser: 10001`, the process cannot modify system libraries, access raw sockets, or break out into the host system.

### Q11: Explain your Kubernetes NetworkPolicy architecture.
**Answer:**
MEDORA applies a **Default Deny** zero-trust policy (`medora-default-deny`):
1. **Frontend**: Accepts incoming HTTP traffic on port 80; can only send egress traffic to backend pods on port 8000.
2. **Backend**: Accepts incoming traffic strictly from Frontend and Prometheus on port 8000; can only send egress traffic to PostgreSQL on port 5432 and CoreDNS on port 53.
3. **PostgreSQL**: Accepts incoming traffic strictly from Backend pods on port 5432. External internet or frontend pods cannot connect to the database directly.

### Q12: How does MEDORA comply with HIPAA audit requirements?
**Answer:**
Under HIPAA Security Rule §164.312(b), covered entities must implement hardware, software, and procedural mechanisms that record and examine activity in information systems containing Electronic Protected Health Information (ePHI).
MEDORA implements:
- An immutable `audit_logs` table tracking the actor ID, actor email, action (LOGIN, BOOK_APPOINTMENT, CREATE_CONSULTATION, CANCEL_APPOINTMENT, BLUE_GREEN_SWITCH), target resource, IP address, user-agent, status, and UTC timestamp.
- A dedicated Administrator Audit Viewer to inspect all system access events.

---

## 5. Architecture, Backend & Frontend Questions

### Q13: Why did you choose FastAPI over Flask or Django?
**Answer:**
1. **Asynchronous Concurrency**: Built on Starlette and ASGI, FastAPI handles thousands of concurrent requests with low latency, ideal for real-time telemetry and health monitoring.
2. **Type Safety & Automatic Validation**: Leverages Python type hints and Pydantic for automated request parsing and error responses.
3. **Interactive Documentation**: Automatically generates interactive OpenAPI (Swagger) and ReDoc interfaces (`/docs`, `/redoc`).
4. **Native Prometheus Integration**: Clean ASGI middleware support for request timing and metrics collection.

### Q14: How does the Frontend achieve a modern SaaS aesthetic?
**Answer:**
1. **Tailwind CSS Design Tokens**: Tailored palette with Dark Navy (`#0B1220`), Teal (`#14B8A6`), Sky Blue (`#38BDF8`), and Slate surfaces (`#111827`, `#1E293B`).
2. **Lucide Icons**: Clean, consistent vector iconography throughout all navigation and data tables.
3. **Recharts**: Responsive SVG charts visualizing monthly appointment trends and status distributions.
4. **Visual Indicators**: Live pulsing glowing badges indicating whether BLUE or GREEN is currently routing production traffic.

---

## 6. Monitoring & Telemetry Questions

### Q15: How are Prometheus metrics gathered from the backend?
**Answer:**
1. In `main.py`, Prometheus client defines:
   - `medora_http_requests_total`: Counter tracking request count by method, endpoint, status code, and environment.
   - `medora_http_request_duration_seconds`: Histogram observing latency in seconds.
   - `medora_active_environment`: Gauge reporting `1` for BLUE and `2` for GREEN.
2. An HTTP middleware measures execution time and increments the counters on every non-metrics request.
3. The Prometheus server scrapes `/metrics` every 10 seconds and aggregates metrics for Grafana dashboard visualization.

### Q16: How do you show that your operational metrics are genuine?
**Answer:**
In `backend/app/services/devops_service.py`:
- We use Python's native `psutil` library to read actual CPU utilization (`psutil.cpu_percent()`), process memory RSS (`proc.memory_info().rss`), host RAM, and OS metadata directly from the operating system runtime.
- We expose exact endpoint latencies and HTTP status codes recorded dynamically by the ASGI middleware.

---

## 7. Practical Demonstration Script for Evaluators

When asked to present the project:
1. **Start with the Problem & Objectives**: State that MEDORA demonstrates CI/CD with Jenkins, Blue-Green Deployment on Kubernetes, and DevSecOps for a healthcare platform.
2. **Show the Live Application**:
   - Log in as **Patient** (`patient.john@medora.health` / `Patient@12345` or 1-click demo button). Book an appointment and view active prescriptions.
   - Switch to **Doctor** (`doctor.sarah@medora.health` / `Doctor@12345`). Review the queue, start a consultation, input diagnosis, and dispense medication.
   - Switch to **Admin** (`admin@medora.health` / `Admin@12345`). Display hospital KPIs, Recharts volume graphs, user governance, and HIPAA audit trails.
3. **Demonstrate Blue-Green Cutover**:
   - Navigate to the **DevOps Control Centre** (`/devops`).
   - Point out that **BLUE ACTIVE** is currently serving traffic on version `1.0.0`.
   - Click **"Switch Traffic to GREEN (Candidate)"**.
   - Show how the traffic instantly cuts over to **GREEN ACTIVE** (version `1.1.0`) with zero dropped requests.
4. **Show DevSecOps Verification**:
   - Open **DevSecOps & Audit** view (`/security`).
   - Show 0 hardcoded secrets (Gitleaks), 0 high-risk AST flaws (Bandit), 0 critical container CVEs (Trivy), Grade A (SonarQube), and non-root execution (`UID 10001`).
5. **Show Code Quality**:
   - Highlight the 14 passing automated backend tests (`pytest backend/tests -v`).
   - Point out the clean Declarative `Jenkinsfile` and Kubernetes manifests in `k8s/`.
