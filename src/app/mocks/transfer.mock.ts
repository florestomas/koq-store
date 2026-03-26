import { Transfer } from "../interfaces/transfer";

export const TRANSFERS: Transfer[] = [
  { id: '1', dateTime: '2024-03-18T09:00:00.000Z', idOrigin: '1', idDestination: '2', idUserOrigin: '1', idUserDestination: '2', status: 'confirmed', confirmedAt: '2024-03-18T15:00:00.000Z' },
  { id: '2', dateTime: '2024-03-21T10:00:00.000Z', idOrigin: '1', idDestination: '3', idUserOrigin: '1', status: 'pending' },
  { id: '3', dateTime: '2024-03-22T09:00:00.000Z', idOrigin: '1', idDestination: '4', idUserOrigin: '1', status: 'cancelled' }
]
