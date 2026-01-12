# Secure Patient Management System

## Project Overview

This repository contains the complete solution for the Role-Based Login System (Phase 1) and the HIPAA-Compliant Patient Data Manager (Phase 2). It is a full-stack application orchestrated via Docker, featuring a secure FastAPI backend and a Next.js 14 frontend.

---

## Architecture and Technology Justification

We chose a specific stack to balance performance, security, and developer experience. Here is the breakdown:

### 1. Infrastructure: Docker and Docker Compose

- **Usage:** Orchestrates `backend` (FastAPI), `frontend` (Next.js), and `db` (Postgres) into a single network.
- **Reasoning:**
  - **Isolation:** Ensures that missing dependencies in local editors do not affect execution. The container builds its own environment.
  - **Consistency:** "It works on my machine" guarantees. The database version and Python dependencies are locked.

### 2. Backend: FastAPI (Python)

- **Usage:** Handles all API business logic, authentication, and encryption.
- **Reasoning:**
  - **Type Safety (Pydantic):** We use strict schemas (`schemas.py`) to validate data before it hits the logic layer.
  - **Performance:** FastAPI is asynchronous by default, making it ideal for I/O operations like database queries and file uploads.
  - **Auto-Documentation:** Generates interactive Swagger UI at `/docs` for easy testing.

### 3. Database: PostgreSQL and SQLAlchemy

- **Usage:** Persistent storage for Users, Roles, and Patient Data.
- **Reasoning:**
  - **Relational Integrity:** Essential for RBAC (Role-Based Access Control). Users strictly belong to Roles, Locations, and Teams via Foreign Keys.
  - **Production Standard:** Unlike SQLite, Postgres handles concurrent writes (multiple managers uploading files) reliably.

### 4. Frontend: Next.js 14 (App Router)

- **Usage:** A reactive UI for Login and Dashboards.
- **Reasoning:**
  - **Routing:** The file-system based routing (`/dashboard/manager/page.tsx`) makes it scalable and easy to read.
  - **Modularity:** React components allow us to separate the "Upload" logic from the "Table Display" logic cleanly.

### 5. Security: Encryption and JWT

- **JWT (JSON Web Tokens):** Used for stateless authentication. The server does not need to store session IDs; it just verifies the signature.
- **Fernet (Symmetric Encryption):** Used for Patient Data.
  - **Why:** The requirement was strict encryption. We encrypt First Name, Last Name, DOB, and Gender before they ever touch the database. Even a database admin cannot read the data without the key.

### 6. Privacy Pattern: Aggregate-on-Server

- **Problem:** Calculating reports (e.g., "Age Distribution") typically requires reading everyone's Date of Birth (DOB). If we sent raw data to the frontend, a Finance user could inspect the network traffic and see private patient data (HIPAA Violation).
- **Solution:** We created a specialized endpoint (`/patients/stats`) that:
  1. Receives the request with the `report.view` permission.
  2. Decrypts the DOB and Gender in secure server memory.
  3. Calculates the counts (e.g., "Males: 50", "Females: 40").
  4. Discards the raw data immediately.
  5. Returns only the anonymous counts to the frontend.
- **Benefit:** Zero PII (Personally Identifiable Information) leaves the secure server environment for reporting purposes.

### 7. Key Rotation Strategy

- We include a `rotate_keys.py` utility in the backend.
- **Function:** It generates a new encryption key, decrypts every record in the database using the old key, re-encrypts it with the new key, and updates the configuration.
- **Usage:** Can be run manually or as a scheduled job to comply with security policies requiring periodic key rotation.

---

## Database Schema

The system uses a normalized relational schema to enforce strict RBAC and Data Ownership.

### Entity Relationship Diagram (ERD)

```
User ||--o{ AuditLog : generates
User ||--o{ Patient : manages
User }|--|| Role : has
User }|--|| Team : belongs_to
User }|--|| Location : based_in
Role }|--|{ Permission : contains
```

### Table Definitions

- **Users**: The central identity table. Links to Role, Location, and Team via Foreign Keys.
- **Roles and Permissions**: A classic RBAC implementation. Roles are hierarchical groups (e.g., Manager) that possess specific Permissions (e.g., `patient.upload`).
- **Patients**: Stores the encrypted PHI. The `manager_id` creates a strict ownership model - only the uploading Manager can decrypt/view their own patients.
- **AuditLogs**: An append-only ledger of every security-critical action (Login, Decryption, Upload).

---

## Environment Configuration

The application requires a `.env` file in the `submission/` directory with the following variables:

```
# Database Configuration
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=pamm_db

# Security Keys
SECRET_KEY=your-secret-key-for-jwt-signing
ENCRYPTION_KEY=your-fernet-encryption-key

# OTP Configuration (for password reset)
BACKUP_OTP_CODE=123456
```

### Generating Keys

To generate a new Fernet encryption key:
```python
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
```

To generate a secure SECRET_KEY:
```python
import secrets
print(secrets.token_hex(32))
```

---

## How to Run

### Prerequisites

