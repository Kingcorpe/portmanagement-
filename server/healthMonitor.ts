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
  consecutiveErrors: number;
}

interface Alert {
  id: string;
  service: string;
  severity: 'error' | 'warning';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface HealthState {
  services: {
    database: ServiceStatus;
    email: ServiceStatus;
    auth: ServiceStatus;
    marketData: ServiceStatus;
  };
  activeAlerts: Alert[];
  lastAlertEmailSent?: Date;
}

// Configuration
const CONFIG = {
  checkIntervalMs: 30000, // Check every 30 seconds
  alertCooldownMs: 5 * 60 * 1000, // Don't send more than 1 email per 5 minutes
  maxConsecutiveErrors: 3, // Send alert after 3 consecutive errors
  dbReconnectAttempts: 5,
  dbReconnectDelayMs: 2000,
};

// State
const healthState: HealthState = {
  services: {
    database: { status: 'ok', lastCheck: new Date(), consecutiveErrors: 0 },
    email: { status: 'ok', lastCheck: new Date(), consecutiveErrors: 0 },
    auth: { status: 'ok', lastCheck: new Date(), consecutiveErrors: 0 },
    marketData: { status: 'ok', lastCheck: new Date(), consecutiveErrors: 0 },
  },
  activeAlerts: [],
};

let monitorInterval: NodeJS.Timeout | null = null;
let isReconnecting = false;

// Generate unique alert ID
function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Add or update alert
function addAlert(service: string, severity: 'error' | 'warning', message: string) {
  // Check if similar alert already exists
  const existingIndex = healthState.activeAlerts.findIndex(
    a => a.service === service && !a.acknowledged
  );
  
  if (existingIndex >= 0) {
    // Update existing alert
    healthState.activeAlerts[existingIndex].message = message;
    healthState.activeAlerts[existingIndex].timestamp = new Date();
    healthState.activeAlerts[existingIndex].severity = severity;
  } else {
    // Add new alert
    healthState.activeAlerts.push({
      id: generateAlertId(),
      service,
      severity,
      message,
      timestamp: new Date(),
      acknowledged: false,
    });
  }
}

// Clear alert for a service
function clearAlert(service: string) {
  healthState.activeAlerts = healthState.activeAlerts.filter(
    a => a.service !== service || a.acknowledged
  );
}

// Acknowledge an alert
export function acknowledgeAlert(alertId: string): boolean {
  const alert = healthState.activeAlerts.find(a => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    return true;
  }
  return false;
}

// Database health check with auto-reconnect
async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    const latency = Date.now() - start;
    
    // Clear any database alerts on success
    if (healthState.services.database.consecutiveErrors > 0) {
      log.info("[HealthMonitor] Database connection restored");
      clearAlert('database');
    }
    
    return {
      status: latency > 1000 ? 'warning' : 'ok',
      message: latency > 1000 ? `Slow: ${latency}ms` : 'Connected',
      latency,
      lastCheck: new Date(),
      consecutiveErrors: 0,
    };
  } catch (error: any) {
    const newConsecutiveErrors = healthState.services.database.consecutiveErrors + 1;
    
    log.error("[HealthMonitor] Database check failed", error);
    
    // Add alert after threshold
    if (newConsecutiveErrors >= CONFIG.maxConsecutiveErrors) {
      addAlert('database', 'error', `Database connection failed: ${error.message}`);
    }
    
    // Attempt auto-reconnect
    if (!isReconnecting && newConsecutiveErrors >= 2) {
      attemptDatabaseReconnect();
    }
    
    return {
      status: 'error',
      message: error.message || 'Connection failed',
      lastCheck: new Date(),
      consecutiveErrors: newConsecutiveErrors,
    };
  }
}

