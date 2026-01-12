import sys
import os
sys.path.append(os.getcwd())

from app import security

def verify_crypto():
    print("--- Crypto Verification Test ---")
    
    original_text = "John Doe"
    print(f"Original: {original_text}")
    
    # Simulate saving to DB
    encrypted = security.encrypt(original_text)
    print(f"Encrypted (stored in DB): {encrypted}")
    
    if encrypted == original_text:
        print("FAIL: Text was not encrypted!")
        return

    # Simulate reading from DB
    decrypted = security.decrypt(encrypted)
    print(f"Decrypted (shown to Manager): {decrypted}")
    
    if decrypted == original_text:
        print("SUCCESS: Decryption matches original.")
    else:
        print("FAIL: Decryption failed.")

if __name__ == "__main__":
    verify_crypto()
