const colorMap: Record<string, string> = {
  NEGRO: '#000000',
  BLANCO: '#FFFFFF',
  BORDO: '#800020',
  AZUL: '#0000FF',
  'VERDE PETROLEO': '#006D5B',
  FUCSIA: '#FF00FF',
  ROJO: '#FF0000',
  BEIGE: '#F5F5DC',
  GRIS: '#808080',
  'VERDE OLIVA': '#556B2F',
  ROSA: '#FFC0CB',
  LILA: '#C8A2C8',
  TERRACOTA: '#E2725B',
  LADRILLO: '#B22222',
  MARRON: '#8B4513',
  'AZUL PETROLEO': '#1C3B4D',
  'GRIS TOPO': '#8B8682',
  VERDE: '#008000',
  'ROSA VIEJO': '#C08081',
  'CELESTE AGUA': '#87CEEB',
  CHAMPAGNE: '#F7E7CE',
  MOSTAZA: '#FFDB58',
  VIOLETA: '#8B00FF',
  TURQUESA: '#40E0D0',
  CREMA: '#FFFDD0',
  'AZUL FRANCIA': '#318CE7',
};

export function getColorHex(name: string): string {
  return colorMap[name.toUpperCase().trim()] ?? '#cccccc';
}
