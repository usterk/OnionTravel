import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import type { StatusBadge } from '../utils/budgetCalculations';
import { getDateTitle } from '../utils/formatters';

export interface DailyBudgetHeaderProps {
  selectedDate: string;
  tripStartDate: string;
  tripEndDate: string;
  daysIntoTrip: number;
  totalDays: number;
  statusBadge: StatusBadge | null;
  isAtTripStart: boolean;
  isAtTripEnd: boolean;
  isTodayInTripRange: boolean;
  isRefreshing: boolean;
  showHints: boolean;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onDateChange: (date: Date) => void;
  onTodayClick: () => void;
  onStartClick: () => void;
  onEndClick: () => void;
}

/**
 * Header component with date navigation and status badge
 */
export function DailyBudgetHeader({
  selectedDate,
  tripStartDate,
  tripEndDate,
  daysIntoTrip,
  totalDays,
  statusBadge,
  isAtTripStart,
  isAtTripEnd,
  isTodayInTripRange,
  isRefreshing,
  showHints,
  onPreviousDay,
  onNextDay,
  onDateChange,
  onTodayClick,
  onStartClick,
  onEndClick,
}: DailyBudgetHeaderProps) {
  const today = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === today;
  const dateTitle = getDateTitle(selectedDate);

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
              onClick={onPreviousDay}
              disabled={isAtTripStart || isRefreshing}
              className="shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden md:inline ml-1">Previous</span>
            </Button>

            <div className="flex flex-col items-center gap-1 flex-1">
              {statusBadge && (
                <Badge style={statusBadge.style} className="mb-1">
                  {statusBadge.label}
                </Badge>
              )}
              <CardTitle className="flex items-center text-lg md:text-2xl">
                {!isToday ? (
                  <div className="relative group mr-2">
                    <Calendar
                      className="h-5 w-5 text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
                      onClick={onTodayClick}
                    />
                    <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Jump to Today
                    </div>
                  </div>
                ) : (
                  <Calendar className="h-5 w-5 mr-2" />
                )}
                {dateTitle}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Day {daysIntoTrip} of {totalDays}
              </CardDescription>
              <div className="mt-2">
                <DatePicker
                  value={new Date(selectedDate)}
                  onChange={onDateChange}
                  min={new Date(tripStartDate)}
                  max={new Date(tripEndDate)}
                  onStartClick={onStartClick}
                  onTodayClick={onTodayClick}
                  onEndClick={onEndClick}
                  todayDisabled={!isTodayInTripRange}
                />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onNextDay}
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
