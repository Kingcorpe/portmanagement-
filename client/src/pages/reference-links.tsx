import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ReferenceLink } from "@shared/schema";
import moneytraxLogoUrl from "@assets/Screenshot 2025-11-30 at 16.45.34_1764546344244.png";

const ICON_OPTIONS: Record<string, string> = {
  moneytrax: "Bank/Finance",
  dollar: "Money",
  globe: "Web",
  briefcase: "Business",
  chart: "Chart",
  document: "Document",
  settings: "Settings",
  link: "Link",
};

const ICON_EMOJIS: Record<string, string> = {
  moneytrax: "",
  dollar: "",
  globe: "",
  briefcase: "",
  chart: "",
  document: "",
  settings: "",
  link: "",
};

function getIconForKey(iconKey: string | null | undefined): JSX.Element {
  switch (iconKey) {
    case "moneytrax":
      return <span className="text-2xl text-blue-600 dark:text-blue-400">$</span>;
    case "dollar":
      return <span className="text-2xl text-green-600 dark:text-green-400">$</span>;
    case "globe":
      return <span className="text-2xl text-blue-500 dark:text-blue-300">@</span>;
    case "briefcase":
      return <span className="text-2xl text-amber-600 dark:text-amber-400">#</span>;
    case "chart":
      return <span className="text-2xl text-purple-600 dark:text-purple-400">^</span>;
    case "document":
      return <span className="text-2xl text-gray-600 dark:text-gray-400">~</span>;
    case "settings":
      return <span className="text-2xl text-gray-500 dark:text-gray-300">*</span>;
    default:
      return <span className="text-2xl text-blue-600 dark:text-blue-400">-</span>;
  }
}

export default function ReferenceLinksPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ReferenceLink | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", url: "", description: "", icon: "link" });

  const { data: links = [], isLoading } = useQuery<ReferenceLink[]>({
    queryKey: ["/api/reference-links"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/reference-links", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reference-links"] });
      setDialogOpen(false);
      resetForm();
      toast({ description: "Link added successfully" });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to add link", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/reference-links/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reference-links"] });
      setDialogOpen(false);
      resetForm();
      toast({ description: "Link updated successfully" });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to update link", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/reference-links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reference-links"] });
      setDeleteConfirmOpen(false);
      setLinkToDelete(null);
      toast({ description: "Link deleted successfully" });
    },
    onError: (error: any) => {
      toast({ description: error.message || "Failed to delete link", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ title: "", url: "", description: "", icon: "link" });
    setEditingLink(null);
  };

  const handleAddClick = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (link: ReferenceLink) => {
    setEditingLink(link);
    setFormData({
      title: link.title,
      url: link.url,
      description: link.description || "",
      icon: link.icon || "link",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setLinkToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (linkToDelete) {
      deleteMutation.mutate(linkToDelete);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.url) {
      toast({
        description: "Title and URL are required",
        variant: "destructive",
      });
      return;
    }

    if (editingLink) {
      updateMutation.mutate({ id: editingLink.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const allLinks = [
    {
      id: "moneytrax-default",
      title: "MoneyTrax Members",
      url: "https://members.moneytrax.com/",
      description: "Access MoneyTrax member portal for financial management",
      imageUrl: moneytraxLogoUrl,
      isDefault: true,
    },
    ...links.map((l) => ({ ...l, isDefault: false })),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading links...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-reference-links">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text" data-testid="text-page-title">
            Reference Links
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quick access to important resources and tools
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleAddClick} data-testid="button-add-link">
              <Plus className="h-4 w-4 mr-2" />
              Add Link
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingLink ? "Edit Reference Link" : "Add Reference Link"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., MoneyTrax Members"
                  data-testid="input-title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com"
                  data-testid="input-url"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <select
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  data-testid="select-icon"
                >
                  {Object.entries(ICON_OPTIONS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the link"
                  data-testid="input-description"
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
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingLink
                    ? "Update"
                    : "Add"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allLinks.map((link) => (
          <Card key={link.id} className="hover-elevate transition-all glow-border holo-card" data-testid={`card-link-${link.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {link.imageUrl ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 hover:opacity-80 transition-opacity"
                      data-testid={`link-logo-${link.id}`}
                    >
                      <img 
                        src={link.imageUrl} 
                        alt={link.title}
                        className="h-12 w-auto object-contain"
                        data-testid={`img-logo-${link.id}`}
                      />
                    </a>
                  ) : (
                    <div className="flex-shrink-0">
                      {getIconForKey((link as any).icon)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{link.title}</CardTitle>
                  </div>
                </div>
                {!link.isDefault && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(link as ReferenceLink)}
                      data-testid={`button-edit-${link.id}`}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(link.id)}
                      data-testid={`button-delete-${link.id}`}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">{link.description}</p>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                data-testid={`link-${link.id}`}
              >
                Open Link
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this link? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
