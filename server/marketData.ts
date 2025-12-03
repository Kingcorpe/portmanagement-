// Market Data Service - Canadian Market Info, Exchange Rates, Economic Calendar
import type { Request, Response, Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { universalHoldings } from "@shared/schema";
import { eq, and, isNotNull, or } from "drizzle-orm";

// Cache for API responses to avoid rate limiting
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache: Map<string, CacheEntry<any>> = new Map();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
}

// Market hours configuration
const MARKET_CONFIG = {
  TSX: {
    name: "Toronto Stock Exchange",
    timezone: "America/Toronto",
    preMarketOpen: { hour: 7, minute: 0 },
    marketOpen: { hour: 9, minute: 30 },
    marketClose: { hour: 16, minute: 0 },
    afterHoursClose: { hour: 17, minute: 0 },
  },
  NYSE: {
    name: "New York Stock Exchange",
    timezone: "America/New_York",
    preMarketOpen: { hour: 4, minute: 0 },
    marketOpen: { hour: 9, minute: 30 },
    marketClose: { hour: 16, minute: 0 },
    afterHoursClose: { hour: 20, minute: 0 },
  },
};

// Canadian holidays 2024-2025
const CANADIAN_HOLIDAYS = [
  "2024-01-01", "2024-02-19", "2024-03-29", "2024-05-20", "2024-07-01",
  "2024-08-05", "2024-09-02", "2024-10-14", "2024-11-11", "2024-12-25", "2024-12-26",
  "2025-01-01", "2025-02-17", "2025-04-18", "2025-05-19", "2025-07-01",
  "2025-08-04", "2025-09-01", "2025-10-13", "2025-11-11", "2025-12-25", "2025-12-26",
];

// US holidays 2024-2025
const US_HOLIDAYS = [
  "2024-01-01", "2024-01-15", "2024-02-19", "2024-03-29", "2024-05-27",
  "2024-06-19", "2024-07-04", "2024-09-02", "2024-11-28", "2024-12-25",
  "2025-01-01", "2025-01-20", "2025-02-17", "2025-04-18", "2025-05-26",
  "2025-06-19", "2025-07-04", "2025-09-01", "2025-11-27", "2025-12-25",
];

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

function getMarketStatus(market: "TSX" | "NYSE"): MarketStatus {
  const config = MARKET_CONFIG[market];
  const holidays = market === "TSX" ? CANADIAN_HOLIDAYS : US_HOLIDAYS;
  
  // Get current time in the market's timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const dateStr = `${parts.find(p => p.type === "year")?.value}-${parts.find(p => p.type === "month")?.value}-${parts.find(p => p.type === "day")?.value}`;
  const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
  const currentMinutes = hour * 60 + minute;
  
  const dayOfWeek = new Date(dateStr).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = holidays.includes(dateStr);
  
  const preMarketMinutes = config.preMarketOpen.hour * 60 + config.preMarketOpen.minute;
  const openMinutes = config.marketOpen.hour * 60 + config.marketOpen.minute;
  const closeMinutes = config.marketClose.hour * 60 + config.marketClose.minute;
  const afterHoursMinutes = config.afterHoursClose.hour * 60 + config.afterHoursClose.minute;
  
  let status: MarketStatus["status"];
  let statusLabel: string;
  let nextEvent: string;
  let nextEventTime: string;
  
  if (isWeekend || isHoliday) {
    status = "closed";
    statusLabel = isWeekend ? "Weekend" : "Holiday";
    nextEvent = "Market Opens";
    nextEventTime = "Next trading day";
  } else if (currentMinutes < preMarketMinutes) {
    status = "closed";
    statusLabel = "Overnight";
    nextEvent = "Pre-Market";
    nextEventTime = `${config.preMarketOpen.hour}:${String(config.preMarketOpen.minute).padStart(2, "0")}`;
  } else if (currentMinutes < openMinutes) {
    status = "pre-market";
    statusLabel = "Pre-Market";
    nextEvent = "Market Open";
    nextEventTime = `${config.marketOpen.hour}:${String(config.marketOpen.minute).padStart(2, "0")}`;
  } else if (currentMinutes < closeMinutes) {
    status = "open";
    statusLabel = "Market Open";
    nextEvent = "Market Close";
    nextEventTime = `${config.marketClose.hour}:${String(config.marketClose.minute).padStart(2, "0")}`;
  } else if (currentMinutes < afterHoursMinutes) {
    status = "after-hours";
    statusLabel = "After Hours";
    nextEvent = "Session End";
    nextEventTime = `${config.afterHoursClose.hour}:${String(config.afterHoursClose.minute).padStart(2, "0")}`;
  } else {
    status = "closed";
    statusLabel = "Closed";
    nextEvent = "Pre-Market";
    nextEventTime = "Tomorrow";
  }
  
  return {
    market: config.name,
    status,
    statusLabel,
    nextEvent,
    nextEventTime,
    currentTime: `${hour}:${String(minute).padStart(2, "0")}`,
    isHoliday,
  };
}

