export const getDefaultPresetBudgets = () => {
  return [
    {
      name: 'Food & Dining',
      amount: 400,
      period: 'monthly',
      categoryId: '1',
      isPreset: true,
    },
    {
      name: 'Transportation',
      amount: 300,
      period: 'monthly',
      categoryId: '2',
      isPreset: true,
    },
    {
      name: 'Shopping',
      amount: 250,
      period: 'monthly',
      categoryId: '3',
      isPreset: true,
    },
    {
      name: 'Entertainment',
      amount: 150,
      period: 'monthly',
      categoryId: '4',
      isPreset: true,
    },
    {
      name: 'Bills & Utilities',
      amount: 500,
      period: 'monthly',
      categoryId: '5',
      isPreset: true,
    },
    {
      name: 'Healthcare',
      amount: 200,
      period: 'monthly',
      categoryId: '6',
      isPreset: true,
    },
    {
      name: 'Education',
      amount: 300,
      period: 'monthly',
      categoryId: '7',
      isPreset: true,
    },
  ];
};

export const getPresetBudgetByCategory = (categoryId) => {
  const presets = getDefaultPresetBudgets();
  return presets.find(budget => budget.categoryId === categoryId);
};
