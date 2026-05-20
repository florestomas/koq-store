import { StockLocation } from '../interfaces/stock-location';

export const STOCK_LOCATIONS: StockLocation[] = [
  // ── Taller (1) — bien surtido ──
  { id: '1', idProduct: '1', idLocation: '1', currentStock: 20, minimumStock: 5 },
  { id: '2', idProduct: '2', idLocation: '1', currentStock: 18, minimumStock: 5 },
  { id: '3', idProduct: '7', idLocation: '1', currentStock: 15, minimumStock: 5 },
  { id: '4', idProduct: '13', idLocation: '1', currentStock: 12, minimumStock: 5 },
  { id: '5', idProduct: '19', idLocation: '1', currentStock: 15, minimumStock: 5 },
  { id: '6', idProduct: '24', idLocation: '1', currentStock: 10, minimumStock: 5 },
  { id: '7', idProduct: '29', idLocation: '1', currentStock: 8, minimumStock: 4 },
  { id: '8', idProduct: '37', idLocation: '1', currentStock: 6, minimumStock: 4 },
  { id: '9', idProduct: '45', idLocation: '1', currentStock: 5, minimumStock: 3 },
  { id: '10', idProduct: '53', idLocation: '1', currentStock: 4, minimumStock: 3 },
  // ── Local Avellaneda (2) — stock mixto ──
  { id: '11', idProduct: '1', idLocation: '2', currentStock: 3, minimumStock: 4 },
  { id: '12', idProduct: '2', idLocation: '2', currentStock: 2, minimumStock: 4 },
  { id: '13', idProduct: '7', idLocation: '2', currentStock: 0, minimumStock: 4 },
  { id: '14', idProduct: '13', idLocation: '2', currentStock: 1, minimumStock: 4 },
  { id: '15', idProduct: '19', idLocation: '2', currentStock: 1, minimumStock: 4 },
  { id: '16', idProduct: '24', idLocation: '2', currentStock: 0, minimumStock: 4 },
  { id: '17', idProduct: '29', idLocation: '2', currentStock: 5, minimumStock: 4 },
  { id: '18', idProduct: '37', idLocation: '2', currentStock: 3, minimumStock: 4 },
  { id: '19', idProduct: '45', idLocation: '2', currentStock: 0, minimumStock: 3 },
  { id: '20', idProduct: '53', idLocation: '2', currentStock: 2, minimumStock: 3 },
  // ── Local Lanús (3) — stock mixto ──
  { id: '21', idProduct: '1', idLocation: '3', currentStock: 0, minimumStock: 4 },
  { id: '22', idProduct: '2', idLocation: '3', currentStock: 0, minimumStock: 4 },
  { id: '23', idProduct: '19', idLocation: '3', currentStock: 4, minimumStock: 4 },
  { id: '24', idProduct: '24', idLocation: '3', currentStock: 3, minimumStock: 4 },
  { id: '25', idProduct: '29', idLocation: '3', currentStock: 0, minimumStock: 4 },
  { id: '26', idProduct: '45', idLocation: '3', currentStock: 1, minimumStock: 3 },
  { id: '27', idProduct: '53', idLocation: '3', currentStock: 0, minimumStock: 3 },
  // ── Local Quilmes (4) — stock mixto ──
  { id: '28', idProduct: '1', idLocation: '4', currentStock: 5, minimumStock: 4 },
  { id: '29', idProduct: '2', idLocation: '4', currentStock: 4, minimumStock: 4 },
  { id: '30', idProduct: '7', idLocation: '4', currentStock: 2, minimumStock: 4 },
  { id: '31', idProduct: '19', idLocation: '4', currentStock: 0, minimumStock: 4 },
  { id: '32', idProduct: '29', idLocation: '4', currentStock: 3, minimumStock: 4 },
  { id: '33', idProduct: '37', idLocation: '4', currentStock: 1, minimumStock: 4 },
  { id: '34', idProduct: '45', idLocation: '4', currentStock: 4, minimumStock: 3 },
  { id: '35', idProduct: '53', idLocation: '4', currentStock: 5, minimumStock: 3 },
  // ── Modelo 6: Remera oversized — stock saludable en todos lados ──
  { id: '36', idProduct: '58', idLocation: '1', currentStock: 20, minimumStock: 3 },
  { id: '37', idProduct: '58', idLocation: '2', currentStock: 12, minimumStock: 3 },
  { id: '38', idProduct: '58', idLocation: '3', currentStock: 8, minimumStock: 3 },
  { id: '39', idProduct: '58', idLocation: '4', currentStock: 15, minimumStock: 3 },
  // ── Modelo 7: Top cropped — stock saludable en todos lados ──
  { id: '40', idProduct: '64', idLocation: '1', currentStock: 25, minimumStock: 3 },
  { id: '41', idProduct: '64', idLocation: '2', currentStock: 10, minimumStock: 3 },
  { id: '42', idProduct: '64', idLocation: '3', currentStock: 6, minimumStock: 3 },
  { id: '43', idProduct: '64', idLocation: '4', currentStock: 12, minimumStock: 3 },
];
