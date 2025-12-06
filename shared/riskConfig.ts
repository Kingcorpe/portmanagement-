// Risk levels matching the universalHoldings riskLevel enum
export type RiskLevel = "low" | "low_medium" | "medium" | "medium_high" | "high";
export type HoldingCategory = "basket_etf" | "single_etf" | "double_long_etf" | "leveraged_etf" | "security" | "auto_added" | "misc";

export interface RiskAllocation {
  low: number;
  lowMedium: number;
  medium: number;
  mediumHigh: number;
  high: number;
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  low_medium: "Low/Med",
  medium: "Medium",
  medium_high: "Med/High",
  high: "High",
};

export const RISK_LEVEL_DESCRIPTIONS: Record<RiskLevel, string> = {
  low: "Conservative - Fixed income, bonds, money market funds",
  low_medium: "Moderate - Balanced ETFs with lower volatility",
  medium: "Balanced - Mix of growth and stability with some higher-risk holdings allowed",
  medium_high: "Growth-focused - Significant exposure to higher-risk assets",
  high: "Aggressive - Maximum risk, suitable for experienced investors",
};

export const CATEGORY_RISK_SCORES: Record<HoldingCategory, number> = {
  basket_etf: 1,
  single_etf: 2,
  misc: 2,
  auto_added: 2,
  security: 3,
  leveraged_etf: 4,
  double_long_etf: 4,
};

export const CATEGORY_TO_RISK_LEVEL: Record<HoldingCategory, RiskLevel> = {
  basket_etf: "low_medium",
  single_etf: "medium",
  misc: "medium",
  auto_added: "medium",
  security: "medium_high",
  leveraged_etf: "high",
  double_long_etf: "high",
};

export const CATEGORY_LABELS: Record<HoldingCategory, string> = {
  basket_etf: "Basket ETF",
  single_etf: "Single ETF",
  double_long_etf: "Double Long",
  leveraged_etf: "Leveraged ETF",
  security: "Security",
  auto_added: "Auto Added",
  misc: "Misc",
};

export type RiskLimits = {
  double_long_etf: number;
  leveraged_etf: number;
  security: number;
  single_etf: number;
};

export const RISK_LIMITS_BY_LEVEL: Record<RiskLevel, RiskLimits> = {
  low: {
    double_long_etf: 0,
    leveraged_etf: 0,
    security: 0,
    single_etf: 10,
  },
  low_medium: {
    double_long_etf: 0,
    leveraged_etf: 0,
    security: 10,
    single_etf: 30,
  },
  medium: {
    double_long_etf: 10,
    leveraged_etf: 10,
    security: 30,
    single_etf: 50,
  },
  medium_high: {
    double_long_etf: 25,
    leveraged_etf: 25,
    security: 50,
    single_etf: 100,
  },
  high: {
    double_long_etf: 100,
    leveraged_etf: 100,
    security: 100,
    single_etf: 100,
  },
};

export function calculateBlendedLimits(allocation: RiskAllocation): RiskLimits {
  const lowPct = allocation.low / 100;
  const lowMediumPct = allocation.lowMedium / 100;
  const mediumPct = allocation.medium / 100;
  const mediumHighPct = allocation.mediumHigh / 100;
  const highPct = allocation.high / 100;

  return {
    double_long_etf: 
      RISK_LIMITS_BY_LEVEL.low.double_long_etf * lowPct +
      RISK_LIMITS_BY_LEVEL.low_medium.double_long_etf * lowMediumPct +
      RISK_LIMITS_BY_LEVEL.medium.double_long_etf * mediumPct +
      RISK_LIMITS_BY_LEVEL.medium_high.double_long_etf * mediumHighPct +
      RISK_LIMITS_BY_LEVEL.high.double_long_etf * highPct,
    leveraged_etf: 
      RISK_LIMITS_BY_LEVEL.low.leveraged_etf * lowPct +
      RISK_LIMITS_BY_LEVEL.low_medium.leveraged_etf * lowMediumPct +
      RISK_LIMITS_BY_LEVEL.medium.leveraged_etf * mediumPct +
      RISK_LIMITS_BY_LEVEL.medium_high.leveraged_etf * mediumHighPct +
      RISK_LIMITS_BY_LEVEL.high.leveraged_etf * highPct,
    security: 
      RISK_LIMITS_BY_LEVEL.low.security * lowPct +
      RISK_LIMITS_BY_LEVEL.low_medium.security * lowMediumPct +
      RISK_LIMITS_BY_LEVEL.medium.security * mediumPct +
      RISK_LIMITS_BY_LEVEL.medium_high.security * mediumHighPct +
      RISK_LIMITS_BY_LEVEL.high.security * highPct,
    single_etf: 
      RISK_LIMITS_BY_LEVEL.low.single_etf * lowPct +
      RISK_LIMITS_BY_LEVEL.low_medium.single_etf * lowMediumPct +
      RISK_LIMITS_BY_LEVEL.medium.single_etf * mediumPct +
      RISK_LIMITS_BY_LEVEL.medium_high.single_etf * mediumHighPct +
      RISK_LIMITS_BY_LEVEL.high.single_etf * highPct,
  };
}

