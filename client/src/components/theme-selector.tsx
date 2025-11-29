import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/hooks/useTheme";
import { THEMES, type Theme } from "@/lib/themes";

export function ThemeSelector() {
  const { theme, setTheme, isDark, toggleDarkMode } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
        <SelectTrigger className="w-[140px] h-9" data-testid="select-theme">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(THEMES).map(([key, { name }]) => (
            <SelectItem key={key} value={key}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDarkMode}
        data-testid="button-dark-mode-toggle"
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle dark mode</span>
      </Button>
    </div>
  );
}
