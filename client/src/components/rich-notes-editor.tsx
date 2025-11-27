import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { List, Square, CheckSquare, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichNotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

interface NoteLine {
  type: "text" | "bullet" | "checkbox";
  content: string;
  checked?: boolean;
}

function parseNotes(text: string): NoteLine[] {
  if (!text || text.trim() === "") {
    return [];
  }
  
  return text.split("\n").map((line) => {
    if (line.startsWith("[x] ")) {
      return { type: "checkbox", content: line.slice(4), checked: true };
    } else if (line.startsWith("[ ] ")) {
      return { type: "checkbox", content: line.slice(4), checked: false };
    } else if (line.startsWith("• ") || line.startsWith("- ")) {
      return { type: "bullet", content: line.slice(2) };
    } else {
      return { type: "text", content: line };
    }
  });
}

function serializeNotes(lines: NoteLine[]): string {
  return lines
    .map((line) => {
      if (line.type === "checkbox") {
        return line.checked ? `[x] ${line.content}` : `[ ] ${line.content}`;
      } else if (line.type === "bullet") {
        return `• ${line.content}`;
      } else {
        return line.content;
      }
    })
    .join("\n");
}

export function RichNotesEditor({
  value,
  onChange,
  placeholder = "Add notes...",
  className,
  "data-testid": testId,
}: RichNotesEditorProps) {
  const [lines, setLines] = useState<NoteLine[]>(() => parseNotes(value));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  useEffect(() => {
    const newLines = parseNotes(value);
    setLines(newLines);
  }, [value]);

  const updateLines = (newLines: NoteLine[]) => {
    setLines(newLines);
    onChange(serializeNotes(newLines));
  };

  const toggleCheckbox = (index: number) => {
    const newLines = [...lines];
    if (newLines[index].type === "checkbox") {
      newLines[index] = { ...newLines[index], checked: !newLines[index].checked };
      updateLines(newLines);
    }
  };

  const updateLineContent = (index: number, content: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], content };
    updateLines(newLines);
  };

  const addLine = (type: "text" | "bullet" | "checkbox") => {
    const newLine: NoteLine = {
      type,
      content: "",
      ...(type === "checkbox" ? { checked: false } : {}),
    };
    const newLines = [...lines, newLine];
    updateLines(newLines);
    setEditingIndex(lines.length);
    setTimeout(() => {
      inputRefs.current.get(lines.length)?.focus();
    }, 0);
  };

  const deleteLine = (index: number) => {
    const newLines = lines.filter((_, i) => i !== index);
    updateLines(newLines);
    setEditingIndex(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const currentLine = lines[index];
      const newLine: NoteLine = {
        type: currentLine.type,
        content: "",
        ...(currentLine.type === "checkbox" ? { checked: false } : {}),
      };
      const newLines = [...lines];
      newLines.splice(index + 1, 0, newLine);
      updateLines(newLines);
      setEditingIndex(index + 1);
      setTimeout(() => {
        inputRefs.current.get(index + 1)?.focus();
      }, 0);
    } else if (e.key === "Backspace" && lines[index].content === "") {
      e.preventDefault();
      if (lines.length > 1) {
        deleteLine(index);
        if (index > 0) {
          setEditingIndex(index - 1);
          setTimeout(() => {
            inputRefs.current.get(index - 1)?.focus();
          }, 0);
        }
      }
    }
  };

  const cycleLineType = (index: number) => {
    const newLines = [...lines];
    const current = newLines[index];
    if (current.type === "text") {
      newLines[index] = { type: "bullet", content: current.content };
    } else if (current.type === "bullet") {
      newLines[index] = { type: "checkbox", content: current.content, checked: false };
    } else {
      newLines[index] = { type: "text", content: current.content };
    }
    updateLines(newLines);
  };

  return (
    <div className={cn("space-y-2", className)} data-testid={testId}>
      <div className="flex gap-1 border-b pb-2 mb-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addLine("text")}
          className="h-7 px-2"
          data-testid={`${testId}-add-text`}
        >
          <Plus className="h-3 w-3 mr-1" />
          Text
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addLine("bullet")}
          className="h-7 px-2"
          data-testid={`${testId}-add-bullet`}
        >
          <List className="h-3 w-3 mr-1" />
          Bullet
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addLine("checkbox")}
          className="h-7 px-2"
          data-testid={`${testId}-add-checkbox`}
        >
          <Square className="h-3 w-3 mr-1" />
          Task
        </Button>
      </div>

      <div className="space-y-1 min-h-[100px]">
        {lines.length === 0 ? (
          <div 
            className="text-muted-foreground text-sm cursor-pointer p-2 hover:bg-muted/50 rounded"
            onClick={() => addLine("text")}
          >
            {placeholder}
          </div>
        ) : (
          lines.map((line, index) => (
            <div
              key={index}
              className="flex items-start gap-2 group"
            >
              {line.type === "checkbox" ? (
                <Checkbox
                  checked={line.checked}
                  onCheckedChange={() => toggleCheckbox(index)}
                  className="mt-1.5"
                  data-testid={`${testId}-checkbox-${index}`}
                />
              ) : line.type === "bullet" ? (
                <span className="mt-1 text-muted-foreground select-none">•</span>
              ) : (
                <span className="w-4" />
              )}
              <input
                ref={(el) => {
                  if (el) inputRefs.current.set(index, el);
                  else inputRefs.current.delete(index);
                }}
                type="text"
                value={line.content}
                onChange={(e) => updateLineContent(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onFocus={() => setEditingIndex(index)}
                className={cn(
                  "flex-1 bg-transparent border-none outline-none text-sm py-1",
                  line.type === "checkbox" && line.checked && "line-through text-muted-foreground"
                )}
                placeholder={
                  line.type === "checkbox" 
                    ? "Task item..." 
                    : line.type === "bullet" 
                    ? "Bullet point..." 
                    : "Text..."
                }
                data-testid={`${testId}-input-${index}`}
              />
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => cycleLineType(index)}
                  className="h-6 w-6"
                  title="Change type"
                  data-testid={`${testId}-cycle-${index}`}
                >
                  {line.type === "text" ? (
                    <List className="h-3 w-3" />
                  ) : line.type === "bullet" ? (
                    <Square className="h-3 w-3" />
                  ) : (
                    <CheckSquare className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteLine(index)}
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  data-testid={`${testId}-delete-${index}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
