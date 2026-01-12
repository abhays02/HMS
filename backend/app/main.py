from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import pydantic
from . import models, schemas, auth, database, init_db, patients, admin

# Rate Limiting Setup
# Global Limit: 100 requests per minute per IP
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

app = FastAPI()

# Register Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(patients.router)
app.include_router(admin.router)

# CORS
origins = [


    "http://localhost:3000",
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db.init_db()

def log_audit(db: Session, user_id: int, action: str, details: str = None):
    log = models.AuditLog(user_id=user_id, action=action, details=details)
    db.add(log)
    db.commit()

@app.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # Check Lockout
    if user and user.locked_until:
        import datetime
        if datetime.datetime.utcnow() < user.locked_until:
            log_audit(db, user.id, "LOGIN_LOCKED", "Attempted login while locked")
            raise HTTPException(status_code=400, detail="Account locked due to too many failed attempts. Try again later.")
        else:
            # Unlock
            user.locked_until = None
            user.failed_login_attempts = 0
            db.commit()

    if not user or not auth.verify_password(form_data.password, user.password_hash):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 3:
                import datetime
                user.locked_until = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
                detail_msg = "Account locked for 15 minutes"
                log_audit(db, user.id, "ACCOUNT_LOCKED", "3 failed attempts")
            else:
                detail_msg = "Incorrect username or password"
                log_audit(db, user.id, "LOGIN_FAILED", f"Attempt {user.failed_login_attempts}/3")
            db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Login Success
    user.failed_login_attempts = 0
    user.locked_until = None
    log_audit(db, user.id, "LOGIN_SUCCESS", "User logged in")
    db.commit()

    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/request-password-reset")
def request_password_reset(email: str, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
         raise HTTPException(status_code=404, detail="User not found")
    
    token = auth.create_password_reset_token(email)
    # In production, send email. Here return token.
    return {"message": "Password reset token generated", "token": token}

@app.post("/reset-password")
def reset_password(token: str, new_password: str, db: Session = Depends(database.get_db)):
    try:
        from jose import jwt
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        if payload.get("type") != "reset":
            raise HTTPException(status_code=400, detail="Invalid token type")
        email = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.password_hash = auth.get_password_hash(new_password)
    log_audit(db, user.id, "PASSWORD_RESET", "User reset password")
    db.commit()
    return {"message": "Password updated successfully"}

@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.put("/users/me/password")
def update_password(pass_data: schemas.PasswordUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not auth.verify_password(pass_data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    current_user.password_hash = auth.get_password_hash(pass_data.new_password)
    log_audit(db, current_user.id, "PASSWORD_CHANGE", "User changed password")
    db.commit()
    return {"message": "Password updated successfully"}

@app.put("/users/me/profile", response_model=schemas.User)
def update_profile(profile_data: schemas.UserUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if profile_data.full_name:
        current_user.full_name = profile_data.full_name
    if profile_data.phone_number:
        current_user.phone_number = profile_data.phone_number
    if profile_data.email:
        # Check uniqueness
        existing = db.query(models.User).filter(models.User.email == profile_data.email).first()
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = profile_data.email
        
    log_audit(db, current_user.id, "PROFILE_UPDATE", "User updated profile details")
    db.commit()
    db.refresh(current_user)
    return current_user

# --- OTP / Forgot Password ---
class OTPRequest(pydantic.BaseModel):
    email: str

class OTPReset(pydantic.BaseModel):
    email: str
    otp: str
    new_password: str

@app.post("/auth/send-otp")
def send_otp(req: OTPRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        # Don't reveal user existence
        return {"message": "If this email exists, an OTP has been sent."}
    
    # Use Backup Code from ENV
    import os
    backup_code = os.getenv("BACKUP_OTP_CODE")
    if not backup_code:
        print("ERROR: BACKUP_OTP_CODE not set")
        return {"message": "OTP Configuration Error"}
        
    print(f"DEBUG: Sent OTP {backup_code} to {req.email}")
    return {"message": "OTP sent successfully"}

@app.post("/auth/reset-password-otp")
def reset_password_with_otp(req: OTPReset, db: Session = Depends(database.get_db)):
    # Verify OTP
    import os
    backup_code = os.getenv("BACKUP_OTP_CODE")
    if not backup_code:
        raise HTTPException(status_code=500, detail="OTP Configuration Error")
    
    if req.otp != backup_code:
         raise HTTPException(status_code=400, detail="Invalid OTP")
         
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.password_hash = auth.get_password_hash(req.new_password)
    log_audit(db, user.id, "PASSWORD_RESET_OTP", "User reset password via OTP")
    db.commit()
    return {"message": "Password reset successfully"}


