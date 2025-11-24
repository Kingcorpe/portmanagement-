import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

export interface Alert {
  id: string;
  symbol: string;
  signal: "BUY" | "SELL";
  price: number;
  timestamp: string;
  message: string;
  status: "pending" | "executed" | "dismissed";
}

interface AlertCardProps {
  alert: Alert;
  onExecute?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function AlertCard({ alert, onExecute, onDismiss }: AlertCardProps) {
  const isBuy = alert.signal === "BUY";

  return (
    <Card data-testid={`card-alert-${alert.id}`}>
      <CardContent className="p-4">
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
                  ${alert.price.toLocaleString()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{alert.message}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{alert.timestamp}</span>
              </div>
            </div>
          </div>
          {alert.status === "pending" && (
            <div className="flex gap-2">
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
            </div>
          )}
          {alert.status === "executed" && (
            <Badge variant="default" data-testid={`badge-status-${alert.id}`}>Executed</Badge>
          )}
          {alert.status === "dismissed" && (
            <Badge variant="secondary" data-testid={`badge-status-${alert.id}`}>Dismissed</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
