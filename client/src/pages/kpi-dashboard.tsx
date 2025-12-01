import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Trash2, Plus, User, Briefcase, Pencil, CalendarDays, X } from "lucide-react";
import { format, addMonths, getDaysInMonth, isWeekend, startOfMonth, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { KpiObjective, KpiDailyTask } from "@shared/schema";

// Get business days (Mon-Fri) for a given month in YYYY-MM format
function getBusinessDaysInMonth(monthStr: string): number[] {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const daysInMonth = getDaysInMonth(date);
  const businessDays: number[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day);
    if (!isWeekend(currentDate)) {
      businessDays.push(day);
    }
  }
  return businessDays;
}

// Get today's business day number for a given month
function getTodaysBusinessDayInMonth(monthStr: string): number | null {
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  
  const [trackYear, trackMonth] = monthStr.split("-").map(Number);
  
  // Only return a business day if we're in the same month/year
  if (todayYear !== trackYear || todayMonth !== trackMonth) {
    return null;
  }
  
  // If today is a weekend, no business day is available
  if (isWeekend(today)) {
    return null;
  }
  
  // Calculate which business day today is
  const businessDays = getBusinessDaysInMonth(monthStr);
  const todayDate = today.getDate();
  
  const businessDayIndex = businessDays.indexOf(todayDate);
  return businessDayIndex !== -1 ? businessDays[businessDayIndex] : null;
}

function getNext12Months() {
  const months = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const date = addMonths(today, i);
    months.push({
      month: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    });
  }
  return months;
}

