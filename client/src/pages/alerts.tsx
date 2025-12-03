import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useDemoMode } from "@/contexts/demo-mode-context";
import { useDemoAwareQuery } from "@/lib/demo-data-service";
import { DemoModeBanner } from "@/components/demo-mode-banner";
import { AlertCard, Alert } from "@/components/alert-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, Filter, ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Alert as AlertType } from "@shared/schema";

interface AffectedAccount {
  accountId: string;
  accountType: string;
  accountName: string;
  householdName: string;
  householdCategory: string;
  ownerName: string;
  currentValue: number;
  actualPercentage: number;
  targetPercentage: number | null;
  variance: number | null;
  status: 'under' | 'over' | 'on-target' | 'no-target' | 'zero-balance';
  portfolioValue?: number;
}

interface AlertWithCategory extends Alert {
  categories: string[];
}

const CATEGORY_ORDER = ['pulse', 'anchor', 'emerging_pulse', 'emerging_anchor', 'evergreen'];
const CATEGORY_LABELS: Record<string, string> = {
  pulse: 'Pulse',
  anchor: 'Anchor',
  emerging_pulse: 'Emerging Pulse',
  emerging_anchor: 'Emerging Anchor',
  evergreen: 'Evergreen',
  uncategorized: 'Uncategorized'
};

const normalizeCategory = (category: string | null | undefined): string => {
  if (!category) return 'uncategorized';
  return category.toLowerCase().replace(/\s+/g, '_');
};

