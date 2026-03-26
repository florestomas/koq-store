import { StockLocation } from "../interfaces/stock-location";

export const STOCK_LOCATIONS: StockLocation[] = [
  { id: '1', idProduct: '1', idLocation: '1', currentStock: 20, minimumStock: 5 },
  { id: '2', idProduct: '1', idLocation: '2', currentStock: 3, minimumStock: 2 },
  { id: '3', idProduct: '1', idLocation: '3', currentStock: 1, minimumStock: 2 },
  { id: '4', idProduct: '1', idLocation: '4', currentStock: 5, minimumStock: 2 },
  { id: '5', idProduct: '2', idLocation: '1', currentStock: 15, minimumStock: 5 },
  { id: '6', idProduct: '2', idLocation: '2', currentStock: 0, minimumStock: 2 },
  { id: '7', idProduct: '2', idLocation: '3', currentStock: 4, minimumStock: 2 },
  { id: '8', idProduct: '2', idLocation: '4', currentStock: 2, minimumStock: 2 },
  { id: '9', idProduct: '6', idLocation: '1', currentStock: 10, minimumStock: 3 },
  { id: '10', idProduct: '6', idLocation: '2', currentStock: 2, minimumStock: 1 },
  { id: '11', idProduct: '6', idLocation: '3', currentStock: 0, minimumStock: 1 },
  { id: '12', idProduct: '6', idLocation: '4', currentStock: 1, minimumStock: 1 }
]
