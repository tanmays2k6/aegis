# AEGIS System Architecture

## Overview
AEGIS (**Authenticated Evidence & Government Investigation System**) is an enterprise-grade, secure investigation and digital evidence management platform designed for law-enforcement, forensic teams, courts, and oversight bodies.

Phase 1 provides the core infrastructure: authentication, database layer with Row Level Security (RLS), security middleware, operational light UI, and health monitoring.

---

## 1. High-Level Architecture Diagram

```
                 +----------------------------------------+
                 |          Client Web Browser            |
                 |     (Officer / Examiner / Auditor)     |
                 +-------------------+--------------------+
                                     |
                                     | HTTPS
                                     v
                 +----------------------------------------+
                 |            AEGIS Frontend              |
                 |        (Next.js 14 App Router)         |
                 | - Official Government Theme (Tailwind) |
                 | - AuthProvider & Protected Routes      |
                 | - Real-time SystemStatus Component     |
                 +----------+-------------------+---------+
                            |                   |
               Supabase JWT |                   | REST /api/v1
                     Tokens |                   | (Bearer Token)
                            v                   v
     +--------------------------------+  +--------------------------------+
     |         Supabase Auth          |  |         AEGIS Backend          |
     |    - Identity & Sessions       |  |     (Express + TypeScript)     |
     |    - JWT Verification          |  | - Security Middleware (Helmet)|
     +----------------+---------------+  | - Strict Origin CORS           |
                      |                  | - Rate Limiter (express-rate)  |
                      |                  | - requireAuth & Role Guards    |
                      |                  | - Zod Payload Validation       |
                      |                  | - Centralized Error Handler    |
                      |                  +---------------+----------------+
                      |                                  |
                      | Direct / Service Role            | Service Role
                      +------------------+---------------+
                                         |
                                         v
                         +--------------------------------+
                         |      Supabase PostgreSQL       |
                         | - profiles table               |
                         | - Strict Row Level Security    |
                         | - Trigger: on_auth_user_created|
                         +--------------------------------+
```

---

## 2. Component Boundaries

### Public Layer
- `GET /login`: Official portal gateway for credentials entry.
- `GET /api/v1/health`: Lightweight diagnostics verifying API runtime and PostgreSQL latency without requiring an auth token.

### Authenticated Officer Layer
- `GET /dashboard`: Operational overview, active session review, and live component health.
- `GET /settings`: Officer profile review, service badge identifier, and session expiration telemetry.
- `GET /api/v1/auth/me`: Verifies active session token validity and returns identity claims.
- `GET /api/v1/profile`: Returns verified officer profile record.
- `PATCH /api/v1/profile`: Updates departmental and contact details with Zod schema verification.

### Phase 2+ Demarcation (Clearly Marked Modules)
- `/cases`: Case management dossiers, FIR tracking, and inter-agency delegation.
- `/documents`: Chain-of-custody document repository with cryptographic tamper detection.
- `/evidence`: Barcoded physical and digital evidence handling and laboratory custody logs.
- `/audit`: Immutable append-only audit trail and non-repudiation export.
- `/verification`: SHA-256 cryptographic verification and blockchain anchoring (Phase 3+).
- `/users`: Administrative user provisioning and badge credentials management.
