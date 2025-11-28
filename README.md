# Team Registry Backend (Next.js API)

## Quick start
1. copy `.env.example` → `.env` and fill values
2. npm install
3. npm run dev (starts Next.js on port 3001)
4. (optional) npm run seed to populate sample data

## API base
Default API base: http://localhost:3001/api

## Important constraints
- The teams collection documents must have ONLY the fields:
  teamName, leaderName, numberOfParticipants, participants[], registrationDate, transactionId, paymentStatus
  (MongoDB `_id` is allowed)
- The server validates and refuses payloads with extra fields.

## Audit trail
- Admin audit events are kept in-memory only (ephemeral). They do not survive server restarts due to the schema constraint.
