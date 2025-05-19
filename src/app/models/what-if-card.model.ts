export interface WhatIfCard {
  id: string;
  name: string;
  order: number;
  useCurrentStockPrice: boolean;
  useCurrentExchangeRate: boolean;
  customStockPrice: number | null;
  customExchangeRate: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatIfCardValue {
  usdValue: number;
  gbpValue: number;
}
