import { AlertCard, Alert } from "@/components/alert-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function Alerts() {
  //todo: remove mock functionality
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "1",
      symbol: "BTC/USD",
      signal: "BUY",
      price: 45230,
      timestamp: "2 minutes ago",
      message: "Strong bullish reversal pattern detected on 4H chart",
      status: "pending"
    },
    {
      id: "2",
      symbol: "ETH/USD",
      signal: "SELL",
      price: 2845,
      timestamp: "15 minutes ago",
      message: "Resistance level reached with bearish divergence",
      status: "pending"
    },
    {
      id: "3",
      symbol: "SPY",
      signal: "BUY",
      price: 465,
      timestamp: "1 hour ago",
      message: "Breaking above key resistance with volume",
      status: "executed"
    },
    {
      id: "4",
      symbol: "AAPL",
      signal: "SELL",
      price: 178,
      timestamp: "2 hours ago",
      message: "Overbought on RSI with negative MACD crossover",
      status: "dismissed"
    },
    {
      id: "5",
      symbol: "TSLA",
      signal: "BUY",
      price: 245,
      timestamp: "3 hours ago",
      message: "Support bounce with bullish candlestick pattern",
      status: "executed"
    },
  ]);

  const handleExecuteAlert = (id: string) => {
    console.log('Execute alert:', id);
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, status: "executed" as const } : alert
    ));
  };

  const handleDismissAlert = (id: string) => {
    console.log('Dismiss alert:', id);
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, status: "dismissed" as const } : alert
    ));
  };

  const pendingAlerts = alerts.filter(a => a.status === "pending");
  const executedAlerts = alerts.filter(a => a.status === "executed");
  const dismissedAlerts = alerts.filter(a => a.status === "dismissed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">TradingView Alerts</h1>
        <p className="text-muted-foreground">Manage incoming signals and notifications</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="executed" data-testid="tab-executed">
            Executed ({executedAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="dismissed" data-testid="tab-dismissed">
            Dismissed ({dismissedAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingAlerts.length > 0 ? (
            pendingAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onExecute={handleExecuteAlert}
                onDismiss={handleDismissAlert}
              />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No pending alerts
            </div>
          )}
        </TabsContent>

        <TabsContent value="executed" className="space-y-4 mt-6">
          {executedAlerts.length > 0 ? (
            executedAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No executed alerts
            </div>
          )}
        </TabsContent>

        <TabsContent value="dismissed" className="space-y-4 mt-6">
          {dismissedAlerts.length > 0 ? (
            dismissedAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No dismissed alerts
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
