from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal

from database import get_db
from models import RecurringTransaction, TxType

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class RecurringOut(BaseModel):
    id:            int
    desc:          str
    category:      str
    amount:        float
    type:          str
    investment_id: Optional[int] = None
    day_of_month:  int
    active:        bool
    tags:          Optional[str] = None
    model_config = {"from_attributes": True}


class RecurringCreate(BaseModel):
    desc:          str                           = Field(min_length=1, max_length=255)
    category:      str                           = Field(min_length=1, max_length=100)
    amount:        float                         = Field(gt=0, le=100_000_000)
    type:          Literal["income", "expense"]
    investment_id: Optional[int]                 = None
    day_of_month:  int                           = Field(default=1, ge=1, le=28)
    active:        bool                          = True
    tags:          Optional[str]                 = Field(default=None, max_length=500)

    @field_validator("desc", "category", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v


class RecurringUpdate(BaseModel):
    desc:          Optional[str]                          = Field(default=None, min_length=1, max_length=255)
    category:      Optional[str]                          = Field(default=None, min_length=1, max_length=100)
    amount:        Optional[float]                        = Field(default=None, gt=0, le=100_000_000)
    type:          Optional[Literal["income", "expense"]] = None
    investment_id: Optional[int]                          = None
    day_of_month:  Optional[int]                          = Field(default=None, ge=1, le=28)
    active:        Optional[bool]                         = None
    tags:          Optional[str]                          = Field(default=None, max_length=500)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[RecurringOut])
def list_recurring(db: Session = Depends(get_db)):
    return db.query(RecurringTransaction).order_by(RecurringTransaction.day_of_month.asc()).all()


@router.post("/", response_model=RecurringOut, status_code=201)
def create_recurring(body: RecurringCreate, db: Session = Depends(get_db)):
    rec = RecurringTransaction(
        desc          = body.desc,
        category      = body.category,
        amount        = body.amount,
        type          = TxType(body.type),
        investment_id = body.investment_id,
        day_of_month  = body.day_of_month,
        active        = body.active,
        tags          = body.tags or None,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


@router.put("/{rec_id}", response_model=RecurringOut)
def update_recurring(rec_id: int, body: RecurringUpdate, db: Session = Depends(get_db)):
    rec = db.query(RecurringTransaction).filter(RecurringTransaction.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recurring template not found")
    for field, value in body.model_dump(exclude_none=True).items():
        if field == "type" and value:
            setattr(rec, field, TxType(value))
        else:
            setattr(rec, field, value)
    db.commit()
    db.refresh(rec)
    return rec


@router.delete("/{rec_id}", status_code=204)
def delete_recurring(rec_id: int, db: Session = Depends(get_db)):
    rec = db.query(RecurringTransaction).filter(RecurringTransaction.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recurring template not found")
    db.delete(rec)
    db.commit()
