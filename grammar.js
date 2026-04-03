export const GRAMMAR = {
  equation: ["DYDX", "EQUAL", "expression"],

  expression: [
    ["term"],
    ["expression", "PLUS", "term"],
    ["expression", "MINUS", "term"],
  ],

  term: [
    ["factor"],
    ["term", "MUL", "factor"],
    ["term", "DIV", "factor"],
  ],

  factor: [
    ["power"],
  ],

  power: [
    ["primary"],
    ["primary", "POW", "factor"],
  ],

  primary: [
    ["NUMBER"],
    ["VARIABLE"],
    ["FUNCTION", "LPAREN", "expression", "RPAREN"],
    ["LPAREN", "expression", "RPAREN"],
  ],
};

export const VARIABLES = ["x", "y"];
export const FUNCTIONS = ["sin", "cos", "exp", "log"];