import { MetricCard } from '../metric-card';
import { DollarSign, Users, Bell, TrendingUp } from 'lucide-react';

export default function MetricCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
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
        value="12"
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
  );
}
