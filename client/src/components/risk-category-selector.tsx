import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RiskCategorySelectorProps {
  low: number;
  lowMedium: number;
  medium: number;
  mediumHigh: number;
  high: number;
  onLowChange: (value: number) => void;
  onLowMediumChange: (value: number) => void;
  onMediumChange: (value: number) => void;
  onMediumHighChange: (value: number) => void;
  onHighChange: (value: number) => void;
  testIdPrefix?: string;
}

// Common risk allocation presets
const PRESETS = [
  { label: "100% Low", low: 100, lowMedium: 0, medium: 0, mediumHigh: 0, high: 0 },
  { label: "100% L-M", low: 0, lowMedium: 100, medium: 0, mediumHigh: 0, high: 0 },
  { label: "100% Med", low: 0, lowMedium: 0, medium: 100, mediumHigh: 0, high: 0 },
  { label: "100% M-H", low: 0, lowMedium: 0, medium: 0, mediumHigh: 100, high: 0 },
  { label: "100% High", low: 0, lowMedium: 0, medium: 0, mediumHigh: 0, high: 100 },
  { label: "50/50 M-H", low: 0, lowMedium: 0, medium: 0, mediumHigh: 50, high: 50 },
  { label: "60/40 M-H", low: 0, lowMedium: 0, medium: 0, mediumHigh: 60, high: 40 },
];

export function RiskCategorySelector({
  low,
  lowMedium,
  medium,
  mediumHigh,
  high,
  onLowChange,
  onLowMediumChange,
  onMediumChange,
  onMediumHighChange,
  onHighChange,
  testIdPrefix = "risk",
}: RiskCategorySelectorProps) {
  const total = low + lowMedium + medium + mediumHigh + high;
  const isValid = total === 100;

  // Local display values for inputs (can be empty string for easier editing)
  const [lowDisplay, setLowDisplay] = useState(low === 0 ? "" : low.toString());
  const [lowMediumDisplay, setLowMediumDisplay] = useState(lowMedium === 0 ? "" : lowMedium.toString());
  const [mediumDisplay, setMediumDisplay] = useState(medium === 0 ? "" : medium.toString());
  const [mediumHighDisplay, setMediumHighDisplay] = useState(mediumHigh === 0 ? "" : mediumHigh.toString());
  const [highDisplay, setHighDisplay] = useState(high === 0 ? "" : high.toString());

  // Sync display values when props change (from preset clicks)
  useEffect(() => {
    setLowDisplay(low === 0 ? "" : low.toString());
  }, [low]);

  useEffect(() => {
    setLowMediumDisplay(lowMedium === 0 ? "" : lowMedium.toString());
  }, [lowMedium]);

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
    onLowChange(preset.low);
    onLowMediumChange(preset.lowMedium);
    onMediumChange(preset.medium);
    onMediumHighChange(preset.mediumHigh);
    onHighChange(preset.high);
  };

  // Auto-fill remaining to High when entering other values
  const autoFillHigh = (newLow: number, newLowMedium: number, newMedium: number, newMediumHigh: number) => {
    const remaining = 100 - newLow - newLowMedium - newMedium - newMediumHigh;
    if (remaining >= 0 && remaining <= 100) {
      onHighChange(remaining);
    }
  };

  const handleLowChange = (value: string) => {
    setLowDisplay(value);
    const num = parseInt(value) || 0;
    const clamped = Math.min(100, Math.max(0, num));
    onLowChange(clamped);
    autoFillHigh(clamped, lowMedium, medium, mediumHigh);
  };

  const handleLowMediumChange = (value: string) => {
    setLowMediumDisplay(value);
    const num = parseInt(value) || 0;
    const clamped = Math.min(100, Math.max(0, num));
    onLowMediumChange(clamped);
    autoFillHigh(low, clamped, medium, mediumHigh);
  };

  const handleMediumChange = (value: string) => {
    setMediumDisplay(value);
    const num = parseInt(value) || 0;
    const clamped = Math.min(100, Math.max(0, num));
    onMediumChange(clamped);
    autoFillHigh(low, lowMedium, clamped, mediumHigh);
  };

  const handleMediumHighChange = (value: string) => {
    setMediumHighDisplay(value);
    const num = parseInt(value) || 0;
    const clamped = Math.min(100, Math.max(0, num));
    onMediumHighChange(clamped);
    autoFillHigh(low, lowMedium, medium, clamped);
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
      setDisplay("");
      onChange(0);
    }
  };

  // Check if current values match a preset
  const activePreset = PRESETS.find(
    p => p.low === low && p.lowMedium === lowMedium && p.medium === medium && p.mediumHigh === mediumHigh && p.high === high
  );

  const inputClassName = cn(
    "flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm transition-colors",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    "disabled:cursor-not-allowed disabled:opacity-50"
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
            className="h-6 px-2 text-xs"
            onClick={() => applyPreset(preset)}
            data-testid={`${testIdPrefix}-preset-${preset.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Manual inputs - 5 columns */}
      <div className="grid grid-cols-5 gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Low %</label>
          <input
            type="number"
            min="0"
            max="100"
            step="10"
            className={inputClassName}
            data-testid={`${testIdPrefix}-low`}
            value={lowDisplay}
            onChange={(e) => handleLowChange(e.target.value)}
            onFocus={() => handleFocus(setLowDisplay, low)}
            onBlur={() => handleBlur(lowDisplay, setLowDisplay, onLowChange)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">L-Med %</label>
          <input
            type="number"
            min="0"
            max="100"
            step="10"
            className={inputClassName}
            data-testid={`${testIdPrefix}-low-medium`}
            value={lowMediumDisplay}
            onChange={(e) => handleLowMediumChange(e.target.value)}
            onFocus={() => handleFocus(setLowMediumDisplay, lowMedium)}
            onBlur={() => handleBlur(lowMediumDisplay, setLowMediumDisplay, onLowMediumChange)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Med %</label>
          <input
            type="number"
            min="0"
            max="100"
            step="10"
            className={inputClassName}
            data-testid={`${testIdPrefix}-medium`}
            value={mediumDisplay}
            onChange={(e) => handleMediumChange(e.target.value)}
            onFocus={() => handleFocus(setMediumDisplay, medium)}
            onBlur={() => handleBlur(mediumDisplay, setMediumDisplay, onMediumChange)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">M-Hi %</label>
          <input
            type="number"
            min="0"
            max="100"
            step="10"
            className={inputClassName}
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
            className={inputClassName}
            data-testid={`${testIdPrefix}-high`}
            value={highDisplay}
            onChange={(e) => handleHighChange(e.target.value)}
            onFocus={() => handleFocus(setHighDisplay, high)}
            onBlur={() => handleBlur(highDisplay, setHighDisplay, onHighChange)}
          />
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Click a preset or enter values. Remainder auto-fills to High.
      </p>
    </div>
  );
}
