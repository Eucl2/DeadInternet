from supabase import create_client
import os
from dotenv import load_dotenv
import uuid
from pathlib import Path

load_dotenv()

RENDER = os.getenv("RENDER") == "true"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if RENDER:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_image(file_data: bytes, file_name: str, bucket_name: str = "images") -> str:
    """Upload image to Supabase (production) or local filesystem (local)"""
    
    if RENDER:
        # Production: Supabase
        try:
            unique_filename = f"{uuid.uuid4()}_{file_name}"
            supabase.storage.from_(bucket_name).upload(
                path=unique_filename,
                file=file_data
            )
            public_url = supabase.storage.from_(bucket_name).get_public_url(unique_filename)
            return public_url
        except Exception as e:
            print(f"Upload failed: {e}")
            return None
    else:
        # Local: filesystem
        UPLOAD_DIR = Path("uploads/creative")
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        
        file_extension = file_name.split(".")[-1].lower()
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        with open(file_path, "wb") as buffer:
            buffer.write(file_data)
        
        return f"/uploads/creative/{unique_filename}"

def delete_image(file_url: str, bucket_name: str = "images") -> bool:
    """Delete image from Supabase (production) or filesystem (local)"""
    
    if RENDER:
        # Production: Delete from Supabase
        try:
            filename = file_url.split('/')[-1]
            supabase.storage.from_(bucket_name).remove([filename])
            return True
        except Exception as e:
            print(f"Delete failed: {e}")
            return False
    else:
        # Local: Delete from filesystem
        try:
            file_path = file_url.lstrip('/')
            if os.path.exists(file_path):
                os.remove(file_path)
            return True
        except Exception as e:
            print(f"Error deleting: {e}")
            return False