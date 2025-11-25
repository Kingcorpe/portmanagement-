import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LibraryReports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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

  const exampleReports = [
    {
      id: "1",
      title: "Quarterly Portfolio Review Template",
      description: "A comprehensive template for reviewing portfolio performance on a quarterly basis.",
      category: "Performance",
      format: "PDF",
    },
    {
      id: "2",
      title: "Asset Allocation Summary",
      description: "Template for summarizing asset allocation across client portfolios.",
      category: "Allocation",
      format: "Excel",
    },
    {
      id: "3",
      title: "Tax Loss Harvesting Report",
      description: "Report template for identifying tax loss harvesting opportunities.",
      category: "Tax",
      format: "PDF",
    },
    {
      id: "4",
      title: "Client Onboarding Checklist",
      description: "Comprehensive checklist for new client account setup and documentation.",
      category: "Operations",
      format: "PDF",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-library-reports-title">Example Reports</h1>
        <p className="text-muted-foreground">Templates and sample reports for portfolio management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {exampleReports.map((report) => (
          <Card key={report.id} data-testid={`card-report-${report.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <CardDescription className="mt-1">{report.description}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Badge variant="secondary">{report.category}</Badge>
                  <Badge variant="outline">{report.format}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" data-testid={`button-view-report-${report.id}`}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" data-testid={`button-download-report-${report.id}`}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            More report templates coming soon.<br />
            Check back for updates or request specific templates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
