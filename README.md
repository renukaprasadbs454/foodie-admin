# Foodie Admin Panel Frontend

A standalone repository containing the **Foodie Admin Panel Frontend** web application.

## Repository Structure

```text
foodie-admin/
├── apps/
│   └── admin/        # Next.js 15 App Router Admin Dashboard
├── packages/
│   └── shared-web/   # Shared Web Utilities, UI Components & Types
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Quick Start

### Frontend Application
- **Technology**: Next.js 15, React 19, Redux Toolkit, pnpm workspace
- **Backend API**: Connects via BFF to backend API (`http://localhost:8082` default)

- **Install Dependencies**:
  ```bash
  pnpm install
  ```

- **Run Development Server**:
  ```bash
  pnpm dev
  ```

- **Run Typecheck**:
  ```bash
  pnpm typecheck
  ```

- **Run Unit Tests**:
  ```bash
  pnpm test
  ```

- **Build for Production**:
  ```bash
  pnpm build
  ```
