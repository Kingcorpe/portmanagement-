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

  // State for editing individuals/corporations/households/joint-accounts
  const [editingEntity, setEditingEntity] = useState<{
    type: "individual" | "corporation" | "household" | "joint-account";
    id: string;
    name: string;
  } | null>(null);

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
        nickname: account.nickname,
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
        nickname: account.nickname,
        balance: Number(account.calculatedBalance) || 0,
        performance: Number(account.performance) || 0,
      }))
    }));

    // Transform joint accounts - use calculatedBalance from positions
    const jointAccounts = h.jointAccounts.map((account: any) => ({
      id: account.id,
      type: account.type as "joint_cash" | "resp",
      nickname: account.nickname,
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

  // Delete household mutation
  const deleteHouseholdMutation = useMutation({
    mutationFn: async (householdId: string) => {
      return await apiRequest("DELETE", `/api/households/${householdId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({
        title: "Success",
        description: "Household deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete household",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async ({ accountId, accountType }: { accountId: string; accountType: "individual" | "corporate" | "joint" }) => {
      const endpoint = accountType === "individual" 
        ? `/api/individual-accounts/${accountId}`
        : accountType === "corporate"
        ? `/api/corporate-accounts/${accountId}`
        : `/api/joint-accounts/${accountId}`;
      return await apiRequest("DELETE", endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
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

  const handleDeleteHousehold = (householdId: string) => {
    deleteHouseholdMutation.mutate(householdId);
  };

  const handleDeleteAccount = (accountId: string, accountType: "individual" | "corporate" | "joint") => {
    deleteAccountMutation.mutate({ accountId, accountType });
  };

  // Delete individual mutation
  const deleteIndividualMutation = useMutation({
    mutationFn: async (individualId: string) => {
      return await apiRequest("DELETE", `/api/individuals/${individualId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({
        title: "Success",
        description: "Individual deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete individual",
        variant: "destructive",
      });
    },
  });

  // Delete corporation mutation
  const deleteCorporationMutation = useMutation({
    mutationFn: async (corporationId: string) => {
      return await apiRequest("DELETE", `/api/corporations/${corporationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({
        title: "Success",
        description: "Corporation deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete corporation",
        variant: "destructive",
      });
    },
  });

  // Update individual mutation
  const updateIndividualMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await apiRequest("PATCH", `/api/individuals/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({
        title: "Success",
        description: "Individual updated successfully",
      });
      setEditingEntity(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update individual",
        variant: "destructive",
      });
    },
  });

  // Update corporation mutation
  const updateCorporationMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await apiRequest("PATCH", `/api/corporations/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({
        title: "Success",
        description: "Corporation updated successfully",
      });
      setEditingEntity(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update corporation",
        variant: "destructive",
      });
    },
  });

  // Update household mutation
  const updateHouseholdMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await apiRequest("PATCH", `/api/households/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({
        title: "Success",
        description: "Household updated successfully",
      });
      setEditingEntity(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update household",
        variant: "destructive",
      });
    },
  });

  // Update joint account mutation
  const updateJointAccountMutation = useMutation({
    mutationFn: async ({ id, nickname }: { id: string; nickname: string | null }) => {
      return await apiRequest("PATCH", `/api/joint-accounts/${id}`, { nickname: nickname || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      toast({
        title: "Success",
        description: "Joint account updated successfully",
      });
      setEditingEntity(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update joint account",
        variant: "destructive",
      });
    },
  });

  const handleEditHousehold = (id: string, currentName: string) => {
    setEditingEntity({ type: "household", id, name: currentName });
  };

  const handleEditIndividual = (id: string, currentName: string) => {
    setEditingEntity({ type: "individual", id, name: currentName });
  };

  const handleDeleteIndividual = (id: string) => {
    deleteIndividualMutation.mutate(id);
  };

  const handleEditCorporation = (id: string, currentName: string) => {
    setEditingEntity({ type: "corporation", id, name: currentName });
  };

  const handleDeleteCorporation = (id: string) => {
    deleteCorporationMutation.mutate(id);
  };

  const handleEditJointAccount = (id: string, currentNickname: string | null) => {
    setEditingEntity({ type: "joint-account", id, name: currentNickname || "" });
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
              onEditHousehold={handleEditHousehold}
              onDeleteHousehold={handleDeleteHousehold}
              onDeleteAccount={handleDeleteAccount}
              onEditIndividual={handleEditIndividual}
              onDeleteIndividual={handleDeleteIndividual}
              onEditCorporation={handleEditCorporation}
              onDeleteCorporation={handleDeleteCorporation}
              onEditJointAccount={handleEditJointAccount}
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

      {/* Edit Individual/Corporation/Household/Joint Account Dialog */}
      <Dialog open={editingEntity !== null} onOpenChange={(open) => !open && setEditingEntity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEntity?.type === "individual" ? "Edit Individual" : 
               editingEntity?.type === "corporation" ? "Edit Corporation" : 
               editingEntity?.type === "joint-account" ? "Edit Joint Account" : "Edit Household"}
            </DialogTitle>
            <DialogDescription>
              {editingEntity?.type === "joint-account" 
                ? "Update the nickname for this joint account."
                : `Update the name of this ${editingEntity?.type === "individual" ? "individual" : 
                   editingEntity?.type === "corporation" ? "corporation" : "household"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {editingEntity?.type === "joint-account" ? "Nickname" : "Name"}
              </label>
              <Input
                value={editingEntity?.name || ""}
                onChange={(e) => setEditingEntity(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder={editingEntity?.type === "individual" ? "Individual name" : 
                  editingEntity?.type === "corporation" ? "Corporation name" : 
                  editingEntity?.type === "joint-account" ? "e.g., Kids Education Fund" : "Household name"}
                data-testid="input-edit-entity-name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingEntity(null)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={() => {
                  if (editingEntity) {
                    if (editingEntity.type === "individual") {
                      updateIndividualMutation.mutate({ id: editingEntity.id, name: editingEntity.name });
                    } else if (editingEntity.type === "corporation") {
                      updateCorporationMutation.mutate({ id: editingEntity.id, name: editingEntity.name });
                    } else if (editingEntity.type === "joint-account") {
                      updateJointAccountMutation.mutate({ id: editingEntity.id, nickname: editingEntity.name || null });
                    } else {
                      updateHouseholdMutation.mutate({ id: editingEntity.id, name: editingEntity.name });
                    }
                  }
                }}
                disabled={updateIndividualMutation.isPending || updateCorporationMutation.isPending || updateHouseholdMutation.isPending || updateJointAccountMutation.isPending}
                data-testid="button-save-edit"
              >
                {updateIndividualMutation.isPending || updateCorporationMutation.isPending || updateHouseholdMutation.isPending || updateJointAccountMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
