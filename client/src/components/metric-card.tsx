import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import { Link } from "wouter";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  testId?: string;
  href?: string;
  variant?: "default" | "primary" | "success" | "warning";
}

export function MetricCard({ title, value, change, icon: Icon, testId, href, variant = "default" }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;
  
  const variantStyles = {
    default: "glow-border",
    primary: "glow-border",
    success: "glow-border",
    warning: "glow-border"
  };

  const iconColors = {
    default: "text-primary",
    primary: "text-primary",
    success: "text-chart-2",
    warning: "text-chart-4"
  };

  const cardContent = (
    <Card 
      data-testid={testId} 
      className={`${variantStyles[variant]} corner-accents holo-card overflow-visible ${href ? "hover-elevate cursor-pointer transition-all duration-300" : ""}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</div>
        <div className={`p-2 rounded-lg bg-primary/10 ${iconColors[variant]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-mono data-value neon-glow" data-testid={`text-${testId}-value`}>
          {value}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${isPositive ? 'text-chart-2' : 'text-destructive'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span data-testid={`text-${testId}-change`}>
              {isPositive ? '+' : ''}{change.toFixed(2)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }

  return cardContent;
}
