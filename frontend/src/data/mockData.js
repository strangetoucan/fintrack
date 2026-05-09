export const MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
export const INCOME_DATA  = [95000,98000,95000,102000,105000,98000,110000,108000,105000,112000,115000,118000];
export const EXPENSE_DATA = [72000,68000,75000,70000,82000,69000,78000,73000,71000,76000,80000,74000];
export const SAVINGS_DATA = INCOME_DATA.map((v, i) => v - EXPENSE_DATA[i]);

export const TRANSACTIONS = [
  { id:1,  date:'2026-05-01', desc:'Salary Credit',        category:'Salary',        amount:95000,  type:'income'  },
  { id:2,  date:'2026-05-01', desc:'Zomato',               category:'Food & Dining', amount:-450,   type:'expense' },
  { id:3,  date:'2026-04-30', desc:'Swiggy',               category:'Food & Dining', amount:-320,   type:'expense' },
  { id:4,  date:'2026-04-29', desc:'House Rent',           category:'Rent',          amount:-18000, type:'expense' },
  { id:5,  date:'2026-04-28', desc:'HDFC Savings Interest',category:'Interest',      amount:1200,   type:'income'  },
  { id:6,  date:'2026-04-27', desc:'Electricity Bill',     category:'Utilities',     amount:-2100,  type:'expense' },
  { id:7,  date:'2026-04-26', desc:'Netflix',              category:'Entertainment', amount:-649,   type:'expense' },
  { id:8,  date:'2026-04-25', desc:'Groww SIP — Nifty 50', category:'Investment',   amount:-5000,  type:'expense' },
  { id:9,  date:'2026-04-24', desc:'Grocery — DMart',      category:'Groceries',    amount:-3200,  type:'expense' },
  { id:10, date:'2026-04-23', desc:'Petrol — HP',          category:'Transport',    amount:-2400,  type:'expense' },
  { id:11, date:'2026-04-22', desc:'Freelance Project',    category:'Freelance',    amount:15000,  type:'income'  },
  { id:12, date:'2026-04-20', desc:'Amazon — Shoes',       category:'Shopping',     amount:-2999,  type:'expense' },
  { id:13, date:'2026-04-18', desc:'LIC Premium',          category:'Insurance',    amount:-4500,  type:'expense' },
  { id:14, date:'2026-04-15', desc:'Doctor Visit',         category:'Healthcare',   amount:-800,   type:'expense' },
  { id:15, date:'2026-04-12', desc:'Jio Recharge',         category:'Utilities',    amount:-299,   type:'expense' },
];

export const BUDGET_CATS = [
  { name:'Rent',          budget:18000, spent:18000, color:'#3B82F6' },
  { name:'Groceries',     budget:5000,  spent:3200,  color:'#22C55E' },
  { name:'Food & Dining', budget:4000,  spent:3870,  color:'#F59E0B' },
  { name:'Transport',     budget:3000,  spent:2400,  color:'#A78BFA' },
  { name:'Utilities',     budget:3500,  spent:2399,  color:'#06B6D4' },
  { name:'Entertainment', budget:1500,  spent:649,   color:'#EC4899' },
  { name:'Shopping',      budget:3000,  spent:2999,  color:'#F97316' },
  { name:'Healthcare',    budget:2000,  spent:800,   color:'#10B981' },
  { name:'Insurance',     budget:5000,  spent:4500,  color:'#6366F1' },
];

export const INVESTMENTS = [
  { name:'Nifty 50 Index Fund',       type:'MF',    platform:'Groww',   invested:120000, current:148500, sip:5000, returns:23.75 },
  { name:'HDFC Mid Cap Opp.',         type:'MF',    platform:'Groww',   invested:80000,  current:99200,  sip:3000, returns:24.0  },
  { name:'Parag Parikh Flexi Cap',    type:'MF',    platform:'Zerodha', invested:60000,  current:74100,  sip:2000, returns:23.5  },
  { name:'Infosys',                   type:'Stock', platform:'Zerodha', invested:45000,  current:52650,  sip:null, returns:17.0  },
  { name:'TCS',                       type:'Stock', platform:'Zerodha', invested:38000,  current:41800,  sip:null, returns:10.0  },
  { name:'SBI FD — 1yr',             type:'FD',    platform:'SBI',     invested:200000, current:214000, sip:null, returns:7.0   },
  { name:'PPF Account',               type:'PPF',   platform:'SBI',     invested:500000, current:580000, sip:null, returns:7.1   },
];

export const GOALS = [
  { name:'Emergency Fund',    target:300000,  current:180000, deadline:'Dec 2026', color:'#22C55E', icon:'🛡' },
  { name:'Europe Trip',       target:150000,  current:45000,  deadline:'Mar 2027', color:'#3B82F6', icon:'✈' },
  { name:'New Laptop',        target:120000,  current:80000,  deadline:'Aug 2026', color:'#A78BFA', icon:'💻' },
  { name:'House Down Payment',target:2000000, current:350000, deadline:'Dec 2028', color:'#F59E0B', icon:'🏠' },
];

export const EMIS = [
  { name:'Car Loan — Maruti', bank:'HDFC Bank',  emi:9500, outstanding:342000, totalLoan:500000, endDate:'Jun 2029' },
  { name:'Personal Loan',     bank:'ICICI Bank', emi:5200, outstanding:124800, totalLoan:200000, endDate:'Nov 2027' },
];
