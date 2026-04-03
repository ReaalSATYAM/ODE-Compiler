import { TOKEN_TYPES } from "./tokens.js";
import { VARIABLES, FUNCTIONS } from "./grammar.js";

export class Lexer {
  constructor(input) {
    this.input = input;
    this.pos = 0;
    this.tokens = [];
  }

  peek() {
    return this.input[this.pos];
  }

  advance() {
    return this.input[this.pos++];
  }

  isAlpha(ch) {
    return /[a-zA-Z]/.test(ch);
  }

  isDigit(ch) {
    return /[0-9]/.test(ch);
  }

  skipWhitespace() {
    while (this.peek() && /\s/.test(this.peek())) {
      this.advance();
    }
  }

  matchDYDX() {
    if (this.input.slice(this.pos, this.pos + 5) === "dy/dx") {
      this.pos += 5;
      this.tokens.push({ type: TOKEN_TYPES.DYDX });
      return true;
    }
    return false;
  }

  readNumber() {
    let num = "";
    while (this.peek() && this.isDigit(this.peek())) {
      num += this.advance();
    }

    // handle decimals
    if (this.peek() === ".") {
      num += this.advance();
      while (this.peek() && this.isDigit(this.peek())) {
        num += this.advance();
      }
    }

    this.tokens.push({
      type: TOKEN_TYPES.NUMBER,
      value: parseFloat(num),
    });
  }

  readIdentifier() {
    let id = "";
    while (this.peek() && this.isAlpha(this.peek())) {
      id += this.advance();
    }

    if (VARIABLES.includes(id)) {
      this.tokens.push({
        type: TOKEN_TYPES.VARIABLE,
        value: id,
      });
    } else if (FUNCTIONS.includes(id)) {
      this.tokens.push({
        type: TOKEN_TYPES.FUNCTION,
        value: id,
      });
    } else {
      throw new Error(`Unknown identifier: ${id}`);
    }
  }

  tokenize() {
    while (this.pos < this.input.length) {
      this.skipWhitespace();

      if (this.matchDYDX()) continue;

      const ch = this.peek();

      if (!ch) break;

      // Numbers
      if (this.isDigit(ch)) {
        this.readNumber();
        continue;
      }

      // Identifiers (variables/functions)
      if (this.isAlpha(ch)) {
        this.readIdentifier();
        continue;
      }

      // Operators & Symbols
      switch (ch) {
        case "+":
          this.tokens.push({ type: TOKEN_TYPES.PLUS });
          break;
        case "-":
          this.tokens.push({ type: TOKEN_TYPES.MINUS });
          break;
        case "*":
          this.tokens.push({ type: TOKEN_TYPES.MUL });
          break;
        case "/":
          this.tokens.push({ type: TOKEN_TYPES.DIV });
          break;
        case "^":
          this.tokens.push({ type: TOKEN_TYPES.POW });
          break;
        case "=":
          this.tokens.push({ type: TOKEN_TYPES.EQUAL });
          break;
        case "(":
          this.tokens.push({ type: TOKEN_TYPES.LPAREN });
          break;
        case ")":
          this.tokens.push({ type: TOKEN_TYPES.RPAREN });
          break;
        default:
          throw new Error(`Unexpected character: ${ch}`);
      }

      this.advance();
    }

    return this.tokens;
  }
}