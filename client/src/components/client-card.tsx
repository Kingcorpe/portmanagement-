import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Client {
  id: string;
  name: string;
  email: string;
  portfolioValue: number;
  performance: number;
  initials: string;
  accountType: "individual" | "corporate";
}

interface ClientCardProps {
  client: Client;
  onClick?: (id: string) => void;
}

export function ClientCard({ client, onClick }: ClientCardProps) {
  const isPositive = client.performance >= 0;

  return (
    <Card
      className="hover-elevate cursor-pointer"
      onClick={() => onClick?.(client.id)}
      data-testid={`card-client-${client.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Avatar>
              <AvatarFallback>{client.initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate" data-testid={`text-client-name-${client.id}`}>
                  {client.name}
                </h3>
                <Badge variant="outline" className="text-xs" data-testid={`badge-account-type-${client.id}`}>
                  {client.accountType === "corporate" ? "Corporate" : "Individual"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{client.email}</p>
              <div className="mt-2 space-y-1">
                <div className="text-lg font-bold font-mono tabular-nums" data-testid={`text-client-value-${client.id}`}>
                  CA${client.portfolioValue.toLocaleString()}
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-chart-2' : 'text-destructive'}`}>
                  {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span data-testid={`text-client-performance-${client.id}`}>
                    {isPositive ? '+' : ''}{client.performance.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" data-testid={`button-client-menu-${client.id}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem data-testid={`button-view-${client.id}`}>View Details</DropdownMenuItem>
              <DropdownMenuItem data-testid={`button-edit-${client.id}`}>Edit Client</DropdownMenuItem>
              <DropdownMenuItem data-testid={`button-contact-${client.id}`}>Contact</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
