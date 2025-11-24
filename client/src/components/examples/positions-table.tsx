import { PositionsTable, Position } from '../positions-table';

export default function PositionsTableExample() {
  const mockPositions: Position[] = [
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

  return (
    <div className="p-6">
      <PositionsTable positions={mockPositions} />
    </div>
  );
}
