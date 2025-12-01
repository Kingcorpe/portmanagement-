import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListTodo } from "lucide-react";

export default function InsuranceTasks() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ListTodo className="h-8 w-8" />
            Insurance Tasks
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your insurance-related tasks and follow-ups
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insurance Tasks Management</CardTitle>
          <CardDescription>
            Coming soon - track and manage insurance policy tasks, commissions, and follow-ups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ListTodo className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Insurance Tasks feature is being developed
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This section will allow you to track insurance-related tasks separately from investment tasks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
