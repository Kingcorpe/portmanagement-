import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, TrendingDown, Calendar, DollarSign, AlertTriangle, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { DcpPlan, Position } from "@shared/schema";

interface DcpSummaryCardProps {
  accountType: "individual" | "corporate" | "joint";
  accountId: string;
  positions: Position[];
  isAuthenticated: boolean;
}

export function DcpSummaryCard({ accountType, accountId, positions, isAuthenticated }: DcpSummaryCardProps) {
  // Fetch DCP plans for this account
  const dcpEndpoint = `/api/${accountType}-accounts/${accountId}/dcp-plans`;
  
  const { data: dcpPlans = [] } = useQuery<DcpPlan[]>({
    queryKey: [dcpEndpoint],
    enabled: isAuthenticated && !!accountId,
  });

  // Calculate protection stats from positions
  const protectedPositions = positions.filter(p => 
    p.protectionPercent && Number(p.protectionPercent) > 0
  );
  
  const positionsWithStops = positions.filter(p => 
    p.stopPrice && Number(p.stopPrice) > 0
  );

  // Calculate total protected value
  const totalProtectedValue = protectedPositions.reduce((sum, p) => {
    const quantity = Number(p.quantity) || 0;
    const currentPrice = Number(p.currentPrice) || 0;
    const protectionPct = Number(p.protectionPercent) || 0;
    return sum + (quantity * currentPrice * protectionPct / 100);
  }, 0);

  // Calculate protected gains (positions above entry with protection)
  const totalProtectedGains = protectedPositions.reduce((sum, p) => {
    const quantity = Number(p.quantity) || 0;
    const currentPrice = Number(p.currentPrice) || 0;
    const entryPrice = Number(p.entryPrice) || 0;
    const protectionPct = Number(p.protectionPercent) || 0;
    const protectedShares = quantity * protectionPct / 100;
    const gain = (currentPrice - entryPrice) * protectedShares;
    return sum + (gain > 0 ? gain : 0);
  }, 0);

  // Find positions with protection but no DCP plan
  const positionsNeedingDcp = protectedPositions.filter(p => {
    return !dcpPlans.some(plan => 
      plan.positionId === p.id || plan.symbol === p.symbol
    );
  });

  // Active DCP plans
  const activeDcpPlans = dcpPlans.filter(p => p.status === 'active');
  
  // Upcoming executions (next 7 days)
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingExecutions = activeDcpPlans.filter(p => {
    if (!p.nextExecutionDate) return false;
    const execDate = new Date(p.nextExecutionDate);
    return execDate >= now && execDate <= weekFromNow;
  });

  // Total profit from DCP executions
  const totalDcpProfit = dcpPlans.reduce((sum, p) => {
    return sum + (Number(p.totalProfit) || 0);
  }, 0);

  // Don't render if no protection or DCP data
  if (protectedPositions.length === 0 && dcpPlans.length === 0) {
    return null;
  }

  return (
    <Card className="glow-border bg-gradient-to-br from-amber-500/5 via-background to-orange-500/5 border-amber-500/20">
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            <span className="font-semibold">Protection & DCP Status</span>
          </div>
          {positionsNeedingDcp.length > 0 && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {positionsNeedingDcp.length} can be automated
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Protected Positions */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Protected Positions
            </div>
            <div className="text-xl font-bold">
              {protectedPositions.length}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / {positions.filter(p => p.symbol !== 'CASH').length}
              </span>
            </div>
            {positionsWithStops.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {positionsWithStops.length} with stop prices
              </div>
            )}
          </div>

          {/* Active DCP Plans */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              Active DCP Plans
            </div>
            <div className="text-xl font-bold">{activeDcpPlans.length}</div>
            {upcomingExecutions.length > 0 && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                <Calendar className="h-3 w-3 inline mr-1" />
                {upcomingExecutions.length} due this week
              </div>
            )}
          </div>

          {/* Protected Value */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Protected Value
            </div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
              ${totalProtectedValue.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
            </div>
            {totalProtectedGains > 0 && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400">
                ${totalProtectedGains.toLocaleString('en-CA', { maximumFractionDigits: 0 })} in gains
              </div>
            )}
          </div>

          {/* DCP Profit */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4" />
              DCP Profit Taken
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              ${totalDcpProfit.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-muted-foreground">
              {dcpPlans.reduce((sum, p) => sum + (p.executionCount || 0), 0)} executions
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

