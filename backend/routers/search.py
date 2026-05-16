from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
from models import Transaction, Investment, Goal, Subscription, BankAccount

router = APIRouter()


@router.get("/")
def global_search(q: str = Query(..., min_length=1, max_length=200), db: Session = Depends(get_db)):
    term    = f"%{q}%"
    results = []

    txns = (
        db.query(Transaction)
        .filter(or_(Transaction.desc.ilike(term), Transaction.category.ilike(term), Transaction.tags.ilike(term)))
        .order_by(Transaction.date.desc())
        .limit(5).all()
    )
    for t in txns:
        results.append({
            "type":    "transaction",
            "id":      t.id,
            "title":   t.desc,
            "sub":     t.category,
            "amount":  float(t.amount),
            "tx_type": t.type.value,
            "screen":  "transactions",
        })

    invs = (
        db.query(Investment)
        .filter(or_(Investment.name.ilike(term), Investment.platform.ilike(term)))
        .limit(4).all()
    )
    for i in invs:
        results.append({
            "type":   "investment",
            "id":     i.id,
            "title":  i.name,
            "sub":    f"{i.platform} · {i.type}",
            "amount": float(i.current),
            "screen": "investments",
        })

    goals = db.query(Goal).filter(Goal.name.ilike(term)).limit(3).all()
    for g in goals:
        results.append({
            "type":   "goal",
            "id":     g.id,
            "title":  g.name,
            "sub":    g.deadline,
            "amount": float(g.current),
            "screen": "goals",
        })

    subs = (
        db.query(Subscription)
        .filter(or_(Subscription.name.ilike(term), Subscription.category.ilike(term)))
        .limit(3).all()
    )
    for s in subs:
        results.append({
            "type":   "subscription",
            "id":     s.id,
            "title":  s.name,
            "sub":    f"{s.billing_cycle} · {s.category}",
            "amount": float(s.amount),
            "screen": "subscriptions",
        })

    accts = (
        db.query(BankAccount)
        .filter(or_(BankAccount.name.ilike(term), BankAccount.bank_name.ilike(term)))
        .limit(3).all()
    )
    for a in accts:
        results.append({
            "type":   "account",
            "id":     a.id,
            "title":  a.name,
            "sub":    a.bank_name,
            "amount": float(a.balance),
            "screen": "accounts",
        })

    return results
