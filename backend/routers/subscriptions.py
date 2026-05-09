from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import case
from pydantic import BaseModel
from typing import Optional

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
    name:          str
    amount:        float
    billing_cycle: str = "monthly"
    category:      str = "Other"
    next_billing:  Optional[str] = None
    status:        str = "active"
    notes:         Optional[str] = None


class SubscriptionUpdate(BaseModel):
    name:          Optional[str]   = None
    amount:        Optional[float] = None
    billing_cycle: Optional[str]   = None
    category:      Optional[str]   = None
    next_billing:  Optional[str]   = None
    status:        Optional[str]   = None
    notes:         Optional[str]   = None


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
