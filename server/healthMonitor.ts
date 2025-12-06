// Health Monitor Service - Automated monitoring, alerts, and auto-recovery
import { db } from "./db";
import { pool } from "./db";
import { sql } from "drizzle-orm";
import { log } from "./logger";

// Types
interface ServiceStatus {
  status: 'ok' | 'warning' | 'error';
  message?: string;
  latency?: number;
  lastCheck: Date;
  lastError?: Date;
  errorCount: number;
  consecutiveErrors: number;
}

interface HealthState {
  database: ServiceStatus;
  email: ServiceStatus;
  auth: ServiceStatus;
  marketData: ServiceStatus;
  overall: 'ok' | 'warning' | 'error';
  lastAlertSent?: Date;
}

// Configuration
const CONFIG = {
  checkIntervalMs: 30000, // Check every 30 seconds
  alertCooldownMs: 5 * 60 * 1000, // Don't send more than 1 alert per 5 minutes
  maxConsecutiveErrors: 3, // Send alert after 3 consecutive errors
  dbReconnectAttempts: 5,
  dbReconnectDelayMs: 2000,
};

// State
let healthState: HealthState = {
  database: { status: 'ok', lastCheck: new Date(), errorCount: 0, consecutiveErrors: 0 },
  email: { status: 'ok', lastCheck: new Date(), errorCount: 0, consecutiveErrors: 0 },
  auth: { status: 'ok', lastCheck: new Date(), errorCount: 0, consecutiveErrors: 0 },
  marketData: { status: 'ok', lastCheck: new Date(), errorCount: 0, consecutiveErrors: 0 },
  overall: 'ok',
};

let monitorInterval: NodeJS.Timeout | null = null;
let isReconnecting = false;

// Status history for debugging
const statusHistory: Array<{ timestamp: Date; service: string; status: string; message?: string }> = [];
const MAX_HISTORY = 100;

function addToHistory(service: string, status: string, message?: string) {
  statusHistory.unshift({ timestamp: new Date(), service, status, message });
  if (statusHistory.length > MAX_HISTORY) {
    statusHistory.pop();
  }
}

// Database health check with auto-reconnect
async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    const latency = Date.now() - start;
    
    // Reset error counts on success
    if (healthState.database.consecutiveErrors > 0) {
      log.info("[HealthMonitor] Database connection restored");
      addToHistory('database', 'recovered', `Connection restored after ${healthState.database.consecutiveErrors} errors`);
    }
    
    return {
      status: latency > 1000 ? 'warning' : 'ok',
      message: latency > 1000 ? `Slow: ${latency}ms` : 'Connected',
      latency,
      lastCheck: new Date(),
      errorCount: healthState.database.errorCount,
      consecutiveErrors: 0,
    };
  } catch (error: any) {
    const newErrorCount = healthState.database.errorCount + 1;
    const newConsecutiveErrors = healthState.database.consecutiveErrors + 1;
    
    log.error("[HealthMonitor] Database check failed", error);
    addToHistory('database', 'error', error.message);
    
    // Attempt auto-reconnect
    if (!isReconnecting && newConsecutiveErrors >= 2) {
      attemptDatabaseReconnect();
    }
    
    return {
      status: 'error',
      message: error.message || 'Connection failed',
      lastCheck: new Date(),
      lastError: new Date(),
      errorCount: newErrorCount,
      consecutiveErrors: newConsecutiveErrors,
    };
  }
}

// Auto-reconnect database
async function attemptDatabaseReconnect() {
  if (isReconnecting) return;
  isReconnecting = true;
  
  log.warn("[HealthMonitor] Attempting database reconnection...");
  addToHistory('database', 'reconnecting', 'Auto-reconnect initiated');
  
  for (let attempt = 1; attempt <= CONFIG.dbReconnectAttempts; attempt++) {
    try {
      // End all clients and reconnect
      await pool.end();
      await new Promise(resolve => setTimeout(resolve, CONFIG.dbReconnectDelayMs));
      
      // Test connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      log.info(`[HealthMonitor] Database reconnected on attempt ${attempt}`);
      addToHistory('database', 'reconnected', `Success on attempt ${attempt}`);
      isReconnecting = false;
      return;
    } catch (error: any) {
      log.error(`[HealthMonitor] Reconnect attempt ${attempt} failed:`, error.message);
      if (attempt < CONFIG.dbReconnectAttempts) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.dbReconnectDelayMs * attempt));
      }
    }
  }
  
  log.error("[HealthMonitor] All reconnection attempts failed");
  addToHistory('database', 'reconnect_failed', `Failed after ${CONFIG.dbReconnectAttempts} attempts`);
  isReconnecting = false;
}

