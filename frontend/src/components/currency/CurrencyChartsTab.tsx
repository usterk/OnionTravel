import { useState, useEffect, useCallback, useMemo } from 'react';
import { CurrencySelectors } from './CurrencySelectors';
import { CurrencyLineCharts } from './CurrencyLineCharts';
import { CurrencyCalculator } from './CurrencyCalculator';
import { CurrencyDbStats } from './CurrencyDbStats';
import { currencyApi, type CurrencyPairHistory } from '@/lib/currency-api';

interface CurrencyChartsTabProps {
  tripCurrency: string;
  tripBudget: number;
}

/**
 * Get default "from" currencies based on trip currency.
 * Default is PLN, EUR, USD - but if trip currency is one of these,
 * that slot is left empty.
 */
function getDefaultFromCurrencies(tripCurrency: string): string[] {
  const defaults = ['PLN', 'EUR', 'USD'];
  return defaults.map((c) => (c === tripCurrency ? '' : c));
}

export function CurrencyChartsTab({
  tripCurrency,
  tripBudget,
}: CurrencyChartsTabProps) {
  // State for currency selection
  const [fromCurrencies, setFromCurrencies] = useState<string[]>(() =>
    getDefaultFromCurrencies(tripCurrency)
  );
  const [toCurrency, setToCurrency] = useState(tripCurrency);

  // Historical data state
  const [historyData, setHistoryData] = useState<CurrencyPairHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Latest rates for calculator (extracted from history data)
  const latestRates = useMemo(() => {
    const rates: Record<string, number> = {};
    for (const pair of historyData) {
      if (pair.data && pair.data.length > 0) {
        // Get the most recent rate
        const lastRate = pair.data[pair.data.length - 1];
        rates[pair.from_currency] = lastRate.rate;
      }
    }
    return rates;
  }, [historyData]);

  // Fetch historical data
  const fetchHistoricalData = useCallback(async () => {
    const validFromCurrencies = fromCurrencies.filter(
      (c) => c && c !== toCurrency
    );

    if (validFromCurrencies.length === 0) {
      setHistoryData([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await currencyApi.getHistory(
        validFromCurrencies,
        toCurrency,
        90
      );
      setHistoryData(response.pairs);
    } catch (err: unknown) {
      console.error('Failed to fetch currency history:', err);
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to load exchange rate history';
      setError(errorMessage);
      setHistoryData([]);
    } finally {
      setIsLoading(false);
    }
  }, [fromCurrencies, toCurrency]);

  // Fetch data when currencies change
  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  // Update default currencies if trip currency changes
  useEffect(() => {
    setToCurrency(tripCurrency);
    setFromCurrencies(getDefaultFromCurrencies(tripCurrency));
  }, [tripCurrency]);

  return (
    <div className="space-y-4">
      {/* Currency Selectors */}
      <CurrencySelectors
        fromCurrencies={fromCurrencies}
        toCurrency={toCurrency}
        tripCurrency={tripCurrency}
        onFromCurrenciesChange={setFromCurrencies}
        onToCurrencyChange={setToCurrency}
      />

      {/* Line Charts - Stacked Vertically */}
      <CurrencyLineCharts
        data={historyData}
        isLoading={isLoading}
        error={error}
      />

      {/* Currency Calculator */}
      <CurrencyCalculator
        fromCurrencies={fromCurrencies}
        toCurrency={toCurrency}
        tripBudget={tripBudget}
        latestRates={latestRates}
      />

      {/* Database Stats */}
      <CurrencyDbStats />
    </div>
  );
}
