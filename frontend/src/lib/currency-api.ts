import api from './api';

// Types for currency history API

export interface RateDataPoint {
  date: string;
  rate: number;
}

export interface CurrencyPairHistory {
  from_currency: string;
  to_currency: string;
  data: RateDataPoint[];
}

export interface CurrencyHistoryResponse {
  pairs: CurrencyPairHistory[];
  from_date: string;
  to_date: string;
}

export interface ExchangeRateResponse {
  from_currency: string;
  to_currency: string;
  rate: number;
  date: string;
}

export interface SupportedCurrenciesResponse {
  currencies: string[];
}

export interface CurrencyPairStats {
  from_currency: string;
  to_currency: string;
  record_count: number;
  oldest_date: string | null;
  newest_date: string | null;
}

export interface CurrencyDbStatsResponse {
  total_records: number;
  pairs: CurrencyPairStats[];
  date_range_start: string | null;
  date_range_end: string | null;
}

// Currency API functions

export const currencyApi = {
  /**
   * Get historical exchange rates for multiple currency pairs
   * @param fromCurrencies Array of source currencies (max 3)
   * @param toCurrency Target currency
   * @param days Number of days of history (default 90)
   */
  getHistory: async (
    fromCurrencies: string[],
    toCurrency: string,
    days: number = 90
  ): Promise<CurrencyHistoryResponse> => {
    // Filter out empty strings and currencies that match toCurrency
    const validFromCurrencies = fromCurrencies.filter(
      (c) => c && c !== toCurrency
    );

    if (validFromCurrencies.length === 0) {
      return { pairs: [], from_date: '', to_date: '' };
    }

    const response = await api.get<CurrencyHistoryResponse>('/currency/history', {
      params: {
        from_currencies: validFromCurrencies.join(','),
        to_currency: toCurrency,
        days,
      },
    });

    return response.data;
  },

  /**
   * Get current exchange rate for a currency pair
   */
  getRate: async (
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRateResponse> => {
    const response = await api.get<ExchangeRateResponse>('/currency/rates', {
      params: {
        from_currency: fromCurrency,
        to_currency: toCurrency,
      },
    });
    return response.data;
  },

  /**
   * Get rates for multiple currency pairs at once
   * @param fromCurrencies Array of source currencies
   * @param toCurrency Target currency
   * @returns Map of from_currency to rate
   */
  getRates: async (
    fromCurrencies: string[],
    toCurrency: string
  ): Promise<Record<string, number>> => {
    const rates: Record<string, number> = {};

    const validFromCurrencies = fromCurrencies.filter(
      (c) => c && c !== toCurrency
    );

    // Fetch rates in parallel
    await Promise.all(
      validFromCurrencies.map(async (fromCurrency) => {
        try {
          const response = await api.get<ExchangeRateResponse>('/currency/rates', {
            params: {
              from_currency: fromCurrency,
              to_currency: toCurrency,
            },
          });
          rates[fromCurrency] = response.data.rate;
        } catch (error) {
          console.error(`Failed to get rate for ${fromCurrency}:`, error);
        }
      })
    );

    return rates;
  },

  /**
   * Get list of supported currencies
   */
  getSupportedCurrencies: async (): Promise<string[]> => {
    const response = await api.get<SupportedCurrenciesResponse>('/currency/supported');
    return response.data.currencies;
  },

  /**
   * Get database statistics for cached exchange rates
   */
  getDbStats: async (): Promise<CurrencyDbStatsResponse> => {
    const response = await api.get<CurrencyDbStatsResponse>('/currency/db-stats');
    return response.data;
  },
};

export default currencyApi;
