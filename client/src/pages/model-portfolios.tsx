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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Trash2, Edit, TrendingUp, TrendingDown, Percent } from "lucide-react";
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
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
};

const riskLevelColors: Record<string, string> = {
  low: "bg-chart-2 text-white",
  medium: "bg-yellow-500 text-white",
  high: "bg-destructive text-destructive-foreground",
};

const dividendPayoutLabels: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-Annual",
  annual: "Annual",
  none: "None",
};

const holdingFormSchema = z.object({
  ticker: z.string().min(1, "Ticker is required").max(20),
  name: z.string().min(1, "Name is required"),
  riskLevel: z.enum(["low", "medium", "high"]),
  dividendRate: z.coerce.number().nonnegative().default(0),
  dividendPayout: z.enum(["monthly", "quarterly", "semi_annual", "annual", "none"]),
  price: z.coerce.number().positive("Price must be positive"),
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

  const holdingForm = useForm<HoldingFormData>({
    resolver: zodResolver(holdingFormSchema),
    defaultValues: {
      ticker: "",
      name: "",
      riskLevel: "medium",
      dividendRate: 0,
      dividendPayout: "none",
      price: 0,
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

  const onHoldingSubmit = (data: HoldingFormData) => {
    if (editingHolding) {
      updateHoldingMutation.mutate({ id: editingHolding.id, data });
    } else {
      createHoldingMutation.mutate(data);
    }
  };

  const onPlannedPortfolioSubmit = (data: PortfolioFormData) => {
    createPlannedPortfolioMutation.mutate(data);
  };

  const onFreelancePortfolioSubmit = (data: PortfolioFormData) => {
    createFreelancePortfolioMutation.mutate(data);
  };

  const onAllocationSubmit = (data: AllocationFormData) => {
    if (!allocationTarget) return;
    
    if (allocationTarget.type === "planned") {
      createPlannedAllocationMutation.mutate({ ...data, plannedPortfolioId: allocationTarget.portfolioId });
    } else {
      createFreelanceAllocationMutation.mutate({ ...data, freelancePortfolioId: allocationTarget.portfolioId });
    }
  };

  const handleEditHolding = (holding: UniversalHolding) => {
    setEditingHolding(holding);
    holdingForm.reset({
      ticker: holding.ticker,
      name: holding.name,
      riskLevel: holding.riskLevel,
      dividendRate: Number(holding.dividendRate) || 0,
      dividendPayout: holding.dividendPayout,
      price: Number(holding.price),
      description: holding.description || "",
    });
    setIsHoldingDialogOpen(true);
  };

  const handleAddAllocation = (type: "planned" | "freelance", portfolioId: string) => {
    setAllocationTarget({ type, portfolioId });
    allocationForm.reset();
    setIsAllocationDialogOpen(true);
  };

  const filteredHoldings = holdings.filter(
    (h) => h.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || 
           h.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      <div className="flex items-center gap-4">
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="holdings" data-testid="tab-holdings">Universal Holdings</TabsTrigger>
          <TabsTrigger value="planned" data-testid="tab-planned">Planned Portfolios</TabsTrigger>
          <TabsTrigger value="freelance" data-testid="tab-freelance">Freelance Portfolios</TabsTrigger>
        </TabsList>

        <TabsContent value="holdings" className="space-y-4">
          <div className="flex justify-end">
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
                          <FormControl>
                            <Input placeholder="e.g. VFV.TO" {...field} data-testid="input-ticker" />
                          </FormControl>
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
                    <div className="grid grid-cols-2 gap-4">
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
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={holdingForm.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (CA$)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-price" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
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
                    <TableHead>Ticker</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Dividend</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHoldings.map((holding) => (
                    <TableRow key={holding.id} data-testid={`row-holding-${holding.id}`}>
                      <TableCell className="font-mono font-semibold">{holding.ticker}</TableCell>
                      <TableCell>{holding.name}</TableCell>
                      <TableCell>
                        <Badge className={riskLevelColors[holding.riskLevel]}>
                          {riskLevelLabels[holding.riskLevel]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        CA${Number(holding.price).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        <Badge variant={totalAllocation === 100 ? "default" : "secondary"}>
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
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {portfolio.allocations.map((allocation) => (
                              <TableRow key={allocation.id} data-testid={`row-allocation-${allocation.id}`}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold">{allocation.holding.ticker}</span>
                                    <span className="text-muted-foreground">{allocation.holding.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {Number(allocation.targetPercentage).toFixed(2)}%
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deletePlannedAllocationMutation.mutate(allocation.id)} data-testid={`button-delete-allocation-${allocation.id}`}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
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
                        <Badge variant={totalAllocation === 100 ? "default" : "secondary"}>
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
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {portfolio.allocations.map((allocation) => (
                              <TableRow key={allocation.id} data-testid={`row-freelance-allocation-${allocation.id}`}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold">{allocation.holding.ticker}</span>
                                    <span className="text-muted-foreground">{allocation.holding.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {Number(allocation.targetPercentage).toFixed(2)}%
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteFreelanceAllocationMutation.mutate(allocation.id)} data-testid={`button-delete-freelance-allocation-${allocation.id}`}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
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
          allocationForm.reset();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Allocation</DialogTitle>
            <DialogDescription>
              Select a holding and set the target percentage
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-holding">
                          <SelectValue placeholder="Select a holding" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {holdings.map((holding) => (
                          <SelectItem key={holding.id} value={holding.id}>
                            <span className="font-mono">{holding.ticker}</span> - {holding.name}
                          </SelectItem>
                        ))}
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
              <Button type="submit" className="w-full" disabled={createPlannedAllocationMutation.isPending || createFreelanceAllocationMutation.isPending} data-testid="button-submit-allocation">
                {createPlannedAllocationMutation.isPending || createFreelanceAllocationMutation.isPending ? "Adding..." : "Add Allocation"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
