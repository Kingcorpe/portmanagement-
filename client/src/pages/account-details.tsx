import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRoute, Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil, Trash2, ArrowLeft, TrendingUp, TrendingDown, Minus, AlertTriangle, Copy, Target, Upload, FileSpreadsheet, RefreshCw, Check, ChevronsUpDown, ChevronDown, ChevronRight, Mail, Send, DollarSign, Shield, StickyNote, Clock, Zap, ListTodo, Calendar, Circle, CheckCircle2, AlertCircle, Flag, X, Coins, PauseCircle, XCircle, Ban, RotateCcw, Building2, User } from "lucide-react";
import { RichNotesEditor } from "@/components/rich-notes-editor";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Rocket } from "lucide-react";
import { 
  insertPositionSchema, 
  insertAccountTargetAllocationSchema,
  insertAccountTaskSchema,
  type InsertPosition, 
  type Position, 
  type UniversalHolding,
  type PlannedPortfolioWithAllocations,
  type FreelancePortfolioWithAllocations,
  type AccountTargetAllocationWithHolding,
  type IndividualAccount,
  type CorporateAccount,
  type JointAccount,
  type AccountTask,
  type InsertAccountTask
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
  status: 'over' | 'under' | 'on-target' | 'can-deploy' | 'unexpected';
  actionType: 'buy' | 'sell' | 'hold';
  actionDollarAmount: number;
  actionShares: number;
  currentPrice: number;
}

interface PortfolioComparisonData {
  hasTargetAllocations: boolean;
  comparison: PortfolioComparisonItem[];
  totalActualValue: number;
  totalTargetPercentage: number;
}

interface CashDeploymentCandidate {
  holdingId: string;
  ticker: string;
  name: string;
  source: 'below_book' | 'manual';
  currentPrice: number;
  averageCost: number | null;
  currentValue: number;
  targetPct: number;
  targetValue: number;
  gap: number;
  allocatedCash: number;
  sharesToBuy: number;
  status: 'fully_funded' | 'partially_funded' | 'unfunded';
}

interface SellPlanCandidate {
  positionId: string;
  ticker: string;
  name: string;
  currentPrice: number;
  entryPrice: number;
  quantityHeld: number;
  totalValue: number;
  bookValue: number;
  gainLoss: number;
  gainLossPercent: number;
  isAboveBook: boolean;
  sellAmount: number;
  sharesToSell: number;
  isSelected: boolean;
}

interface SellPlanData {
  targetAmount: number;
  totalSelected: number;
  remaining: number;
  candidates: SellPlanCandidate[];
}

const RIF_MINIMUM_RATES: Record<number, number> = {
  71: 5.28, 72: 5.40, 73: 5.53, 74: 5.67, 75: 5.82,
  76: 5.98, 77: 6.17, 78: 6.36, 79: 6.58, 80: 6.82,
  81: 7.08, 82: 7.38, 83: 7.71, 84: 8.08, 85: 8.51,
  86: 8.99, 87: 9.55, 88: 10.21, 89: 10.99, 90: 11.92,
  91: 13.06, 92: 14.49, 93: 16.34, 94: 18.79,
};