export default function Alerts() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'grouped'>('all');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pulse: true,
    anchor: true,
    emerging_pulse: true,
    emerging_anchor: true,
    evergreen: true,
    uncategorized: true,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { isDemoMode } = useDemoMode();

  const { data: alertsData = [], isLoading, dataUpdatedAt } = useDemoAwareQuery<AlertType[]>({
    queryKey: ["/api/alerts"],
    enabled: isAuthenticated,
    refetchInterval: 15000, // Auto-refresh every 15 seconds
    retry: (failureCount: number, error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return false;
      }
      return failureCount < 3;
    },
  });

  const pendingSymbols = Array.from(new Set(alertsData.filter(a => a.status === 'pending').map(a => a.symbol)));
  
  const { data: symbolCategories = {}, isLoading: categoriesLoading } = useQuery<Record<string, string[]>>({
    queryKey: ['/api/alerts/symbol-categories', pendingSymbols],
    queryFn: async () => {
      const results: Record<string, string[]> = {};
      await Promise.all(
        pendingSymbols.map(async (symbol) => {
          try {
            const response = await fetch(`/api/symbols/${encodeURIComponent(symbol)}/affected-accounts`, {
              credentials: 'include'
            });
            if (response.ok) {
              const accounts: AffectedAccount[] = await response.json();
              const categories = Array.from(new Set(accounts.map(a => normalizeCategory(a.householdCategory))));
              results[symbol] = categories.length > 0 ? categories : ['uncategorized'];
            }
          } catch (e) {
            console.error(`Failed to fetch categories for ${symbol}:`, e);
            results[symbol] = ['uncategorized'];
          }
        })
      );
      return results;
    },
    enabled: isAuthenticated && pendingSymbols.length > 0,
  });

  const updateAlertMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "executed" | "dismissed" }) => {
      await apiRequest("PATCH", `/api/alerts/${id}`, { status });
    },
    // Optimistic update for instant UI feedback
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/alerts"] });
      
      // Snapshot the previous value
      const previousAlerts = queryClient.getQueryData<AlertType[]>(["/api/alerts"]);
      
      // Optimistically update the cache
      if (previousAlerts) {
        queryClient.setQueryData<AlertType[]>(["/api/alerts"], (old) =>
          old?.map((alert) =>
            alert.id === id ? { ...alert, status } : alert
          ) ?? []
        );
      }
      
      return { previousAlerts };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousAlerts) {
        queryClient.setQueryData(["/api/alerts"], context.previousAlerts);
      }
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update alert",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const dismissAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/alerts/dismiss-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: "All alerts dismissed",
        description: "All pending alerts have been dismissed",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to dismiss alerts",
        variant: "destructive",
      });
    },
  });

  const alerts: AlertWithCategory[] = alertsData.map(a => ({
    id: a.id,
    symbol: a.symbol,
    signal: a.signal,
    price: parseFloat(a.price),
    timestamp: new Date(a.createdAt!).toLocaleString(),
    message: a.message || "",
    status: a.status,
    categories: symbolCategories[a.symbol] || []
  }));

  const handleExecuteAlert = (id: string) => {
    updateAlertMutation.mutate({ id, status: "executed" });
  };

  const handleDismissAlert = (id: string) => {
    updateAlertMutation.mutate({ id, status: "dismissed" });
  };

  const toggleSection = (category: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const pendingAlerts = alerts.filter(a => a.status === "pending");
  const executedAlerts = alerts.filter(a => a.status === "executed");
  const dismissedAlerts = alerts.filter(a => a.status === "dismissed");

  const allCategories = [...CATEGORY_ORDER, 'uncategorized'];
  const alertsByCategory: Record<string, AlertWithCategory[]> = {};
  allCategories.forEach(cat => {
    alertsByCategory[cat] = pendingAlerts.filter(alert => 
      alert.categories.includes(cat) || (alert.categories.length === 0 && cat === 'uncategorized')
    );
  });

  const filteredPendingAlerts = selectedCategory 
    ? pendingAlerts.filter(a => a.categories.includes(selectedCategory) || (a.categories.length === 0 && selectedCategory === 'uncategorized'))
    : pendingAlerts;

  const categoryCounts: Record<string, number> = {};
  allCategories.forEach(cat => {
    categoryCounts[cat] = pendingAlerts.filter(a => 
      a.categories.includes(cat) || (a.categories.length === 0 && cat === 'uncategorized')
    ).length;
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-lg">Loading alerts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 cyber-grid min-h-full">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text" data-testid="text-alerts-title">TradingView Alerts</h1>
          <p className="text-muted-foreground">Manage incoming trading signals</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" style={{ animationDuration: '3s' }} />
          <span>Auto-refresh every 15s</span>
          {dataUpdatedAt && (
            <Badge variant="outline" className="text-xs">
              Last: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-alert-filter">
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="executed" data-testid="tab-executed">
            Executed ({executedAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="dismissed" data-testid="tab-dismissed">
            Dismissed ({dismissedAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingAlerts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-pending-alerts">
              No pending alerts
            </p>
          ) : (
            <>
              {/* View Mode Toggle and Category Filter */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'all' ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setViewMode('all'); setSelectedCategory(null); }}
                      data-testid="view-all"
                    >
                      All Alerts
                    </Button>
                    <Button
                      variant={viewMode === 'grouped' ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setViewMode('grouped'); setSelectedCategory(null); }}
                      data-testid="view-grouped"
                      disabled={categoriesLoading}
                    >
                      {categoriesLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      Group by Category
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dismissAllMutation.mutate()}
                    disabled={dismissAllMutation.isPending}
                    data-testid="button-dismiss-all"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {dismissAllMutation.isPending ? "Dismissing..." : "Dismiss All"}
                  </Button>
                </div>

                {/* Category Filter - shown when in grouped mode or filtering */}
                {viewMode === 'grouped' && !categoriesLoading && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Button
                      variant={selectedCategory === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(null)}
                      data-testid="filter-all"
                    >
                      All ({pendingAlerts.length})
                    </Button>
                    {allCategories.map(category => {
                      if (categoryCounts[category] === 0) return null;
                      return (
                        <Button
                          key={category}
                          variant={selectedCategory === category ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategory(category)}
                          data-testid={`filter-${category}`}
                        >
                          {CATEGORY_LABELS[category]} ({categoryCounts[category]})
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Alert Display */}
              {viewMode === 'all' ? (
                <div className="space-y-4">
                  {pendingAlerts.map(alert => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onExecute={handleExecuteAlert}
                      onDismiss={handleDismissAlert}
                    />
                  ))}
                </div>
              ) : categoriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-muted-foreground">Loading category data...</span>
                </div>
              ) : selectedCategory !== null ? (
                <div className="space-y-4">
                  {filteredPendingAlerts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No alerts in this category
                    </p>
                  ) : (
                    filteredPendingAlerts.map(alert => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onExecute={handleExecuteAlert}
                        onDismiss={handleDismissAlert}
                        categoryFilter={selectedCategory}
                      />
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {allCategories.map(category => {
                    const categoryAlerts = alertsByCategory[category];
                    if (categoryAlerts.length === 0) return null;
                    
                    return (
                      <Collapsible 
                        key={category} 
                        open={expandedSections[category]} 
                        onOpenChange={() => toggleSection(category)}
                      >
                        <Card className="glow-border corner-accents">
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover-elevate py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-lg">{CATEGORY_LABELS[category]}</CardTitle>
                                  <Badge variant="secondary">{categoryAlerts.length}</Badge>
                                </div>
                                {expandedSections[category] ? (
                                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="space-y-3 pt-0">
                              {categoryAlerts.map(alert => (
                                <AlertCard
                                  key={`${category}-${alert.id}`}
                                  alert={alert}
                                  onExecute={handleExecuteAlert}
                                  onDismiss={handleDismissAlert}
                                  categoryFilter={category}
                                />
                              ))}
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="executed" className="space-y-4 mt-6">
          {executedAlerts.length === 0 ? (
            <Card className="glow-border corner-accents">
              <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-executed-alerts">
                No executed alerts
              </CardContent>
            </Card>
          ) : (
            executedAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="dismissed" className="space-y-4 mt-6">
          {dismissedAlerts.length === 0 ? (
            <Card className="glow-border corner-accents">
              <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-dismissed-alerts">
                No dismissed alerts
              </CardContent>
            </Card>
          ) : (
            dismissedAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
