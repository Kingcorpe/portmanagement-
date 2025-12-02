// Demo data for prospect demonstrations
// All data is fictional and used to showcase PracticeOS capabilities

export const demoHouseholds = [
  {
    id: "demo-household-1",
    name: "Thompson Family",
    category: "anchor",
    notes: "Long-term clients since 2018. Focus on retirement planning and estate preservation.",
    createdAt: new Date("2018-03-15").toISOString(),
    deletedAt: null,
    userId: "demo-user",
  },
  {
    id: "demo-household-2", 
    name: "Chen Corporation",
    category: "evergreen",
    notes: "Corporate account for Chen Medical Group. IPP and corporate investment focus.",
    createdAt: new Date("2020-06-01").toISOString(),
    deletedAt: null,
    userId: "demo-user",
  },
  {
    id: "demo-household-3",
    name: "Williams & Partners",
    category: "pulse",
    notes: "Active traders. Require frequent rebalancing and alert monitoring.",
    createdAt: new Date("2021-09-20").toISOString(),
    deletedAt: null,
    userId: "demo-user",
  },
  {
    id: "demo-household-4",
    name: "Patel Joint Account",
    category: "emerging_anchor",
    notes: "Young family with RESP and joint investment goals.",
    createdAt: new Date("2022-11-10").toISOString(),
    deletedAt: null,
    userId: "demo-user",
  },
];

export const demoIndividuals = [
  {
    id: "demo-individual-1",
    householdId: "demo-household-1",
    firstName: "Robert",
    lastName: "Thompson",
    email: "robert.thompson@email.com",
    phone: "416-555-0101",
    dateOfBirth: "1958-04-22",
    spouseDateOfBirth: "1960-08-15",
    notes: "Primary decision maker. Conservative risk tolerance.",
  },
  {
    id: "demo-individual-2",
    householdId: "demo-household-1",
    firstName: "Margaret",
    lastName: "Thompson",
    email: "margaret.thompson@email.com",
    phone: "416-555-0102",
    dateOfBirth: "1960-08-15",
    spouseDateOfBirth: "1958-04-22",
    notes: "Prefers income-focused investments.",
  },
  {
    id: "demo-individual-3",
    householdId: "demo-household-3",
    firstName: "David",
    lastName: "Williams",
    email: "david.williams@email.com",
    phone: "647-555-0201",
    dateOfBirth: "1975-12-03",
    spouseDateOfBirth: null,
    notes: "Tech sector focus. Higher risk tolerance.",
  },
  {
    id: "demo-individual-4",
    householdId: "demo-household-4",
    firstName: "Priya",
    lastName: "Patel",
    email: "priya.patel@email.com",
    phone: "905-555-0301",
    dateOfBirth: "1988-06-17",
    spouseDateOfBirth: "1986-09-25",
    notes: "Growing family. RESP contributions priority.",
  },
  {
    id: "demo-individual-5",
    householdId: "demo-household-4",
    firstName: "Raj",
    lastName: "Patel",
    email: "raj.patel@email.com",
    phone: "905-555-0302",
    dateOfBirth: "1986-09-25",
    spouseDateOfBirth: "1988-06-17",
    notes: "Software engineer. Interested in tech investments.",
  },
];

export const demoCorporations = [
  {
    id: "demo-corporation-1",
    householdId: "demo-household-2",
    name: "Chen Medical Group Inc.",
    businessNumber: "123456789RC0001",
    yearEnd: "December",
    notes: "Professional corporation. Focus on tax-efficient corporate investing.",
  },
];

