/**
 * Compliance Service
 * 
 * Enforces risk category compliance for positions:
 * 1. Every ticker must be classified in the Universal Holdings library
 * 2. Account must have allocation for the ticker's risk level
 * 3. Adding position must not exceed the account's risk category allocation
 */

import { storage } from "./storage";
import { 
  RiskLevel, 
  RiskAllocation, 
  getRiskAllocationFromAccount,
  getRiskLevelAllocationKey,
  RISK_LEVEL_LABELS,
} from "@shared/riskConfig";

export interface ComplianceCheckResult {
  compliant: boolean;
  ticker: string;
  errors: string[];
  warnings: string[];
  details: {
    tickerInLibrary: boolean;
    tickerRiskLevel?: RiskLevel;
    riskLevelAllowed?: boolean;
    accountAllocation?: RiskAllocation;
    currentCategoryWeight?: number;
    projectedCategoryWeight?: number;
    categoryAllocationLimit?: number;
  };
}

export interface ComplianceCheckParams {
  ticker: string;
  accountId: string;
  accountType: 'individual' | 'corporate' | 'joint';
  positionValue: number; // Dollar value of position being added
}

/**
 * Check if a position can be added to an account based on risk compliance rules
 */
export async function checkPositionCompliance(
  params: ComplianceCheckParams
): Promise<ComplianceCheckResult> {
  const { ticker, accountId, accountType, positionValue } = params;
  const errors: string[] = [];
  const warnings: string[] = [];
  const details: ComplianceCheckResult['details'] = {
    tickerInLibrary: false,
  };

  // Step 1: Check if ticker is in the Universal Holdings library
  const holding = await storage.getUniversalHoldingByTicker(ticker.toUpperCase());
  
  if (!holding) {
    details.tickerInLibrary = false;
    errors.push(`Ticker "${ticker}" is not in the Holdings Library. Please add it with a risk classification before creating this position.`);
    return {
      compliant: false,
      ticker,
      errors,
      warnings,
      details,
    };
  }

  details.tickerInLibrary = true;
  details.tickerRiskLevel = holding.riskLevel as RiskLevel;

  // Step 2: Get the account and its risk allocations
  let account: any;
  if (accountType === 'individual') {
    account = await storage.getIndividualAccount(accountId);
  } else if (accountType === 'corporate') {
    account = await storage.getCorporateAccount(accountId);
  } else {
    account = await storage.getJointAccount(accountId);
  }

  if (!account) {
    errors.push('Account not found');
    return { compliant: false, ticker, errors, warnings, details };
  }

  const allocation = getRiskAllocationFromAccount(account);
  details.accountAllocation = allocation;

  // Step 3: Check if account has allocation for this risk level
  const riskLevel = holding.riskLevel as RiskLevel;
  const allocationKey = getRiskLevelAllocationKey(riskLevel);
  const categoryLimit = allocation[allocationKey];
  details.categoryAllocationLimit = categoryLimit;

  if (categoryLimit === 0) {
    details.riskLevelAllowed = false;
    errors.push(
      `This account has 0% allocation for ${RISK_LEVEL_LABELS[riskLevel]} risk. ` +
      `"${ticker}" is classified as ${RISK_LEVEL_LABELS[riskLevel]} risk and cannot be added.`
    );
    return { compliant: false, ticker, errors, warnings, details };
  }

  details.riskLevelAllowed = true;

  // Step 4: Calculate current weight and projected weight for this risk category
  let positions: any[] = [];
  if (accountType === 'individual') {
    positions = await storage.getPositionsByIndividualAccount(accountId);
  } else if (accountType === 'corporate') {
    positions = await storage.getPositionsByCorporateAccount(accountId);
  } else {
    positions = await storage.getPositionsByJointAccount(accountId);
  }

  // Get all tickers' risk levels
  const tickerRiskLevels = new Map<string, RiskLevel>();
  for (const pos of positions) {
    const posHolding = await storage.getUniversalHoldingByTicker(pos.symbol);
    if (posHolding) {
      tickerRiskLevels.set(pos.symbol, posHolding.riskLevel as RiskLevel);
    }
  }

  // Calculate total portfolio value and category weights
  let totalValue = 0;
  const categoryValues: Record<string, number> = {
    low: 0,
    lowMedium: 0,
    medium: 0,
    mediumHigh: 0,
    high: 0,
  };

  for (const pos of positions) {
    const posValue = Number(pos.quantity) * Number(pos.currentPrice);
    totalValue += posValue;
    
    const posRiskLevel = tickerRiskLevels.get(pos.symbol);
    if (posRiskLevel) {
      const posKey = getRiskLevelAllocationKey(posRiskLevel);
      categoryValues[posKey] += posValue;
    }
  }

  // Calculate current weight for this risk category
  const currentCategoryValue = categoryValues[allocationKey];
  const currentCategoryWeight = totalValue > 0 
    ? (currentCategoryValue / totalValue) * 100 
    : 0;
  details.currentCategoryWeight = Math.round(currentCategoryWeight * 10) / 10;

  // Calculate projected weight after adding new position
  const newTotalValue = totalValue + positionValue;
  const newCategoryValue = currentCategoryValue + positionValue;
  const projectedWeight = newTotalValue > 0 
    ? (newCategoryValue / newTotalValue) * 100 
    : 100; // If first position, it will be 100% of that category
  details.projectedCategoryWeight = Math.round(projectedWeight * 10) / 10;

  // Step 5: Check if projected weight exceeds allocation
  if (projectedWeight > categoryLimit) {
    const exceededBy = Math.round((projectedWeight - categoryLimit) * 10) / 10;
    errors.push(
      `Adding this position would put ${RISK_LEVEL_LABELS[riskLevel]} risk at ${details.projectedCategoryWeight}%, ` +
      `exceeding your ${categoryLimit}% allocation by ${exceededBy}%.`
    );
    return { compliant: false, ticker, errors, warnings, details };
  }

  // Step 6: Warn if close to limit (within 10% of allocation)
  if (projectedWeight > categoryLimit * 0.9) {
    warnings.push(
      `This position brings ${RISK_LEVEL_LABELS[riskLevel]} risk to ${details.projectedCategoryWeight}%, ` +
      `approaching your ${categoryLimit}% limit.`
    );
  }

  return {
    compliant: true,
    ticker,
    errors,
    warnings,
    details,
  };
}

