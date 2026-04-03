import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";
import { Evaluator } from "./evaluator.js";

const input = "dy/dx = x + y^2";

const lexer = new Lexer(input);
const tokens = lexer.tokenize();

const parser = new Parser(tokens);
const ast = parser.parseEquation();

const evaluator = new Evaluator(ast);
const f = evaluator.buildFunction();

// Test values
console.log(f(1, 2)); // 1 + 4 = 5
console.log(f(2, 3)); // 2 + 9 = 11