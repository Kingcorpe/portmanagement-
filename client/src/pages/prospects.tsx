import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  Clock,
  TrendingUp,
  ShieldCheck,
  PiggyBank,
  Building,
  Briefcase,
  GraduationCap,
  MessageSquare,
  ExternalLink,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
  Filter,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type Prospect = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  preferredContact: string;
  interestType: string;
  estimatedAssets: string | null;
  currentlyWorkingWithAdvisor: boolean;
  bestTimeToContact: string | null;
  urgency: string | null;
  goals: string | null;
  questions: string | null;
  referralSource: string;
  referredBy: string | null;
  status: string;
  followUpDate: string | null;
  lastContactedAt: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProspectStats = {
  total: number;
  new: number;
  contacted: number;
  scheduled: number;
  inProgress: number;
  qualified: number;
  converted: number;
  notQualified: number;
  archived: number;
};

const statusOptions = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "scheduled", label: "Scheduled", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "in_progress", label: "In Progress", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "qualified", label: "Qualified", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "converted", label: "Converted", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "not_qualified", label: "Not Qualified", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "archived", label: "Archived", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

const interestLabels: Record<string, { label: string; icon: typeof TrendingUp }> = {
  wealth_management: { label: "Wealth Management", icon: TrendingUp },
  retirement_planning: { label: "Retirement Planning", icon: PiggyBank },
  tax_planning: { label: "Tax Planning", icon: Building },
  insurance: { label: "Insurance", icon: ShieldCheck },
  estate_planning: { label: "Estate Planning", icon: Briefcase },
  education_savings: { label: "Education Savings", icon: GraduationCap },
  general_consultation: { label: "General Consultation", icon: MessageSquare },
  other: { label: "Other", icon: MessageSquare },
};

const urgencyLabels: Record<string, string> = {
  immediate: "As soon as possible",
  within_month: "Within the next month",
  exploring: "Just exploring",
};

