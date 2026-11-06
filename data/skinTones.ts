export interface SkinTone {
  id: string;
  label: string;
  hex: string;
}

export const skinTones: readonly SkinTone[] = [
  { id: "porcelain", label: "Porcelain", hex: "#f3d5c0" },
  { id: "light", label: "Light", hex: "#e4b896" },
  { id: "medium", label: "Medium", hex: "#c99268" },
  { id: "tan", label: "Tan", hex: "#a96f47" },
  { id: "brown", label: "Brown", hex: "#80502f" },
  { id: "deep", label: "Deep", hex: "#4f2f1e" },
];

export const defaultSkinToneId = "medium";
