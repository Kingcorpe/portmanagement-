import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, DollarSign, TrendingUp, FileText, Target, Calendar, Settings2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { InsuranceRevenue } from "@shared/schema";

const POLICY_TYPES = [
  "T10",
  "T15",
  "T20",
  "Layered WL",
  "CI",
  "Life Insurance",
  "Health Insurance",
  "Disability Insurance",
  "Critical Illness",
  "Long-Term Care",
  "Travel Insurance",
  "Group Benefits",
  "Segregated Funds",
  "Annuities",
  "Other",
];

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned", color: "bg-blue-500" },
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "received", label: "Received", color: "bg-green-500" },
];

interface FormData {
  date: string;
  clientName: string;
  policyType: string;
  carrier: string;
  premium: string;
  commissionRate: string;
  commissionAmount: string;
  status: string;
  notes: string;
}

const initialFormData: FormData = {
  date: new Date().toISOString().split("T")[0],
  clientName: "",
  policyType: "",
  carrier: "",
  premium: "",
  commissionRate: "",
  commissionAmount: "",
  status: "pending",
  notes: "",
};

export default function InsuranceRevenuePage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<InsuranceRevenue | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('insuranceMonthlyGoal') || '';
    }
    return '';
  });
  const [yearlyGoal, setYearlyGoal] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('insuranceYearlyGoal') || '';
    }
    return '';
  });

  useEffect(() => {
    if (monthlyGoal) {
      localStorage.setItem('insuranceMonthlyGoal', monthlyGoal);
    } else {
      localStorage.removeItem('insuranceMonthlyGoal');
    }
  }, [monthlyGoal]);

  useEffect(() => {
    if (yearlyGoal) {
      localStorage.setItem('insuranceYearlyGoal', yearlyGoal);
    } else {
      localStorage.removeItem('insuranceYearlyGoal');
    }
  }, [yearlyGoal]);

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

  const { data: entries = [], isLoading } = useQuery<InsuranceRevenue[]>({
    queryKey: ["/api/insurance-revenue"],
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

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = { ...data, commissionRate: data.commissionRate || null };
      await apiRequest("POST", "/api/insurance-revenue", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance-revenue"] });
      toast({ title: "Success", description: "Entry created successfully" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create entry",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const payload = { ...data, commissionRate: data.commissionRate || null };
      await apiRequest("PATCH", `/api/insurance-revenue/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance-revenue"] });
      toast({ title: "Success", description: "Entry updated successfully" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update entry",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/insurance-revenue/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance-revenue"] });
      toast({ title: "Success", description: "Entry deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entry",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingEntry(null);
  };

  const handleEdit = (entry: InsuranceRevenue) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      clientName: entry.clientName,
      policyType: entry.policyType,
      carrier: entry.carrier || "",
      premium: entry.premium,
      commissionRate: entry.commissionRate || "",
      commissionAmount: entry.commissionAmount,
      status: entry.status,
      notes: entry.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setEntryToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      deleteMutation.mutate(entryToDelete);
      setDeleteConfirmOpen(false);
      setEntryToDelete(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const calculateCommission = (premium: number, policyType: string): string => {
    if (!premium || !policyType) return "0.00";
    
    switch (policyType) {
      case "T10":
        return (premium * 12 * 0.4 * 2.85).toFixed(2);
      case "T20":
        return (premium * 12 * 0.45 * 2.85).toFixed(2);
      case "Layered WL":
        return (premium * 12 * 0.55 * 2.85).toFixed(2);
      default:
        return "0.00";
    }
  };

  const handlePremiumChange = (value: string) => {
    setFormData((prev) => {
      const premium = parseFloat(value) || 0;
      const commission = calculateCommission(premium, prev.policyType);
      return { ...prev, premium: value, commissionAmount: commission };
    });
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(num || 0);
  };

  const getT10Commission = () => {
    const monthlyPremium = parseFloat(formData.premium) || 0;
    return monthlyPremium * 12 * 0.4 * 2.85;
  };

  const totalCommission = entries.reduce(
    (sum, e) => sum + (e.status === "received" ? parseFloat(e.commissionAmount) : 0),
    0
  );

  const pendingCommission = entries.reduce(
    (sum, e) => sum + (e.status === "pending" ? parseFloat(e.commissionAmount) : 0),
    0
  );

  const plannedCommission = entries.reduce(
    (sum, e) => sum + (e.status === "planned" ? parseFloat(e.commissionAmount) : 0),
    0
  );

  const totalPremium = entries.reduce(
    (sum, e) => sum + (e.status === "received" ? parseFloat(e.premium) : 0),
    0
  );

  // Get monthly revenue breakdown
  const getMonthlyRevenue = () => {
    const monthlyData: { [key: string]: { received: number; pending: number; planned: number } } = {};
    
    entries.forEach((entry) => {
      const [year, month] = entry.date.split("-");
      const monthKey = `${year}-${month}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { received: 0, pending: 0, planned: 0 };
      }
      
      const commission = parseFloat(entry.commissionAmount);
      if (entry.status === "received") {
        monthlyData[monthKey].received += commission;
      } else if (entry.status === "pending") {
        monthlyData[monthKey].pending += commission;
      } else if (entry.status === "planned") {
        monthlyData[monthKey].planned += commission;
      }
    });
    
    return Object.entries(monthlyData)
      .sort()
      .reverse()
      .map(([month, data]) => ({ month, ...data }));
  };

  const monthlyRevenue = getMonthlyRevenue();
  
  // Get year-to-date total
  const currentYear = new Date().getFullYear().toString();
  const ytdReceived = entries.reduce((sum, e) => {
    if (e.status === "received" && e.date.startsWith(currentYear)) {
      return sum + parseFloat(e.commissionAmount);
    }
    return sum;
  }, 0);
  
  const ytdPending = entries.reduce((sum, e) => {
    if (e.status === "pending" && e.date.startsWith(currentYear)) {
      return sum + parseFloat(e.commissionAmount);
    }
    return sum;
  }, 0);
  
  const ytdPlanned = entries.reduce((sum, e) => {
    if (e.status === "planned" && e.date.startsWith(currentYear)) {
      return sum + parseFloat(e.commissionAmount);
    }
    return sum;
  }, 0);

  // Business day calculation helpers - normalize dates to midnight to avoid time-of-day issues
  const normalizeDate = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getBusinessDaysInMonth = (year: number, month: number): number => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let count = 0;
    for (let d = normalizeDate(firstDay); d <= normalizeDate(lastDay); d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  };

  const getBusinessDaysRemaining = (): number => {
    const today = normalizeDate(new Date());
    const year = today.getFullYear();
    const month = today.getMonth();
    const lastDay = normalizeDate(new Date(year, month + 1, 0));
    let count = 0;
    for (let d = new Date(today); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  };

  const getBusinessDaysElapsed = (): number => {
    const today = normalizeDate(new Date());
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = normalizeDate(new Date(year, month, 1));
    let count = 0;
    for (let d = new Date(firstDay); d < today; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  };

  const getBusinessDaysInYear = (): number => {
    const year = new Date().getFullYear();
    let count = 0;
    for (let month = 0; month < 12; month++) {
      count += getBusinessDaysInMonth(year, month);
    }
    return count;
  };

  const getBusinessDaysElapsedInYear = (): number => {
    const today = normalizeDate(new Date());
    const year = today.getFullYear();
    const firstDay = normalizeDate(new Date(year, 0, 1));
    let count = 0;
    for (let d = new Date(firstDay); d < today; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  };

  const getBusinessDaysRemainingInYear = (): number => {
    const today = normalizeDate(new Date());
    const year = today.getFullYear();
    const lastDay = normalizeDate(new Date(year, 11, 31));
    let count = 0;
    for (let d = new Date(today); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  };

  // Current month calculations
  const now = new Date();
  const currentMonth = now.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const currentMonthReceived = entries.reduce((sum, e) => {
    if (e.status === "received" && e.date.startsWith(currentMonthKey)) {
      return sum + parseFloat(e.commissionAmount);
    }
    return sum;
  }, 0);

  // Show all pending and planned entries regardless of date - they stay visible until received or deleted
  const currentMonthPending = entries.reduce((sum, e) => {
    if (e.status === "pending") {
      return sum + parseFloat(e.commissionAmount);
    }
    return sum;
  }, 0);

  const currentMonthPlanned = entries.reduce((sum, e) => {
    if (e.status === "planned") {
      return sum + parseFloat(e.commissionAmount);
    }
    return sum;
  }, 0);

  const businessDaysRemaining = getBusinessDaysRemaining();
  const businessDaysTotal = getBusinessDaysInMonth(now.getFullYear(), now.getMonth());
  const businessDaysElapsed = getBusinessDaysElapsed();
  const yearlyBusinessDaysRemaining = getBusinessDaysRemainingInYear();
  const yearlyBusinessDaysTotal = getBusinessDaysInYear();
  const yearlyBusinessDaysElapsed = getBusinessDaysElapsedInYear();

  // Goal progress calculations
  const monthlyGoalNum = parseFloat(monthlyGoal) || 0;
  const yearlyGoalNum = parseFloat(yearlyGoal) || 0;
  
  const monthlyProgress = monthlyGoalNum > 0 ? Math.min((currentMonthReceived / monthlyGoalNum) * 100, 100) : 0;
  const yearlyProgress = yearlyGoalNum > 0 ? Math.min((ytdReceived / yearlyGoalNum) * 100, 100) : 0;
  
  const monthlyRemaining = Math.max(monthlyGoalNum - currentMonthReceived, 0);
  const yearlyRemaining = Math.max(yearlyGoalNum - ytdReceived, 0);
  
  const dailyTargetMonthly = businessDaysRemaining > 0 ? monthlyRemaining / businessDaysRemaining : 0;
  const dailyTargetYearly = yearlyBusinessDaysRemaining > 0 ? yearlyRemaining / yearlyBusinessDaysRemaining : 0;
  
  // Calculate monthly premium needed to hit daily target using T10 formula
  // T10: Commission = Premium × 12 × 0.40 × 2.85
  // Reverse: Premium = Commission / (12 × 0.40 × 2.85) = Commission / 13.68
  const T10_MULTIPLIER = 12 * 0.4 * 2.85;
  const monthlyPremiumNeededDaily = dailyTargetMonthly > 0 ? dailyTargetMonthly / T10_MULTIPLIER : 0;
  const yearlyPremiumNeededDaily = dailyTargetYearly > 0 ? dailyTargetYearly / T10_MULTIPLIER : 0;

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-insurance-revenue">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text" data-testid="text-page-title">
            Insurance Revenue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your insurance commissions and revenue
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-entry">
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? "Edit Entry" : "Add Insurance Revenue Entry"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    data-testid="input-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  required
                  data-testid="input-client-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="policyType">Policy Type</Label>
                  <Select
                    value={formData.policyType}
                    onValueChange={(v) => {
                      const premium = parseFloat(formData.premium) || 0;
                      const commission = calculateCommission(premium, v);
                      setFormData({ ...formData, policyType: v, commissionAmount: commission });
                    }}
                  >
                    <SelectTrigger data-testid="select-policy-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {POLICY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carrier">Carrier/Company</Label>
                  <Input
                    id="carrier"
                    value={formData.carrier}
                    onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                    data-testid="input-carrier"
                  />
                </div>
              </div>

              {formData.policyType === "T10" && (
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md space-y-3 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">T10 Commission Calculation</p>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Monthly Premium</p>
                      <p className="text-sm font-semibold">{formatCurrency(formData.premium || 0)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Annual (×12)</p>
                      <p className="text-sm font-semibold">{formatCurrency((parseFloat(formData.premium) || 0) * 12)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Base (×0.40)</p>
                      <p className="text-sm font-semibold">{formatCurrency((parseFloat(formData.premium) || 0) * 12 * 0.4)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Commission (+185%)</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency((parseFloat(formData.premium) || 0) * 12 * 0.4 * 2.85)}</p>
                    </div>
                  </div>
                </div>
              )}

              {formData.policyType === "T20" && (
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md space-y-3 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">T20 Commission Calculation</p>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Monthly Premium</p>
                      <p className="text-sm font-semibold">{formatCurrency(formData.premium || 0)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Annual (×12)</p>
                      <p className="text-sm font-semibold">{formatCurrency((parseFloat(formData.premium) || 0) * 12)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Base (×0.45)</p>
                      <p className="text-sm font-semibold">{formatCurrency((parseFloat(formData.premium) || 0) * 12 * 0.45)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Commission (+185%)</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency((parseFloat(formData.premium) || 0) * 12 * 0.45 * 2.85)}</p>
                    </div>
                  </div>
                </div>
              )}

              {formData.policyType === "Layered WL" && (
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md space-y-3 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Layered WL Commission Calculation</p>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Monthly Premium</p>
                      <p className="text-sm font-semibold">{formatCurrency(formData.premium || 0)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Annual (×12)</p>
                      <p className="text-sm font-semibold">{formatCurrency((parseFloat(formData.premium) || 0) * 12)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Base (×0.55)</p>
                      <p className="text-sm font-semibold">{formatCurrency((parseFloat(formData.premium) || 0) * 12 * 0.55)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Commission (+185%)</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency((parseFloat(formData.premium) || 0) * 12 * 0.55 * 2.85)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="premium">Monthly Premium ($)</Label>
                  <Input
                    id="premium"
                    type="number"
                    step="0.01"
                    value={formData.premium}
                    onChange={(e) => handlePremiumChange(e.target.value)}
                    required
                    data-testid="input-premium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commissionAmount">Commission ($)</Label>
                  <Input
                    id="commissionAmount"
                    type="number"
                    step="0.01"
                    value={formData.commissionAmount}
                    onChange={(e) => setFormData({ ...formData, commissionAmount: e.target.value })}
                    required
                    data-testid="input-commission-amount"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  data-testid="input-notes"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {editingEntry ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-total-received">
              {formatCurrency(totalCommission)}
            </div>
            <p className="text-xs text-muted-foreground">From {formatCurrency(totalPremium)} in monthly premiums</p>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending">
              {formatCurrency(pendingCommission)}
            </div>
            <p className="text-xs text-muted-foreground">
              {entries.filter((e) => e.status === "pending").length} pending entries
            </p>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planned</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-planned">
              {formatCurrency(plannedCommission)}
            </div>
            <p className="text-xs text-muted-foreground">
              {entries.filter((e) => e.status === "planned").length} planned entries
            </p>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-entries">
              {entries.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {entries.filter((e) => e.status === "received").length} received
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Goals Tracking Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Goals Tracking
          </h2>
          <Dialog open={goalsDialogOpen} onOpenChange={setGoalsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-set-goals">
                <Settings2 className="h-4 w-4 mr-2" />
                Set Goals
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Set Revenue Goals</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyGoal">Monthly Commission Goal ($)</Label>
                  <Input
                    id="monthlyGoal"
                    type="number"
                    step="100"
                    value={monthlyGoal}
                    onChange={(e) => setMonthlyGoal(e.target.value)}
                    placeholder="e.g., 10000"
                    data-testid="input-monthly-goal"
                  />
                  <p className="text-xs text-muted-foreground">Target commission to earn each month</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearlyGoal">Yearly Commission Goal ($)</Label>
                  <Input
                    id="yearlyGoal"
                    type="number"
                    step="1000"
                    value={yearlyGoal}
                    onChange={(e) => setYearlyGoal(e.target.value)}
                    placeholder="e.g., 120000"
                    data-testid="input-yearly-goal"
                  />
                  <p className="text-xs text-muted-foreground">Target commission to earn this year</p>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setGoalsDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Monthly Goal Card */}
          <Card className="glow-border" data-testid="card-monthly-goal">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {currentMonth} Goal
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {businessDaysRemaining} business days left
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {monthlyGoalNum > 0 ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{monthlyProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={monthlyProgress} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(currentMonthReceived)} earned</span>
                      <span>Goal: {formatCurrency(monthlyGoalNum)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(monthlyRemaining)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Per Business Day</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(dailyTargetMonthly)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md text-xs">
                    <p className="text-muted-foreground mb-2">Monthly Premium Required (T10):</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {formatCurrency(monthlyPremiumNeededDaily)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Needed daily to hit per-business-day target
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex justify-between">
                      <span>Business days elapsed:</span>
                      <span>{businessDaysElapsed} of {businessDaysTotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending:</span>
                      <span className="text-yellow-600">{formatCurrency(currentMonthPending)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Planned:</span>
                      <span className="text-blue-600">{formatCurrency(currentMonthPlanned)}</span>
                    </div>
                  </div>

                  {currentMonthReceived >= monthlyGoalNum && (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3 text-center">
                      <p className="text-green-700 dark:text-green-300 font-medium">
                        Monthly Goal Achieved!
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No monthly goal set</p>
                  <p className="text-xs mt-1">Click "Set Goals" to configure</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Yearly Goal Card */}
          <Card className="glow-border" data-testid="card-yearly-goal">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {currentYear} Yearly Goal
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {yearlyBusinessDaysRemaining} business days left
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {yearlyGoalNum > 0 ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{yearlyProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={yearlyProgress} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(ytdReceived)} earned</span>
                      <span>Goal: {formatCurrency(yearlyGoalNum)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(yearlyRemaining)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Per Business Day</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(dailyTargetYearly)}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex justify-between">
                      <span>Business days elapsed:</span>
                      <span>{yearlyBusinessDaysElapsed} of {yearlyBusinessDaysTotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>YTD Pending:</span>
                      <span className="text-yellow-600">{formatCurrency(ytdPending)}</span>
                    </div>
                  </div>

                  {ytdReceived >= yearlyGoalNum && (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3 text-center">
                      <p className="text-green-700 dark:text-green-300 font-medium">
                        Yearly Goal Achieved!
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No yearly goal set</p>
                  <p className="text-xs mt-1">Click "Set Goals" to configure</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monthly Revenue Breakdown */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold mb-3">Year-to-Date Summary ({currentYear})</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">YTD Received</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-ytd-received">
                  {formatCurrency(ytdReceived)}
                </div>
              </CardContent>
            </Card>
            <Card className="glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">YTD Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600" data-testid="text-ytd-pending">
                  {formatCurrency(ytdPending)}
                </div>
              </CardContent>
            </Card>
            <Card className="glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">YTD Planned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600" data-testid="text-ytd-planned">
                  {formatCurrency(ytdPlanned)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {monthlyRevenue.length > 0 && (
          <Card data-testid="card-monthly-breakdown">
            <CardHeader>
              <CardTitle>Monthly Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Planned</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyRevenue.map((monthData) => {
                      const total = monthData.received + monthData.pending + monthData.planned;
                      const [year, month] = monthData.month.split("-");
                      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-CA", { month: "long", year: "numeric" });
                      
                      return (
                        <TableRow key={monthData.month} data-testid={`row-month-${monthData.month}`}>
                          <TableCell className="font-medium">{monthName}</TableCell>
                          <TableCell className="text-right text-green-600 font-semibold">
                            {formatCurrency(monthData.received)}
                          </TableCell>
                          <TableCell className="text-right text-yellow-600 font-semibold">
                            {formatCurrency(monthData.pending)}
                          </TableCell>
                          <TableCell className="text-right text-blue-600 font-semibold">
                            {formatCurrency(monthData.planned)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(total)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Revenue Table */}
      <Card data-testid="card-revenue-table">
        <CardHeader>
          <CardTitle>Revenue Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No entries yet. Click "Add Entry" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Policy Type</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead className="text-right">Monthly Premium</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell className="font-medium">{entry.clientName}</TableCell>
                      <TableCell>{entry.policyType}</TableCell>
                      <TableCell>{entry.carrier || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.premium)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(entry.commissionAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.status === "received"
                              ? "default"
                              : entry.status === "pending"
                              ? "secondary"
                              : "outline"
                          }
                          className={entry.status === "planned" ? "border-blue-500 text-blue-600 dark:text-blue-400" : ""}
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(entry)}
                            data-testid={`button-edit-${entry.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(entry.id)}
                            data-testid={`button-delete-${entry.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