// Individual accounts (TFSA, RRSP, RIF, LIRA, LIF, FHSA, Cash)
export const demoIndividualAccounts = [
  // Thompson Family accounts
  {
    id: "demo-account-tfsa-1",
    individualId: "demo-individual-1",
    accountType: "tfsa",
    accountNumber: "TFSA-001-RT",
    custodian: "TD Direct Investing",
    notes: "Maxed contributions",
  },
  {
    id: "demo-account-rrsp-1",
    individualId: "demo-individual-1",
    accountType: "rrsp",
    accountNumber: "RRSP-001-RT",
    custodian: "TD Direct Investing",
    notes: "Converting to RIF next year",
  },
  {
    id: "demo-account-rif-1",
    individualId: "demo-individual-2",
    accountType: "rif",
    accountNumber: "RIF-001-MT",
    custodian: "RBC Direct Investing",
    notes: "Minimum withdrawal schedule active",
  },
  {
    id: "demo-account-tfsa-2",
    individualId: "demo-individual-2",
    accountType: "tfsa",
    accountNumber: "TFSA-002-MT",
    custodian: "RBC Direct Investing",
    notes: null,
  },
  // Williams accounts
  {
    id: "demo-account-tfsa-3",
    individualId: "demo-individual-3",
    accountType: "tfsa",
    accountNumber: "TFSA-003-DW",
    custodian: "Questrade",
    notes: "Active trading account",
  },
  {
    id: "demo-account-rrsp-2",
    individualId: "demo-individual-3",
    accountType: "rrsp",
    accountNumber: "RRSP-002-DW",
    custodian: "Questrade",
    notes: "Growth focused",
  },
  {
    id: "demo-account-fhsa-1",
    individualId: "demo-individual-3",
    accountType: "fhsa",
    accountNumber: "FHSA-001-DW",
    custodian: "Questrade",
    notes: "New FHSA - first home savings",
  },
  // Patel accounts
  {
    id: "demo-account-tfsa-4",
    individualId: "demo-individual-4",
    accountType: "tfsa",
    accountNumber: "TFSA-004-PP",
    custodian: "Wealthsimple",
    notes: null,
  },
  {
    id: "demo-account-rrsp-3",
    individualId: "demo-individual-4",
    accountType: "rrsp",
    accountNumber: "RRSP-003-PP",
    custodian: "Wealthsimple",
    notes: null,
  },
  {
    id: "demo-account-tfsa-5",
    individualId: "demo-individual-5",
    accountType: "tfsa",
    accountNumber: "TFSA-005-RP",
    custodian: "Wealthsimple",
    notes: null,
  },
];

// Corporate accounts (Cash, IPP)
export const demoCorporateAccounts = [
  {
    id: "demo-account-corp-cash-1",
    corporationId: "demo-corporation-1",
    accountType: "cash",
    accountNumber: "CORP-001-CMG",
    custodian: "BMO Nesbitt Burns",
    notes: "Main corporate investment account",
  },
  {
    id: "demo-account-ipp-1",
    corporationId: "demo-corporation-1",
    accountType: "ipp",
    accountNumber: "IPP-001-CMG",
    custodian: "BMO Nesbitt Burns",
    notes: "Individual Pension Plan for Dr. Chen",
  },
];

// Joint accounts (Joint Cash, RESP)
export const demoJointAccounts = [
  {
    id: "demo-account-resp-1",
    accountType: "resp",
    accountNumber: "RESP-001-PATEL",
    custodian: "TD Direct Investing",
    notes: "Family RESP for children's education",
  },
  {
    id: "demo-account-joint-1",
    accountType: "joint_cash",
    accountNumber: "JOINT-001-THOMPSON",
    custodian: "TD Direct Investing",
    notes: "Joint non-registered account",
  },
];

// Joint account members linking
export const demoJointAccountMembers = [
  { jointAccountId: "demo-account-resp-1", individualId: "demo-individual-4" },
  { jointAccountId: "demo-account-resp-1", individualId: "demo-individual-5" },
  { jointAccountId: "demo-account-joint-1", individualId: "demo-individual-1" },
  { jointAccountId: "demo-account-joint-1", individualId: "demo-individual-2" },
];

