import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Trophy, Star, TrendingUp, Users, Lightbulb, Sparkles, Calendar } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Milestone } from "@shared/schema";
import { format } from "date-fns";

const CATEGORIES = {
  client_win: { label: "Client Win", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", icon: Trophy },
  personal_growth: { label: "Personal Growth", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", icon: Star },
  business_milestone: { label: "Business Milestone", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: TrendingUp },
  team_achievement: { label: "Team Achievement", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", icon: Users },
  process_improvement: { label: "Process Improvement", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200", icon: Lightbulb },
  other: { label: "Other", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200", icon: Sparkles },
};

type CategoryKey = keyof typeof CATEGORIES;

export default function MilestonesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "client_win" as CategoryKey,
    impactValue: "",
    achievedDate: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: milestones = [], isLoading } = useQuery<Milestone[]>({
    queryKey: ["/api/milestones"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/milestones", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milestones"] });
      setDialogOpen(false);
      resetForm();
      toast({ description: "Milestone added successfully" });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to add milestone", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/milestones/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milestones"] });
      setDialogOpen(false);
      resetForm();
      toast({ description: "Milestone updated successfully" });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to update milestone", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/milestones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milestones"] });
      setDeleteConfirmOpen(false);
      setMilestoneToDelete(null);
      toast({ description: "Milestone deleted successfully" });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to delete milestone", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "client_win",
      impactValue: "",
      achievedDate: format(new Date(), "yyyy-MM-dd"),
    });
    setEditingMilestone(null);
  };

  const handleAddClick = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setFormData({
      title: milestone.title,
      description: milestone.description || "",
      category: (milestone.category as CategoryKey) || "other",
      impactValue: milestone.impactValue || "",
      achievedDate: milestone.achievedDate ? format(new Date(milestone.achievedDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setMilestoneToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (milestoneToDelete) {
      deleteMutation.mutate(milestoneToDelete);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.achievedDate) {
      toast({
        description: "Title and date are required",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      achievedDate: new Date(formData.achievedDate).toISOString(),
    };

    if (editingMilestone) {
      updateMutation.mutate({ id: editingMilestone.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const filteredMilestones = filterCategory === "all"
    ? milestones
    : milestones.filter(m => m.category === filterCategory);

  const groupedByMonth = filteredMilestones.reduce((acc, milestone) => {
    const monthKey = format(new Date(milestone.achievedDate), "MMMM yyyy");
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(milestone);
    return acc;
  }, {} as Record<string, Milestone[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-milestones">
        <div className="animate-pulse text-muted-foreground">Loading milestones...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-foreground" data-testid="page-title-milestones">Milestones & Wins</h1>
          <p className="text-muted-foreground mt-1">Capture achievements and celebrate your progress</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]" data-testid="filter-category">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORIES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddClick} data-testid="button-add-milestone">
                <Plus className="w-4 h-4 mr-2" />
                Add Milestone
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle data-testid="dialog-title">
                  {editingMilestone ? "Edit Milestone" : "Add Milestone"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    data-testid="input-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="What did you accomplish?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: CategoryKey) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORIES).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="achievedDate">Date Achieved *</Label>
                  <Input
                    id="achievedDate"
                    type="date"
                    data-testid="input-date"
                    value={formData.achievedDate}
                    onChange={(e) => setFormData({ ...formData, achievedDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="impactValue">Impact Value (optional)</Label>
                  <Input
                    id="impactValue"
                    data-testid="input-impact"
                    value={formData.impactValue}
                    onChange={(e) => setFormData({ ...formData, impactValue: e.target.value })}
                    placeholder="e.g., $500K AUM, 20 new clients"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    data-testid="input-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add details about this achievement..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredMilestones.length === 0 ? (
        <Card className="p-12" data-testid="empty-state">
          <div className="text-center">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No milestones yet</h3>
            <p className="text-muted-foreground mb-4">Start capturing your wins and achievements!</p>
            <Button onClick={handleAddClick} data-testid="button-add-first-milestone">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Milestone
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByMonth).map(([monthYear, monthMilestones]) => (
            <div key={monthYear}>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground" data-testid={`month-header-${monthYear.replace(/\s/g, '-')}`}>
                  {monthYear}
                </h2>
                <Badge variant="secondary" className="ml-2">
                  {monthMilestones.length}
                </Badge>
              </div>
              <div className="space-y-4 pl-6 border-l-2 border-muted">
                {monthMilestones.map((milestone) => {
                  const categoryInfo = CATEGORIES[milestone.category as CategoryKey] || CATEGORIES.other;
                  const CategoryIcon = categoryInfo.icon;
                  return (
                    <Card
                      key={milestone.id}
                      className="relative hover-elevate"
                      data-testid={`milestone-card-${milestone.id}`}
                    >
                      <div className="absolute -left-[33px] top-6 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${categoryInfo.color}`}>
                              <CategoryIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <CardTitle className="text-lg" data-testid={`milestone-title-${milestone.id}`}>
                                {milestone.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge className={categoryInfo.color}>
                                  {categoryInfo.label}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(milestone.achievedDate), "MMM d, yyyy")}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(milestone)}
                              data-testid={`button-edit-${milestone.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(milestone.id)}
                              data-testid={`button-delete-${milestone.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {(milestone.impactValue || milestone.description) && (
                        <CardContent className="pt-0">
                          {milestone.impactValue && (
                            <div className="mb-2">
                              <span className="text-lg font-bold text-primary font-mono" data-testid={`milestone-impact-${milestone.id}`}>
                                {milestone.impactValue}
                              </span>
                            </div>
                          )}
                          {milestone.description && (
                            <p className="text-muted-foreground text-sm" data-testid={`milestone-description-${milestone.id}`}>
                              {milestone.description}
                            </p>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Milestone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this milestone? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
