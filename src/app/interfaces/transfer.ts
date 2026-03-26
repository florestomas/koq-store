export interface Transfer {
  id: string
  dateTime: string
  idOrigin: string
  idDestination: string
  idUserOrigin: string
  idUserDestination?: string
  status: 'pending' | 'confirmed' | 'cancelled'
  confirmedAt?: string
  note?: string
}
