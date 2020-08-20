export const OPERATORS =  {
  eq: '=',
  NOT: '!=',
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
  IN: 'IN',
  'NOT IN': 'NOT IN',
  LIKE: 'LIKE',
  ILIKE: 'ILIKE',
  AND: 'AND',
  OR: 'OR',
};

export const EXPRESSION_OPERATORS = {
  ...OPERATORS,
  'lte=': '<=',
  ltgt: '!=',
};
