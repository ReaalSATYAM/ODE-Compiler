import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";

const input = "dy/dx = sin(x) + y^2";

const lexer = new Lexer(input);
const tokens = lexer.tokenize();

const parser = new Parser(tokens);
const ast = parser.parseEquation();

console.log(JSON.stringify(ast, null, 2));