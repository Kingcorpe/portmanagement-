import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock, ChevronDown, ChevronUp, ExternalLink, AlertCircle, Circle, Briefcase, Users } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface Alert {
  id: string;
  symbol: string;
  signal: "BUY" | "SELL";
  price: number;
  timestamp: string;
  message: string;
  status: "pending" | "executed" | "dismissed";
}

interface AffectedAccount {
  accountId: string;
  accountType: string;
  accountName: string;
  householdName: string;
  householdCategory: string;
  ownerName: string;
  currentValue: number;
  actualPercentage: number;
  targetPercentage: number | null;
  variance: number | null;
  status: 'under' | 'over' | 'on-target' | 'no-target' | 'zero-balance';
  portfolioValue?: number;
}

interface AlertCardProps {
  alert: Alert;
  onExecute?: (id: string) => void;
  onDismiss?: (id: string) => void;
  categoryFilter?: string;
}

export function AlertCard({ alert, onExecute, onDismiss, categoryFilter }: AlertCardProps) {
  const isBuy = alert.signal === "BUY";
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: affectedAccounts = [], isLoading } = useQuery<AffectedAccount[]>({
    queryKey: ['/api/symbols', alert.symbol, 'affected-accounts'],
    queryFn: async () => {
      const response = await fetch(`/api/symbols/${encodeURIComponent(alert.symbol)}/affected-accounts`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch affected accounts');
      return response.json();
    },
    enabled: isExpanded,
  });

  const getStatusBadge = (status: AffectedAccount['status']) => {
    switch (status) {
      case 'under':
        return <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Underweight</Badge>;
      case 'over':
        return <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Overweight</Badge>;
      case 'on-target':
        return <Badge variant="secondary" className="text-xs">On Target</Badge>;
      case 'no-target':
        return <Badge variant="outline" className="text-xs">No Target</Badge>;
      case 'zero-balance':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                <AlertCircle className="h-3 w-3" />
                No Balance
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>This account has target allocations but no portfolio value yet. Add positions (like CASH) to enable task creation for trading alerts.</p>
            </TooltipContent>
          </Tooltip>
        );
    }
  };

  // Filter by category if provided
  const filteredAccounts = categoryFilter 
    ? affectedAccounts.filter(a => a.householdCategory === categoryFilter)
    : affectedAccounts;

  // Separate zero-balance accounts for display at the end
  const zeroBalanceAccounts = filteredAccounts.filter(a => a.status === 'zero-balance');
  const activeAccounts = filteredAccounts.filter(a => a.status !== 'zero-balance');

  // Sort active accounts: underweight first (for BUY), overweight first (for SELL)
  const sortedAccounts = [...activeAccounts].sort((a, b) => {
    if (isBuy) {
      if (a.status === 'under' && b.status !== 'under') return -1;
      if (a.status !== 'under' && b.status === 'under') return 1;
    } else {
      if (a.status === 'over' && b.status !== 'over') return -1;
      if (a.status !== 'over' && b.status === 'over') return 1;
    }
    return 0;
  });

  return (
    <Card data-testid={`card-alert-${alert.id}`}>
      <CardContent className="p-4">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2 rounded-md ${isBuy ? 'bg-chart-2/10' : 'bg-destructive/10'}`}>
                {isBuy ? (
                  <TrendingUp className="h-4 w-4 text-chart-2" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold font-mono" data-testid={`text-alert-symbol-${alert.id}`}>
                    {alert.symbol}
                  </span>
                  <Badge variant={isBuy ? "default" : "destructive"} className="text-xs" data-testid={`badge-signal-${alert.id}`}>
                    {alert.signal}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    CA${alert.price.toLocaleString()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{alert.timestamp}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1"
                  data-testid={`button-expand-${alert.id}`}
                >
                  <span className="text-xs text-muted-foreground">
                    {filteredAccounts.length > 0 ? `${filteredAccounts.length} accounts` : 'View accounts'}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              {alert.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => onExecute?.(alert.id)}
                    data-testid={`button-execute-${alert.id}`}
                  >
                    Execute
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDismiss?.(alert.id)}
                    data-testid={`button-dismiss-${alert.id}`}
                  >
                    Dismiss
                  </Button>
                </>
              )}
              {alert.status === "executed" && (
                <Badge variant="default" data-testid={`badge-status-${alert.id}`}>Executed</Badge>
              )}
              {alert.status === "dismissed" && (
                <Badge variant="secondary" data-testid={`badge-status-${alert.id}`}>Dismissed</Badge>
              )}
            </div>
          </div>
          
          <CollapsibleContent className="mt-4">
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Affected Accounts</h4>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading accounts...</p>
              ) : sortedAccounts.length === 0 && zeroBalanceAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No accounts hold this position</p>
              ) : (
                <div className="space-y-2">
                  {sortedAccounts.length > 0 && (
                    <>
                      {sortedAccounts.map((account) => (
                        <Link
                          key={`${account.accountType}-${account.accountId}`}
                          href={`/account/${account.accountType}/${account.accountId}#tasks`}
                          className="block"
                        >
                          <div 
                            className="flex items-start gap-3 p-3 rounded-md border bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors cursor-pointer"
                            data-testid={`link-account-${account.accountId}`}
                          >
                            <div className="mt-0.5">
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-medium">{account.accountName}</span>
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    {(() => {
                                      if (isBuy) {
                                        if (account.status === 'under' && account.targetPercentage !== null) {
                                          const diff = (account.targetPercentage - account.actualPercentage).toFixed(1);
                                          return `Needs ${diff}% more to reach target`;
                                        } else if (account.status === 'over') {
                                          return 'Already overweight - consider reducing position';
                                        } else if (account.status === 'on-target') {
                                          return 'On target allocation';
                                        }
                                        return 'Review allocation';
                                      } else {
                                        if (account.status === 'over' && account.targetPercentage !== null) {
                                          const diff = (account.actualPercentage - account.targetPercentage).toFixed(1);
                                          return `Needs to reduce by ${diff}% to reach target`;
                                        } else if (account.status === 'under') {
                                          return 'Already underweight - no action needed';
                                        } else if (account.status === 'on-target') {
                                          return 'On target allocation';
                                        }
                                        return 'Review allocation';
                                      }
                                    })()}
                                  </p>
                                </div>
                                {getStatusBadge(account.status)}
                              </div>
                              
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  <span>
                                    {account.ownerName} - {account.accountName}
                                  </span>
                                  <ExternalLink className="h-3 w-3" />
                                </span>
                                
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {account.householdName}
                                </span>
                                
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">
                                    {account.actualPercentage.toFixed(1)}%
                                  </span>
                                  {account.targetPercentage !== null && (
                                    <span className="text-muted-foreground">
                                      / {account.targetPercentage.toFixed(1)}% target
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                  
                  {zeroBalanceAccounts.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500 mb-2">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span className="font-medium">Accounts skipped (no portfolio value)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        These accounts have target allocations but no positions yet. Add CASH or other holdings to enable task creation.
                      </p>
                      {zeroBalanceAccounts.map((account) => (
                        <Link
                          key={`${account.accountType}-${account.accountId}`}
                          href={`/account/${account.accountType}/${account.accountId}#tasks`}
                          className="block"
                        >
                          <div 
                            className="flex items-start gap-3 p-3 rounded-md border bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/30 transition-colors cursor-pointer"
                            data-testid={`link-account-${account.accountId}`}
                          >
                            <div className="mt-0.5">
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-medium">{account.accountName}</span>
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    No portfolio value - add positions to enable trading
                                  </p>
                                </div>
                                {getStatusBadge(account.status)}
                              </div>
                              
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  <span>
                                    {account.ownerName} - {account.accountName}
                                  </span>
                                  <ExternalLink className="h-3 w-3" />
                                </span>
                                
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {account.householdName}
                                </span>
                                
                                {account.targetPercentage !== null && (
                                  <span className="flex items-center gap-1">
                                    <span className="text-amber-600 dark:text-amber-500 font-medium">
                                      Target: {account.targetPercentage.toFixed(1)}%
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
