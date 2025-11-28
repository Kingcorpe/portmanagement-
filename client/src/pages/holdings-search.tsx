import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";

interface HoldingSearchResult {
  householdName: string;
  ownerName: string;
  ownerType: string;
  accountType: string;
  accountNickname: string;
  symbol: string;
  quantity: number;
  currentPrice: number;
  value: number;
  entryPrice: number;
}

export default function HoldingsSearch() {
  const { toast } = useToast();
  const [searchTicker, setSearchTicker] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const { data: results = [], isLoading, isFetching } = useQuery<HoldingSearchResult[]>({
    queryKey: ['/api/holdings/search', searchTicker],
    enabled: hasSearched && searchTicker.trim().length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTicker.trim()) {
      toast({
        title: "Error",
        description: "Please enter a ticker symbol",
        variant: "destructive",
      });
      return;
    }
    setHasSearched(true);
  };

  const totalValue = results.reduce((sum, r) => sum + r.value, 0);
  const totalQuantity = results.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Holdings Search</h1>
        <p className="text-muted-foreground mt-2">Find all accounts holding a specific ticker</p>
      </div>

      {/* Search Form */}
      <Card className="p-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter ticker (e.g., BANK.TO, AAPL)"
            value={searchTicker}
            onChange={(e) => setSearchTicker(e.target.value)}
            data-testid="input-ticker-search"
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || isFetching} data-testid="button-search-ticker">
            <Search className="w-4 h-4 mr-2" />
            {isLoading || isFetching ? "Searching..." : "Search"}
          </Button>
        </form>
      </Card>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          {results.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No accounts found holding {searchTicker.toUpperCase()}</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Total Holdings</div>
                  <div className="text-2xl font-bold">{results.length}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Total Quantity</div>
                  <div className="text-2xl font-bold">{totalQuantity.toLocaleString()}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Total Value</div>
                  <div className="text-2xl font-bold">CA${totalValue.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Household</th>
                        <th className="px-4 py-3 text-left font-semibold">Owner</th>
                        <th className="px-4 py-3 text-left font-semibold">Account</th>
                        <th className="px-4 py-3 text-right font-semibold">Quantity</th>
                        <th className="px-4 py-3 text-right font-semibold">Price</th>
                        <th className="px-4 py-3 text-right font-semibold">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3 font-medium" data-testid={`text-household-${idx}`}>{result.householdName}</td>
                          <td className="px-4 py-3" data-testid={`text-owner-${idx}`}>{result.ownerName}</td>
                          <td className="px-4 py-3 text-muted-foreground" data-testid={`text-account-${idx}`}>{result.accountNickname}</td>
                          <td className="px-4 py-3 text-right" data-testid={`text-quantity-${idx}`}>{result.quantity.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right" data-testid={`text-price-${idx}`}>CA${result.currentPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-semibold" data-testid={`text-value-${idx}`}>CA${result.value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
