from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, Literal

from database import get_db
from models import UserSettings

router = APIRouter()

SINGLETON_ID = 1


class SettingsOut(BaseModel):
    user_name:      str
    financial_year: str
    palette:        str
    surface:        str
    density:        str
    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    user_name:      Optional[str]                                         = Field(default=None, max_length=100)
    financial_year: Optional[Literal["calendar", "fiscal"]]              = None
    palette:        Optional[Literal["indigo", "emerald", "rose", "amber", "cyan", "violet"]] = None
    surface:        Optional[Literal["frosted", "flat", "elevated"]]     = None
    density:        Optional[Literal["compact", "balanced", "analyst"]]  = None


def _get_or_create(db: Session) -> UserSettings:
    row = db.query(UserSettings).filter(UserSettings.id == SINGLETON_ID).first()
    if not row:
        row = UserSettings(id=SINGLETON_ID)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("/", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return _get_or_create(db)


@router.put("/", response_model=SettingsOut)
def update_settings(body: SettingsUpdate, db: Session = Depends(get_db)):
    row = _get_or_create(db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row
