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
import { ChevronDown, Trash2, Plus } from "lucide-react";
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

export default function KpiDashboard() {
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());

  const { data: objectives = [] } = useQuery({
    queryKey: ["/api/kpi-objectives"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) =>
      apiRequest("POST", "/api/kpi-objectives", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpi-objectives"] });
      setOpenDialog(false);
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
      title: formData.get("title"),
      description: formData.get("description"),
      targetMetric: formData.get("targetMetric"),
      assignedTo: formData.get("assignedTo"),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">KPI's Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">12-Month Team Objectives</p>
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
              <div>
                <label className="block text-sm font-medium mb-2">Assigned To</label>
                <Input
                  name="assignedTo"
                  placeholder="Team member name"
                  data-testid="input-assigned"
                />
              </div>
              <Button type="submit" disabled={!selectedMonth || createMutation.isPending} className="w-full" data-testid="button-submit">
                {createMutation.isPending ? "Creating..." : "Create Objective"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {months.map((monthData) => {
          const monthObjectives = objectivesByMonth[monthData.month] || [];
          const isOpen = openMonths.has(monthData.month);

          return (
            <Card key={monthData.month} className="overflow-hidden">
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
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {monthObjectives.length} objective{monthObjectives.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4 space-y-3 border-t">
                  {monthObjectives.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">No objectives set for this month</p>
                  ) : (
                    monthObjectives.map((obj) => (
                      <div key={obj.id} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{obj.title}</h4>
                            {obj.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {obj.description}
                              </p>
                            )}
                            <div className="flex gap-4 mt-2 text-xs flex-wrap">
                              {obj.targetMetric && (
                                <span className="text-blue-600 dark:text-blue-400">
                                  Target: {obj.targetMetric}
                                </span>
                              )}
                              {obj.assignedTo && (
                                <span className="text-purple-600 dark:text-purple-400">
                                  Assigned to: {obj.assignedTo}
                                </span>
                              )}
                              <span className="text-gray-500 dark:text-gray-500">
                                Status: {obj.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Select
                              value={obj.status}
                              onValueChange={(status) =>
                                updateMutation.mutate({
                                  id: obj.id,
                                  data: { status },
                                })
                              }
                            >
                              <SelectTrigger className="w-24 h-8" data-testid={`select-status-${obj.id}`}>
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
                              onClick={() => deleteMutation.mutate(obj.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${obj.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
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
