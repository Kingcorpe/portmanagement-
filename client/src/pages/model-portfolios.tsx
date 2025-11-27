import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Search, Trash2, Edit, TrendingUp, TrendingDown, Percent, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Target, X, RefreshCw, ChevronDown, ChevronRight, GripVertical, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { 
  UniversalHolding, 
  PlannedPortfolioWithAllocations, 
  FreelancePortfolioWithAllocations 
} from "@shared/schema";

const riskLevelLabels: Record<string, string> = {
  low: "Low",
  low_medium: "Low-Medium",
  medium: "Medium",
  medium_high: "Medium-High",
  high: "High",
};

const holdingCategoryLabels: Record<string, string> = {
  basket_etf: "CC Basket ETFs",
  single_etf: "Single ETFs",
  double_long_etf: "Double Long ETFs",
  security: "Securities",
  auto_added: "Auto Added",
  misc: "Misc.",
};

const holdingCategoryOrder = ["basket_etf", "single_etf", "double_long_etf", "security", "auto_added", "misc"];

const riskLevelColors: Record<string, string> = {
  low: "bg-chart-2 text-white",
  low_medium: "bg-emerald-500 text-white",
  medium: "bg-yellow-500 text-white",
  medium_high: "bg-orange-500 text-white",
  high: "bg-destructive text-destructive-foreground",
};

const dividendPayoutLabels: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-Annual",
  annual: "Annual",
  none: "None",
};

const categoryLabels: Record<string, string> = {
  basket_etf: "CC Basket ETFs",
  single_etf: "Single ETFs",
  double_long_etf: "Double Long ETFs",
  security: "Securities",
  auto_added: "Auto Added",
  misc: "Misc.",
};

const categoryColors: Record<string, string> = {
  basket_etf: "bg-blue-500 text-white",
  single_etf: "bg-purple-500 text-white",
  double_long_etf: "bg-amber-500 text-white",
  security: "bg-slate-500 text-white",
  auto_added: "bg-gray-500 text-white",
  misc: "bg-teal-500 text-white",
};

const holdingFormSchema = z.object({
  ticker: z.string().min(1, "Ticker is required").max(20),
  name: z.string().min(1, "Name is required"),
  category: z.enum(["basket_etf", "single_etf", "double_long_etf", "security", "auto_added", "misc"]),
  riskLevel: z.enum(["low", "low_medium", "medium", "medium_high", "high"]),
  dividendRate: z.coerce.number().nonnegative().default(0),
  dividendPayout: z.enum(["monthly", "quarterly", "semi_annual", "annual", "none"]),
  description: z.string().optional(),
});

const portfolioFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const allocationFormSchema = z.object({
  universalHoldingId: z.string().min(1, "Please select a holding"),
  targetPercentage: z.coerce.number().positive().max(100, "Percentage cannot exceed 100"),
});

type HoldingFormData = z.infer<typeof holdingFormSchema>;
type PortfolioFormData = z.infer<typeof portfolioFormSchema>;
type AllocationFormData = z.infer<typeof allocationFormSchema>;

interface SortablePlannedPortfolioCardProps {
  portfolio: PlannedPortfolioWithAllocations;
  totalAllocation: number;
  isOpen: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onAddAllocation: () => void;
  inlineEditingAllocation: { id: string; type: "planned" | "freelance" } | null;
  inlineAllocationValue: string;
  setInlineAllocationValue: (value: string) => void;
  handleInlineAllocationSave: (id: string, type: "planned" | "freelance", currentValue: number) => void;
  handleInlineAllocationCancel: () => void;
  handleInlineAllocationEdit: (type: "planned" | "freelance", id: string, value: string) => void;
  deletePlannedAllocationMutation: { mutate: (id: string) => void };
}

