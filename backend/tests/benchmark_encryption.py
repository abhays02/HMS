import time
from cryptography.fernet import Fernet
import pandas as pd

def run_benchmark():
    # Setup
    key = Fernet.generate_key()
    f = Fernet(key)
    
    iterations = 10000
    sample_text = "Jonathan"
    sample_date = "1980-01-01"
    
    print(f"Running Encryption Benchmark ({iterations} iterations)...")
    
    # 1. Single Field Encryption
    start_time = time.time()
    for _ in range(iterations):
        f.encrypt(sample_text.encode())
    end_time = time.time()
    encrypt_time = end_time - start_time
    
    # Pre-encrypt for decryption test
    encrypted_sample = f.encrypt(sample_text.encode())
    
    # 2. Single Field Decryption
    start_time = time.time()
    for _ in range(iterations):
        f.decrypt(encrypted_sample)
    end_time = time.time()
    decrypt_time = end_time - start_time
    
    # 3. Full Row Simulation (4 fields per patient)
    start_time = time.time()
    for _ in range(iterations):
        f.encrypt(sample_text.encode()) # First Name
        f.encrypt(sample_text.encode()) # Last Name
        f.encrypt(sample_date.encode()) # DOB
        f.encrypt(b"Male")              # Gender
    end_time = time.time()
    full_row_time = end_time - start_time
    
    # Output Results
    print("\n## Encryption Performance Benchmark Results")
    print("| Operation | Iterations | Total Time (s) | Avg Time per Op (ms) | Ops/Sec |")
    print("| :--- | :--- | :--- | :--- | :--- |")
    print(f"| Encrypt Single Field | {iterations} | {encrypt_time:.4f} | {(encrypt_time/iterations)*1000:.4f} | {iterations/encrypt_time:.2f} |")
    print(f"| Decrypt Single Field | {iterations} | {decrypt_time:.4f} | {(decrypt_time/iterations)*1000:.4f} | {iterations/decrypt_time:.2f} |")
    print(f"| Full Patient Row (4 fields) | {iterations} | {full_row_time:.4f} | {(full_row_time/iterations)*1000:.4f} | {iterations/full_row_time:.2f} |")

if __name__ == "__main__":
    run_benchmark()