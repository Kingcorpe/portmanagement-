import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Users, Plus, UserPlus, Building2, Trash2, Edit, User } from "lucide-react";
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
  onEditIndividual?: (id: string, currentName: string) => void;
  onDeleteIndividual?: (id: string) => void;
  onEditCorporation?: (id: string, currentName: string) => void;
  onDeleteCorporation?: (id: string) => void;
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

// Account categories for grouping
const accountCategories: Record<string, { label: string; types: AccountType[] }> = {
  registered: {
    label: "Registered Accounts",
    types: ["tfsa", "fhsa", "rrsp", "lira", "liff", "rif"]
  },
  nonRegistered: {
    label: "Non-Registered Accounts", 
    types: ["cash"]
  },
  corporate: {
    label: "Corporate Accounts",
    types: ["cash", "ipp"]
  }
};

// Helper to group accounts by category
function groupAccountsByCategory(accounts: Account[], entityType: "individual" | "corporate") {
  if (entityType === "individual") {
    const registered = accounts.filter(a => accountCategories.registered.types.includes(a.type));
    const nonRegistered = accounts.filter(a => accountCategories.nonRegistered.types.includes(a.type));
    return [
      { category: "Registered", accounts: registered },
      { category: "Non-Registered", accounts: nonRegistered }
    ].filter(g => g.accounts.length > 0);
  } else {
    // Corporate accounts - group by type
    const cash = accounts.filter(a => a.type === "cash");
    const ipp = accounts.filter(a => a.type === "ipp");
    return [
      { category: "Cash Accounts", accounts: cash },
      { category: "Pension Plans", accounts: ipp }
    ].filter(g => g.accounts.length > 0);
  }
}

export function HouseholdCard({ 
  household, 
  onClick,
  onAddIndividual,
  onAddCorporation,
  onAddAccount,
  onAddJointAccount,
  onDeleteHousehold,
  onDeleteAccount,
  onEditIndividual,
  onDeleteIndividual,
  onEditCorporation,
  onDeleteCorporation
}: HouseholdCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card data-testid={`card-household-${household.id}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div 
              className="flex items-start gap-3 flex-1 cursor-pointer hover-elevate rounded-md p-1 -m-1"
              onClick={() => setIsOpen(!isOpen)}
              data-testid={`trigger-household-${household.id}`}
            >
              <div className="p-2 rounded-md bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg" data-testid={`text-household-name-${household.id}`}>
                    {household.name}
                  </h3>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
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
                <div className="mt-3">
                  <div className="text-2xl font-bold font-mono tabular-nums" data-testid={`text-household-value-${household.id}`}>
                    CA${household.totalValue.toLocaleString()}
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
              <div key={individual.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm" data-testid={`text-individual-name-${individual.id}`}>
                      {individual.name}
                    </span>
                    <Badge variant="outline" className="text-xs">Individual</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {onEditIndividual && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onEditIndividual(individual.id, individual.name)}
                        data-testid={`button-edit-individual-${individual.id}`}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {onDeleteIndividual && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            data-testid={`button-delete-individual-${individual.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Individual</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{individual.name}"? This will permanently remove all accounts and positions associated with this individual. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteIndividual(individual.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid={`button-confirm-delete-individual-${individual.id}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                <div className="ml-6 space-y-3">
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
                  {groupAccountsByCategory(individual.accounts, "individual").map((group) => (
                    <div key={group.category} className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {group.category}
                      </div>
                      {group.accounts.map((account) => (
                        <div key={account.id} className="flex items-center justify-between text-sm group" data-testid={`row-account-${account.id}`}>
                          <Link href={`/account/individual/${account.id}`} className="flex items-center gap-3 flex-1 py-1 px-2 -ml-2 rounded-md hover-elevate cursor-pointer" data-testid={`link-account-${account.id}`}>
                            <Badge variant="secondary" className="text-xs font-mono">
                              {accountTypeLabels[account.type]}
                            </Badge>
                            <span className="font-mono tabular-nums">
                              CA${account.balance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
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
                      ))}
                    </div>
                  ))}
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
              <div key={corporation.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm" data-testid={`text-corporation-name-${corporation.id}`}>
                      {corporation.name}
                    </span>
                    <Badge variant="outline" className="text-xs">Corporate</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {onEditCorporation && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onEditCorporation(corporation.id, corporation.name)}
                        data-testid={`button-edit-corporation-${corporation.id}`}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {onDeleteCorporation && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            data-testid={`button-delete-corporation-${corporation.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Corporation</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{corporation.name}"? This will permanently remove all accounts and positions associated with this corporation. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteCorporation(corporation.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid={`button-confirm-delete-corporation-${corporation.id}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                <div className="ml-6 space-y-3">
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
                  {groupAccountsByCategory(corporation.accounts, "corporate").map((group) => (
                    <div key={group.category} className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {group.category}
                      </div>
                      {group.accounts.map((account) => (
                        <div key={account.id} className="flex items-center justify-between text-sm group" data-testid={`row-account-${account.id}`}>
                          <Link href={`/account/corporate/${account.id}`} className="flex items-center gap-3 flex-1 py-1 px-2 -ml-2 rounded-md hover-elevate cursor-pointer" data-testid={`link-account-${account.id}`}>
                            <Badge variant="secondary" className="text-xs font-mono">
                              {accountTypeLabels[account.type]}
                            </Badge>
                            <span className="font-mono tabular-nums">
                              CA${account.balance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
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
                      ))}
                    </div>
                  ))}
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
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Joint Accounts</span>
                </div>
                <div className="ml-6 space-y-1">
                  {household.jointAccounts.map((account) => {
                    return (
                      <div key={account.id} className="flex items-center justify-between text-sm group" data-testid={`row-joint-account-${account.id}`}>
                        <Link href={`/account/joint/${account.id}`} className="flex items-center gap-3 flex-1 py-1 px-2 -ml-2 rounded-md hover-elevate cursor-pointer" data-testid={`link-account-${account.id}`}>
                          <Badge variant="secondary" className="text-xs font-mono">
                            {accountTypeLabels[account.type]}
                          </Badge>
                          <span className="font-mono tabular-nums">
                            CA${account.balance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
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
