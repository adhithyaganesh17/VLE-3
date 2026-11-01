# MEDORA — Comprehensive Deployment & Operations Guide

This guide details the deployment procedures for MEDORA across local development environments, Kubernetes clusters, and cloud infrastructure (AWS EC2).

---

## 1. Quick Start: Docker Compose (Local Demonstration)

The entire MEDORA platform—including frontend, both Blue and Green backend containers, PostgreSQL, Prometheus, and Grafana—can be launched with a single command.

### Prerequisites
- Docker Engine 24.0+ and Docker Compose v2.20+
- At least 4GB of free RAM

### Launch Commands
```bash
# Clone the repository
git clone https://github.com/medora-health/medora.git
cd medora

# Start all microservices in detached mode
docker compose up --build -d
```

### Verified Endpoints

| Service | URL | Default Credentials | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Portal** | `http://localhost:3000` | Demo role buttons on login | Patient, Doctor & Admin SaaS Portal |
| **Backend API (BLUE)** | `http://localhost:8000` | Token via `/api/auth/login` | Active production backend |
| **Backend API (GREEN)** | `http://localhost:8001` | Token via `/api/auth/login` | Standby candidate backend |
| **Swagger API Docs** | `http://localhost:8000/docs`| None (Public) | Interactive OpenAPI specifications |
| **Prometheus Telemetry**| `http://localhost:9090` | None | Real-time metric scraping |
| **Grafana Dashboards** | `http://localhost:3001` | `admin` / `admin` | Operations & Blue-Green Dashboard |

### Teardown
```bash
docker compose down -v
```

---

## 2. Kubernetes Deployment (Minikube / k3s / EKS)

Deploy MEDORA into a production-grade Kubernetes cluster with Blue-Green routing and zero-trust policies.

### Step 1: Create Namespace and Base Configurations
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/config/
kubectl apply -f k8s/security/secrets-template.yaml
kubectl apply -f k8s/security/rbac.yaml
kubectl apply -f k8s/security/network-policies.yaml
```

### Step 2: Deploy Shared PostgreSQL Database
```bash
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/services/postgres-service.yaml

# Verify database pod is Running and Ready
kubectl wait --namespace medora \
  --for=condition=ready pod \
  --selector=component=database \
  --timeout=90s
```

### Step 3: Deploy Blue Environment (Initial Active Production)
```bash
kubectl apply -f k8s/blue/
kubectl apply -f k8s/services/backend-service.yaml
kubectl apply -f k8s/services/frontend-service.yaml
kubectl apply -f k8s/ingress.yaml
```

### Step 4: Verify Deployment & Probes
```bash
kubectl get pods,services,ingress -n medora
```

---

## 3. Practical AWS EC2 Production Deployment Guide

A step-by-step walkthrough for deploying MEDORA on an AWS EC2 instance for college demonstrations or production evaluation.

### Step 1: Provision EC2 Instance
- **Instance Type**: `t3.medium` (2 vCPUs, 4 GiB RAM) or `t3.large`
- **OS**: Ubuntu Server 24.04 LTS (HVM), SSD Volume
- **Storage**: 30 GiB General Purpose SSD (gp3)
- **Security Group Inbound Rules**:
  - `SSH (22)`: Your IP address
  - `HTTP (80)`: Anywhere (`0.0.0.0/0`)
  - `HTTPS (443)`: Anywhere (`0.0.0.0/0`)
  - `Frontend (3000)`: Anywhere
  - `Backend (8000)`: Restricted / VPC
  - `Jenkins (8080)`: Your IP address
  - `Grafana (3001)`: Anywhere / Your IP
  - `Prometheus (9090)`: Internal VPC

### Step 2: Connect & Install Docker Engine
```bash
ssh -i "medora-keypair.pem" ubuntu@<EC2-PUBLIC-IP>

# Update packages and install Docker
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg git

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow ubuntu user to execute docker without sudo
sudo usermod -aG docker ubuntu
newgrp docker
```

### Step 3: Install Lightweight Kubernetes (k3s)
```bash
# Install lightweight certified Kubernetes distribution
curl -sfL https://get.k3s.io | sh -

# Configure kubectl permissions for ubuntu user
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
export KUBECONFIG=~/.kube/config

# Verify node status
kubectl get nodes
```

### Step 4: Clone & Launch MEDORA
```bash
git clone https://github.com/medora-health/medora.git
cd medora

# Deploy via Docker Compose:
docker compose up --build -d

# Check all container states:
docker compose ps
```

Visit `http://<EC2-PUBLIC-IP>:3000` in your web browser. You will see the MEDORA Healthcare platform live!
