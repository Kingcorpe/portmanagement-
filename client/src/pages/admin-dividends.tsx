import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Search, Save, Calculator, DollarSign, Link2, Download, ExternalLink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

interface UniversalHolding {
  id: string;
  ticker: string;
  name: string;
  dividendRate: string;
  dividendYield: string;
  dividendPayout: string;
  price: string;
  dividendSourceUrl?: string;
}

interface FetchResult {
  success: boolean;
  monthlyDividend: number | null;
  annualDividend: number | null;
  parsedFrom: string;
  message: string;
}

export default function AdminDividends() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [editingHolding, setEditingHolding] = useState<UniversalHolding | null>(null);
  const [editValues, setEditValues] = useState<{ monthly: string; annual: string; yield: string; price: string; sourceUrl: string }>({ 
    monthly: "", 
    annual: "", 
    yield: "",
    price: "",
    sourceUrl: ""
  });
  const [fetchResult, setFetchResult] = useState<FetchResult | null>(null);
  const { toast } = useToast();

  const { data: holdings = [], isLoading } = useQuery({
    queryKey: ['/api/universal-holdings'],
    queryFn: async () => {
      const response = await fetch('/api/universal-holdings');
      if (!response.ok) throw new Error('Failed to fetch holdings');
      return response.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, rate, yieldPercent, price, sourceUrl }: { id: string; rate: string; yieldPercent: string; price: string; sourceUrl: string }) => {
      return await apiRequest("PATCH", `/api/universal-holdings/${id}`, {
        dividendRate: rate,
        dividendYield: yieldPercent,
        price: price,
        dividendSourceUrl: sourceUrl || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/universal-holdings'] });
      setEditingHolding(null);
      setFetchResult(null);
      toast({
        title: "Updated",
        description: "Dividend data updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update dividend data",
        variant: "destructive",
      });
    },
  });

  const fetchDividendMutation = useMutation({
    mutationFn: async ({ url, ticker }: { url: string; ticker: string }): Promise<FetchResult> => {
      const response = await fetch("/api/universal-holdings/fetch-dividend-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url, ticker }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch dividend");
      }
      return response.json();
    },
    onSuccess: (data: FetchResult) => {
      setFetchResult(data);
      if (data.success && data.monthlyDividend !== null) {
        // Auto-fill the values
        const monthly = data.monthlyDividend;
        const annual = data.annualDividend || monthly * 12;
        setEditValues(prev => ({
          ...prev,
          monthly: monthly.toFixed(4),
          annual: annual.toFixed(4),
          yield: calculateYield(annual.toFixed(4), prev.price),
        }));
        toast({
          title: "Dividend Found",
          description: data.message,
        });
      } else {
        toast({
          title: "Parse Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      setFetchResult({ success: false, monthlyDividend: null, annualDividend: null, parsedFrom: 'error', message: error.message });
      toast({
        title: "Fetch Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filtered = holdings.filter((h: UniversalHolding) =>
    h.ticker.toLowerCase().includes(search.toLowerCase()) ||
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditClick = (holding: UniversalHolding) => {
    const annualRate = parseFloat(holding.dividendRate) || 0;
    const monthlyRate = annualRate / 12;
    const price = parseFloat(holding.price) || 0;
    const calculatedYield = price > 0 ? (annualRate / price) * 100 : 0;
    
    setEditingHolding(holding);
    setFetchResult(null);
    setEditValues({
      monthly: monthlyRate.toFixed(4),
      annual: holding.dividendRate,
      yield: calculatedYield.toFixed(2),
      price: holding.price,
      sourceUrl: holding.dividendSourceUrl || "",
    });
  };

  const calculateYield = (annual: string, price: string) => {
    const annualNum = parseFloat(annual) || 0;
    const priceNum = parseFloat(price) || 0;
    if (priceNum > 0) {
      return ((annualNum / priceNum) * 100).toFixed(2);
    }
    return "0.00";
  };

  const handleMonthlyChange = (value: string) => {
    const monthly = parseFloat(value) || 0;
    const annual = monthly * 12;
    const annualStr = annual.toFixed(4);
    setEditValues({
      ...editValues,
      monthly: value,
      annual: annualStr,
      yield: calculateYield(annualStr, editValues.price),
    });
  };

  const handlePriceChange = (value: string) => {
    setEditValues({
      ...editValues,
      price: value,
      yield: calculateYield(editValues.annual, value),
    });
  };

  const handleFetchFromUrl = () => {
    if (!editValues.sourceUrl || !editingHolding) return;
    fetchDividendMutation.mutate({ url: editValues.sourceUrl, ticker: editingHolding.ticker });
  };

  const handleSave = () => {
    if (!editingHolding) return;
    updateMutation.mutate({
      id: editingHolding.id,
      rate: editValues.annual,
      yieldPercent: editValues.yield,
      price: editValues.price,
      sourceUrl: editValues.sourceUrl,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const getMonthlyFromAnnual = (annualRate: string) => {
    const annual = parseFloat(annualRate) || 0;
    return (annual / 12).toFixed(4);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Admin - Dividend Management</h1>
      </div>

      {/* Edit Monthly Dividend Dialog */}
      <Dialog open={!!editingHolding} onOpenChange={(open) => { if (!open) { setEditingHolding(null); setFetchResult(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Edit: <span className="font-mono text-primary">{editingHolding?.ticker}</span>
            </DialogTitle>
            <DialogDescription>
              {editingHolding?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* Dividend Source URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Dividend Source URL (optional)
              </label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  value={editValues.sourceUrl}
                  onChange={(e) => setEditValues({ ...editValues, sourceUrl: e.target.value })}
                  placeholder="https://hamiltonetfs.com/etf/..."
                  className="flex-1"
                  data-testid="input-source-url"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleFetchFromUrl}
                  disabled={!editValues.sourceUrl || fetchDividendMutation.isPending}
                  title="Fetch dividend from URL"
                  data-testid="button-fetch-url"
                >
                  {fetchDividendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                {editValues.sourceUrl && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(editValues.sourceUrl, '_blank')}
                    title="Open URL in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {fetchResult && (
                <div className={`flex items-center gap-2 text-sm p-2 rounded ${fetchResult.success ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'}`}>
                  {fetchResult.success ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>{fetchResult.message}</span>
                </div>
              )}
            </div>

            {/* Monthly Dividend Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Monthly Dividend per Unit
              </label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">$</span>
                <Input
                  type="number"
                  step="0.0001"
                  value={editValues.monthly}
                  onChange={(e) => handleMonthlyChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-3xl h-16 font-mono font-bold"
                  placeholder="0.0000"
                  autoFocus
                  data-testid="input-monthly-popup"
                />
              </div>
            </div>

            {/* Calculated Annual Display */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Calculator className="h-4 w-4 flex-shrink-0" />
              <div>
                <span>Annual Dividend: </span>
                <span className="font-mono font-bold text-foreground">${parseFloat(editValues.annual || '0').toFixed(4)}</span>
                <span className="ml-2">(monthly × 12)</span>
              </div>
            </div>

            {/* Price Override Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Price per Unit (override)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={editValues.price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-xl h-12 font-mono"
                  placeholder="0.00"
                  data-testid="input-price-popup"
                />
              </div>
            </div>

            {/* Auto-calculated Yield Display */}
            <div className="flex items-center gap-4 text-sm bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <DollarSign className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="text-muted-foreground">Calculated Yield: </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                  {editValues.yield}%
                </span>
                <span className="text-muted-foreground ml-2">(annual ÷ price × 100)</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="flex-1 h-12 text-lg"
                data-testid="button-save-popup"
              >
                <Save className="h-5 w-5 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setEditingHolding(null); setFetchResult(null); }}
                className="h-12"
                data-testid="button-cancel-popup"
              >
                Cancel
              </Button>
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd> to save
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Update Dividend Data</CardTitle>
          <CardDescription>
            Click on the <span className="text-emerald-600 font-medium">green monthly dividend</span> to edit.
            You can paste a fund company URL to auto-fetch dividend info, or enter manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ticker or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
                data-testid="input-search-holdings"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading holdings...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No holdings found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Calculator className="h-3 w-3" />
                        Monthly Div
                      </div>
                    </TableHead>
                    <TableHead>Annual Div</TableHead>
                    <TableHead>Yield %</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((holding: UniversalHolding) => (
                    <TableRow key={holding.id} data-testid={`row-holding-${holding.ticker}`}>
                      <TableCell className="font-mono font-bold">{holding.ticker}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{holding.name}</TableCell>
                      <TableCell>${parseFloat(holding.price).toFixed(2)}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleEditClick(holding)}
                          className="text-emerald-600 dark:text-emerald-400 font-mono font-bold hover:underline hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer transition-colors px-2 py-1 rounded hover-elevate"
                          data-testid={`button-edit-monthly-${holding.ticker}`}
                        >
                          ${getMonthlyFromAnnual(holding.dividendRate)}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono">${parseFloat(holding.dividendRate).toFixed(4)}</TableCell>
                      <TableCell>{parseFloat(holding.dividendYield).toFixed(2)}%</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {holding.dividendPayout}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {holding.dividendSourceUrl ? (
                          <a
                            href={holding.dividendSourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            title={holding.dividendSourceUrl}
                          >
                            <Link2 className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
