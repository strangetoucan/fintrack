import enum
from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Enum as SAEnum, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class TxType(str, enum.Enum):
    income  = "income"
    expense = "expense"


class Transaction(Base):
    __tablename__ = "transactions"

    id            = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date          = Column(Date, nullable=False)
    desc          = Column(String(255), nullable=False)
    category      = Column(String(100), nullable=False)
    amount        = Column(Numeric(12, 2), nullable=False)
    type          = Column(SAEnum(TxType), nullable=False)
    investment_id = Column(Integer, ForeignKey("investments.id", ondelete="SET NULL"), nullable=True)
    investment    = relationship("Investment", backref="transactions", lazy="joined")
    created_at    = Column(DateTime, server_default=func.now(), nullable=False)


class Investment(Base):
    __tablename__ = "investments"

    id       = Column(Integer, primary_key=True, autoincrement=True)
    name     = Column(String(255), nullable=False)
    type     = Column(String(20), nullable=False)
    platform = Column(String(100), nullable=False)
    invested = Column(Numeric(14, 2), nullable=False)
    current  = Column(Numeric(14, 2), nullable=False)
    sip      = Column(Numeric(10, 2), nullable=True)


class BudgetCategory(Base):
    __tablename__ = "budget_categories"

    id     = Column(Integer, primary_key=True, autoincrement=True)
    name   = Column(String(100), nullable=False, unique=True)
    budget = Column(Numeric(12, 2), nullable=False)
    color  = Column(String(20), nullable=False)


class Goal(Base):
    __tablename__ = "goals"

    id       = Column(Integer, primary_key=True, autoincrement=True)
    name     = Column(String(255), nullable=False)
    target   = Column(Numeric(14, 2), nullable=False)
    current  = Column(Numeric(14, 2), nullable=False)
    deadline = Column(String(50), nullable=False)
    color    = Column(String(20), nullable=False)
    icon     = Column(String(10), nullable=False)


class EMI(Base):
    __tablename__ = "emis"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(255), nullable=False)
    bank        = Column(String(100), nullable=False)
    emi         = Column(Numeric(10, 2), nullable=False)
    outstanding = Column(Numeric(14, 2), nullable=False)
    total_loan  = Column(Numeric(14, 2), nullable=False)
    end_date    = Column(String(50), nullable=False)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    name          = Column(String(255), nullable=False)
    amount        = Column(Numeric(10, 2), nullable=False)
    billing_cycle = Column(String(20), nullable=False, default="monthly")
    category      = Column(String(100), nullable=False, default="Other")
    next_billing  = Column(String(50), nullable=True)
    status        = Column(String(20), nullable=False, default="active")
    notes         = Column(String(500), nullable=True)