// Positions (holdings)
export const demoPositions = [
  // Thompson TFSA
  { id: "demo-pos-1", accountId: "demo-account-tfsa-1", accountType: "individual", symbol: "XIC.TO", quantity: "500", currentPrice: "35.42", averageCost: "32.15", notes: null },
  { id: "demo-pos-2", accountId: "demo-account-tfsa-1", accountType: "individual", symbol: "VFV.TO", quantity: "300", currentPrice: "118.50", averageCost: "105.20", notes: null },
  { id: "demo-pos-3", accountId: "demo-account-tfsa-1", accountType: "individual", symbol: "CASH", quantity: "5000", currentPrice: "1.00", averageCost: "1.00", notes: "Emergency reserve" },
  
  // Thompson RRSP
  { id: "demo-pos-4", accountId: "demo-account-rrsp-1", accountType: "individual", symbol: "ZAG.TO", quantity: "800", currentPrice: "14.25", averageCost: "15.80", notes: null },
  { id: "demo-pos-5", accountId: "demo-account-rrsp-1", accountType: "individual", symbol: "XEI.TO", quantity: "600", currentPrice: "24.80", averageCost: "22.50", notes: null },
  { id: "demo-pos-6", accountId: "demo-account-rrsp-1", accountType: "individual", symbol: "TD.TO", quantity: "200", currentPrice: "82.35", averageCost: "78.90", notes: null },
  
  // Margaret RIF
  { id: "demo-pos-7", accountId: "demo-account-rif-1", accountType: "individual", symbol: "ENB.TO", quantity: "400", currentPrice: "48.75", averageCost: "45.20", notes: null },
  { id: "demo-pos-8", accountId: "demo-account-rif-1", accountType: "individual", symbol: "BCE.TO", quantity: "300", currentPrice: "46.90", averageCost: "52.15", notes: null },
  { id: "demo-pos-9", accountId: "demo-account-rif-1", accountType: "individual", symbol: "FTS.TO", quantity: "250", currentPrice: "56.40", averageCost: "54.80", notes: null },
  
  // Williams TFSA (tech focus)
  { id: "demo-pos-10", accountId: "demo-account-tfsa-3", accountType: "individual", symbol: "SHOP.TO", quantity: "50", currentPrice: "105.20", averageCost: "85.50", notes: null },
  { id: "demo-pos-11", accountId: "demo-account-tfsa-3", accountType: "individual", symbol: "CSU.TO", quantity: "10", currentPrice: "4250.00", averageCost: "3800.00", notes: null },
  { id: "demo-pos-12", accountId: "demo-account-tfsa-3", accountType: "individual", symbol: "NVDA", quantity: "30", currentPrice: "142.50", averageCost: "95.20", notes: "US listed" },
  
  // Williams RRSP
  { id: "demo-pos-13", accountId: "demo-account-rrsp-2", accountType: "individual", symbol: "XQQ.TO", quantity: "200", currentPrice: "145.80", averageCost: "120.50", notes: null },
  { id: "demo-pos-14", accountId: "demo-account-rrsp-2", accountType: "individual", symbol: "TEC.TO", quantity: "150", currentPrice: "42.35", averageCost: "38.90", notes: null },
  
  // Chen Corporate Cash
  { id: "demo-pos-15", accountId: "demo-account-corp-cash-1", accountType: "corporate", symbol: "ZWC.TO", quantity: "2000", currentPrice: "16.85", averageCost: "17.50", notes: "Covered call strategy" },
  { id: "demo-pos-16", accountId: "demo-account-corp-cash-1", accountType: "corporate", symbol: "XDV.TO", quantity: "1500", currentPrice: "28.40", averageCost: "26.80", notes: null },
  { id: "demo-pos-17", accountId: "demo-account-corp-cash-1", accountType: "corporate", symbol: "CASH", quantity: "50000", currentPrice: "1.00", averageCost: "1.00", notes: "Operating reserve" },
  
  // Chen IPP
  { id: "demo-pos-18", accountId: "demo-account-ipp-1", accountType: "corporate", symbol: "VBAL.TO", quantity: "1000", currentPrice: "28.95", averageCost: "27.50", notes: "Balanced allocation" },
  { id: "demo-pos-19", accountId: "demo-account-ipp-1", accountType: "corporate", symbol: "XBB.TO", quantity: "800", currentPrice: "19.25", averageCost: "20.80", notes: null },
  
  // Patel RESP
  { id: "demo-pos-20", accountId: "demo-account-resp-1", accountType: "joint", symbol: "XEQT.TO", quantity: "300", currentPrice: "28.45", averageCost: "25.80", notes: "Long-term growth" },
  { id: "demo-pos-21", accountId: "demo-account-resp-1", accountType: "joint", symbol: "CASH", quantity: "2500", currentPrice: "1.00", averageCost: "1.00", notes: "CESG pending" },
  
  // Thompson Joint
  { id: "demo-pos-22", accountId: "demo-account-joint-1", accountType: "joint", symbol: "RY.TO", quantity: "150", currentPrice: "135.80", averageCost: "125.40", notes: null },
  { id: "demo-pos-23", accountId: "demo-account-joint-1", accountType: "joint", symbol: "CNR.TO", quantity: "100", currentPrice: "165.25", averageCost: "158.90", notes: null },
];

