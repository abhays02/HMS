from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Table
from sqlalchemy.orm import relationship, backref
import datetime
from .database import Base

# Association Table for Many-to-Many between Role and Permission
role_permissions = Table('role_permissions', Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id')),
    Column('permission_id', Integer, ForeignKey('permissions.id'))
)

class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # e.g. "user.create"
    description = Column(String, nullable=True)

class Role(Base):

    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    
    # Hierarchy Support: A role can have a parent role (e.g. Manager -> Admin)
    parent_id = Column(Integer, ForeignKey('roles.id'), nullable=True)
    children = relationship("Role", backref=backref("parent", remote_side=[id]))

    # Configurable Permissions: Many-to-Many
    permissions = relationship("Permission", secondary=role_permissions, backref="roles")

    users = relationship("User", back_populates="role")

class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    users = relationship("User", back_populates="location")

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    users = relationship("User", back_populates="team")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    is_active = Column(Boolean, default=True)
    
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    
    role = relationship("Role", back_populates="users")
    location = relationship("Location", back_populates="users")
    team = relationship("Team", back_populates="users")
    
    # Metadata
    full_name = Column(String, nullable=True) # New profile field
    phone_number = Column(String, nullable=True) # Added phone number

    # Security Features
    failed_login_attempts = Column(Integer, default=0)

    locked_until = Column(DateTime, nullable=True)

    patients = relationship("Patient", back_populates="manager")
    audit_logs = relationship("AuditLog", back_populates="user")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String) # LOGIN, LOGIN_FAILED, UPLOAD, VIEW, ENCRYPT, ADMIN_ACTION
    details = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="audit_logs")

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True) # Unencrypted ID from Excel

    
    # Encrypted Fields
    first_name = Column(String)
    last_name = Column(String)
    dob = Column(String)
    gender = Column(String)
    
    manager_id = Column(Integer, ForeignKey("users.id"))
    manager = relationship("User", back_populates="patients")

