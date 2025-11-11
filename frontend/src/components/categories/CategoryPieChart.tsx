import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';
import type { CategoryWithStats } from '@/types/models';

interface CategoryPieChartProps {
  categories: CategoryWithStats[];
  tripCurrency?: string;
}

export function CategoryPieChart({ categories, tripCurrency = 'USD' }: CategoryPieChartProps) {
  const chartData = useMemo(() => {
    return categories
      .filter((cat) => (cat.budget_percentage || 0) > 0)
      .map((cat) => ({
        name: cat.name,
        value: cat.budget_percentage || 0,
        color: cat.color,
        spent: cat.total_spent,
        allocated: cat.allocated_budget,
      }))
      .sort((a, b) => b.value - a.value);
  }, [categories]);

  const totalPercentage = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600 mt-1">
            Budget: {formatNumber(data.value, 1)}%
          </p>
          <p className="text-sm text-gray-600">
            Allocated: {tripCurrency} {formatNumber(data.allocated)}
          </p>
          <p className="text-sm text-gray-600">
            Spent: {tripCurrency} {formatNumber(data.spent)}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if percentage is >= 5%
    if (percent * 100 < 5) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${formatNumber(percent * 100, 1)}%`}
      </text>
    );
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Distribution</CardTitle>
          <CardDescription>No budget allocated to categories yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>Assign budget percentages to categories to see the distribution</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Distribution</CardTitle>
        <CardDescription>
          {formatNumber(totalPercentage, 1)}% of budget allocated across {chartData.length}{' '}
          {chartData.length === 1 ? 'category' : 'categories'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'transparent' }}
                wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                position={{ x: 0, y: 0 }}
                allowEscapeViewBox={{ x: true, y: true }}
                isAnimationActive={false}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value, entry: any) => (
                  <span className="text-sm text-gray-700">
                    {value} ({formatNumber(entry.payload.value, 1)}%)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary info */}
        {totalPercentage !== 100 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600 text-center">
              {totalPercentage < 100 ? (
                <>
                  {formatNumber(100 - totalPercentage, 1)}% unallocated
                </>
              ) : (
                <span className="text-red-600 font-medium">
                  Over-allocated by {formatNumber(totalPercentage - 100, 1)}%
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
