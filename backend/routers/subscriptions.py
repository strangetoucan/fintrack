from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import case
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal

from database import get_db
from models import Subscription as SubModel

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class SubscriptionOut(BaseModel):
    id:            int
    name:          str
    amount:        float
    billing_cycle: str
    category:      str
    next_billing:  Optional[str]
    status:        str
    notes:         Optional[str]
    model_config = {"from_attributes": True}


class SubscriptionCreate(BaseModel):
    name:          str                                                  = Field(min_length=1, max_length=255)
    amount:        float                                                = Field(gt=0, le=100_000_000)
    billing_cycle: Literal["monthly", "quarterly", "half_yearly", "yearly"] = "monthly"
    category:      str                                                  = Field(default="Other", min_length=1, max_length=100)
    next_billing:  Optional[str]                                        = Field(default=None, max_length=50)
    status:        Literal["active", "paused", "cancelled"]            = "active"
    notes:         Optional[str]                                        = Field(default=None, max_length=500)

    @field_validator("name", "category", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v


class SubscriptionUpdate(BaseModel):
    name:          Optional[str]                                                         = Field(default=None, min_length=1, max_length=255)
    amount:        Optional[float]                                                       = Field(default=None, gt=0, le=100_000_000)
    billing_cycle: Optional[Literal["monthly", "quarterly", "half_yearly", "yearly"]]   = None
    category:      Optional[str]                                                         = Field(default=None, min_length=1, max_length=100)
    next_billing:  Optional[str]                                                         = Field(default=None, max_length=50)
    status:        Optional[Literal["active", "paused", "cancelled"]]                   = None
    notes:         Optional[str]                                                         = Field(default=None, max_length=500)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[SubscriptionOut])
def list_subscriptions(db: Session = Depends(get_db)):
    # MySQL doesn't support NULLS LAST; use CASE to sort NULLs to the end
    return db.query(SubModel).order_by(
        case((SubModel.next_billing == None, 1), else_=0),
        SubModel.next_billing.asc(),
    ).all()


@router.post("/", response_model=SubscriptionOut, status_code=201)
def create_subscription(body: SubscriptionCreate, db: Session = Depends(get_db)):
    sub = SubModel(**body.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.put("/{sub_id}", response_model=SubscriptionOut)
def update_subscription(sub_id: int, body: SubscriptionUpdate, db: Session = Depends(get_db)):
    sub = db.query(SubModel).filter(SubModel.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(sub, field, value)
    db.commit()
    db.refresh(sub)
    return sub


@router.delete("/{sub_id}", status_code=204)
def delete_subscription(sub_id: int, db: Session = Depends(get_db)):
    sub = db.query(SubModel).filter(SubModel.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    db.delete(sub)
    db.commit()
