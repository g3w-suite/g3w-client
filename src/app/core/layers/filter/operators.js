export const OPERATORS =  {
  eq: '=',
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
  IN: 'IN',
  LIKE: 'LIKE',
  ILIKE: 'ILIKE',
  AND: 'AND',
  OR: 'OR',
  NOT: '!=',
  'NOT IN': 'NOT IN',
};

export const EXPRESSION_OPERATORS = {
  ...OPERATORS,
  'lte=': '<=',
  ltgt: '!=',
  like: 'LIKE',
  ilike: 'ILIKE',
};
