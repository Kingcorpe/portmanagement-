import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MetricCard } from "@/components/metric-card";
import { AlertCard, Alert } from "@/components/alert-card";
import { PositionsTable, Position } from "@/components/positions-table";
import { Button } from "@/components/ui/button";
import { Users, Bell, Upload, UserPlus, Briefcase, BookOpen, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import type { Household, Alert as AlertType } from "@shared/schema";

export default function Dashboard() {
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

  // Fetch households for metrics
  const { data: households, isLoading: householdsLoading } = useQuery<Household[]>({
    queryKey: ["/api/households"],
    enabled: isAuthenticated,
  });

  // Fetch alerts
  const { data: alerts = [], isLoading: alertsLoading } = useQuery<AlertType[]>({
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

  // Calculate metrics from real data
  const totalHouseholds = households?.length || 0;
  const pendingAlerts = alerts.filter(a => a.status === "pending").length;

  const positions: Position[] = [];

  // Convert backend alerts to component format
  const recentAlerts: Alert[] = alerts
    .filter(a => a.status === "pending")
    .slice(0, 3)
    .map(a => ({
      id: a.id,
      symbol: a.symbol,
      signal: a.signal,
      price: parseFloat(a.price),
      timestamp: new Date(a.createdAt!).toLocaleString(),
      message: a.message || "",
      status: a.status
    }));

  // Alert update mutation
  const updateAlertMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "executed" | "dismissed" }) => {
      await apiRequest("PATCH", `/api/alerts/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: "Alert Updated",
        description: "Alert status has been updated.",
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
        description: "Failed to update alert",
        variant: "destructive",
      });
    },
  });

  const handleExecuteAlert = (id: string) => {
    updateAlertMutation.mutate({ id, status: "executed" });
  };

  const handleDismissAlert = (id: string) => {
    updateAlertMutation.mutate({ id, status: "dismissed" });
  };

  if (authLoading || householdsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your portfolio management</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Households"
          value={totalHouseholds.toString()}
          icon={Users}
          testId="card-households"
          href="/households"
        />
        <MetricCard
          title="Pending Alerts"
          value={pendingAlerts.toString()}
          icon={Bell}
          testId="card-pending-alerts"
        />
      </div>

      <Card data-testid="card-quick-actions">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <Button variant="outline" className="justify-start gap-2 h-auto py-3" data-testid="button-import-holdings">
              <Upload className="h-4 w-4" />
              <span>Import Holdings</span>
            </Button>
            <Link href="/households">
              <Button variant="outline" className="justify-start gap-2 h-auto py-3 w-full" data-testid="button-add-household">
                <UserPlus className="h-4 w-4" />
                <span>Add Household</span>
              </Button>
            </Link>
            <Link href="/tasks">
              <Button variant="outline" className="justify-start gap-2 h-auto py-3 w-full" data-testid="button-view-tasks">
                <ListTodo className="h-4 w-4" />
                <span>View Tasks</span>
              </Button>
            </Link>
            <Link href="/model-portfolios">
              <Button variant="outline" className="justify-start gap-2 h-auto py-3 w-full" data-testid="button-model-portfolios">
                <Briefcase className="h-4 w-4" />
                <span>Model Portfolios</span>
              </Button>
            </Link>
            <Link href="/library/reports">
              <Button variant="outline" className="justify-start gap-2 h-auto py-3 w-full" data-testid="button-library">
                <BookOpen className="h-4 w-4" />
                <span>Library</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-recent-alerts">
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending alerts</p>
          ) : (
            recentAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onExecute={handleExecuteAlert}
                onDismiss={handleDismissAlert}
              />
            ))
          )}
        </CardContent>
      </Card>

      {positions.length > 0 && (
        <PositionsTable positions={positions} />
      )}
    </div>
  );
}
