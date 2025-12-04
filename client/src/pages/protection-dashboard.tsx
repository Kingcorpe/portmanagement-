import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, CheckCircle, ExternalLink, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
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
import { useState } from "react";

interface ProtectedPosition {
  positionId: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  gainPercent: number;
  marketValue: number;
  protectionPercent: number;
  stopPrice: number | null;
  limitPrice: number | null;
  accountId: string;
  accountType: 'individual' | 'corporate' | 'joint';
  accountLabel: string;
  accountNickname: string | null;
  ownerName: string;
  householdName: string;
  householdCategory: string | null;
  priceUpdatedAt: string | null;
  status: 'safe' | 'approaching' | 'triggered';
}

const STATUS_CONFIG = {
  safe: { 
    label: 'Safe', 
    icon: CheckCircle, 
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
  },
  approaching: { 
    label: 'Approaching Stop', 
    icon: AlertTriangle, 
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
  },
  triggered: { 
    label: 'Stop Triggered', 
    icon: AlertTriangle, 
    className: 'bg-red-500/10 text-red-500 border-red-500/20' 
  },
};

export default function ProtectionDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [householdFilter, setHouseholdFilter] = useState<string>("all");

  const { data: positions = [], isLoading, refetch, isFetching } = useQuery<ProtectedPosition[]>({
    queryKey: ['/api/protected-positions'],
    queryFn: async () => {
      const response = await fetch('/api/protected-positions');
      if (!response.ok) throw new Error('Failed to fetch protected positions');
      return response.json();
    },
  });

  const handleRefreshPrices = async () => {
    try {
      const response = await fetch('/api/admin/refresh-positions', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to refresh prices');
      const result = await response.json();
      toast({
        title: "Prices Refreshed",
        description: result.message,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh prices",
        variant: "destructive",
      });
    }
  };

  const handleRowClick = (position: ProtectedPosition) => {
    setLocation(`/account/${position.accountType}/${position.accountId}`);
  };

  // Get unique households for filter
  const uniqueHouseholds = [...new Set(positions.map(p => p.householdName))].sort();

  // Apply filters
  const filteredPositions = positions.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (householdFilter !== "all" && p.householdName !== householdFilter) return false;
    return true;
  });

  // Summary stats
  const totalValue = filteredPositions.reduce((sum, p) => sum + p.marketValue, 0);
  const triggeredCount = filteredPositions.filter(p => p.status === 'triggered').length;
  const approachingCount = filteredPositions.filter(p => p.status === 'approaching').length;
  const safeCount = filteredPositions.filter(p => p.status === 'safe').length;

  return (
    <div className="space-y-6 cyber-grid min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <Shield className="h-8 w-8" />
            Protection Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor all positions with stop-loss protection across your accounts
          </p>
        </div>
        <Button 
          onClick={handleRefreshPrices} 
          disabled={isFetching}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh Prices
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 glow-border">
          <div className="text-sm text-muted-foreground">Total Protected Value</div>
          <div className="text-2xl font-bold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs text-muted-foreground">{filteredPositions.length} positions</div>
        </Card>
        <Card className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> Safe
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{safeCount}</div>
          <div className="text-xs text-muted-foreground">Above stop price</div>
        </Card>
        <Card className="p-4 border-amber-500/20 bg-amber-500/5">
          <div className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Approaching
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{approachingCount}</div>
          <div className="text-xs text-muted-foreground">Within 5% of stop</div>
        </Card>
        <Card className="p-4 border-red-500/20 bg-red-500/5">
          <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Triggered
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{triggeredCount}</div>
          <div className="text-xs text-muted-foreground">At or below stop</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 glow-border">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="space-y-1">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="triggered">Triggered</SelectItem>
                <SelectItem value="approaching">Approaching</SelectItem>
                <SelectItem value="safe">Safe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Household</label>
            <Select value={householdFilter} onValueChange={setHouseholdFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Households" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Households</SelectItem>
                {uniqueHouseholds.map(h => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(statusFilter !== "all" || householdFilter !== "all") && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setStatusFilter("all"); setHouseholdFilter("all"); }}
              className="mt-5"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Positions Table */}
      <Card className="glow-border corner-accents overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading protected positions...</div>
        ) : filteredPositions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {positions.length === 0 
              ? "No positions with protection set. Protection is automatically suggested when positions gain 15% or more."
              : "No positions match the current filters."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Entry</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Gain %</TableHead>
                <TableHead className="text-right">Protection</TableHead>
                <TableHead className="text-right">Stop Price</TableHead>
                <TableHead className="text-right">Market Value</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPositions.map((position) => {
                const StatusIcon = STATUS_CONFIG[position.status].icon;
                return (
                  <TableRow 
                    key={position.positionId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(position)}
                  >
                    <TableCell>
                      <Badge variant="outline" className={STATUS_CONFIG[position.status].className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {STATUS_CONFIG[position.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-bold">{position.symbol}</TableCell>
                    <TableCell>
                      <div className="text-sm">{position.ownerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {position.accountNickname || position.accountLabel} • {position.householdName}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {position.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${position.entryPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${position.currentPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-medium ${
                      position.gainPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      <span className="flex items-center justify-end gap-1">
                        {position.gainPercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {position.gainPercent >= 0 ? '+' : ''}{position.gainPercent.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {position.protectionPercent}%
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {position.stopPrice ? `$${position.stopPrice.toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      ${position.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

