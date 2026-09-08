# AEGIS — Authenticated Evidence & Government Investigation System

AEGIS is a secure digital document and investigation management platform designed for law-enforcement agencies, forensic departments, courts, legal departments, and authorized auditors.

---

## Phase 1 Deliverables

Phase 1 provides the core foundational architecture for AEGIS:
* Clean monorepo structure with separated backend and frontend
* Official, restrained government-grade light UI (Ministry of Home Affairs / NCRB style)
* Next.js 14 (App Router) + TypeScript + Tailwind CSS frontend
* Node.js + Express + TypeScript backend
* Supabase PostgreSQL database integration with Row Level Security (RLS)
* Centralized Role and Permission definitions (`officer`, `forensic`, `court_clerk`, `admin`, `auditor`)
* Authentication architecture via Supabase Auth
* Protected frontend routes and JWT validation middleware (`requireAuth`, `requireRole`, `requirePermission`)
* Security controls: Helmet, CORS, rate limiting, and Zod payload validation
* Structured JSON logging and centralized error handling
* Live API health and diagnostics endpoint (`/api/v1/health`)
* Real-time operational system status component (`SystemStatus`)
* Clean reusable UI components (Button, Input, Badge, Card, Skeleton, EmptyState, Logo, AppShell, Header, Sidebar)
* Responsive design across Desktop, Tablet, and Mobile devices

---

## Directory Structure

```
AEGIS/
├── backend/                 # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/          # Environment variables & Supabase admin client
│   │   ├── middleware/      # Auth, rate limiting, error handling, validation
│   │   ├── modules/
│   │   │   ├── auth/        # /api/v1/auth routes
│   │   │   └── profile/     # /api/v1/profile routes
│   │   ├── routes/          # Healthcheck & router assembly
│   │   ├── types/           # User roles, permissions, interfaces
│   │   ├── utils/           # Structured JSON logger
│   │   ├── app.ts           # Express application setup
│   │   └── server.ts        # Server listener
│   ├── tests/               # Automated Vitest integration tests
│   ├── tsconfig.json
│   ├── .env.example
│   └── package.json
│
├── frontend/                # Next.js 14 App Router + Tailwind CSS
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/   # Operational dashboard with live system health
│   │   │   ├── login/       # Restrained official login page
│   │   │   ├── settings/    # Profile & active session security settings
│   │   │   ├── cases/       # Phase 2 placeholder
│   │   │   ├── documents/   # Phase 2 placeholder
│   │   │   ├── evidence/    # Phase 2 placeholder
│   │   │   ├── audit/       # Phase 2 placeholder
│   │   │   ├── verification/# Phase 3 placeholder
│   │   │   ├── users/       # Phase 2 placeholder
│   │   │   ├── globals.css  # Government light theme styles
│   │   │   └── layout.tsx   # Root layout & AuthProvider
│   │   ├── components/
│   │   │   ├── auth/        # LoginForm, ProtectedRoute
│   │   │   ├── dashboard/   # SystemStatus
│   │   │   ├── layout/      # AppShell, Sidebar, Header
│   │   │   └── ui/          # Button, Input, Badge, Card, Skeleton, EmptyState, Logo
│   │   ├── lib/
│   │   │   ├── api/         # Centralized typed API client
│   │   │   ├── auth/        # AuthContext provider
│   │   │   └── supabase/    # Supabase browser client
│   │   ├── types/           # Shared frontend interfaces & roles
│   │   └── utils/           # Class merger utility
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── .env.example
│   └── package.json
│
├── database/
│   ├── schema.sql           # PostgreSQL profiles schema, RLS policies, trigger
│   └── seeds.sql            # Test user metadata setup guidance
│
├── docs/
│   ├── architecture.md      # System architecture & component boundaries
│   ├── authentication.md    # Auth flows, session lifecycles & RBAC
│   └── security.md          # Security controls, CORS, rate limits, RLS
│
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites
* Node.js v18+ (tested with Node v22)
* npm or yarn
* Supabase project (URL and API keys)

---

### 1. Database Setup (Supabase)
1. Open your Supabase project SQL Editor.
2. Run the SQL statements found in `database/schema.sql`.
   * This creates the `user_role` enum, `profiles` table, strict RLS policies, and the `on_auth_user_created` trigger.

---

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Configure the environment variables:
   ```env
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run tests:
   ```bash
   npm test
   ```
6. Start development server:
   ```bash
   npm run dev
   ```
   API will be available at `http://localhost:5000`. Health check endpoint: `http://localhost:5000/api/v1/health`.

---

### 3. Frontend Setup
1. Open a new terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Configure environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run development server:
   ```bash
   npm run dev
   ```
   Access the application at `http://localhost:3000`.

---

## Authentication & Verification Flow

1. Accessing `http://localhost:3000` redirects unauthenticated sessions to `http://localhost:3000/login`.
2. Sign in with authorized departmental credentials.
3. Upon authentication, you will be redirected to `/dashboard`.
4. The dashboard queries the live backend `/api/v1/health` endpoint to display actual operational metrics (API status, DB connectivity, Auth provider).
5. Access `/settings` to view profile information, assigned role, department, and active session tokens.
6. Signing out revokes the Supabase session, resets client state, and prevents unauthorized access to protected routes.

---

## Future Phase Architecture

* **Phase 1**: Foundation, Auth, Security Middleware, RLS, Operational Light UI *(Completed)*
* **Phase 2**: Case Dossiers & Sensitive Document Management
* **Phase 3**: SHA-256 Integrity Engine & Hash-Chain Evidence History
* **Phase 4**: Blockchain Anchoring & Merkle Trees
* **Phase 5**: Immutable Audit Trails & PKI / Digital Signatures
* **Phase 6**: OCR & Departmental AI Document Classification
* **Phase 7**: Semantic Search & Inter-Agency Discovery
* **Phase 8**: Production Hardening & Final Field Deployment