export type RiskViolation = {
  category: HoldingCategory;
  currentPercentage: number;
  maxAllowed: number;
  exceededBy: number;
};

export type RiskValidationResult = {
  isValid: boolean;
  violations: RiskViolation[];
  warnings: RiskViolation[];
};

export function validateRiskLimits(
  allocations: { category: HoldingCategory; targetPercentage: number }[],
  riskAllocation: RiskAllocation
): RiskValidationResult {
  const limits = calculateBlendedLimits(riskAllocation);
  const violations: RiskViolation[] = [];
  const warnings: RiskViolation[] = [];

  const categoryTotals: Partial<Record<HoldingCategory, number>> = {};
  
  for (const alloc of allocations) {
    categoryTotals[alloc.category] = (categoryTotals[alloc.category] || 0) + alloc.targetPercentage;
  }

  const checkCategory = (category: keyof RiskLimits, label: HoldingCategory) => {
    const total = categoryTotals[label] || 0;
    const maxAllowed = Math.round(limits[category] * 10) / 10;
    
    if (total > maxAllowed) {
      violations.push({
        category: label,
        currentPercentage: total,
        maxAllowed,
        exceededBy: total - maxAllowed,
      });
    } else if (total > maxAllowed * 0.8 && maxAllowed > 0) {
      warnings.push({
        category: label,
        currentPercentage: total,
        maxAllowed,
        exceededBy: 0,
      });
    }
  };

  checkCategory("double_long_etf", "double_long_etf");
  checkCategory("leveraged_etf", "leveraged_etf");
  checkCategory("security", "security");
  checkCategory("single_etf", "single_etf");

  return {
    isValid: violations.length === 0,
    violations,
    warnings,
  };
}

export function calculatePortfolioRiskScore(
  allocations: { category: HoldingCategory; targetPercentage: number }[]
): number {
  let weightedScore = 0;
  let totalPercentage = 0;

  for (const alloc of allocations) {
    const riskScore = CATEGORY_RISK_SCORES[alloc.category];
    weightedScore += riskScore * alloc.targetPercentage;
    totalPercentage += alloc.targetPercentage;
  }

  if (totalPercentage === 0) return 0;
  return weightedScore / totalPercentage;
}

export function getRiskScoreLabel(score: number): string {
  if (score <= 1.5) return "Very Low Risk";
  if (score <= 2) return "Low Risk";
  if (score <= 2.5) return "Moderate Risk";
  if (score <= 3) return "Elevated Risk";
  return "High Risk";
}

export function getRiskScoreColor(score: number): string {
  if (score <= 1.5) return "text-green-600 dark:text-green-400";
  if (score <= 2) return "text-emerald-600 dark:text-emerald-400";
  if (score <= 2.5) return "text-yellow-600 dark:text-yellow-400";
  if (score <= 3) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

export function formatRiskAllocation(allocation: RiskAllocation): string {
  const parts: string[] = [];
  if (allocation.low > 0) parts.push(`${allocation.low}% Low`);
  if (allocation.lowMedium > 0) parts.push(`${allocation.lowMedium}% Low/Med`);
  if (allocation.medium > 0) parts.push(`${allocation.medium}% Medium`);
  if (allocation.mediumHigh > 0) parts.push(`${allocation.mediumHigh}% Med/High`);
  if (allocation.high > 0) parts.push(`${allocation.high}% High`);
  return parts.join(", ") || "100% Medium";
}

export function getRiskAllocationFromAccount(account: any): RiskAllocation {
  const lowVal = account?.riskLowPct;
  const lowMediumVal = account?.riskLowMediumPct;
  const mediumVal = account?.riskMediumPct;
  const mediumHighVal = account?.riskMediumHighPct;
  const highVal = account?.riskHighPct;
  
  return {
    low: parseFloat(lowVal != null ? String(lowVal) : "0"),
    lowMedium: parseFloat(lowMediumVal != null ? String(lowMediumVal) : "0"),
    medium: parseFloat(mediumVal != null ? String(mediumVal) : "100"),
    mediumHigh: parseFloat(mediumHighVal != null ? String(mediumHighVal) : "0"),
    high: parseFloat(highVal != null ? String(highVal) : "0"),
  };
}

// Maps universalHoldings riskLevel to the account allocation field
export function getRiskLevelAllocationKey(riskLevel: RiskLevel): keyof RiskAllocation {
  const mapping: Record<RiskLevel, keyof RiskAllocation> = {
    low: "low",
    low_medium: "lowMedium",
    medium: "medium",
    medium_high: "mediumHigh",
    high: "high",
  };
  return mapping[riskLevel];
}

// Check if a ticker's risk level is allowed by the account's allocation
export function isRiskLevelAllowed(riskLevel: RiskLevel, allocation: RiskAllocation): boolean {
  const key = getRiskLevelAllocationKey(riskLevel);
  return allocation[key] > 0;
}
