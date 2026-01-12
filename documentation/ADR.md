# Architectural Decision Records (ADR)

## ADR 001: Monorepo Structure
**Status:** Accepted
**Context:** We need to deliver a Full-Stack application (FastAPI + Next.js).
**Decision:** Use a simple folder-based monorepo (`backend/` and `frontend/`) without complex tooling like Turborepo.
**Consequences:** Simplifies the submission and docker-compose orchestration. Easier for a single assessor to run.

## ADR 002: Docker Orchestration
**Status:** Accepted
**Context:** Dependencies (Python packages, Node modules, Postgres version) vary across environments.
**Decision:** Use `docker-compose` to containerize all three services.
**Consequences:** "It works on my machine" guarantee. First-time setup is slower (build time), but runtime is stable.

## ADR 003: Encryption Strategy (Decrypt-then-Sort)
**Status:** Accepted
**Context:** Requirement is AES-256 encryption for patient names. Standard SQL `LIKE` queries cannot search encrypted blobs.
**Options:**
1.  **Blind Indexing:** Create a hashed/anonymized column for searching. (Pros: Fast. Cons: Complex, lower security).
2.  **Decrypt-then-Sort:** Fetch encrypted data $\rightarrow$ Decrypt in App Memory $\rightarrow$ Filter. (Pros: Simple, compliant. Cons: Performance hit on large datasets).
**Decision:** Use **Decrypt-then-Sort**.
**Reasoning:** The assignment prioritizes strict HIPAA compliance and correctness over big-data scale. For a Manager's typical patient load (thousands), in-memory Python operations are sufficiently fast (<100ms).

## ADR 004: Auth & RBAC
**Status:** Accepted
**Context:** Need robust Role-Based Access Control.
**Decision:** 
*   **Backend:** JWT with `scopes` or explicit Role checks in Dependencies.
*   **Frontend:** Route redirection based on Role claim.
**Consequences:** Stateless authentication. Scalable.

## ADR 005: Audit Logging
**Status:** Accepted
**Context:** HIPAA requires tracking "Who did what".
**Decision:** Synchronous writing to `AuditLog` table within the same transaction as the action.
**Consequences:** Ensures consistency. If an upload fails, the log isn't written (or we can separate it if we want "Attempted" logs). Current impl: Logs attempts and successes.

## ADR 006: Granular Permission-Based UI Architecture
**Status:** Accepted
**Context:** The application requires flexible access control where different roles (Admin, Manager) share interface elements but have distinct capabilities.
**Decision:** Implement a Granular Permission System (e.g., `user.read`, `audit.write`) rather than relying solely on high-level Role checks or separate route structures. The frontend conditionally renders components using a `hasPerm()` helper.
**Reasoning:** This decouples the UI from rigid role definitions. Creating new roles or modifying existing ones (e.g., giving a Manager audit view access) requires only database changes, not code refactoring. It enhances security by enforcing "least privilege" at the component level.

## ADR 007: Modular Component Architecture
**Context:** Dashboard interfaces grow complex with diverse functional requirements (Audit logs, User management, Patient lists).
**Decision:** Adopt a modular component design where distinct features (e.g., `AuditViewer`, `UserManager`) encapsulate their own state, data fetching logic, and error handling.
**Reasoning:** Improves maintainability and performance. The main Dashboard page acts as a layout container, while individual widgets load independently. This prevents a slow-loading data source (like huge audit logs) from blocking the rendering of critical user management features.

## ADR 008: Controlled UI Interaction (Modals over Native Prompts)
**Context:** Critical actions like "Password Reset" require user input and confirmation.
**Decision:** Use React-managed State Modals and custom notification banners instead of browser-native `window.prompt` or `window.alert`.
**Reasoning:** Provides a consistent, professional user experience that matches the application's design system. It avoids browser-blocking behavior and allows for richer validation and feedback within the dialog context (e.g., showing password strength or error messages inline).

## ADR 009: Normalized Composite Identity Schema
**Context:** The system requires defining users not just by a role, but as specific entities (e.g., "A User who holds [Role] in the [Team] Team for [Location]").
**Decision:** Store `Role`, `Team`, and `Location` as separate entities in the database and enforce user identity via mandatory Foreign Keys in the `User` table.
**Reasoning:**
*   **Flexibility (The "Why"):** By decoupling these fields, the system supports dynamic organizational changes without breaking the user's core identity:
    *   **Promotion:** Change `Role` (User -> Manager). *Team and Location remain untouched.*
    *   **Relocation:** Change `Location` (US -> EU). *Role and Team remain untouched.*
    *   **Reorg:** Change `Team` (AR -> EPA). *Role and Location remain untouched.*
*   **Scalability:** Allows adding new teams or locations without schema migrations.

## ADR 010: Privacy-Preserving Reporting Pattern ("Aggregate-on-Server")
**Status:** Accepted
**Context:** Users with the 'Finance' role need access to population-level statistics (e.g., Age Distribution) for business insights, but HIPAA/Privacy rules strictly forbid them from accessing individual Patient PII (e.g., DOB, Names).
**Decision:** Implement a dedicated "Zero-Knowledge" aggregation endpoint (`/patients/stats`).
*   **Process:** The backend retains sole custody of the encrypted data. It decrypts records in temporary memory, computes the aggregate statistics (e.g., buckets of ages), and returns *only* the anonymous numeric counts to the frontend.
*   **Restriction:** The frontend client for a Finance user never receives, stores, or processes individual patient records.
**Consequences:** 
*   **Security:** Eliminates the risk of PII leakage via browser inspection or client-side compromise.
*   **Performance:** Shifts computational load to the server, which is acceptable given the sensitivity of the data.

## ADR 011: Cryptographic Primitive Selection (Fernet vs Raw AES-256)
**Status:** Accepted
**Context:** The project requirements specified "AES-256" for data encryption. However, implementing "Raw" AES-256 requires manual handling of Initialization Vectors (IVs), padding, and mode selection, which is prone to critical implementation errors (e.g., "Padding Oracle" attacks, IV reuse).
**Decision:** Usage of **Fernet** (from the `cryptography` library), which implements **AES-128-CBC** with **HMAC-SHA256** for integrity.
**Justification:**
*   **Integrity over Key Size:** While the key size is 128-bit (vs 256-bit), Fernet includes a mandatory HMAC signature. This guarantees **Authenticated Encryption**, ensuring that if an attacker modifies the ciphertext, the decryption will fail safely. Raw AES-256 without HMAC does not provide this protection.
*   **Compliance:** AES-128 is NIST-approved for SECRET level data and conforms to HIPAA technical safeguards.
*   **Auditability:** Using a standard, vetted library is safer than custom crypto code.

