import { useState, useEffect } from "react";
import { SignInButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Shield, 
  Users, 
  BarChart3, 
  Bell, 
  Target, 
  Mail, 
  RefreshCw, 
  Copy, 
  Zap,
  Clock,
  PieChart,
  AlertCircle,
  ArrowRight,
  Briefcase,
  LineChart
} from "lucide-react";
import heroImage1 from "@assets/dennis-mita-N7u1Prj3O-E-unsplash_1764220477796.jpg";
import heroImage2 from "@assets/zia-syed-gOq27RHoL3s-unsplash_1764222509399.jpg";
import heroImage3 from "@assets/artem-r-T7OP6oIbopQ-unsplash_1764222521021.jpg";

const heroImages = [heroImage1, heroImage2, heroImage3];

// Sample portfolio allocations for examples
const samplePortfolio = [
  { symbol: "XIU", name: "iShares S&P/TSX 60", target: 25, color: "bg-blue-500" },
  { symbol: "ZQQ", name: "BMO NASDAQ 100", target: 20, color: "bg-purple-500" },
  { symbol: "VFV", name: "Vanguard S&P 500", target: 20, color: "bg-green-500" },
  { symbol: "ZAG", name: "BMO Aggregate Bond", target: 15, color: "bg-amber-500" },
  { symbol: "CGL.C", name: "iShares Gold", target: 10, color: "bg-yellow-500" },
  { symbol: "CASH", name: "Cash Reserve", target: 10, color: "bg-slate-400" },
];

