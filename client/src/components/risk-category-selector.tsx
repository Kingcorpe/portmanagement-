import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RiskCategorySelectorProps {
  medium: number;
  mediumHigh: number;
  high: number;
  onMediumChange: (value: number) => void;
  onMediumHighChange: (value: number) => void;
  onHighChange: (value: number) => void;
  testIdPrefix?: string;
}

// Common risk allocation presets
const PRESETS = [
  { label: "100% Med", medium: 100, mediumHigh: 0, high: 0 },
  { label: "100% M-H", medium: 0, mediumHigh: 100, high: 0 },
  { label: "100% High", medium: 0, mediumHigh: 0, high: 100 },
  { label: "50/50", medium: 0, mediumHigh: 50, high: 50 },
  { label: "60/40", medium: 0, mediumHigh: 60, high: 40 },
  { label: "40/60", medium: 0, mediumHigh: 40, high: 60 },
];

export function RiskCategorySelector({
  medium,
  mediumHigh,
  high,
  onMediumChange,
  onMediumHighChange,
  onHighChange,
  testIdPrefix = "risk",
}: RiskCategorySelectorProps) {
  const total = medium + mediumHigh + high;
  const isValid = total === 100;

  // Local display values for inputs (can be empty string for easier editing)
  const [mediumDisplay, setMediumDisplay] = useState(medium.toString());
  const [mediumHighDisplay, setMediumHighDisplay] = useState(mediumHigh.toString());
  const [highDisplay, setHighDisplay] = useState(high.toString());

  // Sync display values when props change (from preset clicks)
  useEffect(() => {
    setMediumDisplay(medium === 0 ? "" : medium.toString());
  }, [medium]);

  useEffect(() => {
    setMediumHighDisplay(mediumHigh === 0 ? "" : mediumHigh.toString());
  }, [mediumHigh]);

  useEffect(() => {
    setHighDisplay(high === 0 ? "" : high.toString());
  }, [high]);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    onMediumChange(preset.medium);
    onMediumHighChange(preset.mediumHigh);
    onHighChange(preset.high);
  };

  const handleMediumChange = (value: string) => {
    setMediumDisplay(value);
    const num = parseInt(value) || 0;
    onMediumChange(Math.min(100, Math.max(0, num)));
    // Auto-fill remaining to High
    const remaining = 100 - num - mediumHigh;
    if (remaining >= 0 && remaining <= 100) {
      onHighChange(remaining);
    }
  };

  const handleMediumHighChange = (value: string) => {
    setMediumHighDisplay(value);
    const num = parseInt(value) || 0;
    onMediumHighChange(Math.min(100, Math.max(0, num)));
    // Auto-fill remaining to High
    const remaining = 100 - medium - num;
    if (remaining >= 0 && remaining <= 100) {
      onHighChange(remaining);
    }
  };

  const handleHighChange = (value: string) => {
    setHighDisplay(value);
    const num = parseInt(value) || 0;
    onHighChange(Math.min(100, Math.max(0, num)));
  };

  const handleFocus = (
    setDisplay: (val: string) => void,
    currentValue: number
  ) => {
    if (currentValue === 0) {
      setDisplay("");
    }
  };

  const handleBlur = (
    display: string,
    setDisplay: (val: string) => void,
    onChange: (val: number) => void
  ) => {
    if (display === "" || display === undefined) {
      setDisplay("0");
      onChange(0);
    }
  };

  // Check if current values match a preset
  const activePreset = PRESETS.find(
    p => p.medium === medium && p.mediumHigh === mediumHigh && p.high === high
  );

  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Risk Category (Required)</span>
        <span className={cn(
          "text-xs font-medium",
          isValid ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
        )}>
          Total: {total}%
          {isValid && " ✓"}
        </span>
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant={activePreset?.label === preset.label ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => applyPreset(preset)}
            data-testid={`${testIdPrefix}-preset-${preset.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Manual inputs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Medium %</label>
          <input
            type="number"
            min="0"
            max="100"
            step="10"
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            data-testid={`${testIdPrefix}-medium`}
            value={mediumDisplay}
            onChange={(e) => handleMediumChange(e.target.value)}
            onFocus={() => handleFocus(setMediumDisplay, medium)}
            onBlur={() => handleBlur(mediumDisplay, setMediumDisplay, onMediumChange)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Med-High %</label>
          <input
            type="number"
            min="0"
            max="100"
            step="10"
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            data-testid={`${testIdPrefix}-medium-high`}
            value={mediumHighDisplay}
            onChange={(e) => handleMediumHighChange(e.target.value)}
            onFocus={() => handleFocus(setMediumHighDisplay, mediumHigh)}
            onBlur={() => handleBlur(mediumHighDisplay, setMediumHighDisplay, onMediumHighChange)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">High %</label>
          <input
            type="number"
            min="0"
            max="100"
            step="10"
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            data-testid={`${testIdPrefix}-high`}
            value={highDisplay}
            onChange={(e) => handleHighChange(e.target.value)}
            onFocus={() => handleFocus(setHighDisplay, high)}
            onBlur={() => handleBlur(highDisplay, setHighDisplay, onHighChange)}
          />
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Click a preset or enter values manually. Remainder auto-fills to High.
      </p>
    </div>
  );
}

