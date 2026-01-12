# Test Scenarios and Verification

This document contains all test scenarios for verifying the Secure Patient Management System against the requirements specified in TNG_test.md.

---

## 1. Authentication Tests

### 1.1 Valid Login
- **Action:** Login with `manager@test.com` / `password123`
- **Expected:** Redirect to Manager Dashboard
- **Verification:** User sees patient management interface

### 1.2 Invalid Login (Wrong Password)
- **Action:** Login with `manager@test.com` / `wrongpassword`
- **Expected:** Error message "Incorrect username or password"
- **Verification:** User remains on login page

### 1.3 Invalid Login (Non-existent User)
- **Action:** Login with `nonexistent@test.com` / `password123`
- **Expected:** Error message "Incorrect username or password"
- **Verification:** No user information leaked

### 1.4 Account Lockout
- **Action:** Attempt login 3 times with wrong password for `manager@test.com`
- **Expected:** Error message "Account locked for 15 minutes"
- **Verification:** Audit log shows ACCOUNT_LOCKED event

### 1.5 Locked Account Access
- **Action:** After lockout, try login with correct password
- **Expected:** Error message about account being locked
- **Verification:** Cannot login until lockout expires

### 1.6 Session Expiry
- **Action:** Wait 30+ minutes after login, then make API request
- **Expected:** 401 Unauthorized response
- **Verification:** User redirected to login page

### 1.7 Logout
- **Action:** Click logout button
- **Expected:** Token removed, redirect to login page
- **Verification:** Subsequent API calls fail with 401

---

## 2. Password Reset Tests

### 2.1 OTP Request
- **Action:** Request OTP for `manager@test.com`
- **Expected:** Success message "OTP sent successfully"
- **Verification:** OTP code logged to console (dev mode)

### 2.2 Password Reset with Valid OTP
- **Action:** Submit OTP with new password
- **Expected:** Success message "Password reset successfully"
- **Verification:** Can login with new password

### 2.3 Password Reset with Invalid OTP
- **Action:** Submit incorrect OTP
- **Expected:** Error message "Invalid OTP"
- **Verification:** Password unchanged

### 2.4 Password Change (Authenticated)
- **Action:** Change password via profile settings
- **Expected:** Success message
- **Verification:** Old password no longer works

---

## 3. Role-Based Access Control (RBAC) Tests

### 3.1 Admin Access
- **Action:** Login as `admin@test.com`
- **Expected:** See User Management, Audit Logs, Reports tabs
- **Verification:** No patient upload functionality visible

### 3.2 Manager Access
- **Action:** Login as `manager@test.com`
- **Expected:** See Patient Upload, Patient Table, Edit capabilities
- **Verification:** No User Management tab visible

### 3.3 User Access
- **Action:** Login as `user1@test.com`
- **Expected:** Limited dashboard view
- **Verification:** No patient management features

### 3.4 Finance Access
- **Action:** Login as `finance@test.com`
- **Expected:** Reports tab only
- **Verification:** No patient data visible, only aggregated stats

### 3.5 Unauthorized API Access
- **Action:** Call `/patients/` without token
- **Expected:** 401 Unauthorized
- **Verification:** No data returned

### 3.6 Cross-Role API Access
- **Action:** Admin tries to access `/patients/upload`
- **Expected:** 403 Forbidden
- **Verification:** Permission check works

---

## 4. Data Isolation Tests

### 4.1 Manager Data Ownership
- **Action:** Manager A uploads patients, Manager B logs in
- **Expected:** Manager B sees empty patient list
- **Verification:** Data strictly isolated by manager_id

### 4.2 Patient ID Global Uniqueness
- **Action:** Manager A uploads patient P001, Manager B tries to upload P001
- **Expected:** Error "Duplicate Records Found"
- **Verification:** Patient IDs unique across all managers

---

## 5. File Upload Tests

