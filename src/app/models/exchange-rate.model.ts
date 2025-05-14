export interface ExchangeRateData {
  date: Date;
  rate: number;
}

export interface ExchangeRateResponse {
  base: string;
  date: string;
  rates: {
    [key: string]: number;
  };
  success: boolean;
  timestamp: number;
}
