import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { HouseholdCard, Household } from "@/components/household-card";
import { HouseholdManagementDialogs } from "@/components/household-management-dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHouseholdSchema, type InsertHousehold } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { HouseholdWithDetails } from "@shared/schema";

export default function Households() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Dialog state for household management
  const [dialogState, setDialogState] = useState<{
    type: "individual" | "corporation" | "individual-account" | "corporate-account" | "joint-account" | null;
    householdId: string | null;
    individualId: string | null;
    corporationId: string | null;
  }>({
    type: null,
    householdId: null,
    individualId: null,
    corporationId: null,
  });

  // Form for creating households
  const form = useForm<InsertHousehold>({
    resolver: zodResolver(insertHouseholdSchema),
    defaultValues: {
      name: "",
    },
  });

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
    // Transform individuals with accounts - use calculatedBalance from positions
    const individuals = h.individuals.map((individual) => ({
      id: individual.id,
      name: individual.name,
      accounts: individual.accounts.map((account: any) => ({
        id: account.id,
        type: account.type,
        balance: Number(account.calculatedBalance) || 0,
        performance: Number(account.performance) || 0,
      }))
    }));

    // Transform corporations with accounts - use calculatedBalance from positions
    const corporations = h.corporations.map((corporation) => ({
      id: corporation.id,
      name: corporation.name,
      accounts: corporation.accounts.map((account: any) => ({
        id: account.id,
        type: account.type,
        balance: Number(account.calculatedBalance) || 0,
        performance: Number(account.performance) || 0,
      }))
    }));

    // Transform joint accounts - use calculatedBalance from positions
    const jointAccounts = h.jointAccounts.map((account: any) => ({
      id: account.id,
      type: account.type.replace(/_/g, '-') as "joint-cash" | "resp",
      balance: Number(account.calculatedBalance) || 0,
      performance: Number(account.performance) || 0,
      owners: account.owners.map((owner: any) => owner.name)
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

  // Create household mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertHousehold) => {
      return await apiRequest("POST", "/api/households", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({
        title: "Success",
        description: "Household created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create household",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertHousehold) => {
    createMutation.mutate(data);
  };

  // Handlers for opening dialogs
  const handleAddIndividual = (householdId: string) => {
    setDialogState({ type: "individual", householdId, individualId: null, corporationId: null });
  };

  const handleAddCorporation = (householdId: string) => {
    setDialogState({ type: "corporation", householdId, individualId: null, corporationId: null });
  };

  const handleAddAccount = (entityId: string, entityType: "individual" | "corporate") => {
    if (entityType === "individual") {
      setDialogState({ type: "individual-account", householdId: null, individualId: entityId, corporationId: null });
    } else {
      setDialogState({ type: "corporate-account", householdId: null, individualId: null, corporationId: entityId });
    }
  };

  const handleAddJointAccount = (householdId: string) => {
    setDialogState({ type: "joint-account", householdId, individualId: null, corporationId: null });
  };

  const handleCloseDialog = () => {
    setDialogState({ type: null, householdId: null, individualId: null, corporationId: null });
  };

  const filteredHouseholds = households.filter(household =>
    household.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-household">
              <Plus className="h-4 w-4 mr-2" />
              Add Household
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Household</DialogTitle>
              <DialogDescription>
                Add a new household to manage client portfolios.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Household Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith Family" data-testid="input-household-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Household"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
            <HouseholdCard 
              key={household.id} 
              household={household}
              onAddIndividual={handleAddIndividual}
              onAddCorporation={handleAddCorporation}
              onAddAccount={handleAddAccount}
              onAddJointAccount={handleAddJointAccount}
            />
          ))}
        </div>
      )}

      <HouseholdManagementDialogs
        householdId={dialogState.householdId}
        individualId={dialogState.individualId}
        corporationId={dialogState.corporationId}
        dialogType={dialogState.type}
        onClose={handleCloseDialog}
      />
    </div>
  );
}
