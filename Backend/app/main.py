# entry file for fastapi

import logging
from fastapi import FastAPI
from app.api.router import router
from app.db.database import Base, engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI()
app.include_router(router)

Base.metadata.create_all(bind=engine)