function SortablePlannedPortfolioCard({
  portfolio,
  totalAllocation,
  isOpen,
  onToggle,
  onDelete,
  onEdit,
  onAddAllocation,
  inlineEditingAllocation,
  inlineAllocationValue,
  setInlineAllocationValue,
  handleInlineAllocationSave,
  handleInlineAllocationCancel,
  handleInlineAllocationEdit,
  deletePlannedAllocationMutation,
}: SortablePlannedPortfolioCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: portfolio.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <Card data-testid={`card-planned-portfolio-${portfolio.id}`}>
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
            <div className="flex items-center gap-3">
              <button
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
                {...attributes}
                {...listeners}
                data-testid={`drag-handle-planned-${portfolio.id}`}
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </button>
              <CollapsibleTrigger className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors" data-testid={`toggle-planned-${portfolio.id}`}>
                {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                <div className="text-left">
                  <CardTitle>{portfolio.name}</CardTitle>
                  {portfolio.description && <CardDescription>{portfolio.description}</CardDescription>}
                </div>
              </CollapsibleTrigger>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {portfolio.allocations.length} holding{portfolio.allocations.length !== 1 ? 's' : ''}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-primary" 
                onClick={onEdit}
                data-testid={`button-edit-planned-${portfolio.id}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" data-testid={`button-delete-planned-${portfolio.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Portfolio</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{portfolio.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {portfolio.allocations.length === 0 ? (
                <p className="text-sm text-muted-foreground mb-4">No allocations yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Holding</TableHead>
                      <TableHead className="text-right">Allocation</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...portfolio.allocations].sort((a, b) => a.holding.ticker.localeCompare(b.holding.ticker)).map((allocation) => {
                      const isEditing = inlineEditingAllocation?.id === allocation.id && inlineEditingAllocation?.type === "planned";
                      const currentValue = Number(allocation.targetPercentage);
                      return (
                        <TableRow key={allocation.id} data-testid={`row-allocation-${allocation.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold">{allocation.holding.ticker}</span>
                              <span className="text-muted-foreground">{allocation.holding.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {isEditing ? (
                              <div className="flex items-center gap-1 justify-end">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={inlineAllocationValue}
                                  onChange={(e) => setInlineAllocationValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleInlineAllocationSave(allocation.id, "planned", currentValue);
                                    } else if (e.key === "Escape") {
                                      handleInlineAllocationCancel();
                                    }
                                  }}
                                  className="w-20 h-7 text-right"
                                  autoFocus
                                  data-testid={`input-inline-allocation-${allocation.id}`}
                                />
                                <span>%</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-primary"
                                  onClick={() => handleInlineAllocationSave(allocation.id, "planned", currentValue)}
                                  data-testid={`button-save-inline-allocation-${allocation.id}`}
                                >
                                  <Target className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground"
                                  onClick={handleInlineAllocationCancel}
                                  data-testid={`button-cancel-inline-allocation-${allocation.id}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 justify-end">
                                <span
                                  className="cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => handleInlineAllocationEdit("planned", allocation.id, currentValue.toFixed(2))}
                                  data-testid={`text-allocation-${allocation.id}`}
                                >
                                  {currentValue.toFixed(2)}%
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                                  onClick={() => handleInlineAllocationEdit("planned", allocation.id, currentValue.toFixed(2))}
                                  data-testid={`button-edit-allocation-${allocation.id}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deletePlannedAllocationMutation.mutate(allocation.id)} data-testid={`button-delete-allocation-${allocation.id}`}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="border-t-2 font-semibold bg-muted/50">
                      <TableCell></TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={totalAllocation === 100 ? "text-green-600" : "text-destructive"}>
                          Total: {totalAllocation.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
              <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm" onClick={onAddAllocation} data-testid={`button-add-allocation-${portfolio.id}`}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Allocation
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

interface SortableFreelancePortfolioCardProps {
  portfolio: FreelancePortfolioWithAllocations;
  totalAllocation: number;
  isOpen: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onAddAllocation: () => void;
  inlineEditingAllocation: { id: string; type: "planned" | "freelance" } | null;
  inlineAllocationValue: string;
  setInlineAllocationValue: (value: string) => void;
  handleInlineAllocationSave: (id: string, type: "planned" | "freelance", currentValue: number) => void;
  handleInlineAllocationCancel: () => void;
  handleInlineAllocationEdit: (type: "planned" | "freelance", id: string, value: string) => void;
  deleteFreelanceAllocationMutation: { mutate: (id: string) => void };
}

function SortableFreelancePortfolioCard({
  portfolio,
  totalAllocation,
  isOpen,
  onToggle,
  onDelete,
  onEdit,
  onAddAllocation,
  inlineEditingAllocation,
  inlineAllocationValue,
  setInlineAllocationValue,
  handleInlineAllocationSave,
  handleInlineAllocationCancel,
  handleInlineAllocationEdit,
  deleteFreelanceAllocationMutation,
}: SortableFreelancePortfolioCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: portfolio.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <Card data-testid={`card-freelance-portfolio-${portfolio.id}`}>
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
            <div className="flex items-center gap-3">
              <button
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
                {...attributes}
                {...listeners}
                data-testid={`drag-handle-freelance-${portfolio.id}`}
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </button>
              <CollapsibleTrigger className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors" data-testid={`toggle-freelance-${portfolio.id}`}>
                {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                <div className="text-left">
                  <CardTitle>{portfolio.name}</CardTitle>
                  {portfolio.description && <CardDescription>{portfolio.description}</CardDescription>}
                </div>
              </CollapsibleTrigger>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {portfolio.allocations.length} holding{portfolio.allocations.length !== 1 ? 's' : ''}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-primary" 
                onClick={onEdit}
                data-testid={`button-edit-freelance-${portfolio.id}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" data-testid={`button-delete-freelance-${portfolio.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Portfolio</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{portfolio.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {portfolio.allocations.length === 0 ? (
                <p className="text-sm text-muted-foreground mb-4">No allocations yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Holding</TableHead>
                      <TableHead className="text-right">Allocation</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...portfolio.allocations].sort((a, b) => a.holding.ticker.localeCompare(b.holding.ticker)).map((allocation) => {
                      const isEditing = inlineEditingAllocation?.id === allocation.id && inlineEditingAllocation?.type === "freelance";
                      const currentValue = Number(allocation.targetPercentage);
                      return (
                        <TableRow key={allocation.id} data-testid={`row-allocation-${allocation.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold">{allocation.holding.ticker}</span>
                              <span className="text-muted-foreground">{allocation.holding.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {isEditing ? (
                              <div className="flex items-center gap-1 justify-end">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={inlineAllocationValue}
                                  onChange={(e) => setInlineAllocationValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleInlineAllocationSave(allocation.id, "freelance", currentValue);
                                    } else if (e.key === "Escape") {
                                      handleInlineAllocationCancel();
                                    }
                                  }}
                                  className="w-20 h-7 text-right"
                                  autoFocus
                                  data-testid={`input-inline-allocation-${allocation.id}`}
                                />
                                <span>%</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-primary"
                                  onClick={() => handleInlineAllocationSave(allocation.id, "freelance", currentValue)}
                                  data-testid={`button-save-inline-allocation-${allocation.id}`}
                                >
                                  <Target className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground"
                                  onClick={handleInlineAllocationCancel}
                                  data-testid={`button-cancel-inline-allocation-${allocation.id}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 justify-end">
                                <span
                                  className="cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => handleInlineAllocationEdit("freelance", allocation.id, currentValue.toFixed(2))}
                                  data-testid={`text-allocation-${allocation.id}`}
                                >
                                  {currentValue.toFixed(2)}%
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                                  onClick={() => handleInlineAllocationEdit("freelance", allocation.id, currentValue.toFixed(2))}
                                  data-testid={`button-edit-allocation-${allocation.id}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteFreelanceAllocationMutation.mutate(allocation.id)} data-testid={`button-delete-allocation-${allocation.id}`}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="border-t-2 font-semibold bg-muted/50">
                      <TableCell></TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={totalAllocation === 100 ? "text-green-600" : "text-destructive"}>
                          Total: {totalAllocation.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
              <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm" onClick={onAddAllocation} data-testid={`button-add-allocation-${portfolio.id}`}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Allocation
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

export default function ModelPortfolios() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("holdings");
  const [isHoldingDialogOpen, setIsHoldingDialogOpen] = useState(false);
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);
  const [isPlannedDialogOpen, setIsPlannedDialogOpen] = useState(false);
  const [isFreelanceDialogOpen, setIsFreelanceDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<UniversalHolding | null>(null);
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [allocationSaveAndAddAnother, setAllocationSaveAndAddAnother] = useState(false);
  const [allocationTarget, setAllocationTarget] = useState<{ type: "planned" | "freelance"; portfolioId: string } | null>(null);
  const [editingPlannedPortfolio, setEditingPlannedPortfolio] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [editingFreelancePortfolio, setEditingFreelancePortfolio] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [editingAllocation, setEditingAllocation] = useState<{ id: string; type: "planned" | "freelance"; universalHoldingId: string; targetPercentage: number } | null>(null);
  const [isLookingUpTicker, setIsLookingUpTicker] = useState(false);
  const [holdingsSortColumn, setHoldingsSortColumn] = useState<"ticker" | "name" | "category" | "riskLevel" | "price" | "dividendRate">("ticker");
  const [holdingsSortDirection, setHoldingsSortDirection] = useState<"asc" | "desc">("asc");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [inlineEditingAllocation, setInlineEditingAllocation] = useState<{ id: string; type: "planned" | "freelance" } | null>(null);
  const [inlineAllocationValue, setInlineAllocationValue] = useState<string>("");
  const [openPlannedPortfolios, setOpenPlannedPortfolios] = useState<Set<string>>(new Set());
  const [openFreelancePortfolios, setOpenFreelancePortfolios] = useState<Set<string>>(new Set());

  const holdingForm = useForm<HoldingFormData>({
    resolver: zodResolver(holdingFormSchema),
    defaultValues: {
      ticker: "",
      name: "",
      category: "basket_etf",
      riskLevel: "medium",
      dividendRate: 0,
      dividendPayout: "monthly",
      description: "",
    },
  });

  const portfolioForm = useForm<PortfolioFormData>({
    resolver: zodResolver(portfolioFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const allocationForm = useForm<AllocationFormData>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: {
      universalHoldingId: "",
      targetPercentage: 0,
    },
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

  const { data: holdings = [], isLoading: holdingsLoading } = useQuery<UniversalHolding[]>({
    queryKey: ["/api/universal-holdings"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) return false;
      return failureCount < 3;
    },
  });

  const { data: plannedPortfolios = [], isLoading: plannedLoading } = useQuery<PlannedPortfolioWithAllocations[]>({
    queryKey: ["/api/planned-portfolios"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) return false;
      return failureCount < 3;
    },
  });

  const { data: freelancePortfolios = [], isLoading: freelanceLoading } = useQuery<FreelancePortfolioWithAllocations[]>({
    queryKey: ["/api/freelance-portfolios"],
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) return false;
      return failureCount < 3;
    },
  });

  const createHoldingMutation = useMutation({
    mutationFn: (data: HoldingFormData) => apiRequest("POST", "/api/universal-holdings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universal-holdings"] });
      toast({ title: "Success", description: "Holding created successfully" });
      holdingForm.reset();
      if (!saveAndAddAnother) {
        setIsHoldingDialogOpen(false);
      }
      setSaveAndAddAnother(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSaveAndAddAnother(false);
    },
  });

  const updateHoldingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HoldingFormData> }) => 
      apiRequest("PATCH", `/api/universal-holdings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universal-holdings"] });
      toast({ title: "Success", description: "Holding updated successfully" });
      setIsHoldingDialogOpen(false);
      setEditingHolding(null);
      holdingForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteHoldingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/universal-holdings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universal-holdings"] });
      toast({ title: "Success", description: "Holding deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const refreshPricesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/universal-holdings/refresh-prices"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/universal-holdings"] });
      toast({ 
        title: "Prices Updated", 
        description: data.message || `Updated ${data.updated} holdings` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createPlannedPortfolioMutation = useMutation({
    mutationFn: (data: PortfolioFormData) => apiRequest("POST", "/api/planned-portfolios", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planned-portfolios"] });
      toast({ title: "Success", description: "Planned portfolio created successfully" });
      setIsPlannedDialogOpen(false);
      portfolioForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePlannedPortfolioMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/planned-portfolios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planned-portfolios"] });
      toast({ title: "Success", description: "Planned portfolio deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updatePlannedPortfolioMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PortfolioFormData }) => 
      apiRequest("PATCH", `/api/planned-portfolios/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planned-portfolios"] });
      toast({ title: "Success", description: "Portfolio updated successfully" });
      setEditingPlannedPortfolio(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createFreelancePortfolioMutation = useMutation({
    mutationFn: (data: PortfolioFormData) => apiRequest("POST", "/api/freelance-portfolios", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freelance-portfolios"] });
      toast({ title: "Success", description: "Freelance portfolio created successfully" });
      setIsFreelanceDialogOpen(false);
      portfolioForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteFreelancePortfolioMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/freelance-portfolios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freelance-portfolios"] });
      toast({ title: "Success", description: "Freelance portfolio deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateFreelancePortfolioMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PortfolioFormData }) => 
      apiRequest("PATCH", `/api/freelance-portfolios/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freelance-portfolios"] });
      toast({ title: "Success", description: "Portfolio updated successfully" });
      setEditingFreelancePortfolio(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createPlannedAllocationMutation = useMutation({
    mutationFn: (data: AllocationFormData & { plannedPortfolioId: string }) => 
      apiRequest("POST", "/api/planned-portfolio-allocations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planned-portfolios"] });
      toast({ title: "Success", description: "Allocation added successfully" });
      if (allocationSaveAndAddAnother) {
        allocationForm.reset({ universalHoldingId: "", targetPercentage: 0 });
        setAllocationSaveAndAddAnother(false);
      } else {
        setIsAllocationDialogOpen(false);
        setAllocationTarget(null);
        allocationForm.reset();
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePlannedAllocationMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/planned-portfolio-allocations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planned-portfolios"] });
      toast({ title: "Success", description: "Allocation removed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createFreelanceAllocationMutation = useMutation({
    mutationFn: (data: AllocationFormData & { freelancePortfolioId: string }) => 
      apiRequest("POST", "/api/freelance-portfolio-allocations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freelance-portfolios"] });
      toast({ title: "Success", description: "Allocation added successfully" });
      if (allocationSaveAndAddAnother) {
        allocationForm.reset({ universalHoldingId: "", targetPercentage: 0 });
        setAllocationSaveAndAddAnother(false);
      } else {
        setIsAllocationDialogOpen(false);
        setAllocationTarget(null);
        allocationForm.reset();
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteFreelanceAllocationMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/freelance-portfolio-allocations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freelance-portfolios"] });
      toast({ title: "Success", description: "Allocation removed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updatePlannedAllocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AllocationFormData> }) => 
      apiRequest("PATCH", `/api/planned-portfolio-allocations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planned-portfolios"] });
      toast({ title: "Success", description: "Allocation updated successfully" });
      setIsAllocationDialogOpen(false);
      setEditingAllocation(null);
      setAllocationTarget(null);
      allocationForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateFreelanceAllocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AllocationFormData> }) => 
      apiRequest("PATCH", `/api/freelance-portfolio-allocations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freelance-portfolios"] });
      toast({ title: "Success", description: "Allocation updated successfully" });
      setIsAllocationDialogOpen(false);
      setEditingAllocation(null);
      setAllocationTarget(null);
      allocationForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const reorderPlannedPortfoliosMutation = useMutation({
    mutationFn: (orderedIds: string[]) => 
      apiRequest("POST", "/api/planned-portfolios/reorder", { orderedIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planned-portfolios"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: "Failed to reorder portfolios", variant: "destructive" });
    },
  });

  const reorderFreelancePortfoliosMutation = useMutation({
    mutationFn: (orderedIds: string[]) => 
      apiRequest("POST", "/api/freelance-portfolios/reorder", { orderedIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/freelance-portfolios"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: "Failed to reorder portfolios", variant: "destructive" });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handlePlannedDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = plannedPortfolios.findIndex((p) => p.id === active.id);
      const newIndex = plannedPortfolios.findIndex((p) => p.id === over.id);
      const newOrder = arrayMove(plannedPortfolios, oldIndex, newIndex);
      reorderPlannedPortfoliosMutation.mutate(newOrder.map((p) => p.id));
    }
  };

  const handleFreelanceDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = freelancePortfolios.findIndex((p) => p.id === active.id);
      const newIndex = freelancePortfolios.findIndex((p) => p.id === over.id);
      const newOrder = arrayMove(freelancePortfolios, oldIndex, newIndex);
      reorderFreelancePortfoliosMutation.mutate(newOrder.map((p) => p.id));
    }
  };

  const onHoldingSubmit = (data: HoldingFormData) => {
    const normalizedData = {
      ...data,
      ticker: data.ticker.toUpperCase(),
    };
    if (editingHolding) {
      updateHoldingMutation.mutate({ id: editingHolding.id, data: normalizedData });
    } else {
      createHoldingMutation.mutate(normalizedData);
    }
  };

  const onPlannedPortfolioSubmit = (data: PortfolioFormData) => {
    createPlannedPortfolioMutation.mutate(data);
  };

  const onFreelancePortfolioSubmit = (data: PortfolioFormData) => {
    createFreelancePortfolioMutation.mutate(data);
  };

  const onAllocationSubmit = (data: AllocationFormData) => {
    if (editingAllocation) {
      if (editingAllocation.type === "planned") {
        updatePlannedAllocationMutation.mutate({ id: editingAllocation.id, data });
      } else {
        updateFreelanceAllocationMutation.mutate({ id: editingAllocation.id, data });
      }
    } else if (allocationTarget) {
      if (allocationTarget.type === "planned") {
        createPlannedAllocationMutation.mutate({ ...data, plannedPortfolioId: allocationTarget.portfolioId });
      } else {
        createFreelanceAllocationMutation.mutate({ ...data, freelancePortfolioId: allocationTarget.portfolioId });
      }
    }
  };

  const lookupTicker = async () => {
    const ticker = holdingForm.getValues("ticker");
    if (!ticker || ticker.trim() === "") {
      toast({ title: "Error", description: "Please enter a ticker symbol first", variant: "destructive" });
      return;
    }

    setIsLookingUpTicker(true);
    try {
      const response = await fetch(`/api/ticker-lookup/${encodeURIComponent(ticker.trim())}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Ticker not found");
      }
      const data = await response.json();
      
      // Populate all available fields
      holdingForm.setValue("name", data.name);
      if (data.dividendRate) {
        holdingForm.setValue("dividendRate", parseFloat(data.dividendRate.toFixed(2)));
      }
      
      // Build description of what was found
      const details = [];
      if (data.dividendRate) details.push(`Yield: ${data.dividendRate.toFixed(2)}%`);
      
      toast({ 
        title: "Found", 
        description: `${data.ticker}: ${data.name}${details.length > 0 ? ' | ' + details.join(', ') : ''}` 
      });
    } catch (error: any) {
      toast({ title: "Not Found", description: error.message || "Could not find ticker", variant: "destructive" });
    } finally {
      setIsLookingUpTicker(false);
    }
  };

  const handleEditHolding = (holding: UniversalHolding) => {
    setEditingHolding(holding);
    holdingForm.reset({
      ticker: holding.ticker,
      name: holding.name,
      category: holding.category,
      riskLevel: holding.riskLevel,
      dividendRate: Number(holding.dividendRate) || 0,
      dividendPayout: holding.dividendPayout,
      description: holding.description || "",
    });
    setIsHoldingDialogOpen(true);
  };

  const handleAddAllocation = (type: "planned" | "freelance", portfolioId: string) => {
    setAllocationTarget({ type, portfolioId });
    setEditingAllocation(null);
    allocationForm.reset();
    setIsAllocationDialogOpen(true);
  };

  const handleEditAllocation = (type: "planned" | "freelance", allocation: { id: string; universalHoldingId: string; targetPercentage: string }) => {
    setEditingAllocation({
      id: allocation.id,
      type,
      universalHoldingId: allocation.universalHoldingId,
      targetPercentage: Number(allocation.targetPercentage),
    });
    setAllocationTarget(null);
    allocationForm.reset({
      universalHoldingId: allocation.universalHoldingId,
      targetPercentage: Number(allocation.targetPercentage),
    });
    setIsAllocationDialogOpen(true);
  };

  const handleInlineAllocationEdit = (type: "planned" | "freelance", allocationId: string, currentValue: string) => {
    setInlineEditingAllocation({ id: allocationId, type });
    setInlineAllocationValue(currentValue);
  };

  const handleInlineAllocationCancel = () => {
    setInlineEditingAllocation(null);
    setInlineAllocationValue("");
  };

  const handleInlineAllocationSave = (allocationId: string, type: "planned" | "freelance", currentValue: number) => {
    const trimmedValue = inlineAllocationValue.trim();
    
    if (trimmedValue === "") {
      handleInlineAllocationCancel();
      return;
    }
    
    const targetPct = parseFloat(trimmedValue);
    if (isNaN(targetPct)) {
      toast({
        title: "Invalid Value",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      setInlineAllocationValue(currentValue.toString());
      return;
    }
    
    if (targetPct <= 0 || targetPct > 100) {
      toast({
        title: "Invalid Value",
        description: "Percentage must be between 0 and 100",
        variant: "destructive",
      });
      setInlineAllocationValue(currentValue.toString());
      return;
    }
    
    if (Math.abs(targetPct - currentValue) < 0.01) {
      handleInlineAllocationCancel();
      return;
    }
    
    if (type === "planned") {
      updatePlannedAllocationMutation.mutate(
        { id: allocationId, data: { targetPercentage: targetPct } },
        {
          onSuccess: () => {
            setInlineEditingAllocation(null);
            setInlineAllocationValue("");
          },
        }
      );
    } else {
      updateFreelanceAllocationMutation.mutate(
        { id: allocationId, data: { targetPercentage: targetPct } },
        {
          onSuccess: () => {
            setInlineEditingAllocation(null);
            setInlineAllocationValue("");
          },
        }
      );
    }
  };

  const togglePlannedPortfolio = (portfolioId: string) => {
    setOpenPlannedPortfolios(prev => {
      const next = new Set(prev);
      if (next.has(portfolioId)) {
        next.delete(portfolioId);
      } else {
        next.add(portfolioId);
      }
      return next;
    });
  };

  const toggleFreelancePortfolio = (portfolioId: string) => {
    setOpenFreelancePortfolios(prev => {
      const next = new Set(prev);
      if (next.has(portfolioId)) {
        next.delete(portfolioId);
      } else {
        next.add(portfolioId);
      }
      return next;
    });
  };

  const riskLevelOrder = { low: 1, low_medium: 2, medium: 3, medium_high: 4, high: 5 };
  const categoryOrder: Record<string, number> = { basket_etf: 1, single_etf: 2, double_long_etf: 3, security: 4, auto_added: 5, misc: 6 };

  const handleHoldingsSort = (column: typeof holdingsSortColumn) => {
    if (holdingsSortColumn === column) {
      setHoldingsSortDirection(holdingsSortDirection === "asc" ? "desc" : "asc");
    } else {
      setHoldingsSortColumn(column);
      setHoldingsSortDirection("asc");
    }
  };

  const SortableHeader = ({ column, children }: { column: typeof holdingsSortColumn; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover-elevate select-none" 
      onClick={() => handleHoldingsSort(column)}
      data-testid={`sort-${column}`}
    >
      <div className="flex items-center gap-1">
        {children}
        {holdingsSortColumn === column ? (
          holdingsSortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  const filteredHoldings = holdings
    .filter(
      (h) => (h.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || 
             h.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
             (categoryFilter === "all" || h.category === categoryFilter)
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (holdingsSortColumn) {
        case "ticker":
          comparison = a.ticker.localeCompare(b.ticker);
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "category":
          comparison = categoryOrder[a.category] - categoryOrder[b.category];
          break;
        case "riskLevel":
          comparison = riskLevelOrder[a.riskLevel] - riskLevelOrder[b.riskLevel];
          break;
        case "price":
          comparison = Number(a.price) - Number(b.price);
          break;
        case "dividendRate":
          comparison = Number(a.dividendRate) - Number(b.dividendRate);
          break;
      }
      return holdingsSortDirection === "asc" ? comparison : -comparison;
    });

  const filteredPlannedPortfolios = plannedPortfolios.filter(
    (p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFreelancePortfolios = freelancePortfolios.filter(
    (p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="loading-state">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Model Portfolios</h1>
          <p className="text-muted-foreground">Manage your universal holdings and portfolio templates</p>
        </div>
        {activeTab === "holdings" && (
          <div className="flex items-center gap-2">
            {/* Hidden for future use: Refresh Prices button
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refreshPricesMutation.mutate()}
              disabled={refreshPricesMutation.isPending}
              data-testid="button-refresh-prices"
            >
              {refreshPricesMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Prices
            </Button>
            */}
            <Dialog open={isHoldingDialogOpen} onOpenChange={(open) => {
              setIsHoldingDialogOpen(open);
              if (!open) {
                setEditingHolding(null);
                holdingForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-holding">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Holding
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingHolding ? "Edit Holding" : "Add Universal Holding"}</DialogTitle>
                <DialogDescription>
                  {editingHolding ? "Update the holding details" : "Add a new ETF or security to your universal holdings library"}
                </DialogDescription>
              </DialogHeader>
              <Form {...holdingForm}>
                <form onSubmit={holdingForm.handleSubmit(onHoldingSubmit)} className="space-y-4">
                  <FormField
                    control={holdingForm.control}
                    name="ticker"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ticker Symbol</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="e.g. VFV.TO" {...field} data-testid="input-ticker" />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={lookupTicker}
                            disabled={isLookingUpTicker}
                            data-testid="button-lookup-ticker"
                          >
                            {isLookingUpTicker ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={holdingForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Vanguard S&P 500 Index ETF" {...field} data-testid="input-holding-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={holdingForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="basket_etf">CC Basket ETFs</SelectItem>
                              <SelectItem value="single_etf">Single ETFs</SelectItem>
                              <SelectItem value="double_long_etf">Double Long ETFs</SelectItem>
                              <SelectItem value="security">Securities</SelectItem>
                              <SelectItem value="auto_added">Auto Added</SelectItem>
                              <SelectItem value="misc">Misc.</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={holdingForm.control}
                      name="riskLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Risk Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-risk-level">
                                <SelectValue placeholder="Select risk" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="low_medium">Low-Medium</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="medium_high">Medium-High</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {/* Hidden for future use: Dividend fields
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={holdingForm.control}
                      name="dividendRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dividend Rate (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} data-testid="input-dividend-rate" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={holdingForm.control}
                      name="dividendPayout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payout Frequency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-dividend-payout">
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                              <SelectItem value="annual">Annual</SelectItem>
                              <SelectItem value="none">None</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  */}
                  <FormField
                    control={holdingForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Brief description..." {...field} data-testid="input-holding-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    {!editingHolding && (
                      <Button 
                        type="button" 
                        variant="outline"
                        className="flex-1" 
                        disabled={createHoldingMutation.isPending}
                        onClick={() => {
                          setSaveAndAddAnother(true);
                          holdingForm.handleSubmit(onHoldingSubmit)();
                        }}
                        data-testid="button-save-add-another"
                      >
                        {createHoldingMutation.isPending && saveAndAddAnother ? "Saving..." : "Save & Add Another"}
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      className={editingHolding ? "w-full" : "flex-1"} 
                      disabled={createHoldingMutation.isPending || updateHoldingMutation.isPending} 
                      data-testid="button-submit-holding"
                    >
                      {(createHoldingMutation.isPending && !saveAndAddAnother) || updateHoldingMutation.isPending 
                        ? "Saving..." 
                        : (editingHolding ? "Update Holding" : "Add Holding")}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="holdings" data-testid="tab-holdings">Universal Holdings</TabsTrigger>
            <TabsTrigger value="planned" data-testid="tab-planned">Planned Portfolios</TabsTrigger>
            <TabsTrigger value="freelance" data-testid="tab-freelance">Freelance Portfolios</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-[200px]"
                data-testid="input-search"
              />
            </div>
            {activeTab === "holdings" && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="basket_etf">CC Basket ETFs</SelectItem>
                  <SelectItem value="single_etf">Single ETFs</SelectItem>
                  <SelectItem value="double_long_etf">Double Long ETFs</SelectItem>
                  <SelectItem value="security">Securities</SelectItem>
                  <SelectItem value="auto_added">Auto Added</SelectItem>
                  <SelectItem value="misc">Misc.</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <TabsContent value="holdings" className="space-y-4">
          {holdingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredHoldings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {searchQuery ? "No holdings match your search" : "No universal holdings yet. Add your first holding to get started."}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader column="ticker">Ticker</SortableHeader>
                    <SortableHeader column="name">Name</SortableHeader>
                    <SortableHeader column="category">Category</SortableHeader>
                    {/* Hidden for future use: Price and Dividend columns
                    <SortableHeader column="price">Price</SortableHeader>
                    <SortableHeader column="dividendRate">Dividend</SortableHeader>
                    <TableHead>Payout</TableHead>
                    */}
                    <SortableHeader column="riskLevel">Risk</SortableHeader>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHoldings.map((holding) => (
                    <TableRow key={holding.id} data-testid={`row-holding-${holding.id}`}>
                      <TableCell 
                        className="font-mono font-semibold cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleEditHolding(holding)}
                        data-testid={`text-ticker-${holding.id}`}
                      >
                        {holding.ticker}
                      </TableCell>
                      <TableCell>{holding.name}</TableCell>
                      <TableCell>
                        <Badge className={categoryColors[holding.category]}>
                          {categoryLabels[holding.category]}
                        </Badge>
                      </TableCell>
                      {/* Hidden for future use: Price and Dividend data cells
                      <TableCell className="text-right">
                        <div className="font-mono">
                          CA${Number(holding.price).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {holding.priceUpdatedAt && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(holding.priceUpdatedAt).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(holding.dividendRate).toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{dividendPayoutLabels[holding.dividendPayout]}</Badge>
                      </TableCell>
                      */}
                      <TableCell>
                        <Badge className={riskLevelColors[holding.riskLevel]}>
                          {riskLevelLabels[holding.riskLevel]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditHolding(holding)} data-testid={`button-edit-holding-${holding.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" data-testid={`button-delete-holding-${holding.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Holding</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {holding.ticker}? This will also remove it from any portfolios that include this holding.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteHoldingMutation.mutate(holding.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="planned" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isPlannedDialogOpen} onOpenChange={setIsPlannedDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-planned-portfolio">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Planned Portfolio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Planned Portfolio</DialogTitle>
                  <DialogDescription>
                    Create a reusable portfolio template with target allocations
                  </DialogDescription>
                </DialogHeader>
                <Form {...portfolioForm}>
                  <form onSubmit={portfolioForm.handleSubmit(onPlannedPortfolioSubmit)} className="space-y-4">
                    <FormField
                      control={portfolioForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portfolio Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Conservative Growth" {...field} data-testid="input-portfolio-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={portfolioForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief description..." {...field} data-testid="input-portfolio-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={createPlannedPortfolioMutation.isPending} data-testid="button-submit-planned">
                      {createPlannedPortfolioMutation.isPending ? "Creating..." : "Create Portfolio"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {plannedLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredPlannedPortfolios.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {searchQuery ? "No portfolios match your search" : "No planned portfolios yet. Create your first portfolio template."}
              </CardContent>
            </Card>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePlannedDragEnd}>
              <SortableContext items={filteredPlannedPortfolios.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div className="grid gap-4">
                  {filteredPlannedPortfolios.map((portfolio) => {
                    const totalAllocation = portfolio.allocations.reduce((sum, a) => sum + Number(a.targetPercentage), 0);
                    const isOpen = openPlannedPortfolios.has(portfolio.id);
                    return (
                      <SortablePlannedPortfolioCard
                        key={portfolio.id}
                        portfolio={portfolio}
                        totalAllocation={totalAllocation}
                        isOpen={isOpen}
                        onToggle={() => togglePlannedPortfolio(portfolio.id)}
                        onDelete={() => deletePlannedPortfolioMutation.mutate(portfolio.id)}
                        onEdit={() => setEditingPlannedPortfolio({ id: portfolio.id, name: portfolio.name, description: portfolio.description || "" })}
                        onAddAllocation={() => handleAddAllocation("planned", portfolio.id)}
                        inlineEditingAllocation={inlineEditingAllocation}
                        inlineAllocationValue={inlineAllocationValue}
                        setInlineAllocationValue={setInlineAllocationValue}
                        handleInlineAllocationSave={handleInlineAllocationSave}
                        handleInlineAllocationCancel={handleInlineAllocationCancel}
                        handleInlineAllocationEdit={handleInlineAllocationEdit}
                        deletePlannedAllocationMutation={deletePlannedAllocationMutation}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Edit Planned Portfolio Dialog */}
          <Dialog open={!!editingPlannedPortfolio} onOpenChange={(open) => !open && setEditingPlannedPortfolio(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Portfolio</DialogTitle>
                <DialogDescription>
                  Update the portfolio name and description
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Portfolio Name</label>
                  <Input
                    value={editingPlannedPortfolio?.name || ""}
                    onChange={(e) => setEditingPlannedPortfolio(prev => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="Portfolio name"
                    data-testid="input-edit-planned-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editingPlannedPortfolio?.description || ""}
                    onChange={(e) => setEditingPlannedPortfolio(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Brief description..."
                    data-testid="input-edit-planned-description"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (editingPlannedPortfolio) {
                      updatePlannedPortfolioMutation.mutate({
                        id: editingPlannedPortfolio.id,
                        data: { name: editingPlannedPortfolio.name, description: editingPlannedPortfolio.description }
                      });
                    }
                  }}
                  disabled={updatePlannedPortfolioMutation.isPending || !editingPlannedPortfolio?.name}
                  data-testid="button-save-planned-portfolio"
                >
                  {updatePlannedPortfolioMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="freelance" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isFreelanceDialogOpen} onOpenChange={setIsFreelanceDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-freelance-portfolio">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Freelance Portfolio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Freelance Portfolio</DialogTitle>
                  <DialogDescription>
                    Create a custom one-off portfolio for specific client situations
                  </DialogDescription>
                </DialogHeader>
                <Form {...portfolioForm}>
                  <form onSubmit={portfolioForm.handleSubmit(onFreelancePortfolioSubmit)} className="space-y-4">
                    <FormField
                      control={portfolioForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portfolio Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Client Smith Custom" {...field} data-testid="input-freelance-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={portfolioForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief description..." {...field} data-testid="input-freelance-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={createFreelancePortfolioMutation.isPending} data-testid="button-submit-freelance">
                      {createFreelancePortfolioMutation.isPending ? "Creating..." : "Create Portfolio"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {freelanceLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredFreelancePortfolios.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {searchQuery ? "No portfolios match your search" : "No freelance portfolios yet. Create your first custom portfolio."}
              </CardContent>
            </Card>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFreelanceDragEnd}>
              <SortableContext items={filteredFreelancePortfolios.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div className="grid gap-4">
                  {filteredFreelancePortfolios.map((portfolio) => {
                    const totalAllocation = portfolio.allocations.reduce((sum, a) => sum + Number(a.targetPercentage), 0);
                    const isOpen = openFreelancePortfolios.has(portfolio.id);
                    return (
                      <SortableFreelancePortfolioCard
                        key={portfolio.id}
                        portfolio={portfolio}
                        totalAllocation={totalAllocation}
                        isOpen={isOpen}
                        onToggle={() => toggleFreelancePortfolio(portfolio.id)}
                        onDelete={() => deleteFreelancePortfolioMutation.mutate(portfolio.id)}
                        onEdit={() => setEditingFreelancePortfolio({ id: portfolio.id, name: portfolio.name, description: portfolio.description || "" })}
                        onAddAllocation={() => handleAddAllocation("freelance", portfolio.id)}
                        inlineEditingAllocation={inlineEditingAllocation}
                        inlineAllocationValue={inlineAllocationValue}
                        setInlineAllocationValue={setInlineAllocationValue}
                        handleInlineAllocationSave={handleInlineAllocationSave}
                        handleInlineAllocationCancel={handleInlineAllocationCancel}
                        handleInlineAllocationEdit={handleInlineAllocationEdit}
                        deleteFreelanceAllocationMutation={deleteFreelanceAllocationMutation}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Edit Freelance Portfolio Dialog */}
          <Dialog open={!!editingFreelancePortfolio} onOpenChange={(open) => !open && setEditingFreelancePortfolio(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Portfolio</DialogTitle>
                <DialogDescription>
                  Update the portfolio name and description
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Portfolio Name</label>
                  <Input
                    value={editingFreelancePortfolio?.name || ""}
                    onChange={(e) => setEditingFreelancePortfolio(prev => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="Portfolio name"
                    data-testid="input-edit-freelance-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editingFreelancePortfolio?.description || ""}
                    onChange={(e) => setEditingFreelancePortfolio(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Brief description..."
                    data-testid="input-edit-freelance-description"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (editingFreelancePortfolio) {
                      updateFreelancePortfolioMutation.mutate({
                        id: editingFreelancePortfolio.id,
                        data: { name: editingFreelancePortfolio.name, description: editingFreelancePortfolio.description }
                      });
                    }
                  }}
                  disabled={updateFreelancePortfolioMutation.isPending || !editingFreelancePortfolio?.name}
                  data-testid="button-save-freelance-portfolio"
                >
                  {updateFreelancePortfolioMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      <Dialog open={isAllocationDialogOpen} onOpenChange={(open) => {
        setIsAllocationDialogOpen(open);
        if (!open) {
          setAllocationTarget(null);
          setEditingAllocation(null);
          allocationForm.reset();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAllocation ? "Edit Allocation" : "Add Allocation"}
              {allocationTarget && !editingAllocation && (() => {
                const portfolio = allocationTarget.type === "planned" 
                  ? plannedPortfolios.find(p => p.id === allocationTarget.portfolioId)
                  : freelancePortfolios.find(p => p.id === allocationTarget.portfolioId);
                return portfolio ? ` to "${portfolio.name}"` : "";
              })()}
            </DialogTitle>
            <DialogDescription>
              {editingAllocation ? "Update the target percentage for this holding" : "Select a holding and set the target percentage"}
            </DialogDescription>
          </DialogHeader>
          <Form {...allocationForm}>
            <form onSubmit={allocationForm.handleSubmit(onAllocationSubmit)} className="space-y-4">
              <FormField
                control={allocationForm.control}
                name="universalHoldingId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holding</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!editingAllocation}>
                      <FormControl>
                        <SelectTrigger data-testid="select-holding">
                          <SelectValue placeholder="Select a holding" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-80">
                        {holdingCategoryOrder.map((category) => {
                          const categoryHoldings = holdings.filter(h => h.category === category);
                          if (categoryHoldings.length === 0) return null;
                          return (
                            <SelectGroup key={category}>
                              <SelectLabel className="font-semibold text-xs uppercase tracking-wide text-muted-foreground px-2 py-1.5">
                                {holdingCategoryLabels[category]}
                              </SelectLabel>
                              {categoryHoldings.map((holding) => (
                                <SelectItem key={holding.id} value={holding.id}>
                                  <span className="font-mono">{holding.ticker}</span> - {holding.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={allocationForm.control}
                name="targetPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Percentage (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" max="100" placeholder="0.00" {...field} data-testid="input-target-percentage" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={createPlannedAllocationMutation.isPending || createFreelanceAllocationMutation.isPending || updatePlannedAllocationMutation.isPending || updateFreelanceAllocationMutation.isPending} data-testid="button-submit-allocation">
                  {(createPlannedAllocationMutation.isPending || createFreelanceAllocationMutation.isPending || updatePlannedAllocationMutation.isPending || updateFreelanceAllocationMutation.isPending) 
                    ? (editingAllocation ? "Saving..." : "Adding...") 
                    : (editingAllocation ? "Save Changes" : "Add Allocation")}
                </Button>
                {!editingAllocation && (
                  <Button 
                    type="button" 
                    variant="outline"
                    disabled={createPlannedAllocationMutation.isPending || createFreelanceAllocationMutation.isPending}
                    onClick={() => {
                      setAllocationSaveAndAddAnother(true);
                      allocationForm.handleSubmit(onAllocationSubmit)();
                    }}
                    data-testid="button-save-add-another-allocation"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Save & Add Another
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
