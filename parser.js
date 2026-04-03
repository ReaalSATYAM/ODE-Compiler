import { TOKEN_TYPES } from "./tokens.js";

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


  // equation -> DYDX = expression

  parseEquation() {
    this.expect(TOKEN_TYPES.DYDX);
    this.expect(TOKEN_TYPES.EQUAL);

    const right = this.parseExpression();

    return {
      type: "Equation",
      right,
    };
  }

 
  // expression -> term ((+|-) term)*
 
  parseExpression() {
    let node = this.parseTerm();

    while (
      this.peek() &&
      (this.peek().type === TOKEN_TYPES.PLUS ||
        this.peek().type === TOKEN_TYPES.MINUS)
    ) {
      const operator = this.advance().type;
      const right = this.parseTerm();

      node = {
        type: "BinaryOp",
        operator,
        left: node,
        right,
      };
    }

    return node;
  }

  // term -> factor ((*|/) factor)*
  parseTerm() {
    let node = this.parsePower();

    while (
      this.peek() &&
      (this.peek().type === TOKEN_TYPES.MUL ||
        this.peek().type === TOKEN_TYPES.DIV)
    ) {
      const operator = this.advance().type;
      const right = this.parsePower();

      node = {
        type: "BinaryOp",
        operator,
        left: node,
        right,
      };
    }

    return node;
  }


  // power -> primary (^ power)?

  parsePower() {
    let node = this.parsePrimary();

    if (this.peek() && this.peek().type === TOKEN_TYPES.POW) {
      const operator = this.advance().type;
      const right = this.parsePower(); // right-associative

      node = {
        type: "BinaryOp",
        operator,
        left: node,
        right,
      };
    }

    return node;
  }


  // primary -> NUMBER | VARIABLE | FUNCTION(expr) | (expr)

  parsePrimary() {
    const token = this.peek();

    if (!token) {
      throw new Error("Unexpected end of input");
    }

    // NUMBER
    if (token.type === TOKEN_TYPES.NUMBER) {
      this.advance();
      return {
        type: "Number",
        value: token.value,
      };
    }

    // VARIABLE
    if (token.type === TOKEN_TYPES.VARIABLE) {
      this.advance();
      return {
        type: "Variable",
        name: token.value,
      };
    }

    // FUNCTION
    if (token.type === TOKEN_TYPES.FUNCTION) {
      const funcName = token.value;
      this.advance();

      this.expect(TOKEN_TYPES.LPAREN);
      const argument = this.parseExpression();
      this.expect(TOKEN_TYPES.RPAREN);

      return {
        type: "FunctionCall",
        name: funcName,
        argument,
      };
    }

    // (expression)
    if (token.type === TOKEN_TYPES.LPAREN) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TOKEN_TYPES.RPAREN);
      return expr;
    }

    throw new Error(`Unexpected token: ${token.type}`);
  }
}