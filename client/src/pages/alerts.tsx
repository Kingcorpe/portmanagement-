import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCard, Alert } from "@/components/alert-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import type { Alert as AlertType } from "@shared/schema";

export default function Alerts() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch all alerts
  const { data: alertsData = [], isLoading } = useQuery<AlertType[]>({
    queryKey: ["/api/alerts"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return false;
      }
      return failureCount < 3;
    },
  });

  // Update alert mutation
  const updateAlertMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "executed" | "dismissed" }) => {
      await apiRequest("PATCH", `/api/alerts/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update alert",
        variant: "destructive",
      });
    },
  });

  // Dismiss all alerts mutation
  const dismissAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/alerts/dismiss-all");
    },
    onSuccess: (_, __, context) => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: "All alerts dismissed",
        description: "All pending alerts have been dismissed",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to dismiss alerts",
        variant: "destructive",
      });
    },
  });

  // Transform backend alerts to component format
  const alerts: Alert[] = alertsData.map(a => ({
    id: a.id,
    symbol: a.symbol,
    signal: a.signal,
    price: parseFloat(a.price),
    timestamp: new Date(a.createdAt!).toLocaleString(),
    message: a.message || "",
    status: a.status
  }));

  const handleExecuteAlert = (id: string) => {
    updateAlertMutation.mutate({ id, status: "executed" });
  };

  const handleDismissAlert = (id: string) => {
    updateAlertMutation.mutate({ id, status: "dismissed" });
  };

  const pendingAlerts = alerts.filter(a => a.status === "pending");
  const executedAlerts = alerts.filter(a => a.status === "executed");
  const dismissedAlerts = alerts.filter(a => a.status === "dismissed");

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-lg">Loading alerts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-alerts-title">TradingView Alerts</h1>
        <p className="text-muted-foreground">Manage incoming trading signals</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-alert-filter">
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="executed" data-testid="tab-executed">
            Executed ({executedAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="dismissed" data-testid="tab-dismissed">
            Dismissed ({dismissedAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingAlerts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-pending-alerts">
              No pending alerts
            </p>
          ) : (
            <>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dismissAllMutation.mutate()}
                  disabled={dismissAllMutation.isPending}
                  data-testid="button-dismiss-all"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {dismissAllMutation.isPending ? "Dismissing..." : "Dismiss All"}
                </Button>
              </div>
              {pendingAlerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onExecute={handleExecuteAlert}
                  onDismiss={handleDismissAlert}
                />
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="executed" className="space-y-4 mt-6">
          {executedAlerts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-executed-alerts">
              No executed alerts
            </p>
          ) : (
            executedAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onExecute={handleExecuteAlert}
                onDismiss={handleDismissAlert}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="dismissed" className="space-y-4 mt-6">
          {dismissedAlerts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-dismissed-alerts">
              No dismissed alerts
            </p>
          ) : (
            dismissedAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onExecute={handleExecuteAlert}
                onDismiss={handleDismissAlert}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
