import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface PositionsTableProps {
  positions: Position[];
}

export function PositionsTable({ positions }: PositionsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Positions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Entry</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">P&L</TableHead>
              <TableHead className="text-right">P&L %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => {
              const isProfit = position.pnl >= 0;
              return (
                <TableRow key={position.id} data-testid={`row-position-${position.id}`}>
                  <TableCell className="font-medium font-mono" data-testid={`text-symbol-${position.id}`}>
                    {position.symbol}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {position.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    CA${position.entryPrice.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    CA${position.currentPrice.toLocaleString()}
                  </TableCell>
                  <TableCell className={`text-right font-mono tabular-nums font-medium ${isProfit ? 'text-chart-2' : 'text-destructive'}`} data-testid={`text-pnl-${position.id}`}>
                    {isProfit ? '+' : ''}CA${position.pnl.toLocaleString()}
                  </TableCell>
                  <TableCell className={`text-right font-mono tabular-nums font-medium ${isProfit ? 'text-chart-2' : 'text-destructive'}`}>
                    {isProfit ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
