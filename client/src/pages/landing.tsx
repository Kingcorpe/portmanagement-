import { SignInButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  Bell, 
  Target, 
  Shield,
  PieChart,
  ArrowRight,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Heart,
  LineChart,
  Wallet,
  TrendingDown,
  Eye,
  Zap
} from "lucide-react";

// Portfolio holdings example
const samplePortfolio = [
  { symbol: "BANK", name: "Canadian Banks ETF", target: 20, color: "from-blue-500 to-blue-600" },
  { symbol: "ENCL", name: "Enhanced Yield ETF", target: 18, color: "from-emerald-500 to-emerald-600" },
  { symbol: "TSLY", name: "TSLA Income Strategy", target: 17, color: "from-purple-500 to-purple-600" },
  { symbol: "MSTE", name: "Monthly Income ETF", target: 17, color: "from-cyan-500 to-cyan-600" },
  { symbol: "QQCC", name: "NASDAQ Covered Call", target: 15, color: "from-amber-500 to-amber-600" },
  { symbol: "LMAX", name: "US Banks Enhanced", target: 13, color: "from-rose-500 to-rose-600" },
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
              <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-medium">Wealth Management</p>
            </div>
          </div>
          <SignInButton mode="modal">
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-white border-0 shadow-lg shadow-emerald-500/20" data-testid="button-login">
              <Briefcase className="h-4 w-4 mr-2" />
              Client Portal
            </Button>
          </SignInButton>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        {/* Hero Section */}
        <section className="py-20 lg:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-1.5">
                <Shield className="h-3.5 w-3.5 mr-2" />
                Disciplined Wealth Management for Canadian Families
              </Badge>
              
              <h2 className="text-5xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
                Your Family's Wealth.<br />
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  Professionally Protected.
                </span>
              </h2>

              <p className="text-2xl font-semibold text-emerald-400 tracking-wide">
                Cashflow is King™
              </p>
              
              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Markets are unpredictable. Emotions are costly. We bring the discipline, tools, and rules that keep your portfolio on track—so you don't have to navigate it alone.
              </p>
              
              <div className="pt-4">
                <SignInButton mode="modal">
                  <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white text-lg px-8 h-14 shadow-xl shadow-emerald-500/25" data-testid="button-get-started">
                    Access Your Portfolio
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </SignInButton>
              </div>
            </div>
          </div>
        </section>

        {/* The Risk of Broken Approaches */}
        <section className="py-16 border-t border-slate-800/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <Badge variant="outline" className="border-red-500/30 text-red-400 mb-4">
                  <AlertTriangle className="h-3.5 w-3.5 mr-2" />
                  The Hidden Risks
                </Badge>
                <h3 className="text-3xl font-bold text-white">What's Really Costing You Money?</h3>
                <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
                  Whether you're managing it yourself, using a robo-advisor, or working with someone whose system is outdated—these problems are more common than you think.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-red-950/20 border-red-500/20">
                  <CardHeader>
                    <TrendingDown className="h-8 w-8 text-red-400 mb-2" />
                    <CardTitle className="text-white text-lg">Stale Models</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400">
                      That portfolio model from 2019? Markets have changed. Rates have changed. Your life has changed. But nobody updated the plan.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-red-950/20 border-red-500/20">
                  <CardHeader>
                    <Clock className="h-8 w-8 text-red-400 mb-2" />
                    <CardTitle className="text-white text-lg">Dead Portfolios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400">
                      Set it and forget it? More like set it and neglect it. No rebalancing. No adjustments. Just drifting further from your goals.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-red-950/20 border-red-500/20">
                  <CardHeader>
                    <PieChart className="h-8 w-8 text-red-400 mb-2" />
                    <CardTitle className="text-white text-lg">Undefined Strategy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400">
                      "Diversified" isn't a strategy. Without clear targets and rules, you're just hoping things work out. Hope isn't a plan.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-red-950/20 border-red-500/20">
                  <CardHeader>
                    <Wallet className="h-8 w-8 text-red-400 mb-2" />
                    <CardTitle className="text-white text-lg">Broken Systems</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400">
                      Spreadsheets that don't update. Advisors who don't call. Models that worked once but can't adapt. The system is broken—you just don't know it yet.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-red-950/20 border-red-500/20">
                  <CardHeader>
                    <Users className="h-8 w-8 text-red-400 mb-2" />
                    <CardTitle className="text-white text-lg">Missed Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400">
                      Market drops 5%—that's a buying opportunity. But nobody's watching. By the time anyone notices, it's bounced back. Opportunity gone.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-red-950/20 border-red-500/20">
                  <CardHeader>
                    <AlertTriangle className="h-8 w-8 text-red-400 mb-2" />
                    <CardTitle className="text-white text-lg">No Accountability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400">
                      Who's actually watching your money? If the answer is "nobody, really"—that's the biggest risk of all. Your wealth deserves active attention.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* The Solution - Working With Us */}
        <section className="py-16 border-t border-slate-800/50 bg-gradient-to-b from-emerald-950/10 to-transparent">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 mb-4">
                  <Shield className="h-3.5 w-3.5 mr-2" />
                  The TradingOS Advantage
                </Badge>
                <h3 className="text-3xl font-bold text-white">What Your Family Gets With Us</h3>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-emerald-950/20 border-emerald-500/20">
                  <CardHeader>
                    <Target className="h-8 w-8 text-emerald-400 mb-2" />
                    <CardTitle className="text-white text-lg">Rules-Based Discipline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400">
                      Your portfolio has a plan. Clear targets. Automatic triggers. No emotional decisions—just systematic execution.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-950/20 border-emerald-500/20">
                  <CardHeader>
                    <Bell className="h-8 w-8 text-emerald-400 mb-2" />
                    <CardTitle className="text-white text-lg">24/7 Monitoring</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400">
                      Our systems watch the markets around the clock. When opportunities arise, we know instantly—and act before they disappear.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-950/20 border-emerald-500/20">
                  <CardHeader>
                    <Zap className="h-8 w-8 text-emerald-400 mb-2" />
                    <CardTitle className="text-white text-lg">Instant Rebalancing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400">
                      Portfolio drifting? We catch it immediately. Exact calculations. Precise trades. Your allocation stays on target.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-950/20 border-emerald-500/20">
                  <CardHeader>
                    <Heart className="h-8 w-8 text-emerald-400 mb-2" />
                    <CardTitle className="text-white text-lg">Household-Wide View</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400">
                      We see your entire family's picture—your TFSA, spouse's RRSP, joint accounts, corporate holdings—all coordinated together.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-950/20 border-emerald-500/20">
                  <CardHeader>
                    <LineChart className="h-8 w-8 text-emerald-400 mb-2" />
                    <CardTitle className="text-white text-lg">Income Optimization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400">
                      Dividend tracking, income planning, tax-efficient placement. We optimize for the income your family actually needs.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-950/20 border-emerald-500/20">
                  <CardHeader>
                    <Eye className="h-8 w-8 text-emerald-400 mb-2" />
                    <CardTitle className="text-white text-lg">Full Transparency</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400">
                      See everything we see. Real-time portfolio values, trade history, performance tracking. Your wealth, fully visible.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Side by Side Comparison */}
        <section className="py-16 border-t border-slate-800/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h3 className="text-3xl font-bold text-white">The Difference Is Clear</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Without Us */}
                <Card className="bg-slate-900/50 border-red-500/20">
                  <CardHeader className="border-b border-slate-800 pb-4">
                    <CardTitle className="text-red-400 flex items-center gap-2">
                      <XCircle className="h-5 w-5" />
                      Outdated Approaches
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-400">Models created years ago, never updated</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-400">Nobody watching when opportunities hit</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-400">Vague strategy with no clear rules</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-400">Accounts scattered, no coordination</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-400">Rebalancing? Maybe once a year</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-400">Hoping things work out</span>
                    </div>
                  </CardContent>
                </Card>

                {/* With Us */}
                <Card className="bg-slate-900/50 border-emerald-500/20">
                  <CardHeader className="border-b border-slate-800 pb-4">
                    <CardTitle className="text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Our Living System
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Models actively maintained and refined</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">24/7 monitoring catches every opportunity</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Defined targets and rules-based execution</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Whole household managed as one</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Instant rebalancing when drift occurs</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Knowing your wealth is actively protected</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Portfolio Example */}
        <section className="py-16 border-t border-slate-800/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                    <PieChart className="h-3.5 w-3.5 mr-2" />
                    Structured Portfolios
                  </Badge>
                  <h3 className="text-3xl font-bold text-white">
                    Your Money Has a Plan
                  </h3>
                  <p className="text-slate-400 text-lg">
                    We don't guess. Every holding has a target allocation based on your goals, risk tolerance, and income needs. When positions drift, we rebalance. When opportunities appear, we act.
                  </p>
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span>Income-focused ETFs for steady cash flow</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span>Diversified across sectors and geographies</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span>Optimized for TFSA, RRSP, and taxable accounts</span>
                    </div>
                  </div>
                </div>

                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5 text-emerald-400" />
                      Sample Income Portfolio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {samplePortfolio.map((holding) => (
                      <div key={holding.symbol}>
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-white font-medium">{holding.symbol}</span>
                            <span className="text-slate-500 text-xs hidden sm:inline">{holding.name}</span>
                          </div>
                          <span className="text-emerald-400 font-semibold">{holding.target}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full bg-gradient-to-r ${holding.color}`}
                            style={{ width: `${holding.target * 5}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-16 border-t border-slate-800/50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h3 className="text-3xl font-bold text-white">
                Built for Canadian Families
              </h3>
              <p className="text-slate-400 text-lg">
                We understand the accounts that matter to you—TFSA, RRSP, FHSA, RESP, LIRA, LIF, RIF, corporate accounts, and more. Your entire household's wealth, managed together with the discipline and tools that most investors simply don't have on their own.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-4">
                <Badge variant="outline" className="border-slate-700 text-slate-400">TFSA</Badge>
                <Badge variant="outline" className="border-slate-700 text-slate-400">RRSP</Badge>
                <Badge variant="outline" className="border-slate-700 text-slate-400">FHSA</Badge>
                <Badge variant="outline" className="border-slate-700 text-slate-400">RESP</Badge>
                <Badge variant="outline" className="border-slate-700 text-slate-400">LIRA</Badge>
                <Badge variant="outline" className="border-slate-700 text-slate-400">LIF</Badge>
                <Badge variant="outline" className="border-slate-700 text-slate-400">RIF</Badge>
                <Badge variant="outline" className="border-slate-700 text-slate-400">Corporate</Badge>
                <Badge variant="outline" className="border-slate-700 text-slate-400">Joint</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 border-t border-slate-800/50">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-xl shadow-emerald-500/25">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white">
                Doesn't Your Wealth Deserve a Living System?
              </h3>
              <p className="text-slate-400 text-lg">
                Stale models and dead portfolios cost families real money. We bring active management, defined rules, and 24/7 monitoring—so your wealth keeps working as hard as you did to build it.
              </p>
              <SignInButton mode="modal">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white text-lg px-10 h-14 shadow-xl shadow-emerald-500/25" data-testid="button-sign-in-footer">
                  <Briefcase className="mr-2 h-5 w-5" />
                  Access Client Portal
                </Button>
              </SignInButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-800/50 py-8 bg-slate-950/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                <TrendingUp className="h-3 w-3 text-white" />
              </div>
              <span className="text-slate-400 text-sm">TradingOS</span>
            </div>
            <p className="text-emerald-400 font-semibold tracking-wide">
              Cashflow is King™
            </p>
            <p className="text-slate-600 text-xs">
              Professional Wealth Management for Canadian Families
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
