export interface StockMovement {
  id: string;
  dateTime: string;
  idProduct: string;
  idLocation: string;
  type: 'in' | 'out';
  quantity: number;
  referenceType: 'sale' | 'transfer' | 'ingreso';
  referenceId: string;
}
