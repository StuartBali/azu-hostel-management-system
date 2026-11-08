# Africa Zeal University Hostel Management System

A university hostel management starter app with a React + Vite frontend and a separate Node.js + Express backend.

## Requirements

- Node.js 18 or newer
- npm
- XAMPP with MySQL (MariaDB) enabled

## Start the backend

Open the XAMPP Control Panel and start **MySQL**. In a PowerShell terminal:

```powershell
cd backend
npm.cmd install
npm.cmd run dev
```

The API starts at `http://localhost:5000`. By default, the backend connects to XAMPP MySQL at `127.0.0.1:3306` as `root` with an empty password. It creates the `azu_hostel_management` database and its tables automatically.

If your MySQL user or password differs, set these environment variables in the same PowerShell window before starting the backend:

```powershell
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "3306"
$env:DB_USER = "root"
$env:DB_PASSWORD = "your-local-mysql-password"
$env:DB_NAME = "azu_hostel_management"
npm.cmd run dev
```

The first database startup imports the existing `backend/data/store.json` records into MySQL if the database is empty. The JSON file is kept as a migration source and is not used for ongoing reads or writes after import. A migration record prevents importing it again.

## Start the frontend

In another terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open the Vite URL (usually `http://localhost:5173`). To point the frontend to a different API, set `VITE_API_URL` before starting/building the frontend.

## Local sign-in

The local demo account is:

- Email: `admin@azu.ac.ug`
- Password: `Admin123!`

This demo password is for the local sample database only. Do not use it for a public deployment. The backend requires a valid bearer token for data and settings APIs, signs sessions with `JWT_SECRET`, expires sessions after 8 hours, and checks that the account is still active on every request. API permissions are enforced server-side by staff role: Finance Officers can access payments, hostel staff and wardens can access their accommodation/maintenance modules, and only administrators can manage users or system settings.

Create staff accounts from **User management**. New accounts require a password of at least 8 characters; passwords are stored as bcrypt hashes in MySQL and never returned by the API. When editing an account, leave the new-password field blank to keep its existing password.

## Free hosting with Render

This repository includes a Render Blueprint in `render.yaml` for a free static frontend and free Node API. The Node service may sleep when idle on a free plan, so its first request can take a little time to respond.

MySQL must also be hosted online: XAMPP on your computer is not reachable by Render. Choose a MySQL provider that allows connections from Render, create a database there, then:

1. Back up your local XAMPP database before moving any real records.
2. Push this project to a **private GitHub repository**. `.gitignore` excludes local environment files, dependencies, build output, and `backend/data/store.json`.
3. In Render, create a Blueprint deployment from that repository and enter your hosted MySQL host, username, password, database name, whether its connection requires SSL, and a new administrator password when prompted. Use a strong administrator password of at least 12 characters.
4. Once Render creates the frontend URL, change the API service's `FRONTEND_ORIGIN` from its temporary localhost setting to that exact URL, without a trailing slash, and redeploy/restart the API.
5. To migrate real data, export it from local MySQL and import it into the hosted database **before** switching users over. The hosting configuration disables automatic sample-data import. Preserve user password hashes only if you intend to keep those credentials; otherwise exclude the old `users` table from the import and create new staff accounts after deployment.
6. Open the Render frontend URL and sign in with `ADMIN_EMAIL` and the `ADMIN_PASSWORD` you configured.

Never put database credentials, `JWT_SECRET`, or production passwords in source files or commit them to GitHub. Enter them only in Render's environment-variable settings. Free database availability and quotas vary by provider; confirm its current limits and backup policy before storing real university records.

## Modules

Dashboard, students, hostels, rooms, allocations, payments, maintenance, reports, user management, and system settings.

The backend exposes CRUD endpoints under `/api/{students|hostels|rooms|allocations|payments|maintenance|users}`, settings at `/api/settings`, demo login at `/api/auth/login`, and a health check at `/api/health`. The backend uses MySQL for ongoing persistence. Replace the demo authentication before production deployment.
