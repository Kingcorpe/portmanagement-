import { ClientCard, Client } from '../client-card';

export default function ClientCardExample() {
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
      name: "Chen Technology Inc.",
      email: "admin@chentech.ca",
      portfolioValue: 720000,
      performance: -3.2,
      initials: "CT",
      accountType: "corporate"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 max-w-4xl">
      {mockClients.map((client) => (
        <ClientCard
          key={client.id}
          client={client}
          onClick={(id) => console.log('View client:', id)}
        />
      ))}
    </div>
  );
}
