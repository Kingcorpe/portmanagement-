import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Target,
  DollarSign,
  Percent,
  Calendar,
  Trash2,
  Edit,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  History,
  Wallet,
  Mail,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface HouseholdWithDetails {
  id: string;
  name: string;
  individuals: Array<{
    id: string;
    name: string;
    accounts: Array<{
      id: string;
      type: string;
      nickname?: string;
    }>;
  }>;
  corporations: Array<{
    id: string;
    name: string;
    accounts: Array<{
      id: string;
      type: string;
      nickname?: string;
    }>;
  }>;
  jointAccounts: Array<{
    id: string;
    type: string;
    nickname?: string;
  }>;
}

interface DuePlans {
  dcaPlans: DcaPlan[];
  dcpPlans: DcpPlan[];
  totalDue: number;
}

interface ExecutionHistoryItem {
  id: string;
  executionType: string;
  symbol: string;
  action: string;
  quantity?: string;
  price?: string;
  amount?: string;
  previousAllocationPct?: string;
  newAllocationPct?: string;
  profit?: string;
  notes?: string;
  executedAt: string;
}

interface DcaPlan {
  id: string;
  userId: string;
  individualAccountId?: string;
  corporateAccountId?: string;
  jointAccountId?: string;
  universalHoldingId?: string;
  symbol: string;
  targetAllocationPct: string;
  currentAllocationPct: string;
  incrementPct?: string;
  amountPerPeriod?: string;
  frequency: string;
  dayOfPeriod: number;
  status: string;
  startDate: string;
  nextExecutionDate?: string;
  lastExecutionDate?: string;
  executionCount: number;
  notes?: string;
  createdAt: string;
}

interface DcpPlan {
  id: string;
  userId: string;
  individualAccountId?: string;
  corporateAccountId?: string;
  jointAccountId?: string;
  positionId?: string;
  symbol: string;
  triggerType: string;
  frequency?: string;
  dayOfPeriod?: number;
  sellPercentage?: string;
  sellAmount?: string;
  targetPrice?: string;
  targetGainPct?: string;
  trailingStopPct?: string;
  targetAllocationPct?: string;
  status: string;
  startDate: string;
  nextExecutionDate?: string;
  lastExecutionDate?: string;
  executionCount: number;
  totalProfit: string;
  notes?: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  paused: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

const frequencyLabels: Record<string, string> = {
  weekly: "Weekly",
  bi_weekly: "Bi-Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

const triggerTypeLabels: Record<string, string> = {
  scheduled: "Scheduled",
  price_target: "Price Target",
  percentage_gain: "% Gain Target",
  trailing_stop: "Trailing Stop",
};

function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num || 0);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DcaDcpPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("dca");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<"dca" | "dcp">("dca");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");

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

  // Fetch households for account selection
  const { data: householdsData = [] } = useQuery<HouseholdWithDetails[]>({
    queryKey: ["/api/households/full"],
    enabled: isAuthenticated,
  });

  // Fetch due plans
  const { data: duePlans } = useQuery<DuePlans>({
    queryKey: ["/api/plans/due"],
    enabled: isAuthenticated,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch execution history
  const { data: executionHistory = [] } = useQuery<ExecutionHistoryItem[]>({
    queryKey: ["/api/execution-history"],
    enabled: isAuthenticated,
  });

  const {
    data: dcaPlans = [],
    isLoading: dcaLoading,
    refetch: refetchDca,
  } = useQuery<DcaPlan[]>({
    queryKey: ["/api/dca-plans"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) return false;
      return failureCount < 3;
    },
  });

  const {
    data: dcpPlans = [],
    isLoading: dcpLoading,
    refetch: refetchDcp,
  } = useQuery<DcpPlan[]>({
    queryKey: ["/api/dcp-plans"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) return false;
      return failureCount < 3;
    },
  });

