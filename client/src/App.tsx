import { Switch, Route, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeSelector } from "@/components/theme-selector";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Households from "@/pages/households";
import ModelPortfolios from "@/pages/model-portfolios";
import Tasks from "@/pages/tasks";
import Alerts from "@/pages/alerts";
import AccountDetails from "@/pages/account-details";
import LibraryReports from "@/pages/library-reports";
import LibraryStrategies from "@/pages/library-strategies";
import KeyMetrics from "@/pages/key-metrics";
import HoldingsSearch from "@/pages/holdings-search";
import AdminDividends from "@/pages/admin-dividends";
import InsuranceRevenue from "@/pages/insurance-revenue";
import InvestmentRevenue from "@/pages/investment-revenue";
import ReferenceLinks from "@/pages/reference-links";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/households" component={Households} />
      <Route path="/model-portfolios" component={ModelPortfolios} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/holdings-search" component={HoldingsSearch} />
      <Route path="/admin/dividends" component={AdminDividends} />
      <Route path="/account/:accountType/:accountId" component={AccountDetails} />
      <Route path="/library/reports" component={LibraryReports} />
      <Route path="/library/strategies" component={LibraryStrategies} />
      <Route path="/key-metrics" component={KeyMetrics} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/insurance-revenue" component={InsuranceRevenue} />
      <Route path="/investment-revenue" component={InvestmentRevenue} />
      <Route path="/reference-links" component={ReferenceLinks} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return <AuthenticatedRoutes />;
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useTheme(); // Initialize theme system
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Close sidebar when navigating to account pages
  useEffect(() => {
    const isAccountPage = location.startsWith('/account/');
    if (isAccountPage) {
      setSidebarOpen(false);
    }
  }, [location]);

  if (isLoading || !isAuthenticated) {
    return (
      <>
        <Router />
        <Toaster />
      </>
    );
  }

  return (
    <SidebarProvider style={style as React.CSSProperties} open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeSelector />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Router />
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
