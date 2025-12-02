import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatNumberInput, parseNumberInput } from "@/lib/currencyInput";
import { useDemoMode } from "@/contexts/demo-mode-context";
import { useDemoAwareQuery } from "@/lib/demo-data-service";
import { DemoModeBanner } from "@/components/demo-mode-banner";
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
import { Plus, Pencil, Trash2, DollarSign, TrendingUp, Target, Settings2, PieChart, Wallet } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { InvestmentRevenue } from "@shared/schema";

const ENTRY_TYPES = [
  { value: "dividend", label: "Dividend", icon: DollarSign },
  { value: "new_aum", label: "New AUM", icon: Wallet },
];

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned", color: "bg-blue-500" },
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "received", label: "Received", color: "bg-green-500" },
];

const ACCOUNT_TYPES = [
  "Cash",
  "TFSA",
  "RRSP",
  "FHSA",
  "LIRA",
  "LIF",
  "RIF",
  "Corporate Cash",
  "IPP",
  "Joint Cash",
  "RESP",
  "Other",
];

interface FormData {
  date: string;
  entryType: string;
  amount: string;
  sourceName: string;
  accountType: string;
  description: string;
  status: string;
  notes: string;
}

const initialFormData: FormData = {
  date: new Date().toISOString().split("T")[0],
  entryType: "dividend",
  amount: "",
  sourceName: "",
  accountType: "",
  description: "",
  status: "pending",
  notes: "",
};

