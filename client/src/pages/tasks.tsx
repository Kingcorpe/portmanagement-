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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Printer,
  Plus
} from "lucide-react";
import { Link } from "wouter";
import { format, isToday, isTomorrow, isThisWeek, isPast, addDays } from "date-fns";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", priority: "medium", accountId: "", dueDate: "" });

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

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", `/api/account-tasks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setDialogOpen(false);
      setFormData({ title: "", description: "", priority: "medium", accountId: "", dueDate: "" });
      toast({ title: "Task created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
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
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {overdueCount > 0 && <span className="text-red-500 font-medium">{overdueCount} overdue</span>}
            {overdueCount > 0 && pendingCount > 0 && <span className="mx-2">•</span>}
            {pendingCount > 0 && <span>{pendingCount} pending</span>}
            {completedCount > 0 && <span className="mx-2">•</span>}
            {completedCount > 0 && <span className="text-green-600">{completedCount} completed</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            data-testid="button-add-task"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/api/tasks/pdf', '_blank')}
            data-testid="button-download-pdf"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Compact Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="gap-1">
            <TabsTrigger value="pending" data-testid="tab-pending" className="text-xs">
              Pending
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed" className="text-xs">
              Completed
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all" className="text-xs">
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex gap-2 items-center">
          {categories.length > 0 && (
            <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}>
              <SelectTrigger className="w-32" data-testid="select-category-filter">
                <SelectValue />
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
          )}
          
          <div className="flex gap-1">
            <Button
              variant={groupBy === "due" ? "default" : "ghost"}
              size="sm"
              onClick={() => setGroupBy("due")}
              data-testid="button-group-by-due"
              className="text-xs"
            >
              Due
            </Button>
            <Button
              variant={groupBy === "household" ? "default" : "ghost"}
              size="sm"
              onClick={() => setGroupBy("household")}
              data-testid="button-group-by-household"
              className="text-xs"
            >
              Household
            </Button>
            <Button
              variant={groupBy === "priority" ? "default" : "ghost"}
              size="sm"
              onClick={() => setGroupBy("priority")}
              data-testid="button-group-by-priority"
              className="text-xs"
            >
              Priority
            </Button>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3 mt-4">
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
      </div>

      {/* Add Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Task title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                data-testid="input-task-title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Task description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-task-description"
              />
            </div>
            <div>
              <Label htmlFor="accountId">Account</Label>
              <Select value={formData.accountId} onValueChange={(value) => setFormData({ ...formData, accountId: value })}>
                <SelectTrigger id="accountId" data-testid="select-task-account">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.map(task => (
                    <SelectItem key={task.accountId} value={task.accountId} data-testid={`option-account-${task.accountId}`}>
                      {task.ownerName} - {task.accountNickname || task.accountTypeLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger id="priority" data-testid="select-task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date (optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                data-testid="input-task-due-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => createTaskMutation.mutate(formData)}
              disabled={!formData.title || !formData.accountId || createTaskMutation.isPending}
              data-testid="button-create-task"
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
