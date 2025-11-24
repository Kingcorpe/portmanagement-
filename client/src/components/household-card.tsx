import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TrendingUp, TrendingDown, ChevronDown, ChevronRight, Users } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type AccountType = "cash" | "tfsa" | "rrsp" | "lira" | "liff" | "rif" | "joint-cash" | "resp" | "ipp";

export interface Account {
  id: string;
  type: AccountType;
  balance: number;
  performance: number;
}

export interface Individual {
  id: string;
  name: string;
  initials: string;
  accounts: Account[];
}

export interface Corporation {
  id: string;
  name: string;
  initials: string;
  accounts: Account[];
}

export interface JointAccount {
  id: string;
  type: "joint-cash" | "resp";
  balance: number;
  performance: number;
  owners: string[];
}

export interface Household {
  id: string;
  name: string;
  individuals: Individual[];
  corporations: Corporation[];
  jointAccounts: JointAccount[];
  totalValue: number;
  totalPerformance: number;
}

interface HouseholdCardProps {
  household: Household;
  onClick?: (id: string) => void;
}

const accountTypeLabels: Record<AccountType, string> = {
  "cash": "Cash",
  "tfsa": "TFSA",
  "rrsp": "RRSP",
  "lira": "LIRA",
  "liff": "LIFF",
  "rif": "RIF",
  "joint-cash": "Joint Cash",
  "resp": "RESP",
  "ipp": "IPP"
};

export function HouseholdCard({ household, onClick }: HouseholdCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isPositive = household.totalPerformance >= 0;

  return (
    <Card data-testid={`card-household-${household.id}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-md bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg" data-testid={`text-household-name-${household.id}`}>
                  {household.name}
                </h3>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {household.individuals.length} Individual{household.individuals.length !== 1 ? 's' : ''}
                  </Badge>
                  {household.corporations.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {household.corporations.length} Corporate
                    </Badge>
                  )}
                  {household.jointAccounts.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {household.jointAccounts.length} Joint
                    </Badge>
                  )}
                </div>
                <div className="mt-3 space-y-1">
                  <div className="text-2xl font-bold font-mono tabular-nums" data-testid={`text-household-value-${household.id}`}>
                    CA${household.totalValue.toLocaleString()}
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-chart-2' : 'text-destructive'}`}>
                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span data-testid={`text-household-performance-${household.id}`}>
                      {isPositive ? '+' : ''}{household.totalPerformance.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-toggle-${household.id}`}>
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {household.individuals.map((individual) => (
              <div key={individual.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{individual.initials}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm" data-testid={`text-individual-name-${individual.id}`}>
                    {individual.name}
                  </span>
                  <Badge variant="outline" className="text-xs">Individual</Badge>
                </div>
                <div className="ml-8 space-y-1">
                  {individual.accounts.map((account) => {
                    const accountPositive = account.performance >= 0;
                    return (
                      <div key={account.id} className="flex items-center justify-between text-sm" data-testid={`row-account-${account.id}`}>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {accountTypeLabels[account.type]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono tabular-nums">
                            CA${account.balance.toLocaleString()}
                          </span>
                          <span className={`font-mono tabular-nums text-xs ${accountPositive ? 'text-chart-2' : 'text-destructive'} min-w-[60px] text-right`}>
                            {accountPositive ? '+' : ''}{account.performance.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {household.corporations.map((corporation) => (
              <div key={corporation.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{corporation.initials}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm" data-testid={`text-corporation-name-${corporation.id}`}>
                    {corporation.name}
                  </span>
                  <Badge variant="outline" className="text-xs">Corporate</Badge>
                </div>
                <div className="ml-8 space-y-1">
                  {corporation.accounts.map((account) => {
                    const accountPositive = account.performance >= 0;
                    return (
                      <div key={account.id} className="flex items-center justify-between text-sm" data-testid={`row-account-${account.id}`}>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {accountTypeLabels[account.type]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono tabular-nums">
                            CA${account.balance.toLocaleString()}
                          </span>
                          <span className={`font-mono tabular-nums text-xs ${accountPositive ? 'text-chart-2' : 'text-destructive'} min-w-[60px] text-right`}>
                            {accountPositive ? '+' : ''}{account.performance.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {household.jointAccounts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center">
                    <Users className="h-3 w-3" />
                  </div>
                  <span className="font-medium text-sm">Joint Accounts</span>
                </div>
                <div className="ml-8 space-y-1">
                  {household.jointAccounts.map((account) => {
                    const accountPositive = account.performance >= 0;
                    return (
                      <div key={account.id} className="flex items-center justify-between text-sm" data-testid={`row-joint-account-${account.id}`}>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {accountTypeLabels[account.type]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono tabular-nums">
                            CA${account.balance.toLocaleString()}
                          </span>
                          <span className={`font-mono tabular-nums text-xs ${accountPositive ? 'text-chart-2' : 'text-destructive'} min-w-[60px] text-right`}>
                            {accountPositive ? '+' : ''}{account.performance.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
