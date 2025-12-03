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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  ExternalLink,
  BarChart3,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CryptoDetail {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume24h: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  history: {
    "1M"?: { date: string; price: number }[];
    "3M"?: { date: string; price: number }[];
    "1Y"?: { date: string; price: number }[];
  };
  lastUpdated: string;
}

interface CryptoDetailModalProps {
  symbol: string;
  name: string;
  isOpen: boolean;
  onClose: () => void;
}

// Crypto icons mapping
const cryptoIcons: Record<string, string> = {
  BTC: "₿",
  ETH: "Ξ",
  SOL: "◎",
  XRP: "✕",
  ADA: "₳",
  DOGE: "Ð",
};

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  } else if (price >= 1) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } else {
    return price.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
}

function formatLargeNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toLocaleString()}`;
}

function PriceHistorySkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(10)].map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function PriceHistoryTab({ history, currentPrice }: { history: { date: string; price: number }[]; currentPrice: number }) {
  if (!history || history.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">No historical data available</p>
    );
  }

  const minPrice = Math.min(...history.map((h) => h.price));
  const maxPrice = Math.max(...history.map((h) => h.price));
  const priceRange = maxPrice - minPrice;

  return (
    <div className="space-y-2">
      {history.map((point, i) => {
        const percentage = priceRange > 0 ? ((point.price - minPrice) / priceRange) * 100 : 50;
        const isPositive = point.price >= (history[i - 1]?.price || point.price);
        const changeFromPrev = i > 0 ? point.price - history[i - 1].price : 0;
        const changePercentFromPrev = i > 0 && history[i - 1].price > 0
          ? (changeFromPrev / history[i - 1].price) * 100
          : 0;

        return (
          <div
            key={point.date}
            className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="w-20 text-xs text-muted-foreground">
              {new Date(point.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">${formatPrice(point.price)}</span>
                {i > 0 && changeFromPrev !== 0 && (
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      isPositive ? "text-emerald-500" : "text-orange-500"
                    )}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    <span>{Math.abs(changePercentFromPrev).toFixed(2)}%</span>
                  </div>
                )}
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    isPositive ? "bg-emerald-500/50" : "bg-orange-500/50"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CryptoDetailModal({ symbol, name, isOpen, onClose }: CryptoDetailModalProps) {
  const { data: detail, isLoading, error } = useQuery<CryptoDetail>({
    queryKey: ["/api/market/crypto", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/market/crypto/${encodeURIComponent(symbol)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Crypto detail API error (${res.status}):`, errorText);
        if (res.status === 404) return null;
        throw new Error(`Failed to fetch crypto detail: ${res.status} ${errorText}`);
      }
      const data = await res.json();
      console.log("Crypto detail data:", data);
      return data;
    },
    enabled: isOpen && !!symbol,
    retry: false,
  });

  const isPositive = detail ? detail.change >= 0 : false;
  const icon = cryptoIcons[symbol] || symbol[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">{icon}</span>
            <span className="text-2xl font-bold">{symbol}</span>
            <Badge variant="outline" className="ml-2">
              {name}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {isLoading ? "Loading crypto details..." : `Current price: $${detail ? formatPrice(detail.price) : "—"}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive mb-2">Error loading crypto data</p>
            <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Unknown error"}</p>
          </div>
        ) : !detail ? (
          <p className="text-center text-muted-foreground py-8">
            Crypto data not available
          </p>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="links" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Links
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4">
              <div className="space-y-4">
                {/* Price Card */}
                <Card className="glow-border corner-accents">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Price</p>
                        <p className="text-3xl font-bold">${formatPrice(detail.price)}</p>
                      </div>
                      <div className={cn("text-right", isPositive ? "text-emerald-500" : "text-red-500")}>
                        <div className="flex items-center justify-end gap-1">
                          {isPositive ? (
                            <TrendingUp className="h-5 w-5" />
                          ) : (
                            <TrendingDown className="h-5 w-5" />
                          )}
                          <span className="text-2xl font-bold">
                            {isPositive ? "+" : ""}
                            {detail.changePercent.toFixed(2)}%
                          </span>
                        </div>
                        <p className="text-sm">
                          {isPositive ? "+" : ""}${Math.abs(detail.change).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Market Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Market Cap
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {detail.marketCap > 0 ? formatLargeNumber(detail.marketCap) : "N/A"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        24h Volume
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {detail.volume24h > 0 ? formatLargeNumber(detail.volume24h) : "N/A"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        24h High
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-emerald-500">
                        ${formatPrice(detail.dayHigh)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        24h Low
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-orange-500">
                        ${formatPrice(detail.dayLow)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Previous Close
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        ${formatPrice(detail.previousClose)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Last Updated
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium">
                        {new Date(detail.lastUpdated).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <Tabs defaultValue="1M" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      <TabsTrigger value="1M">1 Month</TabsTrigger>
                      <TabsTrigger value="3M">3 Months</TabsTrigger>
                      <TabsTrigger value="1Y">1 Year</TabsTrigger>
                    </TabsList>

                    <TabsContent value="1M">
                      {isLoading ? (
                        <PriceHistorySkeleton />
                      ) : detail.history["1M"] ? (
                        <PriceHistoryTab history={detail.history["1M"]} currentPrice={detail.price} />
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No 1-month history available
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="3M">
                      {isLoading ? (
                        <PriceHistorySkeleton />
                      ) : detail.history["3M"] ? (
                        <PriceHistoryTab history={detail.history["3M"]} currentPrice={detail.price} />
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No 3-month history available
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="1Y">
                      {isLoading ? (
                        <PriceHistorySkeleton />
                      ) : detail.history["1Y"] ? (
                        <PriceHistoryTab history={detail.history["1Y"]} currentPrice={detail.price} />
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No 1-year history available
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Links Tab */}
            <TabsContent value="links" className="mt-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid gap-3">
                    <a
                      href={`https://finance.yahoo.com/quote/${symbol}-USD`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <span className="font-medium">Yahoo Finance</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>

                    <a
                      href={`https://www.tradingview.com/symbol/${symbol}USD/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <span className="font-medium">TradingView Chart</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>

                    <a
                      href={`https://coinmarketcap.com/currencies/${symbol.toLowerCase()}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <span className="font-medium">CoinMarketCap</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>

                    <a
                      href={`https://www.coingecko.com/en/coins/${symbol.toLowerCase()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <span className="font-medium">CoinGecko</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

