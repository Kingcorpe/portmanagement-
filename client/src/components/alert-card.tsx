import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  ownerName: string;
  currentValue: number;
  actualPercentage: number;
  targetPercentage: number | null;
  variance: number | null;
  status: 'under' | 'over' | 'on-target' | 'no-target';
}

interface AlertCardProps {
  alert: Alert;
  onExecute?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function AlertCard({ alert, onExecute, onDismiss }: AlertCardProps) {
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
        return <Badge variant="destructive" className="text-xs">Underweight</Badge>;
      case 'over':
        return <Badge className="text-xs bg-green-600">Overweight</Badge>;
      case 'on-target':
        return <Badge variant="secondary" className="text-xs">On Target</Badge>;
      case 'no-target':
        return <Badge variant="outline" className="text-xs">No Target</Badge>;
    }
  };

  // Sort accounts: underweight first (for BUY), overweight first (for SELL)
  const sortedAccounts = [...affectedAccounts].sort((a, b) => {
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
                    {affectedAccounts.length > 0 ? `${affectedAccounts.length} accounts` : 'View accounts'}
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
              ) : sortedAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No accounts hold this position</p>
              ) : (
                <div className="space-y-2">
                  {sortedAccounts.map((account) => (
                    <Link
                      key={`${account.accountType}-${account.accountId}`}
                      href={`/account/${account.accountType}/${account.accountId}`}
                    >
                      <div 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                        data-testid={`link-account-${account.accountId}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">
                              {account.accountName}
                            </span>
                            {getStatusBadge(account.status)}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {account.ownerName} • {account.householdName}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <div className="text-sm font-medium">
                              {account.actualPercentage.toFixed(1)}%
                            </div>
                            {account.targetPercentage !== null && (
                              <div className="text-xs text-muted-foreground">
                                Target: {account.targetPercentage.toFixed(1)}%
                              </div>
                            )}
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
