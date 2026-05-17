import enum
from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Boolean, Enum as SAEnum, ForeignKey, func
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
    tags          = Column(String(500), nullable=True)
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


class UserSettings(Base):
    __tablename__ = "user_settings"

    id             = Column(Integer, primary_key=True, default=1)
    user_name      = Column(String(100), nullable=False, default='')
    financial_year = Column(String(20),  nullable=False, default='calendar')
    palette        = Column(String(20),  nullable=False, default='indigo')
    surface        = Column(String(20),  nullable=False, default='frosted')
    density        = Column(String(20),  nullable=False, default='balanced')


class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    desc          = Column(String(255), nullable=False)
    category      = Column(String(100), nullable=False)
    amount        = Column(Numeric(12, 2), nullable=False)
    type          = Column(SAEnum(TxType), nullable=False)
    investment_id = Column(Integer, ForeignKey("investments.id", ondelete="SET NULL"), nullable=True)
    day_of_month  = Column(Integer, nullable=False, default=1)
    active        = Column(Boolean, nullable=False, default=True)
    tags          = Column(String(500), nullable=True)


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    name         = Column(String(255), nullable=False)
    bank_name    = Column(String(100), nullable=False)
    account_type = Column(String(30), nullable=False, default="savings")
    balance      = Column(Numeric(14, 2), nullable=False, default=0)
    color        = Column(String(20), nullable=False, default="#3B82F6")
    notes        = Column(String(500), nullable=True)
    updated_at   = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class NetWorthSnapshot(Base):
    __tablename__ = "net_worth_snapshots"

    id        = Column(Integer, primary_key=True, autoincrement=True)
    month     = Column(String(7), nullable=False, unique=True)  # YYYY-MM
    net_worth = Column(Numeric(16, 2), nullable=False)
