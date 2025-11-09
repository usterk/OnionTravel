import * as React from 'react';
import { Select } from './select';

interface Currency {
  code: string;
  symbol: string;
  name: string;
}

const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
];

interface CurrencySelectorProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  showSymbol?: boolean;
}

const CurrencySelector = React.forwardRef<HTMLSelectElement, CurrencySelectorProps>(
  ({ value, onChange, showSymbol = true, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    return (
      <Select
        ref={ref}
        value={value}
        onChange={handleChange}
        className={className}
        {...props}
      >
        {CURRENCIES.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {showSymbol
              ? `${currency.symbol} ${currency.code} - ${currency.name}`
              : `${currency.code} - ${currency.name}`}
          </option>
        ))}
      </Select>
    );
  }
);

CurrencySelector.displayName = 'CurrencySelector';

export { CurrencySelector, CURRENCIES };
export type { Currency };
