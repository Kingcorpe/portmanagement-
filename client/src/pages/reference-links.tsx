import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ExternalLink, Pencil, Trash2, DollarSign, Globe } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ReferenceLink {
  id: string;
  title: string;
  url: string;
  description: string;
  icon?: string;
}

const ICON_OPTIONS = {
  moneytrax: "🏦",
  dollar: "💰",
  globe: "🌐",
  briefcase: "💼",
  chart: "📊",
  document: "📄",
  settings: "⚙️",
  link: "🔗",
};

const INITIAL_LINKS: ReferenceLink[] = [
  {
    id: "1",
    title: "MoneyTrax Members",
    url: "https://members.moneytrax.com/",
    description: "Access MoneyTrax member portal for financial management",
    icon: "moneytrax",
  },
];

export default function ReferenceLinksPage() {
  const { toast } = useToast();
  const [links, setLinks] = useState<ReferenceLink[]>(INITIAL_LINKS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ReferenceLink | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", url: "", description: "", icon: "link" });

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
      description: link.description,
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
      setLinks(links.filter((l) => l.id !== linkToDelete));
      toast({ title: "Success", description: "Link deleted successfully" });
      setDeleteConfirmOpen(false);
      setLinkToDelete(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.url) {
      toast({
        title: "Error",
        description: "Title and URL are required",
        variant: "destructive",
      });
      return;
    }

    if (editingLink) {
      setLinks(links.map((l) => (l.id === editingLink.id ? { ...l, ...formData } : l)));
      toast({ title: "Success", description: "Link updated successfully" });
    } else {
      const newLink: ReferenceLink = {
        id: Date.now().toString(),
        ...formData,
      };
      setLinks([...links, newLink]);
      toast({ title: "Success", description: "Link added successfully" });
    }
    
    setDialogOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6" data-testid="page-reference-links">
      <div className="flex items-center justify-between">
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
                  <option value="link">🔗 Link</option>
                  <option value="moneytrax">🏦 Bank/Finance</option>
                  <option value="dollar">💰 Money</option>
                  <option value="globe">🌐 Web</option>
                  <option value="briefcase">💼 Business</option>
                  <option value="chart">📊 Chart</option>
                  <option value="document">📄 Document</option>
                  <option value="settings">⚙️ Settings</option>
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
                <Button type="submit" data-testid="button-submit">
                  {editingLink ? "Update" : "Add"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => {
          const iconEmoji = ICON_OPTIONS[link.icon as keyof typeof ICON_OPTIONS] || ICON_OPTIONS.link;
          return (
            <Card key={link.id} className="hover-elevate transition-all" data-testid={`card-link-${link.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="text-3xl flex-shrink-0">{iconEmoji}</div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{link.title}</CardTitle>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(link)}
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
          );
        })}
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
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