  // DCA mutations
  const executeDcaMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/dca-plans/${id}/execute`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dca-plans"] });
      toast({ title: "Success", description: "DCA execution recorded" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateDcaStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/dca-plans/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dca-plans"] });
      toast({ title: "Success", description: "DCA plan updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteDcaMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/dca-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dca-plans"] });
      toast({ title: "Success", description: "DCA plan deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Generate tasks for due plans
  const generateTasksMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/plans/generate-tasks");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans/due"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ 
        title: "Tasks Created", 
        description: `Created ${data.tasksCreated} task(s) for due plans` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Send summary email
  const sendEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("POST", "/api/plans/send-summary-email", { email });
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Email Sent", 
        description: `Summary sent with ${data.dcaPlansDue + data.dcpPlansDue} due plans and ${data.recentExecutions} recent executions` 
      });
      setEmailDialogOpen(false);
      setEmailAddress("");
    },
    onError: (error: Error) => {
      toast({ title: "Email Failed", description: error.message, variant: "destructive" });
    },
  });

  // DCP mutations
  const executeDcpMutation = useMutation({
    mutationFn: async ({ id, profit }: { id: string; profit?: number }) => {
      return await apiRequest("POST", `/api/dcp-plans/${id}/execute`, { profit });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dcp-plans"] });
      toast({ title: "Success", description: "DCP execution recorded" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateDcpStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/dcp-plans/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dcp-plans"] });
      toast({ title: "Success", description: "DCP plan updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteDcpMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/dcp-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dcp-plans"] });
      toast({ title: "Success", description: "DCP plan deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Calculate stats
  const activeDcaPlans = dcaPlans.filter((p) => p.status === "active");
  const activeDcpPlans = dcpPlans.filter((p) => p.status === "active");
  const totalDcpProfit = dcpPlans.reduce((sum, p) => sum + parseFloat(p.totalProfit || "0"), 0);

  const isLoading = dcaLoading || dcpLoading;

  if (authLoading) {
    return <DcaDcpSkeleton />;
  }

  return (
    <div className="space-y-6 cyber-grid min-h-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">DCA / DCP Plans</h1>
          <p className="text-muted-foreground">
            Manage Dollar Cost Averaging (buy) and Dollar Cost Profit (sell) strategies
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchDca();
              refetchDcp();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryDialogOpen(true)}
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEmailDialogOpen(true)}
          >
            <Mail className="h-4 w-4 mr-2" />
            Email Summary
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setCreateType(activeTab === "dca" ? "dca" : "dcp")}>
                <Plus className="h-4 w-4 mr-2" />
                New Plan
              </Button>
            </DialogTrigger>
            <CreatePlanDialog
              type={createType}
              onClose={() => setCreateDialogOpen(false)}
              onTypeChange={setCreateType}
              households={householdsData}
            />
          </Dialog>
        </div>
      </div>

      {/* Due Plans Alert */}
      {duePlans && duePlans.totalDue > 0 && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            Plans Due for Execution
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            You have {duePlans.totalDue} plan(s) due: {duePlans.dcaPlans.length} DCA, {duePlans.dcpPlans.length} DCP.
            <Button 
              variant="link" 
              size="sm" 
              className="text-amber-800 dark:text-amber-200 p-0 ml-2 h-auto"
              onClick={() => generateTasksMutation.mutate()}
              disabled={generateTasksMutation.isPending}
            >
              {generateTasksMutation.isPending ? "Creating..." : "Create Tasks →"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Execution History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Execution History</DialogTitle>
            <DialogDescription>
              Complete history of all DCA and DCP executions
            </DialogDescription>
          </DialogHeader>
          {executionHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No executions recorded yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Allocation</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executionHistory.map((exec) => (
                  <TableRow key={exec.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(exec.executedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={exec.executionType === 'dca' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }>
                        {exec.executionType.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{exec.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={exec.action === 'BUY' ? 'default' : 'secondary'}>
                        {exec.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {exec.amount ? formatCurrency(exec.amount) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {exec.previousAllocationPct && exec.newAllocationPct
                        ? `${exec.previousAllocationPct}% → ${exec.newAllocationPct}%`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      {exec.profit ? formatCurrency(exec.profit) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Summary Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Summary Email</DialogTitle>
            <DialogDescription>
              Send a summary of due plans and recent executions to your email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>The email will include:</p>
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li>DCA plans due for execution ({duePlans?.dcaPlans.length || 0})</li>
                <li>DCP plans due for execution ({duePlans?.dcpPlans.length || 0})</li>
                <li>Executions from the last 7 days</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => sendEmailMutation.mutate(emailAddress)}
              disabled={!emailAddress || sendEmailMutation.isPending}
            >
              {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glow-border border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active DCA Plans</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDcaPlans.length}</div>
            <p className="text-xs text-muted-foreground">
              {dcaPlans.length} total plans
            </p>
          </CardContent>
        </Card>

        <Card className="glow-border border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active DCP Plans</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDcpPlans.length}</div>
            <p className="text-xs text-muted-foreground">
              {dcpPlans.length} total plans
            </p>
          </CardContent>
        </Card>

        <Card className="glow-border border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dcaPlans.reduce((sum, p) => sum + p.executionCount, 0) +
                dcpPlans.reduce((sum, p) => sum + p.executionCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Combined DCA + DCP</p>
          </CardContent>
        </Card>

        <Card className="glow-border border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total DCP Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalDcpProfit)}
            </div>
            <p className="text-xs text-muted-foreground">Realized profits</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dca" className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            DCA Plans (Buying)
          </TabsTrigger>
          <TabsTrigger value="dcp" className="gap-2">
            <ArrowDownRight className="h-4 w-4" />
            DCP Plans (Selling)
          </TabsTrigger>
        </TabsList>

        {/* DCA Tab */}
        <TabsContent value="dca" className="space-y-4">
          {dcaPlans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No DCA Plans Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create a Dollar Cost Averaging plan to systematically build positions
                </p>
                <Button onClick={() => { setCreateType("dca"); setCreateDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create DCA Plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {dcaPlans.map((plan) => {
                const current = parseFloat(plan.currentAllocationPct || "0");
                const target = parseFloat(plan.targetAllocationPct || "0");
                const progress = target > 0 ? (current / target) * 100 : 0;

                return (
                  <Card key={plan.id} className="hover-elevate">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{plan.symbol}</CardTitle>
                            <CardDescription>
                              {frequencyLabels[plan.frequency]} · Day {plan.dayOfPeriod}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={statusColors[plan.status]}>{plan.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress to Target</span>
                          <span className="font-medium">
                            {current.toFixed(1)}% / {target.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2" />
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Increment</span>
                          <div className="font-medium">
                            {plan.incrementPct ? `${plan.incrementPct}%` : "—"}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Amount/Period</span>
                          <div className="font-medium">
                            {plan.amountPerPeriod ? formatCurrency(plan.amountPerPeriod) : "—"}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Executions</span>
                          <div className="font-medium">{plan.executionCount}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Next Execution</span>
                          <div className="font-medium">{formatDate(plan.nextExecutionDate)}</div>
                        </div>
                      </div>

                      {plan.notes && (
                        <p className="text-sm text-muted-foreground border-t pt-3">{plan.notes}</p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        {plan.status === "active" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => executeDcaMutation.mutate(plan.id)}
                              disabled={executeDcaMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Record Execution
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateDcaStatusMutation.mutate({ id: plan.id, status: "paused" })}
                            >
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </Button>
                          </>
                        )}
                        {plan.status === "paused" && (
                          <Button
                            size="sm"
                            onClick={() => updateDcaStatusMutation.mutate({ id: plan.id, status: "active" })}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete DCA Plan?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the DCA plan for {plan.symbol}. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteDcaMutation.mutate(plan.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* DCP Tab */}
        <TabsContent value="dcp" className="space-y-4">
          {dcpPlans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No DCP Plans Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create a Dollar Cost Profit plan to systematically take profits
                </p>
                <Button onClick={() => { setCreateType("dcp"); setCreateDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create DCP Plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {dcpPlans.map((plan) => (
                <Card key={plan.id} className="hover-elevate">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                          <TrendingDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{plan.symbol}</CardTitle>
                          <CardDescription>
                            {triggerTypeLabels[plan.triggerType]}
                            {plan.frequency && ` · ${frequencyLabels[plan.frequency]}`}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(plan.totalProfit)}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Profit</div>
                        </div>
                        <Badge className={statusColors[plan.status]}>{plan.status}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Trigger</span>
                        <div className="font-medium">
                          {plan.triggerType === "price_target" && plan.targetPrice
                            ? formatCurrency(plan.targetPrice)
                            : plan.triggerType === "percentage_gain" && plan.targetGainPct
                            ? `${plan.targetGainPct}% gain`
                            : plan.triggerType === "trailing_stop" && plan.trailingStopPct
                            ? `${plan.trailingStopPct}% trailing`
                            : plan.triggerType === "scheduled"
                            ? `Day ${plan.dayOfPeriod || 15}`
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sell Amount</span>
                        <div className="font-medium">
                          {plan.sellPercentage
                            ? `${plan.sellPercentage}%`
                            : plan.sellAmount
                            ? formatCurrency(plan.sellAmount)
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Executions</span>
                        <div className="font-medium">{plan.executionCount}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Execution</span>
                        <div className="font-medium">{formatDate(plan.lastExecutionDate)}</div>
                      </div>
                    </div>

                    {plan.notes && (
                      <p className="text-sm text-muted-foreground border-t pt-3">{plan.notes}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      {plan.status === "active" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => executeDcpMutation.mutate({ id: plan.id })}
                            disabled={executeDcpMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Record Execution
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateDcpStatusMutation.mutate({ id: plan.id, status: "paused" })}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        </>
                      )}
                      {plan.status === "paused" && (
                        <Button
                          size="sm"
                          onClick={() => updateDcpStatusMutation.mutate({ id: plan.id, status: "active" })}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete DCP Plan?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the DCP plan for {plan.symbol}. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteDcpMutation.mutate(plan.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreatePlanDialog({
  type,
  onClose,
  onTypeChange,
  households,
}: {
  type: "dca" | "dcp";
  onClose: () => void;
  onTypeChange: (type: "dca" | "dcp") => void;
  households: HouseholdWithDetails[];
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    symbol: "",
    targetAllocationPct: "",
    currentAllocationPct: "0",
    incrementPct: "",
    amountPerPeriod: "",
    frequency: "monthly",
    dayOfPeriod: "15",
    triggerType: "percentage_gain",
    targetPrice: "",
    targetGainPct: "",
    sellPercentage: "",
    notes: "",
    accountKey: "", // Format: "individual:id" or "corporate:id" or "joint:id"
  });

  // Build flattened account list for selector
  const accountOptions: Array<{
    key: string;
    label: string;
    householdName: string;
    accountType: string;
  }> = [];
  
  for (const household of households) {
    // Individual accounts
    for (const individual of household.individuals) {
      for (const account of individual.accounts) {
        accountOptions.push({
          key: `individual:${account.id}`,
          label: `${individual.name} - ${account.type.toUpperCase()}${account.nickname ? ` (${account.nickname})` : ''}`,
          householdName: household.name,
          accountType: 'individual',
        });
      }
    }
    // Corporate accounts
    for (const corp of household.corporations) {
      for (const account of corp.accounts) {
        accountOptions.push({
          key: `corporate:${account.id}`,
          label: `${corp.name} - ${account.type.toUpperCase()}${account.nickname ? ` (${account.nickname})` : ''}`,
          householdName: household.name,
          accountType: 'corporate',
        });
      }
    }
    // Joint accounts
    for (const account of household.jointAccounts) {
      accountOptions.push({
        key: `joint:${account.id}`,
        label: `Joint - ${account.type}${account.nickname ? ` (${account.nickname})` : ''}`,
        householdName: household.name,
        accountType: 'joint',
      });
    }
  }

  const createDcaMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/dca-plans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dca-plans"] });
      toast({ title: "Success", description: "DCA plan created" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createDcpMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/dcp-plans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dcp-plans"] });
      toast({ title: "Success", description: "DCP plan created" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Parse account key into account IDs
  const getAccountIds = () => {
    if (!formData.accountKey || formData.accountKey === 'none') return {};
    const [accountType, accountId] = formData.accountKey.split(':');
    if (accountType === 'individual') return { individualAccountId: accountId };
    if (accountType === 'corporate') return { corporateAccountId: accountId };
    if (accountType === 'joint') return { jointAccountId: accountId };
    return {};
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const accountIds = getAccountIds();

    if (type === "dca") {
      createDcaMutation.mutate({
        symbol: formData.symbol.toUpperCase(),
        targetAllocationPct: parseFloat(formData.targetAllocationPct),
        currentAllocationPct: parseFloat(formData.currentAllocationPct || "0"),
        incrementPct: formData.incrementPct ? parseFloat(formData.incrementPct) : undefined,
        amountPerPeriod: formData.amountPerPeriod ? parseFloat(formData.amountPerPeriod) : undefined,
        frequency: formData.frequency,
        dayOfPeriod: parseInt(formData.dayOfPeriod),
        notes: formData.notes || undefined,
        ...accountIds,
      });
    } else {
      createDcpMutation.mutate({
        symbol: formData.symbol.toUpperCase(),
        triggerType: formData.triggerType,
        frequency: formData.triggerType === "scheduled" ? formData.frequency : undefined,
        dayOfPeriod: formData.triggerType === "scheduled" ? parseInt(formData.dayOfPeriod) : undefined,
        targetPrice: formData.targetPrice ? parseFloat(formData.targetPrice) : undefined,
        targetGainPct: formData.targetGainPct ? parseFloat(formData.targetGainPct) : undefined,
        sellPercentage: formData.sellPercentage ? parseFloat(formData.sellPercentage) : undefined,
        targetAllocationPct: formData.targetAllocationPct ? parseFloat(formData.targetAllocationPct) : undefined,
        notes: formData.notes || undefined,
        ...accountIds,
      });
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Create New {type === "dca" ? "DCA" : "DCP"} Plan</DialogTitle>
        <DialogDescription>
          {type === "dca"
            ? "Set up a Dollar Cost Averaging plan to systematically buy into a position"
            : "Set up a Dollar Cost Profit plan to systematically take profits"}
        </DialogDescription>
      </DialogHeader>

      <Tabs value={type} onValueChange={(v) => onTypeChange(v as "dca" | "dcp")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="dca">DCA (Buy)</TabsTrigger>
          <TabsTrigger value="dcp">DCP (Sell)</TabsTrigger>
        </TabsList>
      </Tabs>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="symbol">Symbol</Label>
          <Input
            id="symbol"
            placeholder="e.g., VDY"
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            required
          />
        </div>

        {/* Account Selection (Optional) */}
        <div>
          <Label htmlFor="account">Account (Optional)</Label>
          <Select
            value={formData.accountKey}
            onValueChange={(v) => setFormData({ ...formData, accountKey: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an account (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific account</SelectItem>
              {accountOptions.map((acc) => (
                <SelectItem key={acc.key} value={acc.key}>
                  <div className="flex flex-col">
                    <span>{acc.label}</span>
                    <span className="text-xs text-muted-foreground">{acc.householdName}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Link to an account for task generation and tracking
          </p>
        </div>

        {type === "dca" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="currentAllocationPct">Current %</Label>
                <Input
                  id="currentAllocationPct"
                  type="number"
                  step="0.5"
                  placeholder="e.g., 12"
                  value={formData.currentAllocationPct}
                  onChange={(e) => setFormData({ ...formData, currentAllocationPct: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="targetAllocationPct">Target %</Label>
                <Input
                  id="targetAllocationPct"
                  type="number"
                  step="0.5"
                  placeholder="e.g., 20"
                  value={formData.targetAllocationPct}
                  onChange={(e) => setFormData({ ...formData, targetAllocationPct: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="incrementPct">Increment %</Label>
                <Input
                  id="incrementPct"
                  type="number"
                  step="0.5"
                  placeholder="e.g., 2"
                  value={formData.incrementPct}
                  onChange={(e) => setFormData({ ...formData, incrementPct: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="amountPerPeriod">Or $ Amount</Label>
                <Input
                  id="amountPerPeriod"
                  type="number"
                  step="100"
                  placeholder="e.g., 1000"
                  value={formData.amountPerPeriod}
                  onChange={(e) => setFormData({ ...formData, amountPerPeriod: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(v) => setFormData({ ...formData, frequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dayOfPeriod">Day</Label>
                <Input
                  id="dayOfPeriod"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dayOfPeriod}
                  onChange={(e) => setFormData({ ...formData, dayOfPeriod: e.target.value })}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="triggerType">Trigger Type</Label>
              <Select
                value={formData.triggerType}
                onValueChange={(v) => setFormData({ ...formData, triggerType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="price_target">Price Target</SelectItem>
                  <SelectItem value="percentage_gain">% Gain Target</SelectItem>
                  <SelectItem value="trailing_stop">Trailing Stop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.triggerType === "scheduled" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(v) => setFormData({ ...formData, frequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dayOfPeriod">Day</Label>
                  <Input
                    id="dayOfPeriod"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dayOfPeriod}
                    onChange={(e) => setFormData({ ...formData, dayOfPeriod: e.target.value })}
                  />
                </div>
              </div>
            )}

            {formData.triggerType === "price_target" && (
              <div>
                <Label htmlFor="targetPrice">Target Price ($)</Label>
                <Input
                  id="targetPrice"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 50.00"
                  value={formData.targetPrice}
                  onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
                />
              </div>
            )}

            {formData.triggerType === "percentage_gain" && (
              <div>
                <Label htmlFor="targetGainPct">Target Gain %</Label>
                <Input
                  id="targetGainPct"
                  type="number"
                  step="1"
                  placeholder="e.g., 25"
                  value={formData.targetGainPct}
                  onChange={(e) => setFormData({ ...formData, targetGainPct: e.target.value })}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sellPercentage">Sell % of Position</Label>
                <Input
                  id="sellPercentage"
                  type="number"
                  step="5"
                  placeholder="e.g., 25"
                  value={formData.sellPercentage}
                  onChange={(e) => setFormData({ ...formData, sellPercentage: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="targetAllocationPct">Or Target % (reduce to)</Label>
                <Input
                  id="targetAllocationPct"
                  type="number"
                  step="1"
                  placeholder="e.g., 10"
                  value={formData.targetAllocationPct}
                  onChange={(e) => setFormData({ ...formData, targetAllocationPct: e.target.value })}
                />
              </div>
            </div>
          </>
        )}

        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes about this plan..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createDcaMutation.isPending || createDcpMutation.isPending}
          >
            {createDcaMutation.isPending || createDcpMutation.isPending ? "Creating..." : "Create Plan"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function DcaDcpSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