// Target allocations for demo accounts
export const demoTargetAllocations = [
  // Thompson TFSA targets
  { id: "demo-target-1", accountId: "demo-account-tfsa-1", accountType: "individual", symbol: "XIC.TO", targetPercentage: "40", riskLevel: "medium" },
  { id: "demo-target-2", accountId: "demo-account-tfsa-1", accountType: "individual", symbol: "VFV.TO", targetPercentage: "40", riskLevel: "medium" },
  { id: "demo-target-3", accountId: "demo-account-tfsa-1", accountType: "individual", symbol: "ZAG.TO", targetPercentage: "15", riskLevel: "low" },
  { id: "demo-target-4", accountId: "demo-account-tfsa-1", accountType: "individual", symbol: "CASH", targetPercentage: "5", riskLevel: "cash" },
  
  // Williams TFSA targets (growth)
  { id: "demo-target-5", accountId: "demo-account-tfsa-3", accountType: "individual", symbol: "SHOP.TO", targetPercentage: "25", riskLevel: "high" },
  { id: "demo-target-6", accountId: "demo-account-tfsa-3", accountType: "individual", symbol: "CSU.TO", targetPercentage: "30", riskLevel: "high" },
  { id: "demo-target-7", accountId: "demo-account-tfsa-3", accountType: "individual", symbol: "NVDA", targetPercentage: "25", riskLevel: "high" },
  { id: "demo-target-8", accountId: "demo-account-tfsa-3", accountType: "individual", symbol: "CASH", targetPercentage: "20", riskLevel: "cash" },
];

