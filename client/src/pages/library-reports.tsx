import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Eye, Upload, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { SimpleDocumentUploader } from "@/components/object-uploader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LibraryDocument } from "@shared/schema";

export default function LibraryReports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

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
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: documents = [], isLoading: documentsLoading } = useQuery<LibraryDocument[]>({
    queryKey: ['/api/library-documents/category', 'reports'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/library-documents/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/library-documents/category', 'reports'] });
      toast({
        title: "Document deleted",
        description: "The document has been removed from the library.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the document.",
        variant: "destructive",
      });
    },
  });

  const handleDocumentCreated = () => {
    setUploadDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/library-documents/category', 'reports'] });
    toast({
      title: "Document uploaded",
      description: "Your document has been added to the library.",
    });
  };

  const handleViewDocument = async (doc: LibraryDocument) => {
    try {
      const response = await fetch(doc.objectPath, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch document");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open document.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadDocument = async (doc: LibraryDocument) => {
    try {
      const response = await fetch(doc.objectPath, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch document");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.fileName || doc.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download document.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: Date | null) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-library-reports-title">Example Reports</h1>
          <p className="text-muted-foreground">Templates and sample reports for portfolio management</p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-report">
              <Plus className="h-4 w-4 mr-2" />
              Upload Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Report</DialogTitle>
            </DialogHeader>
            <SimpleDocumentUploader
              category="reports"
              onDocumentCreated={handleDocumentCreated}
            />
          </DialogContent>
        </Dialog>
      </div>

      {documentsLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-muted w-9 h-9"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-6 bg-muted rounded w-1/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : documents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {documents.map((doc) => (
            <Card key={doc.id} data-testid={`card-report-${doc.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{doc.title}</CardTitle>
                      <CardDescription className="mt-1">
                        Uploaded {formatDate(doc.createdAt)}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <Badge variant="secondary">Report</Badge>
                    <Badge variant="outline">PDF</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleViewDocument(doc)}
                      data-testid={`button-view-report-${doc.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDownloadDocument(doc)}
                      data-testid={`button-download-report-${doc.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-delete-report-${doc.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Document</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{doc.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(doc.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No reports uploaded yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Upload your first report to start building your library.
            </p>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-upload-first-report">
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Report
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Report</DialogTitle>
                </DialogHeader>
                <SimpleDocumentUploader
                  category="reports"
                  onDocumentCreated={handleDocumentCreated}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
