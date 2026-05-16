from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal

from database import get_db
from models import BankAccount

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class AccountOut(BaseModel):
    id:           int
    name:         str
    bank_name:    str
    account_type: str
    balance:      float
    color:        str
    notes:        Optional[str]
    model_config = {"from_attributes": True}


class AccountCreate(BaseModel):
    name:         str                                                                        = Field(min_length=1, max_length=255)
    bank_name:    str                                                                        = Field(min_length=1, max_length=100)
    account_type: Literal["savings", "current", "credit_card", "fixed_deposit", "other"]   = "savings"
    balance:      float                                                                      = Field(default=0.0, ge=-100_000_000, le=100_000_000)
    color:        str                                                                        = Field(default="#3B82F6", pattern=r'^#[0-9A-Fa-f]{3,6}$')
    notes:        Optional[str]                                                              = Field(default=None, max_length=500)

    @field_validator("name", "bank_name", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v


class AccountUpdate(BaseModel):
    name:         Optional[str]                                                                       = Field(default=None, min_length=1, max_length=255)
    bank_name:    Optional[str]                                                                       = Field(default=None, min_length=1, max_length=100)
    account_type: Optional[Literal["savings", "current", "credit_card", "fixed_deposit", "other"]]   = None
    balance:      Optional[float]                                                                     = Field(default=None, ge=-100_000_000, le=100_000_000)
    color:        Optional[str]                                                                       = Field(default=None, pattern=r'^#[0-9A-Fa-f]{3,6}$')
    notes:        Optional[str]                                                                       = Field(default=None, max_length=500)


class SummaryOut(BaseModel):
    total_balance:  float
    liquid_balance: float
    credit_owed:    float
    account_count:  int


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(BankAccount).order_by(BankAccount.name.asc()).all()


@router.get("/summary", response_model=SummaryOut)
def get_summary(db: Session = Depends(get_db)):
    accounts = db.query(BankAccount).all()
    liquid   = sum(a.balance for a in accounts if a.account_type != "credit_card")
    credit   = sum(abs(a.balance) for a in accounts if a.account_type == "credit_card")
    return SummaryOut(
        total_balance=liquid - credit,
        liquid_balance=liquid,
        credit_owed=credit,
        account_count=len(accounts),
    )


@router.post("/", response_model=AccountOut, status_code=201)
def create_account(body: AccountCreate, db: Session = Depends(get_db)):
    acct = BankAccount(**body.model_dump())
    db.add(acct)
    db.commit()
    db.refresh(acct)
    return acct


@router.put("/{acct_id}", response_model=AccountOut)
def update_account(acct_id: int, body: AccountUpdate, db: Session = Depends(get_db)):
    acct = db.query(BankAccount).filter(BankAccount.id == acct_id).first()
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(acct, field, value)
    db.commit()
    db.refresh(acct)
    return acct


@router.delete("/{acct_id}", status_code=204)
def delete_account(acct_id: int, db: Session = Depends(get_db)):
    acct = db.query(BankAccount).filter(BankAccount.id == acct_id).first()
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(acct)
    db.commit()
