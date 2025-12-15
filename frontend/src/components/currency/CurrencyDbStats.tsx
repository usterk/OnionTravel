import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Calendar, RefreshCw } from 'lucide-react';
import { currencyApi, type CurrencyDbStatsResponse } from '@/lib/currency-api';
import { Button } from '@/components/ui/button';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function CurrencyDbStats() {
  const [stats, setStats] = useState<CurrencyDbStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await currencyApi.getDbStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch DB stats:', err);
      setError('Failed to load database statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading database statistics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-red-600">{error || 'No data'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" />
          Exchange Rate Cache
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 w-6 p-0"
            onClick={fetchStats}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Total records:</span>
            <Badge variant="secondary" className="font-mono">
              {stats.total_records.toLocaleString()}
            </Badge>
          </div>
          {stats.date_range_start && stats.date_range_end && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">
                {formatDate(stats.date_range_start)} - {formatDate(stats.date_range_end)}
              </span>
            </div>
          )}
        </div>

        {/* Per-pair stats */}
        {stats.pairs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {stats.pairs.map((pair) => (
              <div
                key={`${pair.from_currency}-${pair.to_currency}`}
                className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
              >
                <span className="font-medium">
                  {pair.from_currency}/{pair.to_currency}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs px-1.5 py-0">
                    {pair.record_count}
                  </Badge>
                  <span className="text-muted-foreground text-[10px]">
                    {formatDate(pair.oldest_date)} - {formatDate(pair.newest_date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {stats.pairs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No exchange rates cached yet. Rates will be fetched when you use the currency features.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
