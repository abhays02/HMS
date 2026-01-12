"""
Test Data Generator for Patient Management System

This script generates sample Excel files for testing various scenarios:
1. Valid data - Happy path testing
2. Invalid columns - Error handling testing
3. Large dataset - Performance benchmarking
"""

import pandas as pd
import os
import random
from datetime import datetime, timedelta

BASE_PATH = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(BASE_PATH, exist_ok=True)


def create_valid_sample():
    """Create a valid Excel file with 5 sample patients."""
    data = {
        "Patient ID": [f"P00{i}" for i in range(1, 6)],
        "First Name": ["John", "Jane", "Alice", "Bob", "Charlie"],
        "Last Name": ["Doe", "Smith", "Johnson", "Brown", "Davis"],
        "DOB": ["1980-01-01", "1990-05-15", "1985-07-20", "1992-11-30", "1988-03-10"],
        "Gender": ["Male", "Female", "Female", "Male", "Male"]
    }
    df = pd.DataFrame(data)
    path = os.path.join(BASE_PATH, "patients_valid.xlsx")
    df.to_excel(path, index=False)
    print(f"Created Valid Sample: {path}")


def create_invalid_sample():
    """Create an Excel file with incorrect column names."""
    data = {
        "PID": ["P001"],  # Wrong header (should be "Patient ID")
        "Name": ["John"]  # Wrong header (should be "First Name")
    }
    df = pd.DataFrame(data)
    path = os.path.join(BASE_PATH, "patients_invalid_columns.xlsx")
    df.to_excel(path, index=False)
    print(f"Created Invalid Sample: {path}")


def create_large_sample(rows=10000):
    """Create a large Excel file for performance benchmarking."""
    ids = [f"P{i:05d}" for i in range(rows)]
    first_names = ["John", "Jane", "Alice", "Bob", "Charlie"] * (rows // 5)
    last_names = ["Doe", "Smith", "Johnson", "Brown", "Davis"] * (rows // 5)
    
    # Generate dynamic DOBs between 1950 and 2005
    start_date = datetime(1950, 1, 1)
    end_date = datetime(2005, 12, 31)
    days_diff = (end_date - start_date).days
    
    dobs = []
    for _ in range(rows):
        random_days = random.randint(0, days_diff)
        random_dob = start_date + timedelta(days=random_days)
        dobs.append(random_dob.strftime("%Y-%m-%d"))

    genders = ["Male", "Female"] * (rows // 2)
    
    data = {
        "Patient ID": ids,
        "First Name": first_names,
        "Last Name": last_names,
        "DOB": dobs,
        "Gender": genders
    }
    df = pd.DataFrame(data)
    path = os.path.join(BASE_PATH, "patients_10k_benchmark.xlsx")
    df.to_excel(path, index=False)
    print(f"Created 10k Benchmark Sample: {path}")


if __name__ == "__main__":
    try:
        print("Generating test data files...")
        create_valid_sample()
        create_invalid_sample()
        create_large_sample()
        print("All test data files created successfully.")
    except Exception as e:
        print(f"Error: {e}")