// Auto-reconnect database
async function attemptDatabaseReconnect() {
  if (isReconnecting) return;
  isReconnecting = true;
  
  log.warn("[HealthMonitor] Attempting database reconnection...");
  
  for (let attempt = 1; attempt <= CONFIG.dbReconnectAttempts; attempt++) {
    try {
      // Test connection with a new query
      await new Promise(resolve => setTimeout(resolve, CONFIG.dbReconnectDelayMs));
      await db.execute(sql`SELECT 1`);
      
      log.info(`[HealthMonitor] Database reconnected on attempt ${attempt}`);
      clearAlert('database');
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
  isReconnecting = false;
}

// Email service check
function checkEmail(): ServiceStatus {
  const configured = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  
  if (configured) {
    clearAlert('email');
    return {
      status: 'ok',
      message: 'Configured',
      lastCheck: new Date(),
      consecutiveErrors: 0,
    };
  } else {
    return {
      status: 'warning',
      message: 'Not configured',
      lastCheck: new Date(),
      consecutiveErrors: 0,
    };
  }
}

// Auth service check
function checkAuth(): ServiceStatus {
  const configured = !!(process.env.CLERK_SECRET_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY);
  
  if (configured) {
    clearAlert('auth');
    return {
      status: 'ok',
      message: 'Configured',
      lastCheck: new Date(),
      consecutiveErrors: 0,
    };
  } else {
    return {
      status: 'warning',
      message: 'Not configured',
      lastCheck: new Date(),
      consecutiveErrors: 0,
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
      // Clear any market data alerts on success
      if (healthState.services.marketData.consecutiveErrors > 0) {
        clearAlert('marketData');
      }
      
      return {
        status: marketstackKey || twelveDataKey ? 'ok' : 'warning',
        message: apiName,
        latency,
        lastCheck: new Date(),
        consecutiveErrors: 0,
      };
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error: any) {
    const newConsecutiveErrors = healthState.services.marketData.consecutiveErrors + 1;
    
    if (newConsecutiveErrors >= CONFIG.maxConsecutiveErrors) {
      addAlert('marketData', 'error', `Market data API failed: ${error.message}`);
    }
    
    return {
      status: 'error',
      message: error.name === 'AbortError' ? 'Timeout' : error.message,
      lastCheck: new Date(),
      consecutiveErrors: newConsecutiveErrors,
    };
  }
}

// Send alert email
async function sendAlertEmail() {
  // Check cooldown
  if (healthState.lastAlertEmailSent) {
    const timeSinceLastAlert = Date.now() - healthState.lastAlertEmailSent.getTime();
    if (timeSinceLastAlert < CONFIG.alertCooldownMs) {
      log.debug(`[HealthMonitor] Alert cooldown active, skipping email`);
      return;
    }
  }
  
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    log.warn("[HealthMonitor] Cannot send alert - email not configured");
    return;
  }
  
  const unacknowledgedErrors = healthState.activeAlerts.filter(
    a => !a.acknowledged && a.severity === 'error'
  );
  
  if (unacknowledgedErrors.length === 0) return;
  
  const alertEmail = process.env.ALERT_EMAIL || process.env.GMAIL_USER;
  
  try {
    const { sendEmail } = await import("./gmail");
    
    const failedServices = unacknowledgedErrors.map(a => a.service);
    const subject = `⚠️ PracticeOS Alert: ${failedServices.join(', ')} ${failedServices.length === 1 ? 'is' : 'are'} down`;
    
    const alertRows = unacknowledgedErrors.map(a => 
      `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${a.service}</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">${a.message}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${a.timestamp.toLocaleString()}</td>
      </tr>`
    ).join('');
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #dc2626; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">⚠️ System Health Alert</h2>
        </div>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-top: none; border-radius: 0 0 8px 8px; padding: 20px;">
          <p style="color: #374151; margin-top: 0;">The following services are experiencing issues:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background: #fee2e2;">
                <th style="padding: 8px; text-align: left;">Service</th>
                <th style="padding: 8px; text-align: left;">Issue</th>
                <th style="padding: 8px; text-align: left;">Time</th>
              </tr>
            </thead>
            <tbody>
              ${alertRows}
            </tbody>
          </table>
          <p style="color: #6b7280; font-size: 13px; margin-bottom: 0;">
            🔄 Auto-recovery is being attempted. You will receive another alert if issues persist after 5 minutes.
          </p>
        </div>
        <p style="color: #9ca3af; font-size: 11px; margin-top: 15px; text-align: center;">
          PracticeOS Health Monitor • ${new Date().toLocaleString('en-CA', { dateStyle: 'full', timeStyle: 'long' })}
        </p>
      </div>
    `;
    
    await sendEmail(alertEmail, subject, htmlBody);
    healthState.lastAlertEmailSent = new Date();
    log.info(`[HealthMonitor] Alert email sent to ${alertEmail}`);
  } catch (error: any) {
    log.error("[HealthMonitor] Failed to send alert email:", error);
  }
}

// Run all health checks
async function runHealthChecks() {
  log.debug("[HealthMonitor] Running health checks...");
  
  const [dbStatus, marketStatus] = await Promise.all([
    checkDatabase(),
    checkMarketData(),
  ]);
  
  const emailStatus = checkEmail();
  const authStatus = checkAuth();
  
  healthState.services.database = dbStatus;
  healthState.services.email = emailStatus;
  healthState.services.auth = authStatus;
  healthState.services.marketData = marketStatus;
  
  // Send email if there are unacknowledged error alerts
  const hasUnacknowledgedErrors = healthState.activeAlerts.some(
    a => !a.acknowledged && a.severity === 'error'
  );
  
  if (hasUnacknowledgedErrors) {
    await sendAlertEmail();
  }
  
  log.debug(`[HealthMonitor] Check complete - ${healthState.activeAlerts.length} active alerts`);
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
export function getHealthState(): HealthState {
  return healthState;
}
