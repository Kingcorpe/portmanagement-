import { PortfolioChart } from '../portfolio-chart';

export default function PortfolioChartExample() {
  const mockData = [
    { date: "Jan", value: 8500000 },
    { date: "Feb", value: 9200000 },
    { date: "Mar", value: 9800000 },
    { date: "Apr", value: 10500000 },
    { date: "May", value: 11200000 },
    { date: "Jun", value: 12400000 },
  ];

  return (
    <div className="p-6">
      <PortfolioChart data={mockData} />
    </div>
  );
}
