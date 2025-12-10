from database import engine, create_tables

try:
    # Test connection
    with engine.connect() as connection:
        print("Connection successful!")
    
    # Create all tables
    create_tables()
    print("Tables created successfully!")
    
except Exception as e:
    print(f"Failed: {e}")