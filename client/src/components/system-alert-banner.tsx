// System Alert Banner - Shows warnings when services are unhealthy
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, X, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

interface Alert {
  id: string;
  service: string;
  severity: 'error' | 'warning';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface AlertsResponse {
  alerts: Alert[];
  count: number;
  hasErrors: boolean;
  hasWarnings: boolean;
}

export function SystemAlertBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: alertsData, isLoading } = useQuery<AlertsResponse>({
    queryKey: ["/api/health/alerts"],
    queryFn: async () => {
      const res = await fetch("/api/health/alerts");
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
    refetchInterval: 15000, // Check every 15 seconds
    staleTime: 5000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const res = await fetch(`/api/health/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error("Failed to acknowledge");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/health"] });
    },
  });

  // Filter out acknowledged and dismissed alerts
  const activeAlerts = alertsData?.alerts?.filter(
    a => !a.acknowledged && !dismissed.has(a.id)
  ) || [];

  const errorAlerts = activeAlerts.filter(a => a.severity === 'error');
  const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');

  // Play sound on new error alert
  useEffect(() => {
    if (errorAlerts.length > 0) {
      // Could add sound notification here
    }
  }, [errorAlerts.length]);

  // Don't show if no alerts
  if (isLoading || activeAlerts.length === 0) {
    return null;
  }

  const handleDismiss = (alertId: string) => {
    setDismissed(prev => new Set([...prev, alertId]));
  };

  const handleAcknowledge = (alertId: string) => {
    acknowledgeMutation.mutate(alertId);
  };

  const isError = errorAlerts.length > 0;
  const primaryAlert = errorAlerts[0] || warningAlerts[0];

  const formatService = (service: string) => {
    const names: Record<string, string> = {
      database: 'Database',
      email: 'Email Service',
      auth: 'Authentication',
      marketData: 'Market Data',
    };
    return names[service] || service;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 ${
        isError
          ? 'bg-red-600 dark:bg-red-700'
          : 'bg-yellow-500 dark:bg-yellow-600'
      } text-white shadow-lg`}
    >
      {/* Main banner row */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {isError ? 'System Error' : 'System Warning'}:
            </span>
            <span>
              {formatService(primaryAlert.service)} - {primaryAlert.message}
            </span>
            {activeAlerts.length > 1 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="ml-2 text-sm underline opacity-80 hover:opacity-100"
              >
                {isExpanded ? 'Show less' : `+${activeAlerts.length - 1} more`}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-white hover:bg-white/20"
            onClick={() => handleAcknowledge(primaryAlert.id)}
            disabled={acknowledgeMutation.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Acknowledge
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-white hover:bg-white/20"
            onClick={() => handleDismiss(primaryAlert.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expanded view showing all alerts */}
      {isExpanded && activeAlerts.length > 1 && (
        <div className="border-t border-white/20 px-4 py-2 space-y-1">
          {activeAlerts.slice(1).map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between py-1 text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    alert.severity === 'error' ? 'bg-white' : 'bg-white/70'
                  }`}
                />
                <span className="font-medium">{formatService(alert.service)}</span>
                <span className="opacity-80">- {alert.message}</span>
                <span className="opacity-60 text-xs ml-2">
                  {formatTime(alert.timestamp)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs text-white hover:bg-white/20"
                  onClick={() => handleAcknowledge(alert.id)}
                  disabled={acknowledgeMutation.isPending}
                >
                  Acknowledge
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1 text-white hover:bg-white/20"
                  onClick={() => handleDismiss(alert.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Auto-recovery indicator */}
      <div className="flex items-center justify-center gap-2 py-1 text-xs bg-black/10">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Auto-recovery in progress • Monitoring every 30 seconds</span>
      </div>
    </div>
  );
}
