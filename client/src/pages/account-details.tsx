import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, ArrowLeft, TrendingUp, TrendingDown, Minus, AlertTriangle, Copy, Target, Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { 
  insertPositionSchema, 
  insertAccountTargetAllocationSchema,
  type InsertPosition, 
  type Position, 
  type UniversalHolding,
  type PlannedPortfolioWithAllocations,
  type AccountTargetAllocationWithHolding
} from "@shared/schema";
import type { z } from "zod";

type PositionFormData = z.infer<typeof insertPositionSchema>;
type AllocationFormData = z.infer<typeof insertAccountTargetAllocationSchema>;

interface PortfolioComparisonItem {
  allocationId: string | null;
  ticker: string;
  name: string;
  targetPercentage: number;
  actualPercentage: number;
  variance: number;
  actualValue: number;
  targetValue: number;
  quantity: number;
  status: 'over' | 'under' | 'on-target' | 'unexpected';
}

interface PortfolioComparisonData {
  hasTargetAllocations: boolean;
  comparison: PortfolioComparisonItem[];
  totalActualValue: number;
  totalTargetPercentage: number;
}

export default function AccountDetails() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, params] = useRoute("/account/:accountType/:accountId");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<AccountTargetAllocationWithHolding | null>(null);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const accountType = params?.accountType as "individual" | "corporate" | "joint" | undefined;
  const accountId = params?.accountId;

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

  // Determine the correct API endpoint based on account type
  const getPositionsEndpoint = () => {
    if (!accountType || !accountId) return null;
    switch (accountType) {
      case "individual":
        return `/api/individual-accounts/${accountId}/positions`;
      case "corporate":
        return `/api/corporate-accounts/${accountId}/positions`;
      case "joint":
        return `/api/joint-accounts/${accountId}/positions`;
      default:
        return null;
    }
  };

  const positionsEndpoint = getPositionsEndpoint();

  const { data: positions = [], isLoading } = useQuery<Position[]>({
    queryKey: [positionsEndpoint],
    enabled: isAuthenticated && !!positionsEndpoint,
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

  // Fetch portfolio comparison data
  const comparisonEndpoint = accountType && accountId 
    ? `/api/accounts/${accountType}/${accountId}/portfolio-comparison` 
    : null;

  const { data: comparisonData, isLoading: comparisonLoading } = useQuery<PortfolioComparisonData>({
    queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'],
    enabled: isAuthenticated && !!comparisonEndpoint,
  });

  // Fetch target allocations for this account
  const targetAllocationsEndpoint = accountType && accountId
    ? `/api/accounts/${accountType}/${accountId}/target-allocations`
    : null;

  const { data: targetAllocations = [] } = useQuery<AccountTargetAllocationWithHolding[]>({
    queryKey: ['/api/accounts', accountType, accountId, 'target-allocations'],
    enabled: isAuthenticated && !!targetAllocationsEndpoint,
  });

  // Fetch universal holdings for the allocation form
  const { data: universalHoldings = [] } = useQuery<UniversalHolding[]>({
    queryKey: ['/api/universal-holdings'],
    enabled: isAuthenticated,
  });

  // Fetch model portfolios for copy feature
  const { data: modelPortfolios = [] } = useQuery<PlannedPortfolioWithAllocations[]>({
    queryKey: ['/api/planned-portfolios'],
    enabled: isAuthenticated,
  });

  const form = useForm<PositionFormData>({
    resolver: zodResolver(insertPositionSchema),
    defaultValues: {
      symbol: "",
      quantity: "",
      entryPrice: "",
      purchaseDate: undefined,
    },
  });

  useEffect(() => {
    if (editingPosition) {
      form.reset({
        symbol: editingPosition.symbol,
        quantity: editingPosition.quantity,
        entryPrice: editingPosition.entryPrice,
        purchaseDate: editingPosition.purchaseDate || undefined,
        individualAccountId: editingPosition.individualAccountId || undefined,
        corporateAccountId: editingPosition.corporateAccountId || undefined,
        jointAccountId: editingPosition.jointAccountId || undefined,
      });
    } else {
      form.reset({
        symbol: "",
        quantity: "",
        entryPrice: "",
        purchaseDate: undefined,
        individualAccountId: accountType === "individual" ? accountId : undefined,
        corporateAccountId: accountType === "corporate" ? accountId : undefined,
        jointAccountId: accountType === "joint" ? accountId : undefined,
      });
    }
  }, [editingPosition, accountType, accountId, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertPosition) => {
      return await apiRequest("POST", "/api/positions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [positionsEndpoint] });
      queryClient.refetchQueries({ queryKey: ["/api/households/full"] });
      toast({
        title: "Success",
        description: "Position created successfully",
      });
      handleDialogChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create position",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPosition> }) => {
      return await apiRequest("PATCH", `/api/positions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [positionsEndpoint] });
      queryClient.refetchQueries({ queryKey: ["/api/households/full"] });
      toast({
        title: "Success",
        description: "Position updated successfully",
      });
      handleDialogChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update position",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/positions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [positionsEndpoint] });
      queryClient.refetchQueries({ queryKey: ["/api/households/full"] });
      toast({
        title: "Success",
        description: "Position deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete position",
        variant: "destructive",
      });
    },
  });

  // Allocation form
  const allocationForm = useForm<AllocationFormData>({
    resolver: zodResolver(insertAccountTargetAllocationSchema),
    defaultValues: {
      universalHoldingId: "",
      targetPercentage: "",
    },
  });

  useEffect(() => {
    if (editingAllocation) {
      allocationForm.reset({
        universalHoldingId: editingAllocation.universalHoldingId,
        targetPercentage: editingAllocation.targetPercentage,
      });
    } else {
      allocationForm.reset({
        universalHoldingId: "",
        targetPercentage: "",
      });
    }
  }, [editingAllocation, allocationForm]);

  // Allocation mutations
  const createAllocationMutation = useMutation({
    mutationFn: async (data: AllocationFormData) => {
      return await apiRequest("POST", `/api/accounts/${accountType}/${accountId}/target-allocations`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountType, accountId, 'target-allocations'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
      await queryClient.refetchQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
      toast({
        title: "Success",
        description: "Target allocation added successfully",
      });
      handleAllocationDialogChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add target allocation",
        variant: "destructive",
      });
    },
  });

  const updateAllocationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AllocationFormData> }) => {
      return await apiRequest("PATCH", `/api/account-target-allocations/${id}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountType, accountId, 'target-allocations'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
      await queryClient.refetchQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
      toast({
        title: "Success",
        description: "Target allocation updated successfully",
      });
      handleAllocationDialogChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update target allocation",
        variant: "destructive",
      });
    },
  });

  const deleteAllocationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/account-target-allocations/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountType, accountId, 'target-allocations'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
      await queryClient.refetchQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
      toast({
        title: "Success",
        description: "Target allocation deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete target allocation",
        variant: "destructive",
      });
    },
  });

  const copyFromPortfolioMutation = useMutation({
    mutationFn: async (portfolioId: string) => {
      return await apiRequest("POST", `/api/accounts/${accountType}/${accountId}/copy-from-portfolio/${portfolioId}`);
    },
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountType, accountId, 'target-allocations'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
      await queryClient.refetchQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
      toast({
        title: "Success",
        description: `Copied ${data.allocationsCount} allocations from ${data.copiedFrom}`,
      });
      setIsCopyDialogOpen(false);
      setSelectedPortfolioId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to copy allocations from portfolio",
        variant: "destructive",
      });
    },
  });

  const onAllocationSubmit = (data: AllocationFormData) => {
    if (editingAllocation) {
      updateAllocationMutation.mutate({ id: editingAllocation.id, data });
    } else {
      createAllocationMutation.mutate(data);
    }
  };

  const handleEditAllocation = (allocation: AccountTargetAllocationWithHolding) => {
    setEditingAllocation(allocation);
    setIsAllocationDialogOpen(true);
  };

  const handleDeleteAllocation = (id: string) => {
    if (confirm("Are you sure you want to delete this target allocation?")) {
      deleteAllocationMutation.mutate(id);
    }
  };

  const handleAllocationDialogChange = (open: boolean) => {
    setIsAllocationDialogOpen(open);
    if (!open) {
      setEditingAllocation(null);
      allocationForm.reset();
    }
  };

  const handleCopyFromPortfolio = () => {
    if (selectedPortfolioId) {
      copyFromPortfolioMutation.mutate(selectedPortfolioId);
    }
  };

  const onSubmit = (data: PositionFormData) => {
    if (editingPosition) {
      updateMutation.mutate({ id: editingPosition.id, data });
    } else {
      createMutation.mutate(data as InsertPosition);
    }
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this position?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingPosition(null);
      form.reset();
    }
  };

  // File Upload handler (CSV and Excel)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let rows: string[][] = [];

      if (fileExtension === 'csv') {
        // Parse CSV
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        rows = lines.map(line => line.split(',').map(v => v.trim().replace(/['"$]/g, '')));
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parse Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
        rows = jsonData.map(row => row.map(cell => String(cell ?? '').replace(/['"$]/g, '')));
      } else {
        throw new Error("Unsupported file format. Please use CSV or Excel (.xlsx, .xls)");
      }

      if (rows.length < 2) {
        throw new Error("File must have a header row and at least one data row");
      }

      // Parse header to find column indices
      const header = rows[0].map(h => h.toLowerCase().trim());
      
      // Find column indices based on expected headers
      const tickerIndex = header.findIndex(h => h.includes('ticker') || h.includes('symbol') || h === 'security symbol');
      const securityNameIndex = header.findIndex(h => h === 'security' || h === 'security name' || h === 'name');
      const quantityIndex = header.findIndex(h => h.includes('quantity') || h.includes('qty'));
      const avgCostIndex = header.findIndex(h => h.includes('average cost') || h.includes('avg cost') || h.includes('book cost') || (h.includes('cost') && !h.includes('book')));
      
      // Look for per-share market price first, then market value (total)
      // "market price" could mean per-share OR total value depending on the source
      let marketPriceIndex = header.findIndex(h => 
        (h.includes('market price') || h.includes('current price') || h.includes('price/share') || h === 'price') && 
        !h.includes('value')
      );
      
      // If no specific price column, look for market value (we'll calculate per-share from it)
      const marketValueIndex = header.findIndex(h => 
        h.includes('market value') || h.includes('market val') || h.includes('mkt value') || h.includes('mkt val')
      );
      
      // Fall back to generic "market" column if nothing specific found
      if (marketPriceIndex === -1 && marketValueIndex === -1) {
        marketPriceIndex = header.findIndex(h => h.includes('market') || h.includes('current'));
      }
      
      // Determine which column to use for pricing
      const useMarketValue = marketPriceIndex === -1 && marketValueIndex !== -1;
      const priceColumnIndex = useMarketValue ? marketValueIndex : marketPriceIndex;

      if (tickerIndex === -1 || quantityIndex === -1 || avgCostIndex === -1 || priceColumnIndex === -1) {
        throw new Error("File must contain columns: ticker symbol, quantity, average cost, and market price (or market value)");
      }

      // Parse data rows
      const positions = [];
      const cashIdentifiers = ['cash', 'cad', '$cad', 'cad$', 'cash cad', 'canadian dollar', 'money market'];
      
      console.log('[Import Debug] Column indices:', { tickerIndex, quantityIndex, avgCostIndex, priceColumnIndex, useMarketValue });
      console.log('[Import Debug] Headers found:', header);
      
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        
        // Check if row has enough columns for all required indices
        const maxIndex = Math.max(tickerIndex, quantityIndex, avgCostIndex, priceColumnIndex);
        if (!values || values.length <= maxIndex) {
          console.log(`[Import Debug] Skipping row ${i}: not enough columns (${values?.length || 0} <= ${maxIndex})`);
          continue; // Skip incomplete rows
        }

        const rawSymbol = String(values[tickerIndex]).trim();
        const securityName = securityNameIndex !== -1 ? String(values[securityNameIndex] ?? '').trim().toLowerCase() : '';
        console.log(`[Import Debug] Row ${i}: symbol="${rawSymbol}", security="${securityName}", qty="${values[quantityIndex]}", cost="${values[avgCostIndex]}", price="${values[priceColumnIndex]}"`);
        const symbolLower = rawSymbol.toLowerCase();
        
        // Check if this is a cash position - by symbol, security name, or if empty symbol with $1 price
        const rawPrice = parseFloat(String(values[priceColumnIndex]).replace(/,/g, ''));
        const isCashBySymbol = cashIdentifiers.some(id => symbolLower === id || symbolLower.includes(id));
        const isCashByName = cashIdentifiers.some(id => securityName === id || securityName.includes(id));
        const isCashByPrice = rawSymbol === '' && Math.abs(rawPrice - 1) < 0.01; // Empty symbol with $1 price = likely cash
        const isCash = isCashBySymbol || isCashByName || isCashByPrice;
        
        const quantity = parseFloat(String(values[quantityIndex]).replace(/,/g, ''));
        
        // For cash positions, prices are always 1.00
        let entryPrice: number;
        let currentPrice: number;
        let symbol: string;
        
        if (isCash) {
          symbol = "CASH";
          entryPrice = 1.00;
          currentPrice = 1.00;
        } else {
          symbol = rawSymbol.toUpperCase();
          entryPrice = parseFloat(String(values[avgCostIndex]).replace(/,/g, ''));
          const rawMarketPrice = parseFloat(String(values[priceColumnIndex]).replace(/,/g, ''));
          
          // If using market value column OR if the "price" seems too high (likely total value)
          // Calculate per-share price by dividing by quantity
          if (useMarketValue || (quantity > 0 && rawMarketPrice > entryPrice * 10 && rawMarketPrice > 1000)) {
            // This is likely a market value (total), calculate per-share price
            currentPrice = quantity > 0 ? rawMarketPrice / quantity : rawMarketPrice;
          } else {
            currentPrice = rawMarketPrice;
          }
        }

        // Skip rows with no symbol (unless it's cash) or zero/invalid quantity
        if (symbol && !isNaN(quantity) && quantity > 0 && !isNaN(entryPrice) && !isNaN(currentPrice)) {
          positions.push({ symbol, quantity, entryPrice, currentPrice });
          console.log(`[Import Debug] Added position: ${symbol} qty=${quantity} entry=${entryPrice} current=${currentPrice}`);
        } else {
          console.log(`[Import Debug] Skipped row: symbol="${symbol}" qty=${quantity} valid=${!isNaN(quantity) && quantity > 0}`);
        }
      }

      if (positions.length === 0) {
        throw new Error("No valid positions found in file");
      }

      // Upload to server
      const response = await apiRequest("POST", "/api/positions/bulk", {
        positions,
        accountType,
        accountId
      }) as unknown as { success: boolean; created: number; errors?: any[]; message: string };

      await queryClient.invalidateQueries({ queryKey: [positionsEndpoint] });

      toast({
        title: "Import Complete",
        description: response.message || `Imported ${response.created} positions`,
      });

      if (response.errors && response.errors.length > 0) {
        console.error("Import errors:", response.errors);
      }
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  if (!accountType || !accountId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link href="/households">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Invalid Account</h1>
        </div>
        <p>Account type or ID is missing.</p>
      </div>
    );
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading...</p>
      </div>
    );
  }

  const totalQuantity = positions.reduce((sum, p) => sum + Number(p.quantity), 0);
  const totalBookValue = positions.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.entryPrice)), 0);
  const totalMarketValue = positions.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.currentPrice)), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/households">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Account Positions</h1>
            <p className="text-muted-foreground">
              {accountType.charAt(0).toUpperCase() + accountType.slice(1)} Account
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            data-testid="input-file-upload"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={isUploading}
            data-testid="button-upload-file"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isUploading ? "Importing..." : "Import"}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-position">
                <Plus className="mr-2 h-4 w-4" />
                Add Position
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPosition ? "Edit Position" : "Add New Position"}</DialogTitle>
              <DialogDescription>
                {editingPosition ? "Update the position details below." : "Enter the details for the new position."}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="AAPL" data-testid="input-symbol" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="100" data-testid="input-quantity" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="entryPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entry Price (CAD)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="150.00" data-testid="input-entry-price" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Date (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          data-testid="input-purchase-date"
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => handleDialogChange(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingPosition ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-positions">{positions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-quantity">{totalQuantity.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-value">
              ${totalMarketValue.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Book Value: ${totalBookValue.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Target Allocations Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Target Allocations
              </CardTitle>
              <CardDescription>
                Define target asset allocation percentages for this account
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-copy-from-portfolio">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy from Model
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Copy from Model Portfolio</DialogTitle>
                    <DialogDescription>
                      Select a model portfolio to copy its allocations. This will replace any existing target allocations.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
                      <SelectTrigger data-testid="select-model-portfolio">
                        <SelectValue placeholder="Select a model portfolio" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelPortfolios.map((portfolio) => (
                          <SelectItem key={portfolio.id} value={portfolio.id} data-testid={`option-portfolio-${portfolio.id}`}>
                            {portfolio.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCopyDialogOpen(false)} data-testid="button-cancel-copy">
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCopyFromPortfolio} 
                        disabled={!selectedPortfolioId || copyFromPortfolioMutation.isPending}
                        data-testid="button-confirm-copy"
                      >
                        {copyFromPortfolioMutation.isPending ? "Copying..." : "Copy Allocations"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isAllocationDialogOpen} onOpenChange={handleAllocationDialogChange}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-allocation">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Allocation
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingAllocation ? "Edit Target Allocation" : "Add Target Allocation"}</DialogTitle>
                    <DialogDescription>
                      {editingAllocation ? "Update the allocation details." : "Select a holding and set a target percentage."}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...allocationForm}>
                    <form onSubmit={allocationForm.handleSubmit(onAllocationSubmit)} className="space-y-4">
                      <FormField
                        control={allocationForm.control}
                        name="universalHoldingId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Security</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-holding">
                                  <SelectValue placeholder="Select a security" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {universalHoldings.map((holding) => (
                                  <SelectItem key={holding.id} value={holding.id} data-testid={`option-holding-${holding.id}`}>
                                    {holding.ticker} - {holding.name}
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
                            <FormLabel>Target Percentage</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                min="0.01"
                                max="100"
                                placeholder="25.00" 
                                data-testid="input-target-percentage" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => handleAllocationDialogChange(false)} data-testid="button-cancel-allocation">
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          data-testid="button-submit-allocation" 
                          disabled={createAllocationMutation.isPending || updateAllocationMutation.isPending}
                        >
                          {createAllocationMutation.isPending || updateAllocationMutation.isPending 
                            ? "Saving..." 
                            : editingAllocation ? "Update" : "Add"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {targetAllocations.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No target allocations defined. Add allocations manually or copy from a model portfolio.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead className="text-right">Target %</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targetAllocations.map((allocation) => (
                    <TableRow key={allocation.id} data-testid={`row-allocation-${allocation.id}`}>
                      <TableCell className="font-medium" data-testid={`text-alloc-ticker-${allocation.id}`}>
                        {allocation.holding?.ticker}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm" data-testid={`text-alloc-name-${allocation.id}`}>
                        {allocation.holding?.name}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-alloc-pct-${allocation.id}`}>
                        {Number(allocation.targetPercentage).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditAllocation(allocation)}
                            data-testid={`button-edit-allocation-${allocation.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAllocation(allocation.id)}
                            data-testid={`button-delete-allocation-${allocation.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end">
                <Badge variant={
                  targetAllocations.reduce((sum, a) => sum + Number(a.targetPercentage), 0) === 100 
                    ? "default" 
                    : "secondary"
                } data-testid="badge-total-allocation">
                  Total: {targetAllocations.reduce((sum, a) => sum + Number(a.targetPercentage), 0).toFixed(2)}%
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Comparison Section */}
      {comparisonData?.hasTargetAllocations && (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Comparison</CardTitle>
            <CardDescription>
              Actual holdings vs. target allocations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {comparisonLoading ? (
              <p className="text-muted-foreground text-center py-4">Loading comparison...</p>
            ) : comparisonData.comparison.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No positions yet to compare against targets.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead className="text-right">Target %</TableHead>
                    <TableHead className="text-right">Actual %</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Target Value</TableHead>
                    <TableHead className="text-right">Actual Value</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.comparison.map((item) => (
                    <TableRow key={item.ticker} data-testid={`row-comparison-${item.ticker}`}>
                      <TableCell className="font-medium" data-testid={`text-ticker-${item.ticker}`}>
                        {item.ticker}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm" data-testid={`text-name-${item.ticker}`}>
                        {item.name}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-target-pct-${item.ticker}`}>
                        {item.targetPercentage.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-actual-pct-${item.ticker}`}>
                        {item.actualPercentage.toFixed(2)}%
                      </TableCell>
                      <TableCell 
                        className={`text-right font-medium ${
                          item.variance > 0 ? 'text-green-600 dark:text-green-400' : 
                          item.variance < 0 ? 'text-red-600 dark:text-red-400' : ''
                        }`}
                        data-testid={`text-variance-${item.ticker}`}
                      >
                        {item.variance > 0 ? '+' : ''}{item.variance.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-target-value-${item.ticker}`}>
                        ${item.targetValue.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-actual-value-${item.ticker}`}>
                        ${item.actualValue.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center" data-testid={`badge-status-${item.ticker}`}>
                        {item.status === 'over' && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Over
                          </Badge>
                        )}
                        {item.status === 'under' && (
                          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Under
                          </Badge>
                        )}
                        {item.status === 'on-target' && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            <Minus className="h-3 w-3 mr-1" />
                            On Target
                          </Badge>
                        )}
                        {item.status === 'unexpected' && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Not in Target
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show message if no target allocations defined */}
      {!comparisonLoading && comparisonData && !comparisonData.hasTargetAllocations && (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">
              No target allocations defined for this account. Add target allocations above to see comparison data.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Positions</CardTitle>
          <CardDescription>
            All holdings in this account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No positions yet. Click "Add Position" to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Book Value</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.id} data-testid={`row-position-${position.id}`}>
                    <TableCell className="font-medium" data-testid={`text-symbol-${position.id}`}>
                      {position.symbol}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-quantity-${position.id}`}>
                      {Number(position.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-entry-price-${position.id}`}>
                      ${Number(position.entryPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-book-value-${position.id}`}>
                      ${(Number(position.quantity) * Number(position.entryPrice)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-current-price-${position.id}`}>
                      ${Number(position.currentPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium" data-testid={`text-market-value-${position.id}`}>
                      ${(Number(position.quantity) * Number(position.currentPrice)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell data-testid={`text-purchase-date-${position.id}`}>
                      {position.purchaseDate ? new Date(position.purchaseDate).toLocaleDateString('en-CA') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(position)}
                          data-testid={`button-edit-${position.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(position.id)}
                          data-testid={`button-delete-${position.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
