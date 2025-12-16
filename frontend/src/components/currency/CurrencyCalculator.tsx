import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { CURRENCIES } from '@/components/ui/currency-selector';

interface CurrencyCalculatorProps {
  fromCurrencies: string[];
  toCurrency: string;
  tripBudget: number;
  latestRates: Record<string, number>; // from_currency -> rate (how many toCurrency per 1 from_currency)
}

function getCurrencySymbol(code: string): string {
  const currency = CURRENCIES.find((c) => c.code === code);
  return currency?.symbol || code;
}

// Safely convert to number and format
function safeNumber(value: unknown): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

function findBestDeal(
  rates: Record<string, number>,
  fromCurrencies: string[]
): string | null {
  // Best deal = highest rate (more trip currency per unit)
  let bestCurrency: string | null = null;
  let bestRate = 0;

  for (const currency of fromCurrencies) {
    if (currency && rates[currency] && rates[currency] > bestRate) {
      bestRate = rates[currency];
      bestCurrency = currency;
    }
  }

  return bestCurrency;
}

export function CurrencyCalculator({
  fromCurrencies,
  toCurrency,
  tripBudget,
  latestRates,
}: CurrencyCalculatorProps) {
  // Base amount is in trip currency (toCurrency) - always ensure it's a number
  const [baseAmount, setBaseAmount] = useState<number>(() => safeNumber(tripBudget));
  const [activeInput, setActiveInput] = useState<string | null>(null);

  // Reset to trip budget when it changes
  useEffect(() => {
    const budget = safeNumber(tripBudget);
    if (budget > 0) {
      setBaseAmount(budget);
    }
  }, [tripBudget]);

  // Safe base amount for calculations
  const safeBaseAmount = safeNumber(baseAmount);

  // Calculate converted values for each from currency
  const convertedValues = useMemo(() => {
    const result: Record<string, number> = {};
    fromCurrencies.forEach((currency) => {
      if (currency && latestRates[currency]) {
        // rate is how many toCurrency per 1 fromCurrency
        // so fromCurrency amount = baseAmount / rate
        result[currency] = safeBaseAmount / latestRates[currency];
      }
    });
    return result;
  }, [safeBaseAmount, fromCurrencies, latestRates]);

  // Handle base currency (trip currency) input change
  const handleBaseAmountChange = (value: string) => {
    setBaseAmount(safeNumber(value));
  };

  // Handle from currency input change
  const handleFromCurrencyChange = (currency: string, value: string) => {
    const numValue = safeNumber(value);
    if (latestRates[currency]) {
      // Convert to base currency
      setBaseAmount(numValue * latestRates[currency]);
    }
  };

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBaseAmount(safeNumber(e.target.value));
  };

  const bestDeal = findBestDeal(latestRates, fromCurrencies);
  const validFromCurrencies = fromCurrencies.filter(
    (c) => c && latestRates[c]
  );

  const safeTripBudget = safeNumber(tripBudget);
  const maxSliderValue = safeTripBudget > 0 ? safeTripBudget * 2 : 10000;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Currency Calculator
        </CardTitle>
        <CardDescription>
          Compare how much your budget is worth in different currencies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Slider for quick adjustment */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Amount in {toCurrency}</span>
            <span className="font-mono font-medium">
              {getCurrencySymbol(toCurrency)} {formatNumber(safeBaseAmount, 2)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={maxSliderValue}
            step={maxSliderValue / 200}
            value={safeBaseAmount}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>{formatNumber(safeTripBudget, 0)} (budget)</span>
            <span>{formatNumber(maxSliderValue, 0)}</span>
          </div>
        </div>

        {/* Currency Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Trip currency (base) */}
          <div
            className={`space-y-1.5 p-3 rounded-lg border-2 ${
              activeInput === toCurrency
                ? 'border-primary bg-primary/5'
                : 'border-primary/30 bg-primary/5'
            }`}
          >
            <Label className="text-xs flex items-center gap-1.5">
              {getCurrencySymbol(toCurrency)} {toCurrency}
              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                Trip
              </Badge>
            </Label>
            <Input
              type="number"
              value={safeBaseAmount.toFixed(2)}
              onChange={(e) => handleBaseAmountChange(e.target.value)}
              onFocus={() => setActiveInput(toCurrency)}
              onBlur={() => setActiveInput(null)}
              className="font-mono text-base h-9"
            />
          </div>

          {/* From currencies */}
          {validFromCurrencies.map((currency) => (
            <div
              key={currency}
              className={`space-y-1.5 p-3 rounded-lg border ${
                activeInput === currency
                  ? 'border-primary bg-gray-50'
                  : 'border-gray-200'
              } ${currency === bestDeal ? 'ring-1 ring-green-500' : ''}`}
            >
              <Label className="text-xs flex items-center gap-1.5">
                {getCurrencySymbol(currency)} {currency}
                {currency === bestDeal && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-green-500 text-green-600">
                    Best
                  </Badge>
                )}
              </Label>
              <Input
                type="number"
                value={safeNumber(convertedValues[currency]).toFixed(2)}
                onChange={(e) => handleFromCurrencyChange(currency, e.target.value)}
                onFocus={() => setActiveInput(currency)}
                onBlur={() => setActiveInput(null)}
                className="font-mono text-base h-9"
              />
              <p className="text-[10px] text-muted-foreground">
                1 {currency} = {formatNumber(safeNumber(latestRates[currency]), 4)} {toCurrency}
              </p>
            </div>
          ))}
        </div>

        {/* Best Deal Indicator */}
        {bestDeal && validFromCurrencies.length > 1 && latestRates[bestDeal] && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-800">
              <span className="font-medium">{bestDeal}</span> currently offers the best exchange rate
              ({formatNumber(latestRates[bestDeal], 4)} {toCurrency} per 1 {bestDeal})
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
