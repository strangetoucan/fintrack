from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Goal as GoalModel, EMI as EMIModel

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class GoalOut(BaseModel):
    id:       int
    name:     str
    target:   float
    current:  float
    deadline: str
    color:    str
    icon:     str
    model_config = {"from_attributes": True}


class GoalCreate(BaseModel):
    name:     str
    target:   float
    current:  float
    deadline: str
    color:    str
    icon:     str


class GoalUpdate(BaseModel):
    name:     Optional[str]   = None
    target:   Optional[float] = None
    current:  Optional[float] = None
    deadline: Optional[str]   = None
    color:    Optional[str]   = None
    icon:     Optional[str]   = None


class EMIOut(BaseModel):
    id:          int
    name:        str
    bank:        str
    emi:         float
    outstanding: float
    total_loan:  float
    end_date:    str
    model_config = {"from_attributes": True}


class EMICreate(BaseModel):
    name:        str
    bank:        str
    emi:         float
    outstanding: float
    total_loan:  float
    end_date:    str


class EMIUpdate(BaseModel):
    name:        Optional[str]   = None
    bank:        Optional[str]   = None
    emi:         Optional[float] = None
    outstanding: Optional[float] = None
    total_loan:  Optional[float] = None
    end_date:    Optional[str]   = None


# ── Goals ─────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[GoalOut])
def list_goals(db: Session = Depends(get_db)):
    return db.query(GoalModel).all()


@router.post("/", response_model=GoalOut, status_code=201)
def create_goal(body: GoalCreate, db: Session = Depends(get_db)):
    goal = GoalModel(**body.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/{goal_id}", response_model=GoalOut)
def update_goal(goal_id: int, body: GoalUpdate, db: Session = Depends(get_db)):
    goal = db.query(GoalModel).filter(GoalModel.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.query(GoalModel).filter(GoalModel.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()


# ── EMIs ──────────────────────────────────────────────────────────────────────

@router.get("/emis", response_model=list[EMIOut])
def list_emis(db: Session = Depends(get_db)):
    return db.query(EMIModel).all()


@router.post("/emis", response_model=EMIOut, status_code=201)
def create_emi(body: EMICreate, db: Session = Depends(get_db)):
    emi = EMIModel(**body.model_dump())
    db.add(emi)
    db.commit()
    db.refresh(emi)
    return emi


@router.put("/emis/{emi_id}", response_model=EMIOut)
def update_emi(emi_id: int, body: EMIUpdate, db: Session = Depends(get_db)):
    emi = db.query(EMIModel).filter(EMIModel.id == emi_id).first()
    if not emi:
        raise HTTPException(status_code=404, detail="EMI not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(emi, field, value)
    db.commit()
    db.refresh(emi)
    return emi


@router.delete("/emis/{emi_id}", status_code=204)
def delete_emi(emi_id: int, db: Session = Depends(get_db)):
    emi = db.query(EMIModel).filter(EMIModel.id == emi_id).first()
    if not emi:
        raise HTTPException(status_code=404, detail="EMI not found")
    db.delete(emi)
    db.commit()
