// API Routes
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth, isAuthenticated, isLocalDev } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { generatePortfolioRebalanceReport, generateMilestonesReport } from "./pdf-report";
import { sendEmailWithAttachment } from "./gmail";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { registerMarketDataRoutes } from "./marketData";
import crypto from "crypto";
import { log } from "./logger";
import { z } from "zod";

// Email alert for TradingView signals
async function sendTradingAlertEmail(symbol: string, signal: string, price: string) {
  // HIGH PRIORITY FIX #9: Remove hardcoded email fallback
  const alertEmail = process.env.TRADINGVIEW_REPORT_EMAIL;
  if (!alertEmail) {
    log.warn("TRADINGVIEW_REPORT_EMAIL not configured - cannot send alert email", { symbol, signal, price });
    return;
  }
  
  const signalColor = signal === 'BUY' ? '#22c55e' : '#ef4444';
  const signalEmoji = signal === 'BUY' ? '🟢' : '🔴';
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
      <div style="background: ${signalColor}; color: white; padding: 15px; border-radius: 8px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">${signalEmoji} ${signal}</h1>
      </div>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 10px;">
        <h2 style="margin: 0 0 10px 0; color: #1f2937;">${symbol}</h2>
        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #374151;">$${price}</p>
      </div>
      <p style="color: #6b7280; font-size: 12px; margin-top: 15px; text-align: center;">
        TradingView Alert • ${new Date().toLocaleString()}
      </p>
    </div>
  `;
  
  try {
    // Try Resend first (recommended for Railway - uses HTTP API, not SMTP)
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: alertEmail,
        subject: `${signal} ${symbol} @ $${price}`,
        html: htmlBody,
      });
      
      log.info("Alert email sent via Resend", { symbol, signal, price });
      return;
    }
    
          // Try Replit Gmail integration (for Replit deployments only)
          if (process.env.REPL_ID && (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL)) {
      const { sendEmail } = await import("./gmail");
      await sendEmail(alertEmail, `${signal} ${symbol} @ $${price}`, htmlBody);
      log.info("Alert email sent via Gmail", { symbol, signal, price });
      return;
    }
    
    // Fallback to nodemailer with SMTP (may not work on Railway due to blocked ports)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
      
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: alertEmail,
        subject: `${signal} ${symbol} @ $${price}`,
        html: htmlBody,
      });
      
      log.info("Alert email sent via SMTP", { symbol, signal, price });
      return;
    }
    
    // If no email configuration, just log
    log.warn("Alert received but email not configured", { symbol, signal, price, alertEmail });
  } catch (error) {
    log.error("Failed to send alert email", error, { symbol, signal, price });
    // Don't throw - we don't want email failures to break the webhook
  }
}
import {
  users,
  kpiDailyTasks,
  insertHouseholdSchema,
  insertIndividualSchema,
  insertCorporationSchema,
  insertIndividualAccountSchema,
  insertCorporateAccountSchema,
  insertJointAccountSchema,
  insertJointAccountOwnershipSchema,
  insertPositionSchema,
  insertAlertSchema,
  insertTradeSchema,
  insertUniversalHoldingSchema,
  insertPlannedPortfolioSchema,
  insertPlannedPortfolioAllocationSchema,
  insertFreelancePortfolioSchema,
  insertFreelancePortfolioAllocationSchema,
  insertAccountTargetAllocationSchema,
  updateHouseholdSchema,
  updateIndividualSchema,
  updateCorporationSchema,
  updateIndividualAccountSchema,
  updateCorporateAccountSchema,
  updateJointAccountSchema,
  updatePositionSchema,
  updateAlertSchema,
  updateUniversalHoldingSchema,
  updatePlannedPortfolioSchema,
  updatePlannedPortfolioAllocationSchema,
  updateFreelancePortfolioSchema,
  updateFreelancePortfolioAllocationSchema,
  updateAccountTargetAllocationSchema,
  tradingViewWebhookSchema,
  insertLibraryDocumentSchema,
  updateLibraryDocumentSchema,
  insertAccountTaskSchema,
  updateAccountTaskSchema,
  insertInsuranceRevenueSchema,
  updateInsuranceRevenueSchema,
  insertInvestmentRevenueSchema,
  updateInvestmentRevenueSchema,
  insertKpiObjectiveSchema,
  updateKpiObjectiveSchema,
  insertReferenceLinkSchema,
  updateReferenceLinkSchema,
  insertMilestoneSchema,
  updateMilestoneSchema,
  insertTradingJournalEntrySchema,
  updateTradingJournalEntrySchema,
  insertTradingJournalImageSchema,
  insertTradingJournalTagSchema,
  insertTradingJournalEntryTagSchema,
  type InsertAccountAuditLog,
  type Position,
  type AccountTask,
} from "@shared/schema";

// Canadian ETF provider identification and fund facts URL patterns
type DividendPayoutType = "monthly" | "quarterly" | "semi_annual" | "annual" | "none";

interface EnhancedTickerData {
  ticker: string;
  name: string;
  price: number | null;
  dividendRate: number | null;
  dividendYield: number | null;
  dividendPayout: DividendPayoutType;
  fundFactsUrl: string | null;
  provider: string | null;
}

// Map of ticker prefixes/patterns to ETF providers
const ETF_PROVIDER_PATTERNS: { pattern: RegExp; provider: string; productPage: (ticker: string) => string; fundFacts: (ticker: string) => string | null }[] = [
  // Hamilton ETFs - HMAX, HYLD, HDIV, HCAL, etc.
  { 
    pattern: /^(HMAX|HYLD|HDIV|HCAL|QMAX|SMAX|EMAX|UMAX)\.TO$/i,
    provider: 'Hamilton ETFs',
    productPage: (t) => `https://hamiltonetfs.com/etf/${t.replace('.TO', '').toLowerCase()}/`,
    fundFacts: (t) => `https://hamiltonetfs.com/etf/${t.replace('.TO', '').toLowerCase()}/`
  },
  // Harvest Portfolios - Enhanced High Income Shares (ends with E or Y)
  { 
    pattern: /^(TSLY|NVHE|MSHE|APLE|METE|GOGY|NFLY|AMHE|COSY|AVGY|LLHE|PLTE|SOFY|AEME|AMDY|CCOE|CNQE|CNYE|ENBE|HODY|RDDY|SHPE|SUHE|TDHE|CRCY)\.TO$/i,
    provider: 'Harvest Portfolios',
    productPage: (t) => `https://harvestportfolios.com/etf/${t.replace('.TO', '').toLowerCase()}/`,
    fundFacts: (t) => `https://harvestportfolios.com/wp-content/uploads/hhis/pdf/fund-facts/en/${t.replace('.TO', '').toLowerCase()}_ff.pdf`
  },
  // Harvest Portfolios - Basket/Diversified ETFs  
  { 
    pattern: /^(HDIF|HHIC|HHIS|HHLE|HUTE)\.TO$/i,
    provider: 'Harvest Portfolios',
    productPage: (t) => `https://harvestportfolios.com/etf/${t.replace('.TO', '').toLowerCase()}/`,
    fundFacts: (t) => `https://harvestportfolios.com/wp-content/uploads/hhis/pdf/fund-facts/en/${t.replace('.TO', '').toLowerCase()}_ff.pdf`
  },
  // Global X Canada - Enhanced/Covered Call ETFs (ends with CL or CC)
  { 
    pattern: /^(QQCL|USCL|CNCL|ENCL|ENCC|QQCC|BKCC|BKCL)\.TO$/i,
    provider: 'Global X',
    productPage: (t) => `https://www.globalx.ca/product/${t.replace('.TO', '').toLowerCase()}`,
    fundFacts: (t) => `https://www.globalx.ca/product/${t.replace('.TO', '').toLowerCase()}`
  },
  // Evolve ETFs - Enhanced Yield
  { 
    pattern: /^(BANK|CALL|LIFE|UTES)\.TO$/i,
    provider: 'Evolve ETFs',
    productPage: (t) => `https://evolveetfs.com/product/${t.replace('.TO', '').toLowerCase()}/`,
    fundFacts: (t) => `https://evolveetfs.com/product/${t.replace('.TO', '').toLowerCase()}/`
  },
  // Purpose Investments - Yield Shares
  { 
    pattern: /^(YGOG|YTSL|DOLY|ETHY)\.TO$/i,
    provider: 'Purpose Investments',
    productPage: (t) => `https://www.purposeinvest.com/funds/${t.replace('.TO', '').toLowerCase()}`,
    fundFacts: (t) => `https://www.purposeinvest.com/funds/${t.replace('.TO', '').toLowerCase()}`
  },
  // Savvylong - 2X Long ETFs (ends with U)
  { 
    pattern: /^(TSLU|NVDU|MSFU|AMZU|SHPU|CCOU|NBCU|RBCU|CNQU|COMU|CSUU|TDU|ABXU)\.TO$/i,
    provider: 'Savvylong',
    productPage: (t) => `https://savvylong.ca/${t.replace('.TO', '').toLowerCase()}/`,
    fundFacts: (t) => `https://savvylong.ca/${t.replace('.TO', '').toLowerCase()}/`
  },
  // BetaPro/Horizons - Leveraged ETFs (ends with U)
  { 
    pattern: /^(BNKU|CNDU|NRGU|QQQU|QQU|SOXU|TCND|TQQQ)\.TO$/i,
    provider: 'Horizons ETFs',
    productPage: (t) => `https://www.horizonsetfs.com/etf/${t.replace('.TO', '')}`,
    fundFacts: (t) => `https://www.horizonsetfs.com/etf/${t.replace('.TO', '')}`
  },
  // LFG/Megalong - Leveraged ETFs
  { 
    pattern: /^(COIU|MSTU)\.TO$/i,
    provider: 'LFG ETFs',
    productPage: (t) => `https://lfgetfs.com/product/${t.replace('.TO', '').toLowerCase()}/`,
    fundFacts: (t) => `https://lfgetfs.com/product/${t.replace('.TO', '').toLowerCase()}/`
  },
  // Ninepoint - HighShares
  { 
    pattern: /^(ABHI|SHHI)\.TO$/i,
    provider: 'Ninepoint Partners',
    productPage: (t) => `https://www.ninepoint.com/funds/${t.replace('.TO', '').toLowerCase()}/`,
    fundFacts: (t) => `https://www.ninepoint.com/funds/${t.replace('.TO', '').toLowerCase()}/`
  },
];

// Identify ETF provider and get URLs
function identifyETFProvider(ticker: string): { provider: string | null; productPage: string | null; fundFacts: string | null } {
  const normalizedTicker = ticker.toUpperCase();
  
  for (const { pattern, provider, productPage, fundFacts } of ETF_PROVIDER_PATTERNS) {
    if (pattern.test(normalizedTicker)) {
      return {
        provider,
        productPage: productPage(normalizedTicker),
        fundFacts: fundFacts(normalizedTicker)
      };
    }
  }
  
  return { provider: null, productPage: null, fundFacts: null };
}

// Helper function to convert crypto ticker formats to Yahoo Finance format
// Converts "btcusd" -> "BTC-USD", "btc-usd" -> "BTC-USD", "BTC-USD" -> "BTC-USD", etc.
function normalizeCryptoTicker(ticker: string): string {
  const upper = ticker.toUpperCase().trim();
  
  // If it already has the correct format (e.g., "BTC-USD"), return it
  if (upper.match(/^[A-Z]{2,5}-USD$/)) {
    return upper;
  }
  
  // Remove dashes and normalize (e.g., "btc-usd" -> "BTCUSD")
  const normalized = upper.replace(/-/g, '');
  
  // Common crypto/USD pairs
  const cryptoPairs: Record<string, string> = {
    'BTCUSD': 'BTC-USD',
    'ETHUSD': 'ETH-USD',
    'BNBUSD': 'BNB-USD',
    'SOLUSD': 'SOL-USD',
    'ADAUSD': 'ADA-USD',
    'XRPUSD': 'XRP-USD',
    'DOGEUSD': 'DOGE-USD',
    'DOTUSD': 'DOT-USD',
    'MATICUSD': 'MATIC-USD',
    'AVAXUSD': 'AVAX-USD',
    'LINKUSD': 'LINK-USD',
    'UNIUSD': 'UNI-USD',
    'LTCUSD': 'LTC-USD',
    'ATOMUSD': 'ATOM-USD',
    'ETCUSD': 'ETC-USD',
    'XLMUSD': 'XLM-USD',
    'ALGOUSD': 'ALGO-USD',
    'VETUSD': 'VET-USD',
    'ICPUSD': 'ICP-USD',
    'FILUSD': 'FIL-USD',
    'TRXUSD': 'TRX-USD',
    'EOSUSD': 'EOS-USD',
    'AAVEUSD': 'AAVE-USD',
    'THETAUSD': 'THETA-USD',
    'XTZUSD': 'XTZ-USD',
    'NEARUSD': 'NEAR-USD',
    'FTMUSD': 'FTM-USD',
    'HBARUSD': 'HBAR-USD',
    'QNTUSD': 'QNT-USD',
    'EGLDUSD': 'EGLD-USD',
  };
  
  // Check if it's a known crypto pair
  if (cryptoPairs[normalized]) {
    return cryptoPairs[normalized];
  }
  
  // Try to detect pattern: 3-4 letter crypto code + USD/USDT
  const cryptoMatch = normalized.match(/^([A-Z]{2,5})(USD|USDT)$/);
  if (cryptoMatch) {
    return `${cryptoMatch[1]}-USD`;
  }
  
  // If no match, return the original (uppercased) - might be a stock ticker
  return upper;
}

// Enhanced ticker lookup that fetches data from multiple sources
async function enhancedTickerLookup(ticker: string): Promise<EnhancedTickerData> {
  const normalizedTicker = normalizeCryptoTicker(ticker);
  const result: EnhancedTickerData = {
    ticker: normalizedTicker,
    name: `${normalizedTicker} (Auto-added)`,
    price: null,
    dividendRate: null,
    dividendYield: null,
    dividendPayout: 'monthly', // Default for Canadian income ETFs
    fundFactsUrl: null,
    provider: null
  };
  
  // Identify the ETF provider (skip for crypto)
  if (!normalizedTicker.includes('-')) {
    const providerInfo = identifyETFProvider(normalizedTicker);
    result.provider = providerInfo.provider;
    result.fundFactsUrl = providerInfo.fundFacts;
  }
  
  try {
    // Try Yahoo Finance first for basic data
    const searchResponse = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(normalizedTicker)}&quotesCount=5&newsCount=0`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.quotes && searchData.quotes.length > 0) {
        const exactMatch = searchData.quotes.find((q: any) => q.symbol === normalizedTicker);
        const searchQuote = exactMatch || searchData.quotes[0];
        
        if (searchQuote.shortname || searchQuote.longname) {
          result.name = searchQuote.shortname || searchQuote.longname;
        }
      }
    }
    
    // Get price and dividend data from chart API
    const chartResponse = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalizedTicker)}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    if (chartResponse.ok) {
      const chartData = await chartResponse.json();
      const meta = chartData?.chart?.result?.[0]?.meta;
      if (meta) {
        result.price = meta.regularMarketPrice || null;
      }
    }
    
    // Get dividend data from quoteSummary API
    const summaryResponse = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(normalizedTicker)}?modules=summaryDetail`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      const detail = summaryData?.quoteSummary?.result?.[0]?.summaryDetail;
      if (detail) {
        // Get dividend yield and rate
        if (detail.dividendYield?.raw) {
          result.dividendYield = detail.dividendYield.raw * 100; // Convert to percentage
        }
        if (detail.dividendRate?.raw) {
          result.dividendRate = detail.dividendRate.raw;
        }
        
        // Try to determine payout frequency from ex-dividend date frequency
        // Most Canadian income ETFs pay monthly
        if (detail.exDividendDate) {
          result.dividendPayout = 'monthly';
        }
      }
    }
    
    log.debug("Enhanced lookup result", { ticker: normalizedTicker, provider: result.provider, price: result.price, yield: result.dividendYield });
    
  } catch (error) {
    log.error("Enhanced lookup error", error, { ticker: normalizedTicker });
  }
  
  return result;
}

// Helper function to compute diff between old and new account values for audit logging
function computeAccountDiff(oldAccount: Record<string, any>, newData: Record<string, any>): Record<string, { old: any; new: any }> | null {
  const changes: Record<string, { old: any; new: any }> = {};
  
  // Fields to track for audit log (skip auto-generated fields like updatedAt)
  const trackableFields = [
    'nickname', 'accountType', 'balance', 'bookValue',
    'riskMedium', 'riskMediumHigh', 'riskHigh',
    'immediateNotes', 'upcomingNotes',
    'protectionPercent', 'stopPrice', 'limitPrice'
  ];
  
  for (const field of trackableFields) {
    if (field in newData) {
      const oldValue = oldAccount[field];
      const newValue = newData[field];
      
      // Compare as strings to handle decimal types properly
      const oldStr = oldValue === null || oldValue === undefined ? null : String(oldValue);
      const newStr = newValue === null || newValue === undefined ? null : String(newValue);
      
      if (oldStr !== newStr) {
        changes[field] = { old: oldValue, new: newValue };
      }
    }
  }
  
  return Object.keys(changes).length > 0 ? changes : null;
}

// SECURITY: Helper function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// SECURITY: Middleware to validate UUID parameters
function validateUUIDParam(paramName: string) {
  return (req: any, res: any, next: any) => {
    const paramValue = req.params[paramName];
    if (paramValue && !isValidUUID(paramValue)) {
      return res.status(400).json({ message: `Invalid ${paramName} format` });
    }
    next();
  };
}

// HIGH PRIORITY FIX #6: Query parameter validation helper
function validateQuery(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid query parameters", 
          errors: error.errors 
        });
      }
      next(error);
    }
  };
}

// CRITICAL FIX #2: CSRF Protection
// Generate CSRF token
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// CSRF token validation middleware
function validateCsrfToken(req: any, res: any, next: any) {
  // Skip CSRF validation for:
  // 1. GET, HEAD, OPTIONS requests (safe methods)
  // 2. Webhook endpoints (they use secret-based auth)
  // 3. Local dev mode (for easier development)
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }
  
  if (req.path.startsWith('/api/webhooks/')) {
    return next(); // Webhooks use secret-based auth
  }
  
  if (isLocalDev) {
    // In local dev, log but don't block (for easier development)
    log.warn('[CSRF] Skipping CSRF validation in local dev mode');
    return next();
  }
  
  // Get token from header (preferred) or body
  const token = req.headers['x-csrf-token'] || req.body?._csrf;
  const sessionToken = (req.session as any)?.csrfToken;
  
  if (!token || !sessionToken) {
    log.error('[CSRF] Missing CSRF token', undefined, { 
      hasHeaderToken: !!req.headers['x-csrf-token'],
      hasBodyToken: !!req.body?._csrf,
      hasSessionToken: !!sessionToken,
      path: req.path 
    });
    return res.status(403).json({ 
      message: "Forbidden: CSRF token missing or invalid" 
    });
  }
  
  if (token !== sessionToken) {
    log.error('[CSRF] CSRF token mismatch', undefined, { path: req.path });
    return res.status(403).json({ 
      message: "Forbidden: CSRF token mismatch" 
    });
  }
  
  next();
}

