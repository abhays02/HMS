from cryptography.fernet import Fernet
import os

# Generate one with: from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())
# Example key for dev: 
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise ValueError("ENCRYPTION_KEY must be set in environment")

# Ensure key is valid (Fernet requires 32 url-safe base64-encoded bytes)
try:
    f = Fernet(ENCRYPTION_KEY)
except Exception as e:
    print(f"Invalid Encryption Key: {e}")
    # Fallback for dev only - DO NOT USE IN PRODUCTION
    key = Fernet.generate_key()
    f = Fernet(key)
    print(f"Generated temporary key: {key.decode()}")

def encrypt(text: str) -> str:
    if not text:
        return ""
    return f.encrypt(text.encode()).decode()

def decrypt(token: str) -> str:
    if not token:
        return ""
    try:
        return f.decrypt(token.encode()).decode()
    except Exception:
        return "[Decryption Failed]"
