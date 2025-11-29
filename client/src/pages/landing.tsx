import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  MessageSquare,
  Check,
  AlertTriangle
} from "lucide-react";
import heroImage1 from "@assets/dennis-mita-N7u1Prj3O-E-unsplash_1764220477796.jpg";
import heroImage2 from "@assets/zia-syed-gOq27RHoL3s-unsplash_1764222509399.jpg";
import heroImage3 from "@assets/artem-r-T7OP6oIbopQ-unsplash_1764222521021.jpg";

const heroImages = [heroImage1, heroImage2, heroImage3];

export default function Landing() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="absolute top-0 left-0 right-0 z-10 border-b border-white/10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <TrendingUp className="h-8 w-8 text-white" />
            <h1 className="text-2xl font-bold text-white">TradingOS</h1>
          </div>
          <Button variant="outline" onClick={handleLogin} className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm flex-shrink-0" data-testid="button-login">
            Sign In
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section 
          className="relative min-h-[80vh] flex items-center justify-center transition-all duration-1000"
          style={{
            backgroundImage: `url(${heroImages[currentImageIndex]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-black/90" />
          <div className="relative z-10 container mx-auto px-4 py-20">
            <div className="max-w-4xl mx-auto text-center space-y-6 flex flex-col items-center">
              <div>
                <Badge variant="secondary" className="text-sm px-4 py-1">
                  Your trading alerts. Always on time.
                </Badge>
              </div>
              <h2 className="text-5xl md:text-6xl font-bold text-white">
                Never Miss a Deal Again
              </h2>
              <p className="text-xl text-white/80 max-w-2xl">
                Quit staring at charts. Let deals find you.
              </p>
              <p className="text-lg text-white/70 italic">
                We monitor, you chill.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button size="lg" onClick={handleLogin} data-testid="button-get-started">
                  Get Started Free
                </Button>
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                  See How It Works
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* The Issue Section */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <Card className="border-destructive/20">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                      <CardTitle className="text-destructive">The Issue</CardTitle>
                    </div>
                    <CardDescription className="text-base leading-relaxed">
                      You pick your mix—say, 20% in banks, 15% in tech funds, 10% in gold. But life happens, and you miss those market drops perfect for buying cheap. By the time you look, it's gone.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-6 w-6 text-primary" />
                      <CardTitle className="text-primary">Our Fix</CardTitle>
                    </div>
                    <CardDescription className="text-base leading-relaxed">
                      We link up with TradingView (the go-to charting app) and keep an eye on your stuff automatically.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-3xl font-bold text-center mb-12">How It Rolls</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="text-center">
                  <CardHeader>
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="outline" className="mx-auto mb-2">Step 1</Badge>
                    <CardTitle className="text-lg">Set Your Mix</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Set your ideal mix (e.g., 20% XIU, 15% ZQQ)
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="outline" className="mx-auto mb-2">Step 2</Badge>
                    <CardTitle className="text-lg">Hook TradingView</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Connect your TradingView alerts to our system
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bell className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="outline" className="mx-auto mb-2">Step 3</Badge>
                    <CardTitle className="text-lg">Alert Hits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      We scan your holdings right away when an alert fires
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="outline" className="mx-auto mb-2">Step 4</Badge>
                    <CardTitle className="text-lg">Get Notified</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      If you're low, bam—email tells you exactly what to grab
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Why It's Awesome Section */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h3 className="text-3xl font-bold text-center mb-12">Why It's Awesome</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <RefreshCw className="h-10 w-10 text-primary mb-3" />
                    <CardTitle className="text-lg">Hands-off</CardTitle>
                    <CardDescription>
                      We monitor, you chill. No constant chart-watching required.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <MessageSquare className="h-10 w-10 text-primary mb-3" />
                    <CardTitle className="text-lg">Straight Talk</CardTitle>
                    <CardDescription>
                      "Buy 45 shares now," not vague hints. Clear, actionable guidance.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <Shield className="h-10 w-10 text-primary mb-3" />
                    <CardTitle className="text-lg">Made for Canada</CardTitle>
                    <CardDescription>
                      Works with TFSA, RRSP, FHSA, LIRA, LIF, RIF, IPP, RESP, and more.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <Users className="h-10 w-10 text-primary mb-3" />
                    <CardTitle className="text-lg">Family Mode</CardTitle>
                    <CardDescription>
                      Cover spouse, joint, or business accounts all in one place.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <TrendingUp className="h-10 w-10 text-primary mb-3" />
                    <CardTitle className="text-lg">Live Updates</CardTitle>
                    <CardDescription>
                      Prices refresh from the market automatically. Always current.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <Copy className="h-10 w-10 text-primary mb-3" />
                    <CardTitle className="text-lg">Templates</CardTitle>
                    <CardDescription>
                      Build one perfect setup, use it everywhere across accounts.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Story Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h3 className="text-3xl font-bold text-center mb-8">Quick Story</h3>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="hidden sm:block">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-lg leading-relaxed">
                        <span className="font-semibold">Sarah</span> aims for 15% QMAX in her TFSA. Market dips, alert fires.
                      </p>
                      <p className="text-lg leading-relaxed">
                        Seconds later: email says her share's at <span className="font-semibold text-destructive">11.2%</span>—buy <span className="font-semibold text-primary">45 shares at $23.50</span> to fix it.
                      </p>
                      <p className="text-lg leading-relaxed text-muted-foreground italic">
                        She jumps in her app, done in 2 minutes.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-3xl font-bold text-center mb-4">Easy Pricing</h3>
              <p className="text-center text-muted-foreground mb-12">Start free, upgrade when you're ready</p>
              
              <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">Free</CardTitle>
                    <CardDescription>Perfect to test it out</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-4xl font-bold">$0<span className="text-lg font-normal text-muted-foreground">/month</span></div>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" />
                        <span>One family setup</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" />
                        <span>Basic portfolio tracking</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" />
                        <span>Manual price refresh</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={handleLogin} data-testid="button-free-tier">
                      Get Started
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border-primary relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-2xl">Pro</CardTitle>
                    <CardDescription>For serious investors</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-4xl font-bold">$25<span className="text-lg font-normal text-muted-foreground">/month</span></div>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" />
                        <span>Unlimited families</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" />
                        <span>TradingView alerts integration</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" />
                        <span>Automated email notifications</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" />
                        <span>Live price updates</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" />
                        <span>Model portfolio templates</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" onClick={handleLogin} data-testid="button-pro-tier">
                      Start Pro Trial
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h3 className="text-3xl font-bold">Ready to let deals find you?</h3>
              <p className="text-xl text-muted-foreground italic">
                Quit staring at charts. Let deals find you.
              </p>
              <Button size="lg" onClick={handleLogin} data-testid="button-sign-in-footer">
                Sign In Now
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>TradingOS - Professional Investment Management Platform</p>
          <p className="mt-1 text-xs">Updated: Nov 26, 2025</p>
        </div>
      </footer>
    </div>
  );
}
