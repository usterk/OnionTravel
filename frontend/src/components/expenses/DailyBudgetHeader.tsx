import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import type { DailyBudgetStatistics } from '@/lib/expenses-api';
import { getStatusBadge, getDateTitle } from '@/lib/budget-utils';

export interface DailyBudgetHeaderProps {
  statistics: DailyBudgetStatistics;
  selectedDate: string;
  tripStartDate: string;
  tripEndDate: string;
  isAtTripStart: boolean;
  isAtTripEnd: boolean;
  isTodayInTripRange: boolean;
  isRefreshing: boolean;
  showHints: boolean;
  onChangeDay: (days: number) => void;
  onSetDate: (date: string) => void;
  onGoToToday: () => void;
  onGoToStart: () => void;
  onGoToEnd: () => void;
}

/**
 * Daily budget header with date navigation
 *
 * Features:
 * - Status badge (On Track, Warning, Over Budget, etc.)
 * - Previous/Next day buttons
 * - Calendar date picker
 * - Quick navigation (Today, Start, End)
 * - Visual swipe hints for mobile
 * - Day counter (Day X of Y)
 */
export function DailyBudgetHeader({
  statistics,
  selectedDate,
  tripStartDate,
  tripEndDate,
  isAtTripStart,
  isAtTripEnd,
  isTodayInTripRange,
  isRefreshing,
  showHints,
  onChangeDay,
  onSetDate,
  onGoToToday,
  onGoToStart,
  onGoToEnd,
}: DailyBudgetHeaderProps) {
  const status = getStatusBadge(statistics);
  const today = new Date().toISOString().split('T')[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          {/* Compact Navigation Panel with Swipe */}
          <div className="flex items-center justify-between gap-4 relative">
            {/* Visual Hints - Animated Arrows */}
            {showHints && !isAtTripStart && (
              <motion.div
                className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: [0.3, 0.7, 0.3], x: [20, 10, 20] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <ChevronLeft className="h-6 w-6 text-blue-500" />
              </motion.div>
            )}
            {showHints && !isAtTripEnd && (
              <motion.div
                className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: [0.3, 0.7, 0.3], x: [-20, -10, -20] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <ChevronRight className="h-6 w-6 text-blue-500" />
              </motion.div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChangeDay(-1)}
              disabled={isAtTripStart || isRefreshing}
              className="shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden md:inline ml-1">Previous</span>
            </Button>

            <div className="flex flex-col items-center gap-1 flex-1">
              {status && (
                <Badge style={status.style} className="mb-1">
                  {status.label}
                </Badge>
              )}
              <CardTitle className="flex items-center text-lg md:text-2xl">
                {selectedDate !== today ? (
                  <div className="relative group mr-2">
                    <Calendar
                      className="h-5 w-5 text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
                      onClick={onGoToToday}
                    />
                    <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Jump to Today
                    </div>
                  </div>
                ) : (
                  <Calendar className="h-5 w-5 mr-2" />
                )}
                {getDateTitle(statistics.date)}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Day {statistics.days_into_trip} of {statistics.total_days}
              </CardDescription>
              <div className="mt-2">
                <DatePicker
                  value={new Date(selectedDate)}
                  onChange={(date) => onSetDate(date.toISOString().split('T')[0])}
                  min={new Date(tripStartDate)}
                  max={new Date(tripEndDate)}
                  onStartClick={onGoToStart}
                  onTodayClick={onGoToToday}
                  onEndClick={onGoToEnd}
                  todayDisabled={!isTodayInTripRange}
                />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onChangeDay(1)}
              disabled={isAtTripEnd || isRefreshing}
              className="shrink-0"
            >
              <span className="hidden md:inline mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
