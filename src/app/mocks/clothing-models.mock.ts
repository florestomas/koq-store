import { ClothingModel } from "../interfaces/clothing-model";

export const CLOTHING_MODELS: ClothingModel[] = [
  { id: '1', name: 'Remera básica cuello V', idCategory: '1', description: 'Remera de algodón simple', createdAt: '2024-01-10T10:00:00.000Z', active: true },
  { id: '2', name: 'Remera manga larga', idCategory: '1', description: 'Remera de algodón manga larga', createdAt: '2024-01-12T10:00:00.000Z', active: true },
  { id: '3', name: 'Jean recto clásico', idCategory: '2', description: 'Jean de corte recto', createdAt: '2024-02-01T10:00:00.000Z', active: true },
  { id: '4', name: 'Pantalón de vestir', idCategory: '2', createdAt: '2024-02-05T10:00:00.000Z', active: true },
  { id: '5', name: 'Vestido floral', idCategory: '3', description: 'Vestido con estampado floral', createdAt: '2024-03-01T10:00:00.000Z', active: true }
]
