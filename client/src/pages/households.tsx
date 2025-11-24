import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { HouseholdCard, Household } from "@/components/household-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import type { HouseholdWithDetails } from "@shared/schema";

export default function Households() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch households with full details
  const { data: householdsData = [], isLoading } = useQuery<HouseholdWithDetails[]>({
    queryKey: ["/api/households/full"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return false;
      }
      return failureCount < 3;
    },
  });

  // Transform backend data to component format and calculate totals
  const households: Household[] = householdsData.map(h => {
    // Transform individuals with accounts - data is already numeric from Drizzle
    const individuals = h.individuals.map((individual) => ({
      id: individual.id,
      name: individual.name,
      initials: individual.initials,
      accounts: individual.accounts.map((account) => ({
        id: account.id,
        type: account.type,
        balance: Number(account.balance) || 0,
        performance: Number(account.performance) || 0,
      }))
    }));

    // Transform corporations with accounts
    const corporations = h.corporations.map((corporation) => ({
      id: corporation.id,
      name: corporation.name,
      initials: corporation.initials,
      accounts: corporation.accounts.map((account) => ({
        id: account.id,
        type: account.type,
        balance: Number(account.balance) || 0,
        performance: Number(account.performance) || 0,
      }))
    }));

    // Transform joint accounts - convert snake_case to hyphenated format for UI
    const jointAccounts = h.jointAccounts.map((account) => ({
      id: account.id,
      type: account.type.replace(/_/g, '-') as "joint-cash" | "resp",
      balance: Number(account.balance) || 0,
      performance: Number(account.performance) || 0,
      owners: account.owners.map((owner) => owner.name)
    }));

    // Calculate total value across all accounts
    const individualTotal = individuals.reduce((sum, individual) => 
      sum + individual.accounts.reduce((accSum, acc) => accSum + acc.balance, 0), 0
    );
    const corporateTotal = corporations.reduce((sum, corp) => 
      sum + corp.accounts.reduce((accSum, acc) => accSum + acc.balance, 0), 0
    );
    const jointTotal = jointAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalValue = individualTotal + corporateTotal + jointTotal;

    // Calculate weighted average performance (performance is stored as decimal percentage, e.g., 5.25 for 5.25%)
    // Convert percentage to fraction by dividing by 100, then multiply by balance
    const individualWeightedPerf = individuals.reduce((sum, individual) => 
      sum + individual.accounts.reduce((accSum, acc) => 
        accSum + (acc.balance * (acc.performance / 100)), 0
      ), 0
    );
    const corporateWeightedPerf = corporations.reduce((sum, corp) => 
      sum + corp.accounts.reduce((accSum, acc) => 
        accSum + (acc.balance * (acc.performance / 100)), 0
      ), 0
    );
    const jointWeightedPerf = jointAccounts.reduce((sum, acc) => 
      sum + (acc.balance * (acc.performance / 100)), 0
    );
    const totalPerformance = totalValue > 0 
      ? ((individualWeightedPerf + corporateWeightedPerf + jointWeightedPerf) / totalValue) * 100
      : 0;

    return {
      id: h.id,
      name: h.name,
      individuals,
      corporations,
      jointAccounts,
      totalValue,
      totalPerformance
    };
  });

  const filteredHouseholds = households.filter(household =>
    household.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddHousehold = () => {
    console.log('Add household');
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-lg">Loading households...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-households-title">Households</h1>
          <p className="text-muted-foreground">Manage client accounts and portfolios</p>
        </div>
        <Button onClick={handleAddHousehold} data-testid="button-add-household">
          <Plus className="h-4 w-4 mr-2" />
          Add Household
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search households..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-households"
        />
      </div>

      {filteredHouseholds.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground" data-testid="text-no-households">
            {searchQuery ? "No households found matching your search" : "No households yet. Click 'Add Household' to get started."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredHouseholds.map(household => (
            <HouseholdCard key={household.id} household={household} />
          ))}
        </div>
      )}
    </div>
  );
}
