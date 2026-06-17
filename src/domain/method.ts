export const METHOD_KEYS = [
  "espresso",
  "moka",
  "v60",
  "aeropress",
  "french_press",
  "cold_brew",
  "cold_drip",
] as const;

export type MethodKey = (typeof METHOD_KEYS)[number];

export const METHOD_LABELS: Record<MethodKey, string> = {
  espresso: "Espresso",
  moka: "Moka",
  v60: "V60",
  aeropress: "Aeropress",
  french_press: "Prensa francesa",
  cold_brew: "Cold Brew",
  cold_drip: "Cold Drip",
};
