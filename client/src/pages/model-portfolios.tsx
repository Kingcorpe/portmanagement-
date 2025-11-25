import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Trash2, Edit, TrendingUp, TrendingDown, Percent, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Target, X, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { 
  UniversalHolding, 
  PlannedPortfolioWithAllocations, 
  FreelancePortfolioWithAllocations 
} from "@shared/schema";

const riskLevelLabels: Record<string, string> = {
  low: "Low",
  low_medium: "Low-Medium",
  medium: "Medium",
  medium_high: "Medium-High",
  high: "High",
};

const holdingCategoryLabels: Record<string, string> = {
  basket_etf: "CC Basket ETFs",
  single_etf: "Single ETFs",
  double_long_etf: "Double Long ETFs",
  security: "Securities",
  auto_added: "Auto Added",
};

const holdingCategoryOrder = ["basket_etf", "single_etf", "double_long_etf", "security", "auto_added"];

const riskLevelColors: Record<string, string> = {
  low: "bg-chart-2 text-white",
  low_medium: "bg-emerald-500 text-white",
  medium: "bg-yellow-500 text-white",
  medium_high: "bg-orange-500 text-white",
  high: "bg-destructive text-destructive-foreground",
};

const dividendPayoutLabels: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-Annual",
  annual: "Annual",
  none: "None",
};

const categoryLabels: Record<string, string> = {
  basket_etf: "CC Basket ETFs",
  single_etf: "Single ETFs",
  double_long_etf: "Double Long ETFs",
  security: "Securities",
  auto_added: "Auto Added",
};

const categoryColors: Record<string, string> = {
  basket_etf: "bg-blue-500 text-white",
  single_etf: "bg-purple-500 text-white",
  double_long_etf: "bg-amber-500 text-white",
  security: "bg-slate-500 text-white",
  auto_added: "bg-gray-500 text-white",
};

const holdingFormSchema = z.object({
  ticker: z.string().min(1, "Ticker is required").max(20),
  name: z.string().min(1, "Name is required"),
  category: z.enum(["basket_etf", "single_etf", "double_long_etf", "security", "auto_added"]),
  riskLevel: z.enum(["low", "low_medium", "medium", "medium_high", "high"]),
  dividendRate: z.coerce.number().nonnegative().default(0),
  dividendPayout: z.enum(["monthly", "quarterly", "semi_annual", "annual", "none"]),
  description: z.string().optional(),
});

const portfolioFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const allocationFormSchema = z.object({
  universalHoldingId: z.string().min(1, "Please select a holding"),
  targetPercentage: z.coerce.number().positive().max(100, "Percentage cannot exceed 100"),
});

type HoldingFormData = z.infer<typeof holdingFormSchema>;
type PortfolioFormData = z.infer<typeof portfolioFormSchema>;
type AllocationFormData = z.infer<typeof allocationFormSchema>;