- Docker Desktop installed and running.
- (Optional) Python 3.11+ for local script execution.

### Steps

1. Clone/Open the `submission` folder in your terminal.

2. Create a `.env` file with the required environment variables (see Environment Configuration section).

3. Build and Start:
   ```bash
   docker-compose up --build
   ```
   Wait for the logs to say `Database Initialized` and `Application startup complete`.

4. Access the App:
   - Frontend: http://localhost:3000
   - Backend API Docs: http://localhost:8000/docs

### One-Command Setup

The system is designed for single-command deployment. Running `docker-compose up --build` will:
1. Start PostgreSQL database
2. Wait for database to be ready
3. Initialize database schema and seed data
4. Start the FastAPI backend
5. Start the Next.js frontend

---

## Generating Test Data

We have provided a script to generate various test scenarios (Valid data, Invalid format, Large benchmark dataset).

```bash
cd backend/tests
python verify_data.py
```

This will create:
- `patients_valid.xlsx` - Valid sample data for happy path testing
- `patients_invalid_columns.xlsx` - Invalid format to test error handling
- `patients_10k_benchmark.xlsx` - Large dataset for performance testing


---

## Key Implementation Details

### Phase 1: RBAC (Role-Based Access Control)

- **File:** `backend/app/auth.py`
- **Mechanism:** When a user logs in, they receive an `access_token`.
- **Protection:** Every API endpoint depends on `get_current_user`, which validates this token.
- **Frontend Redirect:** After login, the frontend checks `user.role.name` and routes them to the appropriate dashboard.

### Phase 2: The Search vs Encryption Strategy

- **The Problem:** We encrypted names in the DB (e.g., "John" becomes `gAAAAAB...`). Standard SQL queries like `SELECT * FROM patients WHERE first_name LIKE '%John%'` fail because the DB only sees encrypted data.
- **The Solution (Decrypt-then-Sort):**
  1. Fetch All: The backend fetches all encrypted records belonging to the logged-in Manager.
  2. Decrypt in Memory: Python loops through the list and decrypts every field using the Key.
  3. Filter and Sort: We apply search filters and sorting algorithms on the decrypted Python list.
  4. Paginate: We slice the list `[skip : skip + limit]` and return it.
- **Why:** For this assignment where strict encryption is priority over massive scale, this ensures 100% accurate search results on secure data.

### Inline Editing and Re-Encryption

- **File:** `frontend/src/app/dashboard/page.tsx`
- **Flow:**
  1. User clicks Edit. The row turns into inputs.
  2. User changes "John" to "Jonathan".
  3. Frontend sends "Jonathan" to `PATCH /patients/{id}`.
  4. Backend re-encrypts "Jonathan" into a new hash and saves it.
  5. Backend returns the decrypted value to keep the UI in sync.

---

## Documentation

- [API.md](API.md) - Complete API endpoint documentation
- [SECURITY.md](SECURITY.md) - Encryption architecture and security measures
- [BENCHMARKS.md](BENCHMARKS.md) - Performance testing results
- [ADR.md](ADR.md) - Architecture Decision Records

---

## Project Structure

```
submission/
├── docker-compose.yml       # Container orchestration
├── .env                     # Environment variables (create this)
├── README.md                # This file
├── API.md                   # API documentation
├── SECURITY.md              # Security documentation
├── BENCHMARKS.md            # Performance benchmarks
├── ADR.md                   # Architecture decisions
├── TNG_test.md              # Original requirements
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py          # App entry point, auth endpoints
│   │   ├── models.py        # Database models (User, Patient, etc.)
│   │   ├── schemas.py       # Pydantic validation schemas
│   │   ├── auth.py          # JWT and password logic
│   │   ├── security.py      # Encryption/Decryption module
│   │   ├── patients.py      # Patient CRUD endpoints
│   │   ├── admin.py         # Admin endpoints
│   │   ├── database.py      # Database connection
│   │   └── init_db.py       # Database initialization and seeding
│   └── tests/
│       ├── test_scenarios.md      # Test cases documentation
│       ├── verify_data.py         # Sample data generator
│       ├── verify_crypto.py       # Encryption verification
│       ├── benchmark_encryption.py # Encryption speed tests
│       └── benchmark_optimization.py # Processing optimization tests
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        └── app/
            ├── page.tsx           # Login screen
            └── dashboard/
                └── page.tsx       # Role-based dashboard
```

---

## Security Considerations

For detailed security documentation, see [SECURITY.md](SECURITY.md).

Key security features:
- Field-level AES encryption for all PHI
- JWT-based stateless authentication
- bcrypt password hashing
- Account lockout after 3 failed attempts
- Rate limiting (100 requests/minute)
- Audit logging for all sensitive operations
- SQL injection protection via parameterized queries
- XSS protection via React auto-escaping

---

## Performance

For detailed benchmarks, see [BENCHMARKS.md](BENCHMARKS.md).

Key metrics:
- Encryption: 86,000+ operations/second
- Full patient row processing: 22,000+ records/second
- 10,000 record upload: Less than 1 second total processing time