// Import rate limiting utilities (extracted to separate module)
import { generalRateLimiter, webhookRateLimiter, rateLimit, authRateLimiter } from "./routes/rateLimiter";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication middleware
  await setupAuth(app);

  // CRITICAL FIX #2: CSRF token endpoint (must be before CSRF validation and rate limiting)
  app.get('/api/csrf-token', (req: any, res) => {
    // Generate new token for each request (or reuse existing)
    if (!(req.session as any)?.csrfToken) {
      (req.session as any).csrfToken = generateCsrfToken();
    }
    res.json({ csrfToken: (req.session as any).csrfToken });
  });

  // SECURITY: Apply rate limiting to all API routes
  app.use('/api', rateLimit(generalRateLimiter, (req) => {
    // Use IP address and user ID if available for rate limiting
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.claims?.sub || 'anonymous';
    return `${ip}:${userId}`;
  }));

  // CRITICAL FIX #2: Apply CSRF protection to all state-changing API routes
  // Note: Applied after rate limiting but before other routes
  app.use('/api', validateCsrfToken);

  // Disable caching for all API routes to ensure fresh data after mutations
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  });

  // Auth routes
  app.get('/api/auth/user', rateLimit(authRateLimiter, (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.claims?.sub || 'anonymous';
    return `${ip}:${userId}`;
  }), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // In local dev mode, return user from session if database lookup fails
      if (isLocalDev) {
        try {
          const user = await storage.getUser(userId);
          if (user) {
            return res.json(user);
          }
        } catch (error) {
          // If user doesn't exist in DB, return user from session
        }
        
        // Return user from session for local dev
        return res.json({
          id: req.user.claims.sub,
          email: req.user.claims.email || "dev@localhost",
          firstName: req.user.claims.first_name || "Local",
          lastName: req.user.claims.last_name || "Developer",
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      
      // Production mode - must exist in database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      log.error("Error fetching user", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Household routes
  app.get('/api/households', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const households = await storage.getAllHouseholds(userId);
      res.json(households);
    } catch (error) {
      log.error("Error fetching households", error);
      res.status(500).json({ message: "Failed to fetch households" });
    }
  });

  app.get('/api/households/full', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const households = await storage.getAllHouseholdsWithDetails(userId);
      res.json(households);
    } catch (error) {
      log.error("Error fetching household details", error);
      res.status(500).json({ message: "Failed to fetch household details" });
    }
  });

  app.post('/api/households', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertHouseholdSchema.parse(req.body);
      
      log.debug("Household creation - user ID from session", { userId });
      
      // CRITICAL: Ensure user exists - this MUST happen before creating household
      let user = await storage.getUser(userId);
      log.debug("Household creation - user lookup result", { userId, found: !!user });
      
      if (!user) {
        log.debug("Household creation - user not found, creating now", { userId });
        const userEmail = req.user.claims.email || req.user.claims.email_address || "dev@localhost";
        
        try {
          user = await storage.upsertUser({
            id: userId,
            email: userEmail,
            firstName: req.user.claims.first_name || req.user.claims.given_name || "Local",
            lastName: req.user.claims.last_name || req.user.claims.family_name || "Developer",
            profileImageUrl: req.user.claims.profile_image_url || null,
          });
          log.info("Household creation - user created successfully", { userId });
        } catch (userError: any) {
          log.error("Household creation - error creating user", userError, { userId });
          // If duplicate email, find existing user by email
          if (userError?.code === '23505') {
            const { db } = await import("./db");
            const { users } = await import("@shared/schema");
            const { eq } = await import("drizzle-orm");
            const existingUsers = await db.select().from(users).where(eq(users.email, userEmail));
            if (existingUsers.length > 0) {
              user = existingUsers[0];
              log.info("Household creation - found existing user by email", { email: userEmail, userId: user.id });
            }
          }
          if (!user) {
            log.error("Household creation - failed to create or find user", userError, { userId, email: userEmail });
            return res.status(500).json({ 
              message: `Failed to create household: User does not exist and could not be created. Error: ${userError.message}` 
            });
          }
        }
      }
      
      if (!user) {
        return res.status(500).json({ message: "Failed to create household: User does not exist" });
      }
      
      log.debug("Household creation - using user ID", { userId: user.id, householdName: parsed.name });
      
      // Check for duplicate household name
      const nameExists = await storage.checkHouseholdNameExists(parsed.name, user.id);
      if (nameExists) {
        return res.status(400).json({ message: "A household with this name already exists" });
      }
      
      // Create household with the user ID (use user.id to ensure we have the correct ID)
      const household = await storage.createHousehold({ ...parsed, userId: user.id });
      res.json(household);
    } catch (error: any) {
      log.error("Error creating household", error, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        userId: req.user?.claims?.sub,
        body: req.body
      });
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      // Return more detailed error in development
      const errorMessage = isLocalDev 
        ? `Failed to create household: ${error.message || error.detail || 'Unknown error'}`
        : "Failed to create household";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Get archived households (must come before /api/households/:id route)
  app.get('/api/households/archived', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const archived = await storage.getAllArchivedHouseholds(userId);
      res.json(archived);
    } catch (error) {
      log.error("Error fetching archived households", error);
      res.status(500).json({ message: "Failed to fetch archived households" });
    }
  });

  app.get('/api/households/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.id;
      
      // Verify user has access to this household
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const household = await storage.getHousehold(householdId);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      res.json(household);
    } catch (error) {
      log.error("Error fetching household", error);
      res.status(500).json({ message: "Failed to fetch household" });
    }
  });

  app.get('/api/households/:id/full', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.id;
      
      // Verify user has access to this household
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const household = await storage.getHouseholdWithDetails(householdId);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      res.json(household);
    } catch (error) {
      log.error("Error fetching household details", error);
      res.status(500).json({ message: "Failed to fetch household details" });
    }
  });

  app.patch('/api/households/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.id;
      
      // Verify user has edit access (owner or editor share)
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateHouseholdSchema.parse(req.body);
      
      // Check for duplicate household name (excluding current household)
      if (parsed.name) {
        const nameExists = await storage.checkHouseholdNameExists(parsed.name, userId, householdId);
        if (nameExists) {
          return res.status(400).json({ message: "A household with this name already exists" });
        }
      }
      
      const household = await storage.updateHousehold(householdId, parsed);
      res.json(household);
    } catch (error: any) {
      log.error("Error updating household", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update household" });
    }
  });

  // Archive (soft delete) household
  app.delete('/api/households/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.id;
      
      // Verify user has edit access (owner or editor share)
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteHousehold(householdId);
      res.status(204).send();
    } catch (error) {
      log.error("Error archiving household", error);
      res.status(500).json({ message: "Failed to archive household" });
    }
  });

  // Restore archived household (must come before /api/households/:id routes)
  app.post('/api/households/:id/restore', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const hasAccess = await storage.canUserEditHousehold(userId, req.params.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      const restored = await storage.restoreHousehold(req.params.id);
      res.json(restored);
    } catch (error) {
      log.error("Error restoring household", error);
      res.status(500).json({ message: "Failed to restore household" });
    }
  });

  // User Settings routes
  app.get('/api/user/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let settings = await storage.getUserSettings(userId);
      
      // Auto-create settings if they don't exist
      if (!settings) {
        settings = await storage.createUserSettings({ userId });
      }
      
      res.json(settings);
    } catch (error) {
      log.error("Error fetching user settings", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });

  app.patch('/api/user/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reportEmail } = req.body;
      
      // SECURITY: Validate email format if provided
      if (reportEmail !== undefined && reportEmail !== null) {
        if (typeof reportEmail !== 'string') {
          return res.status(400).json({ message: "Invalid email format" });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (reportEmail.trim() !== '' && !emailRegex.test(reportEmail.trim())) {
          return res.status(400).json({ message: "Invalid email format" });
        }
      }
      
      // Sanitize email
      const sanitizedEmail = reportEmail && typeof reportEmail === 'string' ? reportEmail.trim().toLowerCase() : reportEmail;
      
      // Ensure settings exist
      let settings = await storage.getUserSettings(userId);
      if (!settings) {
        settings = await storage.createUserSettings({ userId, reportEmail: sanitizedEmail });
      } else {
        settings = await storage.updateUserSettings(userId, { reportEmail: sanitizedEmail });
      }
      
      res.json(settings);
    } catch (error) {
      log.error("Error updating user settings", error);
      res.status(500).json({ message: "Failed to update user settings" });
    }
  });

  app.post('/api/user/settings/regenerate-webhook-secret', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Ensure settings exist
      let settings = await storage.getUserSettings(userId);
      if (!settings) {
        settings = await storage.createUserSettings({ userId });
      }
      
      settings = await storage.regenerateWebhookSecret(userId);
      res.json(settings);
    } catch (error) {
      log.error("Error regenerating webhook secret", error);
      res.status(500).json({ message: "Failed to regenerate webhook secret" });
    }
  });

  // Household Sharing routes
  app.get('/api/households/:id/shares', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.id;
      
      // Only owner can view shares
      const household = await storage.getHousehold(householdId);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      if (household.userId !== userId) {
        return res.status(403).json({ message: "Only the owner can view shares" });
      }
      
      const shares = await storage.getHouseholdShares(householdId);
      res.json(shares);
    } catch (error) {
      log.error("Error fetching household shares", error);
      res.status(500).json({ message: "Failed to fetch household shares" });
    }
  });

  app.post('/api/households/:id/shares', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.id;
      const { email, accessLevel = 'viewer' } = req.body;
      
      // SECURITY: Validate email format
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // SECURITY: Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      // SECURITY: Validate access level
      if (accessLevel !== 'viewer' && accessLevel !== 'editor') {
        return res.status(400).json({ message: "Invalid access level. Must be 'viewer' or 'editor'" });
      }
      
      // Only owner can share
      const household = await storage.getHousehold(householdId);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      if (household.userId !== userId) {
        return res.status(403).json({ message: "Only the owner can share a household" });
      }
      
      // Find user by email (sanitize email)
      const sanitizedEmail = email.trim().toLowerCase();
      const [userToShare] = await db.select().from(users).where(eq(users.email, sanitizedEmail));
      if (!userToShare) {
        return res.status(404).json({ message: "User not found with that email" });
      }
      
      // Can't share with yourself
      if (userToShare.id === userId) {
        return res.status(400).json({ message: "Cannot share with yourself" });
      }
      
      const share = await storage.shareHousehold({
        householdId,
        sharedWithUserId: userToShare.id,
        accessLevel,
      });
      
      res.json(share);
    } catch (error: any) {
      log.error("Error sharing household", error);
      // Handle duplicate share
      if (error.code === '23505') {
        return res.status(400).json({ message: "Household already shared with this user" });
      }
      res.status(500).json({ message: "Failed to share household" });
    }
  });

  app.delete('/api/households/:id/shares/:sharedWithUserId', validateUUIDParam('id'), validateUUIDParam('sharedWithUserId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: householdId, sharedWithUserId } = req.params;
      
      // Only owner can remove shares
      const household = await storage.getHousehold(householdId);
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      if (household.userId !== userId) {
        return res.status(403).json({ message: "Only the owner can remove shares" });
      }
      
      await storage.removeHouseholdShare(householdId, sharedWithUserId);
      res.status(204).send();
    } catch (error) {
      log.error("Error removing household share", error);
      res.status(500).json({ message: "Failed to remove household share" });
    }
  });

  // Individual routes
  app.get('/api/households/:householdId/individuals', validateUUIDParam('householdId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.householdId;
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const individuals = await storage.getIndividualsByHousehold(householdId);
      res.json(individuals);
    } catch (error) {
      log.error("Error fetching individuals", error);
      res.status(500).json({ message: "Failed to fetch individuals" });
    }
  });

  app.post('/api/individuals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertIndividualSchema.parse(req.body);
      
      // Verify user has edit access to the household
      const canEdit = await storage.canUserEditHousehold(userId, parsed.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const individual = await storage.createIndividual(parsed);
      res.json(individual);
    } catch (error: any) {
      log.error("Error creating individual", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create individual" });
    }
  });

  app.patch('/api/individuals/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const individual = await storage.getIndividual(req.params.id);
      if (!individual) {
        return res.status(404).json({ message: "Individual not found" });
      }
      
      // Verify user has edit access to the household
      const canEdit = await storage.canUserEditHousehold(userId, individual.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = insertIndividualSchema.partial().parse(req.body);
      const updated = await storage.updateIndividual(req.params.id, parsed);
      res.json(updated);
    } catch (error: any) {
      log.error("Error updating individual", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update individual" });
    }
  });

  app.delete('/api/individuals/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const individual = await storage.getIndividual(req.params.id);
      if (!individual) {
        return res.status(404).json({ message: "Individual not found" });
      }
      
      // Verify user has edit access to the household
      const canEdit = await storage.canUserEditHousehold(userId, individual.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteIndividual(req.params.id);
      res.status(204).send();
    } catch (error) {
      log.error("Error deleting individual", error);
      res.status(500).json({ message: "Failed to delete individual" });
    }
  });

  // Corporation routes
  app.get('/api/households/:householdId/corporations', validateUUIDParam('householdId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.householdId;
      
      // Verify user has access to this household
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const corporations = await storage.getCorporationsByHousehold(householdId);
      res.json(corporations);
    } catch (error) {
      log.error("Error fetching corporations", error);
      res.status(500).json({ message: "Failed to fetch corporations" });
    }
  });

  app.post('/api/corporations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertCorporationSchema.parse(req.body);
      
      // Verify user has edit access to the household
      const canEdit = await storage.canUserEditHousehold(userId, parsed.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const corporation = await storage.createCorporation(parsed);
      res.json(corporation);
    } catch (error: any) {
      log.error("Error creating corporation", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create corporation" });
    }
  });

  app.patch('/api/corporations/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const corporation = await storage.getCorporation(req.params.id);
      if (!corporation) {
        return res.status(404).json({ message: "Corporation not found" });
      }
      
      // Verify user has edit access to the household
      const canEdit = await storage.canUserEditHousehold(userId, corporation.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = insertCorporationSchema.partial().parse(req.body);
      const updated = await storage.updateCorporation(req.params.id, parsed);
      res.json(updated);
    } catch (error: any) {
      log.error("Error updating corporation", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update corporation" });
    }
  });

  app.delete('/api/corporations/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const corporation = await storage.getCorporation(req.params.id);
      if (!corporation) {
        return res.status(404).json({ message: "Corporation not found" });
      }
      
      // Verify user has edit access to the household
      const canEdit = await storage.canUserEditHousehold(userId, corporation.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteCorporation(req.params.id);
      res.status(204).send();
    } catch (error) {
      log.error("Error deleting corporation", error);
      res.status(500).json({ message: "Failed to delete corporation" });
    }
  });

  // Individual account routes
  app.get('/api/individuals/:individualId/accounts', validateUUIDParam('individualId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const individual = await storage.getIndividual(req.params.individualId);
      if (!individual) {
        return res.status(404).json({ message: "Individual not found" });
      }
      
      // Verify user has access to the household
      const hasAccess = await storage.canUserAccessHousehold(userId, individual.householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const accounts = await storage.getIndividualAccountsByIndividual(req.params.individualId);
      res.json(accounts);
    } catch (error) {
      log.error("Error fetching individual accounts", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.get('/api/individual-accounts/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getIndividualAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Get individual to verify household access
      const individual = await storage.getIndividual(account.individualId);
      if (!individual) {
        return res.status(404).json({ message: "Individual not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, individual.householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get household name for display
      const household = await storage.getHousehold(individual.householdId);
      
      res.json({
        ...account,
        ownerName: individual.name,
        householdName: household?.name || 'Unknown',
        householdId: individual.householdId,
        ownerDateOfBirth: individual.dateOfBirth,
        ownerSpouseDateOfBirth: individual.spouseDateOfBirth,
      });
    } catch (error) {
      log.error("Error fetching individual account", error);
      res.status(500).json({ message: "Failed to fetch account" });
    }
  });

  app.post('/api/individual-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertIndividualAccountSchema.parse(req.body);
      
      // Get individual to verify household edit access
      const individual = await storage.getIndividual(parsed.individualId);
      if (!individual) {
        return res.status(404).json({ message: "Individual not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, individual.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const account = await storage.createIndividualAccount(parsed);
      
      // Create audit log entry for account setup
      await storage.createAuditLogEntry({
        individualAccountId: account.id,
        userId,
        action: "account_setup",
        changes: { 
          accountType: account.type,
          nickname: account.nickname || null,
          riskMediumPct: account.riskMediumPct,
          riskMediumHighPct: account.riskMediumHighPct,
          riskHighPct: account.riskHighPct,
        },
      });
      
      res.json(account);
    } catch (error: any) {
      log.error("Error creating individual account", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create individual account" });
    }
  });

  app.patch('/api/individual-accounts/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getIndividualAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Get individual to verify household edit access
      const individual = await storage.getIndividual(account.individualId);
      if (!individual) {
        return res.status(404).json({ message: "Individual not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, individual.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateIndividualAccountSchema.parse(req.body);
      const updated = await storage.updateIndividualAccount(req.params.id, parsed);
      
      // Create audit log entry for the changes
      const changes = computeAccountDiff(account, parsed);
      if (changes) {
        await storage.createAuditLogEntry({
          individualAccountId: req.params.id,
          userId,
          action: "update",
          changes,
        });
      }
      
      res.json(updated);
    } catch (error: any) {
      log.error("Error updating individual account", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update individual account" });
    }
  });

  app.delete('/api/individual-accounts/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getIndividualAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Get individual to verify household edit access
      const individual = await storage.getIndividual(account.individualId);
      if (!individual) {
        return res.status(404).json({ message: "Individual not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, individual.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteIndividualAccount(req.params.id);
      res.status(204).send();
    } catch (error) {
      log.error("Error deleting individual account", error);
      res.status(500).json({ message: "Failed to delete individual account" });
    }
  });

  // Corporate account routes
  app.get('/api/corporations/:corporationId/accounts', validateUUIDParam('corporationId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const corporation = await storage.getCorporation(req.params.corporationId);
      if (!corporation) {
        return res.status(404).json({ message: "Corporation not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, corporation.householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const accounts = await storage.getCorporateAccountsByCorporation(req.params.corporationId);
      res.json(accounts);
    } catch (error) {
      log.error("Error fetching corporate accounts", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.get('/api/corporate-accounts/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getCorporateAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const corporation = await storage.getCorporation(account.corporationId);
      if (!corporation) {
        return res.status(404).json({ message: "Corporation not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, corporation.householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get household name for display
      const household = await storage.getHousehold(corporation.householdId);
      
      res.json({
        ...account,
        ownerName: corporation.name,
        householdName: household?.name || 'Unknown',
        householdId: corporation.householdId,
      });
    } catch (error) {
      log.error("Error fetching corporate account", error);
      res.status(500).json({ message: "Failed to fetch account" });
    }
  });

  app.post('/api/corporate-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertCorporateAccountSchema.parse(req.body);
      
      const corporation = await storage.getCorporation(parsed.corporationId);
      if (!corporation) {
        return res.status(404).json({ message: "Corporation not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, corporation.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const account = await storage.createCorporateAccount(parsed);
      
      // Create audit log entry for account setup
      await storage.createAuditLogEntry({
        corporateAccountId: account.id,
        userId,
        action: "account_setup",
        changes: { 
          accountType: account.type,
          nickname: account.nickname || null,
          riskMediumPct: account.riskMediumPct,
          riskMediumHighPct: account.riskMediumHighPct,
          riskHighPct: account.riskHighPct,
        },
      });
      
      res.json(account);
    } catch (error: any) {
      log.error("Error creating corporate account", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create corporate account" });
    }
  });

  app.patch('/api/corporate-accounts/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getCorporateAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const corporation = await storage.getCorporation(account.corporationId);
      if (!corporation) {
        return res.status(404).json({ message: "Corporation not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, corporation.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateCorporateAccountSchema.parse(req.body);
      const updated = await storage.updateCorporateAccount(req.params.id, parsed);
      
      // Create audit log entry for the changes
      const changes = computeAccountDiff(account, parsed);
      if (changes) {
        await storage.createAuditLogEntry({
          corporateAccountId: req.params.id,
          userId,
          action: "update",
          changes,
        });
      }
      
      res.json(updated);
    } catch (error: any) {
      log.error("Error updating corporate account", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update corporate account" });
    }
  });

  app.delete('/api/corporate-accounts/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getCorporateAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const corporation = await storage.getCorporation(account.corporationId);
      if (!corporation) {
        return res.status(404).json({ message: "Corporation not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, corporation.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteCorporateAccount(req.params.id);
      res.status(204).send();
    } catch (error) {
      log.error("Error deleting corporate account", error);
      res.status(500).json({ message: "Failed to delete corporate account" });
    }
  });

  // Joint account routes
  app.get('/api/households/:householdId/joint-accounts', validateUUIDParam('householdId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = req.params.householdId;
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const jointAccounts = await storage.getJointAccountsByHousehold(householdId);
      res.json(jointAccounts);
    } catch (error) {
      log.error("Error fetching joint accounts", error);
      res.status(500).json({ message: "Failed to fetch joint accounts" });
    }
  });

  app.get('/api/joint-accounts/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getJointAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, account.householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get household name and owners for display
      const household = await storage.getHousehold(account.householdId);
      const owners = await storage.getJointAccountOwners(account.id);
      const ownerName = owners.map((o: any) => o.name).join(' & ');
      
      res.json({
        ...account,
        ownerName,
        householdName: household?.name || 'Unknown',
      });
    } catch (error) {
      log.error("Error fetching joint account", error);
      res.status(500).json({ message: "Failed to fetch account" });
    }
  });

  app.post('/api/joint-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertJointAccountSchema.parse(req.body);
      
      const canEdit = await storage.canUserEditHousehold(userId, parsed.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const jointAccount = await storage.createJointAccount(parsed);
      
      // Create audit log entry for account setup
      await storage.createAuditLogEntry({
        jointAccountId: jointAccount.id,
        userId,
        action: "account_setup",
        changes: { 
          accountType: jointAccount.type,
          nickname: jointAccount.nickname || null,
          riskMediumPct: jointAccount.riskMediumPct,
          riskMediumHighPct: jointAccount.riskMediumHighPct,
          riskHighPct: jointAccount.riskHighPct,
        },
      });
      
      res.json(jointAccount);
    } catch (error: any) {
      log.error("Error creating joint account", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create joint account" });
    }
  });

  app.patch('/api/joint-accounts/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getJointAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, account.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateJointAccountSchema.parse(req.body);
      const updated = await storage.updateJointAccount(req.params.id, parsed);
      
      // Create audit log entry for the changes
      const changes = computeAccountDiff(account, parsed);
      if (changes) {
        await storage.createAuditLogEntry({
          jointAccountId: req.params.id,
          userId,
          action: "update",
          changes,
        });
      }
      
      res.json(updated);
    } catch (error: any) {
      log.error("Error updating joint account", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update joint account" });
    }
  });

  app.delete('/api/joint-accounts/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getJointAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, account.householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteJointAccount(req.params.id);
      res.status(204).send();
    } catch (error) {
      log.error("Error deleting joint account", error);
      res.status(500).json({ message: "Failed to delete joint account" });
    }
  });

  // Joint account ownership routes
  app.get('/api/joint-accounts/:jointAccountId/owners', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount('joint', req.params.jointAccountId);
      if (!householdId) {
        return res.status(404).json({ message: "Joint account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const owners = await storage.getJointAccountOwners(req.params.jointAccountId);
      res.json(owners);
    } catch (error) {
      log.error("Error fetching joint account owners", error);
      res.status(500).json({ message: "Failed to fetch owners" });
    }
  });

  app.post('/api/joint-account-ownership', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertJointAccountOwnershipSchema.parse(req.body);
      
      // Check authorization via the joint account
      const householdId = await storage.getHouseholdIdFromAccount('joint', parsed.jointAccountId);
      if (!householdId) {
        return res.status(404).json({ message: "Joint account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const ownership = await storage.addJointAccountOwner(parsed);
      res.json(ownership);
    } catch (error: any) {
      log.error("Error adding joint account owner", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add joint account owner" });
    }
  });

  // REFACTORING: Alert routes extracted to routes/alerts.ts
  const { registerAlertRoutes } = await import("./routes/alerts");
  registerAlertRoutes(app);

  // Legacy alert routes (keeping for now, will be removed after testing)
  app.get('/api/alerts', 
    validateQuery(z.object({
      status: z.enum(['pending', 'executed', 'dismissed']).optional(),
    })),
    isAuthenticated, 
    async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const status = req.query.status as "pending" | "executed" | "dismissed" | undefined;
      const allAlerts = status
        ? await storage.getAlertsByStatus(status)
        : await storage.getAllAlerts();
      
      // Filter alerts to only those owned by this user (or legacy alerts without userId)
      const userAlerts = allAlerts.filter(alert => !alert.userId || alert.userId === userId);
      res.json(userAlerts);
    } catch (error) {
      log.error("Error fetching alerts", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.patch('/api/alerts/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Verify the user owns this alert
      const existingAlert = await storage.getAlert(req.params.id);
      if (!existingAlert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      if (existingAlert.userId && existingAlert.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateAlertSchema.parse(req.body);
      const alert = await storage.updateAlert(req.params.id, parsed);
      
      // If alert is being dismissed, archive related tasks
      if (parsed.status === "dismissed") {
        try {
          const relatedTasks = await storage.getTasksBySymbol(userId, existingAlert.symbol);
          let archivedCount = 0;
          for (const task of relatedTasks) {
            // Only archive tasks that match this specific alert (by checking the title pattern)
            if (task.title.includes(`TradingView ${existingAlert.signal} Alert: ${existingAlert.symbol}`)) {
              await storage.archiveAccountTask(task.id);
              archivedCount++;
            }
          }
          if (archivedCount > 0) {
            log.debug("Archived tasks related to dismissed alert", { archivedCount, alertId: alert.id, symbol: existingAlert.symbol });
          }
        } catch (taskError) {
          log.error("Error archiving tasks for dismissed alert", taskError);
          // Don't fail the alert update if task archiving fails
        }
      }
      
      res.json(alert);
    } catch (error: any) {
      log.error("Error updating alert", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update alert" });
    }
  });

  // Dismiss all pending alerts
  app.post('/api/alerts/dismiss-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all pending alerts for this user
      const allAlerts = await storage.getAlertsByStatus("pending");
      const userPendingAlerts = allAlerts.filter(alert => !alert.userId || alert.userId === userId);
      
      // Track processed alert-signal-symbol combinations to avoid duplicate task archiving
      const processedAlerts = new Set<string>();
      let dismissedCount = 0;
      let totalArchivedTasks = 0;
      
      // Dismiss each alert and archive related tasks
      for (const alert of userPendingAlerts) {
        await storage.updateAlert(alert.id, { status: "dismissed" });
        dismissedCount++;
        
        // Archive related tasks for this specific alert (signal + symbol combination)
        const alertKey = `${alert.signal}:${alert.symbol}`;
        if (!processedAlerts.has(alertKey)) {
          try {
            const relatedTasks = await storage.getTasksBySymbol(userId, alert.symbol);
            for (const task of relatedTasks) {
              // Only archive tasks that match this specific alert (signal and symbol)
              if (task.title.includes(`TradingView ${alert.signal} Alert: ${alert.symbol}`)) {
                await storage.archiveAccountTask(task.id);
                totalArchivedTasks++;
              }
            }
            processedAlerts.add(alertKey);
          } catch (taskError) {
            log.error("Error archiving tasks for alert", taskError, { signal: alert.signal, symbol: alert.symbol });
            // Continue processing other alerts even if task archiving fails
          }
        }
      }
      
      res.json({ 
        message: `Dismissed ${dismissedCount} alerts${totalArchivedTasks > 0 ? ` and archived ${totalArchivedTasks} related task(s)` : ''}`, 
        count: dismissedCount,
        archivedTasks: totalArchivedTasks
      });
    } catch (error: any) {
      log.error("Error dismissing all alerts", error);
      res.status(500).json({ message: "Failed to dismiss alerts" });
    }
  });

  // Get accounts affected by a symbol (for alert details)
  app.get('/api/symbols/:symbol/affected-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const symbol = req.params.symbol;
      
      // Find all positions for this symbol
      const positionsForSymbol = await storage.getPositionsBySymbol(symbol);
      
      // Helper to normalize tickers for matching
      const normalizeTicker = (ticker: string | null | undefined): string => {
        if (!ticker) return '';
        return ticker.toUpperCase().replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '');
      };
      
      const affectedAccounts: Array<{
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
      }> = [];
      
      // Track which accounts we've already processed (to avoid duplicates)
      const processedAccounts = new Set<string>();
      
      // Process accounts that have positions in this symbol
      for (const position of positionsForSymbol) {
        let accountType: string;
        let accountId: string;
        let account: any;
        let allPositions: any[];
        let targetAllocations: any[];
        let ownerName = '';
        let householdName = '';
        let householdId = '';
        
        // Determine account type and fetch related data
        if (position.individualAccountId) {
          accountType = 'individual';
          accountId = position.individualAccountId;
          account = await storage.getIndividualAccount(accountId);
          if (!account) continue;
          
          const individual = await storage.getIndividual(account.individualId);
          if (!individual) continue;
          
          householdId = individual.householdId;
          ownerName = individual.name;
          allPositions = await storage.getPositionsByIndividualAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByIndividualAccount(accountId);
        } else if (position.corporateAccountId) {
          accountType = 'corporate';
          accountId = position.corporateAccountId;
          account = await storage.getCorporateAccount(accountId);
          if (!account) continue;
          
          const corporation = await storage.getCorporation(account.corporationId);
          if (!corporation) continue;
          
          householdId = corporation.householdId;
          ownerName = corporation.name;
          allPositions = await storage.getPositionsByCorporateAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByCorporateAccount(accountId);
        } else if (position.jointAccountId) {
          accountType = 'joint';
          accountId = position.jointAccountId;
          account = await storage.getJointAccount(accountId);
          if (!account) continue;
          
          householdId = account.householdId;
          const owners = await storage.getJointAccountOwners(accountId);
          ownerName = owners.map((o: any) => o.name).join(' & ');
          allPositions = await storage.getPositionsByJointAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByJointAccount(accountId);
        } else {
          continue;
        }
        
        // Check if user has access to this household
        const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
        if (!hasAccess) continue;
        
        // Mark as processed
        processedAccounts.add(`${accountType}:${accountId}`);
        
        // Get household name and category
        const household = await storage.getHousehold(householdId);
        householdName = household?.name || 'Unknown';
        const householdCategory = household?.category || 'uncategorized';
        
        // Calculate portfolio total value
        const totalValue = allPositions.reduce((sum, p) => {
          const qty = parseFloat(p.quantity || '0');
          const price = parseFloat(p.currentPrice || p.entryPrice || '0');
          // Validate: ensure non-negative values
          if (qty < 0 || price < 0 || isNaN(qty) || isNaN(price)) {
            log.warn("[Affected Accounts] Invalid position values: qty=${qty}, price=${price} for position ${p.id}");
            return sum;
          }
          return sum + (qty * price);
        }, 0);
        
        // Calculate current position value and percentage
        const positionQty = parseFloat(position.quantity || '0');
        const positionPrice = parseFloat(position.currentPrice || position.entryPrice || '0');
        
        // Validate position values
        if (positionQty < 0 || positionPrice < 0 || isNaN(positionQty) || isNaN(positionPrice)) {
          log.warn("[Affected Accounts] Invalid position values: qty=${positionQty}, price=${positionPrice} for position ${position.id}");
          continue;
        }
        
        const currentValue = positionQty * positionPrice;
        // SECURITY: Prevent division by zero
        const actualPercentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
        
        // Find target allocation for this symbol
        const normalizedSymbol = normalizeTicker(symbol);
        const targetAllocation = targetAllocations.find(t => 
          normalizeTicker(t.symbol) === normalizedSymbol
        );
        
        const targetPercentage = targetAllocation ? parseFloat(targetAllocation.targetPercentage) : null;
        const variance = targetPercentage !== null ? actualPercentage - targetPercentage : null;
        
        // Determine status
        let status: 'under' | 'over' | 'on-target' | 'no-target' = 'no-target';
        if (variance !== null) {
          if (Math.abs(variance) <= 1) {
            status = 'on-target';
          } else if (variance < 0) {
            status = 'under';
          } else {
            status = 'over';
          }
        }
        
        // Format account name - use type field and format nicely
        let displayName = 'Account';
        if (account.type) {
          // Format type like "tfsa" -> "TFSA", "rrsp" -> "RRSP"
          displayName = account.type.toUpperCase();
        } else if (account.name) {
          displayName = account.name;
        }
        // Add nickname if available
        if (account.nickname) {
          displayName = `${displayName} - ${account.nickname}`;
        }
        
        affectedAccounts.push({
          accountId,
          accountType,
          accountName: displayName,
          householdName,
          householdCategory,
          ownerName,
          currentValue,
          actualPercentage,
          targetPercentage,
          variance,
          status,
        });
      }
      
      // Also include accounts that have target allocations for this symbol but NO positions
      const targetAllocationsForSymbol = await storage.getAccountTargetAllocationsBySymbol(symbol);
      
      for (const allocation of targetAllocationsForSymbol) {
        const accountKey = `${allocation.accountType}:${allocation.accountId}`;
        
        // Skip if already processed (has a position)
        if (processedAccounts.has(accountKey)) continue;
        
        let account: any;
        let allPositions: any[];
        let ownerName = '';
        let householdName = '';
        let householdId = '';
        
        // Fetch account details based on type
        if (allocation.accountType === 'individual') {
          account = await storage.getIndividualAccount(allocation.accountId);
          if (!account) continue;
          
          const individual = await storage.getIndividual(account.individualId);
          if (!individual) continue;
          
          householdId = individual.householdId;
          ownerName = individual.name;
          allPositions = await storage.getPositionsByIndividualAccount(allocation.accountId);
        } else if (allocation.accountType === 'corporate') {
          account = await storage.getCorporateAccount(allocation.accountId);
          if (!account) continue;
          
          const corporation = await storage.getCorporation(account.corporationId);
          if (!corporation) continue;
          
          householdId = corporation.householdId;
          ownerName = corporation.name;
          allPositions = await storage.getPositionsByCorporateAccount(allocation.accountId);
        } else if (allocation.accountType === 'joint') {
          account = await storage.getJointAccount(allocation.accountId);
          if (!account) continue;
          
          householdId = account.householdId;
          const owners = await storage.getJointAccountOwners(allocation.accountId);
          ownerName = owners.map((o: any) => o.name).join(' & ');
          allPositions = await storage.getPositionsByJointAccount(allocation.accountId);
        } else {
          continue;
        }
        
        // Check if user has access to this household
        const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
        if (!hasAccess) continue;
        
        // Get household name and category
        const household = await storage.getHousehold(householdId);
        householdName = household?.name || 'Unknown';
        const householdCategory = household?.category || 'uncategorized';
        
        // Target percentage from the allocation
        const targetPercentage = parseFloat(allocation.targetPercentage);
        
        // Current allocation is 0% since they don't hold the position
        const actualPercentage = 0;
        const currentValue = 0;
        const variance = actualPercentage - targetPercentage; // Will be negative (underweight)
        
        // Calculate total portfolio value
        const portfolioValue = allPositions.reduce((sum, p) => {
          const qty = parseFloat(p.quantity || '0');
          const price = parseFloat(p.currentPrice || p.entryPrice || '0');
          // Validate: ensure non-negative values
          if (qty < 0 || price < 0 || isNaN(qty) || isNaN(price)) {
            log.warn("[Affected Accounts] Invalid position values: qty=${qty}, price=${price} for position ${p.id}");
            return sum;
          }
          return sum + (qty * price);
        }, 0);
        
        // Status is 'zero-balance' if no portfolio value, otherwise 'under'
        const status: 'under' | 'over' | 'on-target' | 'no-target' | 'zero-balance' = 
          portfolioValue <= 0 ? 'zero-balance' : 'under';
        
        // Format account name
        let displayName = 'Account';
        if (account.type) {
          displayName = account.type.toUpperCase();
        } else if (account.name) {
          displayName = account.name;
        }
        if (account.nickname) {
          displayName = `${displayName} - ${account.nickname}`;
        }
        
        affectedAccounts.push({
          accountId: allocation.accountId,
          accountType: allocation.accountType,
          accountName: displayName,
          householdName,
          householdCategory,
          ownerName,
          currentValue,
          actualPercentage,
          targetPercentage,
          variance,
          status,
          portfolioValue,
        });
      }
      
      res.json(affectedAccounts);
    } catch (error) {
      log.error("Error fetching affected accounts", error);
      res.status(500).json({ message: "Failed to fetch affected accounts" });
    }
  });

  // TradingView webhook endpoint - validates secret and IP whitelist for security
  app.post('/api/webhooks/tradingview', rateLimit(webhookRateLimiter, (req) => {
    // Rate limit by IP for webhooks
    return req.ip || req.socket.remoteAddress || 'unknown';
  }), async (req, res) => {
    try {
      // SECURITY: IP whitelist validation (CRITICAL FIX #1)
      const tradingViewIpWhitelist = process.env.TRADINGVIEW_IP_WHITELIST;
      if (tradingViewIpWhitelist && process.env.NODE_ENV === 'production') {
        // Get client IP (handle proxies)
        const clientIp = req.ip || 
                        req.socket.remoteAddress || 
                        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
                        'unknown';
        
        const allowedIps = tradingViewIpWhitelist.split(',').map(ip => ip.trim());
        const isIpAllowed = allowedIps.some(allowedIp => {
          // Support CIDR notation (e.g., "192.168.1.0/24") or exact IP
          if (allowedIp.includes('/')) {
            // Simple CIDR check (for production, consider using ipaddr.js library)
            const [network, prefixLength] = allowedIp.split('/');
            // For now, do exact match on network part - full CIDR implementation would require a library
            return clientIp.startsWith(network);
          }
          return clientIp === allowedIp;
        });
        
        if (!isIpAllowed) {
          log.warn("TradingView Webhook - rejected request from IP (not in whitelist)", { clientIp });
          return res.status(403).json({ 
            message: "Forbidden: IP address not whitelisted",
            // Don't reveal whitelist in error message
          });
        }
        log.debug("TradingView Webhook - IP validated against whitelist", { clientIp });
      } else if (process.env.NODE_ENV === 'production' && !tradingViewIpWhitelist) {
        log.warn("TradingView Webhook - TRADINGVIEW_IP_WHITELIST not set in production - webhook is less secure");
      }
      
      // SECURITY: Require webhook secret validation in production
      const webhookSecret = process.env.TRADINGVIEW_WEBHOOK_SECRET;
      if (webhookSecret) {
        // Check URL query param, header, or body for secret
        const providedSecret = req.query.secret || req.headers['x-webhook-secret'] || req.body?.secret;
        
        if (providedSecret && providedSecret !== webhookSecret) {
          log.error("TradingView Webhook - secret mismatch", undefined, { 
            expectedPrefix: webhookSecret.substring(0, 8),
            providedPrefix: providedSecret?.substring(0, 8) 
          });
          return res.status(401).json({ message: "Unauthorized: Invalid webhook secret" });
        }
        
        // SECURITY: In production, require secret to be provided
        if (!providedSecret && process.env.NODE_ENV === 'production') {
          log.warn("TradingView Webhook - no secret provided in production, rejecting");
          return res.status(401).json({ message: "Unauthorized: Webhook secret required" });
        }
        
        if (!providedSecret && isLocalDev) {
          log.warn("TradingView Webhook - no secret provided - allowing webhook in local dev mode only");
        } else if (providedSecret) {
          log.debug("[TradingView Webhook] ✓ Secret validated successfully");
        }
      } else if (process.env.NODE_ENV === 'production') {
        // SECURITY: Warn if no secret is configured in production
        log.warn("[TradingView Webhook] ⚠️ TRADINGVIEW_WEBHOOK_SECRET not set in production - webhook is unsecured");
      }
      
      // Validate webhook payload
      const parsed = tradingViewWebhookSchema.parse(req.body);
      
      // Create alert record
      const alert = await storage.createAlert({
        symbol: parsed.symbol,
        signal: parsed.signal,
        price: parsed.price.toString(),
        message: parsed.message || '',
        webhookData: req.body,
      });
      
      // Send email notification immediately
      await sendTradingAlertEmail(parsed.symbol, parsed.signal, parsed.price.toString());
      
      // Helper to normalize tickers for matching
      // Handles both stock tickers (AAPL.TO -> AAPL) and crypto (BTC-USD -> BTCUSD, BTCUSD -> BTCUSD)
      const normalizeTicker = (ticker: string): string => {
        return ticker.toUpperCase()
          .replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '') // Remove exchange suffixes
          .replace(/-/g, ''); // Remove dashes (for crypto like BTC-USD -> BTCUSD)
      };
      
      // Helper to check if position matches the alert signal criteria
      const shouldProcessPosition = (actualPercent: number, targetPercent: number, signal: string): boolean => {
        if (signal === 'BUY') {
          return actualPercent < targetPercent; // Underweight
        } else if (signal === 'SELL') {
          return actualPercent > targetPercent; // Overweight
        }
        return false;
      };
      
      // Debug logging
      log.debug("TradingView Webhook - received alert", { signal: parsed.signal, symbol: parsed.symbol });
      const normalizedAlertSymbol = normalizeTicker(parsed.symbol);
      log.debug("TradingView Webhook - normalized symbol", { normalized: normalizedAlertSymbol });
      
      // Process alerts for both BUY and SELL signals
      const tasksCreated: string[] = [];
      const reportsSent: string[] = [];
      
      if (parsed.signal === 'BUY' || parsed.signal === 'SELL') {
        const reportEmail = parsed.email || process.env.TRADINGVIEW_REPORT_EMAIL;
        
        // Track processed accounts to avoid duplicates
        const processedAccountKeys = new Set<string>();
        
        // Find all positions for this symbol
        const positionsForSymbol = await storage.getPositionsBySymbol(parsed.symbol);
        log.debug("TradingView Webhook - found positions", { count: positionsForSymbol.length, symbol: parsed.symbol });
        
        // Process each position to check if it matches the signal
        for (const position of positionsForSymbol) {
          let accountType: string;
          let accountId: string;
          let account: any;
          let allPositions: any[];
          let targetAllocations: any[];
          let ownerName = '';
          let householdName = '';
          
          // Determine account type and fetch related data
          if (position.individualAccountId) {
            accountType = 'individual';
            accountId = position.individualAccountId;
            account = await storage.getIndividualAccount(accountId);
            allPositions = await storage.getPositionsByIndividualAccount(accountId);
            targetAllocations = await storage.getAccountTargetAllocationsByIndividualAccount(accountId);
            if (account) {
              const individual = await storage.getIndividual(account.individualId);
              if (individual) {
                ownerName = individual.name;
                const household = await storage.getHousehold(individual.householdId);
                householdName = household?.name || '';
              }
            }
          } else if (position.corporateAccountId) {
            accountType = 'corporate';
            accountId = position.corporateAccountId;
            account = await storage.getCorporateAccount(accountId);
            allPositions = await storage.getPositionsByCorporateAccount(accountId);
            targetAllocations = await storage.getAccountTargetAllocationsByCorporateAccount(accountId);
            if (account) {
              const corporation = await storage.getCorporation(account.corporationId);
              if (corporation) {
                ownerName = corporation.name;
                const household = await storage.getHousehold(corporation.householdId);
                householdName = household?.name || '';
              }
            }
          } else if (position.jointAccountId) {
            accountType = 'joint';
            accountId = position.jointAccountId;
            account = await storage.getJointAccount(accountId);
            allPositions = await storage.getPositionsByJointAccount(accountId);
            targetAllocations = await storage.getAccountTargetAllocationsByJointAccount(accountId);
            if (account) {
              const owners = await storage.getJointAccountOwners(accountId);
              const ownerNames: string[] = [];
              for (const individual of owners) {
                ownerNames.push(individual.name);
                if (!householdName) {
                  const household = await storage.getHousehold(individual.householdId);
                  householdName = household?.name || '';
                }
              }
              ownerName = ownerNames.join(' & ');
            }
          } else {
            continue; // Skip if no account association
          }
          
          if (!account) continue;
          
          // Track this account as processed
          processedAccountKeys.add(`${accountType}:${accountId}`);
          
          // Calculate portfolio totals and check allocation status
          const totalActualValue = allPositions.reduce((sum, pos) => {
            return sum + (Number(pos.quantity) * Number(pos.currentPrice));
          }, 0);
          
          if (totalActualValue <= 0) continue;
          
          // Find the position's actual allocation
          const positionValue = Number(position.quantity) * Number(position.currentPrice);
          // SECURITY: Prevent division by zero
          const actualPercent = totalActualValue > 0 ? (positionValue / totalActualValue) * 100 : 0;
          
          // Find target allocation for this symbol
          log.debug("TradingView Webhook - looking for target allocation", { positionSymbol: position.symbol, normalizedAlert: normalizedAlertSymbol });
          log.debug("TradingView Webhook - available target allocations", { 
            allocations: targetAllocations.map(t => ({
              ticker: t.holding?.ticker,
              normalized: t.holding?.ticker ? normalizeTicker(t.holding.ticker) : 'N/A',
              targetPercent: t.targetPercentage
            }))
          });
          
          const targetAlloc = targetAllocations.find(t => {
            if (!t.holding?.ticker) return false;
            const normalizedTicker = normalizeTicker(t.holding.ticker);
            const matches = normalizedTicker === normalizedAlertSymbol;
            if (matches) {
              log.debug("TradingView Webhook - found matching target allocation", { ticker: t.holding.ticker, normalized: normalizedTicker, alertSymbol: normalizedAlertSymbol });
            }
            return matches;
          });
          const targetPercent = targetAlloc ? Number(targetAlloc.targetPercentage) : 0;
          
          if (!targetAlloc) {
            log.debug("TradingView Webhook - no target allocation found", { symbol: normalizedAlertSymbol, accountId });
          }
          
          log.debug("TradingView Webhook - account allocation status", { accountId, householdName, actualPercent, targetPercent, signal: parsed.signal });
          
          // Check if position matches signal criteria
          const shouldProcess = shouldProcessPosition(actualPercent, targetPercent, parsed.signal);
          log.debug("TradingView Webhook - should process position", { actualPercent, targetPercent, signal: parsed.signal, shouldProcess });
          
          if (shouldProcess) {
            log.debug("TradingView Webhook - creating task", { householdName, accountType: account.type, actualPercent, targetPercent });
            try {
              // Use TradingView alert price for calculations (current market price)
              const alertPrice = Number(parsed.price);
              const storedPrice = Number(position.currentPrice); // Stored price for reference
              
              // Calculate shares needed using alert price (current market price)
              const targetValue = (targetPercent / 100) * totalActualValue;
              const sharesToTrade = alertPrice > 0 ? (targetValue - positionValue) / alertPrice : 0;
              
              // Create task with trade details
              const accountTypeLabels: Record<string, string> = {
                cash: 'Cash', tfsa: 'TFSA', fhsa: 'FHSA', rrsp: 'RRSP',
                lira: 'LIRA', liff: 'LIF', rif: 'RIF',
                corporate_cash: 'Corporate Cash', ipp: 'IPP',
                joint_cash: 'Joint Cash', resp: 'RESP'
              };
              
              const displayAccountType = accountTypeLabels[account.type] || account.type.toUpperCase();
              const accountDisplayName = account.nickname || '';
              const fullAccountName = `${displayAccountType}${accountDisplayName ? ` - ${accountDisplayName}` : ''}`;
              
              const taskTitle = `TradingView ${parsed.signal} Alert: ${parsed.symbol}`;
              const variance = actualPercent - targetPercent;
              const sharesNeeded = Math.abs(sharesToTrade);
              const dollarAmountAtAlertPrice = sharesNeeded * alertPrice;
              
              const taskDescription = 
                `📊 TradingView ${parsed.signal} Alert\n\n` +
                `Symbol: ${parsed.symbol}\n` +
                `Alert Price (Market): $${alertPrice.toFixed(2)}\n` +
                `${storedPrice !== alertPrice ? `Stored Price: $${storedPrice.toFixed(2)}\n` : ''}\n` +
                `📍 Location\n` +
                `Household: ${householdName}\n` +
                `Account: ${fullAccountName}\n\n` +
                `📈 Allocation Status\n` +
                `Current: ${actualPercent.toFixed(2)}%\n` +
                `Target: ${targetPercent.toFixed(2)}%\n` +
                `Variance: ${variance.toFixed(2)}%\n\n` +
                `💰 Action Required\n` +
                `${parsed.signal === 'BUY' ? 'Buy' : 'Sell'}: ${sharesNeeded.toFixed(2)} ${parsed.symbol === 'CASH' ? 'units' : 'shares'}\n` +
                `At Alert Price ($${alertPrice.toFixed(2)}): $${dollarAmountAtAlertPrice.toFixed(2)}`;
              
              // Create task based on account type
              let task;
              if (accountType === 'individual') {
                task = await storage.createAccountTask({
                  individualAccountId: accountId,
                  title: taskTitle,
                  description: taskDescription,
                  priority: 'high',
                  status: 'pending'
                });
              } else if (accountType === 'corporate') {
                task = await storage.createAccountTask({
                  corporateAccountId: accountId,
                  title: taskTitle,
                  description: taskDescription,
                  priority: 'high',
                  status: 'pending'
                });
              } else if (accountType === 'joint') {
                task = await storage.createAccountTask({
                  jointAccountId: accountId,
                  title: taskTitle,
                  description: taskDescription,
                  priority: 'high',
                  status: 'pending'
                });
              }
              
              if (task) {
                tasksCreated.push(`${fullAccountName} (${householdName}) - ${parsed.signal} ${parsed.symbol}`);
              }
              
              // Optionally send email report if configured
              if (reportEmail) {
                try {
                  // Build portfolio comparison data for report
                  const actualByTicker = new Map<string, { value: number; quantity: number; originalTicker: string; price: number }>();
                  for (const pos of allPositions) {
                    const originalTicker = pos.symbol.toUpperCase();
                    const normalizedTicker = normalizeTicker(originalTicker);
                    const value = Number(pos.quantity) * Number(pos.currentPrice);
                    const existing = actualByTicker.get(normalizedTicker) || { value: 0, quantity: 0, originalTicker, price: Number(pos.currentPrice) };
                    actualByTicker.set(normalizedTicker, {
                      value: existing.value + value,
                      quantity: existing.quantity + Number(pos.quantity),
                      originalTicker: existing.originalTicker,
                      price: Number(pos.currentPrice)
                    });
                  }
                  
                  // Build report positions
                  const reportPositions: Array<{
                    symbol: string;
                    name?: string;
                    quantity: number;
                    currentPrice: number;
                    marketValue: number;
                    actualPercentage: number;
                    targetPercentage: number;
                    variance: number;
                    changeNeeded: number;
                    sharesToTrade: number;
                    status: 'over' | 'under' | 'on-target' | 'unexpected';
                  }> = [];
                  
                  const processedNormalizedTickers = new Set<string>();
                  
                  // Add all target allocations
                  for (const allocation of targetAllocations) {
                    if (!allocation.holding?.ticker) continue;
                    const displayTicker = allocation.holding.ticker.toUpperCase();
                    const normalizedTicker = normalizeTicker(displayTicker);
                    processedNormalizedTickers.add(normalizedTicker);
                    
                    const actual = actualByTicker.get(normalizedTicker);
                    const actualValue = actual?.value || 0;
                    // SECURITY: Prevent division by zero
                    const actualPercentage = totalActualValue > 0 ? (actualValue / totalActualValue) * 100 : 0;
                    const targetPercentage = Number(allocation.targetPercentage) || 0;
                    
                    // Validate target percentage
                    if (targetPercentage < 0 || targetPercentage > 100) {
                      log.warn("Rebalance Report - invalid target percentage", { targetPercentage, allocationId: allocation.id });
                      continue;
                    }
                    
                    const variance = actualPercentage - targetPercentage;
                    const targetValue = totalActualValue > 0 ? (targetPercentage / 100) * totalActualValue : 0;
                    const changeNeeded = targetValue - actualValue;
                    const currentPrice = actual?.price || Number(allocation.holding?.price) || 0;
                    
                    // SECURITY: Validate price to prevent division by zero
                    if (currentPrice <= 0) {
                      log.warn("Rebalance Report - invalid or missing price", { ticker: displayTicker, price: currentPrice });
                      continue;
                    }
                    
                    const sharesToTrade = changeNeeded / currentPrice;
                    
                    reportPositions.push({
                      symbol: displayTicker,
                      name: displayTicker,
                      quantity: actual?.quantity || 0,
                      currentPrice,
                      marketValue: actualValue,
                      actualPercentage: Math.round(actualPercentage * 100) / 100,
                      targetPercentage,
                      variance: Math.round(variance * 100) / 100,
                      changeNeeded: Math.round(changeNeeded * 100) / 100,
                      sharesToTrade: Math.round(sharesToTrade * 100) / 100,
                      status: (variance > 2 ? 'over' : variance < -2 ? 'under' : 'on-target') as 'over' | 'under' | 'on-target'
                    });
                  }
                  
                  // Add unexpected positions
                  for (const [normalizedTicker, data] of Array.from(actualByTicker.entries())) {
                    if (!processedNormalizedTickers.has(normalizedTicker)) {
                      const actualPercentage = totalActualValue > 0 ? (data.value / totalActualValue) * 100 : 0;
                      reportPositions.push({
                        symbol: data.originalTicker,
                        name: data.originalTicker,
                        quantity: data.quantity,
                        currentPrice: data.price,
                        marketValue: data.value,
                        actualPercentage: Math.round(actualPercentage * 100) / 100,
                        targetPercentage: 0,
                        variance: Math.round(actualPercentage * 100) / 100,
                        changeNeeded: -data.value,
                        sharesToTrade: -data.quantity,
                        status: 'unexpected' as const
                      });
                    }
                  }
                  
                  // Generate PDF
                  const pdfBuffer = await generatePortfolioRebalanceReport({
                    accountName: accountDisplayName,
                    accountType: displayAccountType,
                    householdName,
                    ownerName,
                    totalValue: totalActualValue,
                    positions: reportPositions,
                    generatedAt: new Date()
                  });
                  
                  const statusText = parsed.signal === 'BUY' ? 'Underweight' : 'Overweight';
                  await sendEmailWithAttachment(
                    reportEmail,
                    `TradingView ${parsed.signal} Alert: ${parsed.symbol} - ${statusText} Position Report`,
                    `A TradingView ${parsed.signal} alert was triggered for ${parsed.symbol} at $${parsed.price}.\n\n` +
                    `This position is currently ${statusText.toUpperCase()} in:\n` +
                    `- Household: ${householdName}\n` +
                    `- Owner: ${ownerName}\n` +
                    `- Account: ${fullAccountName}\n\n` +
                    `Current allocation: ${actualPercent.toFixed(2)}%\n` +
                    `Target allocation: ${targetPercent.toFixed(2)}%\n` +
                    `Variance: ${variance.toFixed(2)}%\n\n` +
                    `A task has been created in your portfolio management system.\n` +
                    `Please see the attached PDF report for detailed rebalancing recommendations.`,
                    pdfBuffer,
                    `Portfolio_Rebalancing_${householdName.replace(/\s+/g, '_')}_${account.type}_${new Date().toISOString().split('T')[0]}.pdf`
                  );
                  
                  reportsSent.push(`${fullAccountName} (${householdName})`);
                } catch (emailError) {
                  log.error("Failed to send report for account", emailError, { accountId });
                }
              }
            } catch (taskError) {
              log.error("Failed to create task for account", taskError, { accountId });
            }
          }
        }
        
        // Also process accounts with target allocations but NO positions (BUY signals only)
        // These accounts have planned to hold this ticker but haven't bought yet
        if (parsed.signal === 'BUY') {
          const targetAllocationsForSymbol = await storage.getAccountTargetAllocationsBySymbol(parsed.symbol);
          log.debug("TradingView Webhook - found target allocations (no positions)", { count: targetAllocationsForSymbol.length, symbol: parsed.symbol });
          
          for (const allocation of targetAllocationsForSymbol) {
            const accountKey = `${allocation.accountType}:${allocation.accountId}`;
            
            // Skip if already processed (has a position)
            if (processedAccountKeys.has(accountKey)) continue;
            
            let account: any;
            let allPositions: any[];
            let ownerName = '';
            let householdName = '';
            
            // Fetch account details based on type
            if (allocation.accountType === 'individual') {
              account = await storage.getIndividualAccount(allocation.accountId);
              if (!account) continue;
              
              const individual = await storage.getIndividual(account.individualId);
              if (!individual) continue;
              
              ownerName = individual.name;
              const household = await storage.getHousehold(individual.householdId);
              householdName = household?.name || '';
              allPositions = await storage.getPositionsByIndividualAccount(allocation.accountId);
            } else if (allocation.accountType === 'corporate') {
              account = await storage.getCorporateAccount(allocation.accountId);
              if (!account) continue;
              
              const corporation = await storage.getCorporation(account.corporationId);
              if (!corporation) continue;
              
              ownerName = corporation.name;
              const household = await storage.getHousehold(corporation.householdId);
              householdName = household?.name || '';
              allPositions = await storage.getPositionsByCorporateAccount(allocation.accountId);
            } else if (allocation.accountType === 'joint') {
              account = await storage.getJointAccount(allocation.accountId);
              if (!account) continue;
              
              const owners = await storage.getJointAccountOwners(allocation.accountId);
              const ownerNames: string[] = [];
              let householdId = '';
              for (const individual of owners) {
                ownerNames.push(individual.name);
                if (!householdId) {
                  householdId = individual.householdId;
                  const household = await storage.getHousehold(householdId);
                  householdName = household?.name || '';
                }
              }
              ownerName = ownerNames.join(' & ');
              allPositions = await storage.getPositionsByJointAccount(allocation.accountId);
            } else {
              continue;
            }
            
        // Calculate total portfolio value
        const totalActualValue = allPositions.reduce((sum, pos) => {
          const qty = Number(pos.quantity) || 0;
          const price = Number(pos.currentPrice) || 0;
          // Validate: ensure non-negative values
          if (qty < 0 || price < 0) {
            log.warn("Webhook - invalid position values", { qty, price, positionId: pos.id });
            return sum;
          }
          return sum + (qty * price);
        }, 0);
        
        // Skip if no existing portfolio value (can't calculate allocations)
        if (totalActualValue <= 0) continue;
        
        // Current allocation is 0% since they don't hold this position
        const actualPercent = 0;
        const targetPercent = Number(allocation.targetPercentage) || 0;
        
        // Validate target percentage
        if (targetPercent < 0 || targetPercent > 100) {
          log.warn("Webhook - invalid target percentage", { targetPercent, allocationId: allocation.id });
          continue;
        }
        
        // Calculate how much they should buy
        const targetValue = (targetPercent / 100) * totalActualValue;
        const sharePrice = Number(parsed.price) || 0;
        
        // SECURITY: Validate share price to prevent division by zero and negative prices
        if (sharePrice <= 0) {
          log.warn("Webhook - invalid share price", { sharePrice, symbol: parsed.symbol });
          continue;
        }
        
        const sharesToBuy = targetValue / sharePrice;
            
            // Create task
            try {
              const accountTypeLabels: Record<string, string> = {
                cash: 'Cash', tfsa: 'TFSA', fhsa: 'FHSA', rrsp: 'RRSP',
                lira: 'LIRA', liff: 'LIF', rif: 'RIF',
                corporate_cash: 'Corporate Cash', ipp: 'IPP',
                joint_cash: 'Joint Cash', resp: 'RESP'
              };
              
              const displayAccountType = accountTypeLabels[account.type] || account.type.toUpperCase();
              const accountDisplayName = account.nickname || '';
              const fullAccountName = `${displayAccountType}${accountDisplayName ? ` - ${accountDisplayName}` : ''}`;
              
              const taskTitle = `TradingView BUY Alert: ${parsed.symbol}`;
              const variance = actualPercent - targetPercent; // Will be negative
              const alertPrice = parsed.price; // Price from TradingView alert
              
              const taskDescription = 
                `📊 TradingView BUY Alert\n\n` +
                `Symbol: ${parsed.symbol}\n` +
                `Alert Price: $${alertPrice.toFixed(2)}\n` +
                `Current Price: $${sharePrice.toFixed(2)}\n\n` +
                `📍 Location\n` +
                `Household: ${householdName}\n` +
                `Account: ${fullAccountName}\n\n` +
                `📈 Allocation Status\n` +
                `Current: 0.00% (Not Currently Held)\n` +
                `Target: ${targetPercent.toFixed(2)}%\n` +
                `Variance: ${variance.toFixed(2)}%\n\n` +
                `💰 Action Required\n` +
                `Buy: ${sharesToBuy.toFixed(2)} ${parsed.symbol === 'CASH' ? 'units' : 'shares'}\n` +
                `At Alert Price ($${alertPrice.toFixed(2)}): $${(sharesToBuy * alertPrice).toFixed(2)}\n` +
                `At Current Price ($${sharePrice.toFixed(2)}): $${targetValue.toFixed(2)}`;
              
              // Create task based on account type
              let task;
              if (allocation.accountType === 'individual') {
                task = await storage.createAccountTask({
                  individualAccountId: allocation.accountId,
                  title: taskTitle,
                  description: taskDescription,
                  priority: 'high',
                  status: 'pending'
                });
              } else if (allocation.accountType === 'corporate') {
                task = await storage.createAccountTask({
                  corporateAccountId: allocation.accountId,
                  title: taskTitle,
                  description: taskDescription,
                  priority: 'high',
                  status: 'pending'
                });
              } else if (allocation.accountType === 'joint') {
                task = await storage.createAccountTask({
                  jointAccountId: allocation.accountId,
                  title: taskTitle,
                  description: taskDescription,
                  priority: 'high',
                  status: 'pending'
                });
              }
              
              if (task) {
                tasksCreated.push(`${fullAccountName} (${householdName}) - BUY ${parsed.symbol} (Not Currently Held)`);
              }
              
              // Send email report if configured
              if (reportEmail) {
                try {
                  const targetAllocations = allocation.accountType === 'individual' 
                    ? await storage.getAccountTargetAllocationsByIndividualAccount(allocation.accountId)
                    : allocation.accountType === 'corporate'
                    ? await storage.getAccountTargetAllocationsByCorporateAccount(allocation.accountId)
                    : await storage.getAccountTargetAllocationsByJointAccount(allocation.accountId);
                  
                  // Build portfolio comparison data for report
                  const actualByTicker = new Map<string, { value: number; quantity: number; originalTicker: string; price: number }>();
                  for (const pos of allPositions) {
                    const originalTicker = pos.symbol.toUpperCase();
                    const normalizedTicker = normalizeTicker(originalTicker);
                    const value = Number(pos.quantity) * Number(pos.currentPrice);
                    const existing = actualByTicker.get(normalizedTicker) || { value: 0, quantity: 0, originalTicker, price: Number(pos.currentPrice) };
                    actualByTicker.set(normalizedTicker, {
                      value: existing.value + value,
                      quantity: existing.quantity + Number(pos.quantity),
                      originalTicker: existing.originalTicker,
                      price: Number(pos.currentPrice)
                    });
                  }
                  
                  const processedNormalizedTickers = new Set<string>();
                  const reportPositions: Array<{
                    symbol: string;
                    name: string;
                    quantity: number;
                    currentPrice: number;
                    marketValue: number;
                    actualPercentage: number;
                    targetPercentage: number;
                    variance: number;
                    changeNeeded: number;
                    sharesToTrade: number;
                    status: 'over' | 'under' | 'on-target' | 'unexpected';
                  }> = [];
                  
                  for (const target of targetAllocations) {
                    const targetTicker = target.holding?.ticker || '';
                    const normalizedTargetTicker = normalizeTicker(targetTicker);
                    processedNormalizedTickers.add(normalizedTargetTicker);
                    
                    const actual = actualByTicker.get(normalizedTargetTicker);
                    const actualValue = actual?.value || 0;
                    const actualPercentage = totalActualValue > 0 ? (actualValue / totalActualValue) * 100 : 0;
                    const targetPercentage = Number(target.targetPercentage);
                    const variance = actualPercentage - targetPercentage;
                    const currentPrice = actual?.price || parsed.price;
                    const changeNeeded = ((targetPercentage - actualPercentage) / 100) * totalActualValue;
                    const sharesToTrade = currentPrice > 0 ? changeNeeded / currentPrice : 0;
                    
                    const displayTicker = actual?.originalTicker || targetTicker;
                    
                    reportPositions.push({
                      symbol: displayTicker,
                      name: displayTicker,
                      quantity: actual?.quantity || 0,
                      currentPrice,
                      marketValue: actualValue,
                      actualPercentage: Math.round(actualPercentage * 100) / 100,
                      targetPercentage,
                      variance: Math.round(variance * 100) / 100,
                      changeNeeded: Math.round(changeNeeded * 100) / 100,
                      sharesToTrade: Math.round(sharesToTrade * 100) / 100,
                      status: (variance > 2 ? 'over' : variance < -2 ? 'under' : 'on-target') as 'over' | 'under' | 'on-target'
                    });
                  }
                  
                  // Generate PDF
                  const pdfBuffer = await generatePortfolioRebalanceReport({
                    accountName: accountDisplayName,
                    accountType: displayAccountType,
                    householdName,
                    ownerName,
                    totalValue: totalActualValue,
                    positions: reportPositions,
                    generatedAt: new Date()
                  });
                  
                  await sendEmailWithAttachment(
                    reportEmail,
                    `TradingView BUY Alert: ${parsed.symbol} - Target Not Yet Held`,
                    `A TradingView BUY alert was triggered for ${parsed.symbol} at $${parsed.price}.\n\n` +
                    `This symbol has a target allocation but is NOT CURRENTLY HELD in:\n` +
                    `- Household: ${householdName}\n` +
                    `- Owner: ${ownerName}\n` +
                    `- Account: ${fullAccountName}\n\n` +
                    `Target allocation: ${targetPercent.toFixed(2)}%\n` +
                    `Suggested purchase: ${Math.round(sharesToBuy * 100) / 100} shares (~$${Math.round(targetValue * 100) / 100})\n\n` +
                    `A task has been created in your portfolio management system.\n` +
                    `Please see the attached PDF report for detailed rebalancing recommendations.`,
                    pdfBuffer,
                    `Portfolio_Rebalancing_${householdName.replace(/\s+/g, '_')}_${account.type}_${new Date().toISOString().split('T')[0]}.pdf`
                  );
                  
                  reportsSent.push(`${fullAccountName} (${householdName}) - Not Held`);
                } catch (emailError) {
                  log.error("Failed to send report for target-only account", emailError, { accountId: allocation.accountId });
                }
              }
            } catch (taskError) {
              log.error("Failed to create task for target-only account", taskError, { accountId: allocation.accountId });
            }
          }
        }
      }
      
      res.json({ 
        success: true, 
        alertId: alert.id,
        tasksCreated: tasksCreated.length,
        tasks: tasksCreated,
        reportsSent: reportsSent.length,
        accounts: reportsSent
      });
    } catch (error: any) {
      log.error("Error processing TradingView webhook", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid webhook data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  // Position routes
  app.get('/api/individual-accounts/:accountId/positions', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromAccount('individual', req.params.accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const positions = await storage.getPositionsByIndividualAccount(req.params.accountId);
      res.json(positions);
    } catch (error) {
      log.error("Error fetching positions", error);
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  app.get('/api/corporate-accounts/:accountId/positions', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromAccount('corporate', req.params.accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const positions = await storage.getPositionsByCorporateAccount(req.params.accountId);
      res.json(positions);
    } catch (error) {
      log.error("Error fetching positions", error);
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  app.get('/api/joint-accounts/:accountId/positions', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromAccount('joint', req.params.accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const positions = await storage.getPositionsByJointAccount(req.params.accountId);
      res.json(positions);
    } catch (error) {
      log.error("Error fetching positions", error);
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  // Watchlist position routes
  app.get('/api/individual-accounts/:accountId/watchlist-positions', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromAccount('individual', req.params.accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const positions = await storage.getWatchlistPositionsByIndividualAccount(req.params.accountId);
      res.json(positions);
    } catch (error) {
      log.error("Error fetching watchlist positions", error);
      res.status(500).json({ message: "Failed to fetch watchlist positions" });
    }
  });

  app.get('/api/corporate-accounts/:accountId/watchlist-positions', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromAccount('corporate', req.params.accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const positions = await storage.getWatchlistPositionsByCorporateAccount(req.params.accountId);
      res.json(positions);
    } catch (error) {
      log.error("Error fetching watchlist positions", error);
      res.status(500).json({ message: "Failed to fetch watchlist positions" });
    }
  });

  app.get('/api/joint-accounts/:accountId/watchlist-positions', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromAccount('joint', req.params.accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const positions = await storage.getWatchlistPositionsByJointAccount(req.params.accountId);
      res.json(positions);
    } catch (error) {
      log.error("Error fetching watchlist positions", error);
      res.status(500).json({ message: "Failed to fetch watchlist positions" });
    }
  });

  // Create watchlist for account
  app.post('/api/accounts/:accountType/:accountId/watchlist', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId } = req.params;
      
      if (!['individual', 'corporate', 'joint'].includes(accountType)) {
        return res.status(400).json({ message: "Invalid account type" });
      }
      
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Check if account already has a watchlist
      let account;
      if (accountType === 'individual') {
        account = await storage.getIndividualAccount(accountId);
      } else if (accountType === 'corporate') {
        account = await storage.getCorporateAccount(accountId);
      } else {
        account = await storage.getJointAccount(accountId);
      }
      
      if (account?.watchlistPortfolioId) {
        return res.status(400).json({ message: "Account already has a watchlist" });
      }
      
      const portfolioName = req.body.name || `${account?.nickname || 'Account'} Watchlist`;
      const watchlist = await storage.createWatchlistForAccount(
        accountType as 'individual' | 'corporate' | 'joint',
        accountId,
        portfolioName
      );
      
      res.status(201).json(watchlist);
    } catch (error) {
      log.error("Error creating watchlist", error);
      res.status(500).json({ message: "Failed to create watchlist" });
    }
  });

  // Add position to watchlist
  app.post('/api/accounts/:accountType/:accountId/watchlist/positions', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId } = req.params;
      
      if (!['individual', 'corporate', 'joint'].includes(accountType)) {
        return res.status(400).json({ message: "Invalid account type" });
      }
      
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get the account's watchlist portfolio ID
      let account;
      if (accountType === 'individual') {
        account = await storage.getIndividualAccount(accountId);
      } else if (accountType === 'corporate') {
        account = await storage.getCorporateAccount(accountId);
      } else {
        account = await storage.getJointAccount(accountId);
      }
      
      if (!account?.watchlistPortfolioId) {
        return res.status(400).json({ message: "Account does not have a watchlist. Create one first." });
      }
      
      const parsed = insertPositionSchema.parse({
        ...req.body,
        freelancePortfolioId: account.watchlistPortfolioId,
        individualAccountId: null,
        corporateAccountId: null,
        jointAccountId: null
      });
      
      // Auto-add ticker to Universal Holdings if it doesn't exist (with enhanced lookup)
      const ticker = parsed.symbol.toUpperCase();
      const existingHolding = await storage.getUniversalHoldingByTicker(ticker);
      if (!existingHolding) {
        const lookupData = await enhancedTickerLookup(ticker);
        await storage.createUniversalHolding({
          ticker: ticker,
          category: 'auto_added',
          name: lookupData.name || ticker,
          riskLevel: 'medium',
          dividendRate: lookupData.dividendRate?.toString() || '0',
          dividendYield: lookupData.dividendYield?.toString() || '0',
          dividendPayout: lookupData.dividendPayout || 'monthly',
          price: lookupData.price?.toString() || parsed.currentPrice || '0',
          fundFactsUrl: lookupData.fundFactsUrl || '',
          description: lookupData.provider ? `${lookupData.provider} ETF. Auto-added from position.` : 'Auto-added from position.',
        });
      }
      
      const position = await storage.createPosition(parsed);
      res.status(201).json(position);
    } catch (error: any) {
      log.error("Error creating watchlist position", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid position data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create watchlist position" });
    }
  });

  app.post('/api/positions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertPositionSchema.parse(req.body);
      
      // Determine account type and get household ID
      let householdId: string | null = null;
      if (parsed.individualAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('individual', parsed.individualAccountId);
      } else if (parsed.corporateAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('corporate', parsed.corporateAccountId);
      } else if (parsed.jointAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('joint', parsed.jointAccountId);
      }
      
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Auto-add ticker to Universal Holdings if it doesn't exist (with enhanced lookup)
      const ticker = parsed.symbol.toUpperCase();
      const existingHolding = await storage.getUniversalHoldingByTicker(ticker);
      if (!existingHolding) {
        const lookupData = await enhancedTickerLookup(ticker);
        await storage.createUniversalHolding({
          ticker: ticker,
          name: lookupData.name || `${ticker} (Auto-added)`,
          category: "auto_added",
          riskLevel: "medium",
          dividendRate: lookupData.dividendRate?.toString() || "0",
          dividendYield: lookupData.dividendYield?.toString() || "0",
          dividendPayout: lookupData.dividendPayout || "monthly",
          price: lookupData.price?.toString() || parsed.currentPrice?.toString() || "0",
          fundFactsUrl: lookupData.fundFactsUrl || "",
          description: lookupData.provider ? `${lookupData.provider} ETF. Auto-added from position.` : "Auto-added from position.",
        });
      }
      
      const position = await storage.createPosition(parsed);
      
      // Create audit log entry
      await storage.createAuditLogEntry({
        individualAccountId: parsed.individualAccountId || undefined,
        corporateAccountId: parsed.corporateAccountId || undefined,
        jointAccountId: parsed.jointAccountId || undefined,
        userId,
        action: "position_add",
        changes: { 
          symbol: position.symbol, 
          quantity: position.quantity,
          entryPrice: position.entryPrice,
          currentPrice: position.currentPrice
        },
      });
      
      res.json(position);
    } catch (error: any) {
      log.error("Error creating position", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create position" });
    }
  });

  app.patch('/api/positions/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromPosition(req.params.id);
      if (!householdId) {
        return res.status(404).json({ message: "Position not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get existing position for audit log
      const existingPosition = await storage.getPosition(req.params.id);
      
      const parsed = updatePositionSchema.parse(req.body);
      const position = await storage.updatePosition(req.params.id, parsed);
      
      // Create audit log entry
      if (existingPosition) {
        const changes: Record<string, { old: any; new: any }> = {};
        if (parsed.quantity !== undefined && parsed.quantity !== existingPosition.quantity) {
          changes.quantity = { old: existingPosition.quantity, new: parsed.quantity };
        }
        if (parsed.entryPrice !== undefined && parsed.entryPrice !== existingPosition.entryPrice) {
          changes.entryPrice = { old: existingPosition.entryPrice, new: parsed.entryPrice };
        }
        if (parsed.currentPrice !== undefined && parsed.currentPrice !== existingPosition.currentPrice) {
          changes.currentPrice = { old: existingPosition.currentPrice, new: parsed.currentPrice };
        }
        if (parsed.stopPrice !== undefined && parsed.stopPrice !== existingPosition.stopPrice) {
          changes.stopPrice = { old: existingPosition.stopPrice, new: parsed.stopPrice };
        }
        if (parsed.limitPrice !== undefined && parsed.limitPrice !== existingPosition.limitPrice) {
          changes.limitPrice = { old: existingPosition.limitPrice, new: parsed.limitPrice };
        }
        
        if (Object.keys(changes).length > 0) {
          await storage.createAuditLogEntry({
            individualAccountId: existingPosition.individualAccountId || undefined,
            corporateAccountId: existingPosition.corporateAccountId || undefined,
            jointAccountId: existingPosition.jointAccountId || undefined,
            userId,
            action: "position_update",
            changes: { symbol: existingPosition.symbol, ...changes },
          });
        }
      }
      
      res.json(position);
    } catch (error: any) {
      log.error("Error updating position", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update position" });
    }
  });

  app.delete('/api/positions/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const householdId = await storage.getHouseholdIdFromPosition(req.params.id);
      if (!householdId) {
        return res.status(404).json({ message: "Position not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get position for audit log before deletion
      const position = await storage.getPosition(req.params.id);
      
      await storage.deletePosition(req.params.id);
      
      // Create audit log entry
      if (position) {
        await storage.createAuditLogEntry({
          individualAccountId: position.individualAccountId || undefined,
          corporateAccountId: position.corporateAccountId || undefined,
          jointAccountId: position.jointAccountId || undefined,
          userId,
          action: "position_delete",
          changes: { 
            symbol: position.symbol, 
            quantity: position.quantity,
            entryPrice: position.entryPrice
          },
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      log.error("Error deleting position", error);
      res.status(500).json({ message: "Failed to delete position" });
    }
  });

  // Bulk upload positions from CSV
  app.post('/api/positions/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { positions, accountType, accountId, clearExisting, setAsTargetAllocation } = req.body;
      
      if (!Array.isArray(positions) || positions.length === 0) {
        return res.status(400).json({ message: "No positions provided" });
      }
      
      if (!accountType || !accountId) {
        return res.status(400).json({ message: "Account type and ID are required" });
      }
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Helper function to normalize symbols for matching (removes exchange suffixes)
      const normalizeSymbolForMatching = (sym: string) => {
        return sym.toUpperCase().trim().replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '');
      };
      
      // Always get existing positions first (to preserve protection details and prevent duplicates)
      let existingPositions: Position[] = [];
      if (accountType === 'individual') {
        existingPositions = await storage.getPositionsByIndividualAccount(accountId);
      } else if (accountType === 'corporate') {
        existingPositions = await storage.getPositionsByCorporateAccount(accountId);
      } else if (accountType === 'joint') {
        existingPositions = await storage.getPositionsByJointAccount(accountId);
      }
      
      // Create maps for both normalized and original symbols for flexible matching
      let existingPositionsMap = new Map<string, Position>(); // Key: normalized symbol, Value: position
      let existingPositionsByOriginalSymbol = new Map<string, Position>(); // Key: original symbol, Value: position
      let processedPositionIds = new Set<string>(); // Track which positions we've updated
      
      for (const existingPos of existingPositions) {
        const originalSymbol = existingPos.symbol.toUpperCase().trim();
        const normalizedSymbol = normalizeSymbolForMatching(existingPos.symbol);
        existingPositionsByOriginalSymbol.set(originalSymbol, existingPos);
        existingPositionsMap.set(normalizedSymbol, existingPos);
      }
      
      // If clearExisting is true, we'll delete positions that aren't in the upload after processing
      // This way we can still match and preserve protection details for positions that are being updated
      
      const createdPositions = [];
      const updatedPositions = [];
      const errors = [];
      
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        try {
          // Build position data with the correct account ID field
          const positionData: any = {
            symbol: pos.symbol?.toString().toUpperCase().trim(),
            quantity: pos.quantity?.toString(),
            entryPrice: pos.entryPrice?.toString(),
            currentPrice: pos.currentPrice?.toString(),
          };
          
          // Set the correct account ID based on type
          switch (accountType) {
            case 'individual':
              positionData.individualAccountId = accountId;
              break;
            case 'corporate':
              positionData.corporateAccountId = accountId;
              break;
            case 'joint':
              positionData.jointAccountId = accountId;
              break;
            default:
              throw new Error(`Invalid account type: ${accountType}`);
          }
          
          // Validate required fields
          if (!positionData.symbol || !positionData.quantity || !positionData.entryPrice || !positionData.currentPrice) {
            throw new Error(`Missing required fields for row ${i + 1}`);
          }
          
          // Auto-add ticker to Universal Holdings if it doesn't exist (with enhanced lookup)
          // First, try to find an existing holding with Canadian exchange suffix variations
          let ticker = positionData.symbol.toUpperCase();
          let existingHolding = await storage.getUniversalHoldingByTicker(ticker);
          
          // If not found and ticker doesn't already have a suffix, try common Canadian suffixes
          if (!existingHolding && !ticker.match(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i)) {
            const canadianSuffixes = ['.TO', '.V', '.CN', '.NE'];
            for (const suffix of canadianSuffixes) {
              existingHolding = await storage.getUniversalHoldingByTicker(ticker + suffix);
              if (existingHolding) {
                // Found a match with suffix - use that ticker for the position
                ticker = existingHolding.ticker;
                positionData.symbol = ticker;
                break;
              }
            }
          }
          
          if (!existingHolding) {
            const lookupData = await enhancedTickerLookup(ticker);
            await storage.createUniversalHolding({
              ticker: ticker,
              name: lookupData.name || `${ticker} (Auto-added)`,
              category: "auto_added",
              riskLevel: "medium",
              dividendRate: lookupData.dividendRate?.toString() || "0",
              dividendYield: lookupData.dividendYield?.toString() || "0",
              dividendPayout: lookupData.dividendPayout || "monthly",
              price: lookupData.price?.toString() || positionData.currentPrice?.toString() || "0",
              fundFactsUrl: lookupData.fundFactsUrl || "",
              description: lookupData.provider ? `${lookupData.provider} ETF. Auto-added from bulk upload.` : "Auto-added from bulk upload.",
            });
          }
          
          // Always check if position already exists (to preserve protection details and prevent duplicates)
          // Try multiple matching strategies:
          // 1. Exact match with original symbol (before normalization)
          // 2. Exact match with normalized symbol (after potential .TO suffix addition)
          // 3. Normalized match (comparing base symbols without suffixes)
          let existingPosition: Position | undefined = undefined;
          
          // Try exact match with current symbol (after potential normalization)
          existingPosition = existingPositionsByOriginalSymbol.get(positionData.symbol);
          
          // If no exact match, try normalized symbol matching
          if (!existingPosition) {
            const normalizedSymbol = normalizeSymbolForMatching(positionData.symbol);
            existingPosition = existingPositionsMap.get(normalizedSymbol);
            if (existingPosition) {
              log.debug("[Bulk Upload] Matched position by normalized symbol: ${positionData.symbol} (normalized: ${normalizedSymbol}) matches existing ${existingPosition.symbol}");
            }
          } else {
            log.debug("[Bulk Upload] Matched position by exact symbol: ${positionData.symbol}");
          }
          
          if (existingPosition) {
            // Update existing position, preserving protection details
            const updateData: any = {
              symbol: positionData.symbol, // Update symbol in case it was normalized (e.g., B -> B.TO)
              quantity: positionData.quantity,
              entryPrice: positionData.entryPrice,
              currentPrice: positionData.currentPrice,
              // Preserve protection details from existing position
              protectionPercent: existingPosition.protectionPercent,
              stopPrice: existingPosition.stopPrice,
              limitPrice: existingPosition.limitPrice,
            };
            
            log.debug("[Bulk Upload] Updating position ${existingPosition.id} (${existingPosition.symbol} -> ${positionData.symbol}), preserving protection: ${existingPosition.protectionPercent}%, stop: ${existingPosition.stopPrice}, limit: ${existingPosition.limitPrice}");
            
            const parsed = insertPositionSchema.parse(updateData);
            const updatedPosition = await storage.updatePosition(existingPosition.id, parsed);
            updatedPositions.push(updatedPosition);
            processedPositionIds.add(existingPosition.id); // Mark as processed
          } else {
            // Create new position
            const parsed = insertPositionSchema.parse(positionData);
            const position = await storage.createPosition(parsed);
            createdPositions.push(position);
          }
        } catch (error: any) {
          errors.push({ row: i + 1, symbol: pos.symbol, error: error.message });
        }
      }
      
      // If clearExisting is true, delete positions that weren't in the upload
      let deletedCount = 0;
      if (clearExisting) {
        for (const existingPos of existingPositions) {
          if (!processedPositionIds.has(existingPos.id)) {
            await storage.deletePosition(existingPos.id);
            deletedCount++;
          }
        }
        
        // Log the clear action if any positions were deleted
        if (deletedCount > 0) {
          await storage.createAuditLogEntry({
            individualAccountId: accountType === 'individual' ? accountId : undefined,
            corporateAccountId: accountType === 'corporate' ? accountId : undefined,
            jointAccountId: accountType === 'joint' ? accountId : undefined,
            userId,
            action: "position_bulk_delete",
            changes: { 
              count: deletedCount,
              reason: "Removed positions not in upload file"
            },
          });
        }
      }
      
      // Create target allocations if requested
      let allocationsCreated = 0;
      let allocationsDeleted = 0;
      const allProcessedPositions = [...createdPositions, ...updatedPositions];
      if (setAsTargetAllocation && allProcessedPositions.length > 0) {
        try {
          // Clear existing target allocations first to prevent duplicates
          await storage.deleteAllAccountTargetAllocations(accountType as 'individual' | 'corporate' | 'joint', accountId);
          allocationsDeleted = 1; // Flag that we cleared existing allocations
          
          // Calculate total portfolio value (excluding CASH)
          let totalValue = 0;
          for (const pos of allProcessedPositions) {
            if (pos.symbol.toUpperCase() !== 'CASH') {
              const qty = Number(pos.quantity) || 0;
              const price = Number(pos.currentPrice) || 0;
              // Validate: ensure non-negative values
              if (qty >= 0 && price >= 0 && !isNaN(qty) && !isNaN(price)) {
                totalValue += qty * price;
              }
            }
          }
          
          // Create target allocation for each non-cash position based on percentage
          for (const pos of allProcessedPositions) {
            if (pos.symbol.toUpperCase() === 'CASH') continue;
            
            if (totalValue > 0) {
              const qty = Number(pos.quantity) || 0;
              const price = Number(pos.currentPrice) || 0;
              // Validate: ensure non-negative values
              if (qty < 0 || price < 0 || isNaN(qty) || isNaN(price)) {
                log.warn("[Bulk Upload] Invalid position values: qty=${qty}, price=${price} for symbol ${pos.symbol}");
                continue;
              }
              
              const posValue = qty * price;
              // SECURITY: Prevent division by zero (already checked totalValue > 0)
              const targetPercentage = (posValue / totalValue) * 100;
              
              // Get or create universal holding (with enhanced lookup)
              // First try exact match, then try Canadian exchange suffixes
              let ticker = pos.symbol.toUpperCase();
              let holding = await storage.getUniversalHoldingByTicker(ticker);
              
              // If not found and ticker doesn't already have a suffix, try common Canadian suffixes
              if (!holding && !ticker.match(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i)) {
                const canadianSuffixes = ['.TO', '.V', '.CN', '.NE'];
                for (const suffix of canadianSuffixes) {
                  holding = await storage.getUniversalHoldingByTicker(ticker + suffix);
                  if (holding) {
                    ticker = holding.ticker; // Use the matched ticker
                    break;
                  }
                }
              }
              
              if (!holding) {
                const lookupData = await enhancedTickerLookup(ticker);
                holding = await storage.createUniversalHolding({
                  ticker: ticker,
                  name: lookupData.name || `${ticker} (Auto-added)`,
                  category: "auto_added",
                  riskLevel: "medium",
                  dividendRate: lookupData.dividendRate?.toString() || "0",
                  dividendYield: lookupData.dividendYield?.toString() || "0",
                  dividendPayout: lookupData.dividendPayout || "monthly",
                  price: lookupData.price?.toString() || pos.currentPrice?.toString() || "0",
                  fundFactsUrl: lookupData.fundFactsUrl || "",
                  description: lookupData.provider ? `${lookupData.provider} ETF. Auto-added from bulk upload.` : "Auto-added from bulk upload.",
                });
              }
              
              // Create target allocation
              const allocationData: any = {
                accountType,
                accountId,
                universalHoldingId: holding.id,
                targetPercentage: Math.round(targetPercentage * 100) / 100,
                sourcePortfolioType: null
              };
              
              // Set the correct account ID field
              switch (accountType) {
                case 'individual':
                  allocationData.individualAccountId = accountId;
                  break;
                case 'corporate':
                  allocationData.corporateAccountId = accountId;
                  break;
                case 'joint':
                  allocationData.jointAccountId = accountId;
                  break;
              }
              
              await storage.createAccountTargetAllocation(allocationData);
              allocationsCreated++;
            }
          }
        } catch (error: any) {
          log.error("Error creating target allocations", error);
          // Don't fail the import if target allocation creation fails
        }
      }
      
      // Create audit log entry for bulk upload
      if (createdPositions.length > 0 || updatedPositions.length > 0) {
        const auditLogData: any = {
          userId,
          action: "position_bulk_upload",
          changes: { 
            created: createdPositions.length,
            updated: updatedPositions.length,
            symbols: [...createdPositions, ...updatedPositions].map(p => p.symbol).join(', '),
            allocationsCreated: allocationsCreated > 0 ? allocationsCreated : undefined
          },
        };
        
        switch (accountType) {
          case 'individual':
            auditLogData.individualAccountId = accountId;
            break;
          case 'corporate':
            auditLogData.corporateAccountId = accountId;
            break;
          case 'joint':
            auditLogData.jointAccountId = accountId;
            break;
        }
        
        await storage.createAuditLogEntry(auditLogData);
      }
      
      const totalProcessed = createdPositions.length + updatedPositions.length;
      let message = '';
      if (deletedCount > 0) {
        message += `Cleared ${deletedCount} existing positions. `;
      }
      if (createdPositions.length > 0 && updatedPositions.length > 0) {
        message += `Successfully imported ${createdPositions.length} new positions and updated ${updatedPositions.length} existing positions`;
      } else if (createdPositions.length > 0) {
        message += `Successfully imported ${createdPositions.length} positions`;
      } else if (updatedPositions.length > 0) {
        message += `Successfully updated ${updatedPositions.length} positions`;
      }
      if (errors.length > 0) {
        message += `, ${errors.length} failed`;
      }
      
      res.json({
        success: true,
        created: createdPositions.length,
        updated: updatedPositions.length,
        deleted: deletedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: message || 'No positions processed'
      });
    } catch (error: any) {
      log.error("Error bulk creating positions", error);
      res.status(500).json({ message: "Failed to import positions", error: error.message });
    }
  });

  // Market price refresh routes using Yahoo Finance
  app.post('/api/market-prices/quotes', isAuthenticated, async (req, res) => {
    try {
      const { symbols } = req.body;
      
      if (!Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({ message: "No symbols provided" });
      }

      // Dynamically import yahoo-finance2
      const yahooFinance = (await import('yahoo-finance2')).default;
      
      const results: Record<string, { price: number; currency: string; error?: string }> = {};
      const errors: string[] = [];
      
      // Process symbols - normalize Canadian tickers
      for (const rawSymbol of symbols) {
        try {
          // Skip cash positions
          const upperSymbol = rawSymbol.toUpperCase().trim();
          if (upperSymbol === 'CASH' || upperSymbol === 'CAD' || upperSymbol === 'USD' || 
              upperSymbol.includes('CASH') || upperSymbol.includes('MONEY MARKET')) {
            results[rawSymbol] = { price: 1, currency: 'CAD' };
            continue;
          }
          
          // Try the symbol as-is first, then with Canadian suffixes
          let quote = null;
          const symbolsToTry = [rawSymbol];
          
          // If no suffix, try adding Canadian exchange suffixes
          if (!rawSymbol.includes('.')) {
            symbolsToTry.push(`${rawSymbol}.TO`);  // TSX
            symbolsToTry.push(`${rawSymbol}.V`);   // TSX Venture
            symbolsToTry.push(`${rawSymbol}.CN`);  // CSE
          }
          
          for (const symbol of symbolsToTry) {
            try {
              const result = await yahooFinance.quote(symbol);
              if (result && (result as any).regularMarketPrice) {
                quote = result as any;
                break;
              }
            } catch (e) {
              // Try next suffix
            }
          }
          
          if (quote && quote.regularMarketPrice) {
            results[rawSymbol] = {
              price: quote.regularMarketPrice,
              currency: quote.currency || 'CAD'
            };
          } else {
            results[rawSymbol] = { price: 0, currency: 'CAD', error: 'Symbol not found' };
            errors.push(rawSymbol);
          }
        } catch (error: any) {
          results[rawSymbol] = { price: 0, currency: 'CAD', error: error.message };
          errors.push(rawSymbol);
        }
      }
      
      res.json({ 
        quotes: results, 
        errors: errors.length > 0 ? errors : undefined,
        message: `Fetched ${Object.keys(results).length - errors.length} of ${symbols.length} quotes`
      });
    } catch (error: any) {
      log.error("Error fetching market quotes", error);
      res.status(500).json({ message: "Failed to fetch market quotes", error: error.message });
    }
  });

  // Refresh prices for all positions in an account
  app.post('/api/accounts/:accountType/:accountId/refresh-prices', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId } = req.params;
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get all positions for the account
      let positions;
      switch (accountType) {
        case 'individual':
          positions = await storage.getPositionsByIndividualAccount(accountId);
          break;
        case 'corporate':
          positions = await storage.getPositionsByCorporateAccount(accountId);
          break;
        case 'joint':
          positions = await storage.getPositionsByJointAccount(accountId);
          break;
        default:
          return res.status(400).json({ message: "Invalid account type" });
      }
      
      if (!positions || positions.length === 0) {
        return res.json({ success: true, updated: 0, message: "No positions to update" });
      }
      
      // Get unique symbols
      const symbolSet = new Set(positions.map(p => p.symbol));
      const symbols = Array.from(symbolSet);
      
      // Dynamically import yahoo-finance2
      const yahooFinance = (await import('yahoo-finance2')).default;
      
      const priceUpdates: Record<string, number> = {};
      const errors: string[] = [];
      
      for (const rawSymbol of symbols) {
        try {
          const upperSymbol = rawSymbol.toUpperCase().trim();
          
          // Skip cash positions
          if (upperSymbol === 'CASH' || upperSymbol === 'CAD' || upperSymbol === 'USD' || 
              upperSymbol.includes('CASH') || upperSymbol.includes('MONEY MARKET')) {
            priceUpdates[rawSymbol] = 1;
            continue;
          }
          
          // Try the symbol as-is first, then with Canadian suffixes
          let quote = null;
          const symbolsToTry = [rawSymbol];
          
          if (!rawSymbol.includes('.')) {
            symbolsToTry.push(`${rawSymbol}.TO`);
            symbolsToTry.push(`${rawSymbol}.V`);
            symbolsToTry.push(`${rawSymbol}.CN`);
          }
          
          for (const symbol of symbolsToTry) {
            try {
              const result = await yahooFinance.quote(symbol);
              if (result && (result as any).regularMarketPrice) {
                quote = result as any;
                break;
              }
            } catch (e) {
              // Try next suffix
            }
          }
          
          if (quote && quote.regularMarketPrice) {
            priceUpdates[rawSymbol] = quote.regularMarketPrice;
          } else {
            errors.push(rawSymbol);
          }
        } catch (error) {
          errors.push(rawSymbol);
        }
      }
      
      // Update positions with new prices
      const now = new Date();
      let updatedCount = 0;
      
      for (const position of positions) {
        if (priceUpdates[position.symbol] !== undefined) {
          await storage.updatePosition(position.id, { 
            currentPrice: priceUpdates[position.symbol].toString(),
            priceUpdatedAt: now
          });
          updatedCount++;
        }
      }
      
      // Create audit log entry for price refresh
      if (updatedCount > 0) {
        const auditData: any = {
          userId,
          action: "prices_refresh",
          changes: { 
            positionsUpdated: updatedCount,
            symbolsNotFound: errors.length > 0 ? errors : undefined
          },
        };
        switch (accountType) {
          case 'individual': auditData.individualAccountId = accountId; break;
          case 'corporate': auditData.corporateAccountId = accountId; break;
          case 'joint': auditData.jointAccountId = accountId; break;
        }
        await storage.createAuditLogEntry(auditData);
      }
      
      res.json({
        success: true,
        updated: updatedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Updated ${updatedCount} positions${errors.length > 0 ? `, ${errors.length} symbols not found` : ''}`
      });
    } catch (error: any) {
      log.error("Error refreshing prices", error);
      res.status(500).json({ message: "Failed to refresh prices", error: error.message });
    }
  });

  // Account Target Allocation routes
  app.get('/api/accounts/:accountType/:accountId/target-allocations', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId } = req.params;
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      let allocations;
      switch (accountType) {
        case 'individual':
          allocations = await storage.getAccountTargetAllocationsByIndividualAccount(accountId);
          break;
        case 'corporate':
          allocations = await storage.getAccountTargetAllocationsByCorporateAccount(accountId);
          break;
        case 'joint':
          allocations = await storage.getAccountTargetAllocationsByJointAccount(accountId);
          break;
        default:
          return res.status(400).json({ message: "Invalid account type" });
      }
      
      res.json(allocations);
    } catch (error) {
      log.error("Error fetching account target allocations", error);
      res.status(500).json({ message: "Failed to fetch account target allocations" });
    }
  });

  app.post('/api/accounts/:accountType/:accountId/target-allocations', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId } = req.params;
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = insertAccountTargetAllocationSchema.parse(req.body);
      
      // Set the correct account ID field based on type
      const allocationData = {
        ...parsed,
        individualAccountId: accountType === 'individual' ? accountId : null,
        corporateAccountId: accountType === 'corporate' ? accountId : null,
        jointAccountId: accountType === 'joint' ? accountId : null,
      };
      
      const allocation = await storage.createAccountTargetAllocation(allocationData);
      res.json(allocation);
    } catch (error: any) {
      log.error("Error creating account target allocation", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create account target allocation" });
    }
  });

  app.patch('/api/account-target-allocations/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromTargetAllocation(req.params.id);
      if (!householdId) {
        return res.status(404).json({ message: "Target allocation not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateAccountTargetAllocationSchema.parse(req.body);
      const allocation = await storage.updateAccountTargetAllocation(req.params.id, parsed);
      res.json(allocation);
    } catch (error: any) {
      log.error("Error updating account target allocation", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update account target allocation" });
    }
  });

  app.delete('/api/account-target-allocations/:id', validateUUIDParam('id'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromTargetAllocation(req.params.id);
      if (!householdId) {
        return res.status(404).json({ message: "Target allocation not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteAccountTargetAllocation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      log.error("Error deleting account target allocation", error);
      res.status(500).json({ message: "Failed to delete account target allocation" });
    }
  });

  // Inline target allocation - sets target % for a ticker, auto-adds to Universal Holdings if needed
  app.post('/api/accounts/:accountType/:accountId/inline-target-allocation', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId } = req.params;
      const { ticker, targetPercentage } = req.body;
      
      if (!ticker) {
        return res.status(400).json({ message: "Ticker is required" });
      }
      
      if (!['individual', 'corporate', 'joint'].includes(accountType)) {
        return res.status(400).json({ message: "Invalid account type" });
      }
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Handle empty/null/undefined as 0 for deletion
      const targetPctStr = (targetPercentage === undefined || targetPercentage === null || targetPercentage === "") 
        ? "0" 
        : String(targetPercentage);
      const targetPct = parseFloat(targetPctStr);
      
      if (isNaN(targetPct) || targetPct < 0 || targetPct > 100) {
        return res.status(400).json({ message: "Target percentage must be between 0 and 100" });
      }
      
      // Check if ticker exists in Universal Holdings
      let holding = await storage.getUniversalHoldingByTicker(ticker.toUpperCase());
      let wasAutoAdded = false;
      
      // If ticker doesn't exist and we're setting a non-zero target, auto-add to Universal Holdings (with enhanced lookup)
      if (!holding && targetPct > 0) {
        const lookupData = await enhancedTickerLookup(ticker.toUpperCase());
        holding = await storage.createUniversalHolding({
          ticker: ticker.toUpperCase(),
          name: lookupData.name || `${ticker.toUpperCase()} (Auto-added)`,
          category: "auto_added",
          riskLevel: "medium",
          dividendRate: lookupData.dividendRate?.toString() || "0",
          dividendYield: lookupData.dividendYield?.toString() || "0",
          dividendPayout: lookupData.dividendPayout || "monthly",
          price: lookupData.price?.toString() || "0",
          fundFactsUrl: lookupData.fundFactsUrl || "",
          description: lookupData.provider ? `${lookupData.provider} ETF. Auto-added from holdings table.` : "Auto-added from holdings table.",
        });
        wasAutoAdded = true;
      }
      
      // If target is 0 or less and ticker doesn't exist in Universal Holdings, nothing to delete
      if (targetPct <= 0 && !holding) {
        return res.json({ 
          success: true, 
          action: 'none',
          message: 'No allocation to remove' 
        });
      }
      
      // Get existing allocations for this account to check if ticker already has an allocation
      let existingAllocations;
      switch (accountType) {
        case 'individual':
          existingAllocations = await storage.getAccountTargetAllocationsByIndividualAccount(accountId);
          break;
        case 'corporate':
          existingAllocations = await storage.getAccountTargetAllocationsByCorporateAccount(accountId);
          break;
        case 'joint':
          existingAllocations = await storage.getAccountTargetAllocationsByJointAccount(accountId);
          break;
      }
      
      const existingAllocation = holding ? existingAllocations?.find(a => a.universalHoldingId === holding!.id) : undefined;
      
      let allocation;
      // Helper to create audit entry
      const createTargetAuditEntry = async (action: "target_add" | "target_update" | "target_delete", changes: any) => {
        const auditData: any = {
          userId,
          action,
          changes,
        };
        switch (accountType) {
          case 'individual': auditData.individualAccountId = accountId; break;
          case 'corporate': auditData.corporateAccountId = accountId; break;
          case 'joint': auditData.jointAccountId = accountId; break;
        }
        await storage.createAuditLogEntry(auditData);
      };
      
      if (targetPct <= 0) {
        // If target is 0 or less, delete the allocation if it exists
        if (existingAllocation) {
          const oldPct = existingAllocation.targetPercentage;
          await storage.deleteAccountTargetAllocation(existingAllocation.id);
          
          // Audit log
          await createTargetAuditEntry("target_delete", { 
            ticker: ticker.toUpperCase(), 
            targetPercentage: oldPct 
          });
          
          return res.json({ 
            success: true, 
            action: 'deleted',
            message: 'Target allocation removed' 
          });
        } else {
          return res.json({ 
            success: true, 
            action: 'none',
            message: 'No allocation to remove' 
          });
        }
      } else if (existingAllocation) {
        // Update existing allocation
        const oldPct = existingAllocation.targetPercentage;
        allocation = await storage.updateAccountTargetAllocation(existingAllocation.id, {
          targetPercentage: targetPct.toString(),
        });
        
        // Audit log
        await createTargetAuditEntry("target_update", { 
          ticker: ticker.toUpperCase(), 
          targetPercentage: { old: oldPct, new: targetPct.toString() }
        });
        
        return res.json({
          success: true,
          action: 'updated',
          allocation,
          holdingAutoAdded: false,
        });
      } else {
        // Create new allocation
        allocation = await storage.createAccountTargetAllocation({
          universalHoldingId: holding!.id,
          targetPercentage: targetPct.toString(),
          individualAccountId: accountType === 'individual' ? accountId : null,
          corporateAccountId: accountType === 'corporate' ? accountId : null,
          jointAccountId: accountType === 'joint' ? accountId : null,
        });
        
        // Audit log
        await createTargetAuditEntry("target_add", { 
          ticker: ticker.toUpperCase(), 
          targetPercentage: targetPct.toString(),
          autoAddedToUniversal: wasAutoAdded
        });
        
        return res.json({
          success: true,
          action: 'created',
          allocation,
          holdingAutoAdded: wasAutoAdded,
        });
      }
    } catch (error: any) {
      log.error("Error setting inline target allocation", error);
      res.status(500).json({ message: "Failed to set target allocation", error: error.message });
    }
  });

  // Copy allocations from a model portfolio (planned or freelance) to an account
  app.post('/api/accounts/:accountType/:accountId/copy-from-portfolio/:portfolioId', validateUUIDParam('accountId'), validateUUIDParam('portfolioId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId, portfolioId } = req.params;
      const { portfolioType } = req.query; // 'planned' or 'freelance'
      
      // Validate account type
      if (!['individual', 'corporate', 'joint'].includes(accountType)) {
        return res.status(400).json({ message: "Invalid account type" });
      }
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get the portfolio with allocations - check both planned and freelance
      let portfolio: { name: string; userId?: string | null; portfolioType?: string; allocations: { universalHoldingId: string; targetPercentage: string }[] } | null = null;
      let sourcePortfolioType = 'planned';
      
      if (portfolioType === 'freelance') {
        portfolio = await storage.getFreelancePortfolioWithAllocations(portfolioId);
        sourcePortfolioType = 'freelance';
      } else {
        // Default to planned portfolio, or check both if not specified
        portfolio = await storage.getPlannedPortfolioWithAllocations(portfolioId);
        if (portfolio) {
          sourcePortfolioType = 'planned';
        } else {
          portfolio = await storage.getFreelancePortfolioWithAllocations(portfolioId);
          sourcePortfolioType = 'freelance';
        }
      }
      
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      
      // Check portfolio ownership - users can only copy from their own portfolios
      if (portfolio.userId && portfolio.userId !== userId) {
        return res.status(403).json({ message: "Access denied to this portfolio" });
      }
      
      // Delete existing allocations for this account
      await storage.deleteAllAccountTargetAllocations(accountType as 'individual' | 'corporate' | 'joint', accountId);
      
      // Copy allocations from portfolio
      const createdAllocations = [];
      for (const allocation of portfolio.allocations || []) {
        const newAllocation = await storage.createAccountTargetAllocation({
          universalHoldingId: allocation.universalHoldingId,
          targetPercentage: allocation.targetPercentage,
          individualAccountId: accountType === 'individual' ? accountId : null,
          corporateAccountId: accountType === 'corporate' ? accountId : null,
          jointAccountId: accountType === 'joint' ? accountId : null,
          sourcePortfolioType: sourcePortfolioType as "planned" | "freelance",
        });
        createdAllocations.push(newAllocation);
      }
      
      // Create audit log entry for copy from model
      const auditData: any = {
        userId,
        action: "copy_from_model",
        changes: { 
          portfolioName: portfolio.name,
          allocationsCount: createdAllocations.length
        },
      };
      switch (accountType) {
        case 'individual': auditData.individualAccountId = accountId; break;
        case 'corporate': auditData.corporateAccountId = accountId; break;
        case 'joint': auditData.jointAccountId = accountId; break;
      }
      await storage.createAuditLogEntry(auditData);
      
      res.json({
        success: true,
        copiedFrom: portfolio.name,
        allocationsCount: createdAllocations.length
      });
    } catch (error) {
      log.error("Error copying allocations from portfolio", error);
      res.status(500).json({ message: "Failed to copy allocations from portfolio" });
    }
  });

  // Portfolio comparison endpoint - compares actual holdings vs account-specific target allocations
  app.get('/api/accounts/:accountType/:accountId/portfolio-comparison', validateUUIDParam('accountId'), isAuthenticated, async (req, res) => {
    try {
      const { accountType, accountId } = req.params;
      
      // Get account and positions
      let account;
      let positions;
      let targetAllocations;
      
      switch (accountType) {
        case 'individual':
          account = await storage.getIndividualAccount(accountId);
          positions = await storage.getPositionsByIndividualAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByIndividualAccount(accountId);
          break;
        case 'corporate':
          account = await storage.getCorporateAccount(accountId);
          positions = await storage.getPositionsByCorporateAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByCorporateAccount(accountId);
          break;
        case 'joint':
          account = await storage.getJointAccount(accountId);
          positions = await storage.getPositionsByJointAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByJointAccount(accountId);
          break;
        default:
          return res.status(400).json({ message: "Invalid account type" });
      }
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // If no target allocations defined, return empty comparison
      if (targetAllocations.length === 0) {
        return res.json({
          hasTargetAllocations: false,
          comparison: [],
          totalActualValue: 0,
          totalTargetPercentage: 0
        });
      }
      
      // Calculate total actual value from positions
      const totalActualValue = positions.reduce((sum, pos) => {
        return sum + (Number(pos.quantity) * Number(pos.currentPrice));
      }, 0);
      
      // Calculate total target percentage
      const totalTargetPercentage = targetAllocations.reduce((sum, alloc) => {
        return sum + Number(alloc.targetPercentage);
      }, 0);
      
      // Helper function to normalize tickers by stripping exchange suffixes
      // e.g., "XIC.TO" -> "XIC", "VFV.TO" -> "VFV", "AAPL" -> "AAPL"
      const normalizeTicker = (ticker: string): string => {
        return ticker.toUpperCase().replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '');
      };
      
      // Create a map of actual allocations by normalized ticker
      // Store both normalized and original ticker for display, plus current price for action calculations
      const actualByTicker = new Map<string, { value: number; quantity: number; originalTicker: string; currentPrice: number }>();
      for (const pos of positions) {
        const originalTicker = pos.symbol.toUpperCase();
        const normalizedTicker = normalizeTicker(originalTicker);
        const currentPrice = Number(pos.currentPrice);
        const value = Number(pos.quantity) * currentPrice;
        const existing = actualByTicker.get(normalizedTicker) || { value: 0, quantity: 0, originalTicker, currentPrice };
        actualByTicker.set(normalizedTicker, {
          value: existing.value + value,
          quantity: existing.quantity + Number(pos.quantity),
          originalTicker: existing.originalTicker,
          currentPrice: currentPrice || existing.currentPrice // Use most recent price
        });
      }
      
      // Identify tickers that need price lookups (new positions without existing holdings)
      const tickersNeedingPrices: string[] = [];
      for (const allocation of targetAllocations) {
        const holding = allocation.holding;
        if (!holding) continue;
        
        const displayTicker = holding.ticker.toUpperCase();
        const normalizedTicker = normalizeTicker(displayTicker);
        const actual = actualByTicker.get(normalizedTicker);
        
        // If no existing position and no price in universal holdings, we need to fetch
        const holdingPrice = Number(holding.price) || 0;
        if (!actual && holdingPrice === 0) {
          tickersNeedingPrices.push(displayTicker);
        }
      }
      
      // Fetch prices from Yahoo Finance for tickers that need them (fallback for on-demand lookup)
      const fetchedPrices = new Map<string, number>();
      if (tickersNeedingPrices.length > 0) {
        try {
          // Use yahoo-finance2 v3 API
          const YahooFinance = (await import('yahoo-finance2')).default;
          const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
          
          // Helper to try different exchange suffixes for Canadian tickers
          const tryGetQuote = async (symbol: string): Promise<number> => {
            const suffixes = ['', '.TO', '.V', '.CN'];
            const baseSymbol = symbol.replace(/\.(TO|V|CN|NE)$/i, '');
            
            for (const suffix of suffixes) {
              try {
                const testSymbol = baseSymbol + suffix;
                const quote = await yahooFinance.quote(testSymbol) as any;
                if (quote?.regularMarketPrice) {
                  return quote.regularMarketPrice;
                }
              } catch (e: any) {
                continue;
              }
            }
            return 0;
          };
          
          // Fetch prices in parallel (with deduplication)
          const uniqueTickers = Array.from(new Set(tickersNeedingPrices));
          const pricePromises = uniqueTickers.map(async (ticker) => {
            const price = await tryGetQuote(ticker);
            return { ticker, price };
          });
          
          const results = await Promise.all(pricePromises);
          for (const { ticker, price } of results) {
            if (price > 0) {
              fetchedPrices.set(normalizeTicker(ticker), price);
            }
          }
        } catch (error) {
          log.error("Error fetching prices from Yahoo Finance", error);
          // Continue without fetched prices - will show 0 shares for those tickers
        }
      }
      
      // Build comparison entries
      const comparison = [];
      const processedNormalizedTickers = new Set<string>();
      
      // First, add all target allocations
      for (const allocation of targetAllocations) {
        const holding = allocation.holding;
        if (!holding) continue;
        
        const displayTicker = holding.ticker.toUpperCase();
        const normalizedTicker = normalizeTicker(displayTicker);
        processedNormalizedTickers.add(normalizedTicker);
        
        const actual = actualByTicker.get(normalizedTicker);
        const actualValue = actual?.value || 0;
        const actualPercentage = totalActualValue > 0 ? (actualValue / totalActualValue) * 100 : 0;
        const targetPercentage = Number(allocation.targetPercentage);
        const variance = actualPercentage - targetPercentage;
        const targetValue = totalActualValue > 0 ? (targetPercentage / 100) * totalActualValue : 0;
        
        // Calculate action required
        const actionDollarAmount = targetValue - actualValue;
        // Try: 1) existing position price, 2) universal holdings price, 3) fetched Yahoo price
        const currentPrice = actual?.currentPrice || Number(holding.price) || fetchedPrices.get(normalizedTicker) || 0;
        const actionShares = currentPrice > 0 ? Math.abs(actionDollarAmount) / currentPrice : 0;
        
        // Determine action type: buy if positive, sell if negative, hold if within $50 threshold
        // CASH positions never generate buy/sell actions - they're just liquidity
        let actionType: 'buy' | 'sell' | 'hold' = 'hold';
        if (normalizedTicker !== 'CASH') {
          if (actionDollarAmount > 50) {
            actionType = 'buy';
          } else if (actionDollarAmount < -50) {
            actionType = 'sell';
          }
        }
        
        // Determine status - special handling for CASH with excess amount
        let status: string;
        if (normalizedTicker === 'CASH' && variance > 2) {
          status = 'can-deploy';
        } else {
          status = variance > 2 ? 'over' : variance < -2 ? 'under' : 'on-target';
        }

        comparison.push({
          allocationId: allocation.id,
          ticker: displayTicker,
          name: holding.name,
          targetPercentage,
          actualPercentage: Math.round(actualPercentage * 100) / 100,
          variance: Math.round(variance * 100) / 100,
          actualValue: Math.round(actualValue * 100) / 100,
          targetValue: Math.round(targetValue * 100) / 100,
          quantity: actual?.quantity || 0,
          status,
          actionType,
          actionDollarAmount: Math.round(actionDollarAmount * 100) / 100,
          actionShares: Math.round(actionShares * 100) / 100,
          currentPrice: Math.round(currentPrice * 100) / 100
        });
      }
      
      // Add any positions that aren't in the target allocations (unexpected holdings)
      for (const [normalizedTicker, data] of Array.from(actualByTicker)) {
        if (!processedNormalizedTickers.has(normalizedTicker)) {
          const actualPercentage = totalActualValue > 0 ? (data.value / totalActualValue) * 100 : 0;
          // CASH holdings don't generate sell actions - they're just liquidity
          // Other unexpected holdings should be sold (target is 0)
          const isUnexpectedCash = normalizedTicker === 'CASH';
          comparison.push({
            allocationId: null,
            ticker: data.originalTicker,
            name: data.originalTicker, // No name available for unexpected holdings
            targetPercentage: 0,
            actualPercentage: Math.round(actualPercentage * 100) / 100,
            variance: Math.round(actualPercentage * 100) / 100,
            actualValue: Math.round(data.value * 100) / 100,
            targetValue: 0,
            quantity: data.quantity,
            status: 'unexpected',
            actionType: (isUnexpectedCash ? 'hold' : (data.value > 50 ? 'sell' : 'hold')) as 'buy' | 'sell' | 'hold',
            actionDollarAmount: Math.round(-data.value * 100) / 100, // Negative = sell
            actionShares: Math.round(data.quantity * 100) / 100,
            currentPrice: Math.round(data.currentPrice * 100) / 100
          });
        }
      }
      
      // Sort by variance (largest discrepancy first)
      comparison.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
      
      res.json({
        hasTargetAllocations: true,
        comparison,
        totalActualValue: Math.round(totalActualValue * 100) / 100,
        totalTargetPercentage: Math.round(totalTargetPercentage * 100) / 100
      });
    } catch (error) {
      log.error("Error fetching portfolio comparison", error);
      res.status(500).json({ message: "Failed to fetch portfolio comparison" });
    }
  });

  // Trade routes
  app.get('/api/trades', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allTrades = await storage.getAllTrades();
      
      // Filter trades to only those in accessible households
      const accessibleTrades = await Promise.all(
        allTrades.map(async (trade) => {
          const householdId = await storage.getHouseholdIdFromTrade(trade.id);
          if (!householdId) return null;
          const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
          return hasAccess ? trade : null;
        })
      );
      
      res.json(accessibleTrades.filter(Boolean));
    } catch (error) {
      log.error("Error fetching trades", error);
      res.status(500).json({ message: "Failed to fetch trades" });
    }
  });

  app.post('/api/trades', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertTradeSchema.parse(req.body);
      
      // Determine account type and get household ID
      let householdId: string | null = null;
      if (parsed.individualAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('individual', parsed.individualAccountId);
      } else if (parsed.corporateAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('corporate', parsed.corporateAccountId);
      } else if (parsed.jointAccountId) {
        householdId = await storage.getHouseholdIdFromAccount('joint', parsed.jointAccountId);
      }
      
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const canEdit = await storage.canUserEditHousehold(userId, householdId);
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const trade = await storage.createTrade(parsed);
      res.json(trade);
    } catch (error: any) {
      log.error("Error creating trade", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create trade" });
    }
  });

  // Universal Holdings routes
  app.get('/api/universal-holdings', isAuthenticated, async (req, res) => {
    try {
      const holdings = await storage.getAllUniversalHoldings();
      res.json(holdings);
    } catch (error) {
      log.error("Error fetching universal holdings", error);
      res.status(500).json({ message: "Failed to fetch universal holdings" });
    }
  });

  app.post('/api/universal-holdings', isAuthenticated, async (req, res) => {
    try {
      // Normalize crypto tickers (e.g., "btcusd" -> "BTC-USD") before validation
      const normalizedData = {
        ...req.body,
        ticker: req.body.ticker ? normalizeCryptoTicker(req.body.ticker) : req.body.ticker,
      };
      
      const parsed = insertUniversalHoldingSchema.parse(normalizedData);
      const holding = await storage.createUniversalHolding(parsed);
      res.json(holding);
    } catch (error: any) {
      log.error("Error creating universal holding", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create universal holding" });
    }
  });

  // Refresh prices for all Universal Holdings from Yahoo Finance
  // NOTE: This must be defined BEFORE the /:id routes
  app.post('/api/universal-holdings/refresh-prices', isAuthenticated, async (req, res) => {
    try {
      const holdings = await storage.getAllUniversalHoldings();
      
      if (!holdings || holdings.length === 0) {
        return res.json({ success: true, updated: 0, message: "No holdings to update" });
      }
      
      // Dynamically import yahoo-finance2
      const yahooFinance = (await import('yahoo-finance2')).default;
      
      // Cache for ticker prices to avoid duplicate API calls
      const tickerPriceCache: Record<string, number | null> = {};
      const errors: string[] = [];
      const now = new Date();
      let updatedCount = 0;
      
      // Process each holding individually (handles duplicate tickers)
      for (const holding of holdings) {
        try {
          const upperSymbol = holding.ticker.toUpperCase().trim();
          
          // Handle cash positions
          if (upperSymbol === 'CASH' || upperSymbol === 'CAD' || upperSymbol === 'USD' || 
              upperSymbol.includes('CASH') || upperSymbol.includes('MONEY MARKET')) {
            await storage.updateUniversalHolding(holding.id, { 
              price: "1.00",
              priceUpdatedAt: now
            });
            updatedCount++;
            continue;
          }
          
          // Check cache first
          if (tickerPriceCache[holding.ticker] !== undefined) {
            const cachedPrice = tickerPriceCache[holding.ticker];
            if (cachedPrice !== null) {
              await storage.updateUniversalHolding(holding.id, { 
                price: cachedPrice.toFixed(2),
                priceUpdatedAt: now
              });
              updatedCount++;
            }
            continue;
          }
          
          // Try the symbol as-is first, then with Canadian/US exchange suffixes
          let quote = null;
          const symbolsToTry = [holding.ticker];
          
          if (!holding.ticker.includes('.')) {
            // Canadian exchanges
            symbolsToTry.push(`${holding.ticker}.TO`);   // TSX
            symbolsToTry.push(`${holding.ticker}.V`);    // TSX Venture
            symbolsToTry.push(`${holding.ticker}.CN`);   // CSE
            symbolsToTry.push(`${holding.ticker}.NE`);   // NEO Exchange
            // US exchanges (for cross-listed securities)
            symbolsToTry.push(`${holding.ticker}.US`);
          }
          
          log.debug("Universal Holdings Refresh - trying symbols", { ticker: holding.ticker, symbolsToTry });
          
          for (const symbol of symbolsToTry) {
            try {
              const result = await yahooFinance.quote(symbol);
              if (result && (result as any).regularMarketPrice) {
                quote = result as any;
                log.debug("[Universal Holdings Refresh] Found price for ${symbol}: ${quote.regularMarketPrice}");
                break;
              }
            } catch (e) {
              // Try next suffix
            }
          }
          
          if (quote && quote.regularMarketPrice) {
            const price = quote.regularMarketPrice;
            tickerPriceCache[holding.ticker] = price;
            await storage.updateUniversalHolding(holding.id, { 
              price: price.toFixed(2),
              priceUpdatedAt: now
            });
            updatedCount++;
          } else {
            log.debug("[Universal Holdings Refresh] Could not find price for ${holding.ticker} - tried all suffixes");
            tickerPriceCache[holding.ticker] = null;
            if (!errors.includes(holding.ticker)) {
              errors.push(holding.ticker);
            }
          }
        } catch (error: any) {
          log.error("Error fetching quote for ${holding.ticker}:", error);
          tickerPriceCache[holding.ticker] = null;
          if (!errors.includes(holding.ticker)) {
            errors.push(holding.ticker);
          }
        }
      }
      
      res.json({ 
        success: true, 
        updated: updatedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Updated ${updatedCount} holdings${errors.length > 0 ? `, ${errors.length} symbols not found` : ''}`
      });
    } catch (error: any) {
      log.error("Error refreshing universal holdings prices", error);
      res.status(500).json({ message: "Failed to refresh prices", error: error.message });
    }
  });

  // Refresh dividend data for all Universal Holdings from Yahoo Finance
  app.post('/api/universal-holdings/refresh-dividends', isAuthenticated, async (req, res) => {
    try {
      const holdings = await storage.getAllUniversalHoldings();
      
      if (!holdings || holdings.length === 0) {
        return res.json({ success: true, updated: 0, message: "No holdings to update" });
      }
      
      // Dynamically import yahoo-finance2 with new API
      const YahooFinance = (await import('yahoo-finance2')).default;
      const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
      
      const errors: string[] = [];
      const now = new Date();
      let updatedCount = 0;
      
      // Cache for dividend data to avoid duplicate API calls
      const dividendCache: Record<string, { rate: number | null; yield: number | null; exDate: Date | null; frequency: string | null }> = {};
      
      // Calculate date range for historical dividends (1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      for (const holding of holdings) {
        try {
          const upperSymbol = holding.ticker.toUpperCase().trim();
          
          // Skip cash positions - no dividends
          if (upperSymbol === 'CASH' || upperSymbol === 'CAD' || upperSymbol === 'USD' || 
              upperSymbol.includes('CASH') || upperSymbol.includes('MONEY MARKET')) {
            continue;
          }
          
          // Check cache first
          if (dividendCache[holding.ticker] !== undefined) {
            const cached = dividendCache[holding.ticker];
            if (cached.rate !== null) {
              await storage.updateUniversalHolding(holding.id, { 
                dividendRate: cached.rate?.toFixed(4) || "0",
                dividendYield: cached.yield?.toFixed(4) || "0",
                exDividendDate: cached.exDate || undefined,
                dividendPayout: cached.frequency as any || "none",
                dividendUpdatedAt: now
              });
              updatedCount++;
            }
            continue;
          }
          
          // Try the symbol as-is first, then with Canadian/US exchange suffixes
          const symbolsToTry = [holding.ticker];
          
          if (!holding.ticker.includes('.')) {
            symbolsToTry.push(`${holding.ticker}.TO`);   // TSX
            symbolsToTry.push(`${holding.ticker}.V`);    // TSX Venture
            symbolsToTry.push(`${holding.ticker}.CN`);   // CSE
            symbolsToTry.push(`${holding.ticker}.NE`);   // NEO Exchange
          }
          
          log.debug("Dividend Refresh - trying symbols", { ticker: holding.ticker, symbolsToTry });
          
          let chartData = null;
          let quoteSummaryData = null;
          let workingSymbol = null;
          
          // First try to get quoteSummary for upcoming ex-dividend date
          for (const symbol of symbolsToTry) {
            try {
              const result = await yahooFinance.quoteSummary(symbol, {
                modules: ['summaryDetail', 'calendarEvents']
              });
              if (result && (result.summaryDetail || result.calendarEvents)) {
                quoteSummaryData = result;
                workingSymbol = symbol;
                break;
              }
            } catch (e) {
              // Try next suffix
            }
          }
          
          // Also get chart data for historical dividend info
          for (const symbol of symbolsToTry) {
            try {
              const result = await yahooFinance.chart(symbol, {
                period1: oneYearAgo,
                period2: new Date(),
                events: 'div'
              });
              if (result && result.meta) {
                chartData = result;
                if (!workingSymbol) workingSymbol = symbol;
                break;
              }
            } catch (e) {
              // Try next suffix
            }
          }
          
          if (chartData || quoteSummaryData) {
            const price = chartData?.meta?.regularMarketPrice || quoteSummaryData?.summaryDetail?.regularMarketPrice || 0;
            let dividendRate = 0;
            let dividendYield = 0;
            let payoutFrequency: "monthly" | "quarterly" | "semi_annual" | "annual" | "none" = "none";
            let exDate: Date | null = null;
            
            // Try to get upcoming ex-dividend date from quoteSummary first (this is the NEXT ex-date)
            if (quoteSummaryData?.calendarEvents?.exDividendDate) {
              exDate = new Date(quoteSummaryData.calendarEvents.exDividendDate);
              log.debug("[Dividend Refresh] Found upcoming ex-date from calendarEvents for ${workingSymbol}: ${exDate.toISOString()}");
            } else if (quoteSummaryData?.summaryDetail?.exDividendDate) {
              exDate = new Date(quoteSummaryData.summaryDetail.exDividendDate);
              log.debug("[Dividend Refresh] Found ex-date from summaryDetail for ${workingSymbol}: ${exDate.toISOString()}");
            }
            
            // Get dividend rate and yield from summaryDetail if available
            if (quoteSummaryData?.summaryDetail) {
              const sd = quoteSummaryData.summaryDetail;
              // Try dividendRate first, then fallback to trailingAnnualDividendRate or forwardAnnualDividendRate
              if (sd.dividendRate) {
                dividendRate = sd.dividendRate;
              } else if (sd.trailingAnnualDividendRate) {
                dividendRate = sd.trailingAnnualDividendRate;
                log.debug("[Dividend Refresh] Using trailingAnnualDividendRate for ${workingSymbol}: ${dividendRate}");
              } else if (sd.forwardAnnualDividendRate) {
                dividendRate = sd.forwardAnnualDividendRate;
                log.debug("[Dividend Refresh] Using forwardAnnualDividendRate for ${workingSymbol}: ${dividendRate}");
              }
              
              // Get yield - try multiple sources
              if (sd.dividendYield) {
                dividendYield = sd.dividendYield * 100; // Convert to percentage
              } else if (sd.trailingAnnualDividendYield) {
                dividendYield = sd.trailingAnnualDividendYield * 100;
              } else if (dividendRate && price) {
                // SECURITY: Prevent division by zero
                dividendYield = price > 0 ? (dividendRate / price) * 100 : 0;
              }
            }
            
            // Helper function to determine frequency based on average days between payments
            const determineFrequencyFromSpacing = (divEvents: any[]): "monthly" | "quarterly" | "semi_annual" | "annual" | "none" => {
              if (divEvents.length < 2) {
                // With only one payment, check if annual rate / payment amount suggests more frequent payments
                if (divEvents.length === 1 && dividendRate > 0) {
                  const paymentAmount = divEvents[0].amount || 0;
                  if (paymentAmount > 0) {
                    const impliedPayments = dividendRate / paymentAmount;
                    if (impliedPayments >= 10) return "monthly";
                    if (impliedPayments >= 3) return "quarterly";
                    if (impliedPayments >= 1.5) return "semi_annual";
                  }
                }
                return divEvents.length === 1 ? "annual" : "none";
              }
              
              // Sort events by date
              const sortedEvents = [...divEvents].sort((a: any, b: any) => {
                const dateA = a.date > 946684800000 ? a.date : a.date * 1000;
                const dateB = b.date > 946684800000 ? b.date : b.date * 1000;
                return dateA - dateB;
              });
              
              // Calculate average days between consecutive payments
              let totalDays = 0;
              for (let i = 1; i < sortedEvents.length; i++) {
                const prevDate = sortedEvents[i-1].date > 946684800000 ? sortedEvents[i-1].date : sortedEvents[i-1].date * 1000;
                const currDate = sortedEvents[i].date > 946684800000 ? sortedEvents[i].date : sortedEvents[i].date * 1000;
                totalDays += (currDate - prevDate) / (1000 * 60 * 60 * 24);
              }
              const avgDaysBetweenPayments = totalDays / (sortedEvents.length - 1);
              
              log.debug("[Dividend Refresh] ${workingSymbol}: ${divEvents.length} payments, avg ${avgDaysBetweenPayments.toFixed(1)} days apart");
              
              // Determine frequency based on spacing (with tolerance)
              if (avgDaysBetweenPayments <= 45) return "monthly";        // ~30 days, allow up to 45
              if (avgDaysBetweenPayments <= 120) return "quarterly";     // ~90 days, allow up to 120
              if (avgDaysBetweenPayments <= 220) return "semi_annual";   // ~180 days, allow up to 220
              return "annual";
            };
            
            // Calculate from historical dividend events if quoteSummary didn't have the data
            if (chartData?.events?.dividends && dividendRate === 0) {
              const divEvents = Object.values(chartData.events.dividends) as any[];
              if (divEvents.length > 0) {
                // Sum all dividends in the past year
                dividendRate = divEvents.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
                dividendYield = price > 0 ? (dividendRate / price) * 100 : 0;
                
                // Determine frequency based on payment spacing (more accurate than count)
                payoutFrequency = determineFrequencyFromSpacing(divEvents);
                
                // Only use historical ex-date if we didn't get one from quoteSummary
                if (!exDate) {
                  const sortedDivs = divEvents.sort((a: any, b: any) => b.date - a.date);
                  if (sortedDivs.length > 0 && sortedDivs[0].date) {
                    const timestamp = sortedDivs[0].date;
                    if (timestamp > 946684800 && timestamp < 4102444800) {
                      exDate = new Date(timestamp * 1000);
                    } else if (timestamp > 946684800000 && timestamp < 4102444800000) {
                      exDate = new Date(timestamp);
                    }
                  }
                }
              }
            } else if (chartData?.events?.dividends) {
              // Still get frequency from historical data
              const divEvents = Object.values(chartData.events.dividends) as any[];
              payoutFrequency = determineFrequencyFromSpacing(divEvents);
            }
            
            log.debug("Dividend Refresh - final dividend info", {
              symbol: workingSymbol,
              rate: dividendRate.toFixed(4),
              yield: dividendYield.toFixed(2) + '%',
              frequency: payoutFrequency,
              exDate: exDate?.toISOString() || 'none'
            });
            
            dividendCache[holding.ticker] = {
              rate: dividendRate,
              yield: dividendYield,
              exDate,
              frequency: payoutFrequency
            };
            
            await storage.updateUniversalHolding(holding.id, { 
              dividendRate: dividendRate.toFixed(4),
              dividendYield: dividendYield.toFixed(4),
              exDividendDate: exDate || undefined,
              dividendPayout: payoutFrequency,
              dividendUpdatedAt: now
            });
            updatedCount++;
          } else {
            log.debug("[Dividend Refresh] Could not find dividend info for ${holding.ticker}");
            dividendCache[holding.ticker] = { rate: null, yield: null, exDate: null, frequency: null };
            if (!errors.includes(holding.ticker)) {
              errors.push(holding.ticker);
            }
          }
        } catch (error: any) {
          log.error("Error fetching dividend data for ${holding.ticker}:", error);
          dividendCache[holding.ticker] = { rate: null, yield: null, exDate: null, frequency: null };
          if (!errors.includes(holding.ticker)) {
            errors.push(holding.ticker);
          }
        }
      }
      
      res.json({ 
        success: true, 
        updated: updatedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Updated dividend data for ${updatedCount} holdings${errors.length > 0 ? `, ${errors.length} symbols not found` : ''}`
      });
    } catch (error: any) {
      log.error("Error refreshing dividend data", error);
      res.status(500).json({ message: "Failed to refresh dividend data", error: error.message });
    }
  });

  // Fetch dividend info from a fund company URL
  app.post('/api/universal-holdings/fetch-dividend-from-url', isAuthenticated, async (req, res) => {
    try {
      const { url, ticker } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "URL is required" });
      }

      log.debug("[Dividend Fetch] Fetching dividend info from URL: ${url} for ticker: ${ticker}");

      // Fetch the page content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      if (!response.ok) {
        return res.status(400).json({ message: `Failed to fetch URL: ${response.status} ${response.statusText}` });
      }

      const html = await response.text();
      
      // Parse dividend information based on the URL domain
      let monthlyDividend: number | null = null;
      let annualDividend: number | null = null;
      let parsedFrom: string = 'unknown';
      
      const urlLower = url.toLowerCase();
      
      // Hamilton ETFs (hamiltonetfs.com)
      if (urlLower.includes('hamiltonetfs.com')) {
        parsedFrom = 'Hamilton ETFs';
        // Look for distribution/dividend patterns
        // Pattern: "$X.XXXX" or "X.XXXX per unit"
        const monthlyMatch = html.match(/(?:monthly\s+)?(?:distribution|dividend)[^$]*\$?\s*(\d+\.?\d*)/i) ||
                            html.match(/\$(\d+\.\d{2,4})\s*(?:per\s+unit|\/unit|monthly)/i);
        if (monthlyMatch) {
          monthlyDividend = parseFloat(monthlyMatch[1]);
        }
      }
      
      // Harvest ETFs (harvestportfolios.com)
      else if (urlLower.includes('harvestportfolios.com') || urlLower.includes('harvest')) {
        parsedFrom = 'Harvest ETFs';
        // Look for distribution amount
        const monthlyMatch = html.match(/(?:distribution|cash\s+distribution)[^$]*\$?\s*(\d+\.?\d*)/i) ||
                            html.match(/\$(\d+\.\d{2,4})\s*(?:per\s+unit|monthly)/i);
        if (monthlyMatch) {
          monthlyDividend = parseFloat(monthlyMatch[1]);
        }
      }
      
      // Global X (globalx.ca)
      else if (urlLower.includes('globalx.ca') || urlLower.includes('global-x')) {
        parsedFrom = 'Global X';
        const monthlyMatch = html.match(/(?:distribution|dividend)[^$]*\$?\s*(\d+\.?\d*)/i) ||
                            html.match(/monthly[^$]*\$(\d+\.\d{2,4})/i);
        if (monthlyMatch) {
          monthlyDividend = parseFloat(monthlyMatch[1]);
        }
      }
      
      // Evolve ETFs (evolveetfs.com)
      else if (urlLower.includes('evolveetfs.com') || urlLower.includes('evolve')) {
        parsedFrom = 'Evolve ETFs';
        const monthlyMatch = html.match(/(?:distribution|dividend)[^$]*\$?\s*(\d+\.?\d*)/i);
        if (monthlyMatch) {
          monthlyDividend = parseFloat(monthlyMatch[1]);
        }
      }
      
      // Purpose Investments (purposeinvest.com)
      else if (urlLower.includes('purposeinvest.com') || urlLower.includes('purpose')) {
        parsedFrom = 'Purpose Investments';
        const monthlyMatch = html.match(/(?:distribution|dividend)[^$]*\$?\s*(\d+\.?\d*)/i);
        if (monthlyMatch) {
          monthlyDividend = parseFloat(monthlyMatch[1]);
        }
      }
      
      // Generic fallback - try to find any dollar amount near dividend/distribution keywords
      if (monthlyDividend === null) {
        parsedFrom = 'Generic Parser';
        // Try multiple patterns
        const patterns = [
          /distribution\s*(?:per\s*unit)?[:\s]*\$?(\d+\.\d{2,4})/i,
          /dividend\s*(?:per\s*unit)?[:\s]*\$?(\d+\.\d{2,4})/i,
          /monthly\s*(?:distribution|dividend|amount)[:\s]*\$?(\d+\.\d{2,4})/i,
          /\$(\d+\.\d{4})\s*(?:per\s*unit|monthly|distribution)/i,
          /(?:current|latest)\s*distribution[:\s]*\$?(\d+\.\d{2,4})/i,
        ];
        
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match) {
            monthlyDividend = parseFloat(match[1]);
            break;
          }
        }
      }
      
      // Calculate annual if we found monthly
      if (monthlyDividend !== null && monthlyDividend > 0) {
        annualDividend = monthlyDividend * 12;
      }
      
      // Return what we found
      res.json({
        success: monthlyDividend !== null,
        monthlyDividend,
        annualDividend,
        parsedFrom,
        message: monthlyDividend !== null 
          ? `Found monthly dividend of $${monthlyDividend.toFixed(4)} from ${parsedFrom}`
          : `Could not parse dividend info from ${parsedFrom}. You may need to enter manually.`
      });
      
    } catch (error: any) {
      log.error("Error fetching dividend from URL", error);
      res.status(500).json({ message: "Failed to fetch dividend info", error: error.message });
    }
  });

  app.get('/api/universal-holdings/:id', validateUUIDParam('id'), isAuthenticated, async (req, res) => {
    try {
      const holding = await storage.getUniversalHolding(req.params.id);
      if (!holding) {
        return res.status(404).json({ message: "Universal holding not found" });
      }
      res.json(holding);
    } catch (error) {
      log.error("Error fetching universal holding", error);
      res.status(500).json({ message: "Failed to fetch universal holding" });
    }
  });

  app.patch('/api/universal-holdings/:id', validateUUIDParam('id'), isAuthenticated, async (req, res) => {
    // Normalize crypto tickers if ticker is being updated
    if (req.body.ticker) {
      req.body.ticker = normalizeCryptoTicker(req.body.ticker);
    }
    try {
      const parsed = updateUniversalHoldingSchema.parse(req.body);
      const holding = await storage.updateUniversalHolding(req.params.id, parsed);
      res.json(holding);
    } catch (error: any) {
      log.error("Error updating universal holding", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update universal holding" });
    }
  });

  app.delete('/api/universal-holdings/:id', validateUUIDParam('id'), isAuthenticated, async (req, res) => {
    try {
      await storage.deleteUniversalHolding(req.params.id);
      res.status(204).send();
    } catch (error) {
      log.error("Error deleting universal holding", error);
      res.status(500).json({ message: "Failed to delete universal holding" });
    }
  });

  // Planned Portfolio routes
  app.get('/api/planned-portfolios', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const portfolios = await storage.getAllPlannedPortfoliosWithAllocations(userId);
      res.json(portfolios);
    } catch (error) {
      log.error("Error fetching planned portfolios", error);
      res.status(500).json({ message: "Failed to fetch planned portfolios" });
    }
  });

  app.post('/api/planned-portfolios', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertPlannedPortfolioSchema.parse(req.body);
      const portfolio = await storage.createPlannedPortfolio({ ...parsed, userId });
      res.json(portfolio);
    } catch (error: any) {
      log.error("Error creating planned portfolio", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create planned portfolio" });
    }
  });

  app.get('/api/planned-portfolios/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const portfolio = await storage.getPlannedPortfolioWithAllocations(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ message: "Planned portfolio not found" });
      }
      // Check ownership
      if (portfolio.userId && portfolio.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(portfolio);
    } catch (error) {
      log.error("Error fetching planned portfolio", error);
      res.status(500).json({ message: "Failed to fetch planned portfolio" });
    }
  });

  app.patch('/api/planned-portfolios/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getPlannedPortfolio(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Planned portfolio not found" });
      }
      if (existing.userId && existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updatePlannedPortfolioSchema.parse(req.body);
      const portfolio = await storage.updatePlannedPortfolio(req.params.id, parsed);
      res.json(portfolio);
    } catch (error: any) {
      log.error("Error updating planned portfolio", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update planned portfolio" });
    }
  });

  app.delete('/api/planned-portfolios/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getPlannedPortfolio(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Planned portfolio not found" });
      }
      if (existing.userId && existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deletePlannedPortfolio(req.params.id);
      res.status(204).send();
    } catch (error) {
      log.error("Error deleting planned portfolio", error);
      res.status(500).json({ message: "Failed to delete planned portfolio" });
    }
  });

  app.post('/api/planned-portfolios/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ message: "orderedIds must be an array" });
      }
      // Verify all portfolios belong to this user before reordering
      for (const id of orderedIds) {
        const portfolio = await storage.getPlannedPortfolio(id);
        if (portfolio && portfolio.userId && portfolio.userId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      await storage.reorderPlannedPortfolios(orderedIds);
      res.json({ success: true });
    } catch (error) {
      log.error("Error reordering planned portfolios", error);
      res.status(500).json({ message: "Failed to reorder planned portfolios" });
    }
  });

  // Planned Portfolio Allocation routes
  app.post('/api/planned-portfolio-allocations', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertPlannedPortfolioAllocationSchema.parse(req.body);
      const allocation = await storage.createPlannedPortfolioAllocation(parsed);
      res.json(allocation);
    } catch (error: any) {
      log.error("Error creating planned portfolio allocation", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create planned portfolio allocation" });
    }
  });

  app.patch('/api/planned-portfolio-allocations/:id', isAuthenticated, async (req, res) => {
    try {
      const parsed = updatePlannedPortfolioAllocationSchema.parse(req.body);
      const allocation = await storage.updatePlannedPortfolioAllocation(req.params.id, parsed);
      res.json(allocation);
    } catch (error: any) {
      log.error("Error updating planned portfolio allocation", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update planned portfolio allocation" });
    }
  });

  app.delete('/api/planned-portfolio-allocations/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deletePlannedPortfolioAllocation(req.params.id);
      res.status(204).send();
    } catch (error) {
      log.error("Error deleting planned portfolio allocation", error);
      res.status(500).json({ message: "Failed to delete planned portfolio allocation" });
    }
  });

  // Freelance Portfolio routes
  app.get('/api/freelance-portfolios', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const portfolios = await storage.getAllFreelancePortfoliosWithAllocations(userId);
      res.json(portfolios);
    } catch (error) {
      log.error("Error fetching freelance portfolios", error);
      res.status(500).json({ message: "Failed to fetch freelance portfolios" });
    }
  });

  app.post('/api/freelance-portfolios', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertFreelancePortfolioSchema.parse(req.body);
      const portfolio = await storage.createFreelancePortfolio({ ...parsed, userId });
      res.json(portfolio);
    } catch (error: any) {
      log.error("Error creating freelance portfolio", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create freelance portfolio" });
    }
  });

  app.get('/api/freelance-portfolios/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const portfolio = await storage.getFreelancePortfolioWithAllocations(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ message: "Freelance portfolio not found" });
      }
      // Check ownership
      if (portfolio.userId && portfolio.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(portfolio);
    } catch (error) {
      log.error("Error fetching freelance portfolio", error);
      res.status(500).json({ message: "Failed to fetch freelance portfolio" });
    }
  });

  app.patch('/api/freelance-portfolios/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getFreelancePortfolio(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Freelance portfolio not found" });
      }
      if (existing.userId && existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateFreelancePortfolioSchema.parse(req.body);
      const portfolio = await storage.updateFreelancePortfolio(req.params.id, parsed);
      res.json(portfolio);
    } catch (error: any) {
      log.error("Error updating freelance portfolio", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update freelance portfolio" });
    }
  });

  app.delete('/api/freelance-portfolios/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getFreelancePortfolio(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Freelance portfolio not found" });
      }
      if (existing.userId && existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteFreelancePortfolio(req.params.id);
      res.status(204).send();
    } catch (error) {
      log.error("Error deleting freelance portfolio", error);
      res.status(500).json({ message: "Failed to delete freelance portfolio" });
    }
  });

  app.post('/api/freelance-portfolios/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ message: "orderedIds must be an array" });
      }
      // Verify all portfolios belong to this user before reordering
      for (const id of orderedIds) {
        const portfolio = await storage.getFreelancePortfolio(id);
        if (portfolio && portfolio.userId && portfolio.userId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      await storage.reorderFreelancePortfolios(orderedIds);
      res.json({ success: true });
    } catch (error) {
      log.error("Error reordering freelance portfolios", error);
      res.status(500).json({ message: "Failed to reorder freelance portfolios" });
    }
  });

  // Freelance Portfolio Allocation routes
  app.post('/api/freelance-portfolio-allocations', isAuthenticated, async (req, res) => {
    try {
      const parsed = insertFreelancePortfolioAllocationSchema.parse(req.body);
      const allocation = await storage.createFreelancePortfolioAllocation(parsed);
      res.json(allocation);
    } catch (error: any) {
      log.error("Error creating freelance portfolio allocation", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create freelance portfolio allocation" });
    }
  });

  app.patch('/api/freelance-portfolio-allocations/:id', isAuthenticated, async (req, res) => {
    try {
      const parsed = updateFreelancePortfolioAllocationSchema.parse(req.body);
      const allocation = await storage.updateFreelancePortfolioAllocation(req.params.id, parsed);
      res.json(allocation);
    } catch (error: any) {
      log.error("Error updating freelance portfolio allocation", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update freelance portfolio allocation" });
    }
  });

  app.delete('/api/freelance-portfolio-allocations/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteFreelancePortfolioAllocation(req.params.id);
      res.status(204).send();
    } catch (error) {
      log.error("Error deleting freelance portfolio allocation", error);
      res.status(500).json({ message: "Failed to delete freelance portfolio allocation" });
    }
  });

  // Ticker lookup endpoint using Yahoo Finance
  app.get('/api/ticker-lookup/:ticker', isAuthenticated, async (req, res) => {
    try {
      const inputTicker = req.params.ticker;
      const ticker = normalizeCryptoTicker(inputTicker);
      
      // Check if this is a crypto ticker (format: XXX-USD)
      const isCrypto = ticker.includes('-USD') && ticker.match(/^[A-Z]{2,5}-USD$/);
      
      // For crypto tickers, try multiple approaches
      if (isCrypto) {
        // Approach 1: Try chart API directly for crypto
        try {
          const quoteResponse = await fetch(
            `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              },
              timeout: 5000
            } as any
          );
          
          if (quoteResponse.ok) {
            const quoteData = await quoteResponse.json();
            const result = quoteData?.chart?.result?.[0];
            
            if (result && !result.error && result.meta) {
              const meta = result.meta;
              const price = meta.regularMarketPrice ?? meta.previousClose ?? meta.chartPreviousClose ?? null;
              const cryptoName = meta.shortName || meta.longName || meta.symbol || ticker.replace('-USD', '');
              
              return res.json({
                ticker: ticker,
                name: cryptoName || `${ticker.replace('-USD', '')} (${ticker})`,
                exchange: 'CCC',
                type: 'CRYPTOCURRENCY',
                price: price
              });
            }
          }
        } catch (cryptoError: any) {
          // Chart API failed, continue to fallback
        }
        
        // Approach 2: Try search API as fallback
        try {
          const searchResponse = await fetch(
            `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=5&newsCount=0`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              },
              timeout: 5000
            } as any
          );
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.quotes && searchData.quotes.length > 0) {
              const exactMatch = searchData.quotes.find((q: any) => q.symbol === ticker);
              const searchQuote = exactMatch || searchData.quotes[0];
              
              return res.json({
                ticker: ticker,
                name: searchQuote.shortname || searchQuote.longname || `${ticker.replace('-USD', '')} (${ticker})`,
                exchange: searchQuote.exchange || 'CCC',
                type: 'CRYPTOCURRENCY',
                price: null
              });
            }
          }
        } catch (searchError: any) {
          // Search API failed, continue to final fallback
        }
        
        // Approach 3: Final fallback - return basic crypto response
        // This ensures crypto tickers can always be added even if APIs fail
        const cryptoCode = ticker.replace('-USD', '');
        return res.json({
          ticker: ticker,
          name: `${cryptoCode} (${ticker})`,
          exchange: 'CCC',
          type: 'CRYPTOCURRENCY',
          price: null
        });
      }
      
      // For non-crypto tickers, use standard search API
      const searchResponse = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=5&newsCount=0`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      if (!searchResponse.ok) {
        return res.status(404).json({ message: "Unable to look up ticker" });
      }
      
      const searchData = await searchResponse.json();
      
      if (!searchData.quotes || searchData.quotes.length === 0) {
        return res.status(404).json({ message: "Ticker not found" });
      }
      
      // Find exact match first, or use first result
      const exactMatch = searchData.quotes.find((q: any) => q.symbol === ticker);
      const searchQuote = exactMatch || searchData.quotes[0];
      const symbol = searchQuote.symbol;
      
      // Fetch detailed quote data including price using v8 chart API
      const quoteResponse = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      let price = null;
      
      if (quoteResponse.ok) {
        const quoteData = await quoteResponse.json();
        const meta = quoteData?.chart?.result?.[0]?.meta;
        if (meta) {
          price = meta.regularMarketPrice || null;
        }
      }
      
      res.json({
        ticker: symbol,
        name: searchQuote.shortname || searchQuote.longname || symbol,
        exchange: searchQuote.exchange,
        type: searchQuote.quoteType,
        price: price
      });
    } catch (error: any) {
      log.error("[Ticker Lookup] Error looking up ticker ${req.params.ticker}:", error);
      res.status(500).json({ message: "Failed to look up ticker" });
    }
  });

  // ==================== Object Storage Routes ====================
  // Reference: blueprint:javascript_object_storage

  // Endpoint to get upload URL for file upload
  app.post('/api/objects/upload', isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const fileExtension = req.body.fileExtension || 'pdf';
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(fileExtension);
      res.json({ uploadURL });
    } catch (error) {
      log.error("Error getting upload URL", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Endpoint to serve private objects (with ACL check)
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      log.error("Error checking object access", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // ==================== Library Document Routes ====================

  // Get all library documents
  app.get('/api/library-documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getAllLibraryDocuments(userId);
      res.json(documents);
    } catch (error) {
      log.error("Error fetching library documents", error);
      res.status(500).json({ message: "Failed to fetch library documents" });
    }
  });

  // Get library documents by category
  app.get('/api/library-documents/category/:category', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const category = req.params.category as 'reports' | 'strategies';
      if (!['reports', 'strategies'].includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      const documents = await storage.getLibraryDocumentsByCategory(category, userId);
      res.json(documents);
    } catch (error) {
      log.error("Error fetching library documents by category", error);
      res.status(500).json({ message: "Failed to fetch library documents" });
    }
  });

  // Get single library document
  app.get('/api/library-documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const document = await storage.getLibraryDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      // Check ownership
      if (document.uploadedBy && document.uploadedBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(document);
    } catch (error) {
      log.error("Error fetching library document", error);
      res.status(500).json({ message: "Failed to fetch library document" });
    }
  });

  // Create library document (after file upload)
  app.post('/api/library-documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const objectStorageService = new ObjectStorageService();
      
      if (!req.body.objectPath) {
        return res.status(400).json({ message: "objectPath is required" });
      }
      
      // Set ACL policy and get normalized path
      // visibility: "public" allows all authenticated users to read (owner can write)
      // The /objects/ route still requires isAuthenticated, so only logged-in users can access
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(req.body.objectPath, {
        owner: userId,
        visibility: "public",
      });
      
      // Validate that the object path is properly normalized
      if (!objectPath.startsWith("/objects/")) {
        return res.status(400).json({ message: "Invalid object path" });
      }
      
      const parsed = insertLibraryDocumentSchema.parse({
        ...req.body,
        objectPath,
        uploadedBy: userId,
      });
      
      const document = await storage.createLibraryDocument(parsed);
      res.json(document);
    } catch (error: any) {
      log.error("Error creating library document", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create library document" });
    }
  });

  // Update library document
  app.patch('/api/library-documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getLibraryDocument(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Document not found" });
      }
      if (existing.uploadedBy && existing.uploadedBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const parsed = updateLibraryDocumentSchema.parse(req.body);
      const document = await storage.updateLibraryDocument(req.params.id, parsed);
      res.json(document);
    } catch (error: any) {
      log.error("Error updating library document", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update library document" });
    }
  });

  // Delete library document
  app.delete('/api/library-documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getLibraryDocument(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Document not found" });
      }
      if (existing.uploadedBy && existing.uploadedBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteLibraryDocument(req.params.id);
      res.status(204).send();
    } catch (error) {
      log.error("Error deleting library document", error);
      res.status(500).json({ message: "Failed to delete library document" });
    }
  });

  // REFACTORING: Task routes extracted to routes/tasks.ts
  const { registerTasksRoutes } = await import("./routes/tasks");
  registerTasksRoutes(app);

  // Account audit log routes
  app.get('/api/accounts/:accountType/:accountId/audit-log', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId } = req.params;
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      let logs: any[];
      switch (accountType) {
        case 'individual':
          logs = await storage.getAuditLogByIndividualAccount(accountId);
          break;
        case 'corporate':
          logs = await storage.getAuditLogByCorporateAccount(accountId);
          break;
        case 'joint':
          logs = await storage.getAuditLogByJointAccount(accountId);
          break;
        default:
          return res.status(400).json({ message: "Invalid account type" });
      }
      
      res.json(logs);
    } catch (error) {
      log.error("Error fetching audit log", error);
      res.status(500).json({ message: "Failed to fetch audit log" });
    }
  });

  // Email portfolio rebalancing report
  app.post('/api/accounts/:accountType/:accountId/email-report', validateUUIDParam('accountId'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountType, accountId } = req.params;
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }
      
      // Check authorization
      const householdId = await storage.getHouseholdIdFromAccount(accountType as 'individual' | 'corporate' | 'joint', accountId);
      if (!householdId) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      const hasAccess = await storage.canUserAccessHousehold(userId, householdId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get account, positions, and target allocations
      let account: any;
      let positions: any[];
      let targetAllocations: any[];
      let ownerName = '';
      let householdName = '';
      
      switch (accountType) {
        case 'individual':
          account = await storage.getIndividualAccount(accountId);
          positions = await storage.getPositionsByIndividualAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByIndividualAccount(accountId);
          if (account) {
            const individual = await storage.getIndividual(account.individualId);
            if (individual) {
              ownerName = individual.name;
              const household = await storage.getHousehold(individual.householdId);
              householdName = household?.name || '';
            }
          }
          break;
        case 'corporate':
          account = await storage.getCorporateAccount(accountId);
          positions = await storage.getPositionsByCorporateAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByCorporateAccount(accountId);
          if (account) {
            const corporation = await storage.getCorporation(account.corporationId);
            if (corporation) {
              ownerName = corporation.name;
              const household = await storage.getHousehold(corporation.householdId);
              householdName = household?.name || '';
            }
          }
          break;
        case 'joint':
          account = await storage.getJointAccount(accountId);
          positions = await storage.getPositionsByJointAccount(accountId);
          targetAllocations = await storage.getAccountTargetAllocationsByJointAccount(accountId);
          if (account) {
            const owners = await storage.getJointAccountOwners(accountId);
            const ownerNames: string[] = [];
            for (const individual of owners) {
              ownerNames.push(individual.name);
              if (!householdName) {
                const household = await storage.getHousehold(individual.householdId);
                householdName = household?.name || '';
              }
            }
            ownerName = ownerNames.join(' & ');
          }
          break;
        default:
          return res.status(400).json({ message: "Invalid account type" });
      }
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      // Calculate portfolio comparison data
      const normalizeTicker = (ticker: string): string => {
        return ticker.toUpperCase().replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '');
      };
      
      const totalActualValue = positions.reduce((sum, pos) => {
        return sum + (Number(pos.quantity) * Number(pos.currentPrice));
      }, 0);
      
      // Create actual allocation map
      const actualByTicker = new Map<string, { value: number; quantity: number; originalTicker: string; price: number }>();
      for (const pos of positions) {
        const originalTicker = pos.symbol.toUpperCase();
        const normalizedTicker = normalizeTicker(originalTicker);
        const value = Number(pos.quantity) * Number(pos.currentPrice);
        const existing = actualByTicker.get(normalizedTicker) || { value: 0, quantity: 0, originalTicker, price: Number(pos.currentPrice) };
        actualByTicker.set(normalizedTicker, {
          value: existing.value + value,
          quantity: existing.quantity + Number(pos.quantity),
          originalTicker: existing.originalTicker,
          price: Number(pos.currentPrice)
        });
      }
      
      // Build report positions
      const reportPositions = [];
      const processedNormalizedTickers = new Set<string>();
      
      // First, add all target allocations
      for (const allocation of targetAllocations) {
        const holding = allocation.holding;
        if (!holding) continue;
        
        const displayTicker = holding.ticker.toUpperCase();
        const normalizedTicker = normalizeTicker(displayTicker);
        processedNormalizedTickers.add(normalizedTicker);
        
        const actual = actualByTicker.get(normalizedTicker);
        const actualValue = actual?.value || 0;
        const actualPercentage = totalActualValue > 0 ? (actualValue / totalActualValue) * 100 : 0;
        const targetPercentage = Number(allocation.targetPercentage) || 0;
        
        // Validate target percentage
        if (targetPercentage < 0 || targetPercentage > 100) {
          log.warn("[Rebalance Report] Invalid target percentage: ${targetPercentage} for allocation ${allocation.id}");
          continue;
        }
        
        const variance = actualPercentage - targetPercentage;
        const targetValue = totalActualValue > 0 ? (targetPercentage / 100) * totalActualValue : 0;
        const changeNeeded = targetValue - actualValue;
        const currentPrice = actual?.price || Number(holding.currentPrice) || 0;
        
        // SECURITY: Validate price to prevent division by zero
        if (currentPrice <= 0) {
          log.warn("[Rebalance Report] Invalid or missing price for ${displayTicker}: ${currentPrice}");
          continue;
        }
        
        const sharesToTrade = changeNeeded / currentPrice;
        
        reportPositions.push({
          symbol: displayTicker,
          name: holding.name,
          quantity: actual?.quantity || 0,
          currentPrice,
          marketValue: actualValue,
          actualPercentage: Math.round(actualPercentage * 100) / 100,
          targetPercentage,
          variance: Math.round(variance * 100) / 100,
          changeNeeded: Math.round(changeNeeded * 100) / 100,
          sharesToTrade: Math.round(sharesToTrade * 100) / 100,
          status: (variance > 2 ? 'over' : variance < -2 ? 'under' : 'on-target') as 'over' | 'under' | 'on-target' | 'unexpected'
        });
      }
      
      // Add unexpected positions (no target = liquidate)
      for (const [normalizedTicker, data] of Array.from(actualByTicker)) {
        if (!processedNormalizedTickers.has(normalizedTicker)) {
          const actualPercentage = totalActualValue > 0 ? (data.value / totalActualValue) * 100 : 0;
          reportPositions.push({
            symbol: data.originalTicker,
            name: data.originalTicker,
            quantity: data.quantity,
            currentPrice: data.price,
            marketValue: data.value,
            actualPercentage: Math.round(actualPercentage * 100) / 100,
            targetPercentage: 0,
            variance: Math.round(actualPercentage * 100) / 100,
            changeNeeded: -data.value, // Need to sell everything
            sharesToTrade: -data.quantity, // Sell all shares
            status: 'unexpected' as const
          });
        }
      }
      
      // Format account type for display
      const accountTypeLabels: Record<string, string> = {
        cash: 'Cash',
        tfsa: 'TFSA',
        fhsa: 'FHSA',
        rrsp: 'RRSP',
        lira: 'LIRA',
        liff: 'LIF',
        rif: 'RIF',
        corporate_cash: 'Corporate Cash',
        ipp: 'IPP',
        joint_cash: 'Joint Cash',
        resp: 'RESP'
      };
      
      // Generate PDF
      const pdfBuffer = await generatePortfolioRebalanceReport({
        accountName: account.nickname || '',
        accountType: accountTypeLabels[account.type] || account.type.toUpperCase(),
        householdName,
        ownerName,
        totalValue: totalActualValue,
        positions: reportPositions,
        generatedAt: new Date()
      });
      
      // Send email
      const subject = `Portfolio Rebalancing Report - ${householdName} - ${accountTypeLabels[account.type] || account.type}`;
      const body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Portfolio Rebalancing Report</h2>
          <p>Please find attached the portfolio rebalancing report for:</p>
          <ul>
            <li><strong>Household:</strong> ${householdName}</li>
            <li><strong>Owner:</strong> ${ownerName}</li>
            <li><strong>Account:</strong> ${accountTypeLabels[account.type] || account.type}${account.nickname ? ` - ${account.nickname}` : ''}</li>
            <li><strong>Total Value:</strong> $${totalActualValue.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</li>
          </ul>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This report was generated on ${new Date().toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' })}.
          </p>
        </div>
      `;
      
      const fileName = `Portfolio_Rebalancing_${householdName.replace(/\s+/g, '_')}_${account.type}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      await sendEmailWithAttachment(email, subject, body, pdfBuffer, fileName);
      
      res.json({ 
        success: true, 
        message: `Report sent successfully to ${email}` 
      });
    } catch (error: any) {
      log.error("Error sending portfolio report", error);
      res.status(500).json({ message: error.message || "Failed to send portfolio report" });
    }
  });

  // Utility endpoint to generate and email a task list PDF
  app.post('/api/utility/send-task-list-pdf', isAuthenticated, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }
      
      // @ts-ignore
      const PDFDocument = (await import('pdfkit')).default;
      
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({ 
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(24).font('Helvetica-Bold')
           .text('SaaS Conversion Task List', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(12).font('Helvetica')
           .fillColor('#666666')
           .text('Investment Portfolio Management Platform', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10)
           .text(`Generated: ${new Date().toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' })}`, { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown(1);

        // Separator
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(1);

        // Phase 1
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#10b981')
           .text('Phase 1: Data Isolation (✅ Completed - <1 hour)');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').fillColor('#000000');
        
        const phase1Tasks = [
          'Add userId to households table and update schema',
          'Create user_settings table for per-user configuration (email, webhook secret, plan type)',
          'Update storage layer - Filter all queries by userId for data isolation',
          'Update API routes to use authenticated user\'s ID for all operations'
        ];
        phase1Tasks.forEach((task, i) => {
          doc.text(`${i + 1}. ${task}`, { indent: 20 });
          doc.moveDown(0.3);
        });
        doc.moveDown(0.5);

        // Phase 2
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#2563eb')
           .text('Phase 2: User Experience (3-6 hours with AI assistance)');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').fillColor('#000000');
        
        const phase2Tasks = [
          'Create user settings page - Email configuration, webhook secret display/regenerate',
          'Update webhook endpoint to route alerts to correct user based on secret',
          'Create onboarding flow for new users (welcome screen, setup wizard)',
          'Update navigation/UI for multi-tenant experience (user dashboard, account menu)'
        ];
        phase2Tasks.forEach((task, i) => {
          doc.text(`${i + 5}. ${task}`, { indent: 20 });
          doc.moveDown(0.3);
        });
        doc.moveDown(0.5);

        // Phase 3
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#2563eb')
           .text('Phase 3: Payments (4-8 hours with AI assistance)');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').fillColor('#000000');
        
        const phase3Tasks = [
          'Integrate Stripe for subscription payments (checkout, webhooks, portal)',
          'Implement plan limits (free tier: 1 household, paid: unlimited)',
          'Add subscription status checks to protected features'
        ];
        phase3Tasks.forEach((task, i) => {
          doc.text(`${i + 9}. ${task}`, { indent: 20 });
          doc.moveDown(0.3);
        });
        doc.moveDown(0.5);

        // Phase 4
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#2563eb')
           .text('Phase 4: Polish (2-4 hours with AI assistance)');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').fillColor('#000000');
        
        const phase4Tasks = [
          'Create landing/marketing page for new visitors',
          'Add TradingView setup instructions page with user\'s unique webhook URL',
          'Testing and polish - Verify data isolation, payment flow, alert routing'
        ];
        phase4Tasks.forEach((task, i) => {
          doc.text(`${i + 12}. ${task}`, { indent: 20 });
          doc.moveDown(0.3);
        });
        doc.moveDown(1);

        // Summary section
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(0.5);
        
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
           .text('Estimated Timeline: 1-2 days (9-18 hours) with AI-assisted development');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica').fillColor('#666666')
           .text('Note: Original estimate was 2-3 weeks for traditional development. AI assistance significantly accelerates implementation.');
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica')
           .text('This plan converts your existing portfolio management platform into a multi-tenant SaaS product, allowing you to sell portfolio management and TradingView alert services to other users.');

        doc.end();
      });

      // Send email
      const subject = 'SaaS Conversion Task List - Investment Portfolio Platform';
      const body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">SaaS Conversion Task List</h2>
          <p>Please find attached the detailed task list for converting your Investment Portfolio Management Platform to a multi-tenant SaaS product.</p>
          <h3>Summary</h3>
          <ul>
            <li><strong>Phase 1:</strong> Data Isolation (✅ Completed - &lt;1 hour)</li>
            <li><strong>Phase 2:</strong> User Experience (3-6 hours with AI assistance)</li>
            <li><strong>Phase 3:</strong> Payments (4-8 hours with AI assistance)</li>
            <li><strong>Phase 4:</strong> Polish (2-4 hours with AI assistance)</li>
          </ul>
          <p><strong>Estimated Total:</strong> 1-2 days (9-18 hours) with AI-assisted development</p>
          <p style="color: #666; font-size: 12px;"><em>Note: Original estimate was 2-3 weeks for traditional development. AI assistance significantly accelerates implementation.</em></p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Generated on ${new Date().toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>
      `;
      
      const fileName = `SaaS_Conversion_TaskList_${new Date().toISOString().split('T')[0]}.pdf`;
      
      await sendEmailWithAttachment(email, subject, body, pdfBuffer, fileName);
      
      res.json({ 
        success: true, 
        message: `Task list PDF sent successfully to ${email}` 
      });
    } catch (error: any) {
      log.error("Error sending task list PDF", error);
      res.status(500).json({ message: error.message || "Failed to send task list PDF" });
    }
  });

  // Download tasks as PDF
  app.get('/api/tasks/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getAllTasksForUser(userId);
      
      // @ts-ignore
      const PDFDocument = (await import('pdfkit')).default;
      
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({ 
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(18).font('Helvetica-Bold')
           .text('Tasks Report', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(9).font('Helvetica')
           .fillColor('#666666')
           .text(`${new Date().toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short' })}`, { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown(0.4);

        // Summary (inline format)
        const pendingTasks = tasks.filter(t => t.status !== 'completed');
        const completedTasks = tasks.filter(t => t.status === 'completed');
        const urgentTasks = pendingTasks.filter(t => t.priority === 'urgent');
        
        doc.fontSize(9).font('Helvetica');
        let summaryText = '';
        if (urgentTasks.length > 0) summaryText += `${urgentTasks.length} urgent • `;
        summaryText += `${pendingTasks.length} pending • ${completedTasks.length} completed`;
        doc.fillColor('#666666').text(summaryText, { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown(0.3);

        // Separator
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(0.3);

        // Group tasks by household
        const tasksByHousehold: Record<string, typeof tasks> = {};
        for (const task of tasks) {
          if (!tasksByHousehold[task.householdName]) {
            tasksByHousehold[task.householdName] = [];
          }
          tasksByHousehold[task.householdName].push(task);
        }

        // Account type labels
        const accountTypeLabels: Record<string, string> = {
          cash: 'Cash', tfsa: 'TFSA', fhsa: 'FHSA', rrsp: 'RRSP', 
          lira: 'LIRA', lif: 'LIF', rif: 'RIF',
          corporate_cash: 'Corporate Cash', ipp: 'IPP',
          joint_cash: 'Joint Cash', resp: 'RESP'
        };

        // Priority colors
        const priorityLabels: Record<string, string> = {
          urgent: 'URGENT', high: 'HIGH', medium: 'MEDIUM', low: 'LOW'
        };

        // Render each household
        for (const [householdName, householdTasks] of Object.entries(tasksByHousehold)) {
          if (doc.y > 620) {
            doc.addPage();
          }

          // Household header
          doc.fontSize(12).font('Helvetica-Bold')
             .text(householdName);
          doc.moveDown(0.3);

          // Sort tasks: pending first, then by priority
          const sortedTasks = [...householdTasks].sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (b.status === 'completed' && a.status !== 'completed') return -1;
            const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
            return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
          });

          for (const task of sortedTasks) {
            if (doc.y > 700) {
              doc.addPage();
            }

            const isCompleted = task.status === 'completed';
            const accountLabel = accountTypeLabels[task.accountTypeLabel] || task.accountTypeLabel;
            const titleColor = isCompleted ? '#999999' : '#000000';
            
            // Draw checkbox
            const checkboxSize = 10;
            const checkboxX = 50;
            const checkboxY = doc.y;
            doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize).stroke();
            
            // If completed, draw checkmark inside
            if (isCompleted) {
              doc.save();
              doc.strokeColor('#666666');
              doc.moveTo(checkboxX + 2, checkboxY + 5)
                 .lineTo(checkboxX + 4, checkboxY + 8)
                 .lineTo(checkboxX + 8, checkboxY + 2)
                 .stroke();
              doc.restore();
            }
            
            // Task title (indented to account for checkbox)
            doc.fontSize(10).font(isCompleted ? 'Helvetica-Oblique' : 'Helvetica-Bold').fillColor(titleColor)
               .text(task.title, checkboxX + checkboxSize + 6, checkboxY, { continued: false });
            
            // Task details
            doc.fontSize(8).font('Helvetica').fillColor('#666666');
            const details = [];
            details.push(`${task.ownerName}`);
            if (task.accountNickname) {
              details.push(`${accountLabel} - ${task.accountNickname}`);
            } else {
              details.push(accountLabel);
            }
            if (task.dueDate) {
              details.push(`Due: ${new Date(task.dueDate).toLocaleDateString('en-CA')}`);
            }
            details.push(`[${task.priority.toUpperCase()}]`);
            doc.text(details.join(' • '), checkboxX + checkboxSize + 6);
            
            if (task.description) {
              doc.fontSize(8).font('Helvetica').fillColor('#777777')
                 .text(task.description, checkboxX + checkboxSize + 6, doc.y, { width: 450, height: 30 });
            }
            
            doc.fillColor('#000000');
            doc.moveDown(0.4);
          }

          doc.moveDown(0.2);
        }

        doc.end();
      });

      const fileName = `Account_Tasks_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(pdfBuffer);
      
    } catch (error: any) {
      log.error("Error generating tasks PDF", error);
      res.status(500).json({ message: error.message || "Failed to generate tasks PDF" });
    }
  });

  // Email tasks PDF
  app.post('/api/tasks/email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getAllTasksForUser(userId);
      const recipientEmail = process.env.TRADINGVIEW_REPORT_EMAIL;
      
      if (!recipientEmail) {
        return res.status(400).json({ message: "No email configured. Please set TRADINGVIEW_REPORT_EMAIL." });
      }
      
      // @ts-ignore
      const PDFDocument = (await import('pdfkit')).default;
      
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({ 
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(18).font('Helvetica-Bold')
           .text('Tasks Report', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(9).font('Helvetica')
           .fillColor('#666666')
           .text(`${new Date().toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short' })}`, { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown(0.4);

        // Summary
        const pendingTasks = tasks.filter(t => t.status !== 'completed');
        const completedTasks = tasks.filter(t => t.status === 'completed');
        const urgentTasks = pendingTasks.filter(t => t.priority === 'urgent');
        
        doc.fontSize(9).font('Helvetica');
        let summaryText = '';
        if (urgentTasks.length > 0) summaryText += `${urgentTasks.length} urgent • `;
        summaryText += `${pendingTasks.length} pending • ${completedTasks.length} completed`;
        doc.fillColor('#666666').text(summaryText, { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown(0.3);

        // Separator
        doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(0.3);

        // Group tasks by household
        const tasksByHousehold: Record<string, typeof tasks> = {};
        for (const task of tasks) {
          if (!tasksByHousehold[task.householdName]) {
            tasksByHousehold[task.householdName] = [];
          }
          tasksByHousehold[task.householdName].push(task);
        }

        const accountTypeLabels: Record<string, string> = {
          cash: 'Cash', tfsa: 'TFSA', fhsa: 'FHSA', rrsp: 'RRSP', 
          lira: 'LIRA', lif: 'LIF', rif: 'RIF',
          corporate_cash: 'Corporate Cash', ipp: 'IPP',
          joint_cash: 'Joint Cash', resp: 'RESP'
        };

        // Render each household
        for (const [householdName, householdTasks] of Object.entries(tasksByHousehold)) {
          if (doc.y > 620) {
            doc.addPage();
          }

          doc.fontSize(12).font('Helvetica-Bold').text(householdName);
          doc.moveDown(0.3);

          const sortedTasks = [...householdTasks].sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (b.status === 'completed' && a.status !== 'completed') return -1;
            const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
            return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
          });

          for (const task of sortedTasks) {
            if (doc.y > 700) {
              doc.addPage();
            }

            const isCompleted = task.status === 'completed';
            const accountLabel = accountTypeLabels[task.accountTypeLabel] || task.accountTypeLabel;
            const titleColor = isCompleted ? '#999999' : '#000000';
            
            // Draw checkbox
            const checkboxSize = 10;
            const checkboxX = 50;
            const checkboxY = doc.y;
            doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize).stroke();
            
            if (isCompleted) {
              doc.save();
              doc.strokeColor('#666666');
              doc.moveTo(checkboxX + 2, checkboxY + 5)
                 .lineTo(checkboxX + 4, checkboxY + 8)
                 .lineTo(checkboxX + 8, checkboxY + 2)
                 .stroke();
              doc.restore();
            }
            
            doc.fontSize(10).font(isCompleted ? 'Helvetica-Oblique' : 'Helvetica-Bold').fillColor(titleColor)
               .text(task.title, checkboxX + checkboxSize + 6, checkboxY, { continued: false });
            
            doc.fontSize(8).font('Helvetica').fillColor('#666666');
            const details = [];
            details.push(`${task.ownerName}`);
            if (task.accountNickname) {
              details.push(`${accountLabel} - ${task.accountNickname}`);
            } else {
              details.push(accountLabel);
            }
            if (task.dueDate) {
              details.push(`Due: ${new Date(task.dueDate).toLocaleDateString('en-CA')}`);
            }
            details.push(`[${task.priority.toUpperCase()}]`);
            doc.text(details.join(' • '), checkboxX + checkboxSize + 6);
            
            if (task.description) {
              doc.fontSize(8).font('Helvetica').fillColor('#777777')
                 .text(task.description, checkboxX + checkboxSize + 6, doc.y, { width: 450, height: 30 });
            }
            
            doc.fillColor('#000000');
            doc.moveDown(0.4);
          }

          doc.moveDown(0.2);
        }

        doc.end();
      });

      const fileName = `Account_Tasks_${new Date().toISOString().split('T')[0]}.pdf`;
      const subject = `PracticeOS Tasks Report - ${new Date().toLocaleDateString('en-CA')}`;
      const body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Tasks Report</h2>
          <p>Please find attached your Tasks Report from PracticeOS.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Generated on ${new Date().toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>
      `;
      
      await sendEmailWithAttachment(recipientEmail, subject, body, pdfBuffer, fileName);
      
      res.json({ 
        success: true, 
        message: `Tasks Report sent to ${recipientEmail}` 
      });
      
    } catch (error: any) {
      log.error("Error emailing tasks PDF", error);
      res.status(500).json({ message: error.message || "Failed to email tasks PDF" });
    }
  });

  // Register market data routes (Canadian market status, exchange rates, economic calendar, etc.)
  registerMarketDataRoutes(app);

  const httpServer = createServer(app);
  
  // Background job: Refresh Universal Holdings prices every 5 minutes
  const PRICE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  async function refreshUniversalHoldingsPrices() {
    log.debug("[Background Job] Starting Universal Holdings price refresh...");
    try {
      const holdings = await storage.getAllUniversalHoldings();
      
      if (!holdings || holdings.length === 0) {
        log.debug("[Background Job] No holdings to update");
        return;
      }
      
      // Use yahoo-finance2 v3 API
      const YahooFinance = (await import('yahoo-finance2')).default;
      const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
      
      const tickerPriceCache: Record<string, number | null> = {};
      const now = new Date();
      let updatedCount = 0;
      let errorCount = 0;
      
      for (const holding of holdings) {
        try {
          const upperSymbol = holding.ticker.toUpperCase().trim();
          
          // Handle cash positions
          if (upperSymbol === 'CASH' || upperSymbol === 'CAD' || upperSymbol === 'USD' || 
              upperSymbol.includes('CASH') || upperSymbol.includes('MONEY MARKET')) {
            await storage.updateUniversalHolding(holding.id, { 
              price: "1.00",
              priceUpdatedAt: now
            });
            updatedCount++;
            continue;
          }
          
          // Check cache first
          if (tickerPriceCache[holding.ticker] !== undefined) {
            const cachedPrice = tickerPriceCache[holding.ticker];
            if (cachedPrice !== null) {
              await storage.updateUniversalHolding(holding.id, { 
                price: cachedPrice.toFixed(2),
                priceUpdatedAt: now
              });
              updatedCount++;
            }
            continue;
          }
          
          // Try the symbol as-is first, then with Canadian/US exchange suffixes
          let quote = null;
          const symbolsToTry = [holding.ticker];
          
          if (!holding.ticker.includes('.')) {
            symbolsToTry.push(`${holding.ticker}.TO`);
            symbolsToTry.push(`${holding.ticker}.V`);
            symbolsToTry.push(`${holding.ticker}.CN`);
            symbolsToTry.push(`${holding.ticker}.NE`);
          }
          
          for (const symbol of symbolsToTry) {
            try {
              const result = await yahooFinance.quote(symbol);
              if (result && (result as any).regularMarketPrice) {
                quote = result as any;
                break;
              }
            } catch (e) {
              // Try next suffix
            }
          }
          
          if (quote && quote.regularMarketPrice) {
            const price = quote.regularMarketPrice;
            tickerPriceCache[holding.ticker] = price;
            await storage.updateUniversalHolding(holding.id, { 
              price: price.toFixed(2),
              priceUpdatedAt: now
            });
            updatedCount++;
          } else {
            tickerPriceCache[holding.ticker] = null;
            errorCount++;
          }
        } catch (error) {
          tickerPriceCache[holding.ticker] = null;
          errorCount++;
        }
      }
      
      log.debug("[Background Job] Price refresh complete: ${updatedCount} updated, ${errorCount} errors");
    } catch (error) {
      log.error("[Background Job] Error refreshing prices", error);
    }
  }
  
  // Run initial refresh after 30 seconds (let server fully start)
  setTimeout(() => {
    refreshUniversalHoldingsPrices();
  }, 30 * 1000);
  
  // Then run every 5 minutes
  setInterval(() => {
    refreshUniversalHoldingsPrices();
  }, PRICE_REFRESH_INTERVAL);
  
  log.debug("[Background Job] Price refresh scheduler started (every 5 minutes)");

  // Background job: Refresh Account Position prices every 15 minutes and check protection thresholds
  const POSITION_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds
  const PROTECTION_THRESHOLD_PERCENT = 15; // Create task when position is up 15% or more
  
  async function refreshAccountPositionPrices() {
    log.debug("[Background Job] Starting Account Position price refresh...");
    try {
      // Get all positions with their account info
      const allPositions = await storage.getAllPositionsWithAccountInfo();
      
      if (!allPositions || allPositions.length === 0) {
        log.debug("[Background Job] No account positions to update");
        return;
      }
      
      // Get unique symbols
      const symbolSet = new Set(allPositions.map(p => p.symbol.toUpperCase().trim()));
      const symbols = Array.from(symbolSet);
      
      // Use yahoo-finance2 API
      const YahooFinance = (await import('yahoo-finance2')).default;
      const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
      
      const priceCache: Record<string, number | null> = {};
      const now = new Date();
      let updatedCount = 0;
      let errorCount = 0;
      
      // Batch fetch prices for all unique symbols
      for (const rawSymbol of symbols) {
        try {
          const upperSymbol = rawSymbol.toUpperCase().trim();
          
          // Skip cash positions
          if (upperSymbol === 'CASH' || upperSymbol === 'CAD' || upperSymbol === 'USD' || 
              upperSymbol.includes('CASH') || upperSymbol.includes('MONEY MARKET')) {
            priceCache[rawSymbol] = 1;
            continue;
          }
          
          // Try the symbol as-is first, then with Canadian/US exchange suffixes
          let quote = null;
          const symbolsToTry = [rawSymbol];
          
          if (!rawSymbol.includes('.')) {
            symbolsToTry.push(`${rawSymbol}.TO`);
            symbolsToTry.push(`${rawSymbol}.V`);
            symbolsToTry.push(`${rawSymbol}.CN`);
            symbolsToTry.push(`${rawSymbol}.NE`);
          }
          
          for (const symbol of symbolsToTry) {
            try {
              const result = await yahooFinance.quote(symbol);
              if (result && (result as any).regularMarketPrice) {
                quote = result as any;
                break;
              }
            } catch (e) {
              // Try next suffix
            }
          }
          
          if (quote && quote.regularMarketPrice) {
            priceCache[rawSymbol] = quote.regularMarketPrice;
          } else {
            priceCache[rawSymbol] = null;
            errorCount++;
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          priceCache[rawSymbol] = null;
          errorCount++;
        }
      }
      
      // Update positions with new prices and check for protection threshold
      const positionsNeedingProtection: Array<{
        position: typeof allPositions[0];
        gainPercent: number;
        newPrice: number;
      }> = [];
      
      for (const position of allPositions) {
        const newPrice = priceCache[position.symbol];
        if (newPrice !== null && newPrice !== undefined) {
          await storage.updatePosition(position.id, { 
            currentPrice: newPrice.toString(),
            priceUpdatedAt: now
          });
          updatedCount++;
          
          // Check protection threshold (only for non-cash positions without existing protection)
          const entryPrice = parseFloat(position.entryPrice || '0');
          if (entryPrice > 0 && !position.protectionPercent) {
            const gainPercent = ((newPrice - entryPrice) / entryPrice) * 100;
            
            if (gainPercent >= PROTECTION_THRESHOLD_PERCENT) {
              positionsNeedingProtection.push({
                position,
                gainPercent,
                newPrice
              });
            }
          }
        }
      }
      
      // Create tasks for positions needing protection review
      if (positionsNeedingProtection.length > 0) {
        log.debug(`[Background Job] Found ${positionsNeedingProtection.length} positions exceeding ${PROTECTION_THRESHOLD_PERCENT}% gain threshold`);
        
        for (const { position, gainPercent, newPrice } of positionsNeedingProtection) {
          try {
            // Check if a similar task already exists (to avoid duplicates)
            let existingTasks: AccountTask[] = [];
            switch (position.accountType) {
              case 'individual':
                existingTasks = await storage.getTasksByIndividualAccount(position.accountId);
                break;
              case 'corporate':
                existingTasks = await storage.getTasksByCorporateAccount(position.accountId);
                break;
              case 'joint':
                existingTasks = await storage.getTasksByJointAccount(position.accountId);
                break;
            }
            
            // Look for existing pending/in_progress protection task for this symbol
            const taskTitle = `Review protection for ${position.symbol}`;
            const hasPendingTask = existingTasks.some(t => 
              t.title.includes(taskTitle) && 
              (t.status === 'pending' || t.status === 'in_progress') &&
              !t.archivedAt
            );
            
            if (!hasPendingTask) {
              // Create the protection review task
              const taskData: any = {
                title: `${taskTitle} - up ${gainPercent.toFixed(1)}%`,
                description: `${position.symbol} has gained ${gainPercent.toFixed(1)}% from entry price ($${parseFloat(position.entryPrice).toFixed(2)}) to current price ($${newPrice.toFixed(2)}). Consider setting stop-loss protection to lock in gains.`,
                priority: gainPercent >= 30 ? 'urgent' : gainPercent >= 20 ? 'high' : 'medium',
                status: 'pending',
              };
              
              // Set the appropriate account ID
              switch (position.accountType) {
                case 'individual':
                  taskData.individualAccountId = position.accountId;
                  break;
                case 'corporate':
                  taskData.corporateAccountId = position.accountId;
                  break;
                case 'joint':
                  taskData.jointAccountId = position.accountId;
                  break;
              }
              
              await storage.createAccountTask(taskData);
              log.debug(`[Background Job] Created protection task for ${position.symbol} (${gainPercent.toFixed(1)}% gain)`);
            }
          } catch (taskError) {
            log.error(`[Background Job] Error creating protection task for ${position.symbol}`, taskError);
          }
        }
      }
      
      log.debug(`[Background Job] Position price refresh complete: ${updatedCount} updated, ${errorCount} errors, ${positionsNeedingProtection.length} protection tasks checked`);
    } catch (error) {
      log.error("[Background Job] Error refreshing position prices", error);
    }
  }
  
  // Run initial position refresh after 1 minute (after Universal Holdings refresh)
  setTimeout(() => {
    refreshAccountPositionPrices();
  }, 60 * 1000);
  
  // Then run every 15 minutes
  setInterval(() => {
    refreshAccountPositionPrices();
  }, POSITION_REFRESH_INTERVAL);
  
  log.debug("[Background Job] Position price refresh scheduler started (every 15 minutes, protection threshold: 15%)");

  // Search holdings by ticker across all accounts with optional filters
  app.get('/api/holdings/search', isAuthenticated, async (req: any, res) => {
    try {
      const { ticker, category, minValue, maxValue } = req.query;
      
      if (!ticker || typeof ticker !== 'string') {
        return res.status(400).json({ message: "Ticker parameter is required" });
      }

      const normalizedSearchTicker = ticker.toUpperCase().replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '');
      const minVal = minValue ? Number(minValue) : 0;
      const maxVal = maxValue ? Number(maxValue) : Infinity;
      log.debug("Holdings Search - searching", { ticker, normalized: normalizedSearchTicker, category: category || 'all', minVal, maxVal });
      
      // Fetch all households with their data
      const households = await storage.getAllHouseholds();
      const results: any[] = [];

      // Helper to normalize ticker
      const normalizeTicker = (t: string): string => {
        return t.toUpperCase().replace(/\.(TO|V|CN|NE|TSX|NYSE|NASDAQ)$/i, '');
      };

      let totalPositionsChecked = 0;

      for (const household of households) {
        // Filter by category if specified
        if (category && household.category !== category) {
          continue;
        }

        const individuals = await storage.getIndividualsByHousehold(household.id);
        const corporations = await storage.getCorporationsByHousehold(household.id);
        const jointAccounts = await storage.getJointAccountsByHousehold(household.id);

        // Check individual accounts
        for (const individual of individuals) {
          const accounts = await storage.getIndividualAccountsByIndividual(individual.id);
          for (const account of accounts) {
            const positions = await storage.getPositionsByIndividualAccount(account.id);
            totalPositionsChecked += positions.length;
            
            const matchingPositions = positions.filter((p: Position) => {
              const normalized = normalizeTicker(p.symbol);
              const value = Number(p.quantity) * Number(p.currentPrice);
              return normalized === normalizedSearchTicker && value >= minVal && value <= maxVal;
            });
            
            if (matchingPositions.length > 0) {
              log.debug("Holdings Search - found positions in individual account", { count: matchingPositions.length, accountId: account.id });
            }
            
            for (const pos of matchingPositions) {
              results.push({
                accountId: account.id,
                householdName: household.name,
                householdCategory: household.category,
                ownerName: individual.name,
                ownerType: 'Individual',
                accountType: 'individual',
                accountNickname: account.nickname || account.type,
                symbol: pos.symbol,
                quantity: Number(pos.quantity),
                currentPrice: Number(pos.currentPrice),
                value: Number(pos.quantity) * Number(pos.currentPrice),
                entryPrice: Number(pos.entryPrice),
              });
            }
          }
        }

        // Check corporate accounts
        for (const corp of corporations) {
          const accounts = await storage.getCorporateAccountsByCorporation(corp.id);
          for (const account of accounts) {
            const positions = await storage.getPositionsByCorporateAccount(account.id);
            totalPositionsChecked += positions.length;
            
            const matchingPositions = positions.filter((p: Position) => {
              const normalized = normalizeTicker(p.symbol);
              const value = Number(p.quantity) * Number(p.currentPrice);
              return normalized === normalizedSearchTicker && value >= minVal && value <= maxVal;
            });
            
            if (matchingPositions.length > 0) {
              log.debug("Holdings Search - found positions in corporate account", { count: matchingPositions.length, accountId: account.id });
            }
            
            for (const pos of matchingPositions) {
              results.push({
                accountId: account.id,
                householdName: household.name,
                householdCategory: household.category,
                ownerName: corp.name,
                ownerType: 'Corporation',
                accountType: 'corporate',
                accountNickname: account.nickname || account.type,
                symbol: pos.symbol,
                quantity: Number(pos.quantity),
                currentPrice: Number(pos.currentPrice),
                value: Number(pos.quantity) * Number(pos.currentPrice),
                entryPrice: Number(pos.entryPrice),
              });
            }
          }
        }

        // Check joint accounts
        for (const jointAccount of jointAccounts) {
          const positions = await storage.getPositionsByJointAccount(jointAccount.id);
          totalPositionsChecked += positions.length;
          
          const matchingPositions = positions.filter((p: Position) => {
            const normalized = normalizeTicker(p.symbol);
            const value = Number(p.quantity) * Number(p.currentPrice);
            return normalized === normalizedSearchTicker && value >= minVal && value <= maxVal;
          });
          
          if (matchingPositions.length > 0) {
            log.debug("Holdings Search - found positions in joint account", { count: matchingPositions.length, accountId: jointAccount.id });
          }
          
          for (const pos of matchingPositions) {
            const ownershipRows = await db.query.jointAccountOwnership.findMany({
              where: (ownership, { eq }) => eq(ownership.jointAccountId, jointAccount.id),
              with: { individual: true },
            });
            const ownerNames = ownershipRows.map((o: any) => o.individual.name).join(' & ');
            
            results.push({
              accountId: jointAccount.id,
              householdName: household.name,
              householdCategory: household.category,
              ownerName: ownerNames,
              ownerType: 'Joint',
              accountType: 'joint',
              accountNickname: jointAccount.nickname || jointAccount.type,
              symbol: pos.symbol,
              quantity: Number(pos.quantity),
              currentPrice: Number(pos.currentPrice),
              value: Number(pos.quantity) * Number(pos.currentPrice),
              entryPrice: Number(pos.entryPrice),
            });
          }
        }
      }

      log.debug("Holdings Search - completed", { totalPositionsChecked, matchesFound: results.length });
      res.json(results);
    } catch (error: any) {
      log.error("Error searching holdings", error);
      res.status(500).json({ message: error.message || "Failed to search holdings" });
    }
  });

  // Insurance Revenue API routes
  app.get('/api/insurance-revenue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getInsuranceRevenueByUser(userId);
      res.json(entries);
    } catch (error: any) {
      log.error("Error fetching insurance revenue", error);
      res.status(500).json({ message: error.message || "Failed to fetch insurance revenue" });
    }
  });

  app.post('/api/insurance-revenue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertInsuranceRevenueSchema.parse({ ...req.body, userId });
      const entry = await storage.createInsuranceRevenue(data);
      res.status(201).json(entry);
    } catch (error: any) {
      log.error("Error creating insurance revenue", error);
      res.status(500).json({ message: error.message || "Failed to create insurance revenue entry" });
    }
  });

  app.patch('/api/insurance-revenue/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership
      const existing = await storage.getInsuranceRevenueById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      const data = updateInsuranceRevenueSchema.parse(req.body);
      const entry = await storage.updateInsuranceRevenue(id, data);
      res.json(entry);
    } catch (error: any) {
      log.error("Error updating insurance revenue", error);
      res.status(500).json({ message: error.message || "Failed to update insurance revenue entry" });
    }
  });

  app.delete('/api/insurance-revenue/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership
      const existing = await storage.getInsuranceRevenueById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      await storage.deleteInsuranceRevenue(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error deleting insurance revenue", error);
      res.status(500).json({ message: error.message || "Failed to delete insurance revenue entry" });
    }
  });

  // Investment Revenue API routes
  app.get('/api/investment-revenue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getInvestmentRevenueByUser(userId);
      res.json(entries);
    } catch (error: any) {
      log.error("Error fetching investment revenue", error);
      res.status(500).json({ message: error.message || "Failed to fetch investment revenue" });
    }
  });

  app.post('/api/investment-revenue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertInvestmentRevenueSchema.parse({ ...req.body, userId });
      const entry = await storage.createInvestmentRevenue(data);
      res.status(201).json(entry);
    } catch (error: any) {
      log.error("Error creating investment revenue", error);
      res.status(500).json({ message: error.message || "Failed to create investment revenue entry" });
    }
  });

  app.patch('/api/investment-revenue/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership
      const existing = await storage.getInvestmentRevenueById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      const data = updateInvestmentRevenueSchema.parse(req.body);
      const entry = await storage.updateInvestmentRevenue(id, data);
      res.json(entry);
    } catch (error: any) {
      log.error("Error updating investment revenue", error);
      res.status(500).json({ message: error.message || "Failed to update investment revenue entry" });
    }
  });

  app.delete('/api/investment-revenue/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership
      const existing = await storage.getInvestmentRevenueById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      await storage.deleteInvestmentRevenue(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error deleting investment revenue", error);
      res.status(500).json({ message: error.message || "Failed to delete investment revenue entry" });
    }
  });

  // KPI Objectives API routes
  app.get('/api/kpi-objectives', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const objectives = await storage.getKpiObjectivesByUser(userId);
      res.json(objectives);
    } catch (error: any) {
      log.error("Error fetching KPI objectives", error);
      res.status(500).json({ message: error.message || "Failed to fetch KPI objectives" });
    }
  });

  app.post('/api/kpi-objectives', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertKpiObjectiveSchema.parse({ ...req.body, userId });
      const objective = await storage.createKpiObjective(data);
      res.status(201).json(objective);
    } catch (error: any) {
      log.error("Error creating KPI objective", error);
      res.status(500).json({ message: error.message || "Failed to create KPI objective" });
    }
  });

  app.patch('/api/kpi-objectives/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership
      const existing = await storage.getKpiObjectiveById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Objective not found" });
      }
      
      const data = updateKpiObjectiveSchema.parse(req.body);
      const objective = await storage.updateKpiObjective(id, data);
      res.json(objective);
    } catch (error: any) {
      log.error("Error updating KPI objective", error);
      res.status(500).json({ message: error.message || "Failed to update KPI objective" });
    }
  });

  app.delete('/api/kpi-objectives/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership
      const existing = await storage.getKpiObjectiveById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Objective not found" });
      }
      
      await storage.deleteKpiObjective(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error deleting KPI objective", error);
      res.status(500).json({ message: error.message || "Failed to delete KPI objective" });
    }
  });

  // KPI Daily Tasks API routes
  app.get('/api/kpi-objectives/:id/daily-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership of the objective
      const objective = await storage.getKpiObjectiveById(id);
      if (!objective || objective.userId !== userId) {
        return res.status(404).json({ message: "Objective not found" });
      }
      
      const tasks = await storage.getDailyTasksByObjective(id);
      res.json(tasks);
    } catch (error: any) {
      log.error("Error fetching daily tasks", error);
      res.status(500).json({ message: error.message || "Failed to fetch daily tasks" });
    }
  });

  app.post('/api/kpi-objectives/:id/daily-tasks/initialize', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { days, trackerMode } = req.body; // Array of day numbers and tracker mode
      const userId = req.user.claims.sub;
      
      // Verify ownership of the objective
      const objective = await storage.getKpiObjectiveById(id);
      if (!objective || objective.userId !== userId) {
        return res.status(404).json({ message: "Objective not found" });
      }
      
      // Delete existing tasks first
      await storage.deleteDailyTasksByObjective(id);
      
      // Update objective with tracker mode
      if (trackerMode) {
        await storage.updateKpiObjective(id, { dailyTrackerMode: trackerMode });
      }
      
      // Create new tasks for each day
      const tasksToCreate = days.map((dayNumber: number) => ({
        objectiveId: id,
        dayNumber,
        isCompleted: 0,
      }));
      
      const tasks = await storage.createBulkDailyTasks(tasksToCreate);
      res.status(201).json(tasks);
    } catch (error: any) {
      log.error("Error initializing daily tasks", error);
      res.status(500).json({ message: error.message || "Failed to initialize daily tasks" });
    }
  });

  app.patch('/api/kpi-daily-tasks/:id/toggle', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Get the task and verify ownership through the objective
      const tasks = await db.select()
        .from(kpiDailyTasks)
        .where(eq(kpiDailyTasks.id, id));
      
      if (tasks.length === 0) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const objective = await storage.getKpiObjectiveById(tasks[0].objectiveId);
      if (!objective || objective.userId !== userId) {
        return res.status(404).json({ message: "Objective not found" });
      }
      
      const task = await storage.toggleDailyTask(id);
      res.json(task);
    } catch (error: any) {
      log.error("Error toggling daily task", error);
      res.status(500).json({ message: error.message || "Failed to toggle daily task" });
    }
  });

  app.delete('/api/kpi-objectives/:id/daily-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership of the objective
      const objective = await storage.getKpiObjectiveById(id);
      if (!objective || objective.userId !== userId) {
        return res.status(404).json({ message: "Objective not found" });
      }
      
      await storage.deleteDailyTasksByObjective(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error deleting daily tasks", error);
      res.status(500).json({ message: error.message || "Failed to delete daily tasks" });
    }
  });

  // KPI Export endpoint
  app.get('/api/kpi-objectives/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { mode, month } = req.query;
      
      const objectives = await storage.getKpiObjectivesByUser(userId);
      
      let filtered = objectives;
      if (mode === "single" && month) {
        filtered = objectives.filter(o => o.month === month);
      }
      
      const PDFDocument = (await import("pdfkit")).default;
      const doc = new PDFDocument({ margin: 40 });
      const filename = mode === "all" 
        ? `KPI_Dashboard_12Months_${new Date().toISOString().split('T')[0]}.pdf`
        : `KPI_Dashboard_${month}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      
      doc.pipe(res);
      
      doc.fontSize(24).font("Helvetica-Bold").text("KPI Dashboard", { align: "center" });
      doc.fontSize(12).font("Helvetica").text(mode === "all" ? "12-Month Overview" : `Month: ${month}`, { align: "center" });
      doc.moveDown();
      
      const months = new Map<string, { personal: typeof filtered, business: typeof filtered }>();
      filtered.forEach(obj => {
        if (!months.has(obj.month)) months.set(obj.month, { personal: [], business: [] });
        const entry = months.get(obj.month)!;
        if (obj.type === "personal") entry.personal.push(obj);
        else entry.business.push(obj);
      });

      // Helper to format month from YYYY-MM to Month Year
      const formatMonth = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      };
      
      months.forEach((groups, monthKey) => {
        doc.fontSize(13).font("Helvetica-Bold").text(formatMonth(monthKey));
        doc.moveDown(0.2);
        
        ["personal", "business"].forEach(type => {
          const objectives = groups[type as keyof typeof groups];
          if (objectives.length > 0) {
            const typeLabel = type === "personal" ? "Personal" : "Business";
            objectives.forEach((obj, idx) => {
              const statusLabel = obj.status.charAt(0).toUpperCase() + obj.status.slice(1);
              const isCompleted = obj.status === "completed";
              const titleText = `• ${obj.title} — ${statusLabel}`;
              doc.fontSize(10).font("Helvetica");
              if (isCompleted) {
                doc.text(titleText, { indent: 15, strike: true });
              } else {
                doc.text(titleText, { indent: 15 });
              }
              if (obj.description && !isCompleted) {
                const formattedDesc = obj.description
                  .split('\n')
                  .map(line => line.replace(/^\s*\*\s/, '• '))
                  .join('\n')
                  .split('\n')[0]
                  .slice(0, 80);
                doc.fontSize(9).font("Helvetica").fillColor("#666666").text(formattedDesc, { indent: 20 });
                doc.fillColor("#000000");
              }
              doc.moveDown(0.3);
            });
          }
        });
        doc.moveDown();
      });
      
      doc.end();
    } catch (error: any) {
      log.error("Error exporting KPI objectives", error);
      res.status(500).json({ message: error.message || "Failed to export PDF" });
    }
  });

  // Reference Links API routes
  app.get('/api/reference-links', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const links = await storage.getReferenceLinksByUser(userId);
      res.json(links);
    } catch (error: any) {
      log.error("Error fetching reference links", error);
      res.status(500).json({ message: error.message || "Failed to fetch reference links" });
    }
  });

  app.post('/api/reference-links', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertReferenceLinkSchema.parse({ ...req.body, userId });
      const link = await storage.createReferenceLink(data);
      res.status(201).json(link);
    } catch (error: any) {
      log.error("Error creating reference link", error);
      res.status(500).json({ message: error.message || "Failed to create reference link" });
    }
  });

  app.patch('/api/reference-links/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const existing = await storage.getReferenceLinkById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Link not found" });
      }
      
      const data = updateReferenceLinkSchema.parse(req.body);
      const link = await storage.updateReferenceLink(id, data);
      res.json(link);
    } catch (error: any) {
      log.error("Error updating reference link", error);
      res.status(500).json({ message: error.message || "Failed to update reference link" });
    }
  });

  app.delete('/api/reference-links/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const existing = await storage.getReferenceLinkById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Link not found" });
      }
      
      await storage.deleteReferenceLink(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error deleting reference link", error);
      res.status(500).json({ message: error.message || "Failed to delete reference link" });
    }
  });

  // Milestones API routes
  app.get('/api/milestones', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type } = req.query;
      const milestoneType = type === 'personal' ? 'personal' : type === 'business' ? 'business' : undefined;
      const milestones = await storage.getMilestonesByUser(userId, milestoneType);
      res.json(milestones);
    } catch (error: any) {
      log.error("Error fetching milestones", error);
      res.status(500).json({ message: error.message || "Failed to fetch milestones" });
    }
  });

  app.post('/api/milestones', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertMilestoneSchema.parse({ ...req.body, userId });
      const milestone = await storage.createMilestone(data);
      res.status(201).json(milestone);
    } catch (error: any) {
      log.error("Error creating milestone", error);
      res.status(500).json({ message: error.message || "Failed to create milestone" });
    }
  });

  app.patch('/api/milestones/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const existing = await storage.getMilestoneById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Milestone not found" });
      }
      
      const data = updateMilestoneSchema.parse(req.body);
      const milestone = await storage.updateMilestone(id, data);
      res.json(milestone);
    } catch (error: any) {
      log.error("Error updating milestone", error);
      res.status(500).json({ message: error.message || "Failed to update milestone" });
    }
  });

  app.delete('/api/milestones/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const existing = await storage.getMilestoneById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Milestone not found" });
      }
      
      await storage.deleteMilestone(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error deleting milestone", error);
      res.status(500).json({ message: error.message || "Failed to delete milestone" });
    }
  });

  // Milestones PDF Export
  app.get('/api/milestones/export/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type } = req.query;
      const milestoneType = type === 'personal' ? 'personal' : type === 'business' ? 'business' : undefined;
      const milestones = await storage.getMilestonesByUser(userId, milestoneType);
      
      const reportTitle = type === 'personal' ? 'Personal Milestones' : type === 'business' ? 'Business Milestones' : 'Milestones & Wins';
      const pdfBuffer = await generateMilestonesReport(milestones, reportTitle);
      
      const filePrefix = type === 'personal' ? 'Personal_Milestones' : type === 'business' ? 'Business_Milestones' : 'Milestones';
      const fileName = `${filePrefix}_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      log.error("Error exporting milestones PDF", error);
      res.status(500).json({ message: error.message || "Failed to export PDF" });
    }
  });

  // Milestones Email PDF
  app.post('/api/milestones/export/email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { to, subject, message, type } = req.body;
      
      if (!to || !to.includes('@')) {
        return res.status(400).json({ message: "Valid email address required" });
      }
      
      const milestoneType = type === 'personal' ? 'personal' : type === 'business' ? 'business' : undefined;
      const milestones = await storage.getMilestonesByUser(userId, milestoneType);
      const reportTitle = type === 'personal' ? 'Personal Milestones' : type === 'business' ? 'Business Milestones' : 'Milestones & Wins';
      const pdfBuffer = await generateMilestonesReport(milestones, reportTitle);
      
      const fileName = `Milestones_${new Date().toISOString().split('T')[0]}.pdf`;
      const emailSubject = subject || 'Milestones & Wins Report';
      const emailBody = message || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">Milestones & Wins Report</h2>
          <p style="color: #4b5563;">Please find attached your Milestones & Wins report.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            Generated from PracticeOS on ${new Date().toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>
      `;
      
      await sendEmailWithAttachment(to, emailSubject, emailBody, pdfBuffer, fileName);
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error: any) {
      log.error("Error emailing milestones PDF", error);
      res.status(500).json({ message: error.message || "Failed to send email" });
    }
  });

  // Trading Journal API routes
  app.get('/api/trading-journal/entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { symbol, tagIds, startDate, endDate, outcome, search } = req.query;
      
      const filters: any = {};
      if (symbol) filters.symbol = symbol;
      if (tagIds) {
        const tagArray = Array.isArray(tagIds) ? tagIds : tagIds.split(',').filter(Boolean);
        if (tagArray.length > 0) filters.tagIds = tagArray;
      }
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (outcome) filters.outcome = outcome;
      if (search) filters.search = search;

      const entries = await storage.getJournalEntries(userId, filters);
      res.json(entries);
    } catch (error: any) {
      log.error("Error fetching journal entries", error);
      res.status(500).json({ message: error.message || "Failed to fetch journal entries" });
    }
  });

  app.get('/api/trading-journal/entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const entry = await storage.getJournalEntryWithDetails(id);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      // Verify ownership
      if (entry.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(entry);
    } catch (error: any) {
      log.error("Error fetching journal entry", error);
      res.status(500).json({ message: error.message || "Failed to fetch journal entry" });
    }
  });

  app.post('/api/trading-journal/entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertTradingJournalEntrySchema.parse(req.body);
      const entry = await storage.createJournalEntry(userId, data);
      res.status(201).json(entry);
    } catch (error: any) {
      log.error("Error creating journal entry", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create journal entry" });
    }
  });

  app.put('/api/trading-journal/entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const existing = await storage.getJournalEntryById(id);
      if (!existing) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const data = updateTradingJournalEntrySchema.parse(req.body);
      const entry = await storage.updateJournalEntry(id, data);
      res.json(entry);
    } catch (error: any) {
      log.error("Error updating journal entry", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to update journal entry" });
    }
  });

  app.delete('/api/trading-journal/entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const existing = await storage.getJournalEntryById(id);
      if (!existing) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteJournalEntry(id);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error deleting journal entry", error);
      res.status(500).json({ message: error.message || "Failed to delete journal entry" });
    }
  });

  app.post('/api/trading-journal/entries/:id/images', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const entry = await storage.getJournalEntryById(id);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      if (entry.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const data = insertTradingJournalImageSchema.parse({ ...req.body, entryId: id });
      const image = await storage.addJournalImage(data);
      res.status(201).json(image);
    } catch (error: any) {
      log.error("Error adding journal image", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to add journal image" });
    }
  });

  app.delete('/api/trading-journal/entries/:id/images/:imageId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id, imageId } = req.params;
      
      const entry = await storage.getJournalEntryById(id);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      if (entry.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.removeJournalImage(imageId);
      res.json({ success: true });
    } catch (error: any) {
      log.error("Error removing journal image", error);
      res.status(500).json({ message: error.message || "Failed to remove journal image" });
    }
  });

  app.get('/api/trading-journal/tags', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tags = await storage.getTags(userId);
      res.json(tags);
    } catch (error: any) {
      log.error("Error fetching tags", error);
      res.status(500).json({ message: error.message || "Failed to fetch tags" });
    }
  });

  app.post('/api/trading-journal/tags', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertTradingJournalTagSchema.parse(req.body);
      const tag = await storage.createTag(userId, data);
      res.status(201).json(tag);
    } catch (error: any) {
      log.error("Error creating tag", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create tag" });
    }
  });

  app.post('/api/trading-journal/entries/:id/tags', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { tagIds } = req.body;
      
      if (!Array.isArray(tagIds)) {
        return res.status(400).json({ message: "tagIds must be an array" });
      }
      
      const entry = await storage.getJournalEntryById(id);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      if (entry.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.updateEntryTags(id, tagIds);
      const entryTags = await storage.getEntryTags(id);
      res.json(entryTags);
    } catch (error: any) {
      log.error("Error updating entry tags", error);
      res.status(500).json({ message: error.message || "Failed to update entry tags" });
    }
  });

  app.get('/api/trading-journal/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analytics = await storage.getJournalAnalytics(userId);
      res.json(analytics);
    } catch (error: any) {
      log.error("Error fetching journal analytics", error);
      res.status(500).json({ message: error.message || "Failed to fetch journal analytics" });
    }
  });

  return httpServer;
}


