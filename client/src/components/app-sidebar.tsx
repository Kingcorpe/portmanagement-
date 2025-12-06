import { LayoutDashboard, Users, Bell, LogOut, Briefcase, BookOpen, FileText, Target, ChevronRight, ListTodo, BarChart3, Search, ShieldCheck, TrendingUp, Link as LinkIcon, Settings, Trophy, User, Globe, Activity, BookMarked, UserPlus, Coins, ArrowUpDown, Map, Circle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

const menuItems: Array<{ title: string; url: string; icon: React.ComponentType<{ className?: string }> }> = [
  {
    title: "Prospects",
    url: "/prospects",
    icon: UserPlus,
  },
];

const keyMetricsItems = [
  {
    title: "KPI's Dashboard",
    url: "/kpi-dashboard",
    icon: Target,
  },
  {
    title: "Business Milestones",
    url: "/milestones",
    icon: Briefcase,
  },
  {
    title: "Personal Milestones",
    url: "/personal-milestones",
    icon: User,
  },
  {
    title: "Key Metrics",
    url: "/key-metrics",
    icon: BarChart3,
  },
  {
    title: "Insurance Revenue",
    url: "/insurance-revenue",
    icon: ShieldCheck,
  },
  {
    title: "Investment Revenue",
    url: "/investment-revenue",
    icon: TrendingUp,
  },
];

const investmentDivisionItems = [
  {
    title: "Overview",
    url: "/investment-division",
    icon: TrendingUp,
  },
  {
    title: "Market Dashboard",
    url: "/market",
    icon: Activity,
  },
  {
    title: "Alerts",
    url: "/alerts",
    icon: Bell,
  },
  {
    title: "Investment Tasks",
    url: "/tasks",
    icon: ListTodo,
  },
  {
    title: "DCA / DCP Plans",
    url: "/dca-dcp",
    icon: ArrowUpDown,
  },
  {
    title: "Dividend Dashboard",
    url: "/dividends",
    icon: Coins,
  },
  {
    title: "Protection Dashboard",
    url: "/protection",
    icon: ShieldCheck,
  },
  {
    title: "Households",
    url: "/households",
    icon: Users,
  },
  {
    title: "Model Portfolios",
    url: "/model-portfolios",
    icon: Briefcase,
  },
  {
    title: "Holdings Search",
    url: "/holdings-search",
    icon: Search,
  },
  {
    title: "Trading Journal",
    url: "/trading-journal",
    icon: BookMarked,
  },
];

const librarySubItems = [
  {
    title: "Example Reports",
    url: "/library/reports",
    icon: FileText,
  },
  {
    title: "Key Strategies",
    url: "/library/strategies",
    icon: Target,
  },
];

const insuranceDivisionItems = [
  {
    title: "Overview",
    url: "/insurance-division",
    icon: ShieldCheck,
  },
  {
    title: "Insurance Tasks",
    url: "/insurance-tasks",
    icon: ListTodo,
  },
  {
    title: "Insurance Revenue",
    url: "/insurance-revenue",
    icon: TrendingUp,
  },
];

const bottomMenuItems: Array<{ title: string; url: string; icon: React.ComponentType<{ className?: string }> }> = [
  {
    title: "Project Roadmap",
    url: "/roadmap",
    icon: Map,
  },
  {
    title: "Reference Links",
    url: "/reference-links",
    icon: LinkIcon,
  },
  {
    title: "Admin",
    url: "/admin",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { signOut } = useAuth();
  const [keyMetricsOpen, setKeyMetricsOpen] = useState(
    location.startsWith("/key-metrics") || 
    location.startsWith("/insurance-revenue") || 
    location.startsWith("/investment-revenue") ||
    location.startsWith("/milestones") ||
    location.startsWith("/personal-milestones")
  );
  const [libraryOpen, setLibraryOpen] = useState(location.startsWith("/library"));
  const [investmentDivisionOpen, setInvestmentDivisionOpen] = useState(
    location.startsWith("/model-portfolios") || 
    location.startsWith("/households") || 
    location.startsWith("/holdings-search") || 
    location.startsWith("/alerts") ||
    location.startsWith("/investment-division") ||
    location.startsWith("/market") ||
    location.startsWith("/trading-journal")
  );
  const [insuranceDivisionOpen, setInsuranceDivisionOpen] = useState(
    location.startsWith("/insurance-tasks") || 
    location.startsWith("/insurance-division") ||
    location.startsWith("/insurance-revenue")
  );
  const { setOpen, isMobile, setOpenMobile } = useSidebar();

  const isKeyMetricsActive = 
    location.startsWith("/key-metrics") || 
    location.startsWith("/insurance-revenue") || 
    location.startsWith("/investment-revenue") ||
    location.startsWith("/milestones") ||
    location.startsWith("/personal-milestones");
  const isLibraryActive = location.startsWith("/library");
  const isInvestmentDivisionActive = 
    location.startsWith("/model-portfolios") || 
    location.startsWith("/households") || 
    location.startsWith("/holdings-search") || 
    location.startsWith("/alerts") ||
    location.startsWith("/investment-division") ||
    location.startsWith("/market") ||
    location.startsWith("/trading-journal");
  const isInsuranceDivisionActive = 
    location.startsWith("/insurance-tasks") || 
    location.startsWith("/insurance-division") ||
    location.startsWith("/insurance-revenue");

  const closeSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  const handleNavigation = (url: string, shouldClose: boolean = false) => {
    setLocation(url);
    if (shouldClose) {
      closeSidebar();
    }
  };

  const handleLogout = async () => {
    await signOut();
    // After Clerk signs out, redirect to home page
    window.location.href = "/";
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold px-2 py-4">
            PracticeOS
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    isActive={location === item.url} 
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => handleNavigation(item.url, true)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Analytics with sub-items */}
              <Collapsible open={keyMetricsOpen} onOpenChange={setKeyMetricsOpen} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isKeyMetricsActive} data-testid="link-analytics">
                      <BarChart3 />
                      <span>Analytics</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {keyMetricsItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton 
                            isActive={location === item.url} 
                            data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                            onClick={() => handleNavigation(item.url, true)}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Investment Division with sub-items */}
              <Collapsible open={investmentDivisionOpen} onOpenChange={setInvestmentDivisionOpen} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isInvestmentDivisionActive} data-testid="link-investment-division">
                      <TrendingUp />
                      <span>Investment Division</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {investmentDivisionItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton 
                            isActive={location === subItem.url} 
                            data-testid={`link-${subItem.title.toLowerCase().replace(/\s+/g, '-')}`}
                            onClick={() => handleNavigation(subItem.url, true)}
                          >
                            <subItem.icon className="h-4 w-4" />
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Insurance Division with sub-items */}
              <Collapsible open={insuranceDivisionOpen} onOpenChange={setInsuranceDivisionOpen} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isInsuranceDivisionActive} data-testid="link-insurance-division">
                      <ShieldCheck />
                      <span>Insurance Division</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {insuranceDivisionItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton 
                            isActive={location === subItem.url} 
                            data-testid={`link-${subItem.title.toLowerCase().replace(/\s+/g, '-')}`}
                            onClick={() => handleNavigation(subItem.url, true)}
                          >
                            <subItem.icon className="h-4 w-4" />
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Library with sub-items */}
              <Collapsible open={libraryOpen} onOpenChange={setLibraryOpen} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isLibraryActive} data-testid="link-library">
                      <BookOpen />
                      <span>Library</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {librarySubItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton 
                            isActive={location === subItem.url} 
                            data-testid={`link-${subItem.title.toLowerCase().replace(/\s+/g, '-')}`}
                            onClick={() => handleNavigation(subItem.url, true)}
                          >
                            <subItem.icon className="h-4 w-4" />
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Bottom menu items (Alerts) */}
              {bottomMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    isActive={location === item.url} 
                    data-testid={`link-${item.title.toLowerCase()}`}
                    onClick={() => handleNavigation(item.url, true)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <DeployStatus />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton data-testid="button-logout" onClick={handleLogout}>
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// Deploy status indicator component
function DeployStatus() {
  const { data: version, isLoading, error } = useQuery({
    queryKey: ["/api/version"],
    queryFn: async () => {
      const res = await fetch("/api/version");
      if (!res.ok) throw new Error("Failed to fetch version");
      return res.json();
    },
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 10000,
  });

  const [lastSeenCommit, setLastSeenCommit] = useState<string | null>(null);
  const [isNewDeploy, setIsNewDeploy] = useState(false);

  useEffect(() => {
    if (version?.commit) {
      const stored = localStorage.getItem("lastSeenCommit");
      if (stored && stored !== version.commit) {
        setIsNewDeploy(true);
        // Flash for 10 seconds then save
        setTimeout(() => {
          localStorage.setItem("lastSeenCommit", version.commit);
          setIsNewDeploy(false);
        }, 10000);
      } else if (!stored) {
        localStorage.setItem("lastSeenCommit", version.commit);
      }
      setLastSeenCommit(version.commit);
    }
  }, [version?.commit]);

  if (isLoading || error) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
        <Circle className="h-2 w-2 fill-muted-foreground text-muted-foreground" />
        <span>Checking...</span>
      </div>
    );
  }

  const deployTime = version?.deployedAt ? new Date(version.deployedAt) : null;
  const timeAgo = deployTime ? getTimeAgo(deployTime) : "unknown";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2 cursor-help hover:text-foreground transition-colors">
            <Circle 
              className={`h-2 w-2 ${
                isNewDeploy 
                  ? "fill-yellow-500 text-yellow-500 animate-pulse" 
                  : "fill-green-500 text-green-500"
              }`} 
            />
            <span className={isNewDeploy ? "text-yellow-600 dark:text-yellow-400 font-medium" : ""}>
              {isNewDeploy ? "New Deploy!" : `v${version?.commit}`}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p><strong>Deployed:</strong> {timeAgo}</p>
            <p><strong>Commit:</strong> {version?.commit}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{version?.message}</p>
            <p><strong>Uptime:</strong> {version?.uptime}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
