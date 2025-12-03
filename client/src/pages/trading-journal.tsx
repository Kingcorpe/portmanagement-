import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, List, Clock, Link as LinkIcon, X, Eye, Edit, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { TradingJournalImageUploader, type UploadedImage } from "@/components/trading-journal-image-uploader";
import { RichNotesEditor } from "@/components/rich-notes-editor";
import { format, parseISO, startOfDay, isSameDay } from "date-fns";
import type { TradingJournalEntry, TradingJournalTag, Trade } from "@shared/schema";

type ViewMode = "list" | "timeline";

export default function TradingJournal() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selectedOutcome, setSelectedOutcome] = useState<string>("all");
  const [editingEntry, setEditingEntry] = useState<TradingJournalEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<TradingJournalEntry | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    symbol: "",
    notes: "",
    entryDate: format(new Date(), "yyyy-MM-dd"),
    convictionScore: 5,
    modelVersion: "",
    hypothesis: "",
    outcome: "pending" as "pending" | "win" | "loss" | "partial",
    realizedPnL: "",
    tradeId: "",
  });
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");

  const { data: entries = [], isLoading } = useQuery<TradingJournalEntry[]>({
    queryKey: ["/api/trading-journal/entries"],
  });

  const { data: tags = [], refetch: refetchTags } = useQuery<TradingJournalTag[]>({
    queryKey: ["/api/trading-journal/tags"],
  });

  const createTagMutation = useMutation({
    mutationFn: async (data: { name: string; color?: string }) => {
      const response = await apiRequest("POST", "/api/trading-journal/tags", data);
      return response.json();
    },
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-journal/tags"] });
      setTagDialogOpen(false);
      setNewTagName("");
      setNewTagColor("#3b82f6");
      // Automatically select the newly created tag
      setSelectedTagIds([...selectedTagIds, newTag.id]);
      toast({ description: "Tag created successfully" });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to create tag", variant: "destructive" });
    },
  });

  const { data: trades = [] } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/trading-journal/analytics"],
  });

  // Fetch entry details when viewing
  const { data: entryDetails } = useQuery({
    queryKey: ["/api/trading-journal/entries", viewingEntry?.id],
    queryFn: async () => {
      if (!viewingEntry?.id) return null;
      const response = await fetch(`/api/trading-journal/entries/${viewingEntry.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch entry");
      return response.json();
    },
    enabled: !!viewingEntry?.id,
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/trading-journal/entries", data);
      const entry = await response.json();
      
      // Add images
      for (const image of images) {
        await apiRequest("POST", `/api/trading-journal/entries/${entry.id}/images`, {
          objectPath: image.objectPath,
          fileName: image.fileName,
          fileSize: image.fileSize,
          mimeType: image.mimeType,
          caption: image.caption,
          sortOrder: image.sortOrder,
        });
      }
      
      // Add tags
      if (selectedTagIds.length > 0) {
        await apiRequest("POST", `/api/trading-journal/entries/${entry.id}/tags`, {
          tagIds: selectedTagIds,
        });
      }
      
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-journal/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trading-journal/analytics"] });
      setDialogOpen(false);
      resetForm();
      toast({ description: "Entry created successfully" });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to create entry", variant: "destructive" });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PUT", `/api/trading-journal/entries/${id}`, data);
      // Update tags separately
      if (selectedTagIds.length > 0 || true) {
        await apiRequest("POST", `/api/trading-journal/entries/${id}/tags`, {
          tagIds: selectedTagIds,
        });
      }
      const response = await apiRequest("GET", `/api/trading-journal/entries/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-journal/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trading-journal/analytics"] });
      setDialogOpen(false);
      resetForm();
      toast({ description: "Entry updated successfully" });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to update entry", variant: "destructive" });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/trading-journal/entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-journal/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trading-journal/analytics"] });
      setDeleteConfirmOpen(false);
      setEntryToDelete(null);
      toast({ description: "Entry deleted successfully" });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to delete entry", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      symbol: "",
      notes: "",
      entryDate: format(new Date(), "yyyy-MM-dd"),
      convictionScore: 5,
      modelVersion: "",
      hypothesis: "",
      outcome: "pending",
      realizedPnL: "",
      tradeId: "",
    });
    setImages([]);
    setSelectedTagIds([]);
    setEditingEntry(null);
  };

  const handleEdit = async (entry: TradingJournalEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      symbol: entry.symbol || "",
      notes: entry.notes || "",
      entryDate: format(new Date(entry.entryDate), "yyyy-MM-dd"),
      convictionScore: entry.convictionScore || 5,
      modelVersion: entry.modelVersion || "",
      hypothesis: entry.hypothesis || "",
      outcome: entry.outcome,
      realizedPnL: entry.realizedPnL || "",
      tradeId: entry.tradeId || "",
    });
    
    // Load entry details for tags and images
    try {
      const response = await fetch(`/api/trading-journal/entries/${entry.id}`, {
        credentials: "include",
      });
      if (response.ok) {
        const details = await response.json();
        // Load tags
        if (details.entryTags) {
          setSelectedTagIds(details.entryTags.map((et: any) => et.tagId));
        }
        // Load images
        if (details.images) {
          setImages(details.images.map((img: any) => ({
            id: img.id,
            objectPath: img.objectPath,
            fileName: img.fileName,
            fileSize: img.fileSize ? parseInt(img.fileSize) : undefined,
            mimeType: img.mimeType,
            caption: img.caption || "",
            sortOrder: img.sortOrder,
          })));
        }
      }
    } catch (error) {
      console.error("Error loading entry details:", error);
    }
    
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      convictionScore: formData.convictionScore || null,
      realizedPnL: formData.realizedPnL ? parseFloat(formData.realizedPnL) : null,
      entryDate: new Date(formData.entryDate),
      tradeId: formData.tradeId || null,
    };

    if (editingEntry) {
      await updateEntryMutation.mutateAsync({ id: editingEntry.id, data });
    } else {
      await createEntryMutation.mutateAsync(data);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (searchQuery && !entry.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !entry.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !entry.notes?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedSymbol !== "all" && entry.symbol !== selectedSymbol) return false;
    if (selectedOutcome !== "all" && entry.outcome !== selectedOutcome) return false;
    return true;
  });

  const symbols = Array.from(new Set(entries.map(e => e.symbol).filter(Boolean))) as string[];

  // Group entries by date for timeline view
  const entriesByDate = useMemo(() => {
    const grouped: Record<string, TradingJournalEntry[]> = {};
    filteredEntries.forEach((entry) => {
      const dateKey = format(new Date(entry.entryDate), "yyyy-MM-dd");
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    });
    return grouped;
  }, [filteredEntries]);

  const sortedDates = Object.keys(entriesByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Get linked trade details
  const getLinkedTrade = (tradeId: string | null | undefined) => {
    if (!tradeId) return null;
    return trades.find(t => t.id === tradeId);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Trading Journal</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEntry ? "Edit Entry" : "New Journal Entry"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Entry title"
                    required
                  />
                </div>
                <div>
                  <Label>Symbol</Label>
                  <Input
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    placeholder="Ticker symbol"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Entry Date</Label>
                  <Input
                    type="date"
                    value={formData.entryDate}
                    onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Link to Trade (Optional)</Label>
                  <Select
                    value={formData.tradeId}
                    onValueChange={(value) => {
                      setFormData({ ...formData, tradeId: value });
                      const trade = trades.find(t => t.id === value);
                      if (trade) {
                        setFormData(prev => ({
                          ...prev,
                          symbol: trade.symbol,
                          tradeId: value,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a trade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {trades.map((trade) => (
                        <SelectItem key={trade.id} value={trade.id}>
                          {trade.symbol} - {trade.action} {trade.quantity} @ ${trade.price} ({format(new Date(trade.executedAt), "MMM dd, yyyy")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <RichNotesEditor
                  value={formData.notes || ""}
                  onChange={(value) => setFormData({ ...formData, notes: value })}
                  placeholder="Add your notes..."
                />
              </div>

              <div>
                <Label>Conviction Score: {formData.convictionScore}/10</Label>
                <Slider
                  value={[formData.convictionScore]}
                  onValueChange={([value]) => setFormData({ ...formData, convictionScore: value })}
                  min={1}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Model Version</Label>
                  <Input
                    value={formData.modelVersion}
                    onChange={(e) => setFormData({ ...formData, modelVersion: e.target.value })}
                    placeholder="e.g., v1.0, Momentum 2.0"
                  />
                </div>
                <div>
                  <Label>Outcome</Label>
                  <Select
                    value={formData.outcome}
                    onValueChange={(value: any) => setFormData({ ...formData, outcome: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="win">Win</SelectItem>
                      <SelectItem value="loss">Loss</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Hypothesis</Label>
                <Textarea
                  value={formData.hypothesis}
                  onChange={(e) => setFormData({ ...formData, hypothesis: e.target.value })}
                  placeholder="Investment thesis..."
                  rows={3}
                />
              </div>

              {formData.outcome !== "pending" && (
                <div>
                  <Label>Realized P&L</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.realizedPnL}
                    onChange={(e) => setFormData({ ...formData, realizedPnL: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              )}

              <div>
                <Label>Images</Label>
                <TradingJournalImageUploader
                  images={images}
                  onImagesChange={setImages}
                  maxFiles={10}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Tags</Label>
                  <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Plus className="h-3 w-3 mr-1" />
                        Create Tag
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Tag</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Tag Name</Label>
                          <Input
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            placeholder="e.g., Momentum, Value"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newTagName.trim()) {
                                e.preventDefault();
                                createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor });
                              }
                            }}
                          />
                        </div>
                        <div>
                          <Label>Color</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="color"
                              value={newTagColor}
                              onChange={(e) => setNewTagColor(e.target.value)}
                              className="w-20 h-10"
                            />
                            <Input
                              value={newTagColor}
                              onChange={(e) => setNewTagColor(e.target.value)}
                              placeholder="#3b82f6"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setTagDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              if (newTagName.trim()) {
                                createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor });
                              }
                            }}
                            disabled={!newTagName.trim() || createTagMutation.isPending}
                          >
                            {createTagMutation.isPending ? "Creating..." : "Create Tag"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      style={tag.color && selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : undefined}
                      onClick={() => {
                        if (selectedTagIds.includes(tag.id)) {
                          setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id));
                        } else {
                          setSelectedTagIds([...selectedTagIds, tag.id]);
                        }
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createEntryMutation.isPending || updateEntryMutation.isPending}>
                  {createEntryMutation.isPending || updateEntryMutation.isPending ? "Saving..." : editingEntry ? "Update Entry" : "Save Entry"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalEntries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.winCount + analytics.lossCount > 0
                  ? `${Math.round((analytics.winCount / (analytics.winCount + analytics.lossCount)) * 100)}%`
                  : "N/A"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${analytics.totalRealizedPnL?.toFixed(2) || "0.00"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Conviction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.averageConvictionScore?.toFixed(1) || "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by symbol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Symbols</SelectItem>
            {symbols.map((symbol) => (
              <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedOutcome} onValueChange={setSelectedOutcome}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="win">Win</SelectItem>
            <SelectItem value="loss">Loss</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-2" />
              List
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === "list" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntries.map((entry) => {
            const linkedTrade = getLinkedTrade(entry.tradeId);
            return (
              <Card key={entry.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{entry.title}</CardTitle>
                    <Badge variant={
                      entry.outcome === "win" ? "default" :
                      entry.outcome === "loss" ? "destructive" :
                      entry.outcome === "partial" ? "secondary" : "outline"
                    }>
                      {entry.outcome}
                    </Badge>
                  </div>
                  {entry.symbol && (
                    <p className="text-sm text-muted-foreground">{entry.symbol}</p>
                  )}
                  {linkedTrade && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <LinkIcon className="h-3 w-3" />
                      <span>Linked to {linkedTrade.action} trade</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {format(new Date(entry.entryDate), "MMM dd, yyyy")}
                  </p>
                  {entry.convictionScore && (
                    <p className="text-sm">Conviction: {entry.convictionScore}/10</p>
                  )}
                  {entry.realizedPnL && (
                    <p className={`text-sm font-semibold ${
                      parseFloat(entry.realizedPnL) >= 0 ? "text-green-600" : "text-orange-600"
                    }`}>
                      P&L: ${parseFloat(entry.realizedPnL).toFixed(2)}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingEntry(entry)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(entry)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEntryToDelete(entry.id);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-8">
            {sortedDates.map((dateKey) => {
              const dateEntries = entriesByDate[dateKey];
              return (
                <div key={dateKey} className="relative pl-20">
                  <div className="absolute left-6 w-4 h-4 rounded-full border-4 border-background bg-primary z-10" />
                  <div className="font-semibold text-lg mb-4">
                    {format(new Date(dateKey), "EEEE, MMMM dd, yyyy")}
                  </div>
                  <div className="space-y-4">
                    {dateEntries.map((entry) => {
                      const linkedTrade = getLinkedTrade(entry.tradeId);
                      return (
                        <Card key={entry.id} className="ml-4">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">{entry.title}</CardTitle>
                                {entry.symbol && (
                                  <p className="text-sm text-muted-foreground mt-1">{entry.symbol}</p>
                                )}
                              </div>
                              <Badge variant={
                                entry.outcome === "win" ? "default" :
                                entry.outcome === "loss" ? "destructive" :
                                entry.outcome === "partial" ? "secondary" : "outline"
                              }>
                                {entry.outcome}
                              </Badge>
                            </div>
                            {linkedTrade && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                                <LinkIcon className="h-3 w-3" />
                                <span>Linked: {linkedTrade.action} {linkedTrade.quantity} @ ${linkedTrade.price}</span>
                              </div>
                            )}
                          </CardHeader>
                          <CardContent>
                            {entry.convictionScore && (
                              <p className="text-sm mb-2">Conviction: {entry.convictionScore}/10</p>
                            )}
                            {entry.modelVersion && (
                              <p className="text-sm text-muted-foreground mb-2">Model: {entry.modelVersion}</p>
                            )}
                            {entry.notes && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {entry.notes.split('\n')[0]}
                              </p>
                            )}
                            {entry.realizedPnL && (
                              <p className={`text-sm font-semibold ${
                                parseFloat(entry.realizedPnL) >= 0 ? "text-green-600" : "text-orange-600"
                              }`}>
                                P&L: ${parseFloat(entry.realizedPnL).toFixed(2)}
                              </p>
                            )}
                            <div className="flex gap-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingEntry(entry)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(entry)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Entry Detail Modal */}
      <Dialog open={!!viewingEntry} onOpenChange={(open) => !open && setViewingEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {entryDetails && (
            <>
              <DialogHeader>
                <DialogTitle>{entryDetails.title}</DialogTitle>
                <DialogDescription>
                  {format(new Date(entryDetails.entryDate), "MMMM dd, yyyy")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {entryDetails.symbol && (
                  <div>
                    <Label>Symbol</Label>
                    <p className="text-lg font-semibold">{entryDetails.symbol}</p>
                  </div>
                )}
                {entryDetails.trade && (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <LinkIcon className="h-4 w-4" />
                      <Label>Linked Trade</Label>
                    </div>
                    <p className="text-sm">
                      <Badge variant={entryDetails.trade.action === "BUY" ? "default" : "destructive"}>
                        {entryDetails.trade.action}
                      </Badge>
                      {" "}
                      {entryDetails.trade.quantity} shares @ ${entryDetails.trade.price}
                      {" "}
                      on {format(new Date(entryDetails.trade.executedAt), "MMM dd, yyyy")}
                    </p>
                  </div>
                )}
                {entryDetails.convictionScore && (
                  <div>
                    <Label>Conviction Score</Label>
                    <p className="text-lg">{entryDetails.convictionScore}/10</p>
                  </div>
                )}
                {entryDetails.modelVersion && (
                  <div>
                    <Label>Model Version</Label>
                    <p>{entryDetails.modelVersion}</p>
                  </div>
                )}
                {entryDetails.hypothesis && (
                  <div>
                    <Label>Hypothesis</Label>
                    <p className="whitespace-pre-wrap">{entryDetails.hypothesis}</p>
                  </div>
                )}
                {entryDetails.notes && (
                  <div>
                    <Label>Notes</Label>
                    <div className="whitespace-pre-wrap text-sm">{entryDetails.notes}</div>
                  </div>
                )}
                {entryDetails.entryTags && entryDetails.entryTags.length > 0 && (
                  <div>
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {entryDetails.entryTags.map((et: any) => (
                        <Badge key={et.tag.id} style={{ backgroundColor: et.tag.color || undefined }}>
                          {et.tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {entryDetails.images && entryDetails.images.length > 0 && (
                  <div>
                    <Label>Images</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                      {entryDetails.images.map((image: any) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.objectPath.startsWith('/') ? image.objectPath : `/objects/${image.objectPath}`}
                            alt={image.caption || image.fileName}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          {image.caption && (
                            <p className="text-xs text-muted-foreground mt-1">{image.caption}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {entryDetails.outcome && (
                  <div>
                    <Label>Outcome</Label>
                    <Badge variant={
                      entryDetails.outcome === "win" ? "default" :
                      entryDetails.outcome === "loss" ? "destructive" :
                      entryDetails.outcome === "partial" ? "secondary" : "outline"
                    }>
                      {entryDetails.outcome}
                    </Badge>
                  </div>
                )}
                {entryDetails.realizedPnL && (
                  <div>
                    <Label>Realized P&L</Label>
                    <p className={`text-lg font-semibold ${
                      parseFloat(entryDetails.realizedPnL) >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      ${parseFloat(entryDetails.realizedPnL).toFixed(2)}
                    </p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => {
                    if (viewingEntry) handleEdit(viewingEntry);
                    setViewingEntry(null);
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" onClick={() => setViewingEntry(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this journal entry and all its images. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (entryToDelete) {
                  deleteEntryMutation.mutate(entryToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      )}

      {!isLoading && filteredEntries.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No entries found. Create your first journal entry!
        </div>
      )}
    </div>
  );
}