### 5.1 Valid Excel Upload
- **Action:** Upload `patients_valid.xlsx` as Manager
- **Expected:** Success message with record count
- **Verification:** Patients appear in table

### 5.2 Invalid File Format
- **Action:** Upload a .txt or .csv file
- **Expected:** Error "Invalid file format. Please upload .xlsx file"
- **Verification:** File rejected

### 5.3 Missing Columns
- **Action:** Upload `patients_invalid_columns.xlsx`
- **Expected:** Error listing missing required columns
- **Verification:** No data stored

### 5.4 Duplicate Patient IDs in File
- **Action:** Upload file with duplicate Patient IDs
- **Expected:** Error about duplicate records
- **Verification:** Upload rejected

### 5.5 Large File Upload (10,000 records)
- **Action:** Upload `patients_10k_benchmark.xlsx`
- **Expected:** Success within acceptable time (< 5 seconds)
- **Verification:** All records stored and encrypted

### 5.6 Template Download
- **Action:** Click "Download Template" button
- **Expected:** Excel file downloaded with correct columns
- **Verification:** File has headers: Patient ID, First Name, Last Name, DOB, Gender

---

## 6. Patient Data Display Tests

### 6.1 Table Pagination
- **Action:** Upload 100+ patients, navigate pages
- **Expected:** Data loads in pages of 100
- **Verification:** Page navigation works correctly

### 6.2 Search Functionality
- **Action:** Search for "John"
- **Expected:** Only patients with "John" in any field shown
- **Verification:** Search works on encrypted data (decrypted in memory)

### 6.3 Sort by Column
- **Action:** Click "First Name" column header
- **Expected:** Data sorted alphabetically by first name
- **Verification:** Sort works on decrypted values

### 6.4 Real-time Refresh
- **Action:** Upload new patients
- **Expected:** Table refreshes automatically
- **Verification:** New data appears without page reload

---

## 7. Inline Editing Tests

### 7.1 Enter Edit Mode
- **Action:** Click Edit button on a patient row
- **Expected:** Row fields become editable inputs
- **Verification:** Blue border indicates edit mode

### 7.2 Save Changes
- **Action:** Change First Name from "John" to "Jonathan", click Save
- **Expected:** Success notification, data updated
- **Verification:** Database shows new encrypted value

### 7.3 Cancel Edit
- **Action:** Enter edit mode, make changes, click Cancel
- **Expected:** Original values restored
- **Verification:** No API call made, no data changed

### 7.4 Validation on Edit
- **Action:** Clear required field, try to save
- **Expected:** Validation error displayed
- **Verification:** Save blocked until valid

### 7.5 Patient ID Not Editable
- **Action:** Enter edit mode
- **Expected:** Patient ID field is read-only
- **Verification:** Cannot modify Patient ID

---

## 8. Delete Operations Tests

### 8.1 Single Delete
- **Action:** Click Delete on a patient row
- **Expected:** Confirmation prompt, then deletion
- **Verification:** Patient removed from table and database

### 8.2 Bulk Delete
- **Action:** Select multiple patients, click Bulk Delete
- **Expected:** All selected patients deleted
- **Verification:** Audit log shows BULK_DELETE event

### 8.3 Delete Confirmation
- **Action:** Click Delete, then Cancel in confirmation
- **Expected:** Deletion cancelled
- **Verification:** Patient still exists

---

## 9. Encryption Tests


### 9.2 Patient ID Unencrypted
- **Action:** Check database patient_id column
- **Expected:** Patient ID stored as plaintext
- **Verification:** Allows indexing and uniqueness checks

### 9.3 Decryption on Display
- **Action:** View patient table as Manager
- **Expected:** Data displayed as readable text
- **Verification:** Names, DOB, Gender properly decrypted

### 9.4 Re-encryption on Edit
- **Action:** Edit a patient name
- **Expected:** New value encrypted before storage
- **Verification:** Database shows different encrypted value

