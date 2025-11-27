import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Users, Plus, UserPlus, Building2, Trash2, Edit, User, Share2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AccountType = "cash" | "tfsa" | "fhsa" | "rrsp" | "lira" | "liff" | "rif" | "joint_cash" | "resp" | "ipp";

export interface Account {
  id: string;
  type: AccountType;
  balance: number;
  nickname?: string | null;
}

export interface Individual {
  id: string;
  name: string;
  dateOfBirth?: Date | string | null;
  spouseDateOfBirth?: Date | string | null;
  accounts: Account[];
}

function calculateRifConversionDate(dateOfBirth: Date | string): Date {
  const dob = new Date(dateOfBirth);
  return new Date(dob.getFullYear() + 71, 11, 31);
}

function formatRifConversionDate(
  dateOfBirth: Date | string | null | undefined,
  spouseDateOfBirth?: Date | string | null
): { date: string; isSpouse: boolean } | null {
  if (!dateOfBirth) return null;
  
  const holderConversion = calculateRifConversionDate(dateOfBirth);
  
  // If spouse DOB is provided and spouse is younger, use their conversion date
  if (spouseDateOfBirth) {
    const spouseConversion = calculateRifConversionDate(spouseDateOfBirth);
    if (spouseConversion > holderConversion) {
      return {
        date: spouseConversion.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }),
        isSpouse: true
      };
    }
  }
  
  return {
    date: holderConversion.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }),
    isSpouse: false
  };
}

export interface Corporation {
  id: string;
  name: string;
  accounts: Account[];
}

export interface JointAccount {
  id: string;
  type: "joint_cash" | "resp";
  balance: number;
  nickname?: string | null;
  owners: string[];
}

export type HouseholdCategory = "evergreen" | "anchor" | "pulse" | "emerging_pulse" | "emerging_anchor";

export interface Household {
  id: string;
  name: string;
  category?: HouseholdCategory | null;
  individuals: Individual[];
  corporations: Corporation[];
  jointAccounts: JointAccount[];
  totalValue: number;
  totalPerformance: number;
  isOwner?: boolean;
}

export const householdCategoryLabels: Record<HouseholdCategory, string> = {
  evergreen: "Evergreen",
  anchor: "Anchor",
  pulse: "Pulse",
  emerging_pulse: "Emerging Pulse",
  emerging_anchor: "Emerging Anchor",
};

export const householdCategoryColors: Record<HouseholdCategory, string> = {
  evergreen: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  anchor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  pulse: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  emerging_pulse: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  emerging_anchor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
};

interface HouseholdCardProps {
  household: Household;
  onClick?: (id: string) => void;
  onAddIndividual?: (householdId: string) => void;
  onAddCorporation?: (householdId: string) => void;
  onAddAccount?: (entityId: string, entityType: "individual" | "corporate") => void;
  onAddJointAccount?: (householdId: string) => void;
  onEditHousehold?: (householdId: string, currentName: string) => void;
  onEditCategory?: (householdId: string, currentCategory: HouseholdCategory | null) => void;
  onShareHousehold?: (householdId: string) => void;
  onDeleteHousehold?: (householdId: string) => void;
  onDeleteAccount?: (accountId: string, accountType: "individual" | "corporate" | "joint") => void;
  onEditIndividual?: (id: string, currentName: string) => void;
  onDeleteIndividual?: (id: string) => void;
  onEditCorporation?: (id: string, currentName: string) => void;
  onDeleteCorporation?: (id: string) => void;
  onEditJointAccount?: (id: string, currentNickname: string | null) => void;
}

const accountTypeLabels: Record<string, string> = {
  "cash": "Cash",
  "tfsa": "TFSA",
  "fhsa": "FHSA",
  "rrsp": "RRSP",
  "lira": "LIRA",
  "liff": "LIF",
  "rif": "RIF",
  "joint_cash": "Joint Cash",
  "resp": "RESP",
  "ipp": "IPP"
};

