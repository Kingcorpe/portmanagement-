export type Theme = "default" | "futuristic" | "minimal";

export const THEMES: Record<Theme, { name: string; description: string }> = {
  default: {
    name: "Default",
    description: "Clean and professional design"
  },
  futuristic: {
    name: "Futuristic",
    description: "Cyberpunk aesthetic with glowing effects"
  },
  minimal: {
    name: "Minimal",
    description: "Simple and clean interface"
  }
};

export function getThemeClass(theme: Theme): string {
  return `theme-${theme}`;
}