function calculateRifMinimumWithdrawal(
  portfolioValue: number,
  ownerDateOfBirth: string | Date | null,
  spouseDateOfBirth: string | Date | null
): { rate: number; amount: number; age: number } | null {
  if (!ownerDateOfBirth) return null;
  
  const today = new Date();
  const currentYear = today.getFullYear();
  
  const getAge = (dob: string | Date): number => {
    const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
    let age = currentYear - birthDate.getFullYear();
    const birthMonth = birthDate.getMonth();
    const currentMonth = today.getMonth();
    if (currentMonth < birthMonth || (currentMonth === birthMonth && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  
  const ownerAge = getAge(ownerDateOfBirth);
  const spouseAge = spouseDateOfBirth ? getAge(spouseDateOfBirth) : null;
  const calculationAge = spouseAge !== null ? Math.min(ownerAge, spouseAge) : ownerAge;
  
  let rate: number;
  if (calculationAge >= 95) {
    rate = 20;
  } else if (calculationAge >= 71 && RIF_MINIMUM_RATES[calculationAge]) {
    rate = RIF_MINIMUM_RATES[calculationAge];
  } else {
    rate = (1 / (90 - calculationAge)) * 100;
  }
  
  const amount = portfolioValue * (rate / 100);
  return { rate, amount, age: calculationAge };
}

interface TaskFormProps {
  task: AccountTask | null;
  accountType: "individual" | "corporate" | "joint";
  accountId: string;
  onSubmit: (data: Partial<InsertAccountTask>) => void;
  isPending: boolean;
}

function TaskForm({ task, accountType, accountId, onSubmit, isPending }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<"pending" | "in_progress" | "blocked" | "on_hold" | "completed" | "cancelled">(task?.status === "completed" ? "pending" : (task?.status || "pending"));
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">(task?.priority || "medium");
  const [dueDate, setDueDate] = useState(task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "");

  // Parse TradingView alert information from description
  const parseTradingViewAlert = (desc: string) => {
    if (!desc || !desc.includes('TradingView')) return null;
    
    const lines = desc.split('\n').map(l => l.trim()).filter(l => l);
    const result: {
      symbol?: string;
      signal?: string;
      alertPrice?: string;
      storedPrice?: string;
      household?: string;
      account?: string;
      currentAllocation?: string;
      targetAllocation?: string;
      variance?: string;
      action?: string;
      shares?: string;
      dollarAmount?: string;
    } = {};
    
    for (const line of lines) {
      if (line.includes('Symbol:')) result.symbol = line.split('Symbol:')[1]?.trim();
      if (line.includes('Alert Price')) result.alertPrice = line.match(/\$[\d,]+\.?\d*/)?.[0];
      if (line.includes('Stored Price')) result.storedPrice = line.match(/\$[\d,]+\.?\d*/)?.[0];
      if (line.includes('Household:')) result.household = line.split('Household:')[1]?.trim();
      if (line.includes('Account:')) result.account = line.split('Account:')[1]?.trim();
      if (line.includes('Current:')) result.currentAllocation = line.split('Current:')[1]?.trim();
      if (line.includes('Target:')) result.targetAllocation = line.split('Target:')[1]?.trim();
      if (line.includes('Variance:')) result.variance = line.split('Variance:')[1]?.trim();
      if (line.includes('Buy:') || line.includes('Sell:')) {
        const actionMatch = line.match(/(Buy|Sell):\s*([\d,]+\.?\d*)/);
        if (actionMatch) {
          result.action = actionMatch[1];
          result.shares = actionMatch[2];
        }
      }
      if (line.includes('At Alert Price')) {
        const amountMatch = line.match(/\$[\d,]+\.?\d*/);
        if (amountMatch) result.dollarAmount = amountMatch[0];
      }
    }
    
    return Object.keys(result).length > 0 ? result : null;
  };

  const tradingViewData = task?.description ? parseTradingViewAlert(task.description) : null;
  const isTradingViewAlert = !!tradingViewData;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || undefined,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      individualAccountId: accountType === "individual" ? accountId : undefined,
      corporateAccountId: accountType === "corporate" ? accountId : undefined,
      jointAccountId: accountType === "joint" ? accountId : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* TradingView Alert Order Details - Prominent Display */}
      {isTradingViewAlert && tradingViewData && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-base text-blue-900 dark:text-blue-100">Trading Order</h3>
          </div>
          
          {/* Order Action - Most Prominent */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border-2 border-blue-300 dark:border-blue-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Action</span>
              <Badge variant={tradingViewData.action === 'Buy' ? 'default' : 'destructive'} className="text-sm px-2 py-0.5">
                {tradingViewData.action?.toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {tradingViewData.shares || 'N/A'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {tradingViewData.symbol === 'CASH' ? 'units' : 'shares'}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  of {tradingViewData.symbol || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-base">
                <span className="text-sm text-muted-foreground">Total Cost:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {tradingViewData.dollarAmount || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Price Information & Allocation - Compact Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-800">
              <div className="text-xs text-muted-foreground mb-0.5">Alert Price</div>
              <div className="text-base font-semibold text-blue-900 dark:text-blue-100">
                {tradingViewData.alertPrice || 'N/A'}
              </div>
            </div>
            {tradingViewData.storedPrice && (
              <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-800">
                <div className="text-xs text-muted-foreground mb-0.5">Stored Price</div>
                <div className="text-base font-semibold text-muted-foreground">
                  {tradingViewData.storedPrice}
                </div>
              </div>
            )}
          </div>

          {/* Allocation Status - Compact */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-800">
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Allocation Status</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground text-[10px]">Current</div>
                <div className="font-semibold text-sm">{tradingViewData.currentAllocation || 'N/A'}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[10px]">Target</div>
                <div className="font-semibold text-sm">{tradingViewData.targetAllocation || 'N/A'}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[10px]">Variance</div>
                <div className={`font-semibold text-sm ${tradingViewData.variance?.startsWith('-') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {tradingViewData.variance || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Location - Compact */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-800">
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Location</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{tradingViewData.household || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 text-muted-foreground" />
                <span>{tradingViewData.account || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          placeholder="Task title" 
          required
          data-testid="input-task-title" 
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Description (Optional)</label>
        <Textarea 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="Task description" 
          rows={isTradingViewAlert ? 4 : 6}
          className="font-mono text-sm"
          data-testid="input-task-description" 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Priority</label>
          <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
            <SelectTrigger data-testid="select-task-priority">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger data-testid="select-task-status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Due Date (Optional)</label>
        <Input 
          type="date" 
          value={dueDate} 
          onChange={(e) => setDueDate(e.target.value)}
          data-testid="input-task-due-date" 
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} data-testid="button-submit-task">
          {isPending ? "Saving..." : (task ? "Update Task" : "Create Task")}
        </Button>
      </div>
    </form>
  );
}

export default function AccountDetails() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, params] = useRoute("/account/:accountType/:accountId");
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const fromHouseholdId = new URLSearchParams(searchString).get("from");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<AccountTargetAllocationWithHolding | null>(null);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [selectedPortfolioType, setSelectedPortfolioType] = useState<"planned" | "freelance">("planned");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [setAsTargetAllocation, setSetAsTargetAllocation] = useState(false);
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [editingInlineTarget, setEditingInlineTarget] = useState<string | null>(null);
  const [isDeleteAllAllocationsDialogOpen, setIsDeleteAllAllocationsDialogOpen] = useState(false);
  const [inlineTargetValue, setInlineTargetValue] = useState<string>("");
  // Protection inline editing state (which position and field is being edited)
  const [editingProtection, setEditingProtection] = useState<{ positionId: string; field: 'protectionPercent' | 'stopPrice' | 'limitPrice' } | null>(null);
  const [protectionValue, setProtectionValue] = useState<string>("");
  const [holdingComboboxOpen, setHoldingComboboxOpen] = useState(false);
  const [isTargetAllocationsOpen, setIsTargetAllocationsOpen] = useState(true);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [riskMedium, setRiskMedium] = useState("100");
  const [riskMediumHigh, setRiskMediumHigh] = useState("0");
  const [riskHigh, setRiskHigh] = useState("0");
  const [isEditingRisk, setIsEditingRisk] = useState(false);
  const [immediateNotes, setImmediateNotes] = useState("");
  const [upcomingNotes, setUpcomingNotes] = useState("");
  const [isNotesExpanded, setIsNotesExpanded] = useState(true);
  const [isHoldingsExpanded, setIsHoldingsExpanded] = useState(true);
  const [isTasksExpanded, setIsTasksExpanded] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AccountTask | null>(null);
  const [taskStatusFilter, setTaskStatusFilter] = useState<"all" | "pending" | "in_progress" | "blocked" | "on_hold" | "completed" | "cancelled">("all");
  const [notesAutoSaveStatus, setNotesAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isAuditLogExpanded, setIsAuditLogExpanded] = useState(false);
  const [maintainDollarAmounts, setMaintainDollarAmounts] = useState(false);
  // Cash Deployment Planner state
  const [isCashPlannerExpanded, setIsCashPlannerExpanded] = useState(true);
  const [manualCandidates, setManualCandidates] = useState<Array<{ holdingId: string; targetPct: number }>>([]);
  const [candidateHoldingComboboxOpen, setCandidateHoldingComboboxOpen] = useState(false);
  const [selectedCandidateHolding, setSelectedCandidateHolding] = useState<string>("");
  const [candidateTargetPct, setCandidateTargetPct] = useState<string>("");
  const [isCommittingCandidates, setIsCommittingCandidates] = useState(false);
  const [focusOnPlannerCandidates, setFocusOnPlannerCandidates] = useState(false);
  // Sell Planning state
  const [isSellPlannerExpanded, setIsSellPlannerExpanded] = useState(true);
  const [targetWithdrawalAmount, setTargetWithdrawalAmount] = useState<string>("");
  const [sellCandidates, setSellCandidates] = useState<Array<{ positionId: string; sellAmount: number }>>([]);
  const [cashToWithdraw, setCashToWithdraw] = useState<string>("");
  const [lastExcelImportTime, setLastExcelImportTime] = useState<number | null>(null);
  const notesInitialLoadRef = useRef(true);
  const notesSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const accountType = params?.accountType as "individual" | "corporate" | "joint" | undefined;
  const accountId = params?.accountId;

  // Load last Excel import time from localStorage after accountId is available
  useEffect(() => {
    if (accountId && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`excel-import-${accountId}`);
      if (stored) {
        setLastExcelImportTime(parseInt(stored));
      }
    }
  }, [accountId]);

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

  // Handle hash navigation to tasks section
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#tasks') {
      // Expand tasks section if collapsed
      setIsTasksExpanded(true);
      // Scroll to tasks section after a short delay to ensure it's rendered
      setTimeout(() => {
        const tasksElement = document.getElementById('tasks');
        if (tasksElement) {
          tasksElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [accountId, accountType]);

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

  const getTasksEndpoint = () => {
    if (!accountType || !accountId) return null;
    switch (accountType) {
      case "individual":
        return `/api/individual-accounts/${accountId}/tasks`;
      case "corporate":
        return `/api/corporate-accounts/${accountId}/tasks`;
      case "joint":
        return `/api/joint-accounts/${accountId}/tasks`;
      default:
        return null;
    }
  };

  const getAuditLogEndpoint = () => {
    if (!accountType || !accountId) return null;
    return `/api/accounts/${accountType}/${accountId}/audit-log`;
  };

  const positionsEndpoint = getPositionsEndpoint();
  const accountEndpoint = getAccountEndpoint();
  const tasksEndpoint = getTasksEndpoint();
  const auditLogEndpoint = getAuditLogEndpoint();

  const { data: realPositions = [], isLoading: isLoadingReal } = useQuery<Position[]>({
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

  const positions = realPositions;
  const isLoading = isLoadingReal;

  // Fetch account details to get the specific account type
  const { data: accountData } = useQuery<IndividualAccount | CorporateAccount | JointAccount>({
    queryKey: [accountEndpoint],
    enabled: isAuthenticated && !!accountEndpoint,
  });

  // Sync risk allocation and notes state with account data when it loads
  useEffect(() => {
    if (accountData) {
      const allocation = getRiskAllocationFromAccount(accountData);
      setRiskMedium(allocation.medium.toString());
      setRiskMediumHigh(allocation.mediumHigh.toString());
      setRiskHigh(allocation.high.toString());
      setImmediateNotes(accountData.immediateNotes || "");
      setUpcomingNotes(accountData.upcomingNotes || "");
      // Mark initial load complete after a short delay to avoid triggering autosave
      setTimeout(() => {
        notesInitialLoadRef.current = false;
      }, 100);
    }
  }, [accountData]);

  // Autosave notes with debounce
  useEffect(() => {
    // Skip if this is the initial load
    if (notesInitialLoadRef.current) return;
    // Skip if no account endpoint
    if (!accountEndpoint) return;

    // Clear any existing timeout
    if (notesSaveTimeoutRef.current) {
      clearTimeout(notesSaveTimeoutRef.current);
    }

    // Set a new timeout to save after 1 second of no changes
    notesSaveTimeoutRef.current = setTimeout(async () => {
      setNotesAutoSaveStatus("saving");
      try {
        await apiRequest("PATCH", accountEndpoint, { immediateNotes, upcomingNotes });
        await queryClient.invalidateQueries({ 
          queryKey: [accountEndpoint],
          refetchType: 'active',
        });
        setNotesAutoSaveStatus("saved");
        // Reset to idle after showing "saved" for 2 seconds
        setTimeout(() => setNotesAutoSaveStatus("idle"), 2000);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save notes",
          variant: "destructive",
        });
        setNotesAutoSaveStatus("idle");
      }
    }, 1000);

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (notesSaveTimeoutRef.current) {
        clearTimeout(notesSaveTimeoutRef.current);
      }
    };
  }, [immediateNotes, upcomingNotes, accountEndpoint, toast]);

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

  // Fetch account tasks
  const { data: tasks = [] } = useQuery<AccountTask[]>({
    queryKey: [tasksEndpoint],
    enabled: isAuthenticated && !!tasksEndpoint,
  });

  // Fetch audit log for this account
  interface AuditLogEntry {
    id: string;
    userId: string;
    action: string;
    changes: Record<string, { old: any; new: any }>;
    createdAt: string;
  }
  
  const { data: auditLog = [], isLoading: isAuditLogLoading } = useQuery<AuditLogEntry[]>({
    queryKey: [auditLogEndpoint],
    enabled: isAuthenticated && !!auditLogEndpoint && isAuditLogExpanded,
  });

  // Calculate totals (needed for useMemo below - must be before early returns)
  const totalMarketValue = positions.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.currentPrice)), 0);

  // Helper function to normalize tickers for comparison (strip exchange suffixes)
  const normalizeTicker = useCallback((ticker: string): string => {
    return ticker.toUpperCase().replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '');
  }, []);

  // Cash Deployment Planner calculations (must be called unconditionally)
  const cashDeploymentData = useMemo(() => {
    if (!accountData?.deploymentMode || !positions.length) {
      return { availableCash: 0, belowBookCandidates: [], allCandidates: [], totalAllocated: 0 };
    }

    // Find cash position
    const cashPosition = positions.find(p => p.symbol.toUpperCase() === 'CASH');
    const availableCash = cashPosition ? Number(cashPosition.quantity) : 0;

    if (availableCash <= 0) {
      return { availableCash: 0, belowBookCandidates: [], allCandidates: [], totalAllocated: 0 };
    }

    // Find holdings below book value (current price < entry price)
    const belowBookCandidates: CashDeploymentCandidate[] = positions
      .filter(p => {
        const currentPrice = Number(p.currentPrice);
        const entryPrice = Number(p.entryPrice);
        return p.symbol.toUpperCase() !== 'CASH' && currentPrice < entryPrice;
      })
      .map(p => {
        const normalizedSymbol = normalizeTicker(p.symbol);
        const holding = universalHoldings.find(h => normalizeTicker(h.ticker) === normalizedSymbol);
        const targetAlloc = targetAllocations.find(ta => 
          ta.holding && normalizeTicker(ta.holding.ticker) === normalizedSymbol
        );
        
        const currentPrice = Number(p.currentPrice);
        const entryPrice = Number(p.entryPrice);
        const currentValue = Number(p.quantity) * currentPrice;
        const targetPct = targetAlloc ? Number(targetAlloc.targetPercentage) : 0;
        const targetValue = (targetPct / 100) * totalMarketValue;
        const gap = Math.max(0, targetValue - currentValue);

        return {
          holdingId: holding?.id || '',
          ticker: p.symbol,
          name: holding?.name || p.symbol,
          source: 'below_book' as const,
          currentPrice,
          averageCost: entryPrice,
          currentValue,
          targetPct,
          targetValue,
          gap,
          allocatedCash: 0,
          sharesToBuy: 0,
          status: 'unfunded' as const,
        };
      })
      .filter(c => c.gap > 0);

    // Add manual candidates
    const manualCandidatesList = manualCandidates
      .map(mc => {
        const holding = universalHoldings.find(h => h.id === mc.holdingId);
        if (!holding) return null;

        const normalizedTicker = normalizeTicker(holding.ticker);
        const existingPosition = positions.find(p => normalizeTicker(p.symbol) === normalizedTicker);
        
        const currentPrice = Number(holding.price || 0);
        const currentValue = existingPosition ? Number(existingPosition.quantity) * Number(existingPosition.currentPrice) : 0;
        const targetValue = (mc.targetPct / 100) * totalMarketValue;
        const gap = Math.max(0, targetValue - currentValue);

        const candidate: CashDeploymentCandidate = {
          holdingId: mc.holdingId,
          ticker: holding.ticker,
          name: holding.name,
          source: 'manual',
          currentPrice,
          averageCost: existingPosition ? Number(existingPosition.entryPrice) : null,
          currentValue,
          targetPct: mc.targetPct,
          targetValue,
          gap,
          allocatedCash: 0,
          sharesToBuy: 0,
          status: 'unfunded',
        };
        return candidate;
      })
      .filter((c): c is CashDeploymentCandidate => c !== null && c.gap > 0);

    // Combine and deduplicate candidates (manual takes priority over below_book)
    const allCandidatesMap = new Map<string, CashDeploymentCandidate>();
    belowBookCandidates.forEach(c => allCandidatesMap.set(normalizeTicker(c.ticker), c));
    manualCandidatesList.forEach(c => allCandidatesMap.set(normalizeTicker(c.ticker), c));

    // Sort by largest gap first and allocate cash
    const sortedCandidates = Array.from(allCandidatesMap.values())
      .sort((a, b) => b.gap - a.gap);

    let remainingCash = availableCash;
    const allocatedCandidates = sortedCandidates.map(candidate => {
      if (remainingCash <= 0) {
        return { ...candidate, allocatedCash: 0, sharesToBuy: 0, status: 'unfunded' as const };
      }

      const allocation = Math.min(candidate.gap, remainingCash);
      remainingCash -= allocation;
      const sharesToBuy = candidate.currentPrice > 0 ? Math.floor(allocation / candidate.currentPrice) : 0;

      return {
        ...candidate,
        allocatedCash: allocation,
        sharesToBuy,
        status: allocation >= candidate.gap ? 'fully_funded' as const : 
               allocation > 0 ? 'partially_funded' as const : 'unfunded' as const,
      };
    });

    return {
      availableCash,
      belowBookCandidates,
      allCandidates: allocatedCandidates,
      totalAllocated: availableCash - remainingCash,
    };
  }, [accountData?.deploymentMode, positions, targetAllocations, universalHoldings, manualCandidates, totalMarketValue, normalizeTicker]);

  // Compute sell plan data when withdrawal mode is active
  const sellPlanData = useMemo((): SellPlanData & { existingCash: number; cashIncluded: number } => {
    const targetAmount = parseFloat(targetWithdrawalAmount) || 0;
    
    // Find existing CASH position
    const cashPosition = positions.find(p => normalizeTicker(p.symbol) === 'CASH');
    const existingCash = cashPosition ? Number(cashPosition.quantity) : 0;
    
    // Parse cash to withdraw amount and clamp to available cash
    const requestedCash = parseFloat(cashToWithdraw) || 0;
    const cashIncluded = Math.min(requestedCash, existingCash);
    
    // Get all non-CASH positions as candidates
    const candidates: SellPlanCandidate[] = positions
      .filter(p => normalizeTicker(p.symbol) !== 'CASH')
      .map(position => {
        const holding = universalHoldings.find(h => normalizeTicker(h.ticker) === normalizeTicker(position.symbol));
        const currentPrice = Number(position.currentPrice) || 0;
        const entryPrice = Number(position.entryPrice) || 0;
        const quantityHeld = Number(position.quantity) || 0;
        const totalValue = currentPrice * quantityHeld;
        const bookValue = entryPrice * quantityHeld;
        const gainLoss = totalValue - bookValue;
        const gainLossPercent = bookValue > 0 ? ((totalValue - bookValue) / bookValue) * 100 : 0;
        const isAboveBook = currentPrice > entryPrice;
        
        // Check if this position is selected for selling
        const sellCandidate = sellCandidates.find(sc => sc.positionId === position.id);
        const sellAmount = sellCandidate?.sellAmount || 0;
        const sharesToSell = currentPrice > 0 ? Math.ceil(sellAmount / currentPrice) : 0;
        
        return {
          positionId: position.id,
          ticker: position.symbol,
          name: holding?.name || position.symbol,
          currentPrice,
          entryPrice,
          quantityHeld,
          totalValue,
          bookValue,
          gainLoss,
          gainLossPercent,
          isAboveBook,
          sellAmount,
          sharesToSell: Math.min(sharesToSell, quantityHeld), // Can't sell more than held
          isSelected: sellAmount > 0,
        };
      })
      .sort((a, b) => a.ticker.localeCompare(b.ticker)); // Sort alphabetically by ticker
    
    const totalFromSales = sellCandidates.reduce((sum, sc) => sum + (sc.sellAmount || 0), 0);
    const totalSelected = totalFromSales + cashIncluded;
    const remaining = Math.max(0, targetAmount - totalSelected);
    
    return {
      targetAmount,
      totalSelected,
      remaining,
      candidates,
      existingCash,
      cashIncluded,
    };
  }, [accountData?.withdrawalMode, positions, universalHoldings, sellCandidates, targetWithdrawalAmount, normalizeTicker, cashToWithdraw]);

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

  const deleteAllAllocationsMutation = useMutation({
    mutationFn: async () => {
      // Delete all target allocations for this account
      const deletePromises = targetAllocations.map(alloc =>
        apiRequest("DELETE", `/api/account-target-allocations/${alloc.id}`)
      );
      await Promise.all(deletePromises);
    },
    onSuccess: async () => {
      await refreshAllocationData();
      setIsDeleteAllAllocationsDialogOpen(false);
      toast({
        title: "Success",
        description: "All target allocations deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete all target allocations",
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

  // Commit cash deployment candidates to target allocations
  const handleCommitCandidatesToTargets = async () => {
    if (cashDeploymentData.allCandidates.length === 0) return;
    
    setIsCommittingCandidates(true);
    let created = 0;
    let updated = 0;
    let errors = 0;

    try {
      for (const candidate of cashDeploymentData.allCandidates) {
        // Find the universal holding for this candidate
        const holding = universalHoldings.find(h => 
          normalizeTicker(h.ticker) === normalizeTicker(candidate.ticker)
        );
        
        if (!holding) {
          errors++;
          continue;
        }

        // Check if there's already a target allocation for this ticker
        const existingAllocation = targetAllocations.find(ta =>
          ta.holding && normalizeTicker(ta.holding.ticker) === normalizeTicker(candidate.ticker)
        );

        try {
          if (existingAllocation) {
            // Update existing allocation with new target percentage
            await apiRequest("PATCH", `/api/account-target-allocations/${existingAllocation.id}`, {
              targetPercentage: candidate.targetPct.toString(),
            });
            updated++;
          } else {
            // Create new target allocation
            await apiRequest("POST", `/api/accounts/${accountType}/${accountId}/target-allocations`, {
              universalHoldingId: holding.id,
              targetPercentage: candidate.targetPct.toString(),
              isWatchlist: false,
            });
            created++;
          }
        } catch (err) {
          console.error(`Failed to commit candidate ${candidate.ticker}:`, err);
          errors++;
        }
      }

      // Refresh data after all operations
      await refreshAllocationData();
      
      // Clear manual candidates since they're now committed
      setManualCandidates([]);

      toast({
        title: "Candidates Committed",
        description: `Created ${created} new, updated ${updated} existing${errors > 0 ? `, ${errors} errors` : ''}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to commit candidates to targets",
        variant: "destructive",
      });
    } finally {
      setIsCommittingCandidates(false);
    }
  };

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

  // Protection update mutation
  const updateProtectionMutation = useMutation({
    mutationFn: async ({ positionId, field, value }: { positionId: string; field: 'protectionPercent' | 'stopPrice' | 'limitPrice'; value: string }) => {
      const updateData: Record<string, string | null> = {};
      updateData[field] = value === "" ? null : value;
      return await apiRequest("PATCH", `/api/positions/${positionId}`, updateData);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: [positionsEndpoint],
        refetchType: 'active',
      });
      setEditingProtection(null);
      setProtectionValue("");
      toast({
        title: "Protection Updated",
        description: "Position protection settings have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update protection settings",
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

  const updateNotesMutation = useMutation({
    mutationFn: async (notes: { immediateNotes?: string; upcomingNotes?: string }) => {
      const endpoint = accountEndpoint;
      if (!endpoint) throw new Error("Account endpoint not available");
      return await apiRequest("PATCH", endpoint, notes);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ 
        queryKey: [accountEndpoint],
        refetchType: 'active',
      });
      toast({
        title: "Notes Saved",
        description: "Account notes have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save notes",
        variant: "destructive",
      });
    },
  });

  // Task mutations
  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertAccountTask) => {
      return await apiRequest("POST", "/api/account-tasks", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [tasksEndpoint] });
      toast({
        title: "Task Created",
        description: "Task has been created successfully.",
      });
      setIsTaskDialogOpen(false);
      setEditingTask(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertAccountTask> }) => {
      return await apiRequest("PATCH", `/api/account-tasks/${id}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [tasksEndpoint] });
      toast({
        title: "Task Updated",
        description: "Task has been updated successfully.",
      });
      setIsTaskDialogOpen(false);
      setEditingTask(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/account-tasks/${id}/complete`, {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [tasksEndpoint] });
      await queryClient.invalidateQueries({ queryKey: [auditLogEndpoint] });
      toast({
        title: "Task Completed",
        description: "Task has been completed. You can restore it later if needed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete task",
        variant: "destructive",
      });
    },
  });

  const restoreTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/account-tasks/${id}/restore`, {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [tasksEndpoint] });
      await queryClient.invalidateQueries({ queryKey: [auditLogEndpoint] });
      toast({
        title: "Task Restored",
        description: "Task has been restored to pending status.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore task",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/account-tasks/${id}`, undefined);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [tasksEndpoint] });
      toast({
        title: "Task Deleted",
        description: "Task has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  // Toggle deployment mode mutation
  const toggleDeploymentModeMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest("PATCH", accountEndpoint!, { deploymentMode: enabled });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [accountEndpoint] });
      const newMode = !accountData?.deploymentMode;
      toast({
        title: newMode ? "Deployment Mode Enabled" : "Deployment Mode Disabled",
        description: newMode 
          ? "Target allocations can now exceed 100% for cash deployment planning." 
          : "Standard 100% allocation validation is now active.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle deployment mode",
        variant: "destructive",
      });
    },
  });

  // Toggle withdrawal mode mutation
  const toggleWithdrawalModeMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest("PATCH", accountEndpoint!, { withdrawalMode: enabled });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [accountEndpoint] });
      const newMode = !accountData?.withdrawalMode;
      if (!newMode) {
        // Reset sell planning state when exiting
        setTargetWithdrawalAmount("");
        setSellCandidates([]);
      }
      toast({
        title: newMode ? "Withdrawal Mode Enabled" : "Withdrawal Mode Disabled",
        description: newMode 
          ? "Plan which holdings to sell to meet withdrawal target." 
          : "Sell planning mode deactivated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle withdrawal mode",
        variant: "destructive",
      });
    },
  });

  const handleInlineTargetEdit = (position: Position) => {
    setEditingInlineTarget(position.id);
    setInlineTargetValue("");  // Start with empty field for faster entry
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
    
    // In deployment mode, allow values > 100%; otherwise cap at 100%
    const isDeploymentMode = accountData?.deploymentMode ?? false;
    const maxAllowed = isDeploymentMode ? Number.MAX_SAFE_INTEGER : 100;
    
    if (targetPct < 0 || targetPct > maxAllowed) {
      toast({
        title: "Invalid Value",
        description: isDeploymentMode 
          ? "Target percentage must be positive" 
          : "Target percentage must be between 0 and 100",
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

  // Protection inline editing handlers
  const handleProtectionEdit = (position: Position, field: 'protectionPercent' | 'stopPrice' | 'limitPrice') => {
    setEditingProtection({ positionId: position.id, field });
    const currentValue = position[field];
    // Default to 50% for protection percent if no current value
    if (!currentValue && field === 'protectionPercent') {
      setProtectionValue("50");
    } else {
      setProtectionValue(currentValue ? String(currentValue) : "");
    }
  };

  const handleProtectionSave = (position: Position) => {
    if (!editingProtection) return;
    
    const trimmedValue = protectionValue.trim();
    
    // Validate the value if not empty
    if (trimmedValue !== "") {
      const numValue = parseFloat(trimmedValue);
      if (isNaN(numValue) || numValue < 0) {
        toast({
          title: "Invalid Value",
          description: "Please enter a valid positive number",
          variant: "destructive",
        });
        return;
      }
      
      // Validate protection percent is between 0-100
      if (editingProtection.field === 'protectionPercent' && numValue > 100) {
        toast({
          title: "Invalid Value",
          description: "Protection percentage must be between 0 and 100",
          variant: "destructive",
        });
        return;
      }
    }
    
    updateProtectionMutation.mutate({
      positionId: position.id,
      field: editingProtection.field,
      value: trimmedValue,
    });
  };

  const handleProtectionCancel = () => {
    setEditingProtection(null);
    setProtectionValue("");
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

  const computeRiskTotals = () => {
    const riskTotals: Record<RiskLevel, number> = {
      medium: 0,
      medium_high: 0,
      high: 0,
    };
    
    for (const alloc of targetAllocations) {
      const category = alloc.holding?.category as HoldingCategory;
      if (category && CATEGORY_TO_RISK_LEVEL[category]) {
        const riskLevel = CATEGORY_TO_RISK_LEVEL[category];
        riskTotals[riskLevel] += parseFloat(alloc.targetPercentage);
      }
    }
    
    return [
      { key: "medium", label: "Medium", total: riskTotals.medium },
      { key: "medium_high", label: "Medium/High", total: riskTotals.medium_high },
      { key: "high", label: "High", total: riskTotals.high },
    ];
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

  // Parse CSV with proper handling of quoted fields (RFC 4180 compliant)
  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    
    for (const line of lines) {
      const row: string[] = [];
      let currentField = '';
      let insideQuotes = false;
      let i = 0;
      
      while (i < line.length) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (insideQuotes && nextChar === '"') {
            // Escaped quote (double quote)
            currentField += '"';
            i += 2;
          } else if (insideQuotes && (nextChar === ',' || nextChar === undefined || nextChar === '\r')) {
            // End of quoted field
            insideQuotes = false;
            i++;
          } else if (!insideQuotes && currentField === '') {
            // Start of quoted field
            insideQuotes = true;
            i++;
          } else {
            // Quote in unquoted field (shouldn't happen in valid CSV, but handle gracefully)
            currentField += char;
            i++;
          }
        } else if (char === ',' && !insideQuotes) {
          // End of field
          row.push(currentField.trim().replace(/['"$]/g, ''));
          currentField = '';
          i++;
        } else {
          currentField += char;
          i++;
        }
      }
      
      // Add the last field
      row.push(currentField.trim().replace(/['"$]/g, ''));
      rows.push(row);
    }
    
    return rows;
  };

  // Process file (CSV and Excel)
  const processFile = async (file: File) => {
    setIsUploading(true);
    setIsDragging(false);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let rows: string[][] = [];

      if (fileExtension === 'csv') {
        // Parse CSV with proper quoted field handling
        const text = await file.text();
        rows = parseCSV(text);
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

      // Upload to server (always remove positions not in file since Excel is source of truth)
      const response = await apiRequest("POST", "/api/positions/bulk", {
        positions,
        accountType,
        accountId,
        clearExisting: true, // Always true - Excel file is source of truth
        setAsTargetAllocation
      }) as unknown as { success: boolean; created: number; deleted?: number; errors?: any[]; message: string };

      // Invalidate all relevant queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: [positionsEndpoint] });
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountType, accountId, 'target-allocations'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountType, accountId, 'portfolio-comparison'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/accounts', accountType, accountId, 'change-history'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/universal-holdings'] });

      // Record successful import time to hide warning
      const importTime = Date.now();
      setLastExcelImportTime(importTime);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`excel-import-${accountId}`, importTime.toString());
      }

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
  const handleAddCash = async () => {
    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid cash amount",
        variant: "destructive",
      });
      return;
    }

    // If maintaining dollar amounts, recalculate allocations first
    if (maintainDollarAmounts && comparisonData && targetAllocations.length > 0) {
      const currentCash = positions.find(p => p.symbol === "CASH");
      const currentCashValue = currentCash ? Number(currentCash.quantity) : 0;
      const currentNonCashValue = comparisonData.totalActualValue - currentCashValue;
      const newTotalValue = currentNonCashValue + amount;

      // For each target allocation, recalculate percentage based on actual holding value
      for (const allocation of targetAllocations) {
        const comparisonItem = comparisonData.comparison.find(c => c.allocationId === allocation.id);
        if (comparisonItem && comparisonItem.actualValue > 0) {
          const newPercentage = (comparisonItem.actualValue / newTotalValue) * 100;
          try {
            await apiRequest("PATCH", `/api/accounts/${accountType}/${accountId}/target-allocations/${allocation.id}`, {
              targetPercentage: newPercentage.toString(),
            });
          } catch (error) {
            console.error(`Failed to update allocation for ${comparisonItem.ticker}:`, error);
          }
        }
      }
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
    setMaintainDollarAmounts(false);
  };

  if (!accountType || !accountId) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="inline-flex items-center justify-center h-9 w-9 rounded-md bg-transparent hover:bg-accent hover:text-accent-foreground" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </button>
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

  // Helper to calculate monthly dividend for a position
  const getPositionDividend = (position: Position) => {
    const normalizedSymbol = normalizeTicker(position.symbol);
    const holding = universalHoldings.find(h => normalizeTicker(h.ticker) === normalizedSymbol);
    
    if (!holding || !holding.dividendRate || Number(holding.dividendRate) === 0) {
      return { monthlyDividend: 0, annualDividend: 0, dividendYield: 0, payout: 'none' as const };
    }
    
    const quantity = Number(position.quantity);
    const dividendRate = Number(holding.dividendRate); // Annual dividend per share
    const annualDividend = quantity * dividendRate;
    const monthlyDividend = annualDividend / 12;
    const dividendYield = Number(holding.dividendYield) || 0;
    
    return { 
      monthlyDividend, 
      annualDividend, 
      dividendYield,
      payout: holding.dividendPayout || 'none'
    };
  };

  // Calculate total monthly dividend for all positions
  const totalMonthlyDividend = positions.reduce((sum, pos) => {
    return sum + getPositionDividend(pos).monthlyDividend;
  }, 0);

  const totalAnnualDividend = positions.reduce((sum, pos) => {
    return sum + getPositionDividend(pos).annualDividend;
  }, 0);

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
          <Button variant="ghost" size="icon" onClick={() => setLocation(fromHouseholdId ? `/households?focus=${fromHouseholdId}` : "/households")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold" data-testid="text-account-type">{getAccountTypeLabel()}</h1>
              {(accountData as any)?.householdName && (
                <span className="text-sm text-muted-foreground" data-testid="text-household-name">
                  ({(accountData as any).ownerName} • {(accountData as any).householdName})
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {accountType?.charAt(0).toUpperCase()}{accountType?.slice(1)} Account Positions
            </p>
          </div>
        </div>

      </div>

      <Card className="glow-border holo-card">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Market Value:</span>
              <span className="text-xl font-bold" data-testid="text-total-value">
                ${totalMarketValue.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD
              </span>
              <span className="text-xs text-muted-foreground">
                (Book: ${totalBookValue.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            </div>
            <div className="h-6 w-px bg-border hidden sm:block" />
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
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Risk:</span>
                    <span className="font-medium" data-testid="text-risk-allocation">
                      {formatRiskAllocation(currentAllocation)}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setIsEditingRisk(true)}
                      data-testid="button-edit-risk"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                );
              }
              
              const handleKeyDown = (e: React.KeyboardEvent) => {
                if (e.key === "Enter" && isValid && !updateRiskAllocationMutation.isPending) {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  handleCancel();
                }
              };
              
              return (
                <div className="flex flex-wrap items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">M:</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={riskMedium}
                      onChange={(e) => setRiskMedium(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-7 w-14 text-sm"
                      data-testid="input-risk-medium"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">M/H:</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={riskMediumHigh}
                      onChange={(e) => setRiskMediumHigh(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-7 w-14 text-sm"
                      data-testid="input-risk-medium-high"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">H:</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={riskHigh}
                      onChange={(e) => setRiskHigh(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-7 w-14 text-sm"
                      data-testid="input-risk-high"
                    />
                  </div>
                  <span className={cn("text-xs", isValid ? "text-muted-foreground" : "text-destructive font-medium")}>
                    {total.toFixed(0)}%{!isValid && " (must = 100%)"}
                  </span>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={handleCancel}
                    data-testid="button-cancel-risk"
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    className="h-7"
                    onClick={handleSave}
                    disabled={!isValid || updateRiskAllocationMutation.isPending}
                    data-testid="button-save-risk"
                  >
                    {updateRiskAllocationMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              );
            })()}
            {/* RIF Minimum Withdrawal Display */}
            {accountType === "individual" && accountData?.type === "rif" && (() => {
              const rifData = calculateRifMinimumWithdrawal(
                totalMarketValue,
                (accountData as any)?.ownerDateOfBirth,
                (accountData as any)?.ownerSpouseDateOfBirth
              );
              if (!rifData) return null;
              return (
                <>
                  <div className="h-6 w-px bg-border hidden sm:block" />
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Min. Withdrawal:</span>
                    <span className="font-medium" data-testid="text-rif-minimum">
                      ${rifData.amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({rifData.rate.toFixed(2)}% at age {rifData.age})
                    </span>
                  </div>
                </>
              );
            })()}
            {/* Monthly Dividend Income Display */}
            {totalMonthlyDividend > 0 && (
              <>
                <div className="h-6 w-px bg-border hidden sm:block" />
                <div className="flex items-center gap-3">
                  <Coins className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-muted-foreground">Monthly Dividend:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400" data-testid="text-monthly-dividend">
                    ${totalMonthlyDividend.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (${totalAnnualDividend.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr)
                  </span>
                  {totalMarketValue > 0 && (
                    <span className="text-xs text-muted-foreground">
                      • {((totalAnnualDividend / totalMarketValue) * 100).toFixed(2)}% yield
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unified Holdings & Portfolio Comparison Section */}
      <Collapsible open={isHoldingsExpanded} onOpenChange={setIsHoldingsExpanded}>
        <Card className="glow-border corner-accents">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <div className="flex items-center gap-4">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity" data-testid="button-toggle-holdings">
                  {isHoldingsExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  <div>
                    <CardTitle>Allocation</CardTitle>
                    <CardDescription>
                      Positions with target allocation comparison
                    </CardDescription>
                  </div>
                </button>
              </CollapsibleTrigger>
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
          <CollapsibleContent>
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

          {/* Trades Needed Section - Shows all buy/sell actions including for missing positions */}
          {comparisonData?.hasTargetAllocations && (() => {
            const tradesNeeded = comparisonData.comparison.filter(c => c.actionType !== 'hold');
            const buyTrades = tradesNeeded.filter(c => c.actionType === 'buy').sort((a, b) => b.actionDollarAmount - a.actionDollarAmount);
            const sellTrades = tradesNeeded.filter(c => c.actionType === 'sell').sort((a, b) => a.actionDollarAmount - b.actionDollarAmount);
            const totalBuyAmount = buyTrades.reduce((sum, t) => sum + t.actionDollarAmount, 0);
            const totalSellAmount = sellTrades.reduce((sum, t) => sum + Math.abs(t.actionDollarAmount), 0);
            
            if (tradesNeeded.length === 0) return null;
            
            return (
              <Collapsible defaultOpen={!accountData?.deploymentMode}>
                <div className="border rounded-lg bg-card" data-testid="trades-needed-section">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover-elevate rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium text-sm text-muted-foreground">Gap to Target</h4>
                      <Badge variant="outline" className="text-xs text-muted-foreground">Illustrative</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {buyTrades.length > 0 && (
                        <span className="text-xs text-muted-foreground" data-testid="badge-total-buy">
                          {buyTrades.length} underweight
                        </span>
                      )}
                      {sellTrades.length > 0 && (
                        <span className="text-xs text-muted-foreground" data-testid="badge-total-sell">
                          {sellTrades.length} overweight
                        </span>
                      )}
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>*>&]:rotate-180" />
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-0">
                  {/* Buy Orders */}
                  {buyTrades.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">
                        Buy Orders ({buyTrades.length})
                      </div>
                      <div className="space-y-1">
                        {buyTrades.map((trade) => (
                          <div 
                            key={trade.ticker} 
                            className="flex items-center justify-between p-2 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
                            data-testid={`trade-buy-${trade.ticker}`}
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                                Buy
                              </Badge>
                              <div>
                                <span className="font-medium" data-testid={`text-buy-ticker-${trade.ticker}`}>{trade.ticker}</span>
                                {trade.quantity === 0 && (
                                  <span className="ml-1 text-xs text-muted-foreground">(new)</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <div className="font-medium text-green-700 dark:text-green-400" data-testid={`text-buy-shares-${trade.ticker}`}>
                                {trade.actionShares.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} shares
                              </div>
                              <div className="text-xs text-muted-foreground" data-testid={`text-buy-amount-${trade.ticker}`}>
                                {trade.currentPrice > 0 ? (
                                  <span data-testid={`text-buy-price-${trade.ticker}`}>
                                    @ ${trade.currentPrice.toFixed(2)} = ${trade.actionDollarAmount.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </span>
                                ) : (
                                  <span>${trade.actionDollarAmount.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Sell Orders */}
                  {sellTrades.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wide">
                        Sell Orders ({sellTrades.length})
                      </div>
                      <div className="space-y-1">
                        {sellTrades.map((trade) => (
                          <div 
                            key={trade.ticker} 
                            className="flex items-center justify-between p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
                            data-testid={`trade-sell-${trade.ticker}`}
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">
                                Sell
                              </Badge>
                              <div>
                                <span className="font-medium" data-testid={`text-sell-ticker-${trade.ticker}`}>{trade.ticker}</span>
                                {trade.status === 'unexpected' && (
                                  <span className="ml-1 text-xs text-amber-600">(untracked)</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <div className="font-medium text-red-700 dark:text-red-400" data-testid={`text-sell-shares-${trade.ticker}`}>
                                {trade.actionShares.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} shares
                              </div>
                              <div className="text-xs text-muted-foreground" data-testid={`text-sell-amount-${trade.ticker}`}>
                                {trade.currentPrice > 0 ? (
                                  <span data-testid={`text-sell-price-${trade.ticker}`}>
                                    @ ${trade.currentPrice.toFixed(2)} = ${Math.abs(trade.actionDollarAmount).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </span>
                                ) : (
                                  <span>${Math.abs(trade.actionDollarAmount).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })()}

          {positions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No positions yet. Click "Add Position" to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  {comparisonData?.hasTargetAllocations && (
                    <TableHead className="text-center">Status</TableHead>
                  )}
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Book Value</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">Dividend/mo</TableHead>
                  <TableHead className="text-right">U/R Gain $</TableHead>
                  {comparisonData?.hasTargetAllocations && (
                    <TableHead className="text-right">Actual %</TableHead>
                  )}
                  <TableHead className="text-right">Target %</TableHead>
                  {comparisonData?.hasTargetAllocations && (
                    <>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                      <TableHead className="text-right">$ Amount</TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                    </>
                  )}
                  <TableHead className="text-right">Protect %</TableHead>
                  <TableHead className="text-right">Protect Shares</TableHead>
                  <TableHead className="text-right">Stop Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  // Create set of planner candidate tickers for filtering
                  const plannerCandidateTickers = new Set(
                    cashDeploymentData.allCandidates.map(c => normalizeTicker(c.ticker))
                  );
                  
                  // Filter positions if focusOnPlannerCandidates is enabled and in deployment mode
                  const filteredPositions = accountData?.deploymentMode && focusOnPlannerCandidates
                    ? positions.filter(p => plannerCandidateTickers.has(normalizeTicker(p.symbol)))
                    : positions;
                  
                  return [...filteredPositions].sort((a, b) => {
                    // CASH always at top
                    const aIsCash = a.symbol.toUpperCase() === 'CASH' || a.symbol.toUpperCase().includes('MONEY MARKET');
                    const bIsCash = b.symbol.toUpperCase() === 'CASH' || b.symbol.toUpperCase().includes('MONEY MARKET');
                    if (aIsCash && !bIsCash) return -1;
                    if (!aIsCash && bIsCash) return 1;
                    // Then alphabetical
                    return a.symbol.localeCompare(b.symbol);
                  }).map((position) => {
                    // Use normalized ticker comparison to match "XIC.TO" with "XIC" etc.
                    const normalizedPositionSymbol = normalizeTicker(position.symbol);
                    const comparison = comparisonData?.comparison.find(c => normalizeTicker(c.ticker) === normalizedPositionSymbol);
                    const marketValue = Number(position.quantity) * Number(position.currentPrice);
                    const isEditingTarget = editingInlineTarget === position.id;
                    
                    return (
                    <TableRow key={position.id} data-testid={`row-position-${position.id}`}>
                      {/* Symbol - color reflects action needed (green=buy, red=sell) */}
                      <TableCell data-testid={`text-symbol-${position.id}`}>
                        <div className="flex items-center gap-2">
                          <div className={`font-medium ${
                            comparison?.status === 'under' ? 'text-green-600 dark:text-green-400' :
                            comparison?.status === 'over' ? 'text-red-600 dark:text-red-400' :
                            comparison?.status === 'on-target' ? 'text-blue-600 dark:text-blue-400' :
                            comparison?.status === 'can-deploy' ? 'text-purple-600 dark:text-purple-400' :
                            comparison?.status === 'unexpected' ? 'text-amber-600 dark:text-amber-400' :
                            ''
                          }`}>{position.symbol}</div>
                          {(position.symbol.toUpperCase() === 'CASH' || position.symbol.toUpperCase().includes('MONEY MARKET')) && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs px-1.5 py-0">
                              <Coins className="h-3 w-3 mr-0.5" />
                              Cash
                            </Badge>
                          )}
                          {position.protectionPercent && Number(position.protectionPercent) > 0 && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs px-1.5 py-0">
                              <Shield className="h-3 w-3 mr-0.5" />
                              Protecting
                            </Badge>
                          )}
                        </div>
                        {comparison && (
                          <div className="text-xs text-muted-foreground truncate max-w-[120px]">{comparison.name}</div>
                        )}
                      </TableCell>
                      
                      {/* Status - moved to column 2 */}
                      {comparisonData?.hasTargetAllocations && (
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
                          {comparison?.status === 'can-deploy' && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              <Zap className="h-3 w-3 mr-1" />
                              Can Deploy
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
                      )}
                      
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
                      
                      {/* Monthly Dividend */}
                      {(() => {
                        const dividendInfo = getPositionDividend(position);
                        const isCash = position.symbol.toUpperCase() === 'CASH' || position.symbol.toUpperCase().includes('MONEY MARKET');
                        if (isCash || dividendInfo.monthlyDividend === 0) {
                          return (
                            <TableCell className="text-right text-muted-foreground" data-testid={`text-dividend-${position.id}`}>
                              -
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell className="text-right" data-testid={`text-dividend-${position.id}`}>
                            <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                              ${dividendInfo.monthlyDividend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {dividendInfo.dividendYield > 0 && `${dividendInfo.dividendYield.toFixed(2)}%`}
                              {dividendInfo.payout !== 'none' && ` • ${dividendInfo.payout.charAt(0).toUpperCase() + dividendInfo.payout.slice(1).replace('_', ' ')}`}
                            </div>
                          </TableCell>
                        );
                      })()}
                      
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
                              max={accountData?.deploymentMode ? undefined : 100}
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
                      
                      {/* Variance, Action, $ Amount, Shares (only when target allocations exist) */}
                      {comparisonData?.hasTargetAllocations && (() => {
                        // Use backend-calculated values, with fallback for positions without a target
                        const actionType = comparison?.actionType || (comparison?.status === 'unexpected' ? 'sell' : 'hold');
                        const actionDollarAmount = comparison?.actionDollarAmount ?? (comparison?.status === 'unexpected' ? -marketValue : 0);
                        const actionShares = comparison?.actionShares ?? (comparison?.status === 'unexpected' ? Number(position.quantity) : 0);
                        
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
                            
                            {/* Action Badge */}
                            <TableCell className="text-center" data-testid={`badge-action-${position.id}`}>
                              {comparison?.status === 'can-deploy' ? (
                                <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Available
                                </Badge>
                              ) : actionType === 'buy' ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Buy
                                </Badge>
                              ) : actionType === 'sell' ? (
                                <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  Sell
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                  <Minus className="h-3 w-3 mr-1" />
                                  Hold
                                </Badge>
                              )}
                            </TableCell>
                            
                            {/* $ Amount */}
                            <TableCell 
                              className={`text-right font-medium ${
                                comparison?.status === 'can-deploy' ? 'text-purple-600 dark:text-purple-400' :
                                actionDollarAmount > 0 ? 'text-green-600 dark:text-green-400' : 
                                actionDollarAmount < 0 ? 'text-red-600 dark:text-red-400' : ''
                              }`}
                              data-testid={`text-action-amount-${position.id}`}
                            >
                              {comparison?.status === 'can-deploy' ? '+' : (actionDollarAmount > 0 ? '+' : '')}
                              ${Math.abs(actionDollarAmount).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </TableCell>
                            
                            {/* Shares */}
                            <TableCell 
                              className={`text-right font-medium ${
                                actionType === 'buy' ? 'text-green-600 dark:text-green-400' : 
                                actionType === 'sell' ? 'text-red-600 dark:text-red-400' : ''
                              }`}
                              data-testid={`text-action-shares-${position.id}`}
                            >
                              {actionShares.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </TableCell>
                          </>
                        );
                      })()}
                      
                      {/* Protection % - inline editable */}
                      <TableCell className="text-right" data-testid={`text-protection-pct-${position.id}`}>
                        {editingProtection?.positionId === position.id && editingProtection?.field === 'protectionPercent' ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={protectionValue}
                              onChange={(e) => setProtectionValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleProtectionSave(position);
                                if (e.key === 'Escape') handleProtectionCancel();
                              }}
                              className="w-14 h-7 text-right text-sm"
                              data-testid={`input-protection-pct-${position.id}`}
                              autoFocus
                            />
                            <span className="text-muted-foreground text-xs">%</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleProtectionSave(position)}
                              disabled={updateProtectionMutation.isPending}
                              data-testid={`button-save-protection-pct-${position.id}`}
                            >
                              {updateProtectionMutation.isPending ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleProtectionEdit(position, 'protectionPercent')}
                            className="text-right hover:bg-muted/50 px-2 py-1 rounded cursor-pointer w-full"
                            data-testid={`button-edit-protection-pct-${position.id}`}
                          >
                            {position.protectionPercent 
                              ? <span className="text-amber-600 dark:text-amber-400">{Number(position.protectionPercent).toFixed(0)}%</span>
                              : <span className="text-muted-foreground">-</span>
                            }
                          </button>
                        )}
                      </TableCell>
                      
                      {/* Protect Shares - calculated from protectionPercent * quantity */}
                      <TableCell className="text-right" data-testid={`text-protect-shares-${position.id}`}>
                        {position.protectionPercent ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {Math.round((Number(position.protectionPercent) / 100) * Number(position.quantity)).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* Stop Price - inline editable */}
                      <TableCell className="text-right" data-testid={`text-stop-price-${position.id}`}>
                        {editingProtection?.positionId === position.id && editingProtection?.field === 'stopPrice' ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={protectionValue}
                              onChange={(e) => setProtectionValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleProtectionSave(position);
                                if (e.key === 'Escape') handleProtectionCancel();
                              }}
                              className="w-20 h-7 text-right text-sm"
                              data-testid={`input-stop-price-${position.id}`}
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleProtectionSave(position)}
                              disabled={updateProtectionMutation.isPending}
                              data-testid={`button-save-stop-price-${position.id}`}
                            >
                              {updateProtectionMutation.isPending ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleProtectionEdit(position, 'stopPrice')}
                            className="text-right hover:bg-muted/50 px-2 py-1 rounded cursor-pointer w-full"
                            data-testid={`button-edit-stop-price-${position.id}`}
                          >
                            {position.stopPrice 
                              ? <span className="text-amber-600 dark:text-amber-400">${Number(position.stopPrice).toFixed(2)}</span>
                              : <span className="text-muted-foreground">-</span>
                            }
                          </button>
                        )}
                      </TableCell>
                      
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
                  });
                })()}
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
                  Set up target allocations below to see portfolio comparison analysis.
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Notes & Tasks Side-by-Side Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Account Notes Section */}
        <Collapsible open={isNotesExpanded} onOpenChange={setIsNotesExpanded}>
          <Card className="h-full glow-border holo-card">
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity w-full" data-testid="button-toggle-notes">
                  {isNotesExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-5 w-5" />
                    <CardTitle>Account Notes</CardTitle>
                  </div>
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between min-h-[28px]">
                    <span className="text-sm text-muted-foreground">Quick notes and reference info</span>
                    {immediateNotes && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => setImmediateNotes("")}
                        data-testid="button-clear-immediate-notes"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="border rounded-md p-3 bg-background">
                    <RichNotesEditor
                      value={immediateNotes}
                      onChange={setImmediateNotes}
                      placeholder="Add notes, reference info, or reminders..."
                      data-testid="notes-immediate"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="notes-autosave-status">
                    {notesAutoSaveStatus === "saving" && (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Saving...
                      </>
                    )}
                    {notesAutoSaveStatus === "saved" && (
                      <>
                        <Check className="h-3 w-3 text-green-600" />
                        Saved
                      </>
                    )}
                    {notesAutoSaveStatus === "idle" && "Autosave enabled"}
                  </span>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Account Tasks Section */}
        <Collapsible open={isTasksExpanded} onOpenChange={setIsTasksExpanded}>
          <Card id="tasks" className="h-full glow-border holo-card">
            <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity" data-testid="button-toggle-tasks">
                  {isTasksExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5" />
                    <CardTitle>Tasks</CardTitle>
                    {tasks.filter(t => t.status !== "completed").length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {tasks.filter(t => t.status !== "completed").length}
                      </Badge>
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>
              <div className="flex items-center gap-2">
                <Select value={taskStatusFilter} onValueChange={(v) => setTaskStatusFilter(v as typeof taskStatusFilter)}>
                  <SelectTrigger className="h-8 w-[130px]" data-testid="select-task-filter">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={isTaskDialogOpen} onOpenChange={(open) => {
                  setIsTaskDialogOpen(open);
                  if (!open) setEditingTask(null);
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-task">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingTask ? "Edit Task" : "Add New Task"}</DialogTitle>
                      <DialogDescription>
                        {editingTask ? "Update the task details below." : "Create a new task for this account."}
                      </DialogDescription>
                    </DialogHeader>
                    <TaskForm
                      task={editingTask}
                      accountType={accountType!}
                      accountId={accountId!}
                      onSubmit={(data) => {
                        if (editingTask) {
                          updateTaskMutation.mutate({ id: editingTask.id, data });
                        } else {
                          createTaskMutation.mutate(data as InsertAccountTask);
                        }
                      }}
                      isPending={createTaskMutation.isPending || updateTaskMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {(() => {
                const filteredTasks = tasks.filter(task => {
                  if (taskStatusFilter === "all") return true;
                  return task.status === taskStatusFilter;
                }).sort((a, b) => {
                  // Sort by status (pending, in_progress, blocked, on_hold, completed, cancelled), then by priority, then by due date
                  const statusOrder: Record<string, number> = { pending: 0, in_progress: 1, blocked: 2, on_hold: 3, completed: 4, cancelled: 5 };
                  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
                  
                  if ((statusOrder[a.status] ?? 2) !== (statusOrder[b.status] ?? 2)) {
                    return (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
                  }
                  if ((priorityOrder[a.priority] ?? 3) !== (priorityOrder[b.priority] ?? 3)) {
                    return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
                  }
                  // Sort by due date (nulls last)
                  if (a.dueDate && b.dueDate) {
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                  }
                  if (a.dueDate) return -1;
                  if (b.dueDate) return 1;
                  return 0;
                });

                if (filteredTasks.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      {taskStatusFilter === "all" 
                        ? "No tasks yet. Add a task to track action items for this account."
                        : `No ${taskStatusFilter.replace("_", " ")} tasks.`}
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover-elevate cursor-pointer"
                        data-testid={`task-item-${task.id}`}
                        onClick={() => {
                          setEditingTask(task);
                          setIsTaskDialogOpen(true);
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            completeTaskMutation.mutate(task.id);
                          }}
                          disabled={task.status === "completed" || task.status === "cancelled" || completeTaskMutation.isPending}
                          className="mt-0.5 flex-shrink-0"
                          data-testid={`button-complete-task-${task.id}`}
                          title={task.status === "completed" ? "Already completed" : task.status === "cancelled" ? "Task cancelled" : "Mark as complete"}
                        >
                          {task.status === "completed" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : task.status === "in_progress" ? (
                            <AlertCircle className="h-5 w-5 text-blue-500" />
                          ) : task.status === "blocked" ? (
                            <XCircle className="h-5 w-5 text-red-500" />
                          ) : task.status === "on_hold" ? (
                            <PauseCircle className="h-5 w-5 text-amber-500" />
                          ) : task.status === "cancelled" ? (
                            <Ban className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {task.title}
                            </span>
                            <Badge
                              variant={
                                task.priority === "urgent" ? "destructive" :
                                task.priority === "high" ? "default" :
                                task.priority === "medium" ? "secondary" :
                                "outline"
                              }
                              className="text-xs"
                            >
                              <Flag className="h-3 w-3 mr-1" />
                              {task.priority}
                            </Badge>
                            {task.status === "in_progress" && (
                              <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 dark:border-blue-600 dark:text-blue-400">
                                In Progress
                              </Badge>
                            )}
                            {task.status === "blocked" && (
                              <Badge variant="outline" className="text-xs border-red-300 text-red-600 dark:border-red-600 dark:text-red-400">
                                Blocked
                              </Badge>
                            )}
                            {task.status === "on_hold" && (
                              <Badge variant="outline" className="text-xs border-amber-300 text-amber-600 dark:border-amber-600 dark:text-amber-400">
                                On Hold
                              </Badge>
                            )}
                            {task.status === "completed" && (
                              <Badge variant="outline" className="text-xs border-green-300 text-green-600 dark:border-green-600 dark:text-green-400">
                                Completed
                              </Badge>
                            )}
                            {task.status === "cancelled" && (
                              <Badge variant="outline" className="text-xs border-muted-foreground text-muted-foreground">
                                Cancelled
                              </Badge>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Due: {(() => {
                                const d = new Date(task.dueDate);
                                return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
                              })()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {task.status === "completed" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => restoreTaskMutation.mutate(task.id)}
                              disabled={restoreTaskMutation.isPending}
                              title="Restore task"
                              data-testid={`button-restore-task-${task.id}`}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingTask(task);
                                setIsTaskDialogOpen(true);
                              }}
                              data-testid={`button-edit-task-${task.id}`}
                              title="Edit task"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteTaskMutation.mutate(task.id)}
                            disabled={deleteTaskMutation.isPending}
                            data-testid={`button-delete-task-${task.id}`}
                            title="Delete task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Target Allocations Management Section */}
      <Collapsible open={isTargetAllocationsOpen} onOpenChange={setIsTargetAllocationsOpen}>
        <Card className="glow-border corner-accents">
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
                      Target Allocation
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
            </div>
            
            {/* Toolbar - only show when expanded */}
            {isTargetAllocationsOpen && (
              <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t mt-3">
                {/* Deployment Mode Toggle */}
                <div 
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
                    accountData?.deploymentMode 
                      ? "bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700" 
                      : "bg-muted/50 border border-transparent"
                  )} 
                  data-testid="deployment-mode-container"
                >
                  <Rocket className={cn(
                    "h-4 w-4",
                    accountData?.deploymentMode ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
                  )} />
                  <label 
                    htmlFor="deployment-mode" 
                    className={cn(
                      "text-sm font-medium cursor-pointer select-none",
                      accountData?.deploymentMode && "text-orange-700 dark:text-orange-300"
                    )}
                  >
                    Deployment Mode
                  </label>
                  <Switch
                    id="deployment-mode"
                    checked={accountData?.deploymentMode ?? false}
                    onCheckedChange={(checked) => toggleDeploymentModeMutation.mutate(checked)}
                    disabled={toggleDeploymentModeMutation.isPending || accountData?.withdrawalMode}
                    data-testid="switch-deployment-mode"
                  />
                </div>
                
                {/* Withdrawal Mode Toggle */}
                <div 
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
                    accountData?.withdrawalMode 
                      ? "bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700" 
                      : "bg-muted/50 border border-transparent"
                  )} 
                  data-testid="withdrawal-mode-container"
                >
                  <TrendingDown className={cn(
                    "h-4 w-4",
                    accountData?.withdrawalMode ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                  )} />
                  <label 
                    htmlFor="withdrawal-mode" 
                    className={cn(
                      "text-sm font-medium cursor-pointer select-none",
                      accountData?.withdrawalMode && "text-red-700 dark:text-red-300"
                    )}
                  >
                    Withdrawal Mode
                  </label>
                  <Switch
                    id="withdrawal-mode"
                    checked={accountData?.withdrawalMode ?? false}
                    onCheckedChange={(checked) => toggleWithdrawalModeMutation.mutate(checked)}
                    disabled={toggleWithdrawalModeMutation.isPending || accountData?.deploymentMode}
                    data-testid="switch-withdrawal-mode"
                  />
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap sm:ml-auto">
                  <Dialog open={isDeleteAllAllocationsDialogOpen} onOpenChange={setIsDeleteAllAllocationsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={targetAllocations.length === 0}
                        data-testid="button-delete-all-allocations"
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Delete All
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete All Target Allocation?</DialogTitle>
                        <DialogDescription>
                          This will permanently delete all {targetAllocations.length} target allocation{targetAllocations.length !== 1 ? 's' : ''} for this account. This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDeleteAllAllocationsDialogOpen(false)} data-testid="button-cancel-delete-all">
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => deleteAllAllocationsMutation.mutate()}
                          disabled={deleteAllAllocationsMutation.isPending}
                          data-testid="button-confirm-delete-all"
                        >
                          {deleteAllAllocationsMutation.isPending ? "Deleting..." : "Delete All"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isCopyDialogOpen} onOpenChange={(open) => {
                    setIsCopyDialogOpen(open);
                    if (!open) {
                      setSelectedPortfolioId("");
                      setSelectedPortfolioType("planned");
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-copy-from-portfolio">
                        <Copy className="mr-1.5 h-4 w-4" />
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
                      <Button size="sm" data-testid="button-add-allocation">
                        <Plus className="mr-1.5 h-4 w-4" />
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
                                        {/* Always show CASH as first option */}
                                        <CommandItem
                                          key="cash"
                                          value="CASH Cash"
                                          onSelect={() => {
                                            // Find or use CASH holding
                                            const cashHolding = universalHoldings.find(h => h.ticker === 'CASH');
                                            if (cashHolding) {
                                              field.onChange(cashHolding.id);
                                            }
                                            setHoldingComboboxOpen(false);
                                          }}
                                          data-testid="option-holding-cash"
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              field.value === universalHoldings.find(h => h.ticker === 'CASH')?.id ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          <span className="font-mono font-medium mr-2">CASH</span>
                                          <span className="text-muted-foreground">Cash</span>
                                        </CommandItem>
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
                        render={({ field }) => {
                          // Calculate remaining percentage to 100%
                          const currentTotal = targetAllocations.reduce((sum, ta) => sum + Number(ta.targetPercentage), 0);
                          const remainingPercentage = Math.max(0, 100 - currentTotal);
                          const isDeploymentModeActive = accountData?.deploymentMode ?? false;
                          
                          return (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Target Percentage</FormLabel>
                                {remainingPercentage > 0 && !isDeploymentModeActive && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => field.onChange(remainingPercentage.toFixed(2))}
                                    className="text-xs h-6 px-2"
                                    data-testid="button-fill-to-100"
                                  >
                                    Fill to 100% ({remainingPercentage.toFixed(1)}%)
                                  </Button>
                                )}
                              </div>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  min="0.01"
                                  max={isDeploymentModeActive ? undefined : 100}
                                  placeholder="25.00" 
                                  data-testid="input-target-percentage" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
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
            )}
          </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {/* Cash Deployment Planner - Only visible in deployment mode */}
            {accountData?.deploymentMode && (
              <Collapsible open={isCashPlannerExpanded} onOpenChange={setIsCashPlannerExpanded} className="mb-6">
                <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity" data-testid="button-toggle-cash-planner">
                          {isCashPlannerExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Rocket className="h-4 w-4 text-orange-500" />
                              Cash Deployment Planner
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Plan where to deploy CA${cashDeploymentData.availableCash.toLocaleString('en-CA', { minimumFractionDigits: 2 })} available cash
                            </CardDescription>
                          </div>
                        </button>
                      </CollapsibleTrigger>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {cashDeploymentData.availableCash <= 0 ? (
                        <p className="text-muted-foreground text-center py-4 text-sm">
                          No cash available to deploy. Add a CASH position first.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {/* Below Book Value Holdings */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-4 w-4 text-red-500" />
                              <h4 className="text-sm font-medium">Below Book Value</h4>
                              <Badge variant="outline" className="text-xs">
                                {cashDeploymentData.belowBookCandidates.length} holdings
                              </Badge>
                            </div>
                            {cashDeploymentData.belowBookCandidates.length === 0 ? (
                              <p className="text-xs text-muted-foreground pl-6">
                                No holdings currently trading below book value.
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground pl-6">
                                Holdings trading below your entry price are automatically included.
                              </p>
                            )}
                          </div>

                          {/* Manual Candidates */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4 text-blue-500" />
                              <h4 className="text-sm font-medium">Manual Candidates</h4>
                              <Badge variant="outline" className="text-xs">
                                {manualCandidates.length} added
                              </Badge>
                            </div>
                            <div className="flex gap-2 pl-6">
                              <Popover open={candidateHoldingComboboxOpen} onOpenChange={setCandidateHoldingComboboxOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    role="combobox"
                                    className="w-[200px] justify-between text-xs"
                                    data-testid="button-select-candidate-holding"
                                  >
                                    {selectedCandidateHolding
                                      ? universalHoldings.find(h => h.id === selectedCandidateHolding)?.ticker
                                      : "Select holding..."}
                                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Search holdings..." className="text-xs" />
                                    <CommandList>
                                      <CommandEmpty>No holdings found.</CommandEmpty>
                                      <CommandGroup>
                                        {universalHoldings
                                          .filter(h => h.ticker !== 'CASH')
                                          .filter(h => !manualCandidates.some(mc => mc.holdingId === h.id))
                                          .map((holding) => (
                                            <CommandItem
                                              key={holding.id}
                                              value={`${holding.ticker} ${holding.name}`}
                                              onSelect={() => {
                                                setSelectedCandidateHolding(holding.id);
                                                setCandidateHoldingComboboxOpen(false);
                                              }}
                                              className="text-xs"
                                            >
                                              <span className="font-mono font-medium mr-2">{holding.ticker}</span>
                                              <span className="text-muted-foreground truncate">{holding.name}</span>
                                            </CommandItem>
                                          ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <Input
                                type="number"
                                placeholder="Target %"
                                className="w-24 h-8 text-xs"
                                value={candidateTargetPct}
                                onChange={(e) => setCandidateTargetPct(e.target.value)}
                                data-testid="input-candidate-target-pct"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!selectedCandidateHolding || !candidateTargetPct}
                                onClick={() => {
                                  if (selectedCandidateHolding && candidateTargetPct) {
                                    setManualCandidates([...manualCandidates, {
                                      holdingId: selectedCandidateHolding,
                                      targetPct: parseFloat(candidateTargetPct)
                                    }]);
                                    setSelectedCandidateHolding("");
                                    setCandidateTargetPct("");
                                  }
                                }}
                                data-testid="button-add-candidate"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            {manualCandidates.length > 0 && (
                              <div className="flex flex-wrap gap-1 pl-6">
                                {manualCandidates.map(mc => {
                                  const holding = universalHoldings.find(h => h.id === mc.holdingId);
                                  return (
                                    <Badge
                                      key={mc.holdingId}
                                      variant="secondary"
                                      className="text-xs cursor-pointer hover:bg-destructive/20"
                                      onClick={() => setManualCandidates(manualCandidates.filter(c => c.holdingId !== mc.holdingId))}
                                      data-testid={`badge-candidate-${mc.holdingId}`}
                                    >
                                      {holding?.ticker} ({mc.targetPct}%)
                                      <X className="h-3 w-3 ml-1" />
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Allocation Race Table */}
                          {cashDeploymentData.allCandidates.length > 0 && (
                            <div className="space-y-2 pt-2 border-t">
                              <h4 className="text-sm font-medium">Trades Needed</h4>
                              
                              {/* Cash Summary Box */}
                              <div className="bg-muted/50 rounded-md p-3 border border-border/50">
                                <div className="grid grid-cols-3 gap-4 text-xs">
                                  <div>
                                    <span className="text-muted-foreground block mb-1">Available Cash</span>
                                    <span className="font-semibold text-base">CA${cashDeploymentData.availableCash.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground block mb-1">Allocated</span>
                                    <span className="font-semibold text-base text-orange-600 dark:text-orange-400">CA${cashDeploymentData.totalAllocated.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground block mb-1">Remaining</span>
                                    <span className="font-semibold text-base text-blue-600 dark:text-blue-400">CA${(cashDeploymentData.availableCash - cashDeploymentData.totalAllocated).toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                                
                                {/* Progress bar */}
                                <div className="h-2 bg-muted rounded-full overflow-hidden mt-3">
                                  <div 
                                    className="h-full bg-orange-500 transition-all"
                                    style={{ width: `${(cashDeploymentData.totalAllocated / cashDeploymentData.availableCash) * 100}%` }}
                                  />
                                </div>
                              </div>

                              {/* Focus on Planner Toggle */}
                              <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={focusOnPlannerCandidates}
                                    onCheckedChange={setFocusOnPlannerCandidates}
                                    data-testid="switch-focus-planner"
                                  />
                                  <span className="text-xs text-muted-foreground">Focus Allocation table on planner candidates only</span>
                                </div>
                              </div>

                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Ticker</TableHead>
                                    <TableHead className="text-xs">Source</TableHead>
                                    <TableHead className="text-xs text-right">Amount</TableHead>
                                    <TableHead className="text-xs text-right">Shares</TableHead>
                                    <TableHead className="text-xs text-right">Gap to Target</TableHead>
                                    <TableHead className="text-xs text-right">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {cashDeploymentData.allCandidates.map((candidate) => (
                                    <TableRow key={candidate.holdingId} data-testid={`row-candidate-${candidate.holdingId}`}>
                                      <TableCell className="py-2">
                                        <span className="font-mono text-xs font-medium">{candidate.ticker}</span>
                                      </TableCell>
                                      <TableCell className="py-2">
                                        <Badge variant="outline" className="text-xs">
                                          {candidate.source === 'below_book' ? 'Below Book' : 'Manual'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="py-2 text-right text-xs font-semibold text-orange-600 dark:text-orange-400">
                                        CA${candidate.allocatedCash.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                                      </TableCell>
                                      <TableCell className="py-2 text-right text-xs font-medium text-green-600 dark:text-green-400">
                                        {candidate.sharesToBuy > 0 ? `+${candidate.sharesToBuy}` : '-'}
                                      </TableCell>
                                      <TableCell className="py-2 text-right text-xs text-muted-foreground">
                                        CA${candidate.gap.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                                      </TableCell>
                                      <TableCell className="py-2 text-right">
                                        <Badge 
                                          variant="outline"
                                          className={`text-xs ${
                                            candidate.status === 'fully_funded' 
                                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                              : candidate.status === 'partially_funded'
                                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                          }`}
                                        >
                                          {candidate.status === 'fully_funded' ? 'Fully Funded' 
                                            : candidate.status === 'partially_funded' ? 'Partial'
                                            : 'Unfunded'}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>

                              {/* Commit to Targets Button */}
                              <div className="flex justify-end pt-3 border-t mt-3">
                                <Button
                                  size="sm"
                                  onClick={handleCommitCandidatesToTargets}
                                  disabled={isCommittingCandidates || cashDeploymentData.allCandidates.length === 0}
                                  className="bg-orange-500 hover:bg-orange-600 text-white"
                                  data-testid="button-commit-candidates"
                                >
                                  {isCommittingCandidates ? (
                                    <>
                                      <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                                      Committing...
                                    </>
                                  ) : (
                                    <>
                                      <Target className="h-3 w-3 mr-2" />
                                      Commit to Targets ({cashDeploymentData.allCandidates.length})
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Sell Planner - Only visible in withdrawal mode */}
            {accountData?.withdrawalMode && (
              <Collapsible open={isSellPlannerExpanded} onOpenChange={setIsSellPlannerExpanded} className="mb-6">
                <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity" data-testid="button-toggle-sell-planner">
                          {isSellPlannerExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <TrendingDown className="h-4 w-4 text-red-500" />
                              Sell Planner
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Plan which holdings to sell to meet your withdrawal target
                            </CardDescription>
                          </div>
                        </button>
                      </CollapsibleTrigger>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {/* Warning about updating prices - show if no import or import > 24 hours ago */}
                      {(!lastExcelImportTime || (Date.now() - lastExcelImportTime > 24 * 60 * 60 * 1000)) && (
                        <Alert className="mb-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertTitle className="text-amber-800 dark:text-amber-200 text-sm">Update Prices First</AlertTitle>
                          <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
                            For accurate sell planning, import an updated Excel file to refresh current prices before planning your trades.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Target Withdrawal Amount Input */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium whitespace-nowrap">Target Withdrawal:</label>
                          <div className="relative flex-1 max-w-xs">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">CA$</span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="pl-12"
                              value={targetWithdrawalAmount}
                              onChange={(e) => setTargetWithdrawalAmount(e.target.value)}
                              data-testid="input-target-withdrawal"
                            />
                          </div>
                        </div>

                        {/* Existing Cash Option - only show if there's cash in the account */}
                        {sellPlanData.existingCash > 0 && (
                          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <label className="text-sm font-medium text-green-800 dark:text-green-200 whitespace-nowrap">
                                Use existing CASH:
                              </label>
                              <div className="relative flex-1 max-w-[180px]">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">CA$</span>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  className="pl-12 h-8 text-sm"
                                  value={cashToWithdraw}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    const maxCash = sellPlanData.existingCash;
                                    if (value > maxCash) {
                                      setCashToWithdraw(maxCash.toString());
                                    } else {
                                      setCashToWithdraw(e.target.value);
                                    }
                                  }}
                                  data-testid="input-cash-to-withdraw"
                                />
                              </div>
                              <span className="text-xs text-green-600 dark:text-green-400">
                                of CA${sellPlanData.existingCash.toLocaleString('en-CA', { minimumFractionDigits: 2 })} available
                              </span>
                              {sellPlanData.cashIncluded > 0 && (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  Applied
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                              Specify how much cash to use toward your withdrawal target before selling holdings
                            </p>
                          </div>
                        )}

                        {/* Progress Summary */}
                        {sellPlanData.targetAmount > 0 && (
                          <div className="bg-muted/50 rounded-md p-3 border border-border/50">
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div>
                                <span className="text-muted-foreground block mb-1">Target</span>
                                <span className="font-semibold text-base">CA${sellPlanData.targetAmount.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block mb-1">
                                  {sellPlanData.cashIncluded > 0 ? 'Total Applied' : 'Selected'}
                                </span>
                                <span className="font-semibold text-base text-red-600 dark:text-red-400">
                                  CA${sellPlanData.totalSelected.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                                </span>
                                {sellPlanData.cashIncluded > 0 && (
                                  <div className="text-[10px] mt-1 space-y-0.5">
                                    <div className="text-green-600 dark:text-green-400">
                                      Cash: CA${sellPlanData.cashIncluded.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-red-500 dark:text-red-400">
                                      Sales: CA${(sellPlanData.totalSelected - sellPlanData.cashIncluded).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="text-muted-foreground block mb-1">Remaining</span>
                                <span className={cn(
                                  "font-semibold text-base",
                                  sellPlanData.remaining > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"
                                )}>
                                  CA${sellPlanData.remaining.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                            
                            {/* Progress bar - show cash vs sales portions */}
                            <div className="h-2 bg-muted rounded-full overflow-hidden mt-3 flex">
                              {sellPlanData.cashIncluded > 0 && (
                                <div 
                                  className="h-full bg-green-500 transition-all"
                                  style={{ width: `${Math.min(100, (sellPlanData.cashIncluded / sellPlanData.targetAmount) * 100)}%` }}
                                />
                              )}
                              <div 
                                className={cn(
                                  "h-full transition-all",
                                  sellPlanData.totalSelected >= sellPlanData.targetAmount 
                                    ? "bg-green-500" 
                                    : "bg-red-500"
                                )}
                                style={{ width: `${Math.min(100 - (sellPlanData.cashIncluded / sellPlanData.targetAmount) * 100, ((sellPlanData.totalSelected - sellPlanData.cashIncluded) / sellPlanData.targetAmount) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Holdings to Sell */}
                        {sellPlanData.candidates.length > 0 ? (
                          <div className="space-y-2 pt-2 border-t">
                            <h4 className="text-sm font-medium">Select Holdings to Sell</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs w-28">Ticker</TableHead>
                                  <TableHead className="text-xs text-right">Qty</TableHead>
                                  <TableHead className="text-xs text-right">Price</TableHead>
                                  <TableHead className="text-xs text-right">Book</TableHead>
                                  <TableHead className="text-xs text-center w-24">Gain/Loss</TableHead>
                                  <TableHead className="text-xs text-right">Value</TableHead>
                                  <TableHead className="text-xs text-right w-32">Sell Amount</TableHead>
                                  <TableHead className="text-xs text-right">Shares</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sellPlanData.candidates.map((candidate) => (
                                  <TableRow 
                                    key={candidate.positionId} 
                                    className={cn(candidate.isSelected && "bg-red-50 dark:bg-red-950/20")}
                                    data-testid={`row-sell-candidate-${candidate.positionId}`}
                                  >
                                    <TableCell className="py-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-xs font-medium">{candidate.ticker}</span>
                                        {candidate.isAboveBook && (
                                          <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-2 text-right text-xs">
                                      {candidate.quantityHeld.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="py-2 text-right text-xs">
                                      ${candidate.currentPrice.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="py-2 text-right text-xs text-muted-foreground">
                                      ${candidate.entryPrice.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="py-2 text-center">
                                      <Badge 
                                        className={cn(
                                          "text-[10px] px-1.5 py-0",
                                          candidate.isAboveBook 
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        )}
                                      >
                                        {candidate.isAboveBook ? '+' : ''}{candidate.gainLossPercent.toFixed(1)}%
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="py-2 text-right text-xs font-medium">
                                      ${candidate.totalValue.toLocaleString('en-CA', { minimumFractionDigits: 0 })}
                                    </TableCell>
                                    <TableCell className="py-2 text-right">
                                      <div className="relative w-28 ml-auto">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                        <Input
                                          type="number"
                                          placeholder="0"
                                          className="h-7 text-xs pl-5 pr-2"
                                          value={sellCandidates.find(sc => sc.positionId === candidate.positionId)?.sellAmount || ""}
                                          onChange={(e) => {
                                            const value = parseFloat(e.target.value) || 0;
                                            const maxValue = candidate.totalValue;
                                            const clampedValue = Math.min(value, maxValue);
                                            
                                            setSellCandidates(prev => {
                                              const existing = prev.find(sc => sc.positionId === candidate.positionId);
                                              if (clampedValue <= 0) {
                                                return prev.filter(sc => sc.positionId !== candidate.positionId);
                                              }
                                              if (existing) {
                                                return prev.map(sc => 
                                                  sc.positionId === candidate.positionId 
                                                    ? { ...sc, sellAmount: clampedValue }
                                                    : sc
                                                );
                                              }
                                              return [...prev, { positionId: candidate.positionId, sellAmount: clampedValue }];
                                            });
                                          }}
                                          data-testid={`input-sell-amount-${candidate.positionId}`}
                                        />
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-2 text-right text-xs font-medium text-red-600 dark:text-red-400">
                                      {candidate.sharesToSell > 0 ? `-${candidate.sharesToSell}` : '-'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>

                            {/* Summary */}
                            {sellPlanData.totalSelected > 0 && (
                              <div className="flex justify-between items-center pt-3 border-t mt-3">
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Total to sell: </span>
                                  <span className="font-semibold text-red-600 dark:text-red-400">
                                    CA${sellPlanData.totalSelected.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                                  </span>
                                  {sellPlanData.totalSelected >= sellPlanData.targetAmount && (
                                    <Badge className="ml-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                      Target Met
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSellCandidates([])}
                                  data-testid="button-clear-sell-selections"
                                >
                                  <X className="h-3 w-3 mr-2" />
                                  Clear All
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center py-4 text-sm">
                            No holdings available to sell. Add positions to this account first.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {targetAllocations.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No target allocations defined. Add allocations manually or copy from a model portfolio.
              </p>
            ) : (
              <>
                {/* Risk Level Totals Summary */}
                {(() => {
                  const riskTotals = computeRiskTotals();
                  const grandTotal = riskTotals.reduce((sum, r) => sum + r.total, 0);
                  
                  return (
                    <div className="mb-4 p-3 rounded-lg border bg-muted/30" data-testid="risk-totals-summary">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Risk Breakdown
                        </span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          Total: {grandTotal.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        {riskTotals.map((risk) => (
                          <div key={risk.key} className="flex flex-col">
                            <span className="text-muted-foreground">{risk.label}</span>
                            <span className="font-medium">
                              {risk.total.toFixed(1)}%
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
                    {[...targetAllocations]
                      .sort((a, b) => (a.holding?.ticker || "").localeCompare(b.holding?.ticker || ""))
                      .map((allocation) => (
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
                  {(() => {
                    const total = targetAllocations.reduce((sum, a) => sum + Number(a.targetPercentage), 0);
                    const isDeploymentMode = accountData?.deploymentMode ?? false;
                    // In deployment mode, allow totals > 100%; otherwise must equal 100%
                    const isValid = isDeploymentMode ? total > 0 : total === 100;
                    
                    // Determine badge label suffix
                    let badgeSuffix = "";
                    if (total > 100 && isDeploymentMode) {
                      badgeSuffix = " (Deployment)";
                    }
                    
                    return (
                      <Badge 
                        variant={isValid ? "default" : "destructive"}
                        className={
                          isValid 
                            ? isDeploymentMode && total > 100 
                              ? "bg-orange-600 hover:bg-orange-700" 
                              : "bg-green-600 hover:bg-green-700"
                            : ""
                        }
                        data-testid="badge-total-allocation"
                      >
                        Total: {total.toFixed(2)}%{badgeSuffix}
                      </Badge>
                    );
                  })()}
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Drag and Drop Zone */}
      <div className="space-y-3">
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
        <div className="space-y-3 px-4 py-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="set-target-allocation"
              checked={setAsTargetAllocation}
              onChange={(e) => setSetAsTargetAllocation(e.target.checked)}
              className="h-4 w-4"
              data-testid="checkbox-set-target-allocation"
            />
            <label htmlFor="set-target-allocation" className="text-sm cursor-pointer flex-1">
              <span className="font-medium">Set imported holdings as target allocation</span>
              <span className="text-muted-foreground block text-xs mt-1">
                Automatically create target allocations based on current portfolio percentages
              </span>
            </label>
          </div>
        </div>
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
        if (!open) {
          setCashAmount("");
          setMaintainDollarAmounts(false);
        }
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
            {targetAllocations.length > 0 && (
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="maintain-amounts" 
                  checked={maintainDollarAmounts}
                  onChange={(e) => setMaintainDollarAmounts(e.target.checked)}
                  data-testid="checkbox-maintain-amounts"
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="maintain-amounts" className="text-sm font-medium leading-none cursor-pointer">
                  Maintain dollar amounts (adjust target % proportionally)
                </label>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCashDialogOpen(false);
                  setCashAmount("");
                  setMaintainDollarAmounts(false);
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

      {/* Change History Section - At bottom of page, collapsible, default closed */}
      <Collapsible open={isAuditLogExpanded} onOpenChange={setIsAuditLogExpanded}>
        <Card className="border-dashed glow-border">
          <CardHeader className="py-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity w-full" data-testid="button-toggle-audit-log">
                {isAuditLogExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Change History</span>
                  {auditLog.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {auditLog.length}
                    </Badge>
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {isAuditLogLoading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">Loading change history...</div>
              ) : auditLog.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No changes recorded yet. Changes to account settings will appear here.
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLog.map((entry) => {
                    const actionLabels: Record<string, string> = {
                      create: "Created",
                      update: "Updated Account",
                      delete: "Deleted",
                      account_setup: "Account Setup",
                      position_add: "Added Position",
                      position_update: "Updated Position",
                      position_delete: "Deleted Position",
                      position_bulk_upload: "Bulk Uploaded Positions",
                      target_add: "Added Target Allocation",
                      target_update: "Updated Target Allocation",
                      target_delete: "Removed Target Allocation",
                      task_add: "Added Task",
                      task_complete: "Completed Task",
                      task_delete: "Deleted Task",
                      prices_refresh: "Refreshed Prices",
                      copy_from_model: "Copied from Model Portfolio",
                    };
                    
                    const actionColors: Record<string, string> = {
                      account_setup: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
                      position_add: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                      position_delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                      target_add: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
                      target_delete: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
                      task_complete: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                      task_delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                      prices_refresh: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
                      copy_from_model: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
                    };
                    
                    return (
                    <div key={entry.id} className="border rounded-md p-3 bg-muted/30" data-testid={`audit-entry-${entry.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className={`text-xs ${actionColors[entry.action] || ""}`}>
                          {actionLabels[entry.action] || entry.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        {Object.entries(entry.changes).map(([field, change]) => {
                          const formatValue = (val: any) => {
                            if (val === null || val === undefined || val === "") return "—";
                            if (typeof val === "number") return val.toLocaleString();
                            if (typeof val === "boolean") return val ? "Yes" : "No";
                            return String(val);
                          };
                          const fieldLabels: Record<string, string> = {
                            nickname: "Nickname",
                            accountType: "Account Type",
                            balance: "Balance",
                            bookValue: "Book Value",
                            riskMedium: "Medium Risk %",
                            riskMediumHigh: "Med-High Risk %",
                            riskHigh: "High Risk %",
                            riskMediumPct: "Medium Risk %",
                            riskMediumHighPct: "Med-High Risk %",
                            riskHighPct: "High Risk %",
                            immediateNotes: "Immediate Changes",
                            upcomingNotes: "Upcoming Notes",
                            protectionPercent: "Protection %",
                            stopPrice: "Stop Price",
                            limitPrice: "Limit Price",
                            symbol: "Symbol",
                            ticker: "Ticker",
                            quantity: "Quantity",
                            entryPrice: "Entry Price",
                            currentPrice: "Current Price",
                            targetPercentage: "Target %",
                            title: "Task",
                            description: "Description",
                            priority: "Priority",
                            dueDate: "Due Date",
                            count: "Count",
                            symbols: "Symbols",
                            positionsUpdated: "Positions Updated",
                            portfolioName: "Portfolio",
                            allocationsCount: "Allocations",
                            autoAddedToUniversal: "Auto-added to Holdings",
                          };
                          
                          // Handle simple values vs old/new pairs
                          if (change && typeof change === "object" && "old" in change && "new" in change) {
                            return (
                              <div key={field} className="flex items-start gap-2 text-xs">
                                <span className="font-medium min-w-[100px]">{fieldLabels[field] || field}:</span>
                                <span className="text-muted-foreground line-through">{formatValue(change.old)}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-foreground">{formatValue(change.new)}</span>
                              </div>
                            );
                          } else {
                            return (
                              <div key={field} className="flex items-start gap-2 text-xs">
                                <span className="font-medium min-w-[100px]">{fieldLabels[field] || field}:</span>
                                <span className="text-foreground">{formatValue(change)}</span>
                              </div>
                            );
                          }
                        })}
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
