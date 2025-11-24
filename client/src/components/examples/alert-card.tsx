import { AlertCard, Alert } from '../alert-card';

export default function AlertCardExample() {
  const mockAlerts: Alert[] = [
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
      status: "executed"
    },
  ];

  return (
    <div className="space-y-4 p-6 max-w-2xl">
      {mockAlerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onExecute={(id) => console.log('Execute alert:', id)}
          onDismiss={(id) => console.log('Dismiss alert:', id)}
        />
      ))}
    </div>
  );
}
