import { HouseholdCard, Household } from '../household-card';

export default function HouseholdCardExample() {
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
            { id: "acc-1b", type: "fhsa", balance: 15000, performance: 9.5 },
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
            { id: "acc-7b", type: "ipp", balance: 145000, performance: 6.8 },
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
    }
  ];

  return (
    <div className="space-y-4 p-6 max-w-4xl">
      {mockHouseholds.map((household) => (
        <HouseholdCard
          key={household.id}
          household={household}
          onClick={(id) => console.log('View household:', id)}
        />
      ))}
    </div>
  );
}
