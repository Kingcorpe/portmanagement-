import { LayoutDashboard, Users, Bell, LogOut, Briefcase, BookOpen, FileText, Target, ChevronRight, ListTodo, BarChart3, Search, ShieldCheck, TrendingUp, Link as LinkIcon } from "lucide-react";
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
import { Link, useLocation } from "wouter";
import { useState } from "react";

const menuItems = [
  {
    title: "KPI's Dashboard",
    url: "/kpi-dashboard",
    icon: Target,
  },
];

const keyMetricsItems = [
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

const bottomMenuItems: Array<{ title: string; url: string; icon: React.ReactNode }> = [
  {
    title: "Reference Links",
    url: "/reference-links",
    icon: LinkIcon,
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const [keyMetricsOpen, setKeyMetricsOpen] = useState(
    location.startsWith("/key-metrics") || 
    location.startsWith("/insurance-revenue") || 
    location.startsWith("/investment-revenue")
  );
  const [libraryOpen, setLibraryOpen] = useState(location.startsWith("/library"));
  const [investmentDivisionOpen, setInvestmentDivisionOpen] = useState(
    location.startsWith("/model-portfolios") || 
    location.startsWith("/households") || 
    location.startsWith("/holdings-search") || 
    location.startsWith("/alerts") ||
    location.startsWith("/investment-division")
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
    location.startsWith("/investment-revenue");
  const isLibraryActive = location.startsWith("/library");
  const isInvestmentDivisionActive = 
    location.startsWith("/model-portfolios") || 
    location.startsWith("/households") || 
    location.startsWith("/holdings-search") || 
    location.startsWith("/alerts") ||
    location.startsWith("/investment-division");
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

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-semibold px-2 py-4">
            TradingOS
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

              {/* Dashboards with sub-items */}
              <Collapsible open={keyMetricsOpen} onOpenChange={setKeyMetricsOpen} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isKeyMetricsActive} data-testid="link-dashboards">
                      <BarChart3 />
                      <span>Dashboards</span>
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
