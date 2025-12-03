import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, History, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ETFHolding {
  symbol: string;
  name: string;
  weight: number;
  shares?: number;
  value?: number;
}

interface ETFHoldingsData {
  etfSymbol: string;
  etfName: string;
  totalHoldings: number;
  topHoldings: ETFHolding[];
  asOfDate: string;
  provider: string;
}

interface DistributionRecord {
  date: string;
  amount: number;
  type: "dividend" | "capital_gain" | "return_of_capital";
}

interface ETFHoldingsModalProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
}

// Canadian ETF Provider fund facts URLs
const ETF_PROVIDERS: Record<string, { name: string; fundFactsUrl: (symbol: string) => string }> = {
  BMO: {
    name: "BMO Global Asset Management",
    fundFactsUrl: (symbol) => `https://www.bmogam.com/ca-en/products/${symbol.toLowerCase()}/`,
  },
  ZAG: { name: "BMO", fundFactsUrl: (symbol) => `https://www.bmogam.com/ca-en/products/${symbol.toLowerCase()}/` },
  ZSP: { name: "BMO", fundFactsUrl: (symbol) => `https://www.bmogam.com/ca-en/products/${symbol.toLowerCase()}/` },
  ZDV: { name: "BMO", fundFactsUrl: (symbol) => `https://www.bmogam.com/ca-en/products/${symbol.toLowerCase()}/` },
  ZWB: { name: "BMO", fundFactsUrl: (symbol) => `https://www.bmogam.com/ca-en/products/${symbol.toLowerCase()}/` },
  ZWC: { name: "BMO", fundFactsUrl: (symbol) => `https://www.bmogam.com/ca-en/products/${symbol.toLowerCase()}/` },
  XIC: {
    name: "BlackRock iShares",
    fundFactsUrl: (symbol) => `https://www.blackrock.com/ca/investors/en/products/${symbol.toLowerCase()}/`,
  },
  XSP: { name: "iShares", fundFactsUrl: (symbol) => `https://www.blackrock.com/ca/investors/en/products/${symbol.toLowerCase()}/` },
  XEI: { name: "iShares", fundFactsUrl: (symbol) => `https://www.blackrock.com/ca/investors/en/products/${symbol.toLowerCase()}/` },
  XDV: { name: "iShares", fundFactsUrl: (symbol) => `https://www.blackrock.com/ca/investors/en/products/${symbol.toLowerCase()}/` },
  VCN: {
    name: "Vanguard",
    fundFactsUrl: (symbol) => `https://www.vanguard.ca/en/advisor/products/products-group/etfs/${symbol.toLowerCase()}`,
  },
  VFV: { name: "Vanguard", fundFactsUrl: (symbol) => `https://www.vanguard.ca/en/advisor/products/products-group/etfs/${symbol.toLowerCase()}` },
  VDY: { name: "Vanguard", fundFactsUrl: (symbol) => `https://www.vanguard.ca/en/advisor/products/products-group/etfs/${symbol.toLowerCase()}` },
  VEQT: { name: "Vanguard", fundFactsUrl: (symbol) => `https://www.vanguard.ca/en/advisor/products/products-group/etfs/${symbol.toLowerCase()}` },
  VGRO: { name: "Vanguard", fundFactsUrl: (symbol) => `https://www.vanguard.ca/en/advisor/products/products-group/etfs/${symbol.toLowerCase()}` },
  VBAL: { name: "Vanguard", fundFactsUrl: (symbol) => `https://www.vanguard.ca/en/advisor/products/products-group/etfs/${symbol.toLowerCase()}` },
};

function getProviderInfo(symbol: string) {
  const cleanSymbol = symbol.replace(".TO", "").replace(".V", "").toUpperCase();
  
  // Check direct match first
  if (ETF_PROVIDERS[cleanSymbol]) {
    return ETF_PROVIDERS[cleanSymbol];
  }
  
  // Check prefix
  if (cleanSymbol.startsWith("Z")) {
    return ETF_PROVIDERS.BMO || { name: "BMO", fundFactsUrl: () => "#" };
  }
  if (cleanSymbol.startsWith("X")) {
    return ETF_PROVIDERS.XIC || { name: "iShares", fundFactsUrl: () => "#" };
  }
  if (cleanSymbol.startsWith("V")) {
    return ETF_PROVIDERS.VCN || { name: "Vanguard", fundFactsUrl: () => "#" };
  }
  
  return { name: "Unknown", fundFactsUrl: () => "#" };
}

function HoldingsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

function DistributionHistorySkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(12)].map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function ETFHoldingsModal({ symbol, isOpen, onClose }: ETFHoldingsModalProps) {
  // Fetch ETF holdings
  const { data: holdings, isLoading: holdingsLoading } = useQuery<ETFHoldingsData>({
    queryKey: ["/api/market/etf-holdings", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/market/etf-holdings/${encodeURIComponent(symbol)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch holdings");
      }
      return res.json();
    },
    enabled: isOpen && !!symbol,
  });

  // Fetch distribution history
  const { data: distributions, isLoading: distributionsLoading } = useQuery<DistributionRecord[]>({
    queryKey: ["/api/market/distribution-history", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/market/distribution-history/${encodeURIComponent(symbol)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch distributions");
      return res.json();
    },
    enabled: isOpen && !!symbol,
  });

  const provider = getProviderInfo(symbol);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl font-bold">{symbol}</span>
            {holdings && (
              <Badge variant="outline" className="ml-2">
                {provider.name}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {holdings?.etfName || "Loading ETF details..."}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="holdings" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="holdings" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Holdings
            </TabsTrigger>
            <TabsTrigger value="distributions" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Distributions
            </TabsTrigger>
            <TabsTrigger value="info" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Fund Info
            </TabsTrigger>
          </TabsList>

          {/* Holdings Tab */}
          <TabsContent value="holdings" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Top {holdings?.topHoldings.length || 10} Holdings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px] pr-4">
                  {holdingsLoading ? (
                    <HoldingsSkeleton />
                  ) : !holdings ? (
                    <p className="text-center text-muted-foreground py-8">
                      Holdings data not available for this security
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {holdings.topHoldings.map((holding, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-xs text-muted-foreground w-6">
                                {i + 1}.
                              </span>
                              <span className="font-medium">{holding.symbol}</span>
                              <span className="text-muted-foreground truncate">
                                {holding.name}
                              </span>
                            </div>
                            <span className="font-semibold ml-2">{holding.weight.toFixed(2)}%</span>
                          </div>
                          <Progress value={holding.weight} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {holdings && (
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    As of {new Date(holdings.asOfDate).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distributions Tab */}
          <TabsContent value="distributions" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Distribution History (12 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px] pr-4">
                  {distributionsLoading ? (
                    <DistributionHistorySkeleton />
                  ) : !distributions || distributions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No distribution history available
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {distributions.map((dist, i) => {
                        const prevDist = distributions[i + 1];
                        const change = prevDist
                          ? ((dist.amount - prevDist.amount) / prevDist.amount) * 100
                          : 0;
                        const isIncrease = change > 0;

                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div>
                              <p className="font-medium">
                                {new Date(dist.date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                              <Badge variant="outline" className="text-xs capitalize">
                                {dist.type.replace("_", " ")}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-emerald-500">
                                ${dist.amount.toFixed(4)}
                              </p>
                              {prevDist && change !== 0 && (
                                <div
                                  className={cn(
                                    "flex items-center justify-end gap-1 text-xs",
                                    isIncrease ? "text-emerald-500" : "text-orange-500"
                                  )}
                                >
                                  {isIncrease ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3" />
                                  )}
                                  <span>{Math.abs(change).toFixed(1)}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
                {distributions && distributions.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">12-Month Total</p>
                    <p className="text-xl font-bold text-emerald-500">
                      ${distributions.reduce((sum, d) => sum + d.amount, 0).toFixed(4)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fund Info Tab */}
          <TabsContent value="info" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground">Provider</p>
                  <p className="text-xl font-semibold">{provider.name}</p>
                </div>
                
                <div className="grid gap-3">
                  <a
                    href={provider.fundFactsUrl(symbol)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">Fund Facts / Product Page</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  
                  <a
                    href={`https://finance.yahoo.com/quote/${symbol}.TO`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">Yahoo Finance</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  
                  <a
                    href={`https://www.tradingview.com/symbols/TSX-${symbol.replace(".TO", "")}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">TradingView Chart</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

