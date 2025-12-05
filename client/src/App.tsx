import { Switch, Route, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeSelector } from "@/components/theme-selector";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const pageTransition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.2
};

// Animated page wrapper component
function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
import Dashboard from "@/pages/dashboard";
import Households from "@/pages/households";
import ModelPortfolios from "@/pages/model-portfolios";
import Tasks from "@/pages/tasks";
import InsuranceTasks from "@/pages/insurance-tasks";
import InsuranceDivisionPage from "@/pages/insurance-division";
import InvestmentDivisionPage from "@/pages/investment-division";
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
import BusinessMilestones from "@/pages/milestones";
import PersonalMilestones from "@/pages/personal-milestones";
import KpiDashboard from "@/pages/kpi-dashboard";
import MarketDashboard from "@/pages/market-dashboard";
import TradingJournal from "@/pages/trading-journal";
import ProtectionDashboard from "@/pages/protection-dashboard";
import Admin from "@/pages/admin";
import Prospects from "@/pages/prospects";
import ProspectIntake from "@/pages/prospect-intake";
import DividendDashboard from "@/pages/dividend-dashboard";
import DcaDcp from "@/pages/dca-dcp";
import Roadmap from "@/pages/roadmap";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

function AuthenticatedRoutes() {
  const [location] = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <AnimatedPage key={location}>
        <Switch location={location}>
          <Route path="/" component={KpiDashboard} />
          <Route path="/households" component={Households} />
          <Route path="/model-portfolios" component={ModelPortfolios} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/insurance-tasks" component={InsuranceTasks} />
          <Route path="/investment-division" component={InvestmentDivisionPage} />
          <Route path="/insurance-division" component={InsuranceDivisionPage} />
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
          <Route path="/milestones" component={BusinessMilestones} />
          <Route path="/personal-milestones" component={PersonalMilestones} />
          <Route path="/kpi" component={KpiDashboard} />
          <Route path="/kpi-dashboard" component={KpiDashboard} />
          <Route path="/market" component={MarketDashboard} />
          <Route path="/trading-journal" component={TradingJournal} />
          <Route path="/protection" component={ProtectionDashboard} />
          <Route path="/admin" component={Admin} />
          <Route path="/prospects" component={Prospects} />
          <Route path="/dividends" component={DividendDashboard} />
          <Route path="/dca-dcp" component={DcaDcp} />
          <Route path="/roadmap" component={Roadmap} />
          <Route component={NotFound} />
        </Switch>
      </AnimatedPage>
    </AnimatePresence>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  // Public intake form - accessible without authentication
  if (location === "/intake") {
    return <ProspectIntake />;
  }

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
  useTheme();
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

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
