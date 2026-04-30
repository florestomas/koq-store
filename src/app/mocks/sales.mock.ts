import { Sale } from '../interfaces/sale';

export const SALES: Sale[] = [
  {
    id: '1',
    dateTime: '2024-03-20T10:30:00.000Z',
    idLocation: '2',
    idUser: '2',
    channel: 'local',
    status: 'active',
  },
  {
    id: '2',
    dateTime: '2024-03-20T14:00:00.000Z',
    idLocation: '2',
    idUser: '2',
    channel: 'whatsapp',
    discountType: 'percentage',
    discountValue: 10,
    status: 'active',
  },
  {
    id: '3',
    dateTime: '2024-03-21T11:00:00.000Z',
    idLocation: '3',
    idUser: '3',
    channel: 'local',
    status: 'active',
  },
  {
    id: '4',
    dateTime: '2024-03-21T16:00:00.000Z',
    idLocation: '4',
    idUser: '4',
    channel: 'mercadolibre',
    status: 'cancelled',
    cancelledAt: '2024-03-21T18:00:00.000Z',
  },
];