export default function Landing() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="absolute top-0 left-0 right-0 z-10 border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">TradingOS</h1>
              <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest">Advisor Platform</p>
            </div>
          </div>
          <SignInButton mode="modal">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white border-0" data-testid="button-login">
              <Briefcase className="h-4 w-4 mr-2" />
              Advisor Login
            </Button>
          </SignInButton>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section 
          className="relative min-h-[85vh] flex items-center justify-center transition-all duration-1000"
          style={{
            backgroundImage: `url(${heroImages[currentImageIndex]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-900/85 to-slate-950" />
          <div className="relative z-10 container mx-auto px-4 py-24">
            <div className="max-w-5xl mx-auto text-center space-y-8 flex flex-col items-center">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-sm px-4 py-1.5">
                <Clock className="h-3.5 w-3.5 mr-2" />
                Real-Time Portfolio Monitoring
              </Badge>
              <h2 className="text-5xl md:text-7xl font-bold text-white leading-tight">
                Never Miss a<br />
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Rebalancing Opportunity
                </span>
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl leading-relaxed">
                Your command center for managing client portfolios. Get instant alerts when holdings drift from target allocations—so you can act before the opportunity passes.
              </p>
              <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
                <SignInButton mode="modal">
                  <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white text-lg px-8 h-14" data-testid="button-get-started">
                    Access Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </SignInButton>
                <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white h-14 px-8" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                  See How It Works
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* The Challenge Section */}
        <section className="py-20 border-t border-slate-800">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <Badge variant="outline" className="border-red-500/30 text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 mr-2" />
                    The Challenge
                  </Badge>
                  <h3 className="text-4xl font-bold text-white">
                    Managing Multiple Client Portfolios is Complex
                  </h3>
                  <div className="space-y-4 text-slate-400 text-lg">
                    <p>
                      You've built model portfolios for your clients—carefully balanced allocations across Canadian equities, US markets, bonds, and alternatives.
                    </p>
                    <p>
                      But markets move fast. When ZQQ drops 8% in a morning, that's a buying opportunity for underweight clients. By the time you check all accounts manually, the moment has passed.
                    </p>
                    <p className="text-red-400 font-medium">
                      Missed opportunities cost your clients real returns.
                    </p>
                  </div>
                </div>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-slate-200 flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-emerald-400" />
                      Sample Model Portfolio
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Balanced Growth - Target Allocations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {samplePortfolio.map((holding) => (
                      <div key={holding.symbol} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${holding.color}`} />
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-sm text-white">{holding.symbol}</span>
                            <span className="text-emerald-400 font-semibold">{holding.target}%</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                            <div 
                              className={`h-1.5 rounded-full ${holding.color}`} 
                              style={{ width: `${holding.target}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* The Solution Section */}
        <section className="py-20 bg-gradient-to-b from-emerald-950/20 to-transparent border-t border-slate-800">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <Card className="bg-slate-800/50 border-emerald-500/20 order-2 lg:order-1">
                  <CardHeader>
                    <CardTitle className="text-slate-200 flex items-center gap-2">
                      <Bell className="h-5 w-5 text-emerald-400" />
                      Real-Time Alert Example
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
                        <Zap className="h-4 w-4" />
                        TradingView Alert Triggered
                      </div>
                      <p className="text-slate-300 text-sm">ZQQ.TO crossed below $95.00</p>
                    </div>
                    
                    <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
                      <div className="text-emerald-400 font-medium mb-3">Clients Underweight in ZQQ:</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-slate-300">
                          <span>Johnson Family TFSA</span>
                          <span className="text-amber-400">17.2% vs 20% target</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Smith RRSP</span>
                          <span className="text-amber-400">15.8% vs 20% target</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Lee Corp Account</span>
                          <span className="text-amber-400">18.1% vs 20% target</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-500/20">
                      <div className="text-cyan-400 font-medium mb-2">Recommended Actions:</div>
                      <div className="space-y-1 text-sm text-slate-300">
                        <p>• Buy 45 shares ZQQ @ $94.85 for Johnson Family</p>
                        <p>• Buy 62 shares ZQQ @ $94.85 for Smith RRSP</p>
                        <p>• Buy 28 shares ZQQ @ $94.85 for Lee Corp</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-6 order-1 lg:order-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <Zap className="h-3.5 w-3.5 mr-2" />
                    The Solution
                  </Badge>
                  <h3 className="text-4xl font-bold text-white">
                    Automated Monitoring, Instant Alerts
                  </h3>
                  <div className="space-y-4 text-slate-400 text-lg">
                    <p>
                      TradingOS connects to TradingView and monitors your target allocations across all client accounts—automatically.
                    </p>
                    <p>
                      When a holding drops and clients become underweight, you get an instant email with exactly who needs what, at what price.
                    </p>
                    <p className="text-emerald-400 font-medium">
                      Act in minutes, not hours. Capture every opportunity.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 border-t border-slate-800">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <Badge variant="outline" className="border-slate-600 text-slate-400 mb-4">
                  Simple Setup
                </Badge>
                <h3 className="text-4xl font-bold text-white">How It Works</h3>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-slate-800/50 border-slate-700 text-center relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500" />
                  <CardHeader>
                    <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                      <Target className="h-7 w-7 text-emerald-400" />
                    </div>
                    <Badge variant="outline" className="mx-auto mb-2 border-emerald-500/30 text-emerald-400">Step 1</Badge>
                    <CardTitle className="text-lg text-white">Build Model Portfolios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400">
                      Define target allocations—25% XIU, 20% ZQQ, 15% ZAG, etc. Create templates for different client profiles.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700 text-center relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
                  <CardHeader>
                    <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                      <Users className="h-7 w-7 text-cyan-400" />
                    </div>
                    <Badge variant="outline" className="mx-auto mb-2 border-cyan-500/30 text-cyan-400">Step 2</Badge>
                    <CardTitle className="text-lg text-white">Add Client Households</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400">
                      Track TFSA, RRSP, FHSA, LIRA, corporate accounts—all organized by household with current holdings.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700 text-center relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
                  <CardHeader>
                    <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <LineChart className="h-7 w-7 text-blue-400" />
                    </div>
                    <Badge variant="outline" className="mx-auto mb-2 border-blue-500/30 text-blue-400">Step 3</Badge>
                    <CardTitle className="text-lg text-white">Connect TradingView</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400">
                      Set up price alerts in TradingView. When they trigger, TradingOS instantly scans all client positions.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700 text-center relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                  <CardHeader>
                    <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                      <Mail className="h-7 w-7 text-purple-400" />
                    </div>
                    <Badge variant="outline" className="mx-auto mb-2 border-purple-500/30 text-purple-400">Step 4</Badge>
                    <CardTitle className="text-lg text-white">Get Action Alerts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400">
                      Receive emails listing exactly which clients are underweight and how many shares to buy at current prices.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-gradient-to-b from-slate-800/30 to-transparent border-t border-slate-800">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <Badge variant="outline" className="border-slate-600 text-slate-400 mb-4">
                  Built for Advisors
                </Badge>
                <h3 className="text-4xl font-bold text-white">Why Advisors Love TradingOS</h3>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-slate-800/30 border-slate-700 hover:border-emerald-500/30 transition-colors">
                  <CardHeader>
                    <Clock className="h-10 w-10 text-emerald-400 mb-3" />
                    <CardTitle className="text-lg text-white">Never Miss a Trade</CardTitle>
                    <CardDescription className="text-slate-400">
                      Real-time alerts mean you catch every rebalancing opportunity the moment it happens—even at 3am.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="bg-slate-800/30 border-slate-700 hover:border-emerald-500/30 transition-colors">
                  <CardHeader>
                    <BarChart3 className="h-10 w-10 text-cyan-400 mb-3" />
                    <CardTitle className="text-lg text-white">Precise Recommendations</CardTitle>
                    <CardDescription className="text-slate-400">
                      No guessing—get exact share counts and prices for each account that needs rebalancing.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="bg-slate-800/30 border-slate-700 hover:border-emerald-500/30 transition-colors">
                  <CardHeader>
                    <Shield className="h-10 w-10 text-blue-400 mb-3" />
                    <CardTitle className="text-lg text-white">Canadian Account Types</CardTitle>
                    <CardDescription className="text-slate-400">
                      Full support for TFSA, RRSP, FHSA, LIRA, LIF, RIF, IPP, RESP, corporate, and joint accounts.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="bg-slate-800/30 border-slate-700 hover:border-emerald-500/30 transition-colors">
                  <CardHeader>
                    <Users className="h-10 w-10 text-purple-400 mb-3" />
                    <CardTitle className="text-lg text-white">Household View</CardTitle>
                    <CardDescription className="text-slate-400">
                      See a family's complete picture—spouse accounts, kids' RESPs, corporate holdings—all in one place.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="bg-slate-800/30 border-slate-700 hover:border-emerald-500/30 transition-colors">
                  <CardHeader>
                    <Copy className="h-10 w-10 text-amber-400 mb-3" />
                    <CardTitle className="text-lg text-white">Model Templates</CardTitle>
                    <CardDescription className="text-slate-400">
                      Build a model once, apply it across dozens of clients. Consistent allocations, less manual work.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="bg-slate-800/30 border-slate-700 hover:border-emerald-500/30 transition-colors">
                  <CardHeader>
                    <RefreshCw className="h-10 w-10 text-pink-400 mb-3" />
                    <CardTitle className="text-lg text-white">Live Market Prices</CardTitle>
                    <CardDescription className="text-slate-400">
                      Portfolio values update automatically with real market data. Always know where clients stand.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Example Scenario Section */}
        <section className="py-20 border-t border-slate-800">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <Badge variant="outline" className="border-slate-600 text-slate-400 mb-4">
                  Real Scenario
                </Badge>
                <h3 className="text-4xl font-bold text-white mb-4">A Morning in Your Practice</h3>
                <p className="text-slate-400 text-lg">See how TradingOS transforms your workflow</p>
              </div>
              
              <div className="space-y-6">
                <Card className="bg-slate-800/30 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex gap-4 items-start">
                      <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-400 font-bold">7:45</span>
                      </div>
                      <div>
                        <p className="text-white font-medium mb-1">Market Opens</p>
                        <p className="text-slate-400">
                          Tech stocks gap down 3% on overnight news. Your TradingView alert for ZQQ fires as it drops below $95.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/30 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex gap-4 items-start">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-emerald-400 font-bold">7:46</span>
                      </div>
                      <div>
                        <p className="text-white font-medium mb-1">Instant Alert Arrives</p>
                        <p className="text-slate-400">
                          TradingOS emails you: "12 client accounts are underweight in ZQQ. Here are the specific trades needed for each."
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/30 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex gap-4 items-start">
                      <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-400 font-bold">8:15</span>
                      </div>
                      <div>
                        <p className="text-white font-medium mb-1">Trades Executed</p>
                        <p className="text-slate-400">
                          You've placed all rebalancing trades before your first coffee. Clients captured the dip. By 10am, ZQQ is back up 2%.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-500/10 border-emerald-500/30">
                  <CardContent className="pt-6">
                    <div className="flex gap-4 items-start">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-emerald-400 font-medium mb-1">The Result</p>
                        <p className="text-slate-300">
                          Without TradingOS, you might have caught 2-3 accounts manually during the day. With it, all 12 clients benefited from the opportunity—and you have the documentation to prove it.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 border-t border-slate-800">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 mx-auto">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-4xl font-bold text-white">
                Ready to Transform Your Practice?
              </h3>
              <p className="text-xl text-slate-400">
                Stop checking charts manually. Let TradingOS monitor your client portfolios 24/7 and alert you when action is needed.
              </p>
              <SignInButton mode="modal">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white text-lg px-10 h-14" data-testid="button-sign-in-footer">
                  <Briefcase className="mr-2 h-5 w-5" />
                  Access Advisor Dashboard
                </Button>
              </SignInButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-8 bg-slate-950">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-semibold">TradingOS</span>
          </div>
          <p className="text-sm text-slate-500">Professional Portfolio Management for Investment Advisors</p>
        </div>
      </footer>
    </div>
  );
}
