export type RiskTolerance = "conservative" | "moderate" | "aggressive" | "very_aggressive";
export type HoldingCategory = "basket_etf" | "single_etf" | "double_long_etf" | "security" | "auto_added" | "misc";

export const RISK_TOLERANCE_LABELS: Record<RiskTolerance, string> = {
  conservative: "Conservative",
  moderate: "Moderate",
  aggressive: "Aggressive",
  very_aggressive: "Very Aggressive",
};

export const RISK_TOLERANCE_DESCRIPTIONS: Record<RiskTolerance, string> = {
  conservative: "Low risk - Focus on capital preservation with stable, diversified investments",
  moderate: "Balanced risk - Mix of growth and stability with some higher-risk holdings allowed",
  aggressive: "Higher risk - Growth-focused with significant exposure to higher-risk assets",
  very_aggressive: "Maximum risk - No restrictions, suitable for experienced investors",
};

export const CATEGORY_RISK_SCORES: Record<HoldingCategory, number> = {
  basket_etf: 1,
  single_etf: 2,
  misc: 2,
  auto_added: 2,
  security: 3,
  double_long_etf: 4,
};

export const CATEGORY_LABELS: Record<HoldingCategory, string> = {
  basket_etf: "Basket ETF",
  single_etf: "Single ETF",
  double_long_etf: "Leveraged ETF",
  security: "Individual Security",
  auto_added: "Auto Added",
  misc: "Miscellaneous",
};

export type RiskLimits = {
  double_long_etf: number;
  security: number;
  single_etf: number;
};

export const RISK_LIMITS: Record<RiskTolerance, RiskLimits> = {
  conservative: {
    double_long_etf: 0,
    security: 15,
    single_etf: 30,
  },
  moderate: {
    double_long_etf: 10,
    security: 30,
    single_etf: 50,
  },
  aggressive: {
    double_long_etf: 25,
    security: 50,
    single_etf: 100,
  },
  very_aggressive: {
    double_long_etf: 100,
    security: 100,
    single_etf: 100,
  },
};

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
  riskTolerance: RiskTolerance
): RiskValidationResult {
  const limits = RISK_LIMITS[riskTolerance];
  const violations: RiskViolation[] = [];
  const warnings: RiskViolation[] = [];

  const categoryTotals: Partial<Record<HoldingCategory, number>> = {};
  
  for (const alloc of allocations) {
    categoryTotals[alloc.category] = (categoryTotals[alloc.category] || 0) + alloc.targetPercentage;
  }

  const checkCategory = (category: keyof RiskLimits, label: HoldingCategory) => {
    const total = categoryTotals[label] || 0;
    const maxAllowed = limits[category];
    
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