export default function InvestmentRevenuePage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<InvestmentRevenue | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  
  const [monthlyDividendGoal, setMonthlyDividendGoal] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('investmentMonthlyDividendGoal') || '';
    }
    return '';
  });
  const [yearlyDividendGoal, setYearlyDividendGoal] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('investmentYearlyDividendGoal') || '';
    }
    return '';
  });
  const [monthlyAumGoal, setMonthlyAumGoal] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('investmentMonthlyAumGoal') || '';
    }
    return '';
  });
  const [yearlyAumGoal, setYearlyAumGoal] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('investmentYearlyAumGoal') || '';
    }
    return '';
  });

  useEffect(() => {
    if (monthlyDividendGoal) {
      localStorage.setItem('investmentMonthlyDividendGoal', monthlyDividendGoal);
    } else {
      localStorage.removeItem('investmentMonthlyDividendGoal');
    }
  }, [monthlyDividendGoal]);

  useEffect(() => {
    if (yearlyDividendGoal) {
      localStorage.setItem('investmentYearlyDividendGoal', yearlyDividendGoal);
    } else {
      localStorage.removeItem('investmentYearlyDividendGoal');
    }
  }, [yearlyDividendGoal]);

  useEffect(() => {
    if (monthlyAumGoal) {
      localStorage.setItem('investmentMonthlyAumGoal', monthlyAumGoal);
    } else {
      localStorage.removeItem('investmentMonthlyAumGoal');
    }
  }, [monthlyAumGoal]);

  useEffect(() => {
    if (yearlyAumGoal) {
      localStorage.setItem('investmentYearlyAumGoal', yearlyAumGoal);
    } else {
      localStorage.removeItem('investmentYearlyAumGoal');
    }
  }, [yearlyAumGoal]);

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

  const { isDemoMode } = useDemoMode();
  
  const { data: entries = [], isLoading } = useDemoAwareQuery<InvestmentRevenue[]>({
    queryKey: ["/api/investment-revenue"],
    enabled: isAuthenticated,
    retry: (failureCount: number, error: Error) => {
      if (isUnauthorizedError(error)) {
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
      await apiRequest("POST", "/api/investment-revenue", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investment-revenue"] });
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
      await apiRequest("PATCH", `/api/investment-revenue/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investment-revenue"] });
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
      await apiRequest("DELETE", `/api/investment-revenue/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investment-revenue"] });
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

  const handleEdit = (entry: InvestmentRevenue) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      entryType: entry.entryType,
      amount: entry.amount,
      sourceName: entry.sourceName,
      accountType: entry.accountType || "",
      description: entry.description || "",
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

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(num || 0);
  };

  const dividendEntries = entries.filter((e) => e.entryType === "dividend");
  const aumEntries = entries.filter((e) => e.entryType === "new_aum");

  const totalDividendReceived = dividendEntries.reduce(
    (sum, e) => sum + (e.status === "received" ? parseFloat(e.amount) : 0),
    0
  );

  const totalDividendPending = dividendEntries.reduce(
    (sum, e) => sum + (e.status === "pending" ? parseFloat(e.amount) : 0),
    0
  );

  const totalDividendPlanned = dividendEntries.reduce(
    (sum, e) => sum + (e.status === "planned" ? parseFloat(e.amount) : 0),
    0
  );

  const totalAumReceived = aumEntries.reduce(
    (sum, e) => sum + (e.status === "received" ? parseFloat(e.amount) : 0),
    0
  );

  const totalAumPending = aumEntries.reduce(
    (sum, e) => sum + (e.status === "pending" ? parseFloat(e.amount) : 0),
    0
  );

  const totalAumPlanned = aumEntries.reduce(
    (sum, e) => sum + (e.status === "planned" ? parseFloat(e.amount) : 0),
    0
  );

  const getMonthlyRevenue = () => {
    const monthlyData: { [key: string]: { dividendReceived: number; dividendPending: number; dividendPlanned: number; aumReceived: number; aumPending: number; aumPlanned: number } } = {};
    
    entries.forEach((entry) => {
      const [year, month] = entry.date.split("-");
      const monthKey = `${year}-${month}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { dividendReceived: 0, dividendPending: 0, dividendPlanned: 0, aumReceived: 0, aumPending: 0, aumPlanned: 0 };
      }
      
      const amount = parseFloat(entry.amount);
      if (entry.entryType === "dividend") {
        if (entry.status === "received") {
          monthlyData[monthKey].dividendReceived += amount;
        } else if (entry.status === "pending") {
          monthlyData[monthKey].dividendPending += amount;
        } else if (entry.status === "planned") {
          monthlyData[monthKey].dividendPlanned += amount;
        }
      } else if (entry.entryType === "new_aum") {
        if (entry.status === "received") {
          monthlyData[monthKey].aumReceived += amount;
        } else if (entry.status === "pending") {
          monthlyData[monthKey].aumPending += amount;
        } else if (entry.status === "planned") {
          monthlyData[monthKey].aumPlanned += amount;
        }
      }
    });
    
    return Object.entries(monthlyData)
      .sort()
      .reverse()
      .map(([month, data]) => ({ month, ...data }));
  };

  const monthlyRevenue = getMonthlyRevenue();
  
  const currentYear = new Date().getFullYear().toString();
  
  const ytdDividendReceived = dividendEntries.reduce((sum, e) => {
    if (e.status === "received" && e.date.startsWith(currentYear)) {
      return sum + parseFloat(e.amount);
    }
    return sum;
  }, 0);
  
  const ytdDividendPending = dividendEntries.reduce((sum, e) => {
    if (e.status === "pending" && e.date.startsWith(currentYear)) {
      return sum + parseFloat(e.amount);
    }
    return sum;
  }, 0);
  
  const ytdDividendPlanned = dividendEntries.reduce((sum, e) => {
    if (e.status === "planned" && e.date.startsWith(currentYear)) {
      return sum + parseFloat(e.amount);
    }
    return sum;
  }, 0);

  const ytdAumReceived = aumEntries.reduce((sum, e) => {
    if (e.status === "received" && e.date.startsWith(currentYear)) {
      return sum + parseFloat(e.amount);
    }
    return sum;
  }, 0);
  
  const ytdAumPending = aumEntries.reduce((sum, e) => {
    if (e.status === "pending" && e.date.startsWith(currentYear)) {
      return sum + parseFloat(e.amount);
    }
    return sum;
  }, 0);
  
  const ytdAumPlanned = aumEntries.reduce((sum, e) => {
    if (e.status === "planned" && e.date.startsWith(currentYear)) {
      return sum + parseFloat(e.amount);
    }
    return sum;
  }, 0);

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

  const getBusinessDaysInYear = (): number => {
    const year = new Date().getFullYear();
    let count = 0;
    for (let month = 0; month < 12; month++) {
      count += getBusinessDaysInMonth(year, month);
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

  const now = new Date();
  const currentMonth = now.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const currentMonthDividendReceived = dividendEntries.reduce((sum, e) => {
    if (e.status === "received" && e.date.startsWith(currentMonthKey)) {
      return sum + parseFloat(e.amount);
    }
    return sum;
  }, 0);

  const currentMonthAumReceived = aumEntries.reduce((sum, e) => {
    if (e.status === "received" && e.date.startsWith(currentMonthKey)) {
      return sum + parseFloat(e.amount);
    }
    return sum;
  }, 0);

  const businessDaysRemaining = getBusinessDaysRemaining();
  const businessDaysTotal = getBusinessDaysInMonth(now.getFullYear(), now.getMonth());
  const yearlyBusinessDaysRemaining = getBusinessDaysRemainingInYear();
  const yearlyBusinessDaysTotal = getBusinessDaysInYear();

  const monthlyDividendGoalNum = parseFloat(monthlyDividendGoal) || 0;
  const yearlyDividendGoalNum = parseFloat(yearlyDividendGoal) || 0;
  const monthlyAumGoalNum = parseFloat(monthlyAumGoal) || 0;
  const yearlyAumGoalNum = parseFloat(yearlyAumGoal) || 0;
  
  const monthlyDividendProgress = monthlyDividendGoalNum > 0 ? Math.min((currentMonthDividendReceived / monthlyDividendGoalNum) * 100, 100) : 0;
  const yearlyDividendProgress = yearlyDividendGoalNum > 0 ? Math.min((ytdDividendReceived / yearlyDividendGoalNum) * 100, 100) : 0;
  const monthlyAumProgress = monthlyAumGoalNum > 0 ? Math.min((currentMonthAumReceived / monthlyAumGoalNum) * 100, 100) : 0;
  const yearlyAumProgress = yearlyAumGoalNum > 0 ? Math.min((ytdAumReceived / yearlyAumGoalNum) * 100, 100) : 0;
  
  const monthlyDividendRemaining = Math.max(monthlyDividendGoalNum - currentMonthDividendReceived, 0);
  const yearlyDividendRemaining = Math.max(yearlyDividendGoalNum - ytdDividendReceived, 0);
  const monthlyAumRemaining = Math.max(monthlyAumGoalNum - currentMonthAumReceived, 0);
  const yearlyAumRemaining = Math.max(yearlyAumGoalNum - ytdAumReceived, 0);
  
  const dailyDividendTarget = businessDaysRemaining > 0 ? monthlyDividendRemaining / businessDaysRemaining : 0;
  const dailyAumTarget = businessDaysRemaining > 0 ? monthlyAumRemaining / businessDaysRemaining : 0;
  const yearlyDividendDailyTarget = yearlyBusinessDaysRemaining > 0 ? yearlyDividendRemaining / yearlyBusinessDaysRemaining : 0;
  const yearlyAumDailyTarget = yearlyBusinessDaysRemaining > 0 ? yearlyAumRemaining / yearlyBusinessDaysRemaining : 0;

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-investment-revenue">
      <DemoModeBanner />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text" data-testid="text-page-title">
            Investment Revenue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track dividends received and new AUM obtained
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={goalsDialogOpen} onOpenChange={setGoalsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-set-goals">
                <Settings2 className="h-4 w-4 mr-2" />
                Set Goals
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Set Investment Goals</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    Dividend Goals
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthlyDividendGoal">Monthly Dividend Goal ($)</Label>
                      <Input
                        id="monthlyDividendGoal"
                        type="text"
                        inputMode="numeric"
                        value={formatNumberInput(monthlyDividendGoal)}
                        onChange={(e) => setMonthlyDividendGoal(parseNumberInput(e.target.value))}
                        placeholder="e.g., 500"
                        data-testid="input-monthly-dividend-goal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="yearlyDividendGoal">Yearly Dividend Goal ($)</Label>
                      <Input
                        id="yearlyDividendGoal"
                        type="text"
                        inputMode="numeric"
                        value={formatNumberInput(yearlyDividendGoal)}
                        onChange={(e) => setYearlyDividendGoal(parseNumberInput(e.target.value))}
                        placeholder="e.g., 6000"
                        data-testid="input-yearly-dividend-goal"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-blue-500" />
                    New AUM Goals
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthlyAumGoal">Monthly AUM Goal ($)</Label>
                      <Input
                        id="monthlyAumGoal"
                        type="text"
                        inputMode="numeric"
                        value={formatNumberInput(monthlyAumGoal)}
                        onChange={(e) => setMonthlyAumGoal(parseNumberInput(e.target.value))}
                        placeholder="e.g., 50000"
                        data-testid="input-monthly-aum-goal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="yearlyAumGoal">Yearly AUM Goal ($)</Label>
                      <Input
                        id="yearlyAumGoal"
                        type="text"
                        inputMode="numeric"
                        value={formatNumberInput(yearlyAumGoal)}
                        onChange={(e) => setYearlyAumGoal(parseNumberInput(e.target.value))}
                        placeholder="e.g., 600000"
                        data-testid="input-yearly-aum-goal"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setGoalsDialogOpen(false)}>Done</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                  {editingEntry ? "Edit Entry" : "Add Investment Revenue Entry"}
                </DialogTitle>
              </DialogHeader>
              <form 
                onSubmit={handleSubmit} 
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                className="space-y-4"
              >
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
                    <Label htmlFor="entryType">Entry Type</Label>
                    <Select
                      value={formData.entryType}
                      onValueChange={(v) => setFormData({ ...formData, entryType: v })}
                    >
                      <SelectTrigger data-testid="select-entry-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTRY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sourceName">
                      {formData.entryType === "dividend" ? "Ticker Symbol" : "Client Name"}
                    </Label>
                    <Input
                      id="sourceName"
                      value={formData.sourceName}
                      onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
                      placeholder={formData.entryType === "dividend" ? "e.g., BANK.TO" : "e.g., John Smith"}
                      required
                      data-testid="input-source-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Account Type</Label>
                    <Select
                      value={formData.accountType}
                      onValueChange={(v) => setFormData({ ...formData, accountType: v })}
                    >
                      <SelectTrigger data-testid="select-account-type">
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                      data-testid="input-amount"
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
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                    data-testid="input-description"
                  />
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
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dividends Received</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600" data-testid="text-total-dividends">
              {formatCurrency(totalDividendReceived)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(totalDividendPending)} pending, {formatCurrency(totalDividendPlanned)} planned
            </p>
          </CardContent>
        </Card>
        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New AUM Received</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-total-aum">
              {formatCurrency(totalAumReceived)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(totalAumPending)} pending, {formatCurrency(totalAumPlanned)} planned
            </p>
          </CardContent>
        </Card>
        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Dividends</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600" data-testid="text-ytd-dividends">
              {formatCurrency(ytdDividendReceived)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dividendEntries.filter(e => e.status === "received" && e.date.startsWith(currentYear)).length} dividend payments
            </p>
          </CardContent>
        </Card>
        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD New AUM</CardTitle>
            <PieChart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-ytd-aum">
              {formatCurrency(ytdAumReceived)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {aumEntries.filter(e => e.status === "received" && e.date.startsWith(currentYear)).length} new clients
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Goal Progress Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Dividend Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-500" />
              Dividend Goals - {currentMonth}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthlyDividendGoalNum > 0 ? (
              <>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Monthly Progress</span>
                    <span>{formatCurrency(currentMonthDividendReceived)} / {formatCurrency(monthlyDividendGoalNum)}</span>
                  </div>
                  <Progress value={monthlyDividendProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {monthlyDividendProgress >= 100 ? (
                      <span className="text-green-600 font-medium">Monthly goal achieved!</span>
                    ) : (
                      <>
                        {formatCurrency(monthlyDividendRemaining)} remaining • {formatCurrency(dailyDividendTarget)}/day needed ({businessDaysRemaining} business days left)
                      </>
                    )}
                  </p>
                </div>
                {yearlyDividendGoalNum > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Yearly Progress</span>
                      <span>{formatCurrency(ytdDividendReceived)} / {formatCurrency(yearlyDividendGoalNum)}</span>
                    </div>
                    <Progress value={yearlyDividendProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {yearlyDividendProgress >= 100 ? (
                        <span className="text-green-600 font-medium">Yearly goal achieved!</span>
                      ) : (
                        <>
                          {formatCurrency(yearlyDividendRemaining)} remaining • {formatCurrency(yearlyDividendDailyTarget)}/day needed ({yearlyBusinessDaysRemaining} business days left)
                        </>
                      )}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No dividend goals set</p>
                <p className="text-xs mt-1">Click "Set Goals" to configure</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AUM Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              New AUM Goals - {currentMonth}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthlyAumGoalNum > 0 ? (
              <>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Monthly Progress</span>
                    <span>{formatCurrency(currentMonthAumReceived)} / {formatCurrency(monthlyAumGoalNum)}</span>
                  </div>
                  <Progress value={monthlyAumProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {monthlyAumProgress >= 100 ? (
                      <span className="text-green-600 font-medium">Monthly goal achieved!</span>
                    ) : (
                      <>
                        {formatCurrency(monthlyAumRemaining)} remaining • {formatCurrency(dailyAumTarget)}/day needed ({businessDaysRemaining} business days left)
                      </>
                    )}
                  </p>
                </div>
                {yearlyAumGoalNum > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Yearly Progress</span>
                      <span>{formatCurrency(ytdAumReceived)} / {formatCurrency(yearlyAumGoalNum)}</span>
                    </div>
                    <Progress value={yearlyAumProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {yearlyAumProgress >= 100 ? (
                        <span className="text-green-600 font-medium">Yearly goal achieved!</span>
                      ) : (
                        <>
                          {formatCurrency(yearlyAumRemaining)} remaining • {formatCurrency(yearlyAumDailyTarget)}/day needed ({yearlyBusinessDaysRemaining} business days left)
                        </>
                      )}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No AUM goals set</p>
                <p className="text-xs mt-1">Click "Set Goals" to configure</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Year-to-Date Summary */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Year-to-Date Summary ({currentYear})</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">YTD Received</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Dividends</span>
                  <span className="text-emerald-600 font-semibold">{formatCurrency(ytdDividendReceived)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">New AUM</span>
                  <span className="text-blue-600 font-semibold">{formatCurrency(ytdAumReceived)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">YTD Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Dividends</span>
                  <span className="text-yellow-600 font-semibold">{formatCurrency(ytdDividendPending)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">New AUM</span>
                  <span className="text-yellow-600 font-semibold">{formatCurrency(ytdAumPending)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">YTD Planned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Dividends</span>
                  <span className="text-blue-600 font-semibold">{formatCurrency(ytdDividendPlanned)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">New AUM</span>
                  <span className="text-blue-600 font-semibold">{formatCurrency(ytdAumPlanned)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monthly Revenue Breakdown */}
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
                    <TableHead className="text-right">Dividends Received</TableHead>
                    <TableHead className="text-right">Dividends Pending</TableHead>
                    <TableHead className="text-right">AUM Received</TableHead>
                    <TableHead className="text-right">AUM Pending</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyRevenue.map((monthData) => {
                    const total = monthData.dividendReceived + monthData.dividendPending + monthData.aumReceived + monthData.aumPending;
                    const [year, month] = monthData.month.split("-");
                    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-CA", { month: "long", year: "numeric" });
                    
                    return (
                      <TableRow key={monthData.month} data-testid={`row-month-${monthData.month}`}>
                        <TableCell className="font-medium">{monthName}</TableCell>
                        <TableCell className="text-right text-emerald-600 font-semibold">
                          {formatCurrency(monthData.dividendReceived)}
                        </TableCell>
                        <TableCell className="text-right text-yellow-600 font-semibold">
                          {formatCurrency(monthData.dividendPending)}
                        </TableCell>
                        <TableCell className="text-right text-blue-600 font-semibold">
                          {formatCurrency(monthData.aumReceived)}
                        </TableCell>
                        <TableCell className="text-right text-yellow-600 font-semibold">
                          {formatCurrency(monthData.aumPending)}
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
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const statusOption = STATUS_OPTIONS.find((o) => o.value === entry.status);
                    const entryTypeOption = ENTRY_TYPES.find((t) => t.value === entry.entryType);
                    
                    return (
                      <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                        <TableCell>
                          {new Date(entry.date).toLocaleDateString("en-CA")}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={entry.entryType === "dividend" ? "text-emerald-600 border-emerald-300" : "text-blue-600 border-blue-300"}
                          >
                            {entryTypeOption?.label || entry.entryType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{entry.sourceName}</TableCell>
                        <TableCell>{entry.accountType || "-"}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(entry.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${statusOption?.color || "bg-gray-500"} text-white`}
                          >
                            {statusOption?.label || entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(entry)}
                              data-testid={`button-edit-${entry.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(entry.id)}
                              data-testid={`button-delete-${entry.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
