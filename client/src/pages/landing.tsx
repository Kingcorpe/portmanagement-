import { SignInButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  Bell, 
  Target, 
  Clock,
  PieChart,
  ArrowRight,
  Briefcase,
  LineChart,
  BookOpen,
  DollarSign,
  CheckCircle2,
  LayoutDashboard,
  ListTodo,
  Milestone,
  ChartPie
} from "lucide-react";

// Your actual portfolio holdings
const samplePortfolio = [
  { symbol: "BANK", name: "Evolve Canadian Banks ETF", target: 20, color: "from-blue-500 to-blue-600" },
  { symbol: "ENCL", name: "Evolve Enhanced Yield ETF", target: 18, color: "from-emerald-500 to-emerald-600" },
  { symbol: "TSLY", name: "YieldMax TSLA Option Income", target: 17, color: "from-purple-500 to-purple-600" },
  { symbol: "MSTE", name: "Evolve Monthly Income ETF", target: 17, color: "from-cyan-500 to-cyan-600" },
  { symbol: "QQCC", name: "Simplify NASDAQ Covered Call", target: 15, color: "from-amber-500 to-amber-600" },
  { symbol: "LMAX", name: "Evolve US Banks Enhanced", target: 13, color: "from-rose-500 to-rose-600" },
];

