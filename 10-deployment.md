# CubeStudio V2 — Deployment Specification

## 1. Architecture
```text
User
 ↓
Frontend
 ↓
API
 ↓
Flask Backend
 ↓
Kociemba / Services
```

Frontend and backend may be deployed separately. Initial deployment can use Vite + Flask + Render or equivalent.

## 2. Frontend
Before deployment:
- production build
- correct API base URL
- development behavior disabled
- optimized assets
- verified SPA routing
- environment configuration
- responsive verification

Example:
```text
VITE_API_BASE_URL=https://example-api.example.com
```

## 3. Backend
Use a production WSGI server, debug off, environment variables, deliberate CORS, health endpoint, structured errors, useful logs, and no stack-trace leakage.

## 4. CI/CD
```text
Git push
 ↓
lint
 ↓
unit tests
 ↓
frontend build
 ↓
integration tests
 ↓
deploy
 ↓
smoke test
```

## 5. Secrets
Never commit API keys, auth secrets, database credentials, deployment tokens, or private signing keys.

## 6. Monitoring
Track frontend build failures, API errors, solver failures, latency, availability, crashes, and scanner failures after scanner deployment.

Avoid collecting unnecessary personal data.

## 7. Rollback
Every production deployment must map to a known Git commit and have a known-good rollback path.

## 8. Smoke tests
After deployment verify:
- frontend loads
- simulator opens
- cube moves work
- API health works
- solver request works
- errors display safely
- SPA routes load directly

## 9. PWA
Future PWA support may include service worker, installability, offline simulator/timer/lessons, and cached assets. Offline behavior must be explicitly defined.

## 10. Production checklist

### Frontend
- [ ] production build
- [ ] API URL
- [ ] routes
- [ ] responsive layout
- [ ] no development secrets

### Backend
- [ ] production WSGI
- [ ] debug disabled
- [ ] CORS configured
- [ ] environment configured
- [ ] health endpoint
- [ ] structured errors
- [ ] no secret leakage

### Testing
- [ ] unit tests
- [ ] integration tests
- [ ] critical E2E
- [ ] smoke tests

### Deployment
- [ ] Git commit identified
- [ ] deployment succeeds
- [ ] logs reviewed
- [ ] rollback path known
