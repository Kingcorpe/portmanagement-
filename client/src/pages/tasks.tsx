import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ListTodo,
  Calendar,
  Users,
  Briefcase,
  Filter,
  Download,
  Printer
} from "lucide-react";
import { Link } from "wouter";
import { format, isToday, isTomorrow, isThisWeek, isPast, addDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TaskWithContext {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  accountType: "individual" | "corporate" | "joint";
  accountId: string;
  accountNickname: string | null;
  accountTypeLabel: string;
  ownerName: string;
  householdId: string;
  householdName: string;
  householdCategory?: string | null;
}

interface HouseholdBasic {
  id: string;
  name: string;
  category: string | null;
}

export default function Tasks() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "completed">("pending");
  const [groupBy, setGroupBy] = useState<"due" | "household" | "priority">("due");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["overdue", "today", "upcoming", "no-date"]));
  const [selectedCategory, setSelectedCategory] = useState<string | null>("anchor");

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

  const { data: households = [] } = useQuery<HouseholdBasic[]>({
    queryKey: ["/api/households"],
    enabled: isAuthenticated,
  });

  const { data: tasks = [], isLoading } = useQuery<TaskWithContext[]>({
    queryKey: ["/api/tasks"],
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

  // Map households to get category information
  const householdCategoryMap = households.reduce((acc, household) => {
    acc[household.id] = household.category;
    return acc;
  }, {} as Record<string, string | null>);

  // Enrich tasks with household category
  const tasksWithCategory = tasks.map(task => ({
    ...task,
    householdCategory: householdCategoryMap[task.householdId],
  }));

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("PATCH", `/api/account-tasks/${taskId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task completed" });
    },
    onError: () => {
      toast({ title: "Failed to complete task", variant: "destructive" });
    },
  });

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const handlePrintPdf = async () => {
    try {
      const response = await fetch('/api/tasks/pdf');
      if (!response.ok) {
        throw new Error('Failed to fetch PDF');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      toast({
        title: "Print failed",
        description: "Could not generate PDF for printing",
        variant: "destructive",
      });
    }
  };

  // Format category name for display (e.g., "emerging_anchor" -> "Emerging Anchor")
  const formatCategoryLabel = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get unique categories from tasks themselves (more accurate than households)
  const categories = Array.from(new Set(
    tasksWithCategory.map(t => t.householdCategory).filter(Boolean)
  )).sort() as string[];

  // Filter tasks based on active tab and category
  const filteredTasks = tasksWithCategory.filter(task => {
    if (activeTab === "pending" && task.status === "completed") return false;
    if (activeTab === "completed" && task.status !== "completed") return false;
    if (selectedCategory && task.householdCategory !== selectedCategory) return false;
    return true;
  });

  // Group tasks based on groupBy selection
  const groupTasks = (tasks: TaskWithContext[]) => {
    const groups: Record<string, { label: string; tasks: TaskWithContext[]; icon: any; color: string }> = {};

    if (groupBy === "due") {
      tasks.forEach(task => {
        let groupKey: string;
        let label: string;
        let icon = Calendar;
        let color = "";

        if (!task.dueDate) {
          groupKey = "no-date";
          label = "No Due Date";
          color = "text-muted-foreground";
        } else {
          // Parse as UTC and create local date to avoid timezone shifting
          const utcDate = new Date(task.dueDate);
          const dueDate = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
          
          if (isPast(dueDate) && !isToday(dueDate) && task.status !== "completed") {
            groupKey = "overdue";
            label = "Overdue";
            icon = AlertCircle;
            color = "text-red-500";
          } else if (isToday(dueDate)) {
            groupKey = "today";
            label = "Today";
            icon = Clock;
            color = "text-orange-500";
          } else if (isTomorrow(dueDate)) {
            groupKey = "tomorrow";
            label = "Tomorrow";
            color = "text-yellow-500";
          } else if (isThisWeek(dueDate)) {
            groupKey = "this-week";
            label = "This Week";
            color = "text-blue-500";
          } else {
            groupKey = "upcoming";
            label = "Upcoming";
            color = "text-green-500";
          }
        }

        if (!groups[groupKey]) {
          groups[groupKey] = { label, tasks: [], icon, color };
        }
        groups[groupKey].tasks.push(task);
      });

      // Sort groups in logical order
      const sortOrder = ["overdue", "today", "tomorrow", "this-week", "upcoming", "no-date"];
      const sortedGroups: typeof groups = {};
      sortOrder.forEach(key => {
        if (groups[key]) sortedGroups[key] = groups[key];
      });
      return sortedGroups;
    }

    if (groupBy === "household") {
      tasks.forEach(task => {
        const groupKey = task.householdId;
        if (!groups[groupKey]) {
          groups[groupKey] = { 
            label: task.householdName, 
            tasks: [], 
            icon: Users,
            color: "text-primary" 
          };
        }
        groups[groupKey].tasks.push(task);
      });
      return groups;
    }

    if (groupBy === "priority") {
      const priorityOrder = ["urgent", "high", "medium", "low"];
      const priorityLabels: Record<string, { label: string; color: string }> = {
        urgent: { label: "Urgent", color: "text-red-500" },
        high: { label: "High Priority", color: "text-orange-500" },
        medium: { label: "Medium Priority", color: "text-yellow-500" },
        low: { label: "Low Priority", color: "text-green-500" },
      };

      tasks.forEach(task => {
        const groupKey = task.priority;
        if (!groups[groupKey]) {
          groups[groupKey] = { 
            label: priorityLabels[groupKey].label, 
            tasks: [], 
            icon: AlertCircle,
            color: priorityLabels[groupKey].color 
          };
        }
        groups[groupKey].tasks.push(task);
      });

      const sortedGroups: typeof groups = {};
      priorityOrder.forEach(key => {
        if (groups[key]) sortedGroups[key] = groups[key];
      });
      return sortedGroups;
    }

    return groups;
  };

  const groupedTasks = groupTasks(filteredTasks);

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
    return variants[priority] || "";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const pendingCount = tasks.filter(t => t.status !== "completed").length;
  const completedCount = tasks.filter(t => t.status === "completed").length;
  const overdueCount = tasks.filter(t => {
    if (t.status === "completed" || !t.dueDate) return false;
    const utcDate = new Date(t.dueDate);
    const localDueDate = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
    return isPast(localDueDate) && !isToday(localDueDate);
  }).length;

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ListTodo className="h-8 w-8" />
            Tasks
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage tasks across all your accounts
          </p>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          {categories.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Category:</span>
              <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}>
                <SelectTrigger className="w-40" data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="option-all-categories">
                    All Categories
                  </SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat} data-testid={`option-category-${cat}`}>
                      {formatCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Group by:</span>
            <div className="flex gap-1">
              <Button
                variant={groupBy === "due" ? "default" : "outline"}
                size="sm"
                onClick={() => setGroupBy("due")}
                data-testid="button-group-by-due"
              >
                Due Date
              </Button>
              <Button
                variant={groupBy === "household" ? "default" : "outline"}
                size="sm"
                onClick={() => setGroupBy("household")}
                data-testid="button-group-by-household"
              >
                Household
              </Button>
              <Button
                variant={groupBy === "priority" ? "default" : "outline"}
                size="sm"
                onClick={() => setGroupBy("priority")}
                data-testid="button-group-by-priority"
              >
                Priority
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/api/tasks/pdf', '_blank')}
              data-testid="button-download-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintPdf}
              data-testid="button-print-pdf"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Tasks</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <Circle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className={overdueCount > 0 ? "border-red-200 dark:border-red-900" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-500" : ""}`}>
                  {overdueCount}
                </p>
              </div>
              <AlertCircle className={`h-8 w-8 ${overdueCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-500">{completedCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({completedCount})
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">
            All ({tasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading tasks...
              </CardContent>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {activeTab === "pending" 
                  ? "No pending tasks. Great job!"
                  : activeTab === "completed"
                  ? "No completed tasks yet."
                  : "No tasks found."}
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedTasks).map(([groupKey, group]) => (
              <Collapsible 
                key={groupKey} 
                open={expandedGroups.has(groupKey)}
                onOpenChange={() => toggleGroup(groupKey)}
              >
                <Card>
                  <CardHeader className="py-3">
                    <CollapsibleTrigger asChild>
                      <button 
                        className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity"
                        data-testid={`button-toggle-group-${groupKey}`}
                      >
                        <div className="flex items-center gap-2">
                          {expandedGroups.has(groupKey) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <group.icon className={`h-5 w-5 ${group.color}`} />
                          <span className={`font-medium ${group.color}`}>{group.label}</span>
                          <Badge variant="secondary" className="ml-2">
                            {group.tasks.length}
                          </Badge>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {group.tasks.map(task => (
                          <Link 
                            key={task.id}
                            href={`/account/${task.accountType}/${task.accountId}`}
                            className="block"
                          >
                            <div 
                              className="flex items-start gap-3 p-3 rounded-md border bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors cursor-pointer"
                              data-testid={`task-item-${task.id}`}
                            >
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (task.status !== "completed") {
                                    completeTaskMutation.mutate(task.id);
                                  }
                                }}
                                disabled={task.status === "completed" || completeTaskMutation.isPending}
                                className="mt-0.5 hover:scale-110 transition-transform disabled:cursor-not-allowed"
                                data-testid={`button-complete-task-${task.id}`}
                              >
                                {getStatusIcon(task.status)}
                              </button>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className={task.status === "completed" ? "line-through text-muted-foreground" : ""}>
                                    <span className="font-medium">{task.title}</span>
                                    {task.description && (
                                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant="outline" className={getPriorityBadge(task.priority)}>
                                    {task.priority}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    <span>
                                      {task.ownerName} - {task.accountNickname || task.accountTypeLabel.toUpperCase()}
                                    </span>
                                    <ExternalLink className="h-3 w-3" />
                                  </span>
                                  
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {task.householdName}
                                  </span>
                                  
                                  {task.dueDate && (
                                    (() => {
                                      const utcDate = new Date(task.dueDate);
                                      const localDueDate = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
                                      const isOverdue = task.status !== "completed" && isPast(localDueDate) && !isToday(localDueDate);
                                      const isDueToday = isToday(localDueDate);
                                      return (
                                        <span className={`flex items-center gap-1 ${
                                          isOverdue
                                            ? "text-red-500 font-medium"
                                            : isDueToday
                                            ? "text-orange-500 font-medium"
                                            : ""
                                        }`}>
                                          <Calendar className="h-3 w-3" />
                                          {format(localDueDate, "MMM d, yyyy")}
                                        </span>
                                      );
                                    })()
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
