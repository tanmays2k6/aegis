# AEGIS Authentication & Session Lifecycle

## 1. Authentication Strategy
AEGIS leverages **Supabase Auth** backed by JSON Web Tokens (JWT) signed using asymmetric or HMAC cryptographic keys.

### Principles:
1. **Public vs Server Secret Isolation**:
   - The frontend ONLY receives `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - The backend holds `SUPABASE_SERVICE_ROLE_KEY`. This key NEVER leaks to client bundles.
2. **Double-Layered Protection**:
   - Frontend route guarding via `ProtectedRoute` redirects unauthenticated users to `/login`.
   - Backend API guarding via `requireAuth` validates cryptographic signatures and session validity on every restricted route.

---

## 2. Authentication Flow

```
User (Officer)
     │
     ▼
Navigates to /login
     │
     ▼
Submits Official Email + Password
     │
     ▼
Supabase Auth (signInWithPassword)
     │
     ├─► Failure: Returns restrained "Authentication failed" message
     │
     ▼ Success
Returns Session (Access Token JWT + Refresh Token)
     │
     ▼
Frontend AuthProvider stores session
     │
     ▼
API Request to backend with Header: "Authorization: Bearer <token>"
     │
     ▼
Backend requireAuth verifies token via Supabase Admin API
     │
     ▼
Backend fetches and attaches Profile (role, department, jurisdiction)
     │
     ▼
Client redirected to /dashboard
```

---

## 3. Role-Based Access Control (RBAC) Foundation

AEGIS defines 5 primary operational roles:

| Role | Name | Intended Authority |
|---|---|---|
| `officer` | Investigating Officer | Create & view dossiers, upload documents |
| `forensic` | Forensic Examiner | View dossiers, upload lab findings, verify evidence integrity |
| `court_clerk` | Court Liaison / Clerk | Read-only inspection of court-admitted evidence |
| `admin` | System Administrator | Manage users, departmental configurations, review audits |
| `auditor` | Authorized Auditor | Independent access to audit logs and chain-of-custody proofs |

### Extensibility:
Backend middleware supports both role checks (`requireRole([UserRole.ADMIN, UserRole.OFFICER])`) and granular permission checks (`requirePermission(Permission.VIEW_AUDIT)`).