// Helper to format account display name: "[Account Type]: [Nickname]" or just "[Account Type]"
export function formatAccountDisplayName(type: string | undefined | null, nickname?: string | null): string {
  // Handle null/undefined type
  if (!type) {
    return nickname && nickname.trim() ? `Account: ${nickname}` : "Account";
  }
  
  // Get the type label, falling back to the type string itself if not found
  const typeLabel = accountTypeLabels[type] || type.toUpperCase();
  
  if (nickname && nickname.trim()) {
    return `${typeLabel}: ${nickname}`;
  }
  return typeLabel;
}

// Account categories for grouping
const accountCategories: Record<string, { label: string; types: AccountType[] }> = {
  registered: {
    label: "Registered Accounts",
    types: ["tfsa", "fhsa", "rrsp", "lira", "liff", "rif", "resp"]
  },
  nonRegistered: {
    label: "Non-Registered Accounts", 
    types: ["cash", "joint_cash"]
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
  onEditHousehold,
  onEditCategory,
  onShareHousehold,
  onDeleteHousehold,
  onDeleteAccount,
  onEditIndividual,
  onDeleteIndividual,
  onEditCorporation,
  onDeleteCorporation,
  onEditJointAccount
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
                  {household.category && (
                    <Badge 
                      className={`text-xs cursor-pointer ${householdCategoryColors[household.category]}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCategory?.(household.id, household.category || null);
                      }}
                      data-testid={`badge-category-${household.id}`}
                    >
                      {householdCategoryLabels[household.category]}
                    </Badge>
                  )}
                  {!household.category && onEditCategory && (
                    <Badge 
                      variant="outline"
                      className="text-xs cursor-pointer text-muted-foreground border-dashed"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCategory(household.id, null);
                      }}
                      data-testid={`badge-set-category-${household.id}`}
                    >
                      Set Category
                    </Badge>
                  )}
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onShareHousehold && household.isOwner && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground"
                  onClick={() => onShareHousehold(household.id)}
                  data-testid={`button-share-household-${household.id}`}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
              {onEditHousehold && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground"
                  onClick={() => onEditHousehold(household.id, household.name)}
                  data-testid={`button-edit-household-${household.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
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
            {(onAddIndividual || onAddCorporation || onAddJointAccount) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid={`button-add-menu-${household.id}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New
                    <ChevronDown className="h-3 w-3 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {onAddIndividual && (
                    <DropdownMenuItem 
                      onClick={() => onAddIndividual(household.id)}
                      data-testid={`button-add-individual-${household.id}`}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Individual
                    </DropdownMenuItem>
                  )}
                  {onAddCorporation && (
                    <DropdownMenuItem 
                      onClick={() => onAddCorporation(household.id)}
                      data-testid={`button-add-corporation-${household.id}`}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      Corporation
                    </DropdownMenuItem>
                  )}
                  {onAddJointAccount && (
                    <DropdownMenuItem 
                      onClick={() => onAddJointAccount(household.id)}
                      data-testid={`button-add-joint-account-${household.id}`}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Joint Account
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {household.individuals.map((individual) => (
              <div key={individual.id} className="border rounded-lg overflow-hidden bg-muted/30">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm" data-testid={`text-individual-name-${individual.id}`}>
                      {individual.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">Individual</Badge>
                    {individual.dateOfBirth && (() => {
                      const rifInfo = formatRifConversionDate(individual.dateOfBirth, individual.spouseDateOfBirth);
                      return rifInfo ? (
                        <span className="text-[10px] text-muted-foreground" data-testid={`text-rif-conversion-${individual.id}`}>
                          RIF: {rifInfo.date}{rifInfo.isSpouse ? " (spouse)" : ""}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {onAddAccount && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onAddAccount(individual.id, "individual")}
                        data-testid={`button-add-account-individual-${individual.id}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
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
                
                <div className="px-3 py-2">
                  {groupAccountsByCategory(individual.accounts, "individual").map((group) => (
                    <div key={group.category} className="mb-2 last:mb-0">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        {group.category}
                      </div>
                      <div className="space-y-0.5 pl-3">
                        {group.accounts.map((account) => (
                          <div key={account.id} className="flex items-center text-sm group" data-testid={`row-account-${account.id}`}>
                            <Link href={`/account/individual/${account.id}`} className="flex items-center justify-between flex-1 py-1 px-2 rounded hover-elevate cursor-pointer" data-testid={`link-account-${account.id}`}>
                              <span className="text-xs font-medium">
                                {formatAccountDisplayName(account.type, account.nickname)}
                              </span>
                              <span className="font-mono text-xs tabular-nums">
                                CA${account.balance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </Link>
                            {onDeleteAccount && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    data-testid={`button-delete-account-${account.id}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Account</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this {formatAccountDisplayName(account.type, account.nickname)} account? This will permanently remove all positions associated with this account. This action cannot be undone.
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
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {household.corporations.map((corporation) => (
              <div key={corporation.id} className="border rounded-lg overflow-hidden bg-muted/30">
                <div className="flex items-center justify-between px-3 py-2 bg-amber-500/5">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-sm" data-testid={`text-corporation-name-${corporation.id}`}>
                      {corporation.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-700 dark:text-amber-400">Corporate</Badge>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {onAddAccount && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onAddAccount(corporation.id, "corporate")}
                        data-testid={`button-add-account-corporate-${corporation.id}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
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
                
                <div className="px-3 py-2">
                  {groupAccountsByCategory(corporation.accounts, "corporate").map((group) => (
                    <div key={group.category} className="mb-2 last:mb-0">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        {group.category}
                      </div>
                      <div className="space-y-0.5 pl-3">
                        {group.accounts.map((account) => (
                          <div key={account.id} className="flex items-center text-sm group" data-testid={`row-account-${account.id}`}>
                            <Link href={`/account/corporate/${account.id}`} className="flex items-center justify-between flex-1 py-1 px-2 rounded hover-elevate cursor-pointer" data-testid={`link-account-${account.id}`}>
                              <span className="text-xs font-medium">
                                {formatAccountDisplayName(account.type, account.nickname)}
                              </span>
                              <span className="font-mono text-xs tabular-nums">
                                CA${account.balance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </Link>
                            {onDeleteAccount && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    data-testid={`button-delete-account-${account.id}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Account</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this {formatAccountDisplayName(account.type, account.nickname)} account? This will permanently remove all positions associated with this account. This action cannot be undone.
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
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {household.jointAccounts.length > 0 && (
              <div className="border rounded-lg overflow-hidden bg-muted/30">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/5">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">Joint Accounts</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/30 text-green-700 dark:text-green-400">Shared</Badge>
                </div>
                
                <div className="px-3 py-2 space-y-0.5 pl-3">
                  {household.jointAccounts.map((account) => {
                    return (
                      <div key={account.id} className="flex items-center text-sm group" data-testid={`row-joint-account-${account.id}`}>
                        <Link href={`/account/joint/${account.id}`} className="flex items-center justify-between flex-1 py-1 px-2 rounded hover-elevate cursor-pointer" data-testid={`link-account-${account.id}`}>
                          <span className="text-xs font-medium">
                            {formatAccountDisplayName(account.type, account.nickname)}
                          </span>
                          <span className="font-mono text-xs tabular-nums">
                            CA${account.balance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </Link>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onEditJointAccount && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => onEditJointAccount(account.id, account.nickname || null)}
                              data-testid={`button-edit-joint-account-${account.id}`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
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
                                    Are you sure you want to delete this {formatAccountDisplayName(account.type, account.nickname)} account? This will permanently remove all positions associated with this account. This action cannot be undone.
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
