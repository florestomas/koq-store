export interface SaleDetail {
  id: string;
  idSale: string;
  idProduct: string | null;
  quantity: number;
  unitPrice: number;
  originalPrice?: number;
}
