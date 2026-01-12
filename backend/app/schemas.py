from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PermissionBase(BaseModel):
    name: str
    description: Optional[str] = None

class Permission(PermissionBase):
    id: int
    class Config:
        from_attributes = True

class RoleBase(BaseModel):
    name: str

class Role(RoleBase):
    id: int
    permissions: list[Permission] = []
    class Config:
        from_attributes = True

class RolePermissionsUpdate(BaseModel):
    permission_ids: list[int]

class LocationBase(BaseModel):
    name: str

class Location(LocationBase):
    id: int
    class Config:
        from_attributes = True

class TeamBase(BaseModel):
    name: str

class Team(TeamBase):
    id: int
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str
    role_id: int
    location_id: int
    team_id: int

class User(UserBase):
    id: int
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: bool
    role: Role
    location: Location
    team: Team
    failed_login_attempts: int
    locked_until: Optional[datetime]
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None

class AdminUserUpdate(BaseModel):
    role_id: Optional[int] = None
    location_id: Optional[int] = None
    team_id: Optional[int] = None
    phone_number: Optional[str] = None

class AdminPasswordReset(BaseModel):
    new_password: str

class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str

class AuditLogCreate(BaseModel):
    action: str
    details: Optional[str] = None

class AuditLog(AuditLogCreate):
    id: int
    user_id: Optional[int]
    timestamp: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):

    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class PatientBase(BaseModel):
    patient_id: str
    first_name: str
    last_name: str
    dob: str
    gender: str

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None

class Patient(PatientBase):
    id: int
    manager_id: int
    class Config:
        from_attributes = True