interface ExchangeRate {
  pair: string;
  rate: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

async function fetchExchangeRate(): Promise<ExchangeRate> {
  const cached = getCached<ExchangeRate>("usdcad");
  if (cached) return cached;
  
  try {
    // Use Yahoo Finance for exchange rate
    const response = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/USDCAD=X?interval=1d&range=2d",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }
    );
    
    if (!response.ok) throw new Error("Failed to fetch exchange rate");
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    const meta = result?.meta;
    const quotes = result?.indicators?.quote?.[0];
    
    if (!meta || !quotes) throw new Error("Invalid response format");
    
    const currentPrice = meta.regularMarketPrice || quotes.close?.[quotes.close.length - 1];
    const previousClose = meta.chartPreviousClose || quotes.close?.[0];
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;
    
    const exchangeRate: ExchangeRate = {
      pair: "USD/CAD",
      rate: parseFloat(currentPrice.toFixed(4)),
      change: parseFloat(change.toFixed(4)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      lastUpdated: new Date().toISOString(),
    };
    
    setCache("usdcad", exchangeRate, 60000); // Cache for 1 minute
    return exchangeRate;
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    // Return fallback data
    return {
      pair: "USD/CAD",
      rate: 1.36,
      change: 0,
      changePercent: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}

interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

async function fetchMarketIndices(): Promise<MarketIndex[]> {
  const cached = getCached<MarketIndex[]>("indices");
  if (cached) return cached;
  
  const indices = [
    { symbol: "^GSPTSE", name: "S&P/TSX Composite" },
    { symbol: "^GSPC", name: "S&P 500" },
    { symbol: "^DJI", name: "Dow Jones" },
    { symbol: "^IXIC", name: "NASDAQ" },
  ];
  
  const results: MarketIndex[] = [];
  
  for (const index of indices) {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(index.symbol)}?interval=1d&range=2d`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        }
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const result = data.chart?.result?.[0];
      const meta = result?.meta;
      
      if (!meta) continue;
      
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.chartPreviousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;
      
      results.push({
        symbol: index.symbol,
        name: index.name,
        price: parseFloat(currentPrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error fetching ${index.symbol}:`, error);
    }
  }
  
  if (results.length > 0) {
    setCache("indices", results, 60000); // Cache for 1 minute
  }
  
  return results;
}

// Cryptocurrency prices
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

async function fetchCryptoPrices(): Promise<CryptoPrice[]> {
  const cached = getCached<CryptoPrice[]>("crypto");
  if (cached) return cached;
  
  const cryptos = [
    { symbol: "BTC-USD", name: "Bitcoin" },
    { symbol: "ETH-USD", name: "Ethereum" },
    { symbol: "SOL-USD", name: "Solana" },
    { symbol: "XRP-USD", name: "XRP" },
    { symbol: "ADA-USD", name: "Cardano" },
    { symbol: "DOGE-USD", name: "Dogecoin" },
  ];
  
  const results: CryptoPrice[] = [];
  
  for (const crypto of cryptos) {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(crypto.symbol)}?interval=1d&range=2d`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        }
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const result = data.chart?.result?.[0];
      const meta = result?.meta;
      
      if (!meta) continue;
      
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.chartPreviousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;
      
      results.push({
        symbol: crypto.symbol.replace("-USD", ""),
        name: crypto.name,
        price: currentPrice,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        marketCap: meta.marketCap || 0,
        volume24h: meta.regularMarketVolume || 0,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error fetching ${crypto.symbol}:`, error);
    }
  }
  
  if (results.length > 0) {
    setCache("crypto", results, 60000); // Cache for 1 minute
  }
  
  return results;
}

// Bank of Canada interest rate (manually updated, changes infrequently)
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

