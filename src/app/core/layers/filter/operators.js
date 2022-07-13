export const OPERATORS = {
  gte: '>=',
  lte: '<=',
  NOT: '!=',
  eq: '=',
  gt: '>',
  lt: '<',
  IN: 'IN',
  'NOT IN': 'NOT IN',
  LIKE: 'LIKE',
  ILIKE: 'ILIKE',
  AND: 'AND',
  OR: 'OR',
};

export const EXPRESSION_OPERATORS = {
  lte: '<=',
  ltgt: '!=',
  ilike: 'ILIKE',
  like: 'LIKE',
  ...OPERATORS,
};
