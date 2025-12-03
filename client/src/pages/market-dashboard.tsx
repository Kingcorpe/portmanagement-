import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Globe,
  DollarSign,
  Calendar,
  Building2,
  Landmark,
  Activity,
  RefreshCw,
  Newspaper,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CryptoDetailModal } from "@/components/crypto-detail-modal";

// Types
interface MarketStatus {
  market: string;
  status: "pre-market" | "open" | "closed" | "after-hours";
  statusLabel: string;
  nextEvent: string;
  nextEventTime: string;
  currentTime: string;
  isHoliday: boolean;
  holidayName?: string;
}

interface ExchangeRate {
  pair: string;
  rate: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

interface InterestRateData {
  bankOfCanada: {
    policyRate: number;
    lastChanged: string;
    nextDecision: string;
    trend: "up" | "down" | "hold";
  };
  usFed: {
    federalFundsRate: string;
    lastChanged: string;
    nextMeeting: string;
    trend: "up" | "down" | "hold";
  };
}

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  country: "CA" | "US";
  event: string;
  importance: "high" | "medium" | "low";
  previous?: string;
  forecast?: string;
  actual?: string;
}

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: string;
}

interface MarketOverview {
  markets: { tsx: MarketStatus; nyse: MarketStatus };
  exchangeRate: ExchangeRate;
  indices: MarketIndex[];
  interestRates: InterestRateData;
  crypto: CryptoPrice[];
}

interface DividendEvent {
  symbol: string;
  name: string;
  exDate: string;
  payDate: string;
  amount: number;
  yield: number;
  frequency: string;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  symbols: string[];
}

// Market Status Badge Component
function MarketStatusBadge({ status }: { status: MarketStatus }) {
  const statusColors = {
    open: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "pre-market": "bg-amber-500/20 text-amber-400 border-amber-500/30",
    "after-hours": "bg-purple-500/20 text-purple-400 border-purple-500/30",
    closed: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };

  const statusIcons = {
    open: <Activity className="h-3 w-3 animate-pulse" />,
    "pre-market": <Clock className="h-3 w-3" />,
    "after-hours": <Clock className="h-3 w-3" />,
    closed: <Minus className="h-3 w-3" />,
  };

  return (
    <Badge className={cn("gap-1 border", statusColors[status.status])}>
      {statusIcons[status.status]}
      {status.statusLabel}
    </Badge>
  );
}

// Market Card Component
function MarketCard({ status, flag }: { status: MarketStatus; flag: string }) {
  return (
    <Card className="holo-card hover-elevate">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{flag}</span>
            <div>
              <h3 className="font-semibold">{status.market}</h3>
              <p className="text-xs text-muted-foreground">{status.currentTime}</p>
            </div>
          </div>
          <MarketStatusBadge status={status} />
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">{status.nextEvent}:</span>{" "}
          {status.nextEventTime}
        </div>
      </CardContent>
    </Card>
  );
}

