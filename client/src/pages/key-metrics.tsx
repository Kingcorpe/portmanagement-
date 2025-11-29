import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  DollarSign, 
  Users, 
  Briefcase, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  ListTodo,
  PieChart,
  Building2,
  UserCircle,
  Wallet,
  Target
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface HouseholdWithDetails {
  id: string;
  name: string;
  category: string | null;
  individuals: Array<{
    id: string;
    name: string;
    accounts: Array<{
      id: string;
      type: string;
      calculatedBalance: string;
      performance: string;
    }>;
  }>;
  corporations: Array<{
    id: string;
    name: string;
    accounts: Array<{
      id: string;
      type: string;
      calculatedBalance: string;
      performance: string;
    }>;
  }>;
  jointAccounts: Array<{
    id: string;
    type: string;
    calculatedBalance: string;
    performance: string;
  }>;
}

interface Task {
  id: string;
  status: string;
  priority: string;
}

interface Alert {
  id: string;
  status: string;
  signal: string;
}

export default function KeyMetrics() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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

  const { data: householdsData = [], isLoading: householdsLoading } = useQuery<HouseholdWithDetails[]>({
    queryKey: ["/api/households/full"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    enabled: isAuthenticated,
  });

  const totalHouseholds = householdsData.length;
  
  let totalAUM = 0;
  let totalIndividualAccounts = 0;
  let totalCorporateAccounts = 0;
  let totalJointAccounts = 0;
  let weightedPerformanceSum = 0;

  const accountTypeBreakdown: Record<string, { count: number; balance: number }> = {};

  householdsData.forEach(household => {
    household.individuals.forEach(individual => {
      individual.accounts.forEach(account => {
        const balance = Number(account.calculatedBalance) || 0;
        const performance = Number(account.performance) || 0;
        
        totalAUM += balance;
        totalIndividualAccounts++;
        weightedPerformanceSum += balance * (performance / 100);
        
        const type = account.type.toUpperCase();
        if (!accountTypeBreakdown[type]) {
          accountTypeBreakdown[type] = { count: 0, balance: 0 };
        }
        accountTypeBreakdown[type].count++;
        accountTypeBreakdown[type].balance += balance;
      });
    });

    household.corporations.forEach(corporation => {
      corporation.accounts.forEach(account => {
        const balance = Number(account.calculatedBalance) || 0;
        const performance = Number(account.performance) || 0;
        
        totalAUM += balance;
        totalCorporateAccounts++;
        weightedPerformanceSum += balance * (performance / 100);
        
        const type = account.type.toUpperCase();
        if (!accountTypeBreakdown[type]) {
          accountTypeBreakdown[type] = { count: 0, balance: 0 };
        }
        accountTypeBreakdown[type].count++;
        accountTypeBreakdown[type].balance += balance;
      });
    });

    household.jointAccounts.forEach(account => {
      const balance = Number(account.calculatedBalance) || 0;
      const performance = Number(account.performance) || 0;
      
      totalAUM += balance;
      totalJointAccounts++;
      weightedPerformanceSum += balance * (performance / 100);
      
      const type = account.type.toUpperCase();
      if (!accountTypeBreakdown[type]) {
        accountTypeBreakdown[type] = { count: 0, balance: 0 };
      }
      accountTypeBreakdown[type].count++;
      accountTypeBreakdown[type].balance += balance;
    });
  });

  const totalAccounts = totalIndividualAccounts + totalCorporateAccounts + totalJointAccounts;
  const averagePerformance = totalAUM > 0 ? (weightedPerformanceSum / totalAUM) * 100 : 0;

  const pendingTasks = tasks.filter(t => t.status === "pending").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const urgentTasks = tasks.filter(t => t.priority === "urgent").length;
  const highPriorityTasks = tasks.filter(t => t.priority === "high").length;

  const pendingAlerts = alerts.filter(a => a.status === "pending").length;
  const executedAlerts = alerts.filter(a => a.status === "executed").length;
  const buyAlerts = alerts.filter(a => a.signal === "BUY").length;
  const sellAlerts = alerts.filter(a => a.signal === "SELL").length;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `CA$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `CA$${(value / 1000).toFixed(1)}K`;
    }
    return `CA$${value.toFixed(2)}`;
  };

  const sortedAccountTypes = Object.entries(accountTypeBreakdown)
    .sort((a, b) => b[1].balance - a[1].balance);

  if (authLoading || householdsLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-state">
        <div className="text-center">
          <div className="text-lg">Loading metrics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 cyber-grid min-h-full" data-testid="key-metrics-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text" data-testid="text-page-title">Key Metrics</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-chart-2 status-pulse" />
            Portfolio management overview and statistics
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span className="w-2 h-2 rounded-full bg-chart-2 animate-pulse" />
          SYSTEM ONLINE
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total AUM"
          value={formatCurrency(totalAUM)}
          icon={DollarSign}
          testId="metric-total-aum"
          variant="primary"
        />
        <MetricCard
          title="Households"
          value={totalHouseholds.toString()}
          icon={Users}
          testId="metric-households"
          href="/households"
          variant="success"
        />
        <MetricCard
          title="Total Accounts"
          value={totalAccounts.toString()}
          icon={Briefcase}
          testId="metric-accounts"
          variant="warning"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card data-testid="card-account-breakdown" className="glow-border corner-accents">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <PieChart className="h-4 w-4 text-primary" />
              </div>
              <span className="uppercase tracking-wider text-sm">Account Breakdown</span>
            </CardTitle>
            <CardDescription>Distribution by account type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center pb-4 border-b">
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
                  <UserCircle className="h-4 w-4" />
                  Individual
                </div>
                <div className="text-2xl font-bold" data-testid="text-individual-count">{totalIndividualAccounts}</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
                  <Building2 className="h-4 w-4" />
                  Corporate
                </div>
                <div className="text-2xl font-bold" data-testid="text-corporate-count">{totalCorporateAccounts}</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
                  <Users className="h-4 w-4" />
                  Joint
                </div>
                <div className="text-2xl font-bold" data-testid="text-joint-count">{totalJointAccounts}</div>
              </div>
            </div>
            
            <div className="space-y-3">
              {sortedAccountTypes.slice(0, 6).map(([type, data]) => (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{type}</span>
                    <span className="text-muted-foreground">
                      {data.count} ({formatCurrency(data.balance)})
                    </span>
                  </div>
                  <Progress 
                    value={totalAUM > 0 ? (data.balance / totalAUM) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              ))}
              {sortedAccountTypes.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No accounts found
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Link href="/tasks">
          <Card data-testid="card-tasks-overview" className="glow-border corner-accents hover-elevate cursor-pointer transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <ListTodo className="h-4 w-4 text-amber-500" />
                </div>
                <span className="uppercase tracking-wider text-sm">Tasks Overview</span>
              </CardTitle>
              <CardDescription>Current task status</CardDescription>
            </CardHeader>
          <CardContent className="space-y-4">
            {tasksLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading tasks...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-3xl font-bold text-amber-500" data-testid="text-pending-tasks">
                      {pendingTasks}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-3xl font-bold text-blue-500" data-testid="text-inprogress-tasks">
                      {inProgressTasks}
                    </div>
                    <div className="text-sm text-muted-foreground">In Progress</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Urgent Tasks</span>
                    <Badge variant={urgentTasks > 0 ? "destructive" : "secondary"} data-testid="badge-urgent-tasks">
                      {urgentTasks}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High Priority</span>
                    <Badge variant={highPriorityTasks > 0 ? "default" : "secondary"} data-testid="badge-high-priority-tasks">
                      {highPriorityTasks}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Active</span>
                    <Badge variant="outline" data-testid="badge-total-tasks">
                      {pendingTasks + inProgressTasks}
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </CardContent>
          </Card>
        </Link>

        <Card data-testid="card-alerts-overview" className="glow-border corner-accents">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
              <span className="uppercase tracking-wider text-sm">Trading Alerts</span>
            </CardTitle>
            <CardDescription>TradingView webhook signals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alertsLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading alerts...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-3xl font-bold text-orange-500" data-testid="text-pending-alerts">
                      {pendingAlerts}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-3xl font-bold text-chart-2" data-testid="text-executed-alerts">
                      {executedAlerts}
                    </div>
                    <div className="text-sm text-muted-foreground">Executed</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-chart-2" />
                      BUY Signals
                    </span>
                    <Badge className="bg-chart-2/20 text-chart-2 border-chart-2/30" data-testid="badge-buy-alerts">
                      {buyAlerts}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-destructive" />
                      SELL Signals
                    </span>
                    <Badge className="bg-destructive/20 text-destructive border-destructive/30" data-testid="badge-sell-alerts">
                      {sellAlerts}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Alerts</span>
                    <Badge variant="outline" data-testid="badge-total-alerts">
                      {alerts.length}
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-aum-distribution" className="glow-border corner-accents holo-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <Wallet className="h-4 w-4 text-purple-500" />
              </div>
              <span className="uppercase tracking-wider text-sm">AUM Distribution</span>
            </CardTitle>
            <CardDescription>Assets by account category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Individual Accounts", count: totalIndividualAccounts, color: "bg-blue-500" },
                { label: "Corporate Accounts", count: totalCorporateAccounts, color: "bg-purple-500" },
                { label: "Joint Accounts", count: totalJointAccounts, color: "bg-teal-500" },
              ].map(category => {
                const categoryBalance = householdsData.reduce((sum, h) => {
                  if (category.label === "Individual Accounts") {
                    return sum + h.individuals.reduce((iSum, ind) => 
                      iSum + ind.accounts.reduce((aSum, acc) => aSum + (Number(acc.calculatedBalance) || 0), 0), 0);
                  } else if (category.label === "Corporate Accounts") {
                    return sum + h.corporations.reduce((cSum, corp) => 
                      cSum + corp.accounts.reduce((aSum, acc) => aSum + (Number(acc.calculatedBalance) || 0), 0), 0);
                  } else {
                    return sum + h.jointAccounts.reduce((jSum, acc) => jSum + (Number(acc.calculatedBalance) || 0), 0);
                  }
                }, 0);
                const percentage = totalAUM > 0 ? (categoryBalance / totalAUM) * 100 : 0;

                return (
                  <div key={category.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${category.color}`} />
                        <span className="font-medium">{category.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono">{formatCurrency(categoryBalance)}</span>
                        <span className="text-muted-foreground text-sm ml-2">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${category.color} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-quick-stats" className="glow-border corner-accents holo-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-chart-2/10">
                <CheckCircle2 className="h-4 w-4 text-chart-2" />
              </div>
              <span className="uppercase tracking-wider text-sm">Quick Stats</span>
            </CardTitle>
            <CardDescription>At-a-glance portfolio health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-muted/30 shimmer">
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Avg. Account Size</div>
                <div className="text-xl font-bold font-mono neon-glow" data-testid="text-avg-account-size">
                  {totalAccounts > 0 ? formatCurrency(totalAUM / totalAccounts) : "CA$0"}
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Avg. Accounts/Household</div>
                <div className="text-xl font-bold neon-glow" data-testid="text-avg-accounts-per-household">
                  {totalHouseholds > 0 ? (totalAccounts / totalHouseholds).toFixed(1) : "0"}
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Account Types</div>
                <div className="text-xl font-bold neon-glow" data-testid="text-account-types">
                  {Object.keys(accountTypeBreakdown).length}
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30 shimmer">
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Avg. Household Value</div>
                <div className="text-xl font-bold font-mono neon-glow" data-testid="text-avg-household-value">
                  {totalHouseholds > 0 ? formatCurrency(totalAUM / totalHouseholds) : "CA$0"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
