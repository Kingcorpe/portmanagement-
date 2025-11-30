import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, DollarSign, TrendingUp, FileText } from "lucide-react";
import type { InsuranceRevenue } from "@shared/schema";

const POLICY_TYPES = [
  "Life Insurance",
  "Health Insurance",
  "Disability Insurance",
  "Critical Illness",
  "Long-Term Care",
  "Travel Insurance",
  "Group Benefits",
  "Segregated Funds",
  "Annuities",
  "Other",
];

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned", color: "bg-blue-500" },
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "received", label: "Received", color: "bg-green-500" },
];

interface FormData {
  date: string;
  clientName: string;
  policyType: string;
  carrier: string;
  policyNumber: string;
  premium: string;
  commissionRate: string;
  commissionAmount: string;
  status: string;
  notes: string;
}

const initialFormData: FormData = {
  date: new Date().toISOString().split("T")[0],
  clientName: "",
  policyType: "",
  carrier: "",
  policyNumber: "",
  premium: "",
  commissionRate: "",
  commissionAmount: "",
  status: "pending",
  notes: "",
};

export default function InsuranceRevenuePage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<InsuranceRevenue | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

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

  const { data: entries = [], isLoading } = useQuery<InsuranceRevenue[]>({
    queryKey: ["/api/insurance-revenue"],
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

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest("POST", "/api/insurance-revenue", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance-revenue"] });
      toast({ title: "Success", description: "Entry created successfully" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create entry",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      await apiRequest("PATCH", `/api/insurance-revenue/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance-revenue"] });
      toast({ title: "Success", description: "Entry updated successfully" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update entry",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/insurance-revenue/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insurance-revenue"] });
      toast({ title: "Success", description: "Entry deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entry",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingEntry(null);
  };

  const handleEdit = (entry: InsuranceRevenue) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      clientName: entry.clientName,
      policyType: entry.policyType,
      carrier: entry.carrier || "",
      policyNumber: entry.policyNumber || "",
      premium: entry.premium,
      commissionRate: entry.commissionRate || "",
      commissionAmount: entry.commissionAmount,
      status: entry.status,
      notes: entry.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setEntryToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      deleteMutation.mutate(entryToDelete);
      setDeleteConfirmOpen(false);
      setEntryToDelete(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handlePremiumChange = (value: string) => {
    setFormData((prev) => {
      const premium = parseFloat(value) || 0;
      const rate = parseFloat(prev.commissionRate) || 0;
      const commission = rate > 0 ? ((premium * rate) / 100).toFixed(2) : prev.commissionAmount;
      return { ...prev, premium: value, commissionAmount: commission };
    });
  };

  const handleRateChange = (value: string) => {
    setFormData((prev) => {
      const rate = parseFloat(value) || 0;
      const premium = parseFloat(prev.premium) || 0;
      const commission = premium > 0 ? ((premium * rate) / 100).toFixed(2) : prev.commissionAmount;
      return { ...prev, commissionRate: value, commissionAmount: commission };
    });
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(num || 0);
  };

  const totalCommission = entries.reduce(
    (sum, e) => sum + (e.status === "received" ? parseFloat(e.commissionAmount) : 0),
    0
  );

  const pendingCommission = entries.reduce(
    (sum, e) => sum + (e.status === "pending" ? parseFloat(e.commissionAmount) : 0),
    0
  );

  const plannedCommission = entries.reduce(
    (sum, e) => sum + (e.status === "planned" ? parseFloat(e.commissionAmount) : 0),
    0
  );

  const totalPremium = entries.reduce(
    (sum, e) => sum + (e.status === "received" ? parseFloat(e.premium) : 0),
    0
  );

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-insurance-revenue">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text" data-testid="text-page-title">
            Insurance Revenue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your insurance commissions and revenue
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-entry">
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? "Edit Entry" : "Add Insurance Revenue Entry"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    data-testid="input-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  required
                  data-testid="input-client-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="policyType">Policy Type</Label>
                  <Select
                    value={formData.policyType}
                    onValueChange={(v) => setFormData({ ...formData, policyType: v })}
                  >
                    <SelectTrigger data-testid="select-policy-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {POLICY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carrier">Carrier/Company</Label>
                  <Input
                    id="carrier"
                    value={formData.carrier}
                    onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                    data-testid="input-carrier"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="policyNumber">Policy Number</Label>
                <Input
                  id="policyNumber"
                  value={formData.policyNumber}
                  onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                  data-testid="input-policy-number"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="premium">Monthly Premium ($)</Label>
                  <Input
                    id="premium"
                    type="number"
                    step="0.01"
                    value={formData.premium}
                    onChange={(e) => handlePremiumChange(e.target.value)}
                    required
                    data-testid="input-premium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    step="0.01"
                    value={formData.commissionRate}
                    onChange={(e) => handleRateChange(e.target.value)}
                    data-testid="input-commission-rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commissionAmount">Commission ($)</Label>
                  <Input
                    id="commissionAmount"
                    type="number"
                    step="0.01"
                    value={formData.commissionAmount}
                    onChange={(e) => setFormData({ ...formData, commissionAmount: e.target.value })}
                    required
                    data-testid="input-commission-amount"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  data-testid="input-notes"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {editingEntry ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-total-received">
              {formatCurrency(totalCommission)}
            </div>
            <p className="text-xs text-muted-foreground">From {formatCurrency(totalPremium)} in monthly premiums</p>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending">
              {formatCurrency(pendingCommission)}
            </div>
            <p className="text-xs text-muted-foreground">
              {entries.filter((e) => e.status === "pending").length} pending entries
            </p>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planned</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-planned">
              {formatCurrency(plannedCommission)}
            </div>
            <p className="text-xs text-muted-foreground">
              {entries.filter((e) => e.status === "planned").length} planned entries
            </p>
          </CardContent>
        </Card>

        <Card className="glow-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-entries">
              {entries.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {entries.filter((e) => e.status === "received").length} received
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Table */}
      <Card data-testid="card-revenue-table">
        <CardHeader>
          <CardTitle>Revenue Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No entries yet. Click "Add Entry" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Policy Type</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead className="text-right">Monthly Premium</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell className="font-medium">{entry.clientName}</TableCell>
                      <TableCell>{entry.policyType}</TableCell>
                      <TableCell>{entry.carrier || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.premium)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(entry.commissionAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.status === "received"
                              ? "default"
                              : entry.status === "pending"
                              ? "secondary"
                              : "outline"
                          }
                          className={entry.status === "planned" ? "border-blue-500 text-blue-600 dark:text-blue-400" : ""}
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(entry)}
                            data-testid={`button-edit-${entry.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(entry.id)}
                            data-testid={`button-delete-${entry.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
