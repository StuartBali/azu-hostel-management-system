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

## Keep the app available and test on a phone

On Windows, run `scripts\start-local.ps1` in PowerShell to start XAMPP MySQL if needed, then the backend and Vite frontend. To start the app automatically whenever your Windows account signs in, create a shortcut to this script in the current user's Startup folder. The computer must be on and awake; `localhost` is not reachable while it is shut down or asleep.

The script prints the phone test link using the computer's current private-network address. Open that link on a phone connected to the same Wi-Fi. The address can change when reconnecting to Wi-Fi. Permit Node.js on private networks in Windows Firewall if prompted. Do not expose the development server to the public internet.

## Local sign-in

The local demo account is:

- Email: `admin@azu.ac.ug`
- Password: `Admin123!`

This demo password is for the local sample database only. Do not use it for a public deployment. The backend requires a valid bearer token for data and settings APIs, signs sessions with `JWT_SECRET`, expires sessions after 8 hours, and checks that the account is still active on every request. API permissions are enforced server-side by staff role: Finance Officers can access payments, hostel staff and wardens can access their accommodation/maintenance modules, and only administrators can manage users, system settings, or view the audit log.

Create staff accounts from **User management**. New accounts require a password of at least 8 characters; passwords are stored as bcrypt hashes in MySQL and never returned by the API. When editing an account, leave the new-password field blank to keep its existing password.

## Free demo hosting with Render and TiDB Cloud

This repository includes a Render Blueprint in `render.yaml` for a free static frontend and free Node API, with TiDB Cloud Starter as the MySQL-compatible database. Render's free Node service may sleep when idle, so its first request can take a little time to respond. TiDB Cloud Starter has a monthly free quota; when an instance reaches its quota, it can reject new connections until the quota resets. Use this setup only for a demo with sample data, not real student, staff, or payment records.

Create a **MySQL-compatible TiDB Cloud Starter** instance, then:

1. Create a TiDB Cloud Starter instance in **MySQL-compatible** mode and set its password. Use the TiDB console's **Connect** page to get the host and username; Starter usernames include an instance prefix. The database connection uses TLS.
2. In TiDB's SQL Editor, create the application database, for example: `CREATE DATABASE azu_hostel_management;`. The app creates its tables at startup but does not create the database on the hosted server.
3. In the TiDB instance's networking settings, allow the outbound IP ranges shown for the Render API service (service page → **Connect** → **Outbound**). Avoid leaving public access open to all IPs.
4. Push this project to a **private GitHub repository**. `.gitignore` excludes local environment files, dependencies, build output, and `backend/data/store.json`.
5. In Render, create a Blueprint deployment from that repository and enter the TiDB host, port (`4000`), username, password, database name, and a new administrator password when prompted. The Blueprint enables TLS and disables automatic sample-data import. Use a strong administrator password of at least 12 characters.
6. Once Render creates the frontend URL, change the API service's `FRONTEND_ORIGIN` from its temporary localhost setting to that exact URL, without a trailing slash, and redeploy/restart the API.
7. Open the Render frontend URL and sign in with `ADMIN_EMAIL` and the `ADMIN_PASSWORD` you configured.

TiDB Cloud Starter's current free monthly quota for each of the first five MySQL-compatible instances is 5 GiB row storage, 5 GiB columnar storage, and 50 million Request Units. When the quota is reached, new connections can be denied until the quota resets. Check [TiDB Cloud pricing](https://www.pingcap.com/pricing/) and its backup policy before use; this free demo configuration is not a production hosting recommendation.

Never put database credentials, `JWT_SECRET`, or administrator passwords in source files or commit them to GitHub. Enter them only in Render's environment-variable settings. Do not import real university records into this free demo deployment.

## Modules

Dashboard, students, hostels, rooms, allocations, payments, maintenance, reports, user management, system settings, and the administrator-only audit log. The audit log records successful and failed sign-ins, sign-outs, and successful record or settings changes. It stores actor, action, resource, record ID, changed field names, timestamp, and request metadata, but never stores passwords or changed field values.

The backend exposes CRUD endpoints under `/api/{students|hostels|rooms|allocations|payments|maintenance|users}`, settings at `/api/settings`, the administrator-only audit API at `/api/audit-logs`, demo login at `/api/auth/login`, and a health check at `/api/health`. Audit entries are stored in MySQL and retained when a user account is deleted. The backend uses MySQL for ongoing persistence. Replace the demo authentication before production deployment.
