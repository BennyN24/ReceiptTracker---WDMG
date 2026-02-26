import type { BudgetPeriod } from '../types';

export interface PresetBudget {
  name: string;
  amount: number;
  period: BudgetPeriod;
  categoryId: string;
  color: string;
}

/**
 * Returns a set of default preset budgets that can be used
 * to initialise a new user's budget list.
 */
const getPresetBudgets = (): PresetBudget[] => [
  {
    name: 'Food & Dining',
    amount: 500,
    period: 'monthly',
    categoryId: '1',
    color: '#ef4444',
  },
  {
    name: 'Transportation',
    amount: 200,
    period: 'monthly',
    categoryId: '2',
    color: '#3b82f6',
  },
  {
    name: 'Shopping',
    amount: 300,
    period: 'monthly',
    categoryId: '3',
    color: '#f59e0b',
  },
  {
    name: 'Entertainment',
    amount: 150,
    period: 'monthly',
    categoryId: '4',
    color: '#8b5cf6',
  },
  {
    name: 'Bills & Utilities',
    amount: 400,
    period: 'monthly',
    categoryId: '5',
    color: '#06b6d4',
  },
];

export default getPresetBudgets;
