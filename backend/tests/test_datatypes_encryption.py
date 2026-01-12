from cryptography.fernet import Fernet
import pandas as pd
from datetime import date

def test_encryption_datatypes():
    # 1. Setup Security
    key = Fernet.generate_key()
    f = Fernet(key)

    print(f"Generated Key: {key.decode()}\n")

    # 2. Define Test Cases
    test_cases = [
        {"type": "String (Name)", "value": "John Doe"},
        {"type": "Date String (DOB)", "value": "1985-12-25"},
        {"type": "Gender (Enum)", "value": "Male"},
        {"type": "Special Chars", "value": "O'Connor-Smith"}, 
        {"type": "Numeric String", "value": "1234567890"}
    ]

    print(f"{'DATA TYPE':<20} | {'ORIGINAL':<20} | {'ENCRYPTED (First 20 chars)':<30} | {'DECRYPTED':<20} | {'STATUS':<10}")
    print("-" * 110)

    # 3. Process Each
    for case in test_cases:
        original = case["value"]
        
        # Encrypt
        # Note: In our app, we convert everything to string before encoding
        str_val = str(original)
        encrypted_bytes = f.encrypt(str_val.encode())
        encrypted_str = encrypted_bytes.decode()
        
        # Decrypt
        decrypted_str = f.decrypt(encrypted_bytes).decode()
        
        # Check
        status = " PASS" if decrypted_str == str_val else " FAIL"
        
        print(f"{case['type']:<20} | {str_val:<20} | {encrypted_str[:20] + '...':<30} | {decrypted_str:<20} | {status:<10}")

if __name__ == "__main__":
    test_encryption_datatypes()
