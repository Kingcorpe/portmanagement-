import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TrendingUp, TrendingDown, ChevronDown, ChevronRight, Users, Eye, Plus, UserPlus, Building2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type AccountType = "cash" | "tfsa" | "fhsa" | "rrsp" | "lira" | "liff" | "rif" | "joint-cash" | "resp" | "ipp";

export interface Account {
  id: string;
  type: AccountType;
  balance: number;
  performance: number;
}

export interface Individual {
  id: string;
  name: string;
  accounts: Account[];
}

export interface Corporation {
  id: string;
  name: string;
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
  onAddIndividual?: (householdId: string) => void;
  onAddCorporation?: (householdId: string) => void;
  onAddAccount?: (entityId: string, entityType: "individual" | "corporate") => void;
  onAddJointAccount?: (householdId: string) => void;
  onDeleteHousehold?: (householdId: string) => void;
  onDeleteAccount?: (accountId: string, accountType: "individual" | "corporate" | "joint") => void;
}

const accountTypeLabels: Record<AccountType, string> = {
  "cash": "Cash",
  "tfsa": "TFSA",
  "fhsa": "FHSA",
  "rrsp": "RRSP",
  "lira": "LIRA",
  "liff": "LIFF",
  "rif": "RIF",
  "joint-cash": "Joint Cash",
  "resp": "RESP",
  "ipp": "IPP"
};

export function HouseholdCard({ 
  household, 
  onClick,
  onAddIndividual,
  onAddCorporation,
  onAddAccount,
  onAddJointAccount,
  onDeleteHousehold,
  onDeleteAccount
}: HouseholdCardProps) {
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
            <div className="flex items-center gap-1">
              {onDeleteHousehold && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive"
                      data-testid={`button-delete-household-${household.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Household</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{household.name}"? This will permanently remove all individuals, corporations, accounts, and positions associated with this household. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => onDeleteHousehold(household.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid={`button-confirm-delete-household-${household.id}`}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-toggle-${household.id}`}>
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <div className="flex gap-2 flex-wrap">
              {onAddIndividual && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onAddIndividual(household.id)}
                  data-testid={`button-add-individual-${household.id}`}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Add Individual
                </Button>
              )}
              {onAddCorporation && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onAddCorporation(household.id)}
                  data-testid={`button-add-corporation-${household.id}`}
                >
                  <Building2 className="h-3 w-3 mr-1" />
                  Add Corporation
                </Button>
              )}
              {onAddJointAccount && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onAddJointAccount(household.id)}
                  data-testid={`button-add-joint-account-${household.id}`}
                >
                  <Users className="h-3 w-3 mr-1" />
                  Add Joint Account
                </Button>
              )}
            </div>

            {household.individuals.map((individual) => (
              <div key={individual.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{individual.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm" data-testid={`text-individual-name-${individual.id}`}>
                    {individual.name}
                  </span>
                  <Badge variant="outline" className="text-xs">Individual</Badge>
                </div>
                <div className="ml-8 space-y-1">
                  {onAddAccount && individual.accounts.length === 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start text-muted-foreground"
                      onClick={() => onAddAccount(individual.id, "individual")}
                      data-testid={`button-add-account-individual-${individual.id}`}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Account
                    </Button>
                  )}
                  {individual.accounts.map((account) => {
                    const accountPositive = account.performance >= 0;
                    return (
                      <div key={account.id} className="flex items-center justify-between text-sm" data-testid={`row-account-${account.id}`}>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {accountTypeLabels[account.type]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums">
                            CA${account.balance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className={`font-mono tabular-nums text-xs ${accountPositive ? 'text-chart-2' : 'text-destructive'} min-w-[60px] text-right`}>
                            {accountPositive ? '+' : ''}{account.performance.toFixed(2)}%
                          </span>
                          <Link href={`/account/individual/${account.id}`}>
                            <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`button-view-positions-${account.id}`}>
                              <Eye className="h-3 w-3" />
                            </Button>
                          </Link>
                          {onDeleteAccount && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  data-testid={`button-delete-account-${account.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this {accountTypeLabels[account.type]} account? This will permanently remove all positions associated with this account. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => onDeleteAccount(account.id, "individual")}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid={`button-confirm-delete-account-${account.id}`}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {onAddAccount && individual.accounts.length > 0 && (
                    <div className="pt-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => onAddAccount(individual.id, "individual")}
                        data-testid={`button-add-account-individual-${individual.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Account
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {household.corporations.map((corporation) => (
              <div key={corporation.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{corporation.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm" data-testid={`text-corporation-name-${corporation.id}`}>
                    {corporation.name}
                  </span>
                  <Badge variant="outline" className="text-xs">Corporate</Badge>
                </div>
                <div className="ml-8 space-y-1">
                  {onAddAccount && corporation.accounts.length === 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start text-muted-foreground"
                      onClick={() => onAddAccount(corporation.id, "corporate")}
                      data-testid={`button-add-account-corporate-${corporation.id}`}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Account
                    </Button>
                  )}
                  {corporation.accounts.map((account) => {
                    const accountPositive = account.performance >= 0;
                    return (
                      <div key={account.id} className="flex items-center justify-between text-sm" data-testid={`row-account-${account.id}`}>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {accountTypeLabels[account.type]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums">
                            CA${account.balance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className={`font-mono tabular-nums text-xs ${accountPositive ? 'text-chart-2' : 'text-destructive'} min-w-[60px] text-right`}>
                            {accountPositive ? '+' : ''}{account.performance.toFixed(2)}%
                          </span>
                          <Link href={`/account/corporate/${account.id}`}>
                            <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`button-view-positions-${account.id}`}>
                              <Eye className="h-3 w-3" />
                            </Button>
                          </Link>
                          {onDeleteAccount && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  data-testid={`button-delete-account-${account.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this {accountTypeLabels[account.type]} account? This will permanently remove all positions associated with this account. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => onDeleteAccount(account.id, "corporate")}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid={`button-confirm-delete-account-${account.id}`}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {onAddAccount && corporation.accounts.length > 0 && (
                    <div className="pt-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => onAddAccount(corporation.id, "corporate")}
                        data-testid={`button-add-account-corporate-${corporation.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Account
                      </Button>
                    </div>
                  )}
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
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums">
                            CA${account.balance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className={`font-mono tabular-nums text-xs ${accountPositive ? 'text-chart-2' : 'text-destructive'} min-w-[60px] text-right`}>
                            {accountPositive ? '+' : ''}{account.performance.toFixed(2)}%
                          </span>
                          <Link href={`/account/joint/${account.id}`}>
                            <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`button-view-positions-${account.id}`}>
                              <Eye className="h-3 w-3" />
                            </Button>
                          </Link>
                          {onDeleteAccount && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  data-testid={`button-delete-account-${account.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Joint Account</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this {accountTypeLabels[account.type]} account? This will permanently remove all positions associated with this account. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => onDeleteAccount(account.id, "joint")}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid={`button-confirm-delete-account-${account.id}`}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
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
