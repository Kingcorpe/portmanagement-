import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Settings, 
  Database, 
  Bell, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit, 
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Eye
} from "lucide-react";

interface UniversalHolding {
  id: string;
  ticker: string;
  name: string;
  category: string;
  riskLevel: string;
  dividendRate: string;
  dividendYield: string;
  dividendPayout: string;
  price: string;
  priceUpdatedAt: string | null;
  fundFactsUrl?: string;
  description?: string;
}

interface WebhookLog {
  id: string;
  timestamp: string;
  symbol: string;
  signal: string;
  price: string;
  status: 'success' | 'failed' | 'pending';
  message?: string;
  accountsAffected: number;
  emailsSent: number;
}

const categoryOptions = [
  { value: "anchor", label: "Anchor" },
  { value: "basket_etf", label: "Basket ETF" },
  { value: "security", label: "Security" },
  { value: "auto_added", label: "Auto Added" },
];

const riskLevelOptions = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

const payoutOptions = [
  { value: "none", label: "None" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi_annual", label: "Semi-Annual" },
  { value: "annual", label: "Annual" },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState("holdings");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingHolding, setEditingHolding] = useState<UniversalHolding | null>(null);
  const [deletingHolding, setDeletingHolding] = useState<UniversalHolding | null>(null);
  const { toast } = useToast();

  const [newHolding, setNewHolding] = useState({
    ticker: "",
    name: "",
    category: "basket_etf",
    riskLevel: "moderate",
    dividendPayout: "none",
    fundFactsUrl: "",
    description: "",
  });

  const { data: holdings = [], isLoading: holdingsLoading } = useQuery<UniversalHolding[]>({
    queryKey: ['/api/universal-holdings'],
  });

  const { data: webhookLogs = [], isLoading: logsLoading } = useQuery<WebhookLog[]>({
    queryKey: ['/api/admin/webhook-logs'],
    enabled: activeTab === "webhooks",
  });

  const { data: adminStats } = useQuery<{
    totalHoldings: number;
    holdingsWithPrice: number;
    holdingsWithDividend: number;
    orphanedPositions: number;
    recentWebhooks: number;
  }>({
    queryKey: ['/api/admin/stats'],
  });

  const refreshPricesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/universal-holdings/refresh-prices");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/universal-holdings'] });
      toast({
        title: "Prices Refreshed",
        description: `Updated ${data.updated} of ${data.total} holdings`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const refreshDividendsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/universal-holdings/refresh-dividends");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/universal-holdings'] });
      toast({
        title: "Dividends Refreshed",
        description: `Updated ${data.updated} of ${data.total} holdings`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createHoldingMutation = useMutation({
    mutationFn: async (data: typeof newHolding) => {
      return await apiRequest("POST", "/api/universal-holdings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/universal-holdings'] });
      setShowAddDialog(false);
      setNewHolding({
        ticker: "",
        name: "",
        category: "basket_etf",
        riskLevel: "moderate",
        dividendPayout: "none",
        fundFactsUrl: "",
        description: "",
      });
      toast({
        title: "Holding Created",
        description: "New ticker added to Universal Holdings",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateHoldingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UniversalHolding> }) => {
      return await apiRequest("PATCH", `/api/universal-holdings/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/universal-holdings'] });
      setEditingHolding(null);
      toast({
        title: "Holding Updated",
        description: "Changes saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteHoldingMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/universal-holdings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/universal-holdings'] });
      setDeletingHolding(null);
      toast({
        title: "Holding Deleted",
        description: "Ticker removed from Universal Holdings",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredHoldings = holdings.filter(h => {
    const matchesSearch = search === "" || 
      h.ticker.toLowerCase().includes(search.toLowerCase()) ||
      h.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || h.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "anchor": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "basket_etf": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "security": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "auto_added": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "moderate": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-admin-title">Admin</h1>
          <p className="text-muted-foreground">System management and configuration</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Holdings</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-holdings">
              {holdings.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Universal Holdings database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">With Prices</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-holdings-with-price">
              {holdings.filter(h => parseFloat(h.price) > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Have current price data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">With Dividends</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-holdings-with-dividend">
              {holdings.filter(h => parseFloat(h.dividendRate) > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Have dividend data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {categoryOptions.map(cat => {
                const count = holdings.filter(h => h.category === cat.value).length;
                if (count === 0) return null;
                return (
                  <Badge key={cat.value} variant="secondary" className="text-xs">
                    {cat.label}: {count}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="holdings" data-testid="tab-holdings">
            <Database className="h-4 w-4 mr-2" />
            Universal Holdings
          </TabsTrigger>
          <TabsTrigger value="webhooks" data-testid="tab-webhooks">
            <Bell className="h-4 w-4 mr-2" />
            Webhook Logs
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Universal Holdings Tab */}
        <TabsContent value="holdings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Universal Holdings</CardTitle>
                  <CardDescription>Manage the master list of tickers, categories, and pricing</CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshPricesMutation.mutate()}
                    disabled={refreshPricesMutation.isPending}
                    data-testid="button-refresh-prices"
                  >
                    {refreshPricesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh All Prices
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshDividendsMutation.mutate()}
                    disabled={refreshDividendsMutation.isPending}
                    data-testid="button-refresh-dividends"
                  >
                    {refreshDividendsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <DollarSign className="h-4 w-4 mr-2" />
                    )}
                    Refresh Dividends
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowAddDialog(true)}
                    data-testid="button-add-holding"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Holding
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by ticker or name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-holdings"
                    />
                  </div>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoryOptions.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {holdingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticker</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Div. Yield</TableHead>
                        <TableHead>Payout</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHoldings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No holdings found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredHoldings.map((holding) => (
                          <TableRow key={holding.id} data-testid={`row-holding-${holding.ticker}`}>
                            <TableCell className="font-medium">{holding.ticker}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{holding.name}</TableCell>
                            <TableCell>
                              <Badge className={getCategoryBadgeColor(holding.category)}>
                                {categoryOptions.find(c => c.value === holding.category)?.label || holding.category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRiskBadgeColor(holding.riskLevel)}>
                                {holding.riskLevel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {parseFloat(holding.price) > 0 
                                ? `$${parseFloat(holding.price).toFixed(2)}`
                                : <span className="text-muted-foreground">-</span>
                              }
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {parseFloat(holding.dividendYield) > 0
                                ? `${parseFloat(holding.dividendYield).toFixed(2)}%`
                                : <span className="text-muted-foreground">-</span>
                              }
                            </TableCell>
                            <TableCell>
                              {holding.dividendPayout !== "none" 
                                ? payoutOptions.find(p => p.value === holding.dividendPayout)?.label
                                : <span className="text-muted-foreground">-</span>
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {holding.fundFactsUrl && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    asChild
                                  >
                                    <a href={holding.fundFactsUrl} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingHolding(holding)}
                                  data-testid={`button-edit-${holding.ticker}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingHolding(holding)}
                                  data-testid={`button-delete-${holding.ticker}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Logs Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>TradingView Webhook Logs</CardTitle>
                  <CardDescription>Recent webhook activity and alert processing</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Webhook logging coming soon</p>
                <p className="text-sm">View TradingView webhook history and delivery status</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure application behavior and integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label className="text-base font-medium">TradingView Webhook</Label>
                  <p className="text-sm text-muted-foreground">
                    Webhook URL for receiving TradingView alerts
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={`${window.location.origin}/api/webhooks/tradingview`}
                      readOnly
                      className="font-mono text-sm"
                      data-testid="input-webhook-url"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/tradingview`);
                        toast({ title: "Copied to clipboard" });
                      }}
                      data-testid="button-copy-webhook"
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Email Configuration</Label>
                  <p className="text-sm text-muted-foreground">
                    Configure where rebalancing reports are sent
                  </p>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm">
                      Email recipient is configured via the <code className="bg-muted px-1 rounded">TRADINGVIEW_REPORT_EMAIL</code> environment variable.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Price Refresh</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatic price updates from Yahoo Finance
                  </p>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Prices refresh automatically every 5 minutes</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-medium">Demo Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Show sample data for prospect demonstrations
                  </p>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm">
                      Toggle Demo Mode from the sidebar to switch between real and sample data.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Holding Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Universal Holding</DialogTitle>
            <DialogDescription>Add a new ticker to the master holdings list</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticker">Ticker Symbol</Label>
                <Input
                  id="ticker"
                  placeholder="e.g., BANK.TO"
                  value={newHolding.ticker}
                  onChange={(e) => setNewHolding(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
                  data-testid="input-new-ticker"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newHolding.category}
                  onValueChange={(value) => setNewHolding(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger data-testid="select-new-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., BMO Equal Weight Banks Index ETF"
                value={newHolding.name}
                onChange={(e) => setNewHolding(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-new-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="riskLevel">Risk Level</Label>
                <Select
                  value={newHolding.riskLevel}
                  onValueChange={(value) => setNewHolding(prev => ({ ...prev, riskLevel: value }))}
                >
                  <SelectTrigger data-testid="select-new-risk">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {riskLevelOptions.map(risk => (
                      <SelectItem key={risk.value} value={risk.value}>{risk.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payout">Dividend Payout</Label>
                <Select
                  value={newHolding.dividendPayout}
                  onValueChange={(value) => setNewHolding(prev => ({ ...prev, dividendPayout: value }))}
                >
                  <SelectTrigger data-testid="select-new-payout">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {payoutOptions.map(payout => (
                      <SelectItem key={payout.value} value={payout.value}>{payout.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fundFacts">Fund Facts URL (optional)</Label>
              <Input
                id="fundFacts"
                placeholder="https://..."
                value={newHolding.fundFactsUrl}
                onChange={(e) => setNewHolding(prev => ({ ...prev, fundFactsUrl: e.target.value }))}
                data-testid="input-new-fundfacts"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createHoldingMutation.mutate(newHolding)}
              disabled={!newHolding.ticker || !newHolding.name || createHoldingMutation.isPending}
              data-testid="button-confirm-add"
            >
              {createHoldingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Holding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Holding Dialog */}
      <Dialog open={!!editingHolding} onOpenChange={(open) => !open && setEditingHolding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingHolding?.ticker}</DialogTitle>
            <DialogDescription>Update holding details</DialogDescription>
          </DialogHeader>
          {editingHolding && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editingHolding.name}
                  onChange={(e) => setEditingHolding(prev => prev ? { ...prev, name: e.target.value } : null)}
                  data-testid="input-edit-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={editingHolding.category}
                    onValueChange={(value) => setEditingHolding(prev => prev ? { ...prev, category: value } : null)}
                  >
                    <SelectTrigger data-testid="select-edit-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Risk Level</Label>
                  <Select
                    value={editingHolding.riskLevel}
                    onValueChange={(value) => setEditingHolding(prev => prev ? { ...prev, riskLevel: value } : null)}
                  >
                    <SelectTrigger data-testid="select-edit-risk">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {riskLevelOptions.map(risk => (
                        <SelectItem key={risk.value} value={risk.value}>{risk.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dividend Payout</Label>
                <Select
                  value={editingHolding.dividendPayout}
                  onValueChange={(value) => setEditingHolding(prev => prev ? { ...prev, dividendPayout: value } : null)}
                >
                  <SelectTrigger data-testid="select-edit-payout">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {payoutOptions.map(payout => (
                      <SelectItem key={payout.value} value={payout.value}>{payout.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fund Facts URL</Label>
                <Input
                  value={editingHolding.fundFactsUrl || ""}
                  onChange={(e) => setEditingHolding(prev => prev ? { ...prev, fundFactsUrl: e.target.value } : null)}
                  data-testid="input-edit-fundfacts"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingHolding(null)}>Cancel</Button>
            <Button
              onClick={() => editingHolding && updateHoldingMutation.mutate({ 
                id: editingHolding.id, 
                data: {
                  name: editingHolding.name,
                  category: editingHolding.category,
                  riskLevel: editingHolding.riskLevel,
                  dividendPayout: editingHolding.dividendPayout,
                  fundFactsUrl: editingHolding.fundFactsUrl,
                }
              })}
              disabled={updateHoldingMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateHoldingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingHolding} onOpenChange={(open) => !open && setDeletingHolding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingHolding?.ticker}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the ticker from Universal Holdings. Any positions using this ticker will lose their reference. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingHolding && deleteHoldingMutation.mutate(deletingHolding.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
