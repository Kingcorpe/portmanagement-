import { useDemoMode } from "@/contexts/demo-mode-context";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import {
  getDemoHouseholdsFullData,
  getDemoAlertsWithAccounts,
  getDemoTasksWithContext,
  getDemoKeyMetrics,
  demoHouseholds,
  demoAlerts,
  demoTasks,
  demoInsuranceRevenue,
  demoInvestmentRevenue,
  demoKpiObjectives,
  demoReferenceLinks,
  demoIndividualAccounts,
  demoCorporateAccounts,
  demoJointAccounts,
  demoPositions,
  demoTargetAllocations,
} from "./demo-data";

type QueryKeyType = readonly unknown[];

function getDemoResponse(queryKey: QueryKeyType): any | null {
  const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
  const keyStr = typeof key === "string" ? key : "";

  if (keyStr === "/api/households/full") {
    return getDemoHouseholdsFullData();
  }

  if (keyStr === "/api/households/archived") {
    return [];
  }

  if (keyStr === "/api/alerts") {
    return demoAlerts;
  }

  if (keyStr === "/api/alerts/with-accounts") {
    return getDemoAlertsWithAccounts();
  }

  if (keyStr === "/api/tasks" || keyStr === "/api/tasks/all") {
    return getDemoTasksWithContext();
  }

  if (keyStr === "/api/insurance-tasks") {
    return [];
  }

  if (keyStr === "/api/insurance-revenue") {
    return demoInsuranceRevenue;
  }

  if (keyStr === "/api/investment-revenue") {
    return demoInvestmentRevenue;
  }

  if (keyStr === "/api/kpi-objectives") {
    return demoKpiObjectives;
  }

  if (keyStr === "/api/reference-links") {
    return demoReferenceLinks;
  }

  if (keyStr === "/api/key-metrics") {
    return getDemoKeyMetrics();
  }

  if (keyStr === "/api/universal-holdings") {
    return [];
  }

  if (keyStr === "/api/model-portfolios") {
    return [];
  }

  if (keyStr.startsWith("/api/households/") && keyStr.includes("/full")) {
    const householdId = queryKey[1];
    const households = getDemoHouseholdsFullData();
    return households.find((h: any) => h.id === householdId) || null;
  }

  if (keyStr === "/api/accounts" && queryKey[1]) {
    const accountId = queryKey[1];
    const accountType = queryKey[2];
    
    let account = null;
    if (accountType === "individual") {
      account = demoIndividualAccounts.find(a => a.id === accountId);
    } else if (accountType === "corporate") {
      account = demoCorporateAccounts.find(a => a.id === accountId);
    } else if (accountType === "joint") {
      account = demoJointAccounts.find(a => a.id === accountId);
    }
    
    if (account) {
      const positions = demoPositions.filter(p => p.accountId === accountId);
      const targets = demoTargetAllocations.filter(t => t.accountId === accountId);
      return {
        ...account,
        positions,
        targetAllocations: targets,
      };
    }
    return null;
  }

  if (keyStr.startsWith("/api/kpi-objectives/") && keyStr.endsWith("/daily-tasks")) {
    return [];
  }

  return null;
}

export function useDemoAwareQuery<TData = unknown>(
  options: UseQueryOptions<TData, Error, TData, QueryKeyType>
) {
  const { isDemoMode } = useDemoMode();

  const modifiedOptions: UseQueryOptions<TData, Error, TData, QueryKeyType> = {
    ...options,
    queryFn: isDemoMode
      ? async () => {
          const demoData = getDemoResponse(options.queryKey!);
          if (demoData !== null) {
            return demoData as TData;
          }
          throw new Error("No demo data available for this query");
        }
      : options.queryFn,
  };

  return useQuery(modifiedOptions);
}

export function isDemoModeActive(): boolean {
  const stored = localStorage.getItem("practiceOS_demoMode");
  return stored === "true";
}
