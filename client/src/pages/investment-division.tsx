import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, AlertCircle, ListTodo, Users, Briefcase, Search } from "lucide-react";
import { useEffect } from "react";

export default function InvestmentDivision() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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
    }
  }, [isAuthenticated, authLoading, toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Investment Division
          </h1>
          <p className="text-muted-foreground mt-2">
            Overview of your investment portfolio management activities
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover-elevate cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Alerts
            </CardTitle>
            <CardDescription>Trading signals and rebalancing opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">—</p>
            <p className="text-sm text-muted-foreground mt-2">Active alerts from TradingView</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Investment Tasks
            </CardTitle>
            <CardDescription>Action items and follow-ups</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">—</p>
            <p className="text-sm text-muted-foreground mt-2">Pending investment tasks</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Households
            </CardTitle>
            <CardDescription>Client portfolio overview</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">—</p>
            <p className="text-sm text-muted-foreground mt-2">Active households</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Model Portfolios
            </CardTitle>
            <CardDescription>Template allocations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">—</p>
            <p className="text-sm text-muted-foreground mt-2">Portfolio models</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Holdings Search
            </CardTitle>
            <CardDescription>Find holdings across accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">—</p>
            <p className="text-sm text-muted-foreground mt-2">Search all holdings</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
