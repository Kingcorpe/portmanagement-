import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, ExternalLink } from "lucide-react";
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

interface HoldingSearchResult {
  householdName: string;
  householdCategory?: string;
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

interface Account {
  id: string;
  nickname?: string;
  type: string;
}

const HOUSEHOLD_CATEGORIES = [
  { value: "evergreen", label: "Evergreen" },
  { value: "anchor", label: "Anchor" },
  { value: "pulse", label: "Pulse" },
  { value: "emerging_pulse", label: "Emerging Pulse" },
  { value: "emerging_anchor", label: "Emerging Anchor" },
];

export default function HoldingsSearch() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTicker, setSearchTicker] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [minValue, setMinValue] = useState<string>("");
  const [maxValue, setMaxValue] = useState<string>("");
  const [selectedHolding, setSelectedHolding] = useState<HoldingSearchResult | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const { data: results = [], isLoading, isFetching } = useQuery<HoldingSearchResult[]>({
    queryKey: ['/api/holdings/search', searchTicker, category, minValue, maxValue],
    queryFn: async () => {
      const params = new URLSearchParams({
        ticker: searchTicker,
      });
      if (category) params.append('category', category);
      if (minValue) params.append('minValue', minValue);
      if (maxValue) params.append('maxValue', maxValue);

      const response = await fetch(`/api/holdings/search?${params.toString()}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
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

  const handleClearFilters = () => {
    setCategory("");
    setMinValue("");
    setMaxValue("");
  };

  const handleRowClick = (holding: HoldingSearchResult) => {
    setSelectedHolding(holding);
    // Infer account ID - we'll need to fetch it or use it directly
    setSelectedAccount({
      id: "", // Will be set from the holding's account context
      nickname: holding.accountNickname,
      type: holding.accountType,
    });
  };

  const handleViewFullAccount = () => {
    if (!selectedHolding) return;
    
    // Infer the account type and ID from the holding
    // The accountType tells us if it's individual/corporate/joint
    // We need to navigate to the account details page
    // For now, we'll close the modal and the user can navigate manually
    // But ideally we'd pass the account ID somehow
    
    toast({
      title: "Account Navigation",
      description: `To view the full account details for "${selectedHolding.accountNickname}", click the row again or navigate via the Households section.`,
    });
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
      <Card className="p-6 space-y-4">
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

        {/* Filters */}
        {hasSearched && (
          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Filters</p>
              {(category || minValue || maxValue) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Category Filter */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Household Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOUSEHOLD_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} data-testid={`option-category-${cat.value}`}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min Value Filter */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Min Value (CA$)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                  data-testid="input-min-value"
                  step="100"
                  min="0"
                />
              </div>

              {/* Max Value Filter */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Max Value (CA$)</label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                  data-testid="input-max-value"
                  step="100"
                  min="0"
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          {results.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No accounts found holding {searchTicker.toUpperCase()}</p>
              {(category || minValue || maxValue) && (
                <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
              )}
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
                        <th className="px-4 py-3 text-left font-semibold">Category</th>
                        <th className="px-4 py-3 text-left font-semibold">Owner</th>
                        <th className="px-4 py-3 text-left font-semibold">Account</th>
                        <th className="px-4 py-3 text-right font-semibold">Quantity</th>
                        <th className="px-4 py-3 text-right font-semibold">Price</th>
                        <th className="px-4 py-3 text-right font-semibold">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, idx) => (
                        <tr
                          key={idx}
                          className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleRowClick(result)}
                          data-testid={`row-holding-${idx}`}
                        >
                          <td className="px-4 py-3 font-medium" data-testid={`text-household-${idx}`}>{result.householdName}</td>
                          <td className="px-4 py-3 text-muted-foreground" data-testid={`text-category-${idx}`}>
                            {result.householdCategory
                              ? HOUSEHOLD_CATEGORIES.find((c) => c.value === result.householdCategory)?.label || result.householdCategory
                              : "-"}
                          </td>
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

      {/* Account Details Modal */}
      <Dialog open={!!selectedHolding} onOpenChange={(open) => !open && setSelectedHolding(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedHolding?.accountNickname}</DialogTitle>
            <DialogDescription>
              {selectedHolding?.ownerName} • {selectedHolding?.householdName}
            </DialogDescription>
          </DialogHeader>

          {selectedHolding && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Account Type</p>
                  <p className="font-medium capitalize">{selectedHolding.accountType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Owner Type</p>
                  <p className="font-medium">{selectedHolding.ownerType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Household</p>
                  <p className="font-medium">{selectedHolding.householdName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium">
                    {selectedHolding.householdCategory
                      ? HOUSEHOLD_CATEGORIES.find((c) => c.value === selectedHolding.householdCategory)?.label
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Holding Details</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Symbol:</span>
                      <span className="font-medium">{selectedHolding.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quantity:</span>
                      <span className="font-medium">{selectedHolding.quantity.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Price:</span>
                      <span className="font-medium">CA${selectedHolding.currentPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base">
                      <span>Total Value:</span>
                      <span>CA${selectedHolding.value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  setSelectedHolding(null);
                  toast({
                    title: "Navigate to Account",
                    description: `To view all holdings in this account, go to Households and select "${selectedHolding.ownerName}"`,
                  });
                }}
                data-testid="button-close-modal"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
