# AEGIS Security Policies & Implementation

## 1. Security Overview
AEGIS complies with strict governmental security requirements appropriate for Ministry of Home Affairs / NCRB operational contexts.

---

## 2. Implemented Security Controls

### A. Network & Transport
- **Helmet**: Enforces HTTP Strict Transport Security (HSTS), Frameguard (anti-clickjacking), X-Content-Type-Options (`nosniff`), and Content Security Policy directives.
- **CORS**: Explicitly restricted to configured origin (`FRONTEND_URL`), preventing unauthorized cross-origin execution from third-party websites.

### B. Rate Limiting & Denial-of-Service Defense
- Express-rate-limit active across all `/api/` endpoints.
- Rate limits IP requests to a configurable threshold (default: 100 requests per 15 minutes), responding with standard HTTP 429 and sanitized error messages.

### C. Database Security (Row Level Security)
- PostgreSQL Row Level Security (RLS) is strictly enabled on the `profiles` table.
- Policies:
  - Users can read only their own record: `USING (auth.uid() = id)`.
  - Users can update only their own profile details: `WITH CHECK (auth.uid() = id)`.
  - Administrators can read all profile records for auditing: `USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))`.
  - Zero blanket `USING (true)` policies for authenticated users.

### D. Input Validation & Error Sanitization
- All update payloads verified using **Zod** schemas before execution.
- Centralized error handler logs full diagnostic stack traces to internal stdout/structured log while returning sanitized, safe error messages to clients.
- Secret tokens, internal database connection strings, and service role keys are excluded from all client-facing responses and build artifacts.
