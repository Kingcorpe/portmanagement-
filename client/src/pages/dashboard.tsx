import { MetricCard } from "@/components/metric-card";
import { PortfolioChart } from "@/components/portfolio-chart";
import { AlertCard, Alert } from "@/components/alert-card";
import { PositionsTable, Position } from "@/components/positions-table";
import { DollarSign, Users, Bell, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export default function Dashboard() {
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
  ]);

  //todo: remove mock functionality
  const chartData = [
    { date: "Jan", value: 8500000 },
    { date: "Feb", value: 9200000 },
    { date: "Mar", value: 9800000 },
    { date: "Apr", value: 10500000 },
    { date: "May", value: 11200000 },
    { date: "Jun", value: 12400000 },
  ];

  //todo: remove mock functionality
  const positions: Position[] = [
    {
      id: "1",
      symbol: "BTC/USD",
      quantity: 2.5,
      entryPrice: 42000,
      currentPrice: 45230,
      pnl: 8075,
      pnlPercent: 7.69
    },
    {
      id: "2",
      symbol: "ETH/USD",
      quantity: 15,
      entryPrice: 2900,
      currentPrice: 2845,
      pnl: -825,
      pnlPercent: -1.90
    },
    {
      id: "3",
      symbol: "SPY",
      quantity: 100,
      entryPrice: 450,
      currentPrice: 465,
      pnl: 1500,
      pnlPercent: 3.33
    },
  ];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your portfolio management platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total AUM"
          value="$12.4M"
          change={8.2}
          icon={DollarSign}
          testId="metric-aum"
        />
        <MetricCard
          title="Active Clients"
          value="47"
          change={4.1}
          icon={Users}
          testId="metric-clients"
        />
        <MetricCard
          title="Pending Alerts"
          value={alerts.filter(a => a.status === "pending").length.toString()}
          icon={Bell}
          testId="metric-alerts"
        />
        <MetricCard
          title="Today's P&L"
          value="$24,580"
          change={-2.3}
          icon={TrendingUp}
          testId="metric-pnl"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PortfolioChart data={chartData} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.slice(0, 3).map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onExecute={handleExecuteAlert}
                onDismiss={handleDismissAlert}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <PositionsTable positions={positions} />
    </div>
  );
}
