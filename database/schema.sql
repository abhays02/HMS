-- Database Schema Implementation

-- 1. Locations
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE
);

-- 2. Teams
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE
);

-- 3. Roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE
);

-- 4. Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    role_id INTEGER REFERENCES roles(id),
    location_id INTEGER REFERENCES locations(id),
    team_id INTEGER REFERENCES teams(id)
);

-- 5. Patients (Encryption Target)
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR NOT NULL,  -- Unencrypted for indexing
    first_name VARCHAR NOT NULL,  -- Encrypted (Fernet AES-128)
    last_name VARCHAR NOT NULL,   -- Encrypted (Fernet AES-128)
    dob VARCHAR NOT NULL,         -- Encrypted (Fernet AES-128)
    gender VARCHAR NOT NULL,      -- Encrypted (Fernet AES-128)
    manager_id INTEGER REFERENCES users(id)
);

-- Indexes for Patients
CREATE INDEX ix_patients_patient_id ON patients (patient_id);
-- Note: Encrypted fields are NOT indexed to prevent frequency analysis attacks

-- 6. Audit Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR NOT NULL,
    details VARCHAR,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
