from sqlalchemy.orm import Session
from .database import engine, SessionLocal, Base
from . import models, auth
import time
import os
import json
from sqlalchemy.exc import OperationalError
import logging
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load seed users from environment variable or use defaults for development
def get_seed_users():
    """
    Load seed users from SEED_USERS environment variable (JSON string).
    Falls back to empty list if not set - no users created automatically.
    """
    seed_json = os.getenv("SEED_USERS", "")
    if seed_json:
        try:
            return json.loads(seed_json)
        except json.JSONDecodeError:
            logger.warning("Invalid SEED_USERS JSON, skipping user seeding")
            return []
    return []

# Default password from env (never hardcoded in production)
DEFAULT_PASSWORD = os.getenv("DEFAULT_USER_PASSWORD", "")

def wait_for_db(db_engine):
    retries = 30
    while retries > 0:
        try:
            # Try to connect
            with db_engine.connect() as connection:
                logger.info("Database connection established.")
                return
        except OperationalError:
            retries -= 1
            logger.info(f"Database not ready. Retrying in 1s... ({retries} left)")
            time.sleep(1)
    raise Exception("Could not connect to database after 30 seconds")

def init_db():
    wait_for_db(engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Permissions (Configurable Permissions System)
    # Define granular permissions for the system
    all_permissions = [
        "user.create", "user.read", "user.update", "user.delete", # User Management
        "patient.create", "patient.read", "patient.update", "patient.delete", # Patient Management
        "audit.view", # Audit Logs
        "report.view" # Reporting
    ]
    
    perm_map = {}
    for p_name in all_permissions:
        perm = db.query(models.Permission).filter_by(name=p_name).first()
        if not perm:
            perm = models.Permission(name=p_name, description=f"Ability to {p_name}")
            db.add(perm)
            db.commit()
        perm_map[p_name] = perm

    # 2. Roles (Hierarchical Role Structures)
    # Strategy: "Admin" is top. "Manager" reports to Admin. "User" reports to Manager.
    # Also assigning permissions to roles to show configurability.
    
    # Create Role objects first without parents
    role_names = ["Admin", "Manager", "User", "Finance"]
    role_objs = {}
    
    for r_name in role_names:
        role = db.query(models.Role).filter_by(name=r_name).first()
        if not role:
            role = models.Role(name=r_name)
            db.add(role)
            db.commit()
        role_objs[r_name] = role

    # Configure Hierarchy & Permissions
    # Admin: Parent=None, Perms=User, Audit, Report (NO PATIENT ACCESS)
    admin_role = role_objs["Admin"]
    admin_perms = [
        "user.create", "user.read", "user.update", "user.delete",
        "audit.view", "report.view"
    ]
    # Filter valid perms
    admin_role.permissions = [perm_map[p] for p in admin_perms if p in perm_map]
    db.add(admin_role)

    # Manager: Parent=Admin, Perms=Patient Management (NO USER READ)
    manager_role = role_objs["Manager"]
    manager_role.parent_id = admin_role.id # Hierarchy: Manager -> Admin
    manager_perms = [
        "patient.create", "patient.read", "patient.update", "patient.delete"
    ]
    manager_role.permissions = [perm_map[p] for p in manager_perms if p in perm_map]
    db.add(manager_role)

    # User: Parent=Manager, Perms=Patient Read Only
    user_role = role_objs["User"]
    user_role.parent_id = manager_role.id # Hierarchy: User -> Manager
    user_perms = ["patient.read"]
    user_role.permissions = [perm_map[p] for p in user_perms]
    db.add(user_role)
    
    # Finance: No permissions, for testing access control
    finance_role = role_objs["Finance"]
    finance_role.parent_id = None # No hierarchy for now
    finance_role.permissions = [] # Explicitly empty
    db.add(finance_role)
    
    db.commit()
    
    role_map = role_objs # For compatibility with rest of script

    # Locs
    locs = ["US", "IN", "EU", "AU"]
    loc_map = {}
    for l in locs:
        loc = db.query(models.Location).filter_by(name=l).first()
        if not loc:
            loc = models.Location(name=l)
            db.add(loc)
            db.commit()
        loc_map[l] = loc

    # Teams
    teams = ["AR", "EPA", "PRI"]
    team_map = {}
    for t in teams:
        team = db.query(models.Team).filter_by(name=t).first()
        if not team:
            team = models.Team(name=t)
            db.add(team)
            db.commit()
        team_map[t] = team

    print("--- Creating Seed Users from Environment ---")
    
    first_names = ["John", "Jane", "Alice", "Bob", "Charlie", "David", "Eve", "Frank"]
    last_names = ["Doe", "Smith", "Johnson", "Brown", "Williams", "Jones", "Garcia", "Miller"]

    def get_random_name():
        return f"{random.choice(first_names)} {random.choice(last_names)}"
    
    def get_random_phone():
        return f"+1{random.randint(1000000000, 9999999999)}"

    # Get seed users from environment variable
    seed_users = get_seed_users()
    
    if not seed_users:
        print("No SEED_USERS defined. Skipping user creation.")
        print("Set SEED_USERS env var to create initial users.")
    
    if not DEFAULT_PASSWORD and seed_users:
        print("WARNING: DEFAULT_USER_PASSWORD not set. Cannot create users.")
        seed_users = []

    for u in seed_users:
        email = u.get("email")
        role_name = u.get("role")
        loc_name = u.get("loc", locs[0])
        team_name = u.get("team", teams[0])
        
        if not email or not role_name:
            print(f"Skipping invalid user config: {u}")
            continue
            
        if role_name not in role_map:
            print(f"Unknown role {role_name} for {email}, skipping")
            continue
            
        if db.query(models.User).filter_by(email=email).first():
            print(f"User exists: {email}")
            continue
            
        user = models.User(
            email=email,
            password_hash=auth.get_password_hash(DEFAULT_PASSWORD),
            role_id=role_map[role_name].id,
            location_id=loc_map.get(loc_name, loc_map[locs[0]]).id,
            team_id=team_map.get(team_name, team_map[teams[0]]).id,
            is_active=True,
            full_name=get_random_name(),
            phone_number=get_random_phone()
        )
        db.add(user)
        print(f"Created: {email} ({role_name})")

    db.commit()
    print("Database Initialized")

if __name__ == "__main__":
    init_db()
