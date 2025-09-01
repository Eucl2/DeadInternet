from fastapi import FastAPI
from database import create_tables

app = FastAPI(title="DeadInternet API", version="0.1.0")

# Create tables on startup
@app.on_event("startup")
def startup_event():
    create_tables()

@app.get("/")
def read_root():
    return {"message": "DeadInternet Backend v0.1 - The Last Living Network"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "0.1.0"}