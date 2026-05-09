from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, case
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date

from database import get_db
from models import Transaction, TxType, Investment as InvestmentModel

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class TransactionOut(BaseModel):
    id:              int
    date:            date
    desc:            str
    category:        str
    amount:          float
    type:            str
    investment_id:   Optional[int]   = None
    investment_name: Optional[str]   = None

    model_config = {"from_attributes": True}


class TransactionCreate(BaseModel):
    date:          date
    desc:          str
    category:      str
    amount:        float
    type:          Literal["income", "expense"]
    investment_id: Optional[int] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _tx_out(tx: Transaction) -> TransactionOut:
    return TransactionOut(
        id              = tx.id,
        date            = tx.date,
        desc            = tx.desc,
        category        = tx.category,
        amount          = float(tx.amount),
        type            = tx.type,
        investment_id   = tx.investment_id,
        investment_name = tx.investment.name if tx.investment else None,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[TransactionOut])
def list_transactions(
    type:   Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit:  int           = Query(200, ge=1, le=500),
    db:     Session       = Depends(get_db),
):
    q = db.query(Transaction)
    if type in ("income", "expense"):
        q = q.filter(Transaction.type == type)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(
            Transaction.desc.ilike(term),
            Transaction.category.ilike(term),
        ))
    return [_tx_out(t) for t in q.order_by(Transaction.date.desc(), Transaction.id.desc()).limit(limit).all()]


@router.post("/", response_model=TransactionOut, status_code=201)
def create_transaction(body: TransactionCreate, db: Session = Depends(get_db)):
    if body.investment_id is not None:
        inv = db.query(InvestmentModel).filter(InvestmentModel.id == body.investment_id).first()
        if not inv:
            raise HTTPException(status_code=404, detail="Investment not found")
    tx = Transaction(
        date          = body.date,
        desc          = body.desc,
        category      = body.category,
        amount        = body.amount,
        type          = TxType(body.type),
        investment_id = body.investment_id,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return _tx_out(tx)


@router.delete("/{tx_id}", status_code=204)
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()


@router.get("/monthly-summary")
def monthly_summary(db: Session = Depends(get_db)):
    rows = (
        db.query(
            func.date_format(Transaction.date, "%Y-%m").label("month"),
            func.sum(
                case((Transaction.type == TxType.income, Transaction.amount), else_=0)
            ).label("income"),
            func.sum(
                case((Transaction.type == TxType.expense, func.abs(Transaction.amount)), else_=0)
            ).label("expense"),
        )
        .group_by("month")
        .order_by("month")
        .all()
    )
    return [
        {
            "month":   r.month,
            "income":  float(r.income  or 0),
            "expense": float(r.expense or 0),
            "savings": float(r.income  or 0) - float(r.expense or 0),
        }
        for r in rows
    ]
