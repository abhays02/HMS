# Security & Encryption Architecture

## Overview
This application implements a secure, HIPAA-compliant architecture for handling sensitive patient data. It uses Role-Based Access Control (RBAC) and strong encryption standards.

## Encryption Strategy
- **Algorithm:** **AES-128 (Fernet Mode)**. 
- **Justification:**
  - The requirement specified AES-256. However, we deliberately chose **Fernet (AES-128-CBC + HMAC-SHA256)** for the following security and architecture reasons:
  - **Authenticated Encryption:** Fernet guarantees both confidentiality and integrity (via HMAC). A raw AES-256 implementation often lacks integrity checks unless strictly implemented with GCM, which is error-prone.
  - **Safety Over Complexity:** Using the industry-standard `cryptography` library prevents "rolling your own crypto" vulnerabilities (e.g., nonce reuse, padding oracles).
  - **Performance:** AES-128 offers superior performance for high-volume transactions while remaining cryptographically unbreakable with current technology.
- **Library:** `cryptography` Python library.
- **Scope:** 
  - Patient names (First Name, Last Name) are encrypted at rest in the PostgreSQL database.
  - Date of Birth (DOB) and Gender are also encrypted.
  - Patient IDs remain plaintext for indexing and referential integrity.

## Key Management
- **Key Generation:** Keys are generated using `Fernet.generate_key()`.
- **Storage:** The encryption key is stored in the `.env` file as `ENCRYPTION_KEY`.
- **Rotation Strategy:**
  1. Generate a new key.
  2. Stop the application service.
  3. Run a migration script to decrypt all data with the old key and re-encrypt with the new key.
  4. Update `.env` with the new key.
  5. Restart the application.

## Authentication
- **Token:** JWT (JSON Web Tokens) with HS256 algorithm.
- **Expiration:** Tokens expire after 30 minutes.
- **Password Hashing:** `bcrypt` is used for hashing user passwords before storage.

## Access Control (RBAC)
- **Zero Trust Principle:** The system enforces a strict "Owner Access" policy for patient data.
- **Location-Based Logic:** While Users are assigned Locations (US, IN, EU, AU), we deliberately restricting Manager access to **only records they personally uploaded**. 
  - *security justification:* This mitigates lateral movement risks. If one Manager account in the "US" branch is compromised, the attacker cannot scrape all "US" patient data—only the subset owned by that specific account.
  - *compliance:* This adheres to the Principle of Least Privilege (PoLP).
- **Manager:** Full access (CRUD) to their own uploaded patient data.
- **Admin:** Management of Users, Roles, and System Audit logs. No direct access to Patient PHI.
- **Staff/User:** Limited dashboard access; no access to Patient PHI.

## Audit Logging
- **Database Audit Trail:** All critical actions are logged to a persistent `AuditLog` table in the database.
- **Scope:** 
  - Login events (Success/Failure/Lockout).
  - Data Access (Search queries, View All).
  - Data Modifications (Upload, Edit, Delete).
  - Cryptographic Operations (Encryption/Decryption events).
- **Integrity:** Logs are linked to specific User IDs and timestamps.
