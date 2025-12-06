// System Alert Banner - Shows when services are unhealthy
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, XCircle, X, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

interface Alert {
  id: string;
  service: string;
  severity: 'warning' | 'error';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface HealthAlerts {
  alerts: Alert[];
  count: number;
  hasErrors: boolean;
  hasWarnings: boolean;
}

export function SystemAlertBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isMinimized, setIsMinimized] = useState(false);

  const { data: alertData, refetch } = useQuery<HealthAlerts>({
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
      if (!res.ok) throw new Error("Failed to acknowledge alert");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health/alerts"] });
    },
  });

  // Filter out dismissed alerts
  const activeAlerts = alertData?.alerts.filter(
    a => !dismissed.has(a.id) && !a.acknowledged
  ) || [];

  const errorAlerts = activeAlerts.filter(a => a.severity === 'error');
  const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');

  // Reset dismissed state when new alerts come in
  useEffect(() => {
    if (alertData?.alerts) {
      const currentIds = new Set(alertData.alerts.map(a => a.id));
      setDismissed(prev => {
        const newDismissed = new Set<string>();
        prev.forEach(id => {
          if (currentIds.has(id)) {
            newDismissed.add(id);
          }
        });
        return newDismissed;
      });
    }
  }, [alertData?.alerts]);

  // Don't render if no active alerts
  if (activeAlerts.length === 0) {
    return null;
  }

  const handleDismiss = (alertId: string) => {
    setDismissed(prev => new Set(prev).add(alertId));
    acknowledgeMutation.mutate(alertId);
  };

  const handleDismissAll = () => {
    activeAlerts.forEach(alert => {
      setDismissed(prev => new Set(prev).add(alert.id));
      acknowledgeMutation.mutate(alert.id);
    });
  };

  const isError = errorAlerts.length > 0;
  const bgColor = isError 
    ? "bg-red-600 dark:bg-red-900" 
    : "bg-yellow-500 dark:bg-yellow-700";
  const textColor = isError 
    ? "text-white" 
    : "text-yellow-950 dark:text-yellow-100";

  if (isMinimized) {
    return (
      <div 
        className={`${bgColor} ${textColor} px-4 py-1 flex items-center justify-between cursor-pointer`}
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-2">
          {isError ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {activeAlerts.length} system {activeAlerts.length === 1 ? 'alert' : 'alerts'} - Click to expand
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bgColor} ${textColor} px-4 py-3`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {isError ? (
              <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                {isError ? 'System Error Detected' : 'System Warning'}
              </p>
              <div className="mt-1 space-y-1">
                {errorAlerts.map(alert => (
                  <div key={alert.id} className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{formatServiceName(alert.service)}:</span>
                    <span>{alert.message}</span>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="ml-2 opacity-70 hover:opacity-100"
                      title="Dismiss this alert"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {warningAlerts.map(alert => (
                  <div key={alert.id} className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{formatServiceName(alert.service)}:</span>
                    <span>{alert.message}</span>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="ml-2 opacity-70 hover:opacity-100"
                      title="Dismiss this alert"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-2 opacity-80">
                Auto-recovery is being attempted. You'll be notified when resolved.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className={`${textColor} hover:bg-white/20`}
              title="Refresh status"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissAll}
              className={`${textColor} hover:bg-white/20`}
              title="Dismiss all alerts"
            >
              Dismiss All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className={`${textColor} hover:bg-white/20`}
              title="Minimize"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatServiceName(service: string): string {
  const names: Record<string, string> = {
    database: 'Database',
    email: 'Email Service',
    auth: 'Authentication',
    marketData: 'Market Data',
  };
  return names[service] || service;
}