function getInterestRates(): InterestRateData {
  // These rates need to be updated when central banks make announcements
  // In production, you'd want to scrape or use an API for this
  return {
    bankOfCanada: {
      policyRate: 3.75,
      lastChanged: "2024-10-23",
      nextDecision: "2024-12-11",
      trend: "down",
    },
    usFed: {
      federalFundsRate: "4.50-4.75",
      lastChanged: "2024-11-07",
      nextMeeting: "2024-12-18",
      trend: "down",
    },
  };
}

// Economic Calendar Events
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

function getEconomicCalendar(): EconomicEvent[] {
  // In production, this would come from an economic calendar API
  // For now, returning key upcoming events
  const today = new Date();
  const events: EconomicEvent[] = [];
  
  // Generate some realistic upcoming events
  const upcomingEvents = [
    { dayOffset: 1, country: "CA" as const, event: "Housing Starts", importance: "medium" as const },
    { dayOffset: 2, country: "US" as const, event: "Initial Jobless Claims", importance: "medium" as const },
    { dayOffset: 3, country: "CA" as const, event: "Employment Change", importance: "high" as const },
    { dayOffset: 5, country: "US" as const, event: "Consumer Price Index (CPI)", importance: "high" as const },
    { dayOffset: 7, country: "CA" as const, event: "Bank of Canada Rate Decision", importance: "high" as const },
    { dayOffset: 10, country: "US" as const, event: "FOMC Meeting Minutes", importance: "high" as const },
    { dayOffset: 12, country: "CA" as const, event: "Retail Sales", importance: "medium" as const },
    { dayOffset: 14, country: "US" as const, event: "GDP (Q3)", importance: "high" as const },
  ];
  
  upcomingEvents.forEach((e, i) => {
    const eventDate = new Date(today);
    eventDate.setDate(today.getDate() + e.dayOffset);
    
    events.push({
      id: `event-${i}`,
      date: eventDate.toISOString().split("T")[0],
      time: "08:30",
      country: e.country,
      event: e.event,
      importance: e.importance,
    });
  });
  
  return events;
}

// News for portfolio holdings
interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  symbols: string[];
  sentiment?: "positive" | "negative" | "neutral";
}

