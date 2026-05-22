import hotelsJson from "../mock/hotels.json";
import inventoryJson from "../mock/inventory.json";
import productOpeningConfigJson from "../mock/productOpeningConfig.json";
import productsJson from "../mock/products.json";
import strategyConfigJson from "../mock/strategyConfig.json";
import type {
  Hotel,
  InventoryItem,
  Product,
  ProductOpeningConfig,
  StrategyConfig,
} from "../types/domain";

export const hotels = hotelsJson as Hotel[];
export const inventory = inventoryJson as InventoryItem[];
export const productOpeningConfigs = productOpeningConfigJson as ProductOpeningConfig[];
export const products = productsJson as Product[];
export const strategyConfig = strategyConfigJson as StrategyConfig;
