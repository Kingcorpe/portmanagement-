import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Trash2, Plus, User, Briefcase } from "lucide-react";
import { format, addMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { KpiObjective } from "@shared/schema";

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

function KanbanColumn({ 
  type, 
  title, 
  icon: Icon, 
  objectives, 
  onDelete, 
  onStatusChange,
  isLoading 
}: {
  type: "personal" | "business";
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  objectives: KpiObjective[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
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
              <div className="space-y-1">
                <h5 className="font-medium text-sm leading-tight">{obj.title}</h5>
                {obj.description && (
                  <p className="text-xs text-muted-foreground leading-tight">{obj.description}</p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 text-xs">
                {obj.targetMetric && (
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 px-2 py-1 rounded">
                    {obj.targetMetric}
                  </span>
                )}
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
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedType, setSelectedType] = useState<"personal" | "business">("business");
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
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  name="description"
                  placeholder="Additional details about this objective"
                  data-testid="input-description"
                  className="resize-none"
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
                        isLoading={deleteMutation.isPending || updateMutation.isPending}
                      />
                      <KanbanColumn
                        type="business"
                        title="Business"
                        icon={Briefcase}
                        objectives={businessObjs}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status } })}
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