// Dashboard feature previews
const dashboardFeatures = [
  { 
    title: "Households",
    description: "Track client families with all account types",
    icon: Users,
    preview: (
      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded">
          <span className="text-slate-300">Morrison Family</span>
          <span className="text-emerald-400 font-mono">$847,230</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded">
          <span className="text-slate-300">Chen Holdings</span>
          <span className="text-emerald-400 font-mono">$1.2M</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded">
          <span className="text-slate-300">Patel Corp</span>
          <span className="text-emerald-400 font-mono">$562,100</span>
        </div>
      </div>
    )
  },
  {
    title: "Model Portfolios", 
    description: "Create templates, apply everywhere",
    icon: ChartPie,
    preview: (
      <div className="space-y-1.5">
        {samplePortfolio.slice(0, 4).map((h) => (
          <div key={h.symbol} className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${h.color}`} />
            <span className="text-slate-400 font-mono w-12">{h.symbol}</span>
            <div className="flex-1 bg-slate-700 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full bg-gradient-to-r ${h.color}`} style={{width: `${h.target * 3}%`}} />
            </div>
            <span className="text-slate-500 w-8 text-right">{h.target}%</span>
          </div>
        ))}
      </div>
    )
  },
  {
    title: "Trading Journal",
    description: "Document trades and strategies",
    icon: BookOpen,
    preview: (
      <div className="space-y-2 text-xs">
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded">
          <div className="flex justify-between">
            <span className="text-emerald-400">BUY TSLY</span>
            <span className="text-slate-400">Dec 5</span>
          </div>
          <p className="text-slate-500 mt-1">200 shares @ $18.45</p>
        </div>
        <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded">
          <div className="flex justify-between">
            <span className="text-rose-400">SELL QQCC</span>
            <span className="text-slate-400">Dec 3</span>
          </div>
          <p className="text-slate-500 mt-1">Trimmed position 15%</p>
        </div>
      </div>
    )
  },
  {
    title: "Dividend Tracker",
    description: "Monitor income across all accounts",
    icon: DollarSign,
    preview: (
      <div className="space-y-2 text-xs">
        <div className="flex justify-between p-2 bg-slate-700/50 rounded">
          <span className="text-slate-400">Monthly Est.</span>
          <span className="text-emerald-400 font-mono">$4,280</span>
        </div>
        <div className="flex justify-between p-2 bg-slate-700/50 rounded">
          <span className="text-slate-400">YTD Collected</span>
          <span className="text-emerald-400 font-mono">$47,120</span>
        </div>
        <div className="flex justify-between p-2 bg-slate-700/50 rounded">
          <span className="text-slate-400">Next Payout</span>
          <span className="text-cyan-400 font-mono">Dec 15</span>
        </div>
      </div>
    )
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />
      
      <header className="relative z-20 border-b border-slate-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">TradingOS</h1>
              <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-medium">Advisor Platform</p>
            </div>
          </div>
          <SignInButton mode="modal">
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-white border-0 shadow-lg shadow-emerald-500/20" data-testid="button-login">
              <Briefcase className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </SignInButton>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        {/* Hero Section - Simplified */}
        <section className="py-20 lg:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-1.5">
                <Clock className="h-3.5 w-3.5 mr-2" />
                Never Miss a Rebalancing Opportunity
              </Badge>
              
              <h2 className="text-5xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
                Your Client Portfolios.<br />
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  Always Optimized.
                </span>
              </h2>
              
              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Monitor all client accounts in real-time. Get instant alerts when holdings drift from targets. Execute rebalancing trades before opportunities pass.
              </p>
              
              <div className="pt-4">
                <SignInButton mode="modal">
                  <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white text-lg px-8 h-14 shadow-xl shadow-emerald-500/25" data-testid="button-get-started">
                    Access Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </SignInButton>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Preview Section */}
        <section className="py-16 border-t border-slate-800/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="outline" className="border-slate-700 text-slate-400 mb-4">
                <LayoutDashboard className="h-3.5 w-3.5 mr-2" />
                Dashboard Preview
              </Badge>
              <h3 className="text-3xl font-bold text-white">Everything You Need in One Place</h3>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {dashboardFeatures.map((feature) => (
                <Card key={feature.title} className="bg-slate-900/50 border-slate-800 hover:border-emerald-500/30 transition-all duration-300 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <feature.icon className="h-4 w-4 text-emerald-400" />
                      <CardTitle className="text-sm text-white">{feature.title}</CardTitle>
                    </div>
                    <p className="text-xs text-slate-500">{feature.description}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {feature.preview}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Portfolio Model Section */}
        <section className="py-16 border-t border-slate-800/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                    <PieChart className="h-3.5 w-3.5 mr-2" />
                    Model Portfolio Example
                  </Badge>
                  <h3 className="text-3xl font-bold text-white">
                    Build Once, Apply Everywhere
                  </h3>
                  <p className="text-slate-400 text-lg">
                    Define your target allocations for income-focused ETFs like BANK, TSLY, and QQCC. Apply the same model across dozens of client accounts with one click.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span>TFSA, RRSP, FHSA, LIRA, corporate accounts</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span>Instant drift detection when markets move</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span>Exact share counts at current prices</span>
                    </div>
                  </div>
                </div>

                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5 text-emerald-400" />
                      Income Growth Model
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {samplePortfolio.map((holding) => (
                      <div key={holding.symbol} className="group">
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-white font-medium">{holding.symbol}</span>
                            <span className="text-slate-500 text-xs hidden sm:inline">{holding.name}</span>
                          </div>
                          <span className="text-emerald-400 font-semibold">{holding.target}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full bg-gradient-to-r ${holding.color} transition-all duration-500`}
                            style={{ width: `${holding.target * 5}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-slate-800 flex justify-between text-sm">
                      <span className="text-slate-500">Total Allocation</span>
                      <span className="text-white font-semibold">100%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Alert Example Section */}
        <section className="py-16 border-t border-slate-800/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <Card className="bg-slate-900/50 border-slate-800 order-2 lg:order-1">
                  <CardHeader className="border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <CardTitle className="text-white text-lg">Real-Time Alert</CardTitle>
                    </div>
                    <p className="text-slate-500 text-sm">TSLY dropped below $17.50 — 3 clients underweight</p>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 font-medium">Morrison TFSA</span>
                        <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">14.2% vs 17%</Badge>
                      </div>
                      <p className="text-emerald-400 text-sm mt-1">→ Buy 85 shares @ $17.42</p>
                    </div>
                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 font-medium">Chen RRSP</span>
                        <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">12.8% vs 17%</Badge>
                      </div>
                      <p className="text-emerald-400 text-sm mt-1">→ Buy 142 shares @ $17.42</p>
                    </div>
                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 font-medium">Patel Corp Account</span>
                        <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">15.1% vs 17%</Badge>
                      </div>
                      <p className="text-emerald-400 text-sm mt-1">→ Buy 53 shares @ $17.42</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6 order-1 lg:order-2">
                  <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                    <Bell className="h-3.5 w-3.5 mr-2" />
                    Instant Notifications
                  </Badge>
                  <h3 className="text-3xl font-bold text-white">
                    Act Before the Opportunity Passes
                  </h3>
                  <p className="text-slate-400 text-lg">
                    When TradingView alerts fire, TradingOS instantly scans every client account. Within seconds, you know exactly who needs rebalancing and what to buy.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span>Email alerts with exact trade instructions</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span>No manual portfolio checking required</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span>Works 24/7, even when you're sleeping</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Additional Features */}
        <section className="py-16 border-t border-slate-800/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h3 className="text-3xl font-bold text-white mb-4">Also Includes</h3>
                <p className="text-slate-400">Tools to run your entire practice</p>
              </div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl text-center hover:border-slate-700 transition-colors">
                  <ListTodo className="h-8 w-8 text-blue-400 mx-auto mb-3" />
                  <h4 className="text-white font-medium mb-1">Task Manager</h4>
                  <p className="text-slate-500 text-xs">Track client to-dos and deadlines</p>
                </div>
                <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl text-center hover:border-slate-700 transition-colors">
                  <Milestone className="h-8 w-8 text-purple-400 mx-auto mb-3" />
                  <h4 className="text-white font-medium mb-1">Milestones</h4>
                  <p className="text-slate-500 text-xs">Business & personal goal tracking</p>
                </div>
                <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl text-center hover:border-slate-700 transition-colors">
                  <LineChart className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-white font-medium mb-1">Revenue Tracker</h4>
                  <p className="text-slate-500 text-xs">Monitor AUM and commissions</p>
                </div>
                <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl text-center hover:border-slate-700 transition-colors">
                  <Users className="h-8 w-8 text-amber-400 mx-auto mb-3" />
                  <h4 className="text-white font-medium mb-1">Prospect Intake</h4>
                  <p className="text-slate-500 text-xs">Client onboarding forms</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 border-t border-slate-800/50">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-xl shadow-emerald-500/25">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white">
                Ready to Streamline Your Practice?
              </h3>
              <p className="text-slate-400 text-lg">
                Stop checking portfolios manually. Let TradingOS do the monitoring while you focus on what matters—your clients.
              </p>
              <SignInButton mode="modal">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white text-lg px-10 h-14 shadow-xl shadow-emerald-500/25" data-testid="button-sign-in-footer">
                  <Briefcase className="mr-2 h-5 w-5" />
                  Get Started
                </Button>
              </SignInButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-800/50 py-6 bg-slate-950/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                <TrendingUp className="h-3 w-3 text-white" />
              </div>
              <span className="text-slate-400 text-sm">TradingOS</span>
            </div>
            <p className="text-slate-600 text-xs">
              Portfolio Management for Investment Advisors
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
