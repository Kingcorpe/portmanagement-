import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, Shield, DollarSign, BarChart3, Clock, FileText, Upload, Eye, Download, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SimpleDocumentUploader } from "@/components/object-uploader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LibraryDocument } from "@shared/schema";

export default function LibraryStrategies() {
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
    queryKey: ['/api/library-documents/category', 'strategies'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/library-documents/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/library-documents/category', 'strategies'] });
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
    queryClient.invalidateQueries({ queryKey: ['/api/library-documents/category', 'strategies'] });
    toast({
      title: "Document uploaded",
      description: "Your strategy document has been added to the library.",
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

  const strategies = [
    {
      id: "dca",
      title: "Dollar-Cost Averaging (DCA)",
      icon: DollarSign,
      category: "Accumulation",
      difficulty: "Beginner",
      description: "A systematic investment approach that reduces timing risk.",
      content: `
**What is Dollar-Cost Averaging?**

Dollar-Cost Averaging (DCA) is an investment strategy where you invest a fixed amount of money at regular intervals, regardless of market conditions. This approach helps reduce the impact of volatility on the overall purchase.

**Key Benefits:**
- Reduces emotional decision-making
- Lowers average cost per share over time
- Removes the need to time the market
- Builds disciplined investing habits

**Implementation:**
1. Determine your investment amount and frequency (e.g., $500 monthly)
2. Select your target investments (ETFs, stocks, etc.)
3. Set up automatic contributions
4. Stay consistent regardless of market conditions

**Best Used For:**
- Long-term wealth accumulation
- RRSP and TFSA contributions
- Building positions in volatile markets
      `,
    },
    {
      id: "rebalancing",
      title: "Portfolio Rebalancing",
      icon: BarChart3,
      category: "Maintenance",
      difficulty: "Intermediate",
      description: "Maintaining your target asset allocation through periodic adjustments.",
      content: `
**What is Portfolio Rebalancing?**

Portfolio rebalancing is the process of realigning the weightings of assets in a portfolio to maintain the original desired level of asset allocation.

**When to Rebalance:**
- Calendar-based: Quarterly, semi-annually, or annually
- Threshold-based: When allocations drift beyond set limits (e.g., 5%)
- Hybrid approach: Calendar review with threshold triggers

**Rebalancing Methods:**
1. **Sell High, Buy Low**: Sell overweight assets and buy underweight ones
2. **New Cash Flow**: Direct new contributions to underweight assets
3. **Withdrawal Strategy**: Withdraw from overweight assets first

**Tax Considerations:**
- Use registered accounts (RRSP, TFSA) for frequent rebalancing
- Consider tax-loss harvesting opportunities
- Be mindful of capital gains in non-registered accounts
      `,
    },
    {
      id: "core-satellite",
      title: "Core-Satellite Strategy",
      icon: Target,
      category: "Allocation",
      difficulty: "Intermediate",
      description: "Combining passive core holdings with active satellite positions.",
      content: `
**What is Core-Satellite Strategy?**

This approach combines a stable core of diversified, low-cost investments with smaller satellite positions that aim for higher returns or specific objectives.

**Portfolio Structure:**
- **Core (60-80%)**: Broad market ETFs, index funds
- **Satellite (20-40%)**: Individual stocks, sector ETFs, alternative investments

**Benefits:**
- Reduces overall portfolio costs
- Provides market exposure while allowing for tactical opportunities
- Balances passive and active management

**Implementation Tips:**
1. Establish core with low-cost, diversified ETFs
2. Add satellites based on conviction and opportunity
3. Monitor satellite performance regularly
4. Rebalance when satellites drift from target allocation
      `,
    },
    {
      id: "dividend-growth",
      title: "Dividend Growth Investing",
      icon: TrendingUp,
      category: "Income",
      difficulty: "Intermediate",
      description: "Building wealth through companies with growing dividend payments.",
      content: `
**What is Dividend Growth Investing?**

A strategy focused on investing in companies that consistently increase their dividend payments over time, providing growing income and potential capital appreciation.

**Selection Criteria:**
- Dividend growth history (5+ years of increases)
- Payout ratio sustainability (typically under 60%)
- Strong free cash flow generation
- Competitive moat and market position

**Canadian Dividend Considerations:**
- Dividend tax credit advantages for eligible dividends
- Canadian Dividend Aristocrats list
- TFSA optimization for dividend income

**Building Your Portfolio:**
1. Start with established dividend growers
2. Diversify across sectors
3. Reinvest dividends for compounding
4. Monitor payout ratios and earnings growth
      `,
    },
    {
      id: "risk-parity",
      title: "Risk Parity",
      icon: Shield,
      category: "Risk Management",
      difficulty: "Advanced",
      description: "Allocating based on risk contribution rather than capital.",
      content: `
**What is Risk Parity?**

Risk parity is an approach that allocates portfolio weights based on the risk contribution of each asset class, rather than by dollar amount. The goal is to have each asset class contribute equally to portfolio volatility.

**Core Concepts:**
- Equal risk contribution from each asset class
- Often involves leveraging lower-volatility assets
- Focus on diversification of risk, not capital

**Typical Allocations:**
- Higher allocation to bonds (lower volatility)
- Lower allocation to equities (higher volatility)
- May include commodities and other alternatives

**Considerations:**
- Requires understanding of asset class volatility
- May involve leverage for optimal implementation
- Regular monitoring and adjustment needed
- Best suited for sophisticated investors
      `,
    },
    {
      id: "tax-loss-harvesting",
      title: "Tax-Loss Harvesting",
      icon: Clock,
      category: "Tax Optimization",
      difficulty: "Intermediate",
      description: "Strategically realizing losses to offset capital gains.",
      content: `
**What is Tax-Loss Harvesting?**

Tax-loss harvesting involves selling investments at a loss to offset capital gains taxes. The proceeds are typically reinvested in similar (but not identical) securities to maintain portfolio exposure.

**Key Rules in Canada:**
- Superficial loss rule: Cannot repurchase identical security within 30 days
- Losses can offset gains in the same year
- Unused losses can carry forward indefinitely

**Implementation Steps:**
1. Identify positions with unrealized losses
2. Consider tax impact and transaction costs
3. Sell losing position
4. Wait 30 days or purchase similar (not identical) security
5. Track adjusted cost base for future

**Best Practices:**
- Review portfolio before year-end
- Document all transactions
- Consider using ETFs from different providers as substitutes
- Factor in trading costs and bid-ask spreads
      `,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-library-strategies-title">Key Strategies</h1>
          <p className="text-muted-foreground">Investment strategies and approaches for portfolio management</p>
        </div>
      </div>

      <Tabs defaultValue="guides" className="w-full">
        <TabsList>
          <TabsTrigger value="guides" data-testid="tab-strategy-guides">Strategy Guides</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-strategy-documents">Strategy Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="guides" className="space-y-4 mt-4">
          <div className="grid gap-4">
            {strategies.map((strategy) => (
              <Card key={strategy.id} data-testid={`card-strategy-${strategy.id}`}>
                <Accordion type="single" collapsible>
                  <AccordionItem value={strategy.id} className="border-none">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-start gap-4 text-left">
                        <div className="p-2 rounded-md bg-primary/10">
                          <strategy.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{strategy.title}</h3>
                            <Badge variant="secondary" className="text-xs">{strategy.category}</Badge>
                            <Badge variant="outline" className="text-xs">{strategy.difficulty}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{strategy.description}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="pl-14 prose prose-sm dark:prose-invert max-w-none">
                        <div className="whitespace-pre-line text-sm text-muted-foreground">
                          {strategy.content.trim().split('\n').map((line, idx) => {
                            if (line.startsWith('**') && line.endsWith('**')) {
                              return <h4 key={idx} className="font-semibold text-foreground mt-4 mb-2">{line.replace(/\*\*/g, '')}</h4>;
                            }
                            if (line.startsWith('- ')) {
                              return <li key={idx} className="ml-4">{line.substring(2)}</li>;
                            }
                            if (line.match(/^\d+\./)) {
                              return <li key={idx} className="ml-4 list-decimal">{line.replace(/^\d+\.\s*/, '')}</li>;
                            }
                            return <p key={idx} className="mb-2">{line}</p>;
                          })}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-upload-strategy">
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Strategy Document
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Strategy Document</DialogTitle>
                </DialogHeader>
                <SimpleDocumentUploader
                  category="strategies"
                  onDocumentCreated={handleDocumentCreated}
                />
              </DialogContent>
            </Dialog>
          </div>

          {documentsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
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
                <Card key={doc.id} data-testid={`card-strategy-doc-${doc.id}`}>
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
                        <Badge variant="secondary">Strategy</Badge>
                        <Badge variant="outline">PDF</Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleViewDocument(doc)}
                          data-testid={`button-view-strategy-${doc.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDownloadDocument(doc)}
                          data-testid={`button-download-strategy-${doc.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-delete-strategy-${doc.id}`}>
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
                <h3 className="text-lg font-medium mb-2">No strategy documents uploaded yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Upload strategy documents to share with your team.
                </p>
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-upload-first-strategy">
                      <Plus className="h-4 w-4 mr-2" />
                      Upload Strategy Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Upload Strategy Document</DialogTitle>
                    </DialogHeader>
                    <SimpleDocumentUploader
                      category="strategies"
                      onDocumentCreated={handleDocumentCreated}
                    />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
