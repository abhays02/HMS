from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from . import models, schemas, database, auth

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    responses={404: {"description": "Not found"}},
)

def check_admin(current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role.name != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

def check_read_access(current_user: models.User = Depends(auth.get_current_user)):
    if current_user.role.name == "Admin":
        return current_user
    
    # Check for 'user.read' or 'admin.access' permission
    perms = [p.name for p in current_user.role.permissions]
    if "user.read" in perms or "admin.access" in perms:
        return current_user
        
    raise HTTPException(status_code=403, detail="Not authorized")

# --- User Management ---
@router.get("/users", response_model=List[schemas.User])
def read_users(current_user: models.User = Depends(check_read_access), db: Session = Depends(database.get_db)):
    users = db.query(models.User).all()
    return users

@router.post("/users", response_model=schemas.User)
def create_user(user: schemas.UserCreate, current_user: models.User = Depends(check_admin), db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        role_id=user.role_id,
        location_id=user.location_id,
        team_id=user.team_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Audit
    log = models.AuditLog(user_id=current_user.id, action="ADMIN_CREATE_USER", details=f"Created user {user.email}")
    db.add(log)
    db.commit()
    
    return db_user

@router.post("/users/{user_id}/unlock")
def unlock_user(user_id: int, current_user: models.User = Depends(check_admin), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.locked_until = None
    user.failed_login_attempts = 0
    db.commit()
    
    # Audit
    log = models.AuditLog(user_id=current_user.id, action="ADMIN_UNLOCK_USER", details=f"Unlocked user {user.email}")
    db.add(log)
    db.commit()
    
    return {"message": "User unlocked successfully"}

@router.post("/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: int, 
    reset_data: schemas.AdminPasswordReset, 
    current_user: models.User = Depends(check_admin), 
    db: Session = Depends(database.get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Use provided password instead of hardcoded default
    temp_password = reset_data.new_password
    user.password_hash = auth.get_password_hash(temp_password)
    db.commit()
    
    # Audit
    log = models.AuditLog(user_id=current_user.id, action="ADMIN_RESET_PASSWORD", details=f"Reset password for {user.email}")
    db.add(log)
    db.commit()
    
    return {"message": "Password reset successfully"}

@router.put("/users/{user_id}", response_model=schemas.User)
def update_user_role_loc(user_id: int, update_data: schemas.AdminUserUpdate, current_user: models.User = Depends(check_admin), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if update_data.role_id: user.role_id = update_data.role_id
    if update_data.location_id: user.location_id = update_data.location_id
    if update_data.team_id: user.team_id = update_data.team_id
    if update_data.phone_number: user.phone_number = update_data.phone_number
    
    db.commit()
    db.refresh(user)
    
    # Audit
    log = models.AuditLog(user_id=current_user.id, action="ADMIN_UPDATE_USER", details=f"Updated User #{user.id} Role/Loc")
    db.add(log)
    db.commit()
    return user

# --- Metadata Management ---
@router.get("/permissions", response_model=List[schemas.Permission])
def read_permissions(current_user: models.User = Depends(check_read_access), db: Session = Depends(database.get_db)):
    return db.query(models.Permission).all()

@router.get("/roles", response_model=List[schemas.Role])
def read_roles(current_user: models.User = Depends(check_read_access), db: Session = Depends(database.get_db)):
    return db.query(models.Role).all()

@router.post("/roles", response_model=schemas.Role)
def create_role(role: schemas.RoleBase, current_user: models.User = Depends(check_admin), db: Session = Depends(database.get_db)):
    db_role = models.Role(name=role.name)
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role

@router.put("/roles/{role_id}/permissions")
def update_role_permissions(
    role_id: int, 
    update: schemas.RolePermissionsUpdate, 
    current_user: models.User = Depends(check_admin), 
    db: Session = Depends(database.get_db)
):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    perms = db.query(models.Permission).filter(models.Permission.id.in_(update.permission_ids)).all()
    role.permissions = perms
    db.commit()
    
    # Audit
    log = models.AuditLog(user_id=current_user.id, action="ADMIN_UPDATE_ROLE_PERMS", details=f"Updated permissions for role {role.name}")
    db.add(log)
    db.commit()
    
    return {"message": "Permissions updated"}

@router.get("/locations", response_model=List[schemas.Location])
def read_locations(current_user: models.User = Depends(check_read_access), db: Session = Depends(database.get_db)):
    return db.query(models.Location).all()

@router.post("/locations", response_model=schemas.Location)
def create_location(location: schemas.LocationBase, current_user: models.User = Depends(check_admin), db: Session = Depends(database.get_db)):
    db_loc = models.Location(name=location.name)
    db.add(db_loc)
    db.commit()
    db.refresh(db_loc)
    return db_loc

@router.get("/teams", response_model=List[schemas.Team])
def read_teams(current_user: models.User = Depends(check_read_access), db: Session = Depends(database.get_db)):
    return db.query(models.Team).all()

@router.post("/teams", response_model=schemas.Team)
def create_team(team: schemas.TeamBase, current_user: models.User = Depends(check_admin), db: Session = Depends(database.get_db)):
    db_team = models.Team(name=team.name)
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team

# --- Audit Logs ---
from datetime import date, timedelta
from typing import Optional

@router.get("/audit-logs", response_model=List[schemas.AuditLog])
def read_audit_logs(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    sort_order: str = "desc",
    current_user: models.User = Depends(check_admin), 
    db: Session = Depends(database.get_db)
):
    query = db.query(models.AuditLog)

    if start_date:
        query = query.filter(models.AuditLog.timestamp >= start_date)
    
    if end_date:
        # Inclusive of the end_date
        next_day = end_date + timedelta(days=1)
        query = query.filter(models.AuditLog.timestamp < next_day)

    if sort_order == "asc":
        query = query.order_by(models.AuditLog.timestamp.asc())
    else:
        query = query.order_by(models.AuditLog.timestamp.desc())

    logs = query.limit(200).all()
    return logs
