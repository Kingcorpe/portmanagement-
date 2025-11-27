import { LayoutDashboard, Users, Bell, Settings, LogOut, Briefcase, BookOpen, FileText, Target, ChevronRight } from "lucide-react";
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
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
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

const bottomMenuItems = [
  {
    title: "Alerts",
    url: "/alerts",
    icon: Bell,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const [libraryOpen, setLibraryOpen] = useState(location.startsWith("/library"));
  const { setOpen, isMobile, setOpenMobile } = useSidebar();

  const isLibraryActive = location.startsWith("/library");

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
            Portfolio Manager
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const shouldClose = item.url === "/households" || item.url === "/model-portfolios";
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      isActive={location === item.url} 
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => handleNavigation(item.url, shouldClose)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

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

              {/* Bottom menu items (Alerts, Trades, Settings) */}
              {bottomMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
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