/**
 * Batch check all positions in an account for compliance
 * Returns list of non-compliant positions
 */
export async function checkAccountCompliance(
  accountId: string,
  accountType: 'individual' | 'corporate' | 'joint'
): Promise<{
  compliant: boolean;
  issues: Array<{
    ticker: string;
    issue: string;
    riskLevel?: RiskLevel;
  }>;
  categoryWeights: Record<string, { current: number; limit: number }>;
}> {
  // Get account
  let account: any;
  if (accountType === 'individual') {
    account = await storage.getIndividualAccount(accountId);
  } else if (accountType === 'corporate') {
    account = await storage.getCorporateAccount(accountId);
  } else {
    account = await storage.getJointAccount(accountId);
  }

  if (!account) {
    return { compliant: false, issues: [{ ticker: '', issue: 'Account not found' }], categoryWeights: {} };
  }

  const allocation = getRiskAllocationFromAccount(account);
  const issues: Array<{ ticker: string; issue: string; riskLevel?: RiskLevel }> = [];

  // Get positions
  let positions: any[] = [];
  if (accountType === 'individual') {
    positions = await storage.getPositionsByIndividualAccount(accountId);
  } else if (accountType === 'corporate') {
    positions = await storage.getPositionsByCorporateAccount(accountId);
  } else {
    positions = await storage.getPositionsByJointAccount(accountId);
  }

  // Calculate weights by category
  let totalValue = 0;
  const categoryValues: Record<string, number> = {
    low: 0,
    lowMedium: 0,
    medium: 0,
    mediumHigh: 0,
    high: 0,
  };

  for (const pos of positions) {
    const posValue = Number(pos.quantity) * Number(pos.currentPrice);
    totalValue += posValue;

    const holding = await storage.getUniversalHoldingByTicker(pos.symbol);
    
    if (!holding) {
      issues.push({
        ticker: pos.symbol,
        issue: 'Not in Holdings Library - unclassified risk',
      });
      continue;
    }

    const riskLevel = holding.riskLevel as RiskLevel;
    const allocationKey = getRiskLevelAllocationKey(riskLevel);
    categoryValues[allocationKey] += posValue;

    // Check if this risk level has 0% allocation
    if (allocation[allocationKey] === 0) {
      issues.push({
        ticker: pos.symbol,
        issue: `${RISK_LEVEL_LABELS[riskLevel]} risk not allowed (0% allocation)`,
        riskLevel,
      });
    }
  }

  // Calculate category weights and check for violations
  const categoryWeights: Record<string, { current: number; limit: number }> = {};
  const riskLevels: RiskLevel[] = ['low', 'low_medium', 'medium', 'medium_high', 'high'];
  const allocationKeys: Array<keyof RiskAllocation> = ['low', 'lowMedium', 'medium', 'mediumHigh', 'high'];

  for (let i = 0; i < riskLevels.length; i++) {
    const riskLevel = riskLevels[i];
    const allocationKey = allocationKeys[i];
    const currentWeight = totalValue > 0 ? (categoryValues[allocationKey] / totalValue) * 100 : 0;
    const limit = allocation[allocationKey];

    categoryWeights[riskLevel] = {
      current: Math.round(currentWeight * 10) / 10,
      limit,
    };

    if (currentWeight > limit && limit > 0) {
      issues.push({
        ticker: '',
        issue: `${RISK_LEVEL_LABELS[riskLevel]} category at ${Math.round(currentWeight)}%, exceeds ${limit}% limit`,
        riskLevel,
      });
    }
  }

  return {
    compliant: issues.length === 0,
    issues,
    categoryWeights,
  };
}

