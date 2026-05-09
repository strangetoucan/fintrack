from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from pydantic import BaseModel
from typing import Optional
from datetime import date

from database import get_db
from models import BudgetCategory as BudgetCategoryModel, Transaction, TxType

router = APIRouter()


class BudgetCategoryOut(BaseModel):
    id:     int
    name:   str
    budget: float
    spent:  float
    color:  str


class BudgetCategoryCreate(BaseModel):
    name:   str
    budget: float
    color:  str


class BudgetCategoryUpdate(BaseModel):
    budget: float
    color:  Optional[str] = None


def _spent_map(db: Session) -> dict:
    now = date.today()
    rows = (
        db.query(Transaction.category, func.sum(func.abs(Transaction.amount)).label("spent"))
        .filter(
            Transaction.type == TxType.expense,
            extract("year",  Transaction.date) == now.year,
            extract("month", Transaction.date) == now.month,
        )
        .group_by(Transaction.category)
        .all()
    )
    return {r.category: float(r.spent) for r in rows}


@router.get("/", response_model=list[BudgetCategoryOut])
def list_budget(db: Session = Depends(get_db)):
    cats  = db.query(BudgetCategoryModel).all()
    spent = _spent_map(db)
    return [{"id": c.id, "name": c.name, "budget": float(c.budget), "spent": spent.get(c.name, 0.0), "color": c.color} for c in cats]


@router.post("/", response_model=BudgetCategoryOut, status_code=201)
def create_budget_category(body: BudgetCategoryCreate, db: Session = Depends(get_db)):
    if db.query(BudgetCategoryModel).filter(BudgetCategoryModel.name == body.name).first():
        raise HTTPException(status_code=400, detail="Category name already exists")
    cat = BudgetCategoryModel(name=body.name, budget=body.budget, color=body.color)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    spent = _spent_map(db)
    return {"id": cat.id, "name": cat.name, "budget": float(cat.budget), "spent": spent.get(cat.name, 0.0), "color": cat.color}


@router.put("/{cat_id}", response_model=BudgetCategoryOut)
def update_budget_category(cat_id: int, body: BudgetCategoryUpdate, db: Session = Depends(get_db)):
    cat = db.query(BudgetCategoryModel).filter(BudgetCategoryModel.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.budget = body.budget
    if body.color:
        cat.color = body.color
    db.commit()
    db.refresh(cat)
    spent = _spent_map(db)
    return {"id": cat.id, "name": cat.name, "budget": float(cat.budget), "spent": spent.get(cat.name, 0.0), "color": cat.color}


@router.delete("/{cat_id}", status_code=204)
def delete_budget_category(cat_id: int, db: Session = Depends(get_db)):
    cat = db.query(BudgetCategoryModel).filter(BudgetCategoryModel.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()


@router.get("/summary")
def budget_summary(db: Session = Depends(get_db)):
    cats         = db.query(BudgetCategoryModel).all()
    total_budget = sum(float(c.budget) for c in cats)
    now          = date.today()
    total_spent  = float(
        db.query(func.sum(func.abs(Transaction.amount)))
        .filter(
            Transaction.type == TxType.expense,
            extract("year",  Transaction.date) == now.year,
            extract("month", Transaction.date) == now.month,
        )
        .scalar() or 0
    )
    return {
        "total_budget":    total_budget,
        "total_spent":     total_spent,
        "total_remaining": total_budget - total_spent,
        "utilization_pct": round(total_spent / total_budget * 100, 1) if total_budget else 0,
    }
