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
import { Plus, Pencil, Trash2, ArrowLeft, TrendingUp, TrendingDown, Minus, AlertTriangle, Copy, Target, Upload, FileSpreadsheet, RefreshCw, Check, ChevronsUpDown, ChevronDown, ChevronRight, Mail, Send, DollarSign, Shield } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
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
  type FreelancePortfolioWithAllocations,
  type AccountTargetAllocationWithHolding,
  type IndividualAccount,
  type CorporateAccount,
  type JointAccount
} from "@shared/schema";
import type { z } from "zod";
import {
  CATEGORY_LABELS,
  CATEGORY_TO_RISK_LEVEL,
  validateRiskLimits,
  calculateBlendedLimits,
  formatRiskAllocation,
  getRiskAllocationFromAccount,
  type RiskAllocation,
  type HoldingCategory,
  type RiskLevel,
  type RiskValidationResult,
} from "@shared/riskConfig";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [selectedPortfolioType, setSelectedPortfolioType] = useState<"planned" | "freelance">("planned");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [editingInlineTarget, setEditingInlineTarget] = useState<string | null>(null);
  const [inlineTargetValue, setInlineTargetValue] = useState<string>("");
  const [holdingComboboxOpen, setHoldingComboboxOpen] = useState(false);
  const [isTargetAllocationsOpen, setIsTargetAllocationsOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [riskMedium, setRiskMedium] = useState("100");
  const [riskMediumHigh, setRiskMediumHigh] = useState("0");
  const [riskHigh, setRiskHigh] = useState("0");
  const [isEditingRisk, setIsEditingRisk] = useState(false);

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

  const getAccountEndpoint = () => {
    if (!accountType || !accountId) return null;
    switch (accountType) {
      case "individual":
        return `/api/individual-accounts/${accountId}`;
      case "corporate":
        return `/api/corporate-accounts/${accountId}`;
      case "joint":
        return `/api/joint-accounts/${accountId}`;
      default:
        return null;
    }
  };

  const positionsEndpoint = getPositionsEndpoint();
  const accountEndpoint = getAccountEndpoint();

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

  // Fetch account details to get the specific account type
  const { data: accountData } = useQuery<IndividualAccount | CorporateAccount | JointAccount>({
    queryKey: [accountEndpoint],
    enabled: isAuthenticated && !!accountEndpoint,
  });

  // Sync risk allocation state with account data when it loads
  useEffect(() => {
    if (accountData) {
      const allocation = getRiskAllocationFromAccount(accountData);
      setRiskMedium(allocation.medium.toString());
      setRiskMediumHigh(allocation.mediumHigh.toString());
      setRiskHigh(allocation.high.toString());
    }
  }, [accountData]);

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
  const { data: plannedPortfolios = [] } = useQuery<PlannedPortfolioWithAllocations[]>({
    queryKey: ['/api/planned-portfolios'],
    enabled: isAuthenticated,
  });

  // Fetch freelance portfolios for copy feature
  const { data: freelancePortfolios = [] } = useQuery<FreelancePortfolioWithAllocations[]>({
    queryKey: ['/api/freelance-portfolios'],
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [positionsEndpoint] });
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
      await queryClient.refetchQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [positionsEndpoint] });
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
      await queryClient.refetchQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [positionsEndpoint] });
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
      await queryClient.refetchQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
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

  // Helper to refresh all allocation-related data
  const refreshAllocationData = async () => {
    // Invalidate any queries containing the account ID to catch all related data
    await queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey;
        if (Array.isArray(key)) {
          // Check if any part of the key contains the account ID
          return key.some(part => 
            typeof part === 'string' && 
            (part.includes(accountId || '') || 
             part.includes('target-allocation') || 
             part.includes('portfolio-comparison') ||
             part.includes('positions'))
          );
        }
        return false;
      },
      refetchType: 'active'
    });
  };

  // Allocation mutations
  const createAllocationMutation = useMutation({
    mutationFn: async (data: AllocationFormData) => {
      return await apiRequest("POST", `/api/accounts/${accountType}/${accountId}/target-allocations`, data);
    },
    onSuccess: async () => {
      await refreshAllocationData();
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
      await refreshAllocationData();
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
      await refreshAllocationData();
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
    mutationFn: async ({ portfolioId, portfolioType }: { portfolioId: string; portfolioType: "planned" | "freelance" }) => {
      const res = await apiRequest("POST", `/api/accounts/${accountType}/${accountId}/copy-from-portfolio/${portfolioId}?portfolioType=${portfolioType}`);
      return await res.json();
    },
    onSuccess: async (data: any) => {
      await refreshAllocationData();
      toast({
        title: "Success",
        description: `Copied ${data.allocationsCount} allocations from ${data.copiedFrom}`,
      });
      setIsCopyDialogOpen(false);
      setSelectedPortfolioId("");
      setSelectedPortfolioType("planned");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to copy allocations from portfolio",
        variant: "destructive",
      });
    },
  });

  // Refresh market prices mutation
  const refreshPricesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/accounts/${accountType}/${accountId}/refresh-prices`);
      return await res.json();
    },
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: [positionsEndpoint] });
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
      queryClient.refetchQueries({ queryKey: ["/api/households/full"] });
      
      let message = `Updated ${data.updated} position${data.updated !== 1 ? 's' : ''} with current market prices`;
      if (data.errors && data.errors.length > 0) {
        message += `. Could not find prices for: ${data.errors.join(', ')}`;
      }
      
      toast({
        title: "Prices Refreshed",
        description: message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to refresh market prices",
        variant: "destructive",
      });
    },
  });

  // Inline target allocation mutation
  const inlineTargetMutation = useMutation({
    mutationFn: async ({ ticker, targetPercentage }: { ticker: string; targetPercentage: string }) => {
      const res = await apiRequest("POST", `/api/accounts/${accountType}/${accountId}/inline-target-allocation`, {
        ticker,
        targetPercentage,
      });
      return await res.json();
    },
    onSuccess: async (data: any) => {
      await refreshAllocationData();
      await queryClient.invalidateQueries({ queryKey: ['/api/universal-holdings'] });
      
      setEditingInlineTarget(null);
      setInlineTargetValue("");
      
      if (data.holdingAutoAdded) {
        toast({
          title: "Target Set",
          description: `Target allocation set. Ticker was automatically added to Universal Holdings.`,
        });
      } else if (data.action === 'deleted') {
        toast({
          title: "Target Removed",
          description: "Target allocation has been removed.",
        });
      } else {
        toast({
          title: "Target Updated",
          description: `Target allocation ${data.action === 'created' ? 'added' : 'updated'} successfully.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set target allocation",
        variant: "destructive",
      });
    },
  });

  const updateRiskAllocationMutation = useMutation({
    mutationFn: async (allocation: RiskAllocation) => {
      const endpoint = accountEndpoint;
      if (!endpoint) throw new Error("Account endpoint not available");
      return await apiRequest("PATCH", endpoint, { 
        riskMediumPct: allocation.medium.toString(),
        riskMediumHighPct: allocation.mediumHigh.toString(),
        riskHighPct: allocation.high.toString(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: [accountEndpoint],
        refetchType: 'active',
      });
      toast({
        title: "Risk Tolerance Updated",
        description: "Account risk tolerance has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update risk tolerance",
        variant: "destructive",
      });
    },
  });

  const handleInlineTargetEdit = (position: Position) => {
    const normalizedSymbol = normalizeTicker(position.symbol);
    const comparison = comparisonData?.comparison.find(c => normalizeTicker(c.ticker) === normalizedSymbol);
    setEditingInlineTarget(position.id);
    setInlineTargetValue(comparison?.targetPercentage?.toString() || "");
  };

  const handleInlineTargetSave = (position: Position) => {
    const trimmedValue = inlineTargetValue.trim();
    const normalizedSymbol = normalizeTicker(position.symbol);
    const comparison = comparisonData?.comparison.find(c => normalizeTicker(c.ticker) === normalizedSymbol);
    const currentTarget = comparison?.targetPercentage || 0;
    
    // Empty or blank means delete the allocation (only if one exists)
    if (trimmedValue === "") {
      if (currentTarget > 0) {
        inlineTargetMutation.mutate({
          ticker: position.symbol,
          targetPercentage: "",
        });
      } else {
        // No allocation exists, just cancel editing
        handleInlineTargetCancel();
      }
      return;
    }
    
    const targetPct = parseFloat(trimmedValue);
    if (isNaN(targetPct)) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      // Reset to original value
      setInlineTargetValue(currentTarget > 0 ? currentTarget.toString() : "");
      return;
    }
    
    if (targetPct < 0 || targetPct > 100) {
      toast({
        title: "Invalid Value",
        description: "Target percentage must be between 0 and 100",
        variant: "destructive",
      });
      // Reset to original value
      setInlineTargetValue(currentTarget > 0 ? currentTarget.toString() : "");
      return;
    }
    
    // If setting to 0, treat as deletion
    if (targetPct === 0) {
      if (currentTarget > 0) {
        inlineTargetMutation.mutate({
          ticker: position.symbol,
          targetPercentage: "",
        });
      } else {
        handleInlineTargetCancel();
      }
      return;
    }
    
    // Only save if value actually changed
    if (Math.abs(targetPct - currentTarget) < 0.01) {
      handleInlineTargetCancel();
      return;
    }
    
    inlineTargetMutation.mutate({
      ticker: position.symbol,
      targetPercentage: trimmedValue,
    });
  };

  const handleInlineTargetCancel = () => {
    setEditingInlineTarget(null);
    setInlineTargetValue("");
  };

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

  const computeRiskValidation = (): RiskValidationResult | null => {
    const riskAllocation = getRiskAllocationFromAccount(accountData);
    const selectedHoldingId = allocationForm.watch("universalHoldingId");
    const targetPct = parseFloat(allocationForm.watch("targetPercentage") || "0");
    
    if (!selectedHoldingId || isNaN(targetPct) || targetPct <= 0) {
      return null;
    }
    
    const selectedHolding = universalHoldings.find(h => h.id === selectedHoldingId);
    if (!selectedHolding) {
      return null;
    }
    
    const existingAllocations = targetAllocations
      .filter(a => a.id !== editingAllocation?.id)
      .map(a => ({
        category: a.holding.category as HoldingCategory,
        targetPercentage: parseFloat(a.targetPercentage),
      }));
    
    const newAllocation = {
      category: selectedHolding.category as HoldingCategory,
      targetPercentage: targetPct,
    };
    
    const allAllocations = [...existingAllocations, newAllocation];
    return validateRiskLimits(allAllocations, riskAllocation);
  };

  const computePortfolioRiskValidation = (): RiskValidationResult | null => {
    const riskAllocation = getRiskAllocationFromAccount(accountData);
    
    if (!selectedPortfolioId) return null;
    
    const portfolio = selectedPortfolioType === "planned"
      ? plannedPortfolios.find(p => p.id === selectedPortfolioId)
      : freelancePortfolios.find(p => p.id === selectedPortfolioId);
    
    if (!portfolio || !portfolio.allocations || portfolio.allocations.length === 0) return null;
    
    const allocations = portfolio.allocations.map(a => ({
      category: a.holding.category as HoldingCategory,
      targetPercentage: parseFloat(a.targetPercentage),
    }));
    
    return validateRiskLimits(allocations, riskAllocation);
  };

  const computeCurrentAllocationsRiskStatus = () => {
    const riskAllocation = getRiskAllocationFromAccount(accountData);
    
    const riskLevelTotals: Record<RiskLevel, number> = {
      medium: 0,
      medium_high: 0,
      high: 0,
    };
    
    for (const alloc of targetAllocations) {
      const category = alloc.holding?.category as HoldingCategory;
      if (category && CATEGORY_TO_RISK_LEVEL[category]) {
        const riskLevel = CATEGORY_TO_RISK_LEVEL[category];
        riskLevelTotals[riskLevel] += parseFloat(alloc.targetPercentage);
      }
    }
    
    const riskLevels = [
      { key: "medium" as RiskLevel, label: "Medium Risk", current: riskLevelTotals.medium, allowed: riskAllocation.medium },
      { key: "medium_high" as RiskLevel, label: "Medium/High Risk", current: riskLevelTotals.medium_high, allowed: riskAllocation.mediumHigh },
      { key: "high" as RiskLevel, label: "High Risk", current: riskLevelTotals.high, allowed: riskAllocation.high },
    ];
    
    return riskLevels.map(level => ({
      ...level,
      status: level.current > level.allowed ? "violation" as const : 
              level.allowed > 0 && level.current > level.allowed * 0.8 ? "warning" as const : "ok" as const,
    }));
  };

  const handleCopyFromPortfolio = () => {
    if (selectedPortfolioId) {
      copyFromPortfolioMutation.mutate({ 
        portfolioId: selectedPortfolioId, 
        portfolioType: selectedPortfolioType 
      });
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

  // Process file (CSV and Excel)
  const processFile = async (file: File) => {
    setIsUploading(true);
    setIsDragging(false);

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
    }
  };

  // File input change handler
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
      // Reset file input
      event.target.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        processFile(file);
      } else {
        toast({
          title: "Invalid File",
          description: "Please drop a CSV or Excel file (.csv, .xlsx, .xls)",
          variant: "destructive",
        });
      }
    }
  };

  // Add cash deposit handler
  const handleAddCash = () => {
    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid cash amount",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      symbol: "CASH",
      quantity: amount.toString(),
      entryPrice: "1",
      currentPrice: "1",
      individualAccountId: accountType === "individual" ? accountId : undefined,
      corporateAccountId: accountType === "corporate" ? accountId : undefined,
      jointAccountId: accountType === "joint" ? accountId : undefined,
    } as InsertPosition);

    setIsCashDialogOpen(false);
    setCashAmount("");
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

  const totalBookValue = positions.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.entryPrice)), 0);
  const totalMarketValue = positions.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.currentPrice)), 0);

  // Helper function to normalize tickers for comparison (strip exchange suffixes)
  // e.g., "XIC.TO" -> "XIC", "VFV.V" -> "VFV", "AAPL" -> "AAPL"
  const normalizeTicker = (ticker: string): string => {
    return ticker.toUpperCase().replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '');
  };

  // Format the specific account type for display: "[Account Type]: [Nickname]" or just "[Account Type]"
  const getAccountTypeLabel = () => {
    if (!accountData) return `${accountType?.charAt(0).toUpperCase()}${accountType?.slice(1)} Account`;
    
    const typeLabels: Record<string, string> = {
      // Individual account types
      cash: "Cash Account",
      tfsa: "TFSA",
      fhsa: "FHSA",
      rrsp: "RRSP",
      lira: "LIRA",
      liff: "LIF",
      rif: "RIF",
      // Corporate account types
      ipp: "IPP (Individual Pension Plan)",
      // Joint account types
      joint_cash: "Joint Cash Account",
      resp: "RESP",
    };

    const typeLabel = typeLabels[accountData.type] || accountData.type.toUpperCase();
    
    // Include nickname if available
    if (accountData.nickname && accountData.nickname.trim()) {
      return `${typeLabel}: ${accountData.nickname}`;
    }
    
    return typeLabel;
  };

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
            <h1 className="text-3xl font-bold" data-testid="text-account-type">{getAccountTypeLabel()}</h1>
            <p className="text-muted-foreground">
              {accountType?.charAt(0).toUpperCase()}{accountType?.slice(1)} Account Positions
            </p>
          </div>
        </div>

      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Risk Tolerance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const currentAllocation = getRiskAllocationFromAccount(accountData);
              const total = parseFloat(riskMedium || "0") + parseFloat(riskMediumHigh || "0") + parseFloat(riskHigh || "0");
              const isValid = Math.abs(total - 100) < 0.01;
              
              const handleSave = () => {
                if (isValid) {
                  updateRiskAllocationMutation.mutate({
                    medium: parseFloat(riskMedium || "0"),
                    mediumHigh: parseFloat(riskMediumHigh || "0"),
                    high: parseFloat(riskHigh || "0"),
                  });
                  setIsEditingRisk(false);
                }
              };
              
              const handleCancel = () => {
                setRiskMedium(currentAllocation.medium.toString());
                setRiskMediumHigh(currentAllocation.mediumHigh.toString());
                setRiskHigh(currentAllocation.high.toString());
                setIsEditingRisk(false);
              };
              
              if (!isEditingRisk) {
                return (
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold" data-testid="text-risk-allocation">
                      {formatRiskAllocation(currentAllocation)}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsEditingRisk(true)}
                      data-testid="button-edit-risk"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                );
              }
              
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Medium %</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="5"
                        value={riskMedium}
                        onChange={(e) => setRiskMedium(e.target.value)}
                        className="h-8"
                        data-testid="input-risk-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Med/High %</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="5"
                        value={riskMediumHigh}
                        onChange={(e) => setRiskMediumHigh(e.target.value)}
                        className="h-8"
                        data-testid="input-risk-medium-high"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">High %</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="5"
                        value={riskHigh}
                        onChange={(e) => setRiskHigh(e.target.value)}
                        className="h-8"
                        data-testid="input-risk-high"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs", isValid ? "text-muted-foreground" : "text-destructive font-medium")}>
                      Total: {total.toFixed(0)}% {!isValid && "(must equal 100%)"}
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost"
                        size="sm" 
                        onClick={handleCancel}
                        data-testid="button-cancel-risk"
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSave}
                        disabled={!isValid || updateRiskAllocationMutation.isPending}
                        data-testid="button-save-risk"
                      >
                        {updateRiskAllocationMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Target Allocations Management Section */}
      <Collapsible open={isTargetAllocationsOpen} onOpenChange={setIsTargetAllocationsOpen}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity" data-testid="button-toggle-target-allocations">
                  {isTargetAllocationsOpen ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Target Allocations
                      {targetAllocations.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {targetAllocations.length}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Define target asset allocation percentages for this account
                    </CardDescription>
                  </div>
                </button>
              </CollapsibleTrigger>
              <div className="flex gap-2">
                <Dialog open={isCopyDialogOpen} onOpenChange={(open) => {
                setIsCopyDialogOpen(open);
                if (!open) {
                  setSelectedPortfolioId("");
                  setSelectedPortfolioType("planned");
                }
              }}>
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
                    <Select 
                      value={selectedPortfolioId ? `${selectedPortfolioType}:${selectedPortfolioId}` : ""} 
                      onValueChange={(value) => {
                        const [type, id] = value.split(':');
                        setSelectedPortfolioType(type as "planned" | "freelance");
                        setSelectedPortfolioId(id);
                      }}
                    >
                      <SelectTrigger data-testid="select-model-portfolio">
                        <SelectValue placeholder="Select a model portfolio" />
                      </SelectTrigger>
                      <SelectContent>
                        {plannedPortfolios.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              Planned Portfolios
                            </div>
                            {plannedPortfolios.map((portfolio) => (
                              <SelectItem 
                                key={`planned-${portfolio.id}`} 
                                value={`planned:${portfolio.id}`} 
                                data-testid={`option-portfolio-planned-${portfolio.id}`}
                              >
                                {portfolio.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {freelancePortfolios.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
                              Freelance Portfolios
                            </div>
                            {freelancePortfolios.map((portfolio) => (
                              <SelectItem 
                                key={`freelance-${portfolio.id}`} 
                                value={`freelance:${portfolio.id}`} 
                                data-testid={`option-portfolio-freelance-${portfolio.id}`}
                              >
                                {portfolio.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {plannedPortfolios.length === 0 && freelancePortfolios.length === 0 && (
                          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                            No portfolios available. Create one in Model Portfolios.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    
                    {(() => {
                      const riskValidation = computePortfolioRiskValidation();
                      if (!riskValidation) return null;
                      
                      if (riskValidation.violations.length > 0) {
                        return (
                          <Alert variant="destructive" data-testid="alert-copy-risk-violation">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Risk Limit Exceeded</AlertTitle>
                            <AlertDescription>
                              <div className="space-y-1 mt-1">
                                {riskValidation.violations.map((v, i) => (
                                  <p key={i}>
                                    {CATEGORY_LABELS[v.category]}: {v.currentPercentage.toFixed(1)}% 
                                    (max {v.maxAllowed.toFixed(1)}% allowed)
                                  </p>
                                ))}
                              </div>
                              <p className="text-xs mt-2">
                                This portfolio exceeds the account's risk tolerance limits. You can still copy, but consider adjusting the allocations.
                              </p>
                            </AlertDescription>
                          </Alert>
                        );
                      }
                      
                      if (riskValidation.warnings.length > 0) {
                        return (
                          <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" data-testid="alert-copy-risk-warning">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <AlertTitle className="text-yellow-800 dark:text-yellow-400">Approaching Risk Limit</AlertTitle>
                            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                              <div className="space-y-1 mt-1">
                                {riskValidation.warnings.map((w, i) => (
                                  <p key={i}>
                                    {CATEGORY_LABELS[w.category]}: {w.currentPercentage.toFixed(1)}% 
                                    (max {w.maxAllowed.toFixed(1)}% allowed)
                                  </p>
                                ))}
                              </div>
                            </AlertDescription>
                          </Alert>
                        );
                      }
                      
                      return null;
                    })()}

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
                        render={({ field }) => {
                          const selectedHolding = universalHoldings.find(h => h.id === field.value);
                          return (
                            <FormItem className="flex flex-col">
                              <FormLabel>Security</FormLabel>
                              <Popover open={holdingComboboxOpen} onOpenChange={setHoldingComboboxOpen}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={holdingComboboxOpen}
                                      className={cn(
                                        "w-full justify-between",
                                        !field.value && "text-muted-foreground"
                                      )}
                                      data-testid="select-holding"
                                    >
                                      {selectedHolding 
                                        ? `${selectedHolding.ticker} - ${selectedHolding.name}`
                                        : "Search or select a security..."}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search by ticker or name..." />
                                    <CommandList>
                                      <CommandEmpty>No security found.</CommandEmpty>
                                      <CommandGroup>
                                        {universalHoldings.map((holding) => (
                                          <CommandItem
                                            key={holding.id}
                                            value={`${holding.ticker} ${holding.name}`}
                                            onSelect={() => {
                                              field.onChange(holding.id);
                                              setHoldingComboboxOpen(false);
                                            }}
                                            data-testid={`option-holding-${holding.id}`}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value === holding.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            <span className="font-mono font-medium mr-2">{holding.ticker}</span>
                                            <span className="text-muted-foreground truncate">{holding.name}</span>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
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
                      
                      {(() => {
                        const riskValidation = computeRiskValidation();
                        if (!riskValidation) return null;
                        
                        if (riskValidation.violations.length > 0) {
                          return (
                            <Alert variant="destructive" data-testid="alert-risk-violation">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle>Risk Limit Exceeded</AlertTitle>
                              <AlertDescription>
                                <div className="space-y-1 mt-1">
                                  {riskValidation.violations.map((v, i) => (
                                    <p key={i}>
                                      {CATEGORY_LABELS[v.category]}: {v.currentPercentage.toFixed(1)}% 
                                      (max {v.maxAllowed.toFixed(1)}% allowed)
                                    </p>
                                  ))}
                                </div>
                                <p className="text-xs mt-2">
                                  You can still save, but this allocation exceeds the risk tolerance limits.
                                </p>
                              </AlertDescription>
                            </Alert>
                          );
                        }
                        
                        if (riskValidation.warnings.length > 0) {
                          return (
                            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" data-testid="alert-risk-warning">
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              <AlertTitle className="text-yellow-800 dark:text-yellow-400">Approaching Risk Limit</AlertTitle>
                              <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                                <div className="space-y-1 mt-1">
                                  {riskValidation.warnings.map((w, i) => (
                                    <p key={i}>
                                      {CATEGORY_LABELS[w.category]}: {w.currentPercentage.toFixed(1)}% 
                                      (max {w.maxAllowed.toFixed(1)}% allowed)
                                    </p>
                                  ))}
                                </div>
                              </AlertDescription>
                            </Alert>
                          );
                        }
                        
                        return null;
                      })()}

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
        <CollapsibleContent>
          <CardContent>
            {targetAllocations.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No target allocations defined. Add allocations manually or copy from a model portfolio.
              </p>
            ) : (
              <>
                {/* Risk Compliance Summary */}
                {(() => {
                  const riskStatus = computeCurrentAllocationsRiskStatus();
                  const hasViolation = riskStatus.some(s => s.status === "violation");
                  const hasWarning = riskStatus.some(s => s.status === "warning");
                  const currentAllocation = getRiskAllocationFromAccount(accountData);
                  
                  return (
                    <div className={cn(
                      "mb-4 p-3 rounded-lg border",
                      hasViolation ? "border-destructive bg-destructive/5" :
                      hasWarning ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" :
                      "border-green-500 bg-green-50 dark:bg-green-950/20"
                    )} data-testid="risk-compliance-summary">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className={cn(
                          "h-4 w-4",
                          hasViolation ? "text-destructive" :
                          hasWarning ? "text-yellow-600" :
                          "text-green-600"
                        )} />
                        <span className={cn(
                          "text-sm font-medium",
                          hasViolation ? "text-destructive" :
                          hasWarning ? "text-yellow-700 dark:text-yellow-400" :
                          "text-green-700 dark:text-green-400"
                        )}>
                          Risk Compliance ({formatRiskAllocation(currentAllocation)})
                        </span>
                        {!hasViolation && !hasWarning && (
                          <Check className="h-4 w-4 text-green-600 ml-auto" />
                        )}
                        {(hasViolation || hasWarning) && (
                          <AlertTriangle className={cn(
                            "h-4 w-4 ml-auto",
                            hasViolation ? "text-destructive" : "text-yellow-600"
                          )} />
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {riskStatus.map((cat) => (
                          <div key={cat.key} className="flex flex-col">
                            <span className="text-muted-foreground">{cat.label}</span>
                            <span className={cn(
                              "font-medium",
                              cat.status === "violation" ? "text-destructive" :
                              cat.status === "warning" ? "text-yellow-700 dark:text-yellow-400" :
                              "text-foreground"
                            )}>
                              {cat.current.toFixed(1)}% / {cat.allowed.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticker</TableHead>
                      <TableHead>Security</TableHead>
                      <TableHead>Category</TableHead>
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
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[allocation.holding?.category as HoldingCategory] || allocation.holding?.category}
                          </Badge>
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
                  <Badge 
                    variant={
                      targetAllocations.reduce((sum, a) => sum + Number(a.targetPercentage), 0) === 100 
                        ? "default" 
                        : "destructive"
                    }
                    className={
                      targetAllocations.reduce((sum, a) => sum + Number(a.targetPercentage), 0) === 100 
                        ? "bg-green-600 hover:bg-green-700" 
                        : ""
                    }
                    data-testid="badge-total-allocation"
                  >
                    Total: {targetAllocations.reduce((sum, a) => sum + Number(a.targetPercentage), 0).toFixed(2)}%
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Unified Holdings & Portfolio Comparison Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Holdings & Portfolio Analysis</CardTitle>
            <CardDescription>
              All positions with target allocation comparison
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              data-testid="button-add-position"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Position
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCashDialogOpen(true)}
              data-testid="button-add-cash"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Add Cash
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEmailDialogOpen(true)}
              disabled={positions.length === 0}
              data-testid="button-email-report"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshPricesMutation.mutate()}
              disabled={refreshPricesMutation.isPending || positions.length === 0}
              data-testid="button-refresh-prices"
            >
              {refreshPricesMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Prices
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          {comparisonData?.hasTargetAllocations && comparisonData.comparison.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Portfolio Value</div>
                <div className="font-semibold">${comparisonData.totalActualValue.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">On Target</div>
                <div className="font-semibold text-blue-600 dark:text-blue-400">
                  {comparisonData.comparison.filter(c => c.status === 'on-target').length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Over/Under</div>
                <div className="font-semibold">
                  <span className="text-green-600 dark:text-green-400">{comparisonData.comparison.filter(c => c.status === 'over').length}</span>
                  {' / '}
                  <span className="text-red-600 dark:text-red-400">{comparisonData.comparison.filter(c => c.status === 'under').length}</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Untracked</div>
                <div className="font-semibold text-amber-600 dark:text-amber-400">
                  {comparisonData.comparison.filter(c => c.status === 'unexpected').length}
                </div>
              </div>
            </div>
          )}

          {positions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No positions yet. Click "Add Position" to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Book Value</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">U/R Gain $</TableHead>
                  {comparisonData?.hasTargetAllocations && (
                    <TableHead className="text-right">Actual %</TableHead>
                  )}
                  <TableHead className="text-right">Target %</TableHead>
                  {comparisonData?.hasTargetAllocations && (
                    <>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">$ Change</TableHead>
                      <TableHead className="text-right">Shares to Trade</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </>
                  )}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => {
                  // Use normalized ticker comparison to match "XIC.TO" with "XIC" etc.
                  const normalizedPositionSymbol = normalizeTicker(position.symbol);
                  const comparison = comparisonData?.comparison.find(c => normalizeTicker(c.ticker) === normalizedPositionSymbol);
                  const marketValue = Number(position.quantity) * Number(position.currentPrice);
                  const isEditingTarget = editingInlineTarget === position.id;
                  
                  return (
                    <TableRow key={position.id} data-testid={`row-position-${position.id}`}>
                      {/* Symbol - color reflects action needed (green=buy, red=sell) */}
                      <TableCell data-testid={`text-symbol-${position.id}`}>
                        <div className={`font-medium ${
                          comparison?.status === 'under' ? 'text-green-600 dark:text-green-400' :
                          comparison?.status === 'over' ? 'text-red-600 dark:text-red-400' :
                          comparison?.status === 'on-target' ? 'text-blue-600 dark:text-blue-400' :
                          comparison?.status === 'unexpected' ? 'text-amber-600 dark:text-amber-400' :
                          ''
                        }`}>{position.symbol}</div>
                        {comparison && (
                          <div className="text-xs text-muted-foreground truncate max-w-[120px]">{comparison.name}</div>
                        )}
                      </TableCell>
                      
                      {/* Qty */}
                      <TableCell className="text-right" data-testid={`text-quantity-${position.id}`}>
                        {Number(position.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      
                      {/* Price */}
                      <TableCell className="text-right" data-testid={`text-current-price-${position.id}`}>
                        <div>${Number(position.currentPrice).toFixed(2)}</div>
                        {position.priceUpdatedAt && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(position.priceUpdatedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </TableCell>
                      
                      {/* Book Value */}
                      <TableCell className="text-right" data-testid={`text-book-value-${position.id}`}>
                        ${(Number(position.quantity) * Number(position.entryPrice)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      
                      {/* Market Value */}
                      <TableCell className="text-right font-medium" data-testid={`text-market-value-${position.id}`}>
                        ${marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      
                      {/* U/R Cap Gain $ */}
                      {(() => {
                        const bookValue = Number(position.quantity) * Number(position.entryPrice);
                        const unrealizedGain = marketValue - bookValue;
                        return (
                          <TableCell 
                            className={`text-right font-medium ${
                              unrealizedGain > 0 ? 'text-green-600 dark:text-green-400' : 
                              unrealizedGain < 0 ? 'text-red-600 dark:text-red-400' : ''
                            }`}
                            data-testid={`text-unrealized-gain-${position.id}`}
                          >
                            {unrealizedGain >= 0 ? '+' : ''}${unrealizedGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        );
                      })()}
                      
                      {/* Actual % (only when target allocations exist) */}
                      {comparisonData?.hasTargetAllocations && (
                        <TableCell className="text-right" data-testid={`text-actual-pct-${position.id}`}>
                          {comparison ? `${comparison.actualPercentage.toFixed(1)}%` : '-'}
                        </TableCell>
                      )}
                      
                      {/* Target % (always visible, inline editable) */}
                      <TableCell className="text-right" data-testid={`text-target-pct-${position.id}`}>
                        {isEditingTarget ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={inlineTargetValue}
                              onChange={(e) => setInlineTargetValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineTargetSave(position);
                                if (e.key === 'Escape') handleInlineTargetCancel();
                              }}
                              className="w-16 h-7 text-right text-sm"
                              data-testid={`input-target-${position.id}`}
                              autoFocus
                            />
                            <span className="text-muted-foreground">%</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleInlineTargetSave(position)}
                              disabled={inlineTargetMutation.isPending}
                              data-testid={`button-save-target-${position.id}`}
                            >
                              {inlineTargetMutation.isPending ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Target className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleInlineTargetEdit(position)}
                            className="text-right hover:bg-muted/50 px-2 py-1 rounded cursor-pointer w-full"
                            data-testid={`button-edit-target-${position.id}`}
                          >
                            {comparison && comparison.targetPercentage > 0 
                              ? `${comparison.targetPercentage.toFixed(1)}%` 
                              : <span className="text-muted-foreground">-</span>
                            }
                          </button>
                        )}
                      </TableCell>
                      
                      {/* Variance, $ Change, Shares to Trade, Status (only when target allocations exist) */}
                      {comparisonData?.hasTargetAllocations && (() => {
                        const currentPrice = Number(position.currentPrice);
                        const quantity = Number(position.quantity);
                        
                        // If no target or target is 0%, position should be liquidated (sell all)
                        const hasTarget = comparison && comparison.targetPercentage > 0;
                        const changeNeeded = hasTarget 
                          ? comparison.targetValue - comparison.actualValue 
                          : -marketValue; // Sell entire position value
                        const sharesToTrade = hasTarget
                          ? (currentPrice > 0 ? changeNeeded / currentPrice : 0)
                          : -quantity; // Sell all shares
                        
                        return (
                          <>
                            {/* Variance */}
                            <TableCell 
                              className={`text-right font-medium ${
                                comparison && comparison.variance > 0 ? 'text-green-600 dark:text-green-400' : 
                                comparison && comparison.variance < 0 ? 'text-red-600 dark:text-red-400' : ''
                              }`}
                              data-testid={`text-variance-${position.id}`}
                            >
                              {comparison ? (
                                <>{comparison.variance > 0 ? '+' : ''}{comparison.variance.toFixed(1)}%</>
                              ) : '-'}
                            </TableCell>
                            
                            {/* $ Change - show liquidation value for positions with no target */}
                            <TableCell 
                              className={`text-right font-medium ${
                                changeNeeded > 0 ? 'text-green-600 dark:text-green-400' : 
                                changeNeeded < 0 ? 'text-red-600 dark:text-red-400' : ''
                              }`}
                              data-testid={`text-change-needed-${position.id}`}
                            >
                              {changeNeeded > 0 ? '+' : ''}
                              ${changeNeeded.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </TableCell>
                            
                            {/* Shares to Trade - show full liquidation for positions with no target */}
                            <TableCell 
                              className={`text-right font-medium ${
                                sharesToTrade > 0 ? 'text-green-600 dark:text-green-400' : 
                                sharesToTrade < 0 ? 'text-red-600 dark:text-red-400' : ''
                              }`}
                              data-testid={`text-shares-to-trade-${position.id}`}
                            >
                              <div className="font-semibold">
                                {sharesToTrade > 0 ? 'Buy ' : sharesToTrade < 0 ? 'Sell ' : ''}
                                {Math.abs(sharesToTrade).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </div>
                            </TableCell>
                            
                            {/* Status - colors reflect action (green=buy, red=sell) */}
                            <TableCell className="text-center" data-testid={`badge-status-${position.id}`}>
                              {comparison?.status === 'over' && (
                                <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Over
                                </Badge>
                              )}
                              {comparison?.status === 'under' && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  Under
                                </Badge>
                              )}
                              {comparison?.status === 'on-target' && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  <Minus className="h-3 w-3 mr-1" />
                                  On Target
                                </Badge>
                              )}
                              {comparison?.status === 'unexpected' && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  No Target
                                </Badge>
                              )}
                              {!comparison && (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                          </>
                        );
                      })()}
                      
                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
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
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Show positions that are in targets but not held */}
          {comparisonData?.hasTargetAllocations && (
            (() => {
              const missingPositions = comparisonData.comparison.filter(
                c => c.targetPercentage > 0 && c.actualPercentage === 0
              );
              if (missingPositions.length === 0) return null;
              
              return (
                <div className="mt-4 p-3 border border-dashed rounded-lg">
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Missing Positions (In Target but Not Held)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {missingPositions.map((item) => (
                      <Badge key={item.ticker} variant="outline" className="text-xs">
                        {item.ticker}: {item.targetPercentage.toFixed(1)}%
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })()
          )}

          {/* Hint to set up target allocations if none exist */}
          {!comparisonData?.hasTargetAllocations && positions.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
              Set up target allocations above to see portfolio comparison analysis.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        data-testid="dropzone-csv"
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileInputChange}
          className="hidden"
          id="file-upload"
          data-testid="input-file-upload"
        />
        <FileSpreadsheet className={`mx-auto h-10 w-10 mb-3 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
        <p className={`text-sm font-medium mb-1 ${isDragging ? "text-primary" : "text-foreground"}`}>
          {isDragging ? "Drop file here" : "Drag and drop a CSV or Excel file"}
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          or click the button below to browse
        </p>
        <Button
          variant="outline"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={isUploading}
          data-testid="button-upload-file"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          {isUploading ? "Importing..." : "Browse Files"}
        </Button>
      </div>

      {/* Dialogs */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
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

      {/* Add Cash Dialog */}
      <Dialog open={isCashDialogOpen} onOpenChange={(open) => {
        setIsCashDialogOpen(open);
        if (!open) setCashAmount("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cash Deposit</DialogTitle>
            <DialogDescription>
              Enter the cash amount to add to this account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label htmlFor="cash-amount" className="text-sm font-medium">Amount (CAD)</label>
              <Input
                id="cash-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="1000.00"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                data-testid="input-cash-amount"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCashDialogOpen(false);
                  setCashAmount("");
                }}
                data-testid="button-cancel-cash"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCash}
                disabled={createMutation.isPending}
                data-testid="button-submit-cash"
              >
                {createMutation.isPending ? "Adding..." : "Add Cash"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Report Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Portfolio Report</DialogTitle>
            <DialogDescription>
              Send a PDF report of this portfolio's rebalancing actions to an email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email Address</label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                data-testid="input-email-address"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEmailDialogOpen(false);
                  setEmailAddress("");
                }}
                data-testid="button-cancel-email"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!emailAddress || !emailAddress.includes('@')) {
                    toast({
                      title: "Invalid Email",
                      description: "Please enter a valid email address",
                      variant: "destructive"
                    });
                    return;
                  }
                  
                  setIsSendingEmail(true);
                  try {
                    const response = await apiRequest(
                      'POST',
                      `/api/accounts/${accountType}/${accountId}/email-report`,
                      { email: emailAddress }
                    );
                    
                    toast({
                      title: "Report Sent",
                      description: `Portfolio report has been sent to ${emailAddress}`
                    });
                    setIsEmailDialogOpen(false);
                    setEmailAddress("");
                  } catch (error: any) {
                    toast({
                      title: "Failed to Send",
                      description: error.message || "Could not send the report. Please try again.",
                      variant: "destructive"
                    });
                  } finally {
                    setIsSendingEmail(false);
                  }
                }}
                disabled={isSendingEmail || !emailAddress}
                data-testid="button-send-email"
              >
                {isSendingEmail ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
