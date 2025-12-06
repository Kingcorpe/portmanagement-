import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, ChevronDown, ChevronRight, Zap, Plus, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { DcpPlan, Position } from "@shared/schema";

interface ProtectionActionsPanelProps {
  accountType: "individual" | "corporate" | "joint";
  accountId: string;
  positions: Position[];
  isAuthenticated: boolean;
}

interface ProtectedPositionRow {
  position: Position;
  dcpPlan: DcpPlan | null;
  gainPercent: number;
  protectedShares: number;
  protectedValue: number;
  status: 'safe' | 'approaching' | 'triggered' | 'no_stop';
}

export function ProtectionActionsPanel({ accountType, accountId, positions, isAuthenticated }: ProtectionActionsPanelProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  // DCP form state
  const [dcpTriggerType, setDcpTriggerType] = useState<string>("percentage_gain");
  const [dcpSellPercentage, setDcpSellPercentage] = useState<string>("");
  const [dcpTargetGainPct, setDcpTargetGainPct] = useState<string>("10");
  const [dcpTrailingStopPct, setDcpTrailingStopPct] = useState<string>("5");
  const [dcpFrequency, setDcpFrequency] = useState<string>("monthly");

  // Fetch DCP plans for this account
  const dcpEndpoint = `/api/${accountType}-accounts/${accountId}/dcp-plans`;
  
  const { data: dcpPlans = [] } = useQuery<DcpPlan[]>({
    queryKey: [dcpEndpoint],
    enabled: isAuthenticated && !!accountId,
  });

  // Create DCP plan mutation
  const createDcpMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/dcp-plans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [dcpEndpoint] });
      toast({
        title: "DCP Plan Created",
        description: `Sell plan for ${selectedPosition?.symbol} has been activated.`,
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create DCP plan",
        variant: "destructive",
      });
    },
  });

  // Get protected positions with their DCP status
  const protectedRows: ProtectedPositionRow[] = positions
    .filter(p => p.symbol !== 'CASH' && (
      (p.protectionPercent && Number(p.protectionPercent) > 0) ||
      (p.stopPrice && Number(p.stopPrice) > 0)
    ))
    .map(position => {
      const dcpPlan = dcpPlans.find(plan => 
        plan.positionId === position.id || plan.symbol === position.symbol
      ) || null;

      const currentPrice = Number(position.currentPrice) || 0;
      const entryPrice = Number(position.entryPrice) || 0;
      const quantity = Number(position.quantity) || 0;
      const protectionPct = Number(position.protectionPercent) || 0;
      const stopPrice = Number(position.stopPrice) || 0;
      
      const gainPercent = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
      const protectedShares = Math.round(quantity * protectionPct / 100);
      const protectedValue = protectedShares * currentPrice;

      // Determine status
      let status: 'safe' | 'approaching' | 'triggered' | 'no_stop' = 'no_stop';
      if (stopPrice > 0) {
        if (currentPrice <= stopPrice) {
          status = 'triggered';
        } else if (currentPrice <= stopPrice * 1.05) {
          status = 'approaching';
        } else {
          status = 'safe';
        }
      }

      return {
        position,
        dcpPlan,
        gainPercent,
        protectedShares,
        protectedValue,
        status,
      };
    })
    .sort((a, b) => {
      // Sort by: triggered first, then approaching, then by gain %
      const statusOrder = { triggered: 0, approaching: 1, safe: 2, no_stop: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return b.gainPercent - a.gainPercent;
    });

  // Don't render if no protected positions
  if (protectedRows.length === 0) {
    return null;
  }

  const handleOpenCreateDialog = (position: Position) => {
    setSelectedPosition(position);
    // Pre-fill with position's protection settings
    const protectionPct = Number(position.protectionPercent) || 50;
    setDcpSellPercentage(protectionPct.toString());
    setIsCreateDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setSelectedPosition(null);
    setDcpTriggerType("percentage_gain");
    setDcpSellPercentage("");
    setDcpTargetGainPct("10");
    setDcpTrailingStopPct("5");
    setDcpFrequency("monthly");
  };

  const handleCreateDcp = () => {
    if (!selectedPosition) return;

    const planData: any = {
      symbol: selectedPosition.symbol,
      positionId: selectedPosition.id,
      triggerType: dcpTriggerType,
      status: "active",
    };

    // Set account ID based on type
    if (accountType === "individual") {
      planData.individualAccountId = accountId;
    } else if (accountType === "corporate") {
      planData.corporateAccountId = accountId;
    } else {
      planData.jointAccountId = accountId;
    }

    // Set trigger-specific fields
    if (dcpSellPercentage) {
      planData.sellPercentage = parseFloat(dcpSellPercentage);
    }

    if (dcpTriggerType === "percentage_gain" && dcpTargetGainPct) {
      planData.targetGainPct = parseFloat(dcpTargetGainPct);
    } else if (dcpTriggerType === "trailing_stop" && dcpTrailingStopPct) {
      planData.trailingStopPct = parseFloat(dcpTrailingStopPct);
    } else if (dcpTriggerType === "scheduled" && dcpFrequency) {
      planData.frequency = dcpFrequency;
      planData.dayOfPeriod = 15;
    } else if (dcpTriggerType === "price_target") {
      // Use current price + target gain %
      const currentPrice = Number(selectedPosition.currentPrice) || 0;
      const targetGain = parseFloat(dcpTargetGainPct) || 10;
      planData.targetPrice = currentPrice * (1 + targetGain / 100);
    }

    createDcpMutation.mutate(planData);
  };

  const getStatusBadge = (status: string, dcpPlan: DcpPlan | null) => {
    if (dcpPlan) {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          {dcpPlan.status === 'active' ? 'DCP Active' : dcpPlan.status}
        </Badge>
      );
    }

    switch (status) {
      case 'triggered':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Stop Triggered
          </Badge>
        );
      case 'approaching':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Approaching Stop
          </Badge>
        );
      case 'safe':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            <Shield className="h-3 w-3 mr-1" />
            Safe
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">
            No Stop Set
          </Badge>
        );
    }
  };

  const positionsWithoutDcp = protectedRows.filter(r => !r.dcpPlan);

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-500" />
                    Protection Actions
                  </CardTitle>
                  <CardDescription>
                    {protectedRows.length} protected position{protectedRows.length !== 1 ? 's' : ''} 
                    {positionsWithoutDcp.length > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 ml-2">
                        • {positionsWithoutDcp.length} can be automated
                      </span>
                    )}
                  </CardDescription>
                </div>
              </button>
            </CollapsibleTrigger>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Gain %</TableHead>
                    <TableHead className="text-right">Protect %</TableHead>
                    <TableHead className="text-right">Protected Shares</TableHead>
                    <TableHead className="text-right">Stop Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protectedRows.map(row => (
                    <TableRow key={row.position.id} className={row.status === 'triggered' ? 'bg-red-500/5' : row.status === 'approaching' ? 'bg-amber-500/5' : ''}>
                      <TableCell className="font-medium">{row.position.symbol}</TableCell>
                      <TableCell className="text-right">
                        <span className={row.gainPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                          {row.gainPercent >= 0 ? '+' : ''}{row.gainPercent.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.position.protectionPercent ? `${Number(row.position.protectionPercent).toFixed(0)}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.protectedShares > 0 ? row.protectedShares.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.position.stopPrice ? `$${Number(row.position.stopPrice).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(row.status, row.dcpPlan)}
                      </TableCell>
                      <TableCell className="text-right">
                        {!row.dcpPlan ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCreateDialog(row.position)}
                            className="gap-1"
                          >
                            <Zap className="h-3 w-3" />
                            Create DCP
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {row.dcpPlan.executionCount || 0} exec
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Create DCP Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Create DCP Plan for {selectedPosition?.symbol}
            </DialogTitle>
            <DialogDescription>
              Automate profit-taking based on your protection settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Position Info */}
            {selectedPosition && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Price:</span>
                  <span className="font-medium">${Number(selectedPosition.currentPrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry Price:</span>
                  <span className="font-medium">${Number(selectedPosition.entryPrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-medium">{Number(selectedPosition.quantity).toLocaleString()}</span>
                </div>
                {selectedPosition.stopPrice && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stop Price:</span>
                    <span className="font-medium">${Number(selectedPosition.stopPrice).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Trigger Type */}
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select value={dcpTriggerType} onValueChange={setDcpTriggerType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage_gain">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Percentage Gain
                    </div>
                  </SelectItem>
                  <SelectItem value="trailing_stop">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Trailing Stop
                    </div>
                  </SelectItem>
                  <SelectItem value="scheduled">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Scheduled
                    </div>
                  </SelectItem>
                  <SelectItem value="price_target">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Price Target
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sell Percentage */}
            <div className="space-y-2">
              <Label>Sell Percentage</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={dcpSellPercentage}
                  onChange={(e) => setDcpSellPercentage(e.target.value)}
                  placeholder="e.g., 50"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Percentage of position to sell when triggered
              </p>
            </div>

            {/* Trigger-specific fields */}
            {dcpTriggerType === "percentage_gain" && (
              <div className="space-y-2">
                <Label>Target Gain %</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="500"
                    value={dcpTargetGainPct}
                    onChange={(e) => setDcpTargetGainPct(e.target.value)}
                    placeholder="e.g., 10"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sell when position gains this percentage
                </p>
              </div>
            )}

            {dcpTriggerType === "trailing_stop" && (
              <div className="space-y-2">
                <Label>Trailing Stop %</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={dcpTrailingStopPct}
                    onChange={(e) => setDcpTrailingStopPct(e.target.value)}
                    placeholder="e.g., 5"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sell when price drops this % from peak
                </p>
              </div>
            )}

            {dcpTriggerType === "scheduled" && (
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={dcpFrequency} onValueChange={setDcpFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateDcp}
              disabled={createDcpMutation.isPending || !dcpSellPercentage}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              {createDcpMutation.isPending ? "Creating..." : "Create DCP Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

