import { StockMovement } from '../interfaces/stock-movement';

export let STOCK_MOVEMENTS: StockMovement[] = [
  // Sale 1 — 2 items out at Avellaneda
  { id: '1', dateTime: '2024-03-20T10:30:00.000Z', idProduct: '1', idLocation: '2', type: 'out', quantity: 2, referenceType: 'sale', referenceId: '1' },
  { id: '2', dateTime: '2024-03-20T10:30:00.000Z', idProduct: '6', idLocation: '2', type: 'out', quantity: 1, referenceType: 'sale', referenceId: '1' },
  // Sale 2 — 1 item out at Avellaneda
  { id: '3', dateTime: '2024-03-20T14:00:00.000Z', idProduct: '2', idLocation: '2', type: 'out', quantity: 3, referenceType: 'sale', referenceId: '2' },
  // Sale 3 — 1 item out at Lanús
  { id: '4', dateTime: '2024-03-21T11:00:00.000Z', idProduct: '8', idLocation: '3', type: 'out', quantity: 1, referenceType: 'sale', referenceId: '3' },
  // Transfer 1 — confirmed: out at Taller, in at Avellaneda
  { id: '5', dateTime: '2024-03-18T15:00:00.000Z', idProduct: '1', idLocation: '1', type: 'out', quantity: 5, referenceType: 'transfer', referenceId: '1' },
  { id: '6', dateTime: '2024-03-18T15:00:00.000Z', idProduct: '1', idLocation: '2', type: 'in', quantity: 5, referenceType: 'transfer', referenceId: '1' },
  { id: '7', dateTime: '2024-03-18T15:00:00.000Z', idProduct: '6', idLocation: '1', type: 'out', quantity: 3, referenceType: 'transfer', referenceId: '1' },
  { id: '8', dateTime: '2024-03-18T15:00:00.000Z', idProduct: '6', idLocation: '2', type: 'in', quantity: 3, referenceType: 'transfer', referenceId: '1' },
];
