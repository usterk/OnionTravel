import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';
import type { CurrencyPairHistory } from '@/lib/currency-api';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';

// Colors for each currency
const CURRENCY_COLORS: Record<string, string> = {
  PLN: '#DC143C', // Polish red
  EUR: '#003399', // EU blue
  USD: '#228B22', // Dollar green
  GBP: '#4B0082', // Purple
  THB: '#FFD700', // Gold
  JPY: '#FF6347', // Tomato
  AUD: '#00CED1', // Dark turquoise
  CAD: '#FF4500', // Orange red
  CHF: '#FF1493', // Deep pink
};

interface CurrencyLineChartsProps {
  data: CurrencyPairHistory[];
  isLoading: boolean;
  error: string | null;
}

interface RateStats {
  change: number;
  changePercent: number;
  high: number;
  low: number;
  current: number;
}

function calculateStats(data: { date: string; rate: number }[]): RateStats | null {
  if (!data || data.length === 0) return null;

  const rates = data.map((d) => d.rate);
  const current = rates[rates.length - 1];
  const first = rates[0];
  const change = current - first;
  const changePercent = first !== 0 ? (change / first) * 100 : 0;

  return {
    change,
    changePercent,
    high: Math.max(...rates),
    low: Math.min(...rates),
    current,
  };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  toCurrency: string;
}

function CustomTooltip({ active, payload, label, toCurrency }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">
          {formatDate(label || '')}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          1 {data.name} = <span className="font-mono font-medium">{formatNumber(data.value, 4)}</span> {toCurrency}
        </p>
      </div>
    );
  }
  return null;
}

function RateChangeSummary({ stats }: { stats: RateStats }) {
  const isPositive = stats.changePercent > 0;
  const isNeutral = Math.abs(stats.changePercent) < 0.01;

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t">
      <div className="flex items-center gap-1">
        {isNeutral ? (
          <Minus className="h-3 w-3 text-gray-500" />
        ) : isPositive ? (
          <TrendingUp className="h-3 w-3 text-green-500" />
        ) : (
          <TrendingDown className="h-3 w-3 text-red-500" />
        )}
        <span
          className={
            isNeutral
              ? 'text-gray-500'
              : isPositive
              ? 'text-green-600'
              : 'text-red-600'
          }
        >
          {isPositive ? '+' : ''}
          {formatNumber(stats.changePercent, 2)}%
        </span>
      </div>
      <div className="flex gap-3">
        <span>
          High: <span className="font-mono">{formatNumber(stats.high, 4)}</span>
        </span>
        <span>
          Low: <span className="font-mono">{formatNumber(stats.low, 4)}</span>
        </span>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading chart data...</span>
      </CardContent>
    </Card>
  );
}

export function CurrencyLineCharts({ data, isLoading, error }: CurrencyLineChartsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">
            Select currencies to view exchange rate history
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((pair) => {
        const stats = calculateStats(pair.data);
        const color = CURRENCY_COLORS[pair.from_currency] || '#6366f1';

        return (
          <Card key={`${pair.from_currency}-${pair.to_currency}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {pair.from_currency} to {pair.to_currency}
                {stats && (
                  <span className="text-sm font-normal text-muted-foreground ml-auto">
                    Current: <span className="font-mono">{formatNumber(stats.current, 4)}</span>
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 sm:h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pair.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 10 }}
                      tickMargin={8}
                      interval="preserveStartEnd"
                      minTickGap={40}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => formatNumber(value, 2)}
                      width={50}
                    />
                    <Tooltip
                      content={<CustomTooltip toCurrency={pair.to_currency} />}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      name={pair.from_currency}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: color }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {stats && (
                <RateChangeSummary stats={stats} />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
