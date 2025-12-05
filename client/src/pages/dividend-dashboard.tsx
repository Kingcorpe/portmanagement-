import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  Calendar,
  TrendingUp,
  PieChart,
  Wallet,
  Clock,
  ArrowUpRight,
  Coins,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DividendProjection {
  symbol: string;
  holdingName: string;
  shares: number;
  marketValue: number;
  dividendRate: number;
  dividendYield: number;
  dividendPayout: string;
  exDividendDate: string | null;
  annualDividend: number;
  monthlyDividend: number;
  quarterlyDividend: number;
  accountType: string;
  accountId: string;
}

interface DividendCalendarItem {
  symbol: string;
  name: string;
  exDividendDate: string;
  dividendRate: string;
  dividendYield: string;
  dividendPayout: string;
}

interface AccountSummary {
  accountType: string;
  accountId: string;
  totalAnnualDividend: number;
  totalMarketValue: number;
  positionCount: number;
  effectiveYield: number;
  positions: DividendProjection[];
}

const payoutLabels: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-Annual",
  annual: "Annual",
  none: "None",
};

const payoutColors: Record<string, string> = {
  monthly: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  quarterly: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  semi_annual: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  annual: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  none: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysUntil(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function DividendDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

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

  const {
    data: projections = [],
    isLoading: projectionsLoading,
    refetch: refetchProjections,
  } = useQuery<DividendProjection[]>({
    queryKey: ["/api/dividends/projections"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) return false;
      return failureCount < 3;
    },
  });

  const { data: calendar = [], isLoading: calendarLoading } = useQuery<DividendCalendarItem[]>({
    queryKey: ["/api/dividends/calendar"],
    enabled: isAuthenticated,
  });

  const { data: accountSummary = [], isLoading: summaryLoading } = useQuery<AccountSummary[]>({
    queryKey: ["/api/dividends/by-account"],
    enabled: isAuthenticated,
  });

  // Calculate totals
  const totalAnnualDividend = projections.reduce((sum, p) => sum + (p.annualDividend || 0), 0);
  const totalMarketValue = projections.reduce((sum, p) => sum + (p.marketValue || 0), 0);
  const effectiveYield = totalMarketValue > 0 ? (totalAnnualDividend / totalMarketValue) * 100 : 0;
  const totalMonthlyDividend = totalAnnualDividend / 12;

  // Group by payout frequency
  const byPayout = projections.reduce((acc, p) => {
    const payout = p.dividendPayout || "none";
    if (!acc[payout]) {
      acc[payout] = { count: 0, annual: 0 };
    }
    acc[payout].count++;
    acc[payout].annual += p.annualDividend || 0;
    return acc;
  }, {} as Record<string, { count: number; annual: number }>);

  const isLoading = projectionsLoading || calendarLoading || summaryLoading;

  if (authLoading) {
    return <DividendDashboardSkeleton />;
  }

  return (
    <div className="space-y-6 cyber-grid min-h-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Dividend Dashboard</h1>
          <p className="text-muted-foreground">Track dividend income across all your holdings</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchProjections()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Dividend Income</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {isLoading ? <Skeleton className="h-8 w-32" /> : formatCurrency(totalAnnualDividend)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                `${formatCurrency(totalMonthlyDividend)}/month`
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Yield</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {isLoading ? <Skeleton className="h-8 w-20" /> : formatPercent(effectiveYield)}
            </div>
            <p className="text-xs text-muted-foreground">Weighted average yield</p>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dividend Positions</CardTitle>
            <Coins className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {isLoading ? <Skeleton className="h-8 w-16" /> : projections.length}
            </div>
            <p className="text-xs text-muted-foreground">Holdings paying dividends</p>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Ex-Dates</CardTitle>
            <Calendar className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {isLoading ? <Skeleton className="h-8 w-16" /> : calendar.length}
            </div>
            <p className="text-xs text-muted-foreground">Next 90 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="by-account">By Account</TabsTrigger>
          <TabsTrigger value="by-holding">By Holding</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Payout Frequency Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">By Payout Frequency</CardTitle>
                <CardDescription>Distribution of dividend income by payout schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(byPayout).map(([payout, data]) => {
                  const percentage = totalAnnualDividend > 0 ? (data.annual / totalAnnualDividend) * 100 : 0;
                  return (
                    <div key={payout} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={payoutColors[payout]}>
                            {payoutLabels[payout]}
                          </Badge>
                          <span className="text-muted-foreground">{data.count} positions</span>
                        </div>
                        <span className="font-medium">{formatCurrency(data.annual)}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Monthly Income Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Income Projection</CardTitle>
                <CardDescription>Expected dividend payments by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => {
                    // Simplified projection - in reality would calculate based on payout schedules
                    const monthlyAmount = totalMonthlyDividend;
                    return (
                      <div key={month} className="flex items-center gap-2">
                        <span className="w-8 text-xs text-muted-foreground">{month}</span>
                        <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500/70" 
                            style={{ width: `${Math.min((monthlyAmount / (totalMonthlyDividend * 1.5)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-20 text-right">
                          {formatCurrency(monthlyAmount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Yielding Holdings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Dividend Contributors</CardTitle>
              <CardDescription>Holdings generating the most dividend income</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Yield</TableHead>
                    <TableHead className="text-right">Annual Dividend</TableHead>
                    <TableHead>Frequency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projections
                    .sort((a, b) => (b.annualDividend || 0) - (a.annualDividend || 0))
                    .slice(0, 10)
                    .map((p) => (
                      <TableRow key={`${p.symbol}-${p.accountId}`}>
                        <TableCell className="font-medium">{p.symbol}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{p.holdingName}</TableCell>
                        <TableCell className="text-right">{p.shares.toFixed(0)}</TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                          {formatPercent(p.dividendYield || 0)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(p.annualDividend)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={payoutColors[p.dividendPayout || "none"]}>
                            {payoutLabels[p.dividendPayout || "none"]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Ex-Dividend Dates</CardTitle>
              <CardDescription>Plan your purchases before these dates to qualify for dividends</CardDescription>
            </CardHeader>
            <CardContent>
              {calendar.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No upcoming ex-dividend dates in the next 90 days
                </div>
              ) : (
                <div className="space-y-3">
                  {calendar.map((item) => {
                    const daysUntil = getDaysUntil(item.exDividendDate);
                    const urgency =
                      daysUntil <= 7 ? "text-red-600 dark:text-red-400" :
                      daysUntil <= 14 ? "text-amber-600 dark:text-amber-400" :
                      "text-muted-foreground";

                    return (
                      <div
                        key={item.symbol}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <div className="font-medium">{item.symbol}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {item.name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">{formatDate(item.exDividendDate)}</div>
                            <div className={`text-xs ${urgency}`}>
                              {daysUntil === 0 ? "Today!" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days`}
                            </div>
                          </div>
                          <Badge variant="secondary" className={payoutColors[item.dividendPayout || "none"]}>
                            {payoutLabels[item.dividendPayout || "none"]}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Account Tab */}
        <TabsContent value="by-account" className="space-y-4">
          {accountSummary.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No dividend-paying positions found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {accountSummary.map((account) => (
                <Card key={`${account.accountType}-${account.accountId}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg capitalize">{account.accountType} Account</CardTitle>
                        <CardDescription>
                          {account.positionCount} positions · {formatCurrency(account.totalMarketValue)} market value
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(account.totalAnnualDividend)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatPercent(account.effectiveYield)} yield
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Symbol</TableHead>
                          <TableHead className="text-right">Shares</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead className="text-right">Yield</TableHead>
                          <TableHead className="text-right">Annual</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {account.positions
                          .sort((a, b) => (b.annualDividend || 0) - (a.annualDividend || 0))
                          .map((p) => (
                            <TableRow key={p.symbol}>
                              <TableCell className="font-medium">{p.symbol}</TableCell>
                              <TableCell className="text-right">{p.shares.toFixed(0)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(p.marketValue)}</TableCell>
                              <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                                {formatPercent(p.dividendYield)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(p.annualDividend)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* By Holding Tab */}
        <TabsContent value="by-holding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Dividend Holdings</CardTitle>
              <CardDescription>Complete list of positions generating dividend income</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Market Value</TableHead>
                    <TableHead className="text-right">Div Rate</TableHead>
                    <TableHead className="text-right">Yield</TableHead>
                    <TableHead className="text-right">Annual Div</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Ex-Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projections
                    .sort((a, b) => a.symbol.localeCompare(b.symbol))
                    .map((p, idx) => (
                      <TableRow key={`${p.symbol}-${p.accountId}-${idx}`}>
                        <TableCell className="font-medium">{p.symbol}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{p.holdingName}</TableCell>
                        <TableCell className="capitalize">{p.accountType}</TableCell>
                        <TableCell className="text-right">{p.shares.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.marketValue)}</TableCell>
                        <TableCell className="text-right">${p.dividendRate.toFixed(4)}</TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                          {formatPercent(p.dividendYield)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(p.annualDividend)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={payoutColors[p.dividendPayout || "none"]}>
                            {payoutLabels[p.dividendPayout || "none"]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(p.exDividendDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DividendDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-48 mt-2" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

