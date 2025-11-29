import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Save } from "lucide-react";
import { useLocation } from "wouter";

interface UniversalHolding {
  id: string;
  ticker: string;
  name: string;
  dividendRate: string;
  dividendYield: string;
  dividendPayout: string;
  price: string;
}

export default function AdminDividends() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ rate: string; yield: string }>({ rate: "", yield: "" });
  const { toast } = useToast();

  // Fetch all universal holdings
  const { data: holdings = [], isLoading } = useQuery({
    queryKey: ['/api/universal-holdings'],
    queryFn: async () => {
      const response = await fetch('/api/universal-holdings');
      if (!response.ok) throw new Error('Failed to fetch holdings');
      return response.json();
    },
  });

  // Update dividend mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, rate, yieldPercent }: { id: string; rate: string; yieldPercent: string }) => {
      return await apiRequest("PATCH", `/api/universal-holdings/${id}`, {
        dividendRate: rate,
        dividendYield: yieldPercent,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/universal-holdings'] });
      setEditingId(null);
      toast({
        title: "Updated",
        description: "Dividend data updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update dividend data",
        variant: "destructive",
      });
    },
  });

  const filtered = holdings.filter((h: UniversalHolding) =>
    h.ticker.toLowerCase().includes(search.toLowerCase()) ||
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (holding: UniversalHolding) => {
    setEditingId(holding.id);
    setEditValues({
      rate: holding.dividendRate,
      yield: holding.dividendYield,
    });
  };

  const handleSave = (id: string) => {
    updateMutation.mutate({
      id,
      rate: editValues.rate,
      yieldPercent: editValues.yield,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Admin - Dividend Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Update Dividend Data</CardTitle>
          <CardDescription>
            Manually update dividend rates and yields for tickers where Yahoo Finance data is incomplete.
            Common tickers: CRCY.TO, HODY.TO, RDDY.TO, SHPE.TO, SOFY.TO
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ticker or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
                data-testid="input-search-holdings"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading holdings...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No holdings found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Annual Dividend</TableHead>
                    <TableHead>Yield %</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((holding: UniversalHolding) => (
                    <TableRow key={holding.id} data-testid={`row-holding-${holding.ticker}`}>
                      <TableCell className="font-mono font-bold">{holding.ticker}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{holding.name}</TableCell>
                      <TableCell>${parseFloat(holding.price).toFixed(2)}</TableCell>
                      <TableCell>
                        {editingId === holding.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editValues.rate}
                            onChange={(e) =>
                              setEditValues({ ...editValues, rate: e.target.value })
                            }
                            className="w-20"
                            data-testid={`input-rate-${holding.id}`}
                          />
                        ) : (
                          `$${parseFloat(holding.dividendRate).toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === holding.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editValues.yield}
                            onChange={(e) =>
                              setEditValues({ ...editValues, yield: e.target.value })
                            }
                            className="w-20"
                            data-testid={`input-yield-${holding.id}`}
                          />
                        ) : (
                          `${parseFloat(holding.dividendYield).toFixed(2)}%`
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {holding.dividendPayout}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {editingId === holding.id ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSave(holding.id)}
                              disabled={updateMutation.isPending}
                              data-testid={`button-save-${holding.id}`}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingId(null)}
                              data-testid={`button-cancel-${holding.id}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(holding)}
                            data-testid={`button-edit-${holding.id}`}
                          >
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