async function fetchNewsForSymbols(symbols: string[]): Promise<NewsItem[]> {
  const cacheKey = `news-${symbols.sort().join(",")}`;
  const cached = getCached<NewsItem[]>(cacheKey);
  if (cached) return cached;
  
  const news: NewsItem[] = [];
  
  // Use Yahoo Finance news endpoint
  for (const symbol of symbols.slice(0, 5)) { // Limit to 5 symbols
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=3`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        }
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data.news && Array.isArray(data.news)) {
        data.news.forEach((item: any, i: number) => {
          if (!news.find(n => n.title === item.title)) { // Avoid duplicates
            news.push({
              id: `${symbol}-${i}`,
              title: item.title || "No title",
              summary: item.title || "", // Yahoo doesn't provide full summary in search
              source: item.publisher || "Unknown",
              url: item.link || "#",
              publishedAt: new Date(item.providerPublishTime * 1000).toISOString(),
              symbols: [symbol],
            });
          }
        });
      }
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
    }
  }
  
  // Sort by date, most recent first
  news.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  
  if (news.length > 0) {
    setCache(cacheKey, news.slice(0, 15), 300000); // Cache for 5 minutes
  }
  
  return news.slice(0, 15);
}

// Dividend Calendar
interface DividendEvent {
  symbol: string;
  name: string;
  exDate: string;
  payDate: string;
  amount: number;
  yield: number;
  frequency: string;
}

async function fetchDividendCalendar(symbols: string[]): Promise<DividendEvent[]> {
  const cacheKey = `dividends-${symbols.sort().join(",")}`;
  const cached = getCached<DividendEvent[]>(cacheKey);
  if (cached) return cached;
  
  const dividends: DividendEvent[] = [];
  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  
  // First, get dividend data from database (universal holdings)
  try {
    console.log(`[Dividend Calendar] Fetching for ${symbols.length} symbols:`, symbols);
    
    // Always get ALL holdings with dividend data (don't filter by symbols list)
    // This ensures we show all monthly ETFs even if they're not in the user's current positions
    const holdings = await db
      .select({
        ticker: universalHoldings.ticker,
        name: universalHoldings.name,
        dividendRate: universalHoldings.dividendRate,
        dividendYield: universalHoldings.dividendYield,
        dividendPayout: universalHoldings.dividendPayout,
        exDividendDate: universalHoldings.exDividendDate,
      })
      .from(universalHoldings)
      .where(
        or(
          isNotNull(universalHoldings.dividendRate),
          isNotNull(universalHoldings.exDividendDate)
        )
      );
    
    console.log(`[Dividend Calendar] Found ${holdings.length} holdings with dividend data in database`);
    
    // Process ALL holdings with dividend data (don't filter by symbols)
    // This shows all monthly/quarterly ETFs in the calendar
    for (const holding of holdings) {
      console.log(`[Dividend Calendar] Processing ${holding.ticker}: rate=${holding.dividendRate}, yield=${holding.dividendYield}, payout=${holding.dividendPayout}, exDate=${holding.exDividendDate}`);
      
      const dividendRate = parseFloat(holding.dividendRate || "0");
      const dividendYield = parseFloat(holding.dividendYield || "0");
      const frequency = (holding.dividendPayout && holding.dividendPayout !== "none") 
        ? holding.dividendPayout 
        : "monthly"; // Default to monthly for Canadian income ETFs
      
      // Calculate per-payment amount based on frequency
      let perPaymentAmount = 0;
      if (dividendRate > 0) {
        switch (frequency) {
          case "monthly":
            perPaymentAmount = dividendRate / 12;
            break;
          case "quarterly":
            perPaymentAmount = dividendRate / 4;
            break;
          case "semi_annual":
            perPaymentAmount = dividendRate / 2;
            break;
          case "annual":
            perPaymentAmount = dividendRate;
            break;
        }
      }
      
      // Use stored ex-dividend date if available and in the future
      if (holding.exDividendDate) {
        const exDate = new Date(holding.exDividendDate);
        if (exDate >= now && exDate <= ninetyDaysFromNow) {
          dividends.push({
            symbol: holding.ticker.toUpperCase(),
            name: holding.name || holding.ticker,
            exDate: exDate.toISOString().split("T")[0],
            payDate: "", // Will be calculated or fetched separately
            amount: perPaymentAmount,
            yield: dividendYield,
            frequency: frequency,
          });
          continue; // Skip Yahoo Finance lookup if we have database data
        }
      }
      
      // If no ex-date in database but we have dividend data, calculate next expected date
      if (dividendRate > 0) {
        // Calculate next expected ex-date based on frequency
        let nextExDate = new Date(now);
        
        switch (frequency) {
          case "monthly":
            // Next month, around the same day (or last day of month if day doesn't exist)
            nextExDate.setMonth(nextExDate.getMonth() + 1);
            // For monthly ETFs, ex-dates are typically around the 15th-20th
            nextExDate.setDate(15);
            break;
          case "quarterly":
            // Next quarter
            const currentQuarter = Math.floor(nextExDate.getMonth() / 3);
            nextExDate.setMonth((currentQuarter + 1) * 3);
            nextExDate.setDate(1);
            break;
          case "semi_annual":
            // Next 6 months
            nextExDate.setMonth(nextExDate.getMonth() + 6);
            nextExDate.setDate(1);
            break;
          case "annual":
            // Next year
            nextExDate.setFullYear(nextExDate.getFullYear() + 1);
            nextExDate.setMonth(0);
            nextExDate.setDate(1);
            break;
        }
        
        // Only add if within 90 days
        if (nextExDate <= ninetyDaysFromNow) {
          dividends.push({
            symbol: holding.ticker.toUpperCase(),
            name: holding.name || holding.ticker,
            exDate: nextExDate.toISOString().split("T")[0],
            payDate: "",
            amount: perPaymentAmount,
            yield: dividendYield,
            frequency: frequency,
          });
        }
      }
    }
  } catch (error) {
    console.error("Error fetching dividend data from database:", error);
  }
  
  // Also try Yahoo Finance for symbols not in database or to get more accurate dates
  const yahooFinance = (await import("yahoo-finance2")).default;
  const symbolsInDb = new Set(dividends.map(d => d.symbol.toUpperCase()));
  const symbolsToFetch = symbols
    .slice(0, 20)
    .filter(s => !symbolsInDb.has(s.toUpperCase()));
  
  for (const rawSymbol of symbolsToFetch) {
    try {
      // Normalize Canadian tickers
      let symbol = rawSymbol;
      if (!symbol.includes(".") && !/^[A-Z]{1,5}$/.test(symbol)) {
        symbol = `${rawSymbol}.TO`;
      }
      
      const symbolsToTry = [symbol];
      if (!symbol.includes(".")) {
        symbolsToTry.push(`${symbol}.TO`, `${symbol}.V`);
      }
      
      for (const trySymbol of symbolsToTry) {
        try {
          const result = await yahooFinance.quoteSummary(trySymbol, {
            modules: ["summaryDetail", "calendarEvents", "price"],
          }) as any;
          
          if (result?.calendarEvents?.exDividendDate || result?.summaryDetail?.exDividendDate) {
            const exDate = result.calendarEvents?.exDividendDate || result.summaryDetail?.exDividendDate;
            const payDate = result.calendarEvents?.dividendDate;
            const amount = result.summaryDetail?.dividendRate || 0;
            const yieldVal = result.summaryDetail?.dividendYield || 0;
            const name = result.price?.shortName || result.price?.longName || trySymbol;
            
            if (exDate) {
              const exDateObj = new Date(exDate);
              if (exDateObj >= now && exDateObj <= ninetyDaysFromNow) {
                // Determine frequency from dividend rate
                let frequency = "monthly";
                if (amount > 0) {
                  const monthlyEstimate = amount / 12;
                  // If the rate suggests quarterly or other, we can infer
                  frequency = "monthly"; // Default for Canadian income ETFs
                }
                
                dividends.push({
                  symbol: rawSymbol.toUpperCase(),
                  name,
                  exDate: exDateObj.toISOString().split("T")[0],
                  payDate: payDate ? new Date(payDate).toISOString().split("T")[0] : "",
                  amount: parseFloat((amount / 12).toFixed(4)), // Convert annual to monthly estimate
                  yield: parseFloat((yieldVal * 100).toFixed(2)),
                  frequency: frequency,
                });
              }
            }
            break;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      console.error(`Error fetching dividend for ${rawSymbol}:`, error);
    }
  }
  
  console.log(`[Dividend Calendar] Found ${dividends.length} dividend events before deduplication`);
  
  // Sort by ex-date
  dividends.sort((a, b) => new Date(a.exDate).getTime() - new Date(b.exDate).getTime());
  
  // Remove duplicates (same symbol and similar ex-date)
  const uniqueDividends = dividends.reduce((acc, div) => {
    const existing = acc.find(d => d.symbol === div.symbol);
    if (!existing || new Date(div.exDate) < new Date(existing.exDate)) {
      return acc.filter(d => d.symbol !== div.symbol).concat([div]);
    }
    return acc;
  }, [] as DividendEvent[]);
  
  console.log(`[Dividend Calendar] Returning ${uniqueDividends.length} unique dividend events`);
  
  if (uniqueDividends.length > 0) {
    setCache(cacheKey, uniqueDividends, 3600000); // Cache for 1 hour
  }
  
  return uniqueDividends;
}

// ETF Holdings breakdown
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

async function fetchETFHoldings(symbol: string): Promise<ETFHoldingsData | null> {
  const cacheKey = `etf-holdings-${symbol}`;
  const cached = getCached<ETFHoldingsData>(cacheKey);
  if (cached) return cached;
  
  try {
    const yahooFinance = (await import("yahoo-finance2")).default;
    
    // Normalize symbol
    let trySymbol = symbol;
    if (!symbol.includes(".")) {
      trySymbol = `${symbol}.TO`;
    }
    
    const result = await yahooFinance.quoteSummary(trySymbol, {
      modules: ["topHoldings", "assetProfile", "price"],
    }) as any;
    
    if (!result?.topHoldings?.holdings) {
      return null;
    }
    
    const holdings: ETFHolding[] = result.topHoldings.holdings.map((h: any) => ({
      symbol: h.symbol || "N/A",
      name: h.holdingName || h.symbol || "Unknown",
      weight: parseFloat(((h.holdingPercent || 0) * 100).toFixed(2)),
    }));
    
    const data: ETFHoldingsData = {
      etfSymbol: symbol,
      etfName: result.price?.shortName || result.price?.longName || symbol,
      totalHoldings: result.topHoldings.holdings?.length || 0,
      topHoldings: holdings.slice(0, 10),
      asOfDate: new Date().toISOString().split("T")[0],
      provider: result.assetProfile?.sector || "ETF",
    };
    
    setCache(cacheKey, data, 86400000); // Cache for 24 hours
    return data;
  } catch (error) {
    console.error(`Error fetching ETF holdings for ${symbol}:`, error);
    return null;
  }
}

// Distribution History
interface DistributionRecord {
  date: string;
  amount: number;
  type: "dividend" | "capital_gain" | "return_of_capital";
}

async function fetchDistributionHistory(symbol: string): Promise<DistributionRecord[]> {
  const cacheKey = `dist-history-${symbol}`;
  const cached = getCached<DistributionRecord[]>(cacheKey);
  if (cached) return cached;
  
  try {
    const yahooFinance = (await import("yahoo-finance2")).default;
    
    // Normalize symbol
    let trySymbol = symbol;
    if (!symbol.includes(".")) {
      trySymbol = `${symbol}.TO`;
    }
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const result = await yahooFinance.chart(trySymbol, {
      period1: oneYearAgo,
      period2: new Date(),
      events: "div",
    }) as any;
    
    const distributions: DistributionRecord[] = [];
    
    if (result?.events?.dividends) {
      Object.values(result.events.dividends).forEach((div: any) => {
        distributions.push({
          date: new Date(div.date * 1000).toISOString().split("T")[0],
          amount: parseFloat(div.amount.toFixed(4)),
          type: "dividend",
        });
      });
    }
    
    // Sort by date, most recent first
    distributions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (distributions.length > 0) {
      setCache(cacheKey, distributions, 86400000); // Cache for 24 hours
    }
    
    return distributions;
  } catch (error) {
    console.error(`Error fetching distribution history for ${symbol}:`, error);
    return [];
  }
}

// Register all market data routes
export function registerMarketDataRoutes(app: Express) {
  // Market status
  app.get("/api/market/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tsx = getMarketStatus("TSX");
      const nyse = getMarketStatus("NYSE");
      res.json({ tsx, nyse });
    } catch (error) {
      console.error("Error getting market status:", error);
      res.status(500).json({ message: "Failed to get market status" });
    }
  });
  
  // Exchange rate
  app.get("/api/market/exchange-rate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const rate = await fetchExchangeRate();
      res.json(rate);
    } catch (error) {
      console.error("Error getting exchange rate:", error);
      res.status(500).json({ message: "Failed to get exchange rate" });
    }
  });
  
  // Market indices
  app.get("/api/market/indices", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const indices = await fetchMarketIndices();
      res.json(indices);
    } catch (error) {
      console.error("Error getting market indices:", error);
      res.status(500).json({ message: "Failed to get market indices" });
    }
  });
  
  // Interest rates
  app.get("/api/market/interest-rates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const rates = getInterestRates();
      res.json(rates);
    } catch (error) {
      console.error("Error getting interest rates:", error);
      res.status(500).json({ message: "Failed to get interest rates" });
    }
  });
  
  // Crypto detail with history (must come before /api/market/crypto)
  app.get("/api/market/crypto/:symbol", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const symbolWithSuffix = `${symbol.toUpperCase()}-USD`;
      
      console.log(`[Crypto Detail] Fetching data for ${symbolWithSuffix}`);
      
      // Fetch current price and detailed info
      const currentResponse = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbolWithSuffix)}?interval=1d&range=2d`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        }
      );
      
      if (!currentResponse.ok) {
        console.error(`[Crypto Detail] Yahoo Finance API error: ${currentResponse.status} ${currentResponse.statusText}`);
        return res.status(404).json({ message: "Crypto not found" });
      }
      
      const currentData = await currentResponse.json();
      const result = currentData.chart?.result?.[0];
      const meta = result?.meta;
      
      if (!meta) {
        console.error(`[Crypto Detail] No meta data in response for ${symbolWithSuffix}`);
        return res.status(404).json({ message: "Crypto data not available" });
      }
      
      console.log(`[Crypto Detail] Successfully fetched data for ${symbolWithSuffix}, price: ${meta.regularMarketPrice}`);
      
      // Fetch historical data (1 month, 3 months, 1 year)
      const ranges = [
        { label: "1M", days: 30 },
        { label: "3M", days: 90 },
        { label: "1Y", days: 365 },
      ];
      
      const historyData: Record<string, { date: string; price: number }[]> = {};
      
      for (const range of ranges) {
        try {
          const historyResponse = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbolWithSuffix)}?interval=1d&range=${range.days}d`,
            {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
            }
          );
          
          if (historyResponse.ok) {
            const historyJson = await historyResponse.json();
            const historyResult = historyJson.chart?.result?.[0];
            const timestamps = historyResult?.timestamp || [];
            const quotes = historyResult?.indicators?.quote?.[0];
            const closes = quotes?.close || [];
            
            historyData[range.label] = timestamps
              .map((ts: number, i: number) => ({
                date: new Date(ts * 1000).toISOString().split("T")[0],
                price: closes[i] || 0,
              }))
              .filter((d: { price: number }) => d.price > 0)
              .slice(-30); // Last 30 data points for each range
          }
        } catch (error) {
          console.error(`Error fetching ${range.label} history:`, error);
        }
      }
      
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.chartPreviousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;
      
      // Calculate 24h high/low from current data
      const dayHigh = meta.regularMarketDayHigh || currentPrice;
      const dayLow = meta.regularMarketDayLow || currentPrice;
      
      res.json({
        symbol: symbol.toUpperCase(),
        name: meta.shortName || meta.longName || symbol.toUpperCase(),
        price: currentPrice,
        change,
        changePercent,
        marketCap: meta.marketCap || 0,
        volume24h: meta.regularMarketVolume || 0,
        dayHigh,
        dayLow,
        previousClose,
        history: historyData,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error getting crypto detail:", error);
      res.status(500).json({ message: "Failed to get crypto detail" });
    }
  });
  
  // Crypto prices (list) - must come after /api/market/crypto/:symbol
  app.get("/api/market/crypto", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const crypto = await fetchCryptoPrices();
      res.json(crypto);
    } catch (error) {
      console.error("Error getting crypto prices:", error);
      res.status(500).json({ message: "Failed to get crypto prices" });
    }
  });
  
  // Economic calendar
  app.get("/api/market/economic-calendar", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const events = getEconomicCalendar();
      res.json(events);
    } catch (error) {
      console.error("Error getting economic calendar:", error);
      res.status(500).json({ message: "Failed to get economic calendar" });
    }
  });
  
  // News for symbols
  app.post("/api/market/news", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { symbols } = req.body;
      if (!symbols || !Array.isArray(symbols)) {
        return res.status(400).json({ message: "symbols array required" });
      }
      const news = await fetchNewsForSymbols(symbols);
      res.json(news);
    } catch (error) {
      console.error("Error getting news:", error);
      res.status(500).json({ message: "Failed to get news" });
    }
  });
  
  // Dividend calendar
  app.post("/api/market/dividend-calendar", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { symbols } = req.body;
      console.log("[Dividend Calendar API] Received request with symbols:", symbols);
      
      // If no symbols provided, get all holdings with dividend data
      const symbolsToFetch = symbols && Array.isArray(symbols) && symbols.length > 0 
        ? symbols 
        : [];
      
      const dividends = await fetchDividendCalendar(symbolsToFetch);
      console.log("[Dividend Calendar API] Returning", dividends.length, "dividends");
      res.json(dividends);
    } catch (error) {
      console.error("Error getting dividend calendar:", error);
      res.status(500).json({ message: "Failed to get dividend calendar" });
    }
  });
  
  // ETF holdings
  app.get("/api/market/etf-holdings/:symbol", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const holdings = await fetchETFHoldings(symbol);
      if (!holdings) {
        return res.status(404).json({ message: "Holdings not found" });
      }
      res.json(holdings);
    } catch (error) {
      console.error("Error getting ETF holdings:", error);
      res.status(500).json({ message: "Failed to get ETF holdings" });
    }
  });
  
  // Distribution history
  app.get("/api/market/distribution-history/:symbol", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const history = await fetchDistributionHistory(symbol);
      res.json(history);
    } catch (error) {
      console.error("Error getting distribution history:", error);
      res.status(500).json({ message: "Failed to get distribution history" });
    }
  });
  
  // Combined market overview (for dashboard widget)
  app.get("/api/market/overview", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const [tsx, nyse] = [getMarketStatus("TSX"), getMarketStatus("NYSE")];
      const [exchangeRate, indices, interestRates, crypto] = await Promise.all([
        fetchExchangeRate(),
        fetchMarketIndices(),
        Promise.resolve(getInterestRates()),
        fetchCryptoPrices(),
      ]);
      
      res.json({
        markets: { tsx, nyse },
        exchangeRate,
        indices,
        interestRates,
        crypto,
      });
    } catch (error) {
      console.error("Error getting market overview:", error);
      res.status(500).json({ message: "Failed to get market overview" });
    }
  });
}

