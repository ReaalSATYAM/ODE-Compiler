import { TOKEN_TYPES } from "./tokens.js";

// Define precedences for infix operators
const PRECEDENCE = {
  [TOKEN_TYPES.PLUS]: 10,
  [TOKEN_TYPES.MINUS]: 10,
  [TOKEN_TYPES.MUL]: 20,
  [TOKEN_TYPES.DIV]: 20,
  [TOKEN_TYPES.POW]: 30, // Highest precedence
};

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos];
  }

  advance() {
    return this.tokens[this.pos++];
  }

  expect(type) {
    const token = this.peek();
    if (!token || token.type !== type) {
      throw new Error(`Expected ${type}, got ${token?.type}`);
    }
    return this.advance();
  }

  getPrecedence(tokenType) {
    return PRECEDENCE[tokenType] || 0;
  }

  // Parses: DYDX EQUAL expression
  parseEquation() {
    this.expect(TOKEN_TYPES.DYDX);
    this.expect(TOKEN_TYPES.EQUAL);

    const right = this.parseExpression(0);

    return {
      type: "Equation",
      right,
    };
  }

  // Operator Precedence (Pratt) expression parsing core
  parseExpression(precedence = 0) {
    let token = this.peek();
    if (!token) {
      throw new Error("Unexpected end of input");
    }

    // 1. Parse Prefix (Numbers, Variables, Functions, Parentheses)
    let left = this.parsePrefix();

    // 2. Parse Infix (Operators: +, -, *, /, ^)
    // Keep looping as long as the next token has a strictly higher precedence
    while (this.peek() && precedence < this.getPrecedence(this.peek().type)) {
      left = this.parseInfix(left);
    }

    return left;
  }

  // Handles things that appear at the START of an expression (prefix)
  parsePrefix() {
    const token = this.advance();

    if (token.type === TOKEN_TYPES.NUMBER) {
      return {
        type: "Number",
        value: token.value,
      };
    }

    if (token.type === TOKEN_TYPES.VARIABLE) {
      return {
        type: "Variable",
        name: token.value,
      };
    }

    if (token.type === TOKEN_TYPES.FUNCTION) {
      const funcName = token.value;
      this.expect(TOKEN_TYPES.LPAREN);
      const argument = this.parseExpression(0);
      this.expect(TOKEN_TYPES.RPAREN);

      return {
        type: "FunctionCall",
        name: funcName,
        argument,
      };
    }

    if (token.type === TOKEN_TYPES.LPAREN) {
      const expr = this.parseExpression(0);
      this.expect(TOKEN_TYPES.RPAREN);
      return expr;
    }

    throw new Error(`Unexpected prefix token: ${token.type}`);
  }

  // Handles things that appear BETWEEN expressions (infix operators)
  parseInfix(left) {
    const token = this.advance();
    const operator = token.type;

    let bindingPower = this.getPrecedence(operator);

    // Right-Associativity for POW (e.g., 2^3^4 = 2^(3^4))

    if (operator === TOKEN_TYPES.POW) {
      bindingPower -= 1;
    }

    const right = this.parseExpression(bindingPower);

    return {
      type: "BinaryOp",
      operator,
      left,
      right,
    };
  }
}