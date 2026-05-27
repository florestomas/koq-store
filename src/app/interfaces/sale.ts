export interface Sale {
  id: string;
  dateTime: string;
  idLocation: string;
  idUser: string;
  channel: 'local' | 'whatsapp';
  discountType?: 'percentage' | 'fixed_amount' | 'none';
  discountValue?: number;
  note?: string;
  status: 'active' | 'cancelled';
  cancelledAt?: string;
}
