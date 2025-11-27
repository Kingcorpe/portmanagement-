import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Shield, Users, BarChart3 } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Portfolio Manager</h1>
          </div>
          <Button onClick={handleLogin} data-testid="button-login">
            Sign In
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-5xl font-bold">
              Canadian Investment Portfolio Management
            </h2>
            <p className="text-xl text-muted-foreground">
              Professional portfolio management for Canadian client accounts. 
              Track TFSA, RRSP, RESP, and other registered accounts with ease.
            </p>
            <div className="pt-4">
              <Button size="lg" onClick={handleLogin} data-testid="button-get-started">
                Get Started
              </Button>
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
          <p>Portfolio Manager - Professional Investment Management Platform</p>
        </div>
      </footer>
    </div>
  );
}