export default function ProspectsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");

  // Fetch prospects
  const { data: prospects = [], isLoading } = useQuery<Prospect[]>({
    queryKey: ["/api/prospects"],
  });

  // Fetch stats
  const { data: stats } = useQuery<ProspectStats>({
    queryKey: ["/api/prospects/stats/summary"],
  });

  // Update prospect mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Prospect> }) => {
      const response = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update prospect");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prospects/stats/summary"] });
      toast({ title: "Prospect updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update prospect", variant: "destructive" });
    },
  });

  // Delete prospect mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/prospects/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete prospect");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prospects/stats/summary"] });
      toast({ title: "Prospect deleted successfully" });
      setIsDetailOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to delete prospect", variant: "destructive" });
    },
  });

  // Filter prospects
  const filteredProspects = prospects.filter((prospect) => {
    const matchesSearch =
      searchQuery === "" ||
      `${prospect.firstName} ${prospect.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || prospect.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find((s) => s.value === status);
    return statusConfig ? (
      <Badge variant="outline" className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    ) : (
      <Badge variant="outline">{status}</Badge>
    );
  };

  const handleStatusChange = (prospectId: string, newStatus: string) => {
    updateMutation.mutate({
      id: prospectId,
      data: { status: newStatus as any },
    });
  };

  const handleSaveNotes = () => {
    if (selectedProspect) {
      updateMutation.mutate({
        id: selectedProspect.id,
        data: { internalNotes },
      });
    }
  };

  const openProspectDetail = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setInternalNotes(prospect.internalNotes || "");
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Prospects
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage prospect inquiries and intake forms
          </p>
        </div>
        <Button
          onClick={() => window.open("/intake", "_blank")}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          View Intake Form
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </Card>
          <Card className="p-4 border-blue-200 bg-blue-50/50">
            <div className="text-2xl font-bold text-blue-700">{stats.new}</div>
            <div className="text-xs text-blue-600">New</div>
          </Card>
          <Card className="p-4 border-yellow-200 bg-yellow-50/50">
            <div className="text-2xl font-bold text-yellow-700">{stats.contacted}</div>
            <div className="text-xs text-yellow-600">Contacted</div>
          </Card>
          <Card className="p-4 border-purple-200 bg-purple-50/50">
            <div className="text-2xl font-bold text-purple-700">{stats.scheduled}</div>
            <div className="text-xs text-purple-600">Scheduled</div>
          </Card>
          <Card className="p-4 border-orange-200 bg-orange-50/50">
            <div className="text-2xl font-bold text-orange-700">{stats.inProgress}</div>
            <div className="text-xs text-orange-600">In Progress</div>
          </Card>
          <Card className="p-4 border-emerald-200 bg-emerald-50/50">
            <div className="text-2xl font-bold text-emerald-700">{stats.qualified}</div>
            <div className="text-xs text-emerald-600">Qualified</div>
          </Card>
          <Card className="p-4 border-green-200 bg-green-50/50">
            <div className="text-2xl font-bold text-green-700">{stats.converted}</div>
            <div className="text-xs text-green-600">Converted</div>
          </Card>
          <Card className="p-4 border-gray-200 bg-gray-50/50">
            <div className="text-2xl font-bold text-gray-700">{stats.archived}</div>
            <div className="text-xs text-gray-600">Archived</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Prospects Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredProspects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <UserPlus className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No prospects yet</p>
              <p className="text-sm">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Share your intake form to start receiving inquiries"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProspects.map((prospect) => {
                  const interest = interestLabels[prospect.interestType] || interestLabels.other;
                  const InterestIcon = interest.icon;
                  return (
                    <TableRow
                      key={prospect.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openProspectDetail(prospect)}
                    >
                      <TableCell>
                        <div className="font-medium">
                          {prospect.firstName} {prospect.lastName}
                        </div>
                        {prospect.referredBy && (
                          <div className="text-xs text-muted-foreground">
                            Referred by {prospect.referredBy}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {prospect.email}
                        </div>
                        {prospect.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {prospect.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <InterestIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{interest.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(prospect.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(prospect.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {statusOptions.map((status) => (
                              <DropdownMenuItem
                                key={status.value}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(prospect.id, status.value);
                                }}
                              >
                                {status.label}
                                {prospect.status === status.value && (
                                  <CheckCircle className="h-4 w-4 ml-auto text-primary" />
                                )}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Are you sure you want to delete this prospect?")) {
                                  deleteMutation.mutate(prospect.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedProspect && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {selectedProspect.firstName[0]}{selectedProspect.lastName[0]}
                    </span>
                  </div>
                  <div>
                    {selectedProspect.firstName} {selectedProspect.lastName}
                    <div className="text-sm font-normal text-muted-foreground">
                      Submitted {format(new Date(selectedProspect.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <Label>Status</Label>
                  <Select
                    value={selectedProspect.status}
                    onValueChange={(value) => {
                      handleStatusChange(selectedProspect.id, value);
                      setSelectedProspect({ ...selectedProspect, status: value });
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${selectedProspect.email}`} className="text-primary hover:underline">
                        {selectedProspect.email}
                      </a>
                    </div>
                  </div>
                  {selectedProspect.phone && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Phone</Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${selectedProspect.phone}`} className="text-primary hover:underline">
                          {selectedProspect.phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Interest & Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Interest</Label>
                    <p className="font-medium">
                      {interestLabels[selectedProspect.interestType]?.label || "Other"}
                    </p>
                  </div>
                  {selectedProspect.estimatedAssets && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Estimated Assets</Label>
                      <p className="font-medium">{selectedProspect.estimatedAssets}</p>
                    </div>
                  )}
                </div>

                {selectedProspect.urgency && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Timeline</Label>
                    <p>{urgencyLabels[selectedProspect.urgency] || selectedProspect.urgency}</p>
                  </div>
                )}

                {selectedProspect.currentlyWorkingWithAdvisor && (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Currently working with another advisor</span>
                  </div>
                )}

                {/* Goals & Questions */}
                {selectedProspect.goals && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Goals</Label>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedProspect.goals}</p>
                  </div>
                )}

                {selectedProspect.questions && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Questions</Label>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedProspect.questions}</p>
                  </div>
                )}

                {/* Referral */}
                {selectedProspect.referredBy && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Referred By</Label>
                    <p>{selectedProspect.referredBy}</p>
                  </div>
                )}

                {/* Internal Notes */}
                <div className="space-y-2 pt-4 border-t">
                  <Label>Internal Notes</Label>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Add private notes about this prospect..."
                    rows={4}
                    className="resize-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={internalNotes === (selectedProspect.internalNotes || "")}
                    >
                      Save Notes
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this prospect?")) {
                        deleteMutation.mutate(selectedProspect.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Prospect
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <a href={`mailto:${selectedProspect.email}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </a>
                    </Button>
                    {selectedProspect.phone && (
                      <Button variant="outline" asChild>
                        <a href={`tel:${selectedProspect.phone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}



