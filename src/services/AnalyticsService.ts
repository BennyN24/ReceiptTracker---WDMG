import type { Expense, Budget } from '../types';

// ─── Result Types ─────────────────────────────────────────

interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
}

interface TrendPoint {
  date: string;
  amount: number;
}

interface VendorStat {
  vendor: string;
  amount: number;
  count: number;
  average: number;
}

interface SpendingStats {
  total: number;
  average: number;
  median: number;
  min: number;
  max: number;
  count: number;
  standardDeviation: number;
}

interface BudgetComparison {
  category: string;
  actual: number;
  budgeted: number;
  remaining: number;
  percentageUsed: number;
}

interface MonthComparison {
  month: string;
  total: number;
  count: number;
}

interface Insight {
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  icon: string;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

// ─── Analytics Service ────────────────────────────────────

const AnalyticsService = {
  /**
   * Get spending by category for a date range
   */
  getSpendingByCategory(expenses: Expense[], startDate: string, endDate: string): CategorySpending[] {
    try {
      const filtered = this._filterByDateRange(expenses, startDate, endDate);
      const categoryMap: Record<string, number> = {};

      filtered.forEach((expense) => {
        if (!categoryMap[expense.category]) {
          categoryMap[expense.category] = 0;
        }
        categoryMap[expense.category] += expense.amount;
      });

      const total = Object.values(categoryMap).reduce((sum, amount) => sum + amount, 0);

      return Object.entries(categoryMap)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: total === 0 ? 0 : parseFloat(((amount / total) * 100).toFixed(2)),
        }))
        .sort((a, b) => b.amount - a.amount);
    } catch (error) {
      console.error('Get spending by category error:', error);
      return [];
    }
  },

  /**
   * Get spending trend over time (daily, weekly, monthly)
   */
  getSpendingTrend(expenses: Expense[], period: Period = 'daily', startDate: string, endDate: string): TrendPoint[] {
    try {
      const filtered = this._filterByDateRange(expenses, startDate, endDate);
      const trendMap: Record<string, number> = {};

      filtered.forEach((expense) => {
        const key = this._getPeriodKey(expense.date, period);
        if (!trendMap[key]) {
          trendMap[key] = 0;
        }
        trendMap[key] += expense.amount;
      });

      return Object.entries(trendMap)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Get spending trend error:', error);
      return [];
    }
  },

  /**
   * Get top vendors by spending
   */
  getTopVendors(expenses: Expense[], limit: number = 10, startDate: string, endDate: string): VendorStat[] {
    try {
      const filtered = this._filterByDateRange(expenses, startDate, endDate);
      const vendorMap: Record<string, { amount: number; count: number }> = {};

      filtered.forEach((expense) => {
        if (!vendorMap[expense.vendor]) {
          vendorMap[expense.vendor] = { amount: 0, count: 0 };
        }
        vendorMap[expense.vendor].amount += expense.amount;
        vendorMap[expense.vendor].count += 1;
      });

      return Object.entries(vendorMap)
        .map(([vendor, data]) => ({
          vendor,
          amount: data.amount,
          count: data.count,
          average: data.amount / data.count,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, limit);
    } catch (error) {
      console.error('Get top vendors error:', error);
      return [];
    }
  },

  /**
   * Get spending statistics for a period
   */
  getSpendingStats(expenses: Expense[], startDate: string, endDate: string): SpendingStats | null {
    try {
      const filtered = this._filterByDateRange(expenses, startDate, endDate);

      if (filtered.length === 0) {
        return {
          total: 0,
          average: 0,
          median: 0,
          min: 0,
          max: 0,
          count: 0,
          standardDeviation: 0,
        };
      }

      const amounts = filtered.map((e) => e.amount).sort((a, b) => a - b);
      const total = amounts.reduce((sum, a) => sum + a, 0);
      const average = total / amounts.length;
      const n = amounts.length;
      const median =
        n % 2 === 0
          ? (amounts[n / 2 - 1] + amounts[n / 2]) / 2
          : amounts[Math.floor(n / 2)];
      const min = amounts[0];
      const max = amounts[amounts.length - 1];

      // Calculate standard deviation
      const variance =
        amounts.reduce((sum, a) => sum + Math.pow(a - average, 2), 0) / amounts.length;
      const standardDeviation = Math.sqrt(variance);

      return {
        total: parseFloat(total.toFixed(2)),
        average: parseFloat(average.toFixed(2)),
        median: parseFloat(median.toFixed(2)),
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        count: amounts.length,
        standardDeviation: parseFloat(standardDeviation.toFixed(2)),
      };
    } catch (error) {
      console.error('Get spending stats error:', error);
      return null;
    }
  },

  /**
   * Get budget vs actual comparison
   */
  getBudgetComparison(expenses: Expense[], budgets: Budget[], startDate: string, endDate: string): BudgetComparison[] {
    try {
      const filtered = this._filterByDateRange(expenses, startDate, endDate);
      const categorySpending = this.getSpendingByCategory(filtered, startDate, endDate);

      return categorySpending.map((category) => {
        const budget = budgets.find((b) => b.categoryId === category.category);
        return {
          category: category.category,
          actual: category.amount,
          budgeted: budget ? budget.amount : 0,
          remaining: budget ? budget.amount - category.amount : -category.amount,
          percentageUsed: budget ? (category.amount / budget.amount) * 100 : 100,
        };
      });
    } catch (error) {
      console.error('Get budget comparison error:', error);
      return [];
    }
  },

  /**
   * Get month-over-month comparison
   */
  getMonthOverMonthComparison(expenses: Expense[], months: number = 3): MonthComparison[] {
    try {
      const comparison: MonthComparison[] = [];
      const now = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const startDate = date.toISOString().split('T')[0];
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0];

        const monthExpenses = this._filterByDateRange(expenses, startDate, endDate);
        const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

        comparison.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          total: parseFloat(total.toFixed(2)),
          count: monthExpenses.length,
        });
      }

      return comparison;
    } catch (error) {
      console.error('Get month over month comparison error:', error);
      return [];
    }
  },

  /**
   * Get spending insights and recommendations
   */
  getInsights(expenses: Expense[], budgets: Budget[], startDate: string, endDate: string): Insight[] {
    try {
      const stats = this.getSpendingStats(expenses, startDate, endDate);
      const byCategory = this.getSpendingByCategory(expenses, startDate, endDate);
      const topVendors = this.getTopVendors(expenses, 5, startDate, endDate);

      const insights: Insight[] = [];

      // High spending category
      if (byCategory.length > 0) {
        const highest = byCategory[0];
        insights.push({
          type: 'high_category',
          title: `High spending in ${highest.category}`,
          message: `You spent $${highest.amount.toFixed(2)} on ${highest.category} this period`,
          severity: 'info',
          icon: 'trending-up',
        });
      }

      // Frequent vendor
      if (topVendors.length > 0) {
        const frequent = topVendors[0];
        if (frequent.count > 3) {
          insights.push({
            type: 'frequent_vendor',
            title: `Frequent purchases at ${frequent.vendor}`,
            message: `You made ${frequent.count} purchases at ${frequent.vendor} (${frequent.average.toFixed(2)} average)`,
            severity: 'info',
            icon: 'store',
          });
        }
      }

      // Budget exceeded
      const exceeded = byCategory.filter((cat) => {
        const budget = budgets.find((b) => b.categoryId === cat.category);
        return budget && cat.amount > budget.amount;
      });

      if (exceeded.length > 0) {
        exceeded.forEach((cat) => {
          const budget = budgets.find((b) => b.categoryId === cat.category);
          if (budget) {
            const overage = cat.amount - budget.amount;
            insights.push({
              type: 'budget_exceeded',
              title: `Budget exceeded: ${budget.name}`,
              message: `You exceeded your ${budget.name} budget by $${overage.toFixed(2)}`,
              severity: 'warning',
              icon: 'warning',
            });
          }
        });
      }

      // Spending trend
      if (stats && stats.count > 5) {
        const trend = this.getSpendingTrend(expenses, 'daily', startDate, endDate);
        if (trend.length > 1) {
          const recent = trend.slice(-7);
          const average = recent.reduce((sum, t) => sum + t.amount, 0) / recent.length;
          const current = recent[recent.length - 1].amount;

          if (current > average * 1.2) {
            insights.push({
              type: 'spending_spike',
              title: 'Spending spike detected',
              message: `Your recent spending is ${((current / average - 1) * 100).toFixed(0)}% above average`,
              severity: 'warning',
              icon: 'show-chart',
            });
          }
        }
      }

      return insights;
    } catch (error) {
      console.error('Get insights error:', error);
      return [];
    }
  },

  /**
   * Filter expenses by date range
   */
  _filterByDateRange(expenses: Expense[], startDate: string, endDate: string): Expense[] {
    return expenses.filter((expense) => {
      const expenseDate = expense.date;
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  },

  /**
   * Get period key for grouping
   */
  _getPeriodKey(date: string, period: Period): string {
    const d = new Date(date);

    switch (period) {
      case 'daily':
        return date;
      case 'weekly': {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().split('T')[0];
      }
      case 'monthly':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      case 'yearly':
        return `${d.getFullYear()}`;
      default:
        return date;
    }
  },

  /**
   * Export analytics data as CSV
   */
  exportAnalyticsAsCSV(expenses: Expense[], startDate: string, endDate: string): string | null {
    try {
      const filtered = this._filterByDateRange(expenses, startDate, endDate);
      let csv = 'Date,Vendor,Category,Amount,Notes\n';

      filtered.forEach((expense) => {
        const notes = (expense.notes || '').replace(/"/g, '""');
        csv += `${expense.date},"${expense.vendor}","${expense.category}",${expense.amount},"${notes}"\n`;
      });

      return csv;
    } catch (error) {
      console.error('Export analytics error:', error);
      return null;
    }
  },
};

export default AnalyticsService;
