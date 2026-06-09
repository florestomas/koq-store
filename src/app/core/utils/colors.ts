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
  NARANJA: '#FFA500',
  AMARILLO: '#FFD700',
  'ROSA CLARO': '#FFB6C1',
  'VERDE AGUA': '#00CED1',
  CAMEL: '#C19A6B',
  'VERDE OSCURO': '#006400',
  'AZUL MARINO': '#000080',
  'AZUL FRANCIA': '#318CE7',
  CELESTE: '#ADD8E6',
  'ESTAMPADO LILA/BLANCO': '#D8BFD8',
  'ESTAMPADO NEGRO/BLANCO': '#999999',
};

export function getColorHex(name: string): string {
  return colorMap[name.toUpperCase().trim()] ?? '#cccccc';
}

/** Returns priority for sorting: 0=BLANCO, 1=NEGRO, then main colors, 99=rest (alphabetical). */
export function colorPriority(name: string): number {
  const n = name.toUpperCase().trim();
  const index = [
    'BLANCO',
    'NEGRO',
    'ROJO',
    'AZUL',
    'VERDE',
    'ROSA',
    'AMARILLO',
    'NARANJA',
    'VIOLETA',
    'GRIS',
    'MARRON',
  ].indexOf(n);
  return index === -1 ? 99 : index;
}
