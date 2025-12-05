import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Map, 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  CheckCircle2,
  Circle,
  ArrowRight,
  Lightbulb,
  Rocket,
  Clock,
  Target,
  Zap,
  GripVertical
} from "lucide-react";

type RoadmapItem = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: "current" | "queued" | "backlog" | "completed";
  priority: "must_do" | "should_do" | "could_do" | "idea";
  category: string | null;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const statusConfig = {
  current: {
    label: "Current Focus",
    icon: Rocket,
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    description: "What you're working on now",
  },
  queued: {
    label: "Up Next",
    icon: Clock,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    description: "Prioritized and ready to start",
  },
  backlog: {
    label: "Ideas Backlog",
    icon: Lightbulb,
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    description: "Captured for later consideration",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    description: "Done and dusted",
  },
};

const priorityConfig = {
  must_do: { label: "Must Do", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  should_do: { label: "Should Do", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  could_do: { label: "Could Do", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  idea: { label: "Idea", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
};

const categoryOptions = [
  { value: "feature", label: "Feature" },
  { value: "bug", label: "Bug Fix" },
  { value: "refactor", label: "Refactor" },
  { value: "docs", label: "Documentation" },
  { value: "ui", label: "UI/UX" },
  { value: "perf", label: "Performance" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
];

export default function Roadmap() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    status: "backlog" as const,
    priority: "could_do" as const,
    category: "",
  });

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

  const { data: items = [], isLoading } = useQuery<RoadmapItem[]>({
    queryKey: ["/api/roadmap"],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: async (item: typeof newItem) => {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadmap"] });
      setIsAddDialogOpen(false);
      setNewItem({ title: "", description: "", status: "backlog", priority: "could_do", category: "" });
      toast({ title: "Item added", description: "Roadmap item created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create item", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<RoadmapItem> & { id: string }) => {
      const res = await fetch(`/api/roadmap/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadmap"] });
      setEditingItem(null);
      toast({ title: "Item updated", description: "Roadmap item updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update item", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/roadmap/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roadmap"] });
      toast({ title: "Item deleted", description: "Roadmap item removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
    },
  });

  const handleStatusChange = (item: RoadmapItem, newStatus: RoadmapItem["status"]) => {
    updateMutation.mutate({ id: item.id, status: newStatus });
  };

  const handleToggleComplete = (item: RoadmapItem) => {
    const newStatus = item.status === "completed" ? "queued" : "completed";
    updateMutation.mutate({ id: item.id, status: newStatus });
  };

  const getItemsByStatus = (status: RoadmapItem["status"]) => {
    return items
      .filter((item) => item.status === status)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const renderItemCard = (item: RoadmapItem) => {
    const priority = priorityConfig[item.priority];
    const isCompleted = item.status === "completed";

    return (
      <div
        key={item.id}
        className={`group p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors ${
          isCompleted ? "opacity-60" : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={() => handleToggleComplete(item)}
            className="mt-0.5 flex-shrink-0"
          >
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                {item.title}
              </h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditingItem(item)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  {item.status !== "current" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(item, "current")}>
                      <Rocket className="h-4 w-4 mr-2" />
                      Move to Current
                    </DropdownMenuItem>
                  )}
                  {item.status !== "queued" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(item, "queued")}>
                      <Clock className="h-4 w-4 mr-2" />
                      Move to Up Next
                    </DropdownMenuItem>
                  )}
                  {item.status !== "backlog" && (
                    <DropdownMenuItem onClick={() => handleStatusChange(item, "backlog")}>
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Move to Backlog
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => deleteMutation.mutate(item.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className={priority.color}>
                {priority.label}
              </Badge>
              {item.category && (
                <Badge variant="outline" className="bg-slate-500/10">
                  {item.category}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderColumn = (status: RoadmapItem["status"]) => {
    const config = statusConfig[status];
    const StatusIcon = config.icon;
    const columnItems = getItemsByStatus(status);

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
          <StatusIcon className="h-5 w-5" />
          <h3 className="font-semibold">{config.label}</h3>
          <Badge variant="secondary" className="ml-auto">
            {columnItems.length}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{config.description}</p>
        <div className="space-y-3 flex-1">
          {columnItems.map(renderItemCard)}
          {columnItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="text-sm">No items</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ItemDialog = ({ 
    open, 
    onOpenChange, 
    item, 
    onSubmit 
  }: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void;
    item: typeof newItem | RoadmapItem;
    onSubmit: (data: typeof newItem) => void;
  }) => {
    const [formData, setFormData] = useState(item);

    useEffect(() => {
      setFormData(item);
    }, [item]);

    const isEdit = "id" in item;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Item" : "Add New Item"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update the roadmap item details" : "Create a new item for your roadmap"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="What needs to be done?"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Add more details..."
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Focus</SelectItem>
                    <SelectItem value="queued">Up Next</SelectItem>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="must_do">Must Do</SelectItem>
                    <SelectItem value="should_do">Should Do</SelectItem>
                    <SelectItem value="could_do">Could Do</SelectItem>
                    <SelectItem value="idea">Idea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={formData.category || ""}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => onSubmit(formData as typeof newItem)}
              disabled={!formData.title.trim()}
            >
              {isEdit ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Stats
  const totalItems = items.length;
  const completedItems = items.filter((i) => i.status === "completed").length;
  const currentItems = items.filter((i) => i.status === "current").length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Map className="h-8 w-8" />
            Project Roadmap
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your project priorities, ideas, and progress
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{currentItems}</p>
              </div>
              <Rocket className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedItems}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">{progressPercent}%</p>
              </div>
              <Zap className="h-8 w-8 text-amber-500" />
            </div>
            <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-emerald-500/20">
          <CardHeader className="pb-2">
            <div className={`p-3 rounded-lg ${statusConfig.current.color}`}>
              {renderColumn("current")}
            </div>
          </CardHeader>
        </Card>
        <Card className="border-blue-500/20">
          <CardHeader className="pb-2">
            <div className={`p-3 rounded-lg ${statusConfig.queued.color}`}>
              {renderColumn("queued")}
            </div>
          </CardHeader>
        </Card>
        <Card className="border-amber-500/20">
          <CardHeader className="pb-2">
            <div className={`p-3 rounded-lg ${statusConfig.backlog.color}`}>
              {renderColumn("backlog")}
            </div>
          </CardHeader>
        </Card>
        <Card className="border-slate-500/20">
          <CardHeader className="pb-2">
            <div className={`p-3 rounded-lg ${statusConfig.completed.color}`}>
              {renderColumn("completed")}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Add Dialog */}
      <ItemDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        item={newItem}
        onSubmit={(data) => createMutation.mutate(data)}
      />

      {/* Edit Dialog */}
      {editingItem && (
        <ItemDialog
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          item={editingItem}
          onSubmit={(data) => updateMutation.mutate({ id: editingItem.id, ...data })}
        />
      )}
    </div>
  );
}

