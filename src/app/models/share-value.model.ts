import { StockData } from './stock-data.model';
import { ExchangeRateData } from './exchange-rate.model';

export interface ShareValue {
  date: Date;
  usdValue: number;
  gbpValue: number;
}
