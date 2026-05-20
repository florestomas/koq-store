export interface LocationStock {
  locationId: string;
  locationName: string;
  stock: number;
  minimumStock: number;
}

export interface ColorSizeRow {
  colorName: string;
  sizes: { size: string; stock: number }[];
}

export interface StockAlert {
  locationName: string;
  type: 'low' | 'out';
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
}
