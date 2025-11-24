import { ClientCard, Client } from "@/components/client-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");

  //todo: remove mock functionality
  const mockClients: Client[] = [
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      portfolioValue: 485000,
      performance: 12.4,
      initials: "SJ",
      accountType: "individual"
    },
    {
      id: "2",
      name: "Maple Consulting Corp.",
      email: "admin@mapleconsult.ca",
      portfolioValue: 720000,
      performance: -3.2,
      initials: "MC",
      accountType: "corporate"
    },
    {
      id: "3",
      name: "Emily Rodriguez",
      email: "e.rodriguez@example.com",
      portfolioValue: 320000,
      performance: 8.7,
      initials: "ER",
      accountType: "individual"
    },
    {
      id: "4",
      name: "Northern Tech Inc.",
      email: "finance@northerntech.ca",
      portfolioValue: 1200000,
      performance: 15.2,
      initials: "NT",
      accountType: "corporate"
    },
    {
      id: "5",
      name: "Jessica Martinez",
      email: "j.martinez@example.com",
      portfolioValue: 580000,
      performance: 5.8,
      initials: "JM",
      accountType: "individual"
    },
    {
      id: "6",
      name: "Pacific Holdings Ltd.",
      email: "contact@pacifichold.ca",
      portfolioValue: 950000,
      performance: -1.5,
      initials: "PH",
      accountType: "corporate"
    },
  ];

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">Clients</h1>
          <p className="text-muted-foreground">Manage your client portfolios</p>
        </div>
        <Button data-testid="button-add-client">
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            onClick={(id) => console.log('View client:', id)}
          />
        ))}
      </div>
    </div>
  );
}