// Demo trading alerts
export const demoAlerts = [
  {
    id: "demo-alert-1",
    ticker: "XIC.TO",
    alertType: "BUY",
    price: "35.20",
    message: "TradingView: XIC.TO crossed above 50-day MA",
    status: "pending",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    executedAt: null,
  },
  {
    id: "demo-alert-2",
    ticker: "SHOP.TO",
    alertType: "BUY",
    price: "104.50",
    message: "TradingView: SHOP.TO RSI oversold bounce",
    status: "pending",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    executedAt: null,
  },
  {
    id: "demo-alert-3",
    ticker: "ENB.TO",
    alertType: "SELL",
    price: "49.10",
    message: "TradingView: ENB.TO approaching resistance",
    status: "executed",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    executedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo tasks
export const demoTasks = [
  {
    id: "demo-task-1",
    accountId: "demo-account-rif-1",
    accountType: "individual",
    title: "Process RIF minimum withdrawal",
    description: "Calculate and process December RIF minimum withdrawal for Margaret Thompson",
    status: "pending",
    priority: "high",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-task-2",
    accountId: "demo-account-rrsp-1",
    accountType: "individual",
    title: "RRSP to RIF conversion discussion",
    description: "Schedule meeting with Robert to discuss RRSP to RIF conversion strategy",
    status: "in_progress",
    priority: "medium",
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-task-3",
    accountId: "demo-account-resp-1",
    accountType: "joint",
    title: "RESP contribution reminder",
    description: "Remind Patel family about annual RESP contribution deadline for CESG matching",
    status: "pending",
    priority: "urgent",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-task-4",
    accountId: "demo-account-ipp-1",
    accountType: "corporate",
    title: "IPP actuarial valuation",
    description: "Coordinate with actuary for annual IPP valuation report",
    status: "pending",
    priority: "medium",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo insurance revenue entries
export const demoInsuranceRevenue = [
  {
    id: "demo-ins-rev-1",
    userId: null,
    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    clientName: "Thompson, Robert",
    policyType: "T20",
    carrier: "Sun Life",
    policyNumber: "SL-2024-001",
    premium: "5400.00",
    commissionRate: "45",
    commissionAmount: "6929.10",
    status: "received",
    notes: "20-year term life policy - annual premium",
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-ins-rev-2",
    userId: null,
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    clientName: "Chen, David",
    policyType: "Layered WL",
    carrier: "Manulife",
    policyNumber: "ML-2024-042",
    premium: "14400.00",
    commissionRate: "55",
    commissionAmount: "22572.00",
    status: "pending",
    notes: "Whole life with term rider - annual premium",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-ins-rev-3",
    userId: null,
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    clientName: "Williams, David",
    policyType: "CI",
    carrier: "Canada Life",
    policyNumber: null,
    premium: "3360.00",
    commissionRate: "40",
    commissionAmount: "3830.40",
    status: "planned",
    notes: "Critical illness coverage - pending medical",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo investment revenue entries
export const demoInvestmentRevenue = [
  {
    id: "demo-inv-rev-1",
    userId: null,
    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    entryType: "dividend",
    amount: "245.00",
    sourceName: "Thompson Family - TD.TO",
    accountType: "RRSP",
    description: "Q4 dividend payment from TD Bank",
    status: "received",
    notes: null,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-inv-rev-2",
    userId: null,
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    entryType: "new_aum",
    amount: "15000.00",
    sourceName: "Patel Family",
    accountType: "RESP",
    description: "New RESP contribution for education savings",
    status: "received",
    notes: "Annual RESP contribution to maximize CESG",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-inv-rev-3",
    userId: null,
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    entryType: "dividend",
    amount: "680.50",
    sourceName: "Chen Corporation - ZWC.TO",
    accountType: "Corporate Cash",
    description: "Monthly covered call ETF distribution",
    status: "pending",
    notes: "Pending deposit confirmation",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-inv-rev-4",
    userId: null,
    date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    entryType: "new_aum",
    amount: "50000.00",
    sourceName: "Williams Family",
    accountType: "TFSA",
    description: "TFSA transfer from another institution",
    status: "planned",
    notes: "Transfer in progress - expected 2 weeks",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Demo KPI objectives
const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
export const demoKpiObjectives = [
  {
    id: "demo-kpi-1",
    userId: null,
    month: currentMonth,
    title: "Client Review Meetings",
    description: "* Complete quarterly reviews for all Anchor households\n* Document investment performance and rebalancing recommendations\n* Update financial plans as needed",
    type: "business",
    targetMetric: "8 reviews",
    status: "in_progress",
    assignedTo: null,
    dailyTrackerMode: "business_days",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-kpi-2",
    userId: null,
    month: currentMonth,
    title: "New Business Development",
    description: "* Reach out to 5 potential referral sources\n* Schedule 2 discovery meetings with prospects\n* Follow up on pending insurance applications",
    type: "business",
    targetMetric: "2 new clients",
    status: "planned",
    assignedTo: null,
    dailyTrackerMode: "business_days",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-kpi-3",
    userId: null,
    month: currentMonth,
    title: "Tax Planning Initiatives",
    description: "* Review TFSA contribution room for all clients\n* Identify RRSP optimization opportunities\n* Coordinate with accountants on year-end strategies",
    type: "business",
    targetMetric: null,
    status: "completed",
    assignedTo: null,
    dailyTrackerMode: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-kpi-4",
    userId: null,
    month: currentMonth,
    title: "Personal Development",
    description: "* Complete CFP continuing education module\n* Attend industry webinar on estate planning\n* Read one finance book",
    type: "personal",
    targetMetric: "3 activities",
    status: "in_progress",
    assignedTo: null,
    dailyTrackerMode: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Demo reference links
export const demoReferenceLinks = [
  {
    id: "demo-link-1",
    title: "MoneyTrax Members",
    url: "https://moneytrax.ca",
    icon: "circle",
    category: "planning",
  },
  {
    id: "demo-link-2",
    title: "CRA My Business Account",
    url: "https://www.canada.ca/en/revenue-agency/services/e-services/business-account.html",
    icon: "building",
    category: "tax",
  },
  {
    id: "demo-link-3",
    title: "TradingView Charts",
    url: "https://www.tradingview.com",
    icon: "chart",
    category: "research",
  },
];

// Helper function to get account with positions and calculated balance
export function enrichAccountWithPositions(account: any, positions: any[]) {
  const accountPositions = positions.filter(p => p.accountId === account.id);
  const balance = accountPositions.reduce((sum, pos) => {
    return sum + (parseFloat(pos.quantity) * parseFloat(pos.currentPrice));
  }, 0);
  
  return {
    ...account,
    positions: accountPositions,
    balance: balance.toFixed(2),
  };
}

// Get full demo household data structure matching the real API response
export function getDemoHouseholdsFullData() {
  return demoHouseholds.map(household => {
    const individuals = demoIndividuals
      .filter(ind => ind.householdId === household.id)
      .map(individual => {
        const accounts = demoIndividualAccounts
          .filter(acc => acc.individualId === individual.id)
          .map(acc => enrichAccountWithPositions(acc, demoPositions));
        return { ...individual, accounts };
      });

    const corporations = demoCorporations
      .filter(corp => corp.householdId === household.id)
      .map(corporation => {
        const accounts = demoCorporateAccounts
          .filter(acc => acc.corporationId === corporation.id)
          .map(acc => enrichAccountWithPositions(acc, demoPositions));
        return { ...corporation, accounts };
      });

    const jointAccounts = demoJointAccounts
      .filter(ja => {
        const members = demoJointAccountMembers.filter(m => m.jointAccountId === ja.id);
        const memberIndividualIds = members.map(m => m.individualId);
        return individuals.some(ind => memberIndividualIds.includes(ind.id));
      })
      .map(acc => {
        const enriched = enrichAccountWithPositions(acc, demoPositions);
        const members = demoJointAccountMembers
          .filter(m => m.jointAccountId === acc.id)
          .map(m => demoIndividuals.find(ind => ind.id === m.individualId));
        return { ...enriched, members };
      });

    // Calculate total household value
    const totalValue = [
      ...individuals.flatMap(i => i.accounts),
      ...corporations.flatMap(c => c.accounts),
      ...jointAccounts,
    ].reduce((sum, acc) => sum + parseFloat(acc.balance || "0"), 0);

    return {
      ...household,
      individuals,
      corporations,
      jointAccounts,
      totalValue: totalValue.toFixed(2),
    };
  });
}

// Get demo alerts with affected accounts info
export function getDemoAlertsWithAccounts() {
  return demoAlerts.map(alert => {
    // Find accounts that hold or have targets for this ticker
    const affectedAccounts: any[] = [];
    
    demoPositions
      .filter(pos => pos.symbol === alert.ticker)
      .forEach(pos => {
        const account = [...demoIndividualAccounts, ...demoCorporateAccounts, ...demoJointAccounts]
          .find(acc => acc.id === pos.accountId);
        if (account) {
          const target = demoTargetAllocations.find(t => 
            t.accountId === account.id && t.symbol === alert.ticker
          );
          affectedAccounts.push({
            account,
            position: pos,
            targetAllocation: target,
          });
        }
      });

    return {
      ...alert,
      affectedAccounts,
    };
  });
}

// Get demo tasks organized by account
export function getDemoTasksWithContext() {
  return demoTasks.map(task => {
    const account = [...demoIndividualAccounts, ...demoCorporateAccounts, ...demoJointAccounts]
      .find(acc => acc.id === task.accountId);
    
    let ownerName = "Unknown";
    if (account) {
      if (task.accountType === "individual") {
        const individual = demoIndividuals.find(ind => 
          demoIndividualAccounts.some(acc => acc.id === task.accountId && acc.individualId === ind.id)
        );
        if (individual) ownerName = `${individual.firstName} ${individual.lastName}`;
      } else if (task.accountType === "corporate") {
        const corp = demoCorporations.find(c =>
          demoCorporateAccounts.some(acc => acc.id === task.accountId && acc.corporationId === c.id)
        );
        if (corp) ownerName = corp.name;
      } else if (task.accountType === "joint") {
        const members = demoJointAccountMembers
          .filter(m => m.jointAccountId === task.accountId)
          .map(m => demoIndividuals.find(ind => ind.id === m.individualId))
          .filter(Boolean);
        if (members.length > 0) {
          ownerName = members.map(m => m!.lastName).join(" & ");
        }
      }
    }

    return {
      ...task,
      account,
      ownerName,
    };
  });
}

// Key metrics summary for demo mode
export function getDemoKeyMetrics() {
  const allAccounts = [
    ...demoIndividualAccounts.map(a => enrichAccountWithPositions(a, demoPositions)),
    ...demoCorporateAccounts.map(a => enrichAccountWithPositions(a, demoPositions)),
    ...demoJointAccounts.map(a => enrichAccountWithPositions(a, demoPositions)),
  ];

  const totalAUM = allAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
  
  const individualAUM = demoIndividualAccounts
    .map(a => enrichAccountWithPositions(a, demoPositions))
    .reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
  
  const corporateAUM = demoCorporateAccounts
    .map(a => enrichAccountWithPositions(a, demoPositions))
    .reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
  
  const jointAUM = demoJointAccounts
    .map(a => enrichAccountWithPositions(a, demoPositions))
    .reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

  return {
    totalAUM,
    individualAUM,
    corporateAUM,
    jointAUM,
    householdCount: demoHouseholds.length,
    accountCount: allAccounts.length,
    pendingTasks: demoTasks.filter(t => t.status === "pending").length,
    pendingAlerts: demoAlerts.filter(a => a.status === "pending").length,
  };
}
