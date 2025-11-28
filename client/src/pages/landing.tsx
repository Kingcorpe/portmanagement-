import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Shield, Users, BarChart3 } from "lucide-react";
import heroImage1 from "@assets/dennis-mita-N7u1Prj3O-E-unsplash_1764220477796.jpg";
import heroImage2 from "@assets/zia-syed-gOq27RHoL3s-unsplash_1764222509399.jpg";
import heroImage3 from "@assets/artem-r-T7OP6oIbopQ-unsplash_1764222521021.jpg";

const heroImages = [heroImage1, heroImage2, heroImage3];

export default function Landing() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="absolute top-0 left-0 right-0 z-10 border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-white" />
            <h1 className="text-2xl font-bold text-white">Bringing the Market to You</h1>
          </div>
          <Button variant="outline" onClick={handleLogin} className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm" data-testid="button-login">
            Sign In
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section 
          className="relative min-h-[70vh] flex items-center justify-center transition-all duration-1000"
          style={{
            backgroundImage: `url(${heroImages[currentImageIndex]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
          <div className="relative z-10 container mx-auto px-4 py-20">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h2 className="text-5xl font-bold text-white">
                Investment Management
              </h2>
              <p className="text-lg text-white/70">
                Quit staring at charts. Let deals find you.
              </p>
              <p className="text-xl text-white/80 italic">
                Stop watching the market. Let the market come to you.
              </p>
              <div className="pt-4">
                <Button size="lg" onClick={handleLogin} data-testid="button-get-started">
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Household-Based</CardTitle>
                <CardDescription>
                  Organize clients by household with support for individuals, corporations, and joint accounts
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Canadian Accounts</CardTitle>
                <CardDescription>
                  Full support for TFSA, FHSA, RRSP, LIRA, LIF, RIF, IPP, RESP, and cash accounts
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mb-4" />
                <CardTitle>TradingView Integration</CardTitle>
                <CardDescription>
                  Receive trading alerts via webhooks and track all positions in real-time
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h3 className="text-3xl font-bold">Ready to get started?</h3>
              <p className="text-muted-foreground">
                Sign in with your account to access the portfolio management platform
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
          <p>WealthiOS - Professional Investment Management Platform</p>
        </div>
      </footer>
    </div>
  );
}
