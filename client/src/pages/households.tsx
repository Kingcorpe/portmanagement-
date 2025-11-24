import { HouseholdCard, Household } from "@/components/household-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

export default function Households() {
  const [searchQuery, setSearchQuery] = useState("");

  //todo: remove mock functionality
  const mockHouseholds: Household[] = [
    {
      id: "1",
      name: "Johnson Family",
      totalValue: 1450000,
      totalPerformance: 8.5,
      individuals: [
        {
          id: "ind-1",
          name: "Sarah Johnson",
          initials: "SJ",
          accounts: [
            { id: "acc-1", type: "tfsa", balance: 95000, performance: 12.3 },
            { id: "acc-2", type: "rrsp", balance: 285000, performance: 8.1 },
            { id: "acc-3", type: "cash", balance: 45000, performance: 2.5 },
          ]
        },
        {
          id: "ind-2",
          name: "David Johnson",
          initials: "DJ",
          accounts: [
            { id: "acc-4", type: "tfsa", balance: 88000, performance: 9.8 },
            { id: "acc-5", type: "rrsp", balance: 320000, performance: 11.2 },
            { id: "acc-6", type: "lira", balance: 125000, performance: 6.5 },
          ]
        }
      ],
      corporations: [
        {
          id: "corp-1",
          name: "Johnson Consulting Inc.",
          initials: "JC",
          accounts: [
            { id: "acc-7", type: "cash", balance: 280000, performance: 4.2 },
          ]
        }
      ],
      jointAccounts: [
        {
          id: "joint-1",
          type: "resp",
          balance: 125000,
          performance: 7.8,
          owners: ["ind-1", "ind-2"]
        },
        {
          id: "joint-2",
          type: "joint-cash",
          balance: 87000,
          performance: 2.1,
          owners: ["ind-1", "ind-2"]
        }
      ]
    },
    {
      id: "2",
      name: "Martinez Household",
      totalValue: 680000,
      totalPerformance: 5.2,
      individuals: [
        {
          id: "ind-3",
          name: "Jessica Martinez",
          initials: "JM",
          accounts: [
            { id: "acc-8", type: "tfsa", balance: 92000, performance: 8.5 },
            { id: "acc-9", type: "rrsp", balance: 180000, performance: 4.8 },
            { id: "acc-10", type: "cash", balance: 35000, performance: 1.9 },
            { id: "acc-11", type: "rif", balance: 145000, performance: 3.2 },
          ]
        }
      ],
      corporations: [
        {
          id: "corp-2",
          name: "Martinez Holdings Ltd.",
          initials: "MH",
          accounts: [
            { id: "acc-12", type: "cash", balance: 228000, performance: 6.1 },
          ]
        }
      ],
      jointAccounts: []
    },
    {
      id: "3",
      name: "Chen Technology Group",
      totalValue: 2100000,
      totalPerformance: -2.3,
      individuals: [
        {
          id: "ind-4",
          name: "Michael Chen",
          initials: "MC",
          accounts: [
            { id: "acc-13", type: "tfsa", balance: 95000, performance: -1.2 },
            { id: "acc-14", type: "rrsp", balance: 420000, performance: -3.5 },
          ]
        },
        {
          id: "ind-5",
          name: "Linda Chen",
          initials: "LC",
          accounts: [
            { id: "acc-15", type: "tfsa", balance: 88000, performance: 2.1 },
            { id: "acc-16", type: "rrsp", balance: 295000, performance: -1.8 },
          ]
        }
      ],
      corporations: [
        {
          id: "corp-3",
          name: "Chen Technology Inc.",
          initials: "CT",
          accounts: [
            { id: "acc-17", type: "cash", balance: 1200000, performance: -3.1 },
          ]
        }
      ],
      jointAccounts: [
        {
          id: "joint-3",
          type: "joint-cash",
          balance: 2000,
          performance: 0.5,
          owners: ["ind-4", "ind-5"]
        }
      ]
    },
    {
      id: "4",
      name: "Rodriguez Family",
      totalValue: 520000,
      totalPerformance: 11.2,
      individuals: [
        {
          id: "ind-6",
          name: "Emily Rodriguez",
          initials: "ER",
          accounts: [
            { id: "acc-18", type: "tfsa", balance: 95000, performance: 15.2 },
            { id: "acc-19", type: "rrsp", balance: 225000, performance: 10.8 },
            { id: "acc-20", type: "cash", balance: 85000, performance: 3.5 },
          ]
        },
        {
          id: "ind-7",
          name: "Carlos Rodriguez",
          initials: "CR",
          accounts: [
            { id: "acc-21", type: "tfsa", balance: 68000, performance: 12.1 },
            { id: "acc-22", type: "liff", balance: 47000, performance: 8.9 },
          ]
        }
      ],
      corporations: [],
      jointAccounts: []
    }
  ];

  const filteredHouseholds = mockHouseholds.filter(household =>
    household.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    household.individuals.some(ind => ind.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    household.corporations.some(corp => corp.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Households</h1>
          <p className="text-muted-foreground">Manage client households and their accounts</p>
        </div>
        <Button data-testid="button-add-household">
          <Plus className="h-4 w-4 mr-2" />
          Add Household
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search households..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search"
        />
      </div>

      <div className="space-y-4">
        {filteredHouseholds.map((household) => (
          <HouseholdCard
            key={household.id}
            household={household}
            onClick={(id) => console.log('View household:', id)}
          />
        ))}
      </div>
    </div>
  );
}
