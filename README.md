# Foodie Admin Platform

A standalone repository containing the **Foodie Admin Panel Frontend** and its supporting **Foodie Admin Backend API**.

## Repository Structure

```text
foodie-admin/
├── backend/    # Spring Boot Java 21 REST API & Admin Backend
└── frontend/   # Next.js 15 App Router & Admin Web Dashboard
```

## Quick Start

### 1. Backend Service (`backend/`)
- **Technology**: Java 21, Spring Boot 3.3.5, PostgreSQL, Flyway, JWT Auth
- **Run Locally**:
  ```bash
  cd backend
  ./mvnw spring-boot:run -Dspring-boot.run.profiles=local
  ```
- **API Base URL**: `http://localhost:8082`
- **Default Seeded Admin Accounts**:
  - `admin@foodie.local` / `ChangeMe@123` (SUPER_ADMIN)
  - `Financeadmin@foodie.local` / `FoodieMinister@111` (FINANCE_ADMIN)
  - `Darkstoreadmin@foodie.local` / `FoodieDarkstore@111` (DARKSTORE_ADMIN)
  - `Opsadmin@foodie.local` / `FoodieOperator@111` (OPS_ADMIN)
  - `Supportadmin@foodie.local` / `FoodieHelpdesk@111` (SUPPORT_ADMIN)
  - `Restaurantadmin@foodie.local` / `FoodiePartner@111` (RESTAURANT_ADMIN)
  - `Auditoradmin@foodie.local` / `FoodieAuditor@111` (AUDITOR_ADMIN)

### 2. Frontend Application (`frontend/`)
- **Technology**: Next.js 15, React 19, Redux Toolkit, pnpm workspace
- **Install & Build**:
  ```bash
  cd frontend
  pnpm install
  pnpm build
  ```
- **Development**:
  ```bash
  pnpm dev
  ```
- **Run Unit Tests**:
  ```bash
  pnpm test
  ```
