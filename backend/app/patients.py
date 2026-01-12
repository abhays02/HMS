from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io
import datetime
from . import models, schemas, database, auth, security

router = APIRouter(
    prefix="/patients",
    tags=["patients"],
    responses={404: {"description": "Not found"}},
)

@router.get("/stats")
def get_patient_stats(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    # Permission Check
    perms = [p.name for p in current_user.role.permissions]
    if "report.view" not in perms:
        raise HTTPException(status_code=403, detail="Not authorized. Missing 'report.view' permission.")

    # 1. Total Patients
    total_patients = db.query(models.Patient).count()

    # 2. Total Users
    total_users = db.query(models.User).count()

    # 3. Decrypt and Aggregate Gender & Age
    patients = db.query(models.Patient.dob, models.Patient.gender).all()
    
    male_count = 0
    female_count = 0
    
    age_groups = { "0-18": 0, "19-35": 0, "36-50": 0, "51-70": 0, "70+": 0 }
    
    now_year = datetime.datetime.utcnow().year
    
    for p in patients:
        try:
            gender = security.decrypt(p.gender)
            dob_str = security.decrypt(p.dob) 
            
            if gender == "Male":
                male_count += 1
            elif gender == "Female":
                female_count += 1
                
            if dob_str:
                dob_date = None
                for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%m/%d/%Y"):
                    try:
                        dob_date = datetime.datetime.strptime(dob_str.split(" ")[0], fmt)
                        break
                    except:
                        pass
                
                if dob_date:
                    age = now_year - dob_date.year
                    if age <= 18: age_groups["0-18"] += 1
                    elif age <= 35: age_groups["19-35"] += 1
                    elif age <= 50: age_groups["36-50"] += 1
                    elif age <= 70: age_groups["51-70"] += 1
                    else: age_groups["70+"] += 1
                    
        except Exception:
            continue
            
    male_pct = round((male_count / total_patients * 100)) if total_patients else 0
    female_pct = round((female_count / total_patients * 100)) if total_patients else 0

    return {
        "total_patients": total_patients,
        "total_users": total_users,
        "gender_distribution": {"male_percentage": male_pct, "female_percentage": female_pct},
        "age_groups": age_groups
    }

@router.get("/template")
def get_template(current_user: models.User = Depends(auth.get_current_user)):
    # Permission Check
    user_perms = [p.name for p in current_user.role.permissions]
    if "patient.create" not in user_perms:
       raise HTTPException(status_code=403, detail="Not authorized. Missing 'patient.create' permission.")

    df = pd.DataFrame(columns=["Patient ID", "First Name", "Last Name", "DOB", "Gender"])
    # Create valid sample row
    df.loc[0] = ["P001", "John", "Doe", "1980-01-01", "Male"]
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    
    return Response(
        content=output.getvalue(), 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=patient_template.xlsx"}
    )

@router.post("/upload")
async def upload_patients(
    file: UploadFile = File(...), 
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Permission Check
    user_perms = [p.name for p in current_user.role.permissions]
    if "patient.create" not in user_perms:
       raise HTTPException(status_code=403, detail="Not authorized. Missing 'patient.create' permission.")

    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload .xlsx file.")
    
    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read Excel file.")
    
    required_columns = ["Patient ID", "First Name", "Last Name", "DOB", "Gender"]
    if not all(col in df.columns for col in required_columns):
         raise HTTPException(status_code=400, detail=f"Missing columns. Required: {required_columns}")
    
    # ---------------------------------------------------------
    # VALIDATION: Check for Duplicate Patient IDs
    # ---------------------------------------------------------
    # Get all IDs from the upload
    uploaded_ids = df["Patient ID"].astype(str).tolist()
    
    # Check DB for any matching IDs (Global Uniqueness Check)
    # or Local Uniqueness (manager specific). Here we use Global to prevent confusion.
    existing_patients = db.query(models.Patient.patient_id)\
        .filter(models.Patient.patient_id.in_(uploaded_ids))\
        .all()
    
    existing_ids = [p[0] for p in existing_patients]
    if existing_ids:
        raise HTTPException(
            status_code=400, 
            detail=f"Duplicate Records Found: The following Patient IDs already exist: {', '.join(existing_ids[:5])}..."
        )
    # ---------------------------------------------------------

    # helper to safely encrypt series
    def encrypt_series(series):
        return series.astype(str).apply(lambda x: security.encrypt(x))

    # Encrypt in memory using Pandas (faster than row iteration)
    # This prepares the data for bulk insert
    df["First Name"] = encrypt_series(df["First Name"])
    df["Last Name"] = encrypt_series(df["Last Name"])
    df["DOB"] = encrypt_series(df["DOB"])
    df["Gender"] = encrypt_series(df["Gender"])

    # Prepare mappings for bulk insert
    # Optimization: Use bulk_insert_mappings for massive speedup vs add() loop
    patient_mappings = []
    
    # We can zip it for speed
    records = df.to_dict('records')
    for row in records:
        patient_mappings.append({
            "patient_id": str(row["Patient ID"]),
            "first_name": row["First Name"],
            "last_name": row["Last Name"],
            "dob": row["DOB"],
            "gender": row["Gender"],
            "manager_id": current_user.id
        })
    
    # Perform Bulk Insert
    try:
        db.bulk_insert_mappings(models.Patient, patient_mappings)
        count = len(patient_mappings)
        
        # Audit Log
        log = models.AuditLog(user_id=current_user.id, action="UPLOAD_PATIENTS", details=f"Uploaded {count} patients")
        db.add(log)

        # Audit Log (Encryption)
        log_encrypt = models.AuditLog(user_id=current_user.id, action="ENCRYPTION_OPERATION", details=f"Encrypted {count} patient records")
        db.add(log_encrypt)

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during bulk upload: {str(e)}")

    return {"message": f"Successfully uploaded {count} patients."}

@router.get("/", response_model=List[schemas.Patient])
def read_patients(
    search: Optional[str] = None,
    sort_by: Optional[str] = "patient_id",
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Permission Check
    user_perms = [p.name for p in current_user.role.permissions]
    if "patient.read" not in user_perms:
       raise HTTPException(status_code=403, detail="Not authorized. Missing 'patient.read' permission.")

    # Audit Log (Viewing/Access)
    action_details = f"Action: View | Search: '{search}' | Sort: '{sort_by}' | Limit: {limit}"
    log = models.AuditLog(user_id=current_user.id, action="ACCESS_PATIENTS", details=action_details)
    db.add(log)
    
    # Audit Log (Decryption)
    # We log that decryption was performed for the user session
    log_decrypt = models.AuditLog(user_id=current_user.id, action="DECRYPTION_OPERATION", details="Decrypted patient records for display")
    db.add(log_decrypt)

    db.commit()

    # Step A: Fetch records for the current Manager
    # REQ: Access Control & Performance > 50k
    # Optimization 1: If searching by UNENCRYPTED fields (here patient_id) or just viewing default page,
    # we use SQL offset/limit to avoid fetching 50k rows into memory.
    
    query = db.query(
        models.Patient.id,
        models.Patient.patient_id,
        models.Patient.first_name,
        models.Patient.last_name,
        models.Patient.dob,
        models.Patient.gender,
        models.Patient.manager_id
    ).filter(models.Patient.manager_id == current_user.id)

    # If no search text and sorting by patient_id, we can paginate in DB
    can_paginate_in_db = (not search) and (sort_by == "patient_id")
    
    if can_paginate_in_db:
        # SQL-side sort and limit (Very Fast)
        query = query.order_by(models.Patient.patient_id.asc()).offset(skip).limit(limit)
        raw_patients = query.all()
    else:
        # Must fetch all to decrypt and filter/sort in Python (Slower but Secure)
        raw_patients = query.all()

    # Step B: Decrypt fields in Python memory
    # Optimization: List comprehension is faster than append loop
    decrypted_patients = [
        {
            "id": p.id,
            "patient_id": p.patient_id, # Unencrypted
            "first_name": security.decrypt(p.first_name),
            "last_name": security.decrypt(p.last_name),
            "dob": security.decrypt(p.dob),
            "gender": security.decrypt(p.gender),
            "manager_id": p.manager_id
        }
        for p in raw_patients
    ]
        
    # Step C: Apply Search (Filter), Sort, and Pagination on the decrypted list
    # Only needed if we haven't already paginated in DB
    if can_paginate_in_db:
        return decrypted_patients

    filtered_patients = decrypted_patients
    if search:
        search_lower = search.lower()
        filtered_patients = [
            p for p in decrypted_patients 
            if search_lower in p["patient_id"].lower() or 
               search_lower in p["first_name"].lower() or 
               search_lower in p["last_name"].lower() or
               search_lower in p["dob"].lower() or
               search_lower in p["gender"].lower()
        ]
        
    # Sort
    # Simple sort implementation
    if sort_by in ["first_name", "last_name", "dob", "gender", "patient_id"]:
        filtered_patients.sort(key=lambda x: x.get(sort_by, "").lower())
        
    # Pagination
    start = skip
    end = skip + limit
    paginated_patients = filtered_patients[start:end]
    
    # Step D: Return the resulting JSON
    return paginated_patients

@router.patch("/{patient_id}", response_model=schemas.Patient)
def update_patient(
    patient_id: int, 
    patient_update: schemas.PatientUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):# REQ: Only Managers should access patient data functionality
    if not current_user.role or current_user.role.name != "Manager":
       raise HTTPException(status_code=403, detail="Not authorized. Only Managers can update patient data.")

    # REQ: Data Isolation - ensure they own the record
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id, models.Patient.manager_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if patient_update.first_name is not None:
        patient.first_name = security.encrypt(patient_update.first_name)
    if patient_update.last_name is not None:
        patient.last_name = security.encrypt(patient_update.last_name)
    if patient_update.dob is not None:
        patient.dob = security.encrypt(patient_update.dob)
    if patient_update.gender is not None:
        patient.gender = security.encrypt(patient_update.gender)
    
    # Audit Log
    log = models.AuditLog(user_id=current_user.id, action="UPDATE_PATIENT", details=f"Updated Patient {patient.patient_id}")
    db.add(log)
        
    db.commit()
    db.refresh(patient)
    
    # Decrypt for response
    return {
        "id": patient.id,
        "patient_id": patient.patient_id,
        "first_name": security.decrypt(patient.first_name),
        "last_name": security.decrypt(patient.last_name),
        "dob": security.decrypt(patient.dob),
        "gender": security.decrypt(patient.gender),
        "manager_id": patient.manager_id
    }

@router.post("/bulk-delete")
def bulk_delete_patients(
    ids: List[int],
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # REQ: Only Managers (with delete perm)
    user_perms = [p.name for p in current_user.role.permissions]
    if "patient.delete" not in user_perms:
       raise HTTPException(status_code=403, detail="Not authorized. Missing 'patient.delete' permission.")

    # Filter to ensure user owns these records
    patients_to_delete = db.query(models.Patient).filter(
        models.Patient.id.in_(ids),
        models.Patient.manager_id == current_user.id
    ).all()
    
    if not patients_to_delete:
        return {"message": "No records deleted"}

    count = len(patients_to_delete)
    
    # Audit Log
    log = models.AuditLog(
        user_id=current_user.id, 
        action="BULK_DELETE", 
        details=f"Deleted {count} patients (IDs: {ids})"
    )
    db.add(log)
    
    # Bulk Delete
    for p in patients_to_delete:
        db.delete(p)
        
    db.commit()
    return {"message": f"Successfully deleted {count} records"}

@router.delete("/{patient_id}", status_code=204)
def delete_patient(
    patient_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # REQ: Only Managers should access patient data functionality
    if not current_user.role or current_user.role.name != "Manager":
       raise HTTPException(status_code=403, detail="Not authorized. Only Managers can delete patients.")

    # REQ: Data Isolation - ensure they own the record
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id, models.Patient.manager_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found or access denied")
    
    # Audit Log
    log = models.AuditLog(user_id=current_user.id, action="DELETE_PATIENT", details=f"Deleted Patient {patient.patient_id}")
    db.add(log)

    db.delete(patient)
    db.commit()
    return Response(status_code=204)
