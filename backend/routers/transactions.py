from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, case
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import date, datetime

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
    investment_id:   Optional[int]      = None
    investment_name: Optional[str]      = None
    tags:            Optional[str]      = None
    created_at:      Optional[datetime] = None

    model_config = {"from_attributes": True}


class TransactionCreate(BaseModel):
    date:          date
    desc:          str                           = Field(min_length=1, max_length=255)
    category:      str                           = Field(min_length=1, max_length=100)
    # Positive for income, negative for expense (sign must match `type`)
    amount:        float                         = Field(ge=-100_000_000, le=100_000_000)
    type:          Literal["income", "expense"]
    investment_id: Optional[int]                 = None
    tags:          Optional[str]                 = Field(default=None, max_length=500)

    @field_validator("desc", "category", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v

    @field_validator("amount")
    @classmethod
    def amount_not_zero(cls, v: float) -> float:
        if v == 0:
            raise ValueError("amount must not be zero")
        return v


TransactionUpdate = TransactionCreate


class BulkDeleteRequest(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=500)


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
        tags            = tx.tags,
        created_at      = tx.created_at,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[TransactionOut])
def list_transactions(
    type:      Optional[str]  = Query(None),
    search:    Optional[str]  = Query(None),
    category:  Optional[str]  = Query(None),
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    tag:       Optional[str]  = Query(None),
    limit:     int            = Query(200, ge=1, le=500),
    db:        Session        = Depends(get_db),
):
    q = db.query(Transaction)
    if type in ("income", "expense"):
        q = q.filter(Transaction.type == type)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(Transaction.desc.ilike(term), Transaction.category.ilike(term)))
    if category:
        q = q.filter(Transaction.category == category)
    if date_from:
        q = q.filter(Transaction.date >= date_from)
    if date_to:
        q = q.filter(Transaction.date <= date_to)
    if tag:
        q = q.filter(Transaction.tags.ilike(f"%{tag}%"))
    return [_tx_out(t) for t in q.order_by(Transaction.created_at.desc(), Transaction.date.desc(), Transaction.id.desc()).limit(limit).all()]


@router.post("/", response_model=TransactionOut, status_code=201)
def create_transaction(body: TransactionCreate, db: Session = Depends(get_db)):
    inv = None
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
        tags          = body.tags or None,
    )
    db.add(tx)
    if inv and body.type == "expense":
        inv.invested = float(inv.invested) + abs(body.amount)
    db.commit()
    db.refresh(tx)
    return _tx_out(tx)


@router.delete("/bulk", status_code=204)
def bulk_delete_transactions(body: BulkDeleteRequest, db: Session = Depends(get_db)):
    txns = db.query(Transaction).filter(Transaction.id.in_(body.ids)).all()
    for tx in txns:
        if tx.investment_id and tx.type == TxType.expense:
            inv = db.query(InvestmentModel).filter(InvestmentModel.id == tx.investment_id).first()
            if inv:
                inv.invested = float(inv.invested) - abs(float(tx.amount))
        db.delete(tx)
    db.commit()


@router.put("/{tx_id}", response_model=TransactionOut)
def update_transaction(tx_id: int, body: TransactionUpdate, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Undo investment sync for the old values
    if tx.investment_id and tx.type == TxType.expense:
        old_inv = db.query(InvestmentModel).filter(InvestmentModel.id == tx.investment_id).first()
        if old_inv:
            old_inv.invested = float(old_inv.invested) - abs(float(tx.amount))

    # Validate new investment if provided
    new_inv = None
    if body.investment_id is not None:
        new_inv = db.query(InvestmentModel).filter(InvestmentModel.id == body.investment_id).first()
        if not new_inv:
            raise HTTPException(status_code=404, detail="Investment not found")

    tx.date          = body.date
    tx.desc          = body.desc
    tx.category      = body.category
    tx.amount        = body.amount
    tx.type          = TxType(body.type)
    tx.investment_id = body.investment_id
    tx.tags          = body.tags or None

    # Re-apply investment sync for the new values
    if new_inv and body.type == "expense":
        new_inv.invested = float(new_inv.invested) + abs(body.amount)

    db.commit()
    db.refresh(tx)
    return _tx_out(tx)


@router.delete("/{tx_id}", status_code=204)
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.investment_id and tx.type == TxType.expense:
        inv = db.query(InvestmentModel).filter(InvestmentModel.id == tx.investment_id).first()
        if inv:
            inv.invested = float(inv.invested) - abs(float(tx.amount))
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
