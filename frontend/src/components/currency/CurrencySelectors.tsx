import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { CURRENCIES } from '@/components/ui/currency-selector';

interface CurrencySelectorsProps {
  fromCurrencies: string[];
  toCurrency: string;
  tripCurrency: string;
  onFromCurrenciesChange: (currencies: string[]) => void;
  onToCurrencyChange: (currency: string) => void;
}

export function CurrencySelectors({
  fromCurrencies,
  toCurrency,
  tripCurrency,
  onFromCurrenciesChange,
  onToCurrencyChange,
}: CurrencySelectorsProps) {
  // Get currencies that are not already selected in other slots
  const getAvailableCurrencies = (currentIndex: number) => {
    const selectedInOtherSlots = fromCurrencies
      .filter((_, i) => i !== currentIndex)
      .filter(Boolean);

    return CURRENCIES.filter(
      (c) => !selectedInOtherSlots.includes(c.code) && c.code !== toCurrency
    );
  };

  const handleFromCurrencyChange = (index: number, value: string) => {
    const newCurrencies = [...fromCurrencies];
    newCurrencies[index] = value;
    onFromCurrenciesChange(newCurrencies);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Currency Comparison</CardTitle>
        <CardDescription>
          Compare exchange rates over the last 90 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* From Currencies (3 selectors) */}
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                From {index + 1}
              </Label>
              <Select
                value={fromCurrencies[index] || ''}
                onChange={(e) => handleFromCurrencyChange(index, e.target.value)}
                className="text-sm"
              >
                <option value="">Select...</option>
                {getAvailableCurrencies(index).map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code}
                  </option>
                ))}
              </Select>
            </div>
          ))}

          {/* To Currency */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              To (Trip)
            </Label>
            <Select
              value={toCurrency}
              onChange={(e) => onToCurrencyChange(e.target.value)}
              className="text-sm"
            >
              {CURRENCIES.filter(
                (c) => !fromCurrencies.includes(c.code)
              ).map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.code}
                  {currency.code === tripCurrency ? ' (Trip)' : ''}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