export default function ModelPortfolios() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("holdings");
  const [isHoldingDialogOpen, setIsHoldingDialogOpen] = useState(false);
  const [isPlannedDialogOpen, setIsPlannedDialogOpen] = useState(false);
  const [isFreelanceDialogOpen, setIsFreelanceDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<UniversalHolding | null>(null);
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [allocationTarget, setAllocationTarget] = useState<{ type: "planned" | "freelance"; portfolioId: string } | null>(null);
  const [editingAllocation, setEditingAllocation] = useState<{ id: string; type: "planned" | "freelance"; universalHoldingId: string; targetPercentage: number } | null>(null);
  const [isLookingUpTicker, setIsLookingUpTicker] = useState(false);
  const [holdingsSortColumn, setHoldingsSortColumn] = useState<"ticker" | "name" | "category" | "riskLevel" | "price" | "dividendRate">("ticker");
  const [holdingsSortDirection, setHoldingsSortDirection] = useState<"asc" | "desc">("asc");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [inlineEditingAllocation, setInlineEditingAllocation] = useState<{ id: string; type: "planned" | "freelance" } | null>(null);
  const [inlineAllocationValue, setInlineAllocationValue] = useState<string>("");

  const holdingForm = useForm<HoldingFormData>({
    resolver: zodResolver(holdingFormSchema),
    defaultValues: {
      ticker: "",
      name: "",
      category: "basket_etf",
      riskLevel: "medium",
      dividendRate: 0,
      dividendPayout: "monthly",
      description: "",
    },
  });

  const portfolioForm = useForm<PortfolioFormData>({
    resolver: zodResolver(portfolioFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const allocationForm = useForm<AllocationFormData>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: {
      universalHoldingId: "",
      targetPercentage: 0,
    },
  });

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
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: holdings = [], isLoading: holdingsLoading } = useQuery<UniversalHolding[]>({
    queryKey: ["/api/universal-holdings"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) return false;
      return failureCount < 3;
    },
  });

  const { data: plannedPortfolios = [], isLoading: plannedLoading } = useQuery<PlannedPortfolioWithAllocations[]>({
    queryKey: ["/api/planned-portfolios"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) return false;
      return failureCount < 3;
    },
  });

  const { data: freelancePortfolios = [], isLoading: freelanceLoading } = useQuery<FreelancePortfolioWithAllocations[]>({
    queryKey: ["/api/freelance-portfolios"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) return false;
      return failureCount < 3;
    },
  });

  const createHoldingMutation = useMutation({
    mutationFn: (data: HoldingFormData) => apiRequest("POST", "/api/universal-holdings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universal-holdings"] });
      toast({ title: "Success", description: "Holding created successfully" });
      setIsHoldingDialogOpen(false);
      holdingForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateHoldingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HoldingFormData> }) => 
      apiRequest("PATCH", `/api/universal-holdings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universal-holdings"] });
      toast({ title: "Success", description: "Holding updated successfully" });
      setIsHoldingDialogOpen(false);
      setEditingHolding(null);
      holdingForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteHoldingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/universal-holdings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universal-holdings"] });
      toast({ title: "Success", description: "Holding deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const refreshPricesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/universal-holdings/refresh-prices"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/universal-holdings"] });
      toast({ 
        title: "Prices Updated", 
        description: data.message || `Updated ${data.updated} holdings` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createPlannedPortfolioMutation = useMutation({
    mutationFn: (data: PortfolioFormData) => apiRequest("POST", "/api/planned-portfolios", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planned-portfolios"] });
      toast({ title: "Success", description: "Planned portfolio created successfully" });
      setIsPlannedDialogOpen(false);
      portfolioForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePlannedPortfolioMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/planned-portfolios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planned-portfolios"] });
      toast({ title: "Success", description: "Planned portfolio deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createFreelancePortfolioMutation = useMutation({
    mutationFn: (data: PortfolioFormData) => apiRequest("POST", "/api/freelance-portfolios", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freelance-portfolios"] });
      toast({ title: "Success", description: "Freelance portfolio created successfully" });
      setIsFreelanceDialogOpen(false);
      portfolioForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteFreelancePortfolioMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/freelance-portfolios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freelance-portfolios"] });
      toast({ title: "Success", description: "Freelance portfolio deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createPlannedAllocationMutation = useMutation({
    mutationFn: (data: AllocationFormData & { plannedPortfolioId: string }) => 
      apiRequest("POST", "/api/planned-portfolio-allocations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planned-portfolios"] });
      toast({ title: "Success", description: "Allocation added successfully" });
      setIsAllocationDialogOpen(false);
      setAllocationTarget(null);
      allocationForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePlannedAllocationMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/planned-portfolio-allocations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planned-portfolios"] });
      toast({ title: "Success", description: "Allocation removed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createFreelanceAllocationMutation = useMutation({
    mutationFn: (data: AllocationFormData & { freelancePortfolioId: string }) => 
      apiRequest("POST", "/api/freelance-portfolio-allocations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freelance-portfolios"] });
      toast({ title: "Success", description: "Allocation added successfully" });
      setIsAllocationDialogOpen(false);
      setAllocationTarget(null);
      allocationForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteFreelanceAllocationMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/freelance-portfolio-allocations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freelance-portfolios"] });
      toast({ title: "Success", description: "Allocation removed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updatePlannedAllocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AllocationFormData> }) => 
      apiRequest("PATCH", `/api/planned-portfolio-allocations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planned-portfolios"] });
      toast({ title: "Success", description: "Allocation updated successfully" });
      setIsAllocationDialogOpen(false);
      setEditingAllocation(null);
      setAllocationTarget(null);
      allocationForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateFreelanceAllocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AllocationFormData> }) => 
      apiRequest("PATCH", `/api/freelance-portfolio-allocations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freelance-portfolios"] });
      toast({ title: "Success", description: "Allocation updated successfully" });
      setIsAllocationDialogOpen(false);
      setEditingAllocation(null);
      setAllocationTarget(null);
      allocationForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onHoldingSubmit = (data: HoldingFormData) => {
    const normalizedData = {
      ...data,
      ticker: data.ticker.toUpperCase(),
    };
    if (editingHolding) {
      updateHoldingMutation.mutate({ id: editingHolding.id, data: normalizedData });
    } else {
      createHoldingMutation.mutate(normalizedData);
    }
  };

  const onPlannedPortfolioSubmit = (data: PortfolioFormData) => {
    createPlannedPortfolioMutation.mutate(data);
  };

  const onFreelancePortfolioSubmit = (data: PortfolioFormData) => {
    createFreelancePortfolioMutation.mutate(data);
  };

  const onAllocationSubmit = (data: AllocationFormData) => {
    if (editingAllocation) {
      if (editingAllocation.type === "planned") {
        updatePlannedAllocationMutation.mutate({ id: editingAllocation.id, data });
      } else {
        updateFreelanceAllocationMutation.mutate({ id: editingAllocation.id, data });
      }
    } else if (allocationTarget) {
      if (allocationTarget.type === "planned") {
        createPlannedAllocationMutation.mutate({ ...data, plannedPortfolioId: allocationTarget.portfolioId });
      } else {
        createFreelanceAllocationMutation.mutate({ ...data, freelancePortfolioId: allocationTarget.portfolioId });
      }
    }
  };

  const lookupTicker = async () => {
    const ticker = holdingForm.getValues("ticker");
    if (!ticker || ticker.trim() === "") {
      toast({ title: "Error", description: "Please enter a ticker symbol first", variant: "destructive" });
      return;
    }

    setIsLookingUpTicker(true);
    try {
      const response = await fetch(`/api/ticker-lookup/${encodeURIComponent(ticker.trim())}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Ticker not found");
      }
      const data = await response.json();
      
      // Populate all available fields
      holdingForm.setValue("name", data.name);
      if (data.dividendRate) {
        holdingForm.setValue("dividendRate", parseFloat(data.dividendRate.toFixed(2)));
      }
      
      // Build description of what was found
      const details = [];
      if (data.dividendRate) details.push(`Yield: ${data.dividendRate.toFixed(2)}%`);
      
      toast({ 
        title: "Found", 
        description: `${data.ticker}: ${data.name}${details.length > 0 ? ' | ' + details.join(', ') : ''}` 
      });
    } catch (error: any) {
      toast({ title: "Not Found", description: error.message || "Could not find ticker", variant: "destructive" });
    } finally {
      setIsLookingUpTicker(false);
    }
  };

  const handleEditHolding = (holding: UniversalHolding) => {
    setEditingHolding(holding);
    holdingForm.reset({
      ticker: holding.ticker,
      name: holding.name,
      category: holding.category,
      riskLevel: holding.riskLevel,
      dividendRate: Number(holding.dividendRate) || 0,
      dividendPayout: holding.dividendPayout,
      description: holding.description || "",
    });
    setIsHoldingDialogOpen(true);
  };

  const handleAddAllocation = (type: "planned" | "freelance", portfolioId: string) => {
    setAllocationTarget({ type, portfolioId });
    setEditingAllocation(null);
    allocationForm.reset();
    setIsAllocationDialogOpen(true);
  };

  const handleEditAllocation = (type: "planned" | "freelance", allocation: { id: string; universalHoldingId: string; targetPercentage: string }) => {
    setEditingAllocation({
      id: allocation.id,
      type,
      universalHoldingId: allocation.universalHoldingId,
      targetPercentage: Number(allocation.targetPercentage),
    });
    setAllocationTarget(null);
    allocationForm.reset({
      universalHoldingId: allocation.universalHoldingId,
      targetPercentage: Number(allocation.targetPercentage),
    });
    setIsAllocationDialogOpen(true);
  };

  const handleInlineAllocationEdit = (type: "planned" | "freelance", allocationId: string, currentValue: string) => {
    setInlineEditingAllocation({ id: allocationId, type });
    setInlineAllocationValue(currentValue);
  };

  const handleInlineAllocationCancel = () => {
    setInlineEditingAllocation(null);
    setInlineAllocationValue("");
  };

  const handleInlineAllocationSave = (allocationId: string, type: "planned" | "freelance", currentValue: number) => {
    const trimmedValue = inlineAllocationValue.trim();
    
    if (trimmedValue === "") {
      handleInlineAllocationCancel();
      return;
    }
    
    const targetPct = parseFloat(trimmedValue);
    if (isNaN(targetPct)) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      setInlineAllocationValue(currentValue.toString());
      return;
    }
    
    if (targetPct <= 0 || targetPct > 100) {
      toast({
        title: "Invalid Value",
        description: "Percentage must be between 0 and 100",
        variant: "destructive",
      });
      setInlineAllocationValue(currentValue.toString());
      return;
    }
    
    if (Math.abs(targetPct - currentValue) < 0.01) {
      handleInlineAllocationCancel();
      return;
    }
    
    if (type === "planned") {
      updatePlannedAllocationMutation.mutate(
        { id: allocationId, data: { targetPercentage: targetPct } },
        {
          onSuccess: () => {
            setInlineEditingAllocation(null);
            setInlineAllocationValue("");
          },
        }
      );
    } else {
      updateFreelanceAllocationMutation.mutate(
        { id: allocationId, data: { targetPercentage: targetPct } },
        {
          onSuccess: () => {
            setInlineEditingAllocation(null);
            setInlineAllocationValue("");
          },
        }
      );
    }
  };

  const riskLevelOrder = { low: 1, low_medium: 2, medium: 3, medium_high: 4, high: 5 };
  const categoryOrder: Record<string, number> = { basket_etf: 1, single_etf: 2, double_long_etf: 3, security: 4, auto_added: 5 };

  const handleHoldingsSort = (column: typeof holdingsSortColumn) => {
    if (holdingsSortColumn === column) {
      setHoldingsSortDirection(holdingsSortDirection === "asc" ? "desc" : "asc");
    } else {
      setHoldingsSortColumn(column);
      setHoldingsSortDirection("asc");
    }
  };

  const SortableHeader = ({ column, children }: { column: typeof holdingsSortColumn; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover-elevate select-none" 
      onClick={() => handleHoldingsSort(column)}
      data-testid={`sort-${column}`}
    >
      <div className="flex items-center gap-1">
        {children}
        {holdingsSortColumn === column ? (
          holdingsSortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  const filteredHoldings = holdings
    .filter(
      (h) => (h.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || 
             h.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
             (categoryFilter === "all" || h.category === categoryFilter)
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (holdingsSortColumn) {
        case "ticker":
          comparison = a.ticker.localeCompare(b.ticker);
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "category":
          comparison = categoryOrder[a.category] - categoryOrder[b.category];
          break;
        case "riskLevel":
          comparison = riskLevelOrder[a.riskLevel] - riskLevelOrder[b.riskLevel];
          break;
        case "price":
          comparison = Number(a.price) - Number(b.price);
          break;
        case "dividendRate":
          comparison = Number(a.dividendRate) - Number(b.dividendRate);
          break;
      }
      return holdingsSortDirection === "asc" ? comparison : -comparison;
    });

  const filteredPlannedPortfolios = plannedPortfolios.filter(
    (p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFreelancePortfolios = freelancePortfolios.filter(
    (p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="loading-state">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Model Portfolios</h1>
          <p className="text-muted-foreground">Manage your universal holdings and portfolio templates</p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="basket_etf">CC Basket ETFs</SelectItem>
            <SelectItem value="single_etf">Single ETFs</SelectItem>
            <SelectItem value="double_long_etf">Double Long ETFs</SelectItem>
            <SelectItem value="security">Securities</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="holdings" data-testid="tab-holdings">Universal Holdings</TabsTrigger>
          <TabsTrigger value="planned" data-testid="tab-planned">Planned Portfolios</TabsTrigger>
          <TabsTrigger value="freelance" data-testid="tab-freelance">Freelance Portfolios</TabsTrigger>
        </TabsList>

        <TabsContent value="holdings" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => refreshPricesMutation.mutate()}
              disabled={refreshPricesMutation.isPending}
              data-testid="button-refresh-prices"
            >
              {refreshPricesMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Prices
            </Button>
            <Dialog open={isHoldingDialogOpen} onOpenChange={(open) => {
              setIsHoldingDialogOpen(open);
              if (!open) {
                setEditingHolding(null);
                holdingForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-holding">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Holding
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingHolding ? "Edit Holding" : "Add Universal Holding"}</DialogTitle>
                  <DialogDescription>
                    {editingHolding ? "Update the holding details" : "Add a new ETF or security to your universal holdings library"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...holdingForm}>
                  <form onSubmit={holdingForm.handleSubmit(onHoldingSubmit)} className="space-y-4">
                    <FormField
                      control={holdingForm.control}
                      name="ticker"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ticker Symbol</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input placeholder="e.g. VFV.TO" {...field} data-testid="input-ticker" />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={lookupTicker}
                              disabled={isLookingUpTicker}
                              data-testid="button-lookup-ticker"
                            >
                              {isLookingUpTicker ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Search className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={holdingForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Vanguard S&P 500 Index ETF" {...field} data-testid="input-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={holdingForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="basket_etf">CC Basket ETFs</SelectItem>
                              <SelectItem value="single_etf">Single ETFs</SelectItem>
                              <SelectItem value="double_long_etf">Double Long ETFs</SelectItem>
                              <SelectItem value="security">Securities</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={holdingForm.control}
                      name="riskLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Risk Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-risk-level">
                                <SelectValue placeholder="Select risk" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="low_medium">Low-Medium</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="medium_high">Medium-High</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={holdingForm.control}
                        name="dividendRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dividend Rate (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-dividend-rate" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={holdingForm.control}
                        name="dividendPayout"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payout Frequency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-dividend-payout">
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                                <SelectItem value="annual">Annual</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={holdingForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief description of this holding..." {...field} data-testid="input-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={createHoldingMutation.isPending || updateHoldingMutation.isPending} data-testid="button-submit-holding">
                      {createHoldingMutation.isPending || updateHoldingMutation.isPending ? "Saving..." : (editingHolding ? "Update Holding" : "Add Holding")}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {holdingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredHoldings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {searchQuery ? "No holdings match your search" : "No universal holdings yet. Add your first holding to get started."}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader column="ticker">Ticker</SortableHeader>
                    <SortableHeader column="name">Name</SortableHeader>
                    <SortableHeader column="category">Category</SortableHeader>
                    <SortableHeader column="riskLevel">Risk</SortableHeader>
                    <SortableHeader column="price">Price</SortableHeader>
                    <SortableHeader column="dividendRate">Dividend</SortableHeader>
                    <TableHead>Payout</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHoldings.map((holding) => (
                    <TableRow key={holding.id} data-testid={`row-holding-${holding.id}`}>
                      <TableCell 
                        className="font-mono font-semibold cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleEditHolding(holding)}
                        data-testid={`text-ticker-${holding.id}`}
                      >
                        {holding.ticker}
                      </TableCell>
                      <TableCell>{holding.name}</TableCell>
                      <TableCell>
                        <Badge className={categoryColors[holding.category]}>
                          {categoryLabels[holding.category]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={riskLevelColors[holding.riskLevel]}>
                          {riskLevelLabels[holding.riskLevel]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-mono">
                          CA${Number(holding.price).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {holding.priceUpdatedAt && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(holding.priceUpdatedAt).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(holding.dividendRate).toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{dividendPayoutLabels[holding.dividendPayout]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditHolding(holding)} data-testid={`button-edit-holding-${holding.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" data-testid={`button-delete-holding-${holding.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Holding</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {holding.ticker}? This will also remove it from any portfolios that include this holding.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteHoldingMutation.mutate(holding.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="planned" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isPlannedDialogOpen} onOpenChange={setIsPlannedDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-planned-portfolio">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Planned Portfolio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Planned Portfolio</DialogTitle>
                  <DialogDescription>
                    Create a reusable portfolio template with target allocations
                  </DialogDescription>
                </DialogHeader>
                <Form {...portfolioForm}>
                  <form onSubmit={portfolioForm.handleSubmit(onPlannedPortfolioSubmit)} className="space-y-4">
                    <FormField
                      control={portfolioForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portfolio Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Conservative Growth" {...field} data-testid="input-portfolio-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={portfolioForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief description..." {...field} data-testid="input-portfolio-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={createPlannedPortfolioMutation.isPending} data-testid="button-submit-planned">
                      {createPlannedPortfolioMutation.isPending ? "Creating..." : "Create Portfolio"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {plannedLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredPlannedPortfolios.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {searchQuery ? "No portfolios match your search" : "No planned portfolios yet. Create your first portfolio template."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPlannedPortfolios.map((portfolio) => {
                const totalAllocation = portfolio.allocations.reduce((sum, a) => sum + Number(a.targetPercentage), 0);
                return (
                  <Card key={portfolio.id} data-testid={`card-planned-portfolio-${portfolio.id}`}>
                    <CardHeader className="flex flex-row items-start justify-between gap-2">
                      <div>
                        <CardTitle>{portfolio.name}</CardTitle>
                        {portfolio.description && <CardDescription>{portfolio.description}</CardDescription>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={totalAllocation === 100 ? "default" : "destructive"}>
                          <Percent className="h-3 w-3 mr-1" />
                          {totalAllocation.toFixed(1)}% Allocated
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" data-testid={`button-delete-planned-${portfolio.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Portfolio</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{portfolio.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePlannedPortfolioMutation.mutate(portfolio.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {portfolio.allocations.length === 0 ? (
                        <p className="text-sm text-muted-foreground mb-4">No allocations yet</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Holding</TableHead>
                              <TableHead className="text-right">Allocation</TableHead>
                              <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {portfolio.allocations.map((allocation) => {
                              const isEditing = inlineEditingAllocation?.id === allocation.id && inlineEditingAllocation?.type === "planned";
                              const currentValue = Number(allocation.targetPercentage);
                              return (
                                <TableRow key={allocation.id} data-testid={`row-allocation-${allocation.id}`}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-semibold">{allocation.holding.ticker}</span>
                                      <span className="text-muted-foreground">{allocation.holding.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {isEditing ? (
                                      <div className="flex items-center gap-1 justify-end">
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          max="100"
                                          value={inlineAllocationValue}
                                          onChange={(e) => setInlineAllocationValue(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              handleInlineAllocationSave(allocation.id, "planned", currentValue);
                                            } else if (e.key === "Escape") {
                                              handleInlineAllocationCancel();
                                            }
                                          }}
                                          className="w-20 h-7 text-right"
                                          autoFocus
                                          data-testid={`input-inline-allocation-${allocation.id}`}
                                        />
                                        <span>%</span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-primary"
                                          onClick={() => handleInlineAllocationSave(allocation.id, "planned", currentValue)}
                                          data-testid={`button-save-inline-allocation-${allocation.id}`}
                                        >
                                          <Target className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-muted-foreground"
                                          onClick={handleInlineAllocationCancel}
                                          data-testid={`button-cancel-inline-allocation-${allocation.id}`}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <span
                                        className="cursor-pointer hover:text-primary transition-colors"
                                        onClick={() => handleInlineAllocationEdit("planned", allocation.id, currentValue.toFixed(2))}
                                        data-testid={`text-allocation-${allocation.id}`}
                                      >
                                        {currentValue.toFixed(2)}%
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deletePlannedAllocationMutation.mutate(allocation.id)} data-testid={`button-delete-allocation-${allocation.id}`}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => handleAddAllocation("planned", portfolio.id)} data-testid={`button-add-allocation-${portfolio.id}`}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Allocation
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="freelance" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isFreelanceDialogOpen} onOpenChange={setIsFreelanceDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-freelance-portfolio">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Freelance Portfolio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Freelance Portfolio</DialogTitle>
                  <DialogDescription>
                    Create a custom one-off portfolio for specific client situations
                  </DialogDescription>
                </DialogHeader>
                <Form {...portfolioForm}>
                  <form onSubmit={portfolioForm.handleSubmit(onFreelancePortfolioSubmit)} className="space-y-4">
                    <FormField
                      control={portfolioForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portfolio Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Client Smith Custom" {...field} data-testid="input-freelance-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={portfolioForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief description..." {...field} data-testid="input-freelance-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={createFreelancePortfolioMutation.isPending} data-testid="button-submit-freelance">
                      {createFreelancePortfolioMutation.isPending ? "Creating..." : "Create Portfolio"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {freelanceLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredFreelancePortfolios.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {searchQuery ? "No portfolios match your search" : "No freelance portfolios yet. Create your first custom portfolio."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredFreelancePortfolios.map((portfolio) => {
                const totalAllocation = portfolio.allocations.reduce((sum, a) => sum + Number(a.targetPercentage), 0);
                return (
                  <Card key={portfolio.id} data-testid={`card-freelance-portfolio-${portfolio.id}`}>
                    <CardHeader className="flex flex-row items-start justify-between gap-2">
                      <div>
                        <CardTitle>{portfolio.name}</CardTitle>
                        {portfolio.description && <CardDescription>{portfolio.description}</CardDescription>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={totalAllocation === 100 ? "default" : "destructive"}>
                          <Percent className="h-3 w-3 mr-1" />
                          {totalAllocation.toFixed(1)}% Allocated
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" data-testid={`button-delete-freelance-${portfolio.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Portfolio</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{portfolio.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteFreelancePortfolioMutation.mutate(portfolio.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {portfolio.allocations.length === 0 ? (
                        <p className="text-sm text-muted-foreground mb-4">No allocations yet</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Holding</TableHead>
                              <TableHead className="text-right">Allocation</TableHead>
                              <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {portfolio.allocations.map((allocation) => {
                              const isEditing = inlineEditingAllocation?.id === allocation.id && inlineEditingAllocation?.type === "freelance";
                              const currentValue = Number(allocation.targetPercentage);
                              return (
                                <TableRow key={allocation.id} data-testid={`row-freelance-allocation-${allocation.id}`}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-semibold">{allocation.holding.ticker}</span>
                                      <span className="text-muted-foreground">{allocation.holding.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {isEditing ? (
                                      <div className="flex items-center gap-1 justify-end">
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          max="100"
                                          value={inlineAllocationValue}
                                          onChange={(e) => setInlineAllocationValue(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              handleInlineAllocationSave(allocation.id, "freelance", currentValue);
                                            } else if (e.key === "Escape") {
                                              handleInlineAllocationCancel();
                                            }
                                          }}
                                          className="w-20 h-7 text-right"
                                          autoFocus
                                          data-testid={`input-inline-freelance-allocation-${allocation.id}`}
                                        />
                                        <span>%</span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-primary"
                                          onClick={() => handleInlineAllocationSave(allocation.id, "freelance", currentValue)}
                                          data-testid={`button-save-inline-freelance-allocation-${allocation.id}`}
                                        >
                                          <Target className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-muted-foreground"
                                          onClick={handleInlineAllocationCancel}
                                          data-testid={`button-cancel-inline-freelance-allocation-${allocation.id}`}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <span
                                        className="cursor-pointer hover:text-primary transition-colors"
                                        onClick={() => handleInlineAllocationEdit("freelance", allocation.id, currentValue.toFixed(2))}
                                        data-testid={`text-freelance-allocation-${allocation.id}`}
                                      >
                                        {currentValue.toFixed(2)}%
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteFreelanceAllocationMutation.mutate(allocation.id)} data-testid={`button-delete-freelance-allocation-${allocation.id}`}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => handleAddAllocation("freelance", portfolio.id)} data-testid={`button-add-freelance-allocation-${portfolio.id}`}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Allocation
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isAllocationDialogOpen} onOpenChange={(open) => {
        setIsAllocationDialogOpen(open);
        if (!open) {
          setAllocationTarget(null);
          setEditingAllocation(null);
          allocationForm.reset();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAllocation ? "Edit Allocation" : "Add Allocation"}</DialogTitle>
            <DialogDescription>
              {editingAllocation ? "Update the target percentage for this holding" : "Select a holding and set the target percentage"}
            </DialogDescription>
          </DialogHeader>
          <Form {...allocationForm}>
            <form onSubmit={allocationForm.handleSubmit(onAllocationSubmit)} className="space-y-4">
              <FormField
                control={allocationForm.control}
                name="universalHoldingId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holding</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!editingAllocation}>
                      <FormControl>
                        <SelectTrigger data-testid="select-holding">
                          <SelectValue placeholder="Select a holding" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-80">
                        {holdingCategoryOrder.map((category) => {
                          const categoryHoldings = holdings.filter(h => h.category === category);
                          if (categoryHoldings.length === 0) return null;
                          return (
                            <SelectGroup key={category}>
                              <SelectLabel className="font-semibold text-xs uppercase tracking-wide text-muted-foreground px-2 py-1.5">
                                {holdingCategoryLabels[category]}
                              </SelectLabel>
                              {categoryHoldings.map((holding) => (
                                <SelectItem key={holding.id} value={holding.id}>
                                  <span className="font-mono">{holding.ticker}</span> - {holding.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={allocationForm.control}
                name="targetPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Percentage (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" max="100" placeholder="0.00" {...field} data-testid="input-target-percentage" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={createPlannedAllocationMutation.isPending || createFreelanceAllocationMutation.isPending || updatePlannedAllocationMutation.isPending || updateFreelanceAllocationMutation.isPending} data-testid="button-submit-allocation">
                {(createPlannedAllocationMutation.isPending || createFreelanceAllocationMutation.isPending || updatePlannedAllocationMutation.isPending || updateFreelanceAllocationMutation.isPending) 
                  ? (editingAllocation ? "Saving..." : "Adding...") 
                  : (editingAllocation ? "Save Changes" : "Add Allocation")}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
