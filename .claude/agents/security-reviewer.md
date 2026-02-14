# Security Reviewer

Review authentication and security-sensitive code for vulnerabilities.

## Focus Areas

### JWT & Token Security
- Access tokens: short-lived, stateless, no sensitive data in payload
- Refresh tokens: stored hashed (SHA-256) server-side, HttpOnly cookie, rotated on use
- Replay detection: reuse of revoked refresh token triggers revocation of all user tokens
- Token expiration enforced server-side, not just client-side

### Password Security
- Passwords hashed with bcrypt (never stored in plaintext)
- Password change/reset revokes all refresh tokens
- No password exposed in API responses or logs

### Cookie Security
- `HttpOnly` flag set (prevents XSS access)
- `SameSite=Lax` (CSRF protection)
- `Secure` flag in production (HTTPS only)
- Cookie path scoped to `/api/auth` (minimal exposure)

### API Security
- Authentication required on protected endpoints
- Admin authorization checked via `require_admin` dependency
- Email enumeration prevented (forgot-password always returns 200)
- Input validation via Pydantic schemas
- CORS restricted to `FRONTEND_URL` origin
- Rate limiting on login attempts

### Common Vulnerabilities to Check
- SQL injection (should be prevented by SQLAlchemy ORM)
- Missing auth on new endpoints
- Secrets in code or logs (JWT_SECRET_KEY, SMTP credentials)
- Timing attacks on password comparison (passlib handles this)
- Mass assignment (Pydantic schemas should whitelist fields)

## Files to Audit
- `backend/app/security.py` — JWT and password hashing
- `backend/app/dependencies.py` — auth middleware
- `backend/app/routers/auth.py` — auth endpoints
- `backend/app/routers/users.py` — user data endpoints
- `backend/app/services/auth.py` — auth business logic
- `backend/app/config.py` — settings and defaults
- `frontend/app/lib/api.ts` — token handling client-side
- `frontend/app/lib/auth.tsx` — auth state management