// Index Card Component
function IndexCard({ index }: { index: MarketIndex }) {
  const isPositive = index.change >= 0;
  
  return (
    <Card className="holo-card hover-elevate group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{index.name}</p>
            <p className="text-2xl font-bold tracking-tight">
              {index.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div
            className={cn(
              "text-right",
              isPositive ? "text-emerald-500" : "text-red-500"
            )}
          >
            <div className="flex items-center justify-end gap-1">
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <span className="font-semibold">{Math.abs(index.changePercent).toFixed(2)}%</span>
            </div>
            <p className="text-xs">
              {isPositive ? "+" : ""}
              {index.change.toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Crypto Card Component
function CryptoCard({ crypto, onClick }: { crypto: CryptoPrice; onClick?: () => void }) {
  const isPositive = crypto.change >= 0;
  
  // Crypto icons mapping
  const cryptoIcons: Record<string, string> = {
    BTC: "₿",
    ETH: "Ξ",
    SOL: "◎",
    XRP: "✕",
    ADA: "₳",
    DOGE: "Ð",
  };
  
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
    } else if (price >= 1) {
      return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } else {
      return price.toLocaleString(undefined, { maximumFractionDigits: 4 });
    }
  };
  
  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toLocaleString()}`;
  };
  
  return (
    <Card 
      className={cn(
        "holo-card hover-elevate group",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">
              {cryptoIcons[crypto.symbol] || crypto.symbol[0]}
            </span>
            <div>
              <p className="font-semibold">{crypto.symbol}</p>
              <p className="text-xs text-muted-foreground">{crypto.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">${formatPrice(crypto.price)}</p>
            <div
              className={cn(
                "flex items-center justify-end gap-1 text-sm",
                isPositive ? "text-emerald-500" : "text-red-500"
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              <span>{Math.abs(crypto.changePercent).toFixed(2)}%</span>
            </div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-border/50 flex justify-between text-xs text-muted-foreground">
          <span>MCap: {formatMarketCap(crypto.marketCap)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Exchange Rate Widget
function ExchangeRateWidget({ rate }: { rate: ExchangeRate }) {
  const isPositive = rate.change >= 0;
  
  return (
    <Card className="glow-border corner-accents">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{rate.pair}</p>
            <p className="text-2xl font-bold">{rate.rate.toFixed(4)}</p>
          </div>
          <div className={cn("text-right", isPositive ? "text-emerald-500" : "text-red-500")}>
            <p className="font-medium">{isPositive ? "+" : ""}{rate.change.toFixed(4)}</p>
            <p className="text-xs">{isPositive ? "+" : ""}{rate.changePercent.toFixed(2)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Interest Rates Widget
function InterestRatesWidget({ rates }: { rates: InterestRateData }) {
  const trendIcons = {
    up: <TrendingUp className="h-4 w-4 text-red-500" />,
    down: <TrendingDown className="h-4 w-4 text-emerald-500" />,
    hold: <Minus className="h-4 w-4 text-zinc-500" />,
  };

  return (
    <Card className="glow-border corner-accents">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Landmark className="h-5 w-5 text-primary" />
          Central Bank Rates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bank of Canada */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🇨🇦</span>
            <div>
              <p className="font-medium">Bank of Canada</p>
              <p className="text-xs text-muted-foreground">
                Next: {new Date(rates.bankOfCanada.nextDecision).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="text-right flex items-center gap-2">
            <span className="text-2xl font-bold">{rates.bankOfCanada.policyRate}%</span>
            {trendIcons[rates.bankOfCanada.trend]}
          </div>
        </div>
        
        {/* US Fed */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🇺🇸</span>
            <div>
              <p className="font-medium">US Federal Reserve</p>
              <p className="text-xs text-muted-foreground">
                Next: {new Date(rates.usFed.nextMeeting).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="text-right flex items-center gap-2">
            <span className="text-2xl font-bold">{rates.usFed.federalFundsRate}%</span>
            {trendIcons[rates.usFed.trend]}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Economic Calendar Widget
function EconomicCalendarWidget({ events }: { events: EconomicEvent[] }) {
  const importanceColors = {
    high: "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };

  const groupedEvents = events.reduce((acc, event) => {
    const date = event.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, EconomicEvent[]>);

  return (
    <Card className="glow-border corner-accents h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Economic Calendar
        </CardTitle>
        <CardDescription>Upcoming events affecting markets</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                <p className="text-sm font-semibold text-muted-foreground mb-2">
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <div className="space-y-2">
                  {dateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-lg">{event.country === "CA" ? "🇨🇦" : "🇺🇸"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{event.event}</p>
                        <p className="text-xs text-muted-foreground">{event.time} ET</p>
                      </div>
                      <Badge className={cn("border text-xs", importanceColors[event.importance])}>
                        {event.importance}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Dividend Calendar Widget
function DividendCalendarWidget({ dividends, isLoading, error }: { dividends: DividendEvent[]; isLoading: boolean; error?: Error | null }) {
  if (isLoading) {
    return (
      <Card className="glow-border corner-accents h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-primary" />
            Dividend Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glow-border corner-accents h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-primary" />
          Dividend Calendar
        </CardTitle>
        <CardDescription>Upcoming ex-dividend dates for your holdings</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-2">Error loading dividends</p>
              <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : "Unknown error"}</p>
            </div>
          ) : dividends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No upcoming dividends in the next 90 days
            </p>
          ) : (
            <div className="space-y-3">
              {dividends.map((div, i) => (
                <div
                  key={`${div.symbol}-${i}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-semibold">{div.symbol}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {div.name}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Ex-Date</p>
                    <p className="font-medium">
                      {new Date(div.exDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-500">${div.amount.toFixed(4)}</p>
                    <p className="text-xs text-muted-foreground">{div.yield}% yield</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// News Widget
function NewsWidget({ news, isLoading }: { news: NewsItem[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card className="glow-border corner-accents h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Newspaper className="h-5 w-5 text-primary" />
            Portfolio News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glow-border corner-accents h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Newspaper className="h-5 w-5 text-primary" />
          Portfolio News
        </CardTitle>
        <CardDescription>Latest news for your holdings</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {news.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent news for your holdings
            </p>
          ) : (
            <div className="space-y-3">
              {news.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <p className="font-medium line-clamp-2 mb-1">{item.title}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.source}</span>
                    <span>
                      {new Date(item.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function MarketDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-20" />
      <Skeleton className="h-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

export default function MarketDashboard() {
  const [selectedCrypto, setSelectedCrypto] = useState<{ symbol: string; name: string } | null>(null);

  // Fetch market overview data
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery<MarketOverview>({
    queryKey: ["/api/market/overview"],
  });

  // Fetch economic calendar
  const { data: economicEvents, isLoading: eventsLoading } = useQuery<EconomicEvent[]>({
    queryKey: ["/api/market/economic-calendar"],
  });

  // Get user's position symbols for dividend calendar and news
  const { data: positions } = useQuery<{ symbol: string }[]>({
    queryKey: ["/api/universal-holdings"],
    select: (data: any) => {
      // Handle both 'symbol' and 'ticker' fields
      return data?.map((h: any) => ({ symbol: h.symbol || h.ticker })) || [];
    },
  });

  const symbols = positions?.map((p) => p.symbol).filter(Boolean) || [];
  
  console.log("Market Dashboard - Symbols for dividend calendar:", symbols);

  // Fetch dividend calendar for user's holdings
  const { data: dividends, isLoading: dividendsLoading, error: dividendsError } = useQuery<DividendEvent[]>({
    queryKey: ["/api/market/dividend-calendar", symbols],
    queryFn: async () => {
      // Always fetch dividends, even if no symbols (shows all holdings with dividend data)
      const res = await fetch("/api/market/dividend-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: symbols.length > 0 ? symbols.slice(0, 20) : [] }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Dividend calendar API error:", res.status, errorText);
        throw new Error(`Failed to fetch dividends: ${res.status}`);
      }
      const data = await res.json();
      console.log("Dividend calendar data received:", data.length, "dividends");
      return data;
    },
    enabled: true, // Always enabled to show all dividend-paying holdings
  });

  // Fetch news for user's holdings
  const { data: news, isLoading: newsLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/market/news", symbols],
    queryFn: async () => {
      if (symbols.length === 0) return [];
      const res = await fetch("/api/market/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: symbols.slice(0, 5) }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch news");
      return res.json();
    },
    enabled: symbols.length > 0,
  });

  if (overviewLoading || eventsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Market Dashboard</h1>
            <p className="text-muted-foreground">Real-time market data and economic indicators</p>
          </div>
        </div>
        <MarketDashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Market Dashboard</h1>
          <p className="text-muted-foreground">Real-time market data and economic indicators</p>
        </div>
        <button
          onClick={() => refetchOverview()}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Market Status */}
        <div className="grid gap-4 md:grid-cols-2">
          {overview && (
            <>
              <MarketCard status={overview.markets.tsx} flag="🇨🇦" />
              <MarketCard status={overview.markets.nyse} flag="🇺🇸" />
            </>
          )}
        </div>

        {/* Market Indices */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Market Indices
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {overview?.indices.map((index) => (
              <IndexCard key={index.symbol} index={index} />
            ))}
          </div>
        </div>

        {/* Cryptocurrency */}
        {overview?.crypto && overview.crypto.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary text-xl">₿</span>
              Cryptocurrency
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {overview.crypto.map((crypto) => (
                <CryptoCard
                  key={crypto.symbol}
                  crypto={crypto}
                  onClick={() => setSelectedCrypto({ symbol: crypto.symbol, name: crypto.name })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Exchange Rate & Interest Rates */}
        <div className="grid gap-4 md:grid-cols-2">
          {overview && <ExchangeRateWidget rate={overview.exchangeRate} />}
          {overview && <InterestRatesWidget rates={overview.interestRates} />}
        </div>

        {/* Tabs for Calendar and News */}
        <Tabs defaultValue="economic" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="economic" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Economic Calendar
            </TabsTrigger>
            <TabsTrigger value="dividends" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Dividends
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              News
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="economic">
            {economicEvents && <EconomicCalendarWidget events={economicEvents} />}
          </TabsContent>
          
          <TabsContent value="dividends">
            <DividendCalendarWidget
              dividends={dividends || []}
              isLoading={dividendsLoading}
              error={dividendsError}
            />
            {dividends && dividends.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Showing {dividends.length} upcoming dividend(s)
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="news">
            <NewsWidget
              news={news || []}
              isLoading={newsLoading}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Crypto Detail Modal */}
      {selectedCrypto && (
        <CryptoDetailModal
          symbol={selectedCrypto.symbol}
          name={selectedCrypto.name}
          isOpen={!!selectedCrypto}
          onClose={() => setSelectedCrypto(null)}
        />
      )}
    </div>
  );
}

