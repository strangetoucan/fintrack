"""Seed all tables with initial data if empty."""
from datetime import date
from sqlalchemy.orm import Session
from models import Transaction, TxType, Investment, BudgetCategory, Goal, EMI

TRANSACTION_SEED = [
    dict(date=date(2026, 5,  1), desc="Salary Credit",         category="Salary",        amount=95000,  type=TxType.income),
    dict(date=date(2026, 5,  1), desc="Zomato",                category="Food & Dining",  amount=-450,   type=TxType.expense),
    dict(date=date(2026, 4, 30), desc="Swiggy",                category="Food & Dining",  amount=-320,   type=TxType.expense),
    dict(date=date(2026, 4, 29), desc="House Rent",            category="Rent",           amount=-18000, type=TxType.expense),
    dict(date=date(2026, 4, 28), desc="HDFC Savings Interest", category="Interest",       amount=1200,   type=TxType.income),
    dict(date=date(2026, 4, 27), desc="Electricity Bill",      category="Utilities",      amount=-2100,  type=TxType.expense),
    dict(date=date(2026, 4, 26), desc="Netflix",               category="Entertainment",  amount=-649,   type=TxType.expense),
    dict(date=date(2026, 4, 25), desc="Groww SIP — Nifty 50", category="Investment",     amount=-5000,  type=TxType.expense),
    dict(date=date(2026, 4, 24), desc="Grocery — DMart",       category="Groceries",      amount=-3200,  type=TxType.expense),
    dict(date=date(2026, 4, 23), desc="Petrol — HP",           category="Transport",      amount=-2400,  type=TxType.expense),
    dict(date=date(2026, 4, 22), desc="Freelance Project",     category="Freelance",      amount=15000,  type=TxType.income),
    dict(date=date(2026, 4, 20), desc="Amazon — Shoes",        category="Shopping",       amount=-2999,  type=TxType.expense),
    dict(date=date(2026, 4, 18), desc="LIC Premium",           category="Insurance",      amount=-4500,  type=TxType.expense),
    dict(date=date(2026, 4, 15), desc="Doctor Visit",          category="Healthcare",     amount=-800,   type=TxType.expense),
    dict(date=date(2026, 4, 12), desc="Jio Recharge",          category="Utilities",      amount=-299,   type=TxType.expense),
]

INVESTMENT_SEED = [
    dict(name="Nifty 50 Index Fund",    type="MF",    platform="Groww",   invested=120000, current=148500, sip=5000),
    dict(name="HDFC Mid Cap Opp.",      type="MF",    platform="Groww",   invested=80000,  current=99200,  sip=3000),
    dict(name="Parag Parikh Flexi Cap", type="MF",    platform="Zerodha", invested=60000,  current=74100,  sip=2000),
    dict(name="Infosys",                type="Stock", platform="Zerodha", invested=45000,  current=52650,  sip=None),
    dict(name="TCS",                    type="Stock", platform="Zerodha", invested=38000,  current=41800,  sip=None),
    dict(name="SBI FD — 1yr",          type="FD",    platform="SBI",     invested=200000, current=214000, sip=None),
    dict(name="PPF Account",            type="PPF",   platform="SBI",     invested=500000, current=580000, sip=None),
]

BUDGET_SEED = [
    dict(name="Rent",          budget=18000, color="#3B82F6"),
    dict(name="Groceries",     budget=5000,  color="#22C55E"),
    dict(name="Food & Dining", budget=4000,  color="#F59E0B"),
    dict(name="Transport",     budget=3000,  color="#A78BFA"),
    dict(name="Utilities",     budget=3500,  color="#06B6D4"),
    dict(name="Entertainment", budget=1500,  color="#EC4899"),
    dict(name="Shopping",      budget=3000,  color="#F97316"),
    dict(name="Healthcare",    budget=2000,  color="#10B981"),
    dict(name="Insurance",     budget=5000,  color="#6366F1"),
]

GOAL_SEED = [
    dict(name="Emergency Fund",     target=300000,  current=180000, deadline="Dec 2026", color="#22C55E", icon="🛡"),
    dict(name="Europe Trip",        target=150000,  current=45000,  deadline="Mar 2027", color="#3B82F6", icon="✈"),
    dict(name="New Laptop",         target=120000,  current=80000,  deadline="Aug 2026", color="#A78BFA", icon="💻"),
    dict(name="House Down Payment", target=2000000, current=350000, deadline="Dec 2028", color="#F59E0B", icon="🏠"),
]

EMI_SEED = [
    dict(name="Car Loan — Maruti", bank="HDFC Bank",  emi=9500, outstanding=342000, total_loan=500000, end_date="Jun 2029"),
    dict(name="Personal Loan",     bank="ICICI Bank", emi=5200, outstanding=124800, total_loan=200000, end_date="Nov 2027"),
]


def seed_if_empty(db: Session) -> None:
    if db.query(Transaction).count() == 0:
        db.bulk_insert_mappings(Transaction, TRANSACTION_SEED)
    if db.query(Investment).count() == 0:
        db.bulk_insert_mappings(Investment, INVESTMENT_SEED)
    if db.query(BudgetCategory).count() == 0:
        db.bulk_insert_mappings(BudgetCategory, BUDGET_SEED)
    if db.query(Goal).count() == 0:
        db.bulk_insert_mappings(Goal, GOAL_SEED)
    if db.query(EMI).count() == 0:
        db.bulk_insert_mappings(EMI, EMI_SEED)
    db.commit()
