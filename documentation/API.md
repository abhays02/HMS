# API Documentation

This document describes all available REST API endpoints in the Secure Patient Management System.

Base URL: `http://localhost:8000`

Interactive documentation is also available at `/docs` (Swagger UI) when the server is running.

---

## Authentication

### POST /login
Authenticate a user and receive a JWT token.

**Request Body (form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | User email address |
| password | string | Yes | User password |

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error Responses:**
- `401 Unauthorized`: Incorrect username or password
- `400 Bad Request`: Account locked due to too many failed attempts

---

### POST /auth/send-otp
Request a one-time password for password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "OTP sent successfully"
}
```

---

### POST /auth/reset-password-otp
Reset password using OTP.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "new_password": "newSecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid OTP
- `404 Not Found`: User not found

---

## User Management

### GET /users/me
Get current authenticated user details.

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "manager@test.com",
  "is_active": true,
  "full_name": "John Doe",
  "phone_number": "+1234567890",
  "role": {
    "id": 2,
    "name": "Manager",
    "permissions": [
      {"id": 5, "name": "patient.create"},
      {"id": 6, "name": "patient.read"}
    ]
  },
  "location": {"id": 2, "name": "IN"},
  "team": {"id": 2, "name": "EPA"}
}
```

---

### PUT /users/me/profile
Update current user profile.

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |

**Request Body:**
```json
{
  "full_name": "Jane Doe",
  "phone_number": "+0987654321",
  "email": "newemail@test.com"
}
```

**Response (200 OK):** Updated user object

---

### PUT /users/me/password
Change current user password.

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |

**Request Body:**
```json
{
  "old_password": "currentPassword",
  "new_password": "newSecurePassword"
}
```

**Response (200 OK):**
```json
{
  "message": "Password updated successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Incorrect old password

---

## Patient Management

### GET /patients/template
Download Excel template for patient upload.

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |

**Required Permission:** `patient.create`

**Response:** Excel file download (.xlsx)

---

### POST /patients/upload
Upload patient data from Excel file.

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |
| Content-Type | multipart/form-data |

**Required Permission:** `patient.create`

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| file | File | Excel file (.xlsx) with patient data |

**Expected Excel Columns:**
- Patient ID (required, alphanumeric)
- First Name (required)
- Last Name (required)
- DOB (required, date format YYYY-MM-DD)
- Gender (required, Male/Female)

**Response (200 OK):**
```json
{
  "message": "Successfully uploaded 100 patients."
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file format, missing columns, or duplicate Patient IDs
- `403 Forbidden`: Missing patient.create permission

---

### GET /patients/
List patients with search, sort, and pagination.

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |

**Required Permission:** `patient.read`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| search | string | null | Search term (searches all fields) |
| sort_by | string | patient_id | Field to sort by |
| skip | int | 0 | Number of records to skip |
| limit | int | 100 | Maximum records to return |

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "patient_id": "P00001",
    "first_name": "John",
    "last_name": "Doe",
    "dob": "1980-01-15",
    "gender": "Male",
    "manager_id": 2
  }
]
```

---

### PATCH /patients/{patient_id}
Update a patient record (inline edit).

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |

**Required Role:** Manager (owner of the record)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| patient_id | int | Database ID of the patient |

**Request Body:**
```json
{
  "first_name": "Jonathan",
  "last_name": "Doe",
  "dob": "1980-01-15",
  "gender": "Male"
}
```

**Response (200 OK):** Updated patient object

**Error Responses:**
- `403 Forbidden`: Not authorized
- `404 Not Found`: Patient not found or access denied

---

### DELETE /patients/{patient_id}
Delete a single patient record.

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |

**Required Role:** Manager (owner of the record)

**Response:** `204 No Content`

---

### POST /patients/bulk-delete
Delete multiple patient records.

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |

**Required Permission:** `patient.delete`

**Request Body:**
```json
[1, 2, 3, 4, 5]
```

**Response (200 OK):**
```json
{
  "message": "Successfully deleted 5 records"
}
```

---

### GET /patients/stats
Get aggregated patient statistics (for reports).

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |

**Required Permission:** `report.view`

**Response (200 OK):**
```json
{
  "total_patients": 1000,
  "total_users": 5,
  "gender_distribution": {
    "male_percentage": 52,
    "female_percentage": 48
  },
  "age_groups": {
    "0-18": 50,
    "19-35": 300,
    "36-50": 400,
    "51-70": 200,
    "70+": 50
  }
}
```

---

## Admin Endpoints

### GET /admin/users
List all users (Admin only).

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |

**Required Permission:** `user.read`

**Response (200 OK):** Array of user objects

---

### POST /admin/users
Create a new user (Admin only).

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer {token} |

**Required Permission:** `user.create`

**Request Body:**
```json
{
  "email": "newuser@test.com",
  "password": "password123",
  "role_id": 2,
  "location_id": 1,
  "team_id": 1,
  "full_name": "New User"
}
```

---

### PUT /admin/users/{user_id}
Update a user (Admin only).

**Required Permission:** `user.update`

---

### DELETE /admin/users/{user_id}
Delete a user (Admin only).

**Required Permission:** `user.delete`

---

### GET /admin/roles
List all roles.

**Required Permission:** `user.read`

---

### GET /admin/locations
List all locations.

**Required Permission:** `user.read`

---

### POST /admin/locations
Create a new location.

**Required Permission:** `user.create`

---

### GET /admin/teams
List all teams.

**Required Permission:** `user.read`

---

### POST /admin/teams
Create a new team.

**Required Permission:** `user.create`

---

### GET /admin/permissions
List all permissions.

**Required Permission:** `user.read`

---

### GET /admin/audit-logs
Get audit logs.

**Required Permission:** `audit.view`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| skip | int | 0 | Records to skip |
| limit | int | 100 | Max records |

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "user_id": 2,
    "action": "LOGIN_SUCCESS",
    "details": "User logged in",
    "timestamp": "2026-01-12T10:30:00"
  }
]
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common HTTP Status Codes:
- `200 OK`: Request successful
- `201 Created`: Resource created
- `204 No Content`: Successful deletion
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
