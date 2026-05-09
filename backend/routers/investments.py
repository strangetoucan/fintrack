from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Investment as InvestmentModel, Transaction

router = APIRouter()


class InvestmentOut(BaseModel):
    id:       int
    name:     str
    type:     str
    platform: str
    invested: float
    current:  float
    sip:      Optional[float]
    returns:  float


class InvestmentCreate(BaseModel):
    name:     str
    type:     str
    platform: str
    invested: float
    current:  float
    sip:      Optional[float] = None


class InvestmentUpdate(BaseModel):
    name:     Optional[str]   = None
    platform: Optional[str]   = None
    invested: Optional[float] = None
    current:  Optional[float] = None
    sip:      Optional[float] = None


def _to_out(inv: InvestmentModel) -> dict:
    invested = float(inv.invested)
    current  = float(inv.current)
    returns  = round((current - invested) / invested * 100, 2) if invested else 0.0
    return {
        "id": inv.id, "name": inv.name, "type": inv.type,
        "platform": inv.platform, "invested": invested, "current": current,
        "sip": float(inv.sip) if inv.sip else None, "returns": returns,
    }


@router.get("/", response_model=list[InvestmentOut])
def list_investments(type: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(InvestmentModel)
    if type:
        q = q.filter(InvestmentModel.type == type)
    return [_to_out(i) for i in q.all()]


@router.post("/", response_model=InvestmentOut, status_code=201)
def create_investment(body: InvestmentCreate, db: Session = Depends(get_db)):
    inv = InvestmentModel(
        name=body.name, type=body.type, platform=body.platform,
        invested=body.invested, current=body.current, sip=body.sip,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return _to_out(inv)


@router.put("/{inv_id}", response_model=InvestmentOut)
def update_investment(inv_id: int, body: InvestmentUpdate, db: Session = Depends(get_db)):
    inv = db.query(InvestmentModel).filter(InvestmentModel.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    if body.name     is not None: inv.name     = body.name
    if body.platform is not None: inv.platform = body.platform
    if body.invested is not None: inv.invested = body.invested
    if body.current  is not None: inv.current  = body.current
    if body.sip      is not None: inv.sip      = body.sip
    db.commit()
    db.refresh(inv)
    return _to_out(inv)


@router.delete("/{inv_id}", status_code=204)
def delete_investment(inv_id: int, db: Session = Depends(get_db)):
    inv = db.query(InvestmentModel).filter(InvestmentModel.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    db.delete(inv)
    db.commit()


@router.get("/{inv_id}/transactions")
def investment_transactions(inv_id: int, db: Session = Depends(get_db)):
    inv = db.query(InvestmentModel).filter(InvestmentModel.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    txns = (
        db.query(Transaction)
        .filter(Transaction.investment_id == inv_id)
        .order_by(Transaction.date.desc(), Transaction.id.desc())
        .all()
    )
    return [
        {
            "id":       t.id,
            "date":     t.date.isoformat(),
            "desc":     t.desc,
            "amount":   float(t.amount),
            "type":     t.type,
            "category": t.category,
        }
        for t in txns
    ]


@router.get("/summary")
def investment_summary(db: Session = Depends(get_db)):
    invs           = db.query(InvestmentModel).all()
    total_invested = sum(float(i.invested) for i in invs)
    total_current  = sum(float(i.current)  for i in invs)
    total_sips     = sum(float(i.sip) for i in invs if i.sip)
    active_sips    = sum(1 for i in invs if i.sip)
    return {
        "total_invested": total_invested,
        "total_current":  total_current,
        "total_returns":  total_current - total_invested,
        "monthly_sips":   total_sips,
        "active_sips":    active_sips,
    }
