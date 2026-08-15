import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, DollarSign, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ScheduledPayment } from '../lib/supabase';

interface PaymentCalendarProps {
  scheduledPayments: ScheduledPayment[];
  onDateClick?: (date: Date, payments: ScheduledPayment[]) => void;
  selectedDate?: Date | null;
}

export const PaymentCalendar: React.FC<PaymentCalendarProps> = ({
  scheduledPayments,
  onDateClick,
  selectedDate
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get payments for a specific date
  const getPaymentsForDate = (date: Date): ScheduledPayment[] => {
    const dateStr = date.toISOString().split('T')[0];
    return scheduledPayments.filter(payment => {
      const paymentDate = new Date(payment.scheduled_date).toISOString().split('T')[0];
      return paymentDate === dateStr && payment.status === 'active';
    });
  };

  // Get all dates with payments
  const datesWithPayments = useMemo(() => {
    const dates = new Set<string>();
    scheduledPayments
      .filter(p => p.status === 'active')
      .forEach(payment => {
        const date = new Date(payment.scheduled_date).toISOString().split('T')[0];
        dates.add(date);
      });
    return dates;
  }, [scheduledPayments]);

  // Calendar generation
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: Array<{ date: Date; isCurrentMonth: boolean; payments: ScheduledPayment[] }> = [];
    
    // Previous month days
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i);
      days.push({
        date,
        isCurrentMonth: false,
        payments: getPaymentsForDate(date)
      });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        payments: getPaymentsForDate(date)
      });
    }
    
    // Next month days to fill the grid
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        payments: getPaymentsForDate(date)
      });
    }
    
    return days;
  }, [currentMonth, scheduledPayments]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const handleDateClick = (date: Date, payments: ScheduledPayment[]) => {
    if (onDateClick) {
      onDateClick(date, payments);
    }
  };

  const getTotalForDate = (payments: ScheduledPayment[]): number => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
        >
          Today
        </button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs sm:text-sm font-semibold text-gray-600 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayData, index) => {
          const { date, isCurrentMonth, payments } = dayData;
          const dateStr = date.toISOString().split('T')[0];
          const hasPayments = payments.length > 0;
          const isPast = date < new Date() && !isToday(date);
          const isFuture = date > new Date();
          const totalAmount = getTotalForDate(payments);

          return (
            <motion.button
              key={`${dateStr}-${index}`}
              onClick={() => handleDateClick(date, payments)}
              className={`
                relative p-2 sm:p-3 rounded-lg transition-all duration-200 text-left
                ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                ${isToday(date) ? 'bg-blue-50 border-2 border-blue-500' : ''}
                ${isSelected(date) ? 'bg-gray-100 border-2 border-gray-400' : ''}
                ${hasPayments && isCurrentMonth ? 'bg-green-50 hover:bg-green-100' : ''}
                ${!hasPayments && isCurrentMonth && !isToday(date) && !isSelected(date) ? 'hover:bg-gray-50' : ''}
                ${isPast && isCurrentMonth ? 'opacity-60' : ''}
              `}
              whileHover={{ scale: hasPayments ? 1.02 : 1 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Date Number */}
              <div className={`
                text-sm sm:text-base font-medium mb-1
                ${isToday(date) ? 'text-blue-600 font-bold' : ''}
                ${isSelected(date) ? 'text-gray-900 font-bold' : ''}
              `}>
                {date.getDate()}
              </div>

              {/* Payment Indicators */}
              {hasPayments && isCurrentMonth && (
                <div className="space-y-1">
                  {payments.slice(0, 2).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center space-x-1 text-xs bg-green-100 text-green-800 rounded px-1.5 py-0.5"
                    >
                      <DollarSign className="w-3 h-3" />
                      <span className="font-medium">${payment.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {payments.length > 2 && (
                    <div className="text-xs text-green-700 font-medium">
                      +{payments.length - 2} more
                    </div>
                  )}
                </div>
              )}

              {/* Total Amount Badge */}
              {hasPayments && isCurrentMonth && payments.length > 1 && (
                <div className="absolute top-1 right-1 bg-green-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {payments.length}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
          <span>Has scheduled payments</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-50 border-2 border-blue-500 rounded"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
          <span>Selected date</span>
        </div>
      </div>
    </div>
  );
};
