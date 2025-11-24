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
import type { Household as HouseholdType } from "@shared/schema";

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

  // Fetch households
  const { data: householdsData = [], isLoading } = useQuery<HouseholdType[]>({
    queryKey: ["/api/households"],
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

  // Transform backend data to component format
  // For now, using mock data structure until we fetch full household details with accounts
  const mockHouseholds: Household[] = householdsData.map(h => ({
    id: h.id,
    name: h.name,
    totalValue: 0, // TODO: Calculate from accounts
    totalPerformance: 0, // TODO: Calculate from accounts
    individuals: [], // TODO: Fetch from API
    corporations: [], // TODO: Fetch from API
    jointAccounts: [] // TODO: Fetch from API
  }));

  const filteredHouseholds = mockHouseholds.filter(household =>
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
