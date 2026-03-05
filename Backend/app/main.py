# entry file for fastapi

from fastapi import FastAPI
from app.api.router import router
from app.db.database import Base, engine

app = FastAPI()
app.include_router(router)

Base.metadata.create_all(bind=engine)