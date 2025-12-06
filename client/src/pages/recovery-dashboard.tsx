import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TrendingDown, AlertTriangle, AlertOctagon, Minus, ExternalLink, RefreshCw, DollarSign, BarChart3 } from "lucide-react";
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

interface RecoveryPosition {
  positionId: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  lossPercent: number;
  lossAmount: number;
  marketValue: number;
  costBasis: number;
  accountId: string;
  accountType: 'individual' | 'corporate' | 'joint';
  accountLabel: string;
  accountNickname: string | null;
  ownerName: string;
  householdName: string;
  householdCategory: string | null;
  priceUpdatedAt: string | null;
  severity: 'minor' | 'moderate' | 'severe';
}

const SEVERITY_CONFIG = {
  minor: { 
    label: 'Minor', 
    icon: Minus,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    borderColor: 'border-amber-500',
    description: 'Less than 10% down'
  },
  moderate: { 
    label: 'Moderate', 
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    borderColor: 'border-orange-500',
    description: '10-20% down'
  },
  severe: { 
    label: 'Severe', 
    icon: AlertOctagon,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    borderColor: 'border-red-500',
    description: 'More than 20% down'
  },
};

export default function RecoveryDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterHousehold, setFilterHousehold] = useState<string>("all");

  const { data: positions = [], isLoading, refetch, isRefetching } = useQuery<RecoveryPosition[]>({
    queryKey: ['/api/recovery-positions'],
  });

  // Get unique households for filter
  const households = [...new Set(positions.map(p => p.householdName))];

  // Apply filters
  const filteredPositions = positions.filter(p => {
    if (filterSeverity !== "all" && p.severity !== filterSeverity) return false;
    if (filterHousehold !== "all" && p.householdName !== filterHousehold) return false;
    return true;
  });

  // Calculate summary stats
  const totalLoss = filteredPositions.reduce((sum, p) => sum + p.lossAmount, 0);
  const severeCount = filteredPositions.filter(p => p.severity === 'severe').length;
  const moderateCount = filteredPositions.filter(p => p.severity === 'moderate').length;
  const minorCount = filteredPositions.filter(p => p.severity === 'minor').length;
  const totalMarketValue = filteredPositions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalCostBasis = filteredPositions.reduce((sum, p) => sum + p.costBasis, 0);
  const avgLossPercent = filteredPositions.length > 0 
    ? filteredPositions.reduce((sum, p) => sum + p.lossPercent, 0) / filteredPositions.length 
    : 0;

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Refreshed",
      description: "Recovery positions updated",
    });
  };

  const navigateToAccount = (position: RecoveryPosition) => {
    const accountPath = position.accountType === 'individual' 
      ? `/account/individual/${position.accountId}`
      : position.accountType === 'corporate'
      ? `/account/corporate/${position.accountId}`
      : `/account/joint/${position.accountId}`;
    setLocation(accountPath);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
            <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Recovery Dashboard</h1>
            <p className="text-muted-foreground">Positions below cost basis that need attention</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            Total Unrealized Loss
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            -${totalLoss.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Avg: {avgLossPercent.toFixed(1)}%
          </div>
        </Card>
        
        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <AlertOctagon className="h-4 w-4" />
            Severe (&gt;20% down)
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {severeCount}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            positions
          </div>
        </Card>
        
        <Card className="p-4 border-l-4 border-l-orange-500">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <AlertTriangle className="h-4 w-4" />
            Moderate (10-20%)
          </div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {moderateCount}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            positions
          </div>
        </Card>
        
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <BarChart3 className="h-4 w-4" />
            Minor (&lt;10%)
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {minorCount}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            positions
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="severe">Severe (&gt;20%)</SelectItem>
            <SelectItem value="moderate">Moderate (10-20%)</SelectItem>
            <SelectItem value="minor">Minor (&lt;10%)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterHousehold} onValueChange={setFilterHousehold}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by household" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Households</SelectItem>
            {households.map(h => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground ml-auto">
          {filteredPositions.length} position{filteredPositions.length !== 1 ? 's' : ''} underwater
        </div>
      </div>

      {/* Positions Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading recovery positions...
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingDown className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
            <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">No Underwater Positions!</h3>
            <p className="text-muted-foreground">All your positions are at or above cost basis.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Owner / Account</TableHead>
                <TableHead className="text-right">Entry</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Loss %</TableHead>
                <TableHead className="text-right">Loss $</TableHead>
                <TableHead className="text-right">Market Value</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPositions.map((position) => {
                const SeverityIcon = SEVERITY_CONFIG[position.severity].icon;
                const config = SEVERITY_CONFIG[position.severity];
                
                return (
                  <TableRow 
                    key={position.positionId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigateToAccount(position)}
                  >
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`${config.bgColor} ${config.color} border-0 gap-1`}
                      >
                        <SeverityIcon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-bold">
                      {position.symbol}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{position.ownerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {position.householdName} • {position.accountNickname || position.accountLabel}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${position.entryPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${position.currentPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-red-600 dark:text-red-400">
                      <span className="flex items-center justify-end gap-1">
                        <TrendingDown className="h-3 w-3" />
                        {position.lossPercent.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-red-600 dark:text-red-400">
                      -${position.lossAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
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

      {/* Cost Basis Summary */}
      {filteredPositions.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Cost Basis (underwater positions)</span>
            <span className="font-mono font-medium">
              ${totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground">Current Market Value</span>
            <span className="font-mono font-medium">
              ${totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t">
            <span className="font-medium">Recovery Needed</span>
            <span className="font-mono font-bold text-red-600 dark:text-red-400">
              +${totalLoss.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({((totalLoss / totalMarketValue) * 100).toFixed(1)}% gain needed)
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}

