export const OPERATORS = {
  equals: "=",
  not: "<>",
  lt: "<",
  lte: "<=",
  gt: ">",
  gte: ">=",
  in: "IN",
  notIn: "NOT IN",
  contains: "ILIKE",
  startsWith: "ILIKE",
  endsWith: "ILIKE",
};

export type OperatorKey = keyof typeof OPERATORS;