// Component to display daily task checkboxes for an objective
function DailyTasksSection({ 
  objectiveId, 
  month,
  trackerMode
}: { 
  objectiveId: string; 
  month: string;
  trackerMode?: string;
}) {
  const { toast } = useToast();
  const businessDays = getBusinessDaysInMonth(month);
  const allDays = Array.from({ length: getDaysInMonth(new Date(month.split("-")[0], parseInt(month.split("-")[1]) - 1)) }, (_, i) => i + 1);
  const daysToUse = trackerMode === "every_day" ? allDays : businessDays;
  const [showModeDialog, setShowModeDialog] = useState(false);
  
  const { data: dailyTasks = [], isLoading } = useQuery<KpiDailyTask[]>({
    queryKey: ['/api/kpi-objectives', objectiveId, 'daily-tasks'],
  });

  const initializeMutation = useMutation({
    mutationFn: async (mode: string) => 
      apiRequest("POST", `/api/kpi-objectives/${objectiveId}/daily-tasks/initialize`, {
        days: mode === "every_day" ? allDays : businessDays,
        trackerMode: mode,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kpi-objectives', objectiveId, 'daily-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/kpi-objectives'] });
      setShowModeDialog(false);
      toast({ description: "Daily tracking enabled" });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to initialize daily tasks", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (taskId: string) =>
      apiRequest("PATCH", `/api/kpi-daily-tasks/${taskId}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kpi-objectives', objectiveId, 'daily-tasks'] });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to toggle task", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () =>
      apiRequest("DELETE", `/api/kpi-objectives/${objectiveId}/daily-tasks`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kpi-objectives', objectiveId, 'daily-tasks'] });
      toast({ description: "Daily tracking disabled" });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to remove daily tasks", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Loading...</div>;
  }

  // If no daily tasks exist, show button to enable tracking
  if (dailyTasks.length === 0) {
    return (
      <Dialog open={showModeDialog} onOpenChange={setShowModeDialog}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={(e) => {
              e.stopPropagation();
              setShowModeDialog(true);
            }}
            data-testid={`button-enable-tracking-${objectiveId}`}
          >
            <CalendarDays className="w-3 h-3" />
            Enable Daily Tracking
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Track Daily Progress</DialogTitle>
            <DialogDescription>
              Choose whether to track only business days (Mon-Fri) or every day of the month
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => initializeMutation.mutate("business_days")}
              disabled={initializeMutation.isPending}
              data-testid={`button-mode-business-days-${objectiveId}`}
            >
              <div className="text-left">
                <div className="font-medium">Business Days Only</div>
                <div className="text-xs text-muted-foreground">Track Mon-Fri only ({businessDays.length} days)</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => initializeMutation.mutate("every_day")}
              disabled={initializeMutation.isPending}
              data-testid={`button-mode-every-day-${objectiveId}`}
            >
              <div className="text-left">
                <div className="font-medium">Every Day</div>
                <div className="text-xs text-muted-foreground">Track all days ({allDays.length} days)</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Calculate progress
  const completedCount = dailyTasks.filter(t => t.isCompleted === 1).length;
  const totalCount = dailyTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Get the month and year for display
  const [year, monthNum] = month.split("-").map(Number);
  const todaysBusinessDay = getTodaysBusinessDayInMonth(month);

  return (
    <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">
          {completedCount}/{totalCount}
        </span>
        <Progress value={progressPercent} className="h-1 flex-1" />
        <span className="text-xs text-muted-foreground">{progressPercent}%</span>
      </div>
      <div className="flex flex-wrap gap-0.5">
        {dailyTasks.map((task) => {
          const dayDate = new Date(year, monthNum - 1, task.dayNumber);
          const dayLabel = format(dayDate, "EEE d");
          const isChecked = task.isCompleted === 1;
          const isToday = task.dayNumber === todaysBusinessDay;
          const canCheck = isToday && !isChecked;
          
          return (
            <Tooltip key={task.id}>
              <TooltipTrigger asChild>
                <div
                  className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-medium transition-colors ${
                    isChecked 
                      ? "bg-green-500 dark:bg-green-600 text-white" 
                      : isToday
                      ? "bg-muted hover:bg-muted/80 cursor-pointer"
                      : "bg-muted/50 dark:bg-muted/40 cursor-not-allowed opacity-50"
                  }`}
                  onClick={() => canCheck && toggleMutation.mutate(task.id)}
                  data-testid={`checkbox-day-${task.dayNumber}-${objectiveId}`}
                >
                  {task.dayNumber}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {dayLabel} - {isChecked ? "Completed" : isToday ? "Today - Click to complete" : "Not available yet"}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

function KanbanColumn({ 
  type, 
  title, 
  icon: Icon, 
  objectives, 
  onDelete, 
  onStatusChange,
  onEdit,
  isLoading 
}: {
  type: "personal" | "business";
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  objectives: KpiObjective[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (obj: KpiObjective) => void;
  isLoading: boolean;
}) {
  const isPersonal = type === "personal";
  const columnStyles = isPersonal
    ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
    : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800";
  const headerStyles = isPersonal
    ? "border-purple-300 dark:border-purple-700"
    : "border-emerald-300 dark:border-emerald-700";
  const iconStyles = isPersonal
    ? "text-purple-600 dark:text-purple-400"
    : "text-emerald-600 dark:text-emerald-400";
  const badgeStyles = isPersonal
    ? "bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200"
    : "bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200";

  return (
    <div className={`flex-1 min-w-80 p-3 rounded-lg border ${columnStyles}`}>
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${headerStyles}`}>
        <Icon className={`w-4 h-4 ${iconStyles}`} />
        <h4 className="font-semibold text-sm">{title}</h4>
        <span className={`ml-auto text-xs px-2 py-1 rounded ${badgeStyles}`}>{objectives.length}</span>
      </div>
      <div className="space-y-2">
        {objectives.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No {type} objectives
          </div>
        ) : (
          objectives.map((obj) => {
            const getStatusColor = (status: string) => {
              switch (status) {
                case "completed":
                  return "border-l-4 border-l-green-500 dark:border-l-green-400";
                case "in_progress":
                  return "border-l-4 border-l-blue-500 dark:border-l-blue-400";
                case "planned":
                  return "border-l-4 border-l-yellow-500 dark:border-l-yellow-400";
                default:
                  return "border-l-4 border-l-gray-300 dark:border-l-gray-600";
              }
            };
            
            return (
            <Card key={obj.id} className={`p-3 space-y-2 bg-card ${getStatusColor(obj.status)}`} data-testid={`objective-${obj.id}`}>
              <div 
                className="space-y-1 cursor-pointer hover-elevate rounded px-2 py-1 -mx-2 -my-1"
                onClick={() => onEdit(obj)}
              >
                <h5 className="font-medium text-sm leading-tight">{obj.title}</h5>
                {obj.description && (
                  <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{obj.description}</div>
                )}
              </div>
              
              <div 
                className="flex flex-wrap gap-2 text-xs cursor-pointer hover-elevate rounded px-2 py-1 -mx-2 -my-1"
                onClick={() => onEdit(obj)}
              >
                {obj.targetMetric && (
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 px-2 py-1 rounded">
                    {obj.targetMetric}
                  </span>
                )}
              </div>

              {/* Daily Tasks Section */}
              <div className="pt-2 border-t">
                <DailyTasksSection objectiveId={obj.id} month={obj.month} trackerMode={obj.dailyTrackerMode} />
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Select
                  value={obj.status}
                  onValueChange={(status) => onStatusChange(obj.id, status)}
                >
                  <SelectTrigger className="h-7 text-xs flex-1" data-testid={`select-status-${obj.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onEdit(obj)}
                  disabled={isLoading}
                  data-testid={`button-edit-${obj.id}`}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => onDelete(obj.id)}
                  disabled={isLoading}
                  data-testid={`button-delete-${obj.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function KpiDashboard() {
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedType, setSelectedType] = useState<"personal" | "business">("business");
  const [editingObjective, setEditingObjective] = useState<KpiObjective | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetMetric, setEditTargetMetric] = useState("");
  const currentMonth = format(new Date(), "yyyy-MM");
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set([currentMonth]));

  const { data: objectives = [], isLoading } = useQuery<KpiObjective[]>({
    queryKey: ["/api/kpi-objectives"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) =>
      apiRequest("POST", "/api/kpi-objectives", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpi-objectives"] });
      setOpenDialog(false);
      setSelectedMonth("");
      setSelectedType("business");
      toast({ description: "Objective created successfully" });
    },
    onError: (error: any) => {
      toast({
        description: error.message || "Failed to create objective",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/kpi-objectives/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpi-objectives"] });
      toast({ description: "Objective updated successfully" });
    },
    onError: (error: any) => {
      toast({
        description: error.message || "Failed to update objective",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("DELETE", `/api/kpi-objectives/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpi-objectives"] });
      toast({ description: "Objective deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        description: error.message || "Failed to delete objective",
        variant: "destructive",
      });
    },
  });

  const handleAddObjective = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      month: selectedMonth,
      type: selectedType,
      title: formData.get("title"),
      description: formData.get("description") || null,
      targetMetric: formData.get("targetMetric") || null,
      status: "planned",
    });
  };

  const handleEditObjective = (obj: KpiObjective) => {
    setEditingObjective(obj);
    setEditTitle(obj.title);
    setEditDescription(obj.description || "");
    setEditTargetMetric(obj.targetMetric || "");
    setOpenEditDialog(true);
  };

  const handleUpdateObjective = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingObjective) return;
    updateMutation.mutate({
      id: editingObjective.id,
      data: {
        title: editTitle,
        description: editDescription || null,
        targetMetric: editTargetMetric || null,
      },
    });
    setOpenEditDialog(false);
  };

  const toggleMonth = (month: string) => {
    const newSet = new Set(openMonths);
    if (newSet.has(month)) {
      newSet.delete(month);
    } else {
      newSet.add(month);
    }
    setOpenMonths(newSet);
  };

  const months = getNext12Months();
  const objectivesByMonth = objectives.reduce((acc, obj) => {
    if (!acc[obj.month]) acc[obj.month] = [];
    acc[obj.month].push(obj);
    return acc;
  }, {} as Record<string, KpiObjective[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading objectives...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-kpi-dashboard">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">KPI's Dashboard</h1>
          <p className="text-muted-foreground mt-1">12-Month Team Objectives</p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-objective">
              <Plus className="w-4 h-4 mr-2" />
              Add Objective
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Monthly Objective</DialogTitle>
              <DialogDescription>Create a new team objective for a specific month</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddObjective} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger data-testid="select-month">
                    <SelectValue placeholder="Select a month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.month} value={m.month}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <Select value={selectedType} onValueChange={(val) => setSelectedType(val as "personal" | "business")}>
                  <SelectTrigger data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Objective Title</label>
                <Input
                  name="title"
                  placeholder="e.g., Generate $50k new AUM"
                  data-testid="input-title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description (Notes)</label>
                <Textarea
                  name="description"
                  placeholder="Add notes with bullet points:&#10;• Key activity 1&#10;• Key activity 2&#10;• Success criteria"
                  data-testid="input-description"
                  className="resize-none min-h-24"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Target Metric</label>
                <Input
                  name="targetMetric"
                  placeholder="e.g., $50k, 50 calls, 10 new clients"
                  data-testid="input-metric"
                />
              </div>
              <Button type="submit" disabled={!selectedMonth || createMutation.isPending} className="w-full" data-testid="button-submit">
                {createMutation.isPending ? "Creating..." : "Create Objective"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Objective</DialogTitle>
              <DialogDescription>Update the objective details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateObjective} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Objective Title</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g., Generate $50k new AUM"
                  data-testid="input-edit-title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description (Notes)</label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add notes with bullet points:&#10;• Key activity 1&#10;• Key activity 2&#10;• Success criteria"
                  data-testid="input-edit-description"
                  className="resize-none min-h-24"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Target Metric</label>
                <Input
                  value={editTargetMetric}
                  onChange={(e) => setEditTargetMetric(e.target.value)}
                  placeholder="e.g., $50k, 50 calls, 10 new clients"
                  data-testid="input-edit-metric"
                />
              </div>
              <Button type="submit" disabled={updateMutation.isPending} className="w-full" data-testid="button-edit-submit">
                {updateMutation.isPending ? "Updating..." : "Update Objective"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {months.map((monthData) => {
          const monthObjectives = objectivesByMonth[monthData.month] || [];
          const isOpen = openMonths.has(monthData.month);
          const personalObjs = monthObjectives.filter(o => o.type === "personal");
          const businessObjs = monthObjectives.filter(o => o.type === "business");

          return (
            <Card key={monthData.month} className="overflow-visible" data-testid={`card-month-${monthData.month}`}>
              <Collapsible
                open={isOpen}
                onOpenChange={() => toggleMonth(monthData.month)}
              >
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover-elevate flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronDown
                        className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                      <div>
                        <h3 className="font-semibold text-lg">{monthData.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {monthObjectives.length} objective{monthObjectives.length !== 1 ? "s" : ""}
                          {personalObjs.length > 0 && ` • ${personalObjs.length} personal`}
                          {businessObjs.length > 0 && ` • ${businessObjs.length} business`}
                        </p>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4 border-t">
                  {monthObjectives.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No objectives set for this month</p>
                  ) : (
                    <div className="flex gap-4 overflow-x-auto pt-4 pb-2">
                      <KanbanColumn
                        type="personal"
                        title="Personal"
                        icon={User}
                        objectives={personalObjs}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status } })}
                        onEdit={handleEditObjective}
                        isLoading={deleteMutation.isPending || updateMutation.isPending}
                      />
                      <KanbanColumn
                        type="business"
                        title="Business"
                        icon={Briefcase}
                        objectives={businessObjs}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status } })}
                        onEdit={handleEditObjective}
                        isLoading={deleteMutation.isPending || updateMutation.isPending}
                      />
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
