import sys
import os
import re

# Add the current directory to sys.path so we can import 'app'
sys.path.append(os.getcwd())

from cryptography.fernet import Fernet
from app.database import SessionLocal
from app.models import Patient

ENV_FILE_PATH = "/app/.env" # Path inside container

def update_env_file(new_key):
    """Updates the ENCRYPTION_KEY in the .env file."""
    print(f"-> Updating .env file at {ENV_FILE_PATH}...")
    try:
        if not os.path.exists(ENV_FILE_PATH):
             # Try local path if not in container
             local_path = ".env"
             if os.path.exists(local_path):
                 path = local_path
             else:
                 # Fallback: create new
                 path = ENV_FILE_PATH
        else:
            path = ENV_FILE_PATH

        # Read content
        content = ""
        if os.path.exists(path):
            with open(path, "r") as f:
                content = f.read()

        # Replace or Append
        if "ENCRYPTION_KEY=" in content:
            new_content = re.sub(r"ENCRYPTION_KEY=.*", f"ENCRYPTION_KEY={new_key}", content)
        else:
            new_content = content + f"\nENCRYPTION_KEY={new_key}\n"

        with open(path, "w") as f:
            f.write(new_content)
            
        print(f"-> .env file updated successfully.")
        
    except Exception as e:
        print(f"[ERROR] Could not update .env file: {e}")
        print(f"Please manually update .env to: ENCRYPTION_KEY={new_key}")

def rotate_keys_auto():
    """
    Automated Key Rotation: 
    1. Gets old key from Env.
    2. Generates New Key.
    3. Migrates DB.
    4. Updates .env
    """
    print(f"--- Automated Key Rotation Tool ---")
    
    # 1. Get Old Key
    old_key = os.getenv("ENCRYPTION_KEY")
    if not old_key:
        # Try reading from .env if env var is missing (e.g. running outside docker context but with file)
        try:
             with open(".env", "r") as f:
                 for line in f:
                     if line.startswith("ENCRYPTION_KEY="):
                         old_key = line.strip().split("=")[1]
                         break
        except:
            pass
            
    if not old_key:
        print("[FATAL] Could not find current ENCRYPTION_KEY in environment or .env file.")
        print("Cannot decrypt existing data. Aborting.")
        return

    # 2. Generate New Key
    print(f"-> Generating new secure key...")
    new_key = Fernet.generate_key().decode()
    
    print(f"Old Key: {old_key[:10]}...")
    print(f"New Key: {new_key[:10]}...")
    
    try:
        f_old = Fernet(old_key)
        f_new = Fernet(new_key)
    except Exception as e:
        print(f"[FATAL] Key Error: {e}")
        return

    # 3. DB Migration
    db = SessionLocal()
    try:
        patients = db.query(Patient).all()
        print(f"-> Starting Database Migration for {len(patients)} records...")
        
        count = 0
        errors = 0
        
        for p in patients:
            try:
                # Decrypt
                p1 = f_old.decrypt(p.first_name.encode()).decode() if p.first_name else ""
                p2 = f_old.decrypt(p.last_name.encode()).decode() if p.last_name else ""
                p3 = f_old.decrypt(p.dob.encode()).decode() if p.dob else ""
                p4 = f_old.decrypt(p.gender.encode()).decode() if p.gender else ""
                
                # Encrypt
                p.first_name = f_new.encrypt(p1.encode()).decode() if p1 else ""
                p.last_name = f_new.encrypt(p2.encode()).decode() if p2 else ""
                p.dob = f_new.encrypt(p3.encode()).decode() if p3 else ""
                p.gender = f_new.encrypt(p4.encode()).decode() if p4 else ""
                
                count += 1
            except Exception as e:
                # If decryption fails, it might already be encrypted with a different key or corrupted
                # We skip to avoid data loss of other records, but log it.
                print(f"[WARN] Failed to rotate Patient #{p.id}: {e}")
                errors += 1
                continue

        db.commit()
        print(f"-> Migration Complete: {count} success, {errors} errors.")
        
        # 4. Update .env
        if count > 0 or len(patients) == 0:
            update_env_file(new_key)
            print(f"\n[SUCCESS] Key Rotation Completed successfully.")
            print(f"IMPORTANT: You must RESTART the backend service for changes to take effect.")
            print(f"Run: docker-compose restart backend")
        else:
            print(f"[ERROR] Too many errors during migration. .env was NOT updated to prevent data loss.")
            db.rollback()
        
    except Exception as e:
        print(f"[FATAL] Database Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    rotate_keys_auto()
