export interface LocationStock {
  locationId: string;
  locationName: string;
  stock: number;
  minimumStock: number;
}

export interface ColorSizeRow {
  colorName: string;
  sizes: { size: string; stock: number; minStock: number }[];
}

export interface StockAlert {
  locationName: string;
  type: 'low' | 'out';
}

export interface ProductRef {
  id: string;
  idColor: string;
  size: string;
}

export interface StockRef {
  idProduct: string;
  idLocation: string;
  currentStock: number;
  minimumStock: number;
}

export interface CatalogItem {
  modelId: string;
  modelName: string;
  categoryName: string;
  imageUrl: string;
  totalStock: number;
  locationStocks: LocationStock[];
  colorSizeGrid: ColorSizeRow[];
  stockAlerts: StockAlert[];
  products: ProductRef[];
  allStocks: StockRef[];
}