---

## 10. Audit Logging Tests

### 10.1 Login Events Logged
- **Action:** Login successfully, then check audit logs
- **Expected:** LOGIN_SUCCESS event recorded
- **Verification:** Admin can see in Audit Logs tab

### 10.2 Failed Login Logged
- **Action:** Fail login, then check audit logs
- **Expected:** LOGIN_FAILED event recorded
- **Verification:** Shows attempt count

### 10.3 Upload Events Logged
- **Action:** Upload patients, check audit logs
- **Expected:** UPLOAD_PATIENTS and ENCRYPTION_OPERATION events
- **Verification:** Shows record count

### 10.4 Access Events Logged
- **Action:** View patient list, check audit logs
- **Expected:** ACCESS_PATIENTS and DECRYPTION_OPERATION events
- **Verification:** Search/sort parameters logged

### 10.5 Edit Events Logged
- **Action:** Edit a patient, check audit logs
- **Expected:** UPDATE_PATIENT event
- **Verification:** Shows which patient was updated

### 10.6 Delete Events Logged
- **Action:** Delete a patient, check audit logs
- **Expected:** DELETE_PATIENT event
- **Verification:** Shows patient ID deleted

---

## 11. Security Tests

### 11.1 SQL Injection Prevention
- **Action:** Enter `'; DROP TABLE patients; --` in search
- **Expected:** No error, search returns no results
- **Verification:** Database intact, query parameterized

### 11.2 XSS Prevention
- **Action:** Upload patient with name `<script>alert('xss')</script>`
- **Expected:** Script stored as text, not executed on display
- **Verification:** React escapes HTML entities

### 11.3 Rate Limiting
- **Action:** Make 100+ requests in 1 minute
- **Expected:** 429 Too Many Requests response
- **Verification:** Subsequent requests blocked temporarily

### 11.4 CSRF Protection
- **Action:** Attempt cross-origin request without token
- **Expected:** 401 Unauthorized
- **Verification:** JWT in header prevents CSRF

---

## 12. Performance Tests

### 12.1 Encryption Benchmark
- **Action:** Run `benchmark_encryption.py`
- **Expected:** 80,000+ encrypt operations/second
- **Verification:** Results logged to console

### 12.2 Upload Benchmark
- **Action:** Upload 10,000 record file, measure time
- **Expected:** Complete in < 5 seconds
- **Verification:** Stopwatch or API response time

### 12.3 Search Benchmark
- **Action:** Search with 10,000 records in database
- **Expected:** Results returned in < 1 second
- **Verification:** UI remains responsive

---

## 13. User Interface Tests

### 13.1 Responsive Design
- **Action:** Resize browser to mobile width
- **Expected:** UI adapts, remains usable
- **Verification:** No horizontal scroll, elements stack

### 13.2 Loading States
- **Action:** Perform slow operation (large upload)
- **Expected:** Loading spinner displayed
- **Verification:** User knows action is in progress

### 13.3 Error Messages
- **Action:** Trigger various errors
- **Expected:** Clear, user-friendly error messages
- **Verification:** No technical jargon shown to users

### 13.4 Drag and Drop Upload
- **Action:** Drag Excel file onto upload zone
- **Expected:** File accepted, upload begins
- **Verification:** Same as clicking upload button

---

## Test Execution Checklist

| Category | Total Tests | Passed | Failed |
|----------|-------------|--------|--------|
| Authentication | 7 | | |
| Password Reset | 4 | | |
| RBAC | 6 | | |
| Data Isolation | 2 | | |
| File Upload | 6 | | |
| Data Display | 4 | | |
| Inline Editing | 5 | | |
| Delete Operations | 3 | | |
| Encryption | 4 | | |
| Audit Logging | 6 | | |
| Security | 4 | | |
| Performance | 3 | | |
| User Interface | 4 | | |
| **TOTAL** | **58** | | |