// Email service check
async function checkEmail(): Promise<ServiceStatus> {
  const configured = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  
  if (configured) {
    if (healthState.email.status !== 'ok') {
      addToHistory('email', 'ok', 'Configuration verified');
    }
    return {
      status: 'ok',
      message: 'Configured',
      lastCheck: new Date(),
      errorCount: 0,
      consecutiveErrors: 0,
    };
  } else {
    return {
      status: 'warning',
      message: 'Not configured',
      lastCheck: new Date(),
      errorCount: healthState.email.errorCount,
      consecutiveErrors: healthState.email.consecutiveErrors,
    };
  }
}

// Auth service check
async function checkAuth(): Promise<ServiceStatus> {
  const configured = !!(process.env.CLERK_SECRET_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY);
  
  if (configured) {
    return {
      status: 'ok',
      message: 'Configured',
      lastCheck: new Date(),
      errorCount: 0,
      consecutiveErrors: 0,
    };
  } else {
    return {
      status: 'warning',
      message: 'Not configured',
      lastCheck: new Date(),
      errorCount: healthState.auth.errorCount,
      consecutiveErrors: healthState.auth.consecutiveErrors,
    };
  }
}

// Market data API check
async function checkMarketData(): Promise<ServiceStatus> {
  const start = Date.now();
  const marketstackKey = process.env.MARKETSTACK_API_KEY;
  const twelveDataKey = process.env.TWELVE_DATA_API_KEY;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    let apiName = 'Yahoo';
    let url = 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d';
    
    if (marketstackKey) {
      apiName = 'Marketstack';
      url = `https://api.marketstack.com/v1/eod/latest?access_key=${marketstackKey}&symbols=AAPL`;
    } else if (twelveDataKey) {
      apiName = 'Twelve Data';
      url = `https://api.twelvedata.com/price?symbol=AAPL&apikey=${twelveDataKey}`;
    }
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    const latency = Date.now() - start;
    
    if (response.ok) {
      if (healthState.marketData.consecutiveErrors > 0) {
        addToHistory('marketData', 'recovered', `${apiName} connection restored`);
      }
      return {
        status: marketstackKey || twelveDataKey ? 'ok' : 'warning',
        message: apiName,
        latency,
        lastCheck: new Date(),
        errorCount: healthState.marketData.errorCount,
        consecutiveErrors: 0,
      };
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error: any) {
    const newErrorCount = healthState.marketData.errorCount + 1;
    const newConsecutiveErrors = healthState.marketData.consecutiveErrors + 1;
    
    addToHistory('marketData', 'error', error.message);
    
    return {
      status: 'error',
      message: error.name === 'AbortError' ? 'Timeout' : error.message,
      lastCheck: new Date(),
      lastError: new Date(),
      errorCount: newErrorCount,
      consecutiveErrors: newConsecutiveErrors,
    };
  }
}

