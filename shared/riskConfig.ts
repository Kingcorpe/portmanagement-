export type RiskLevel = "medium" | "medium_high" | "high";
export type HoldingCategory = "basket_etf" | "single_etf" | "double_long_etf" | "security" | "auto_added" | "misc";

export interface RiskAllocation {
  medium: number;
  mediumHigh: number;
  high: number;
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  medium: "Medium",
  medium_high: "Medium/High",
  high: "High",
};

export const RISK_LEVEL_DESCRIPTIONS: Record<RiskLevel, string> = {
  medium: "Balanced risk - Mix of growth and stability with some higher-risk holdings allowed",
  medium_high: "Higher risk - Growth-focused with significant exposure to higher-risk assets",
  high: "Maximum risk - No restrictions, suitable for experienced investors",
};

export const CATEGORY_RISK_SCORES: Record<HoldingCategory, number> = {
  basket_etf: 1,
  single_etf: 2,
  misc: 2,
  auto_added: 2,
  security: 3,
  double_long_etf: 4,
};

export const CATEGORY_TO_RISK_LEVEL: Record<HoldingCategory, RiskLevel> = {
  basket_etf: "medium",
  single_etf: "medium_high",
  misc: "medium",
  auto_added: "medium",
  security: "high",
  double_long_etf: "high",
};

export const CATEGORY_LABELS: Record<HoldingCategory, string> = {
  basket_etf: "Basket ETF",
  single_etf: "Single ETF",
  double_long_etf: "Double Long",
  security: "Security",
  auto_added: "Auto Added",
  misc: "Misc",
};

export type RiskLimits = {
  double_long_etf: number;
  security: number;
  single_etf: number;
};

export const RISK_LIMITS_BY_LEVEL: Record<RiskLevel, RiskLimits> = {
  medium: {
    double_long_etf: 10,
    security: 30,
    single_etf: 50,
  },
  medium_high: {
    double_long_etf: 25,
    security: 50,
    single_etf: 100,
  },
  high: {
    double_long_etf: 100,
    security: 100,
    single_etf: 100,
  },
};

export function calculateBlendedLimits(allocation: RiskAllocation): RiskLimits {
  const mediumPct = allocation.medium / 100;
  const mediumHighPct = allocation.mediumHigh / 100;
  const highPct = allocation.high / 100;

  return {
    double_long_etf: 
      RISK_LIMITS_BY_LEVEL.medium.double_long_etf * mediumPct +
      RISK_LIMITS_BY_LEVEL.medium_high.double_long_etf * mediumHighPct +
      RISK_LIMITS_BY_LEVEL.high.double_long_etf * highPct,
    security: 
      RISK_LIMITS_BY_LEVEL.medium.security * mediumPct +
      RISK_LIMITS_BY_LEVEL.medium_high.security * mediumHighPct +
      RISK_LIMITS_BY_LEVEL.high.security * highPct,
    single_etf: 
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
  if (allocation.medium > 0) parts.push(`${allocation.medium}% Medium`);
  if (allocation.mediumHigh > 0) parts.push(`${allocation.mediumHigh}% Medium/High`);
  if (allocation.high > 0) parts.push(`${allocation.high}% High`);
  return parts.join(", ") || "100% Medium";
}

export function getRiskAllocationFromAccount(account: any): RiskAllocation {
  const mediumVal = account?.riskMediumPct;
  const mediumHighVal = account?.riskMediumHighPct;
  const highVal = account?.riskHighPct;
  
  return {
    medium: parseFloat(mediumVal != null ? String(mediumVal) : "100"),
    mediumHigh: parseFloat(mediumHighVal != null ? String(mediumHighVal) : "0"),
    high: parseFloat(highVal != null ? String(highVal) : "0"),
  };
}
