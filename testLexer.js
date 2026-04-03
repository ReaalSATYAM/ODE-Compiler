import { Lexer } from "./lexer.js";

const input = "dy/dx = sin(x) + y^2";

const lexer = new Lexer(input);
const tokens = lexer.tokenize();

console.log(tokens);