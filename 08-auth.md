# CubeStudio V2 — Authentication and Cloud Specification

## 1. Scope
Authentication and cloud sync are later-stage features and must not block simulator, solver, editor, timer, or basic training.

## 2. Goals
- account creation
- login
- profile
- saved solves
- saved scrambles
- saved cube states
- saved algorithms
- training progress
- cross-device sync

## 3. Architecture
```text
Frontend
   ↓
Auth / Application API
   ↓
Identity Provider / Database
   ↓
User Data
```

## 4. Account
Possible fields:
`userId`, `displayName`, `email`, `createdAt`, `preferences`.

Collect only necessary information.

## 5. Synced data
Potentially sync solve history, statistics, states, scrambles, favorite algorithms, training progress, and preferences.

## 6. Guest mode
Guests should still have simulator, solver, editor, timer, basic training, and local persistence where appropriate.

## 7. Security
Never store plaintext passwords. Use secure authentication, secure sessions/tokens, server-side authorization, protected data, expiration/revocation, and HTTPS in production.

## 8. Authorization
Never trust a client-provided user ID as proof of ownership.

## 9. Sync conflicts
Define a clear conflict strategy before implementation, such as timestamps, append-only history, explicit conflicts, or versioning.

## 10. Privacy
Provide clear privacy information, minimal collection, deletion, export, guest mode, and clear synchronization disclosures.

## 11. Implementation rule
Do not introduce authentication infrastructure merely to support the initial prototype. Add it after the core platform is stable.
