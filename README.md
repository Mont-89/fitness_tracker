# Elders Well-being Monitor System (Node.js)

This system starts on a **login/sign-in screen** and supports **role-based access** with an **admin-only account provisioning flow**.

## API Integration: Input Your Details

Yes — you can now input your own admin + integration details directly from the Admin UI form (**Integration Settings**), or via API.

### New Admin Integration Settings API

- `GET /api/admin/integration-settings` (admin token required)
- `POST /api/admin/integration-settings` (admin token required)

Payload fields you can save:

- `adminName`
- `adminEmail`
- `adminPhone`
- `emailApiUrl`
- `emailApiKey`
- `paymentGatewayUrl`
- `paymentGatewayApiKey`

This lets you wire your real providers without editing code.

## Email Sending (Admin + Clients)

- When users are provisioned, notifications are sent to both:
  - the created user/client (with magic login link), and
  - the admin (confirmation copy).
- If `emailApiUrl` is set in integration settings, remote provider mode is used.
- If not set, in-memory outbox mode is used for local development.

## Payment Integration (Working)

- `POST /api/me/pay-bill` charges through configured gateway first.
- If `paymentGatewayUrl` is set, remote gateway mode is used.
- If not set, sandbox gateway mode is used.
- Bill stores: `transactionRef`, `paymentProvider`, `paidAt`.

## Core Rules Implemented

- The app lands on login first (`/`).
- Only one administrator exists (owner account).
- No public sign-up route for users.
- Admin creates users (resident/staff/family).
- Created users receive an email notification with secure magic login link.
- Residents can view room/details, pay bills, choose activities, and communicate via call/SMS/email.

## Admin Credentials

Defaults (override with env vars):

- `ADMIN_EMAIL=owner@newlands.com`
- `ADMIN_PASSWORD=admin123`
- `ADMIN_NAME=System Owner`

## API

- `POST /api/auth/admin-login`
- `GET /api/admin/integration-settings`
- `POST /api/admin/integration-settings`
- `POST /api/admin/users` (admin token required)
- `POST /api/auth/magic-login`
- `GET /api/me` (bearer token)
- `POST /api/me/pay-bill` (resident)
- `POST /api/me/activities` (resident)
- `POST /api/me/contact-family`
- `GET /api/admin/overview` (admin)

## Launch

```bash
npm start
```

Open `http://localhost:3000`.

## Test

```bash
npm test
```
