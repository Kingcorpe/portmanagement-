import { useDemoMode } from "@/contexts/demo-mode-context";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoModeBanner() {
  const { isDemoMode, setDemoMode } = useDemoMode();

  if (!isDemoMode) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 mb-4 flex items-center justify-between gap-3" data-testid="banner-demo-mode">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
          Demo Mode Active
        </span>
        <span className="text-sm text-amber-600/80 dark:text-amber-400/80">
          - Showing sample data for demonstrations. Real client data is protected.
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDemoMode(false)}
        className="h-7 text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200"
        data-testid="button-exit-demo-mode"
      >
        <X className="h-3 w-3 mr-1" />
        Exit Demo
      </Button>
    </div>
  );
}
