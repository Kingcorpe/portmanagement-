import { useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { HouseholdCard, Household, HouseholdCategory, householdCategoryLabels, householdCategoryColors } from "@/components/household-card";
import { HouseholdManagementDialogs } from "@/components/household-management-dialogs";
import { ShareHouseholdDialog } from "@/components/share-household-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, LayoutList, LayoutGrid, ChevronRight, Eye, EyeOff, Folder, FolderOpen } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const focusHouseholdId = new URLSearchParams(searchString).get("focus");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grouped">("grouped");
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('households-privacy-mode') === 'true';
    }
    return false;
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Dialog state for household management
  const [dialogState, setDialogState] = useState<{
    type: "individual" | "corporation" | "individual-account" | "corporate-account" | "joint-account" | null;
    householdId: string | null;
    individualId: string | null;
    individualDateOfBirth: Date | null;
    corporationId: string | null;
  }>({
    type: null,
    householdId: null,
    individualId: null,
    individualDateOfBirth: null,
    corporationId: null,
  });

  // State for editing individuals/corporations/households/joint-accounts
  const [editingEntity, setEditingEntity] = useState<{
    type: "individual" | "corporation" | "household" | "joint-account";
    id: string;
    name: string;
    category?: HouseholdCategory | null;
  } | null>(null);

  // State for sharing household dialog
  const [sharingHousehold, setSharingHousehold] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Form for creating households
  const form = useForm<InsertHousehold>({
    resolver: zodResolver(insertHouseholdSchema),
    defaultValues: {
      name: "",
      category: "anchor",
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

  // Fetch archived households
  const { data: archivedData = [] } = useQuery<any[]>({
    queryKey: ["/api/households/archived"],
    enabled: isAuthenticated,
  });

  // Transform backend data to component format and calculate totals
  const households: Household[] = householdsData.map(h => {
    // Transform individuals with accounts - use calculatedBalance from positions
    const individuals = h.individuals.map((individual) => ({
      id: individual.id,
      name: individual.name,
      dateOfBirth: individual.dateOfBirth,
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
      category: h.category,
      individuals,
      corporations,
      jointAccounts,
      totalValue,
      totalPerformance,
      isOwner: h.userId === user?.id,
    };
  });

  // When navigating back with focus parameter, expand the category containing the focused household
  useEffect(() => {
    if (focusHouseholdId && households.length > 0) {
      const focusedHousehold = households.find(h => h.id === focusHouseholdId);
      if (focusedHousehold?.category) {
        setExpandedCategories(prev => new Set([...Array.from(prev), focusedHousehold.category!]));
      }
      // Clear the focus parameter from URL after processing
      setLocation("/households", { replace: true });
    }
  }, [focusHouseholdId, households, setLocation]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/households/archived"] });
      toast({
        title: "Success",
        description: "Household archived successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive household",
        variant: "destructive",
      });
    },
  });

  // Restore household mutation
  const restoreHouseholdMutation = useMutation({
    mutationFn: async (householdId: string) => {
      return await apiRequest("POST", `/api/households/${householdId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/households/full"] });
      queryClient.invalidateQueries({ queryKey: ["/api/households/archived"] });
      toast({
        title: "Success",
        description: "Household restored successfully",
      });
      setShowArchived(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore household",
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
    setDialogState({ type: "individual", householdId, individualId: null, individualDateOfBirth: null, corporationId: null });
  };

  const handleAddCorporation = (householdId: string) => {
    setDialogState({ type: "corporation", householdId, individualId: null, individualDateOfBirth: null, corporationId: null });
  };

  const handleAddAccount = (entityId: string, entityType: "individual" | "corporate", dateOfBirth?: Date | null) => {
    if (entityType === "individual") {
      setDialogState({ type: "individual-account", householdId: null, individualId: entityId, individualDateOfBirth: dateOfBirth || null, corporationId: null });
    } else {
      setDialogState({ type: "corporate-account", householdId: null, individualId: null, individualDateOfBirth: null, corporationId: entityId });
    }
  };

  const handleAddJointAccount = (householdId: string) => {
    setDialogState({ type: "joint-account", householdId, individualId: null, individualDateOfBirth: null, corporationId: null });
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
    mutationFn: async ({ id, name, category }: { id: string; name: string; category?: HouseholdCategory | null }) => {
      return await apiRequest("PATCH", `/api/households/${id}`, { name, category });
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

  const handleEditHousehold = (id: string, currentName: string, currentCategory?: HouseholdCategory | null) => {
    setEditingEntity({ type: "household", id, name: currentName, category: currentCategory });
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
    setDialogState({ type: null, householdId: null, individualId: null, individualDateOfBirth: null, corporationId: null });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const togglePrivacyMode = () => {
    const newValue = !privacyMode;
    setPrivacyMode(newValue);
    localStorage.setItem('households-privacy-mode', String(newValue));
  };

  // Filter households based on search and privacy mode
  // In privacy mode, only show households when search query is at least 80% of the name length
  const filteredHouseholds = (privacyMode && searchQuery.trim() === "")
    ? []
    : households
      .filter(household => {
        const query = searchQuery.toLowerCase().trim();
        const name = household.name.toLowerCase();
        
        // Must match the name (starts with)
        if (!name.startsWith(query)) return false;
        
        // In privacy mode, require query to be at least 80% of the household name length
        if (privacyMode && query.length < name.length * 0.8) return false;
        
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

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
              <form 
                onSubmit={form.handleSubmit(onSubmit)} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !createMutation.isPending) {
                    form.handleSubmit(onSubmit)();
                  }
                }}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Household Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Smith Family" 
                          data-testid="input-household-name" 
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setIsDialogOpen(false);
                            }
                          }}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-household-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="anchor">{householdCategoryLabels.anchor}</SelectItem>
                          <SelectItem value="evergreen">{householdCategoryLabels.evergreen}</SelectItem>
                          <SelectItem value="pulse">{householdCategoryLabels.pulse}</SelectItem>
                          <SelectItem value="emerging_anchor" className="pl-6">→ {householdCategoryLabels.emerging_anchor}</SelectItem>
                          <SelectItem value="emerging_pulse" className="pl-6">→ {householdCategoryLabels.emerging_pulse}</SelectItem>
                        </SelectContent>
                      </Select>
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

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search households..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-households"
          />
        </div>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="rounded-r-none"
            data-testid="button-view-list"
          >
            <LayoutList className="h-4 w-4 mr-1" />
            List
          </Button>
          <Button
            variant={viewMode === "grouped" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grouped")}
            className="rounded-l-none"
            data-testid="button-view-grouped"
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            By Category
          </Button>
        </div>
        <Button
          variant={privacyMode ? "default" : "outline"}
          size="sm"
          onClick={togglePrivacyMode}
          className="gap-1"
          data-testid="button-privacy-mode"
          title={privacyMode ? "Privacy mode on - search to reveal households" : "Privacy mode off - all households visible"}
        >
          {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          Privacy
        </Button>
      </div>

      {filteredHouseholds.length === 0 ? (
        <div className="text-center py-12">
          {privacyMode && searchQuery.trim() === "" ? (
            <div className="flex flex-col items-center gap-3">
              <EyeOff className="h-12 w-12 text-muted-foreground/50" />
              <div>
                <p className="text-muted-foreground font-medium" data-testid="text-privacy-mode-active">
                  Privacy mode is enabled
                </p>
                <p className="text-muted-foreground text-sm">
                  Search for a household name to view it
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground" data-testid="text-no-households">
              {searchQuery ? "No households found matching your search" : "No households yet. Click 'Add Household' to get started."}
            </p>
          )}
        </div>
      ) : viewMode === "list" ? (
        <div className="grid gap-6">
          {filteredHouseholds.map(household => (
            <HouseholdCard 
              key={household.id} 
              household={household}
              defaultOpen={household.id === focusHouseholdId}
              onAddIndividual={handleAddIndividual}
              onAddCorporation={handleAddCorporation}
              onAddAccount={handleAddAccount}
              onAddJointAccount={handleAddJointAccount}
              onEditHousehold={(id, name) => handleEditHousehold(id, name, household.category)}
              onShareHousehold={(householdId) => {
                const h = households.find(hh => hh.id === householdId);
                if (h) setSharingHousehold({ id: householdId, name: h.name });
              }}
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
      ) : (
        <div className="space-y-4">
          {/* Group households by category */}
          {(["anchor", "evergreen", "pulse", "emerging_anchor", "emerging_pulse"] as HouseholdCategory[]).map(category => {
            const categoryHouseholds = filteredHouseholds.filter(h => h.category === category);
            if (categoryHouseholds.length === 0) return null;
            const isExpanded = expandedCategories.has(category);
            
            const categoryBorderColors: Record<HouseholdCategory, string> = {
              evergreen: "border-l-emerald-500",
              anchor: "border-l-blue-500",
              pulse: "border-l-purple-500",
              emerging_pulse: "border-l-orange-500",
              emerging_anchor: "border-l-cyan-500",
            };
            
            const categoryIconColors: Record<HouseholdCategory, string> = {
              evergreen: "text-emerald-500",
              anchor: "text-blue-500",
              pulse: "text-purple-500",
              emerging_pulse: "text-orange-500",
              emerging_anchor: "text-cyan-500",
            };
            
            return (
              <Collapsible
                key={category}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger asChild>
                  <div 
                    className={`flex items-center gap-3 p-3 rounded-lg border border-l-4 ${categoryBorderColors[category]} bg-card hover-elevate cursor-pointer`}
                    data-testid={`folder-category-${category}`}
                  >
                    {isExpanded ? (
                      <FolderOpen className={`h-5 w-5 ${categoryIconColors[category]}`} />
                    ) : (
                      <Folder className={`h-5 w-5 ${categoryIconColors[category]}`} />
                    )}
                    <h2 className="text-lg font-semibold flex-1">
                      {householdCategoryLabels[category]}
                    </h2>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${householdCategoryColors[category]}`}>
                      {categoryHouseholds.length}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className={`grid gap-3 mt-2 ml-3 pl-4 border-l-2 ${categoryBorderColors[category].replace('border-l-', 'border-')}`}>
                    {categoryHouseholds.map(household => (
                      <HouseholdCard 
                        key={household.id} 
                        household={household}
                        defaultOpen={household.id === focusHouseholdId}
                        onAddIndividual={handleAddIndividual}
                        onAddCorporation={handleAddCorporation}
                        onAddAccount={handleAddAccount}
                        onAddJointAccount={handleAddJointAccount}
                        onEditHousehold={(id, name) => handleEditHousehold(id, name, household.category)}
                        onShareHousehold={(householdId) => {
                          const h = households.find(hh => hh.id === householdId);
                          if (h) setSharingHousehold({ id: householdId, name: h.name });
                        }}
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
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Archived Households Section */}
      {archivedData.length > 0 && (
        <div className="mt-8 border-t pt-8">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground" data-testid="button-toggle-archived">
                <FolderOpen className="h-4 w-4" />
                <span>Archived Households ({archivedData.length})</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              {archivedData.map((household) => (
                <div key={household.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div>
                    <h3 className="font-medium">{household.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Archived on {new Date(household.deletedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => restoreHouseholdMutation.mutate(household.id)}
                    disabled={restoreHouseholdMutation.isPending}
                    data-testid={`button-restore-household-${household.id}`}
                  >
                    {restoreHouseholdMutation.isPending ? "Restoring..." : "Restore"}
                  </Button>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      <HouseholdManagementDialogs
        householdId={dialogState.householdId}
        individualId={dialogState.individualId}
        individualDateOfBirth={dialogState.individualDateOfBirth}
        corporationId={dialogState.corporationId}
        dialogType={dialogState.type}
        onClose={handleCloseDialog}
      />

      {/* Share Household Dialog */}
      {sharingHousehold && (
        <ShareHouseholdDialog
          householdId={sharingHousehold.id}
          householdName={sharingHousehold.name}
          isOpen={true}
          onClose={() => setSharingHousehold(null)}
        />
      )}

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
                : editingEntity?.type === "household"
                ? "Update the name and category of this household."
                : `Update the name of this ${editingEntity?.type === "individual" ? "individual" : "corporation"}.`}
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
            
            {/* Category selection for households only */}
            {editingEntity?.type === "household" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["anchor", "emerging_anchor", "emerging_pulse", "evergreen", "pulse"] as HouseholdCategory[]).map((category) => (
                    <Button
                      key={category}
                      type="button"
                      size="sm"
                      variant={editingEntity?.category === category ? "default" : "outline"}
                      className={`justify-start ${editingEntity?.category === category ? "" : householdCategoryColors[category]}`}
                      onClick={() => setEditingEntity(prev => prev ? { ...prev, category } : null)}
                      data-testid={`button-category-${category}`}
                    >
                      {householdCategoryLabels[category]}
                    </Button>
                  ))}
                  {editingEntity?.category && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="justify-start text-muted-foreground"
                      onClick={() => setEditingEntity(prev => prev ? { ...prev, category: null } : null)}
                      data-testid="button-clear-category"
                    >
                      Clear Category
                    </Button>
                  )}
                </div>
              </div>
            )}
            
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
                      updateHouseholdMutation.mutate({ id: editingEntity.id, name: editingEntity.name, category: editingEntity.category });
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