// Send alert email
async function sendAlertEmail(failedServices: string[], details: string) {
  // Check cooldown
  if (healthState.lastAlertSent) {
    const timeSinceLastAlert = Date.now() - healthState.lastAlertSent.getTime();
    if (timeSinceLastAlert < CONFIG.alertCooldownMs) {
      log.info(`[HealthMonitor] Alert cooldown active, skipping email (${Math.round((CONFIG.alertCooldownMs - timeSinceLastAlert) / 1000)}s remaining)`);
      return;
    }
  }
  
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    log.warn("[HealthMonitor] Cannot send alert - email not configured");
    return;
  }
  
  const alertEmail = process.env.ALERT_EMAIL || process.env.GMAIL_USER;
  
  try {
    const { sendEmail } = await import("./gmail");
    
    const subject = `⚠️ PracticeOS Alert: ${failedServices.join(', ')} ${failedServices.length === 1 ? 'is' : 'are'} down`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">⚠️ System Health Alert</h2>
        <p style="color: #374151;">The following services are experiencing issues:</p>
        <ul style="color: #374151;">
          ${failedServices.map(s => `<li><strong>${s}</strong></li>`).join('')}
        </ul>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="color: #dc2626; margin-top: 0;">Details:</h3>
          <pre style="color: #7f1d1d; white-space: pre-wrap; font-size: 12px;">${details}</pre>
        </div>
        <p style="color: #6b7280; font-size: 12px;">
          Auto-recovery is being attempted. You will receive another alert if the issue persists.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 11px;">
          PracticeOS Health Monitor • ${new Date().toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'long' })}
        </p>
      </div>
    `;
    
    await sendEmail(alertEmail, subject, htmlBody);
    healthState.lastAlertSent = new Date();
    log.info(`[HealthMonitor] Alert email sent to ${alertEmail}`);
    addToHistory('alert', 'sent', `Email sent for: ${failedServices.join(', ')}`);
  } catch (error: any) {
    log.error("[HealthMonitor] Failed to send alert email:", error);
    addToHistory('alert', 'failed', error.message);
  }
}

// Run all health checks
async function runHealthChecks() {
  log.debug("[HealthMonitor] Running health checks...");
  
  const [dbStatus, emailStatus, authStatus, marketStatus] = await Promise.all([
    checkDatabase(),
    checkEmail(),
    checkAuth(),
    checkMarketData(),
  ]);
  
  healthState.database = dbStatus;
  healthState.email = emailStatus;
  healthState.auth = authStatus;
  healthState.marketData = marketStatus;
  
  // Determine overall status
  const hasError = [dbStatus, emailStatus, authStatus, marketStatus].some(s => s.status === 'error');
  const hasWarning = [dbStatus, emailStatus, authStatus, marketStatus].some(s => s.status === 'warning');
  healthState.overall = hasError ? 'error' : hasWarning ? 'warning' : 'ok';
  
  // Check if we need to send alerts
  const criticalFailures: string[] = [];
  const details: string[] = [];
  
  if (dbStatus.status === 'error' && dbStatus.consecutiveErrors >= CONFIG.maxConsecutiveErrors) {
    criticalFailures.push('Database');
    details.push(`Database: ${dbStatus.message} (${dbStatus.consecutiveErrors} consecutive errors)`);
  }
  
  if (authStatus.status === 'error' && authStatus.consecutiveErrors >= CONFIG.maxConsecutiveErrors) {
    criticalFailures.push('Authentication');
    details.push(`Auth: ${authStatus.message}`);
  }
  
  if (marketStatus.status === 'error' && marketStatus.consecutiveErrors >= CONFIG.maxConsecutiveErrors) {
    criticalFailures.push('Market Data');
    details.push(`Market Data: ${marketStatus.message}`);
  }
  
  if (criticalFailures.length > 0) {
    await sendAlertEmail(criticalFailures, details.join('\n'));
  }
  
  log.debug(`[HealthMonitor] Check complete - Overall: ${healthState.overall}`);
}

// Start monitoring
export function startHealthMonitor() {
  if (monitorInterval) {
    log.warn("[HealthMonitor] Monitor already running");
    return;
  }
  
  log.info("[HealthMonitor] Starting health monitor service...");
  
  // Run initial check
  runHealthChecks();
  
  // Schedule regular checks
  monitorInterval = setInterval(runHealthChecks, CONFIG.checkIntervalMs);
  
  log.info(`[HealthMonitor] Health monitor started (checking every ${CONFIG.checkIntervalMs / 1000}s)`);
}

// Stop monitoring
export function stopHealthMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    log.info("[HealthMonitor] Health monitor stopped");
  }
}

// Get current health state
export function getHealthState(): HealthState & { history: typeof statusHistory } {
  return { ...healthState, history: statusHistory.slice(0, 20) };
}

// Force a health check (for API endpoint)
export async function forceHealthCheck(): Promise<HealthState> {
  await runHealthChecks();
  return healthState;
}
