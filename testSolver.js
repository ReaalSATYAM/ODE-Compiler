import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";
import { Evaluator } from "./evaluator.js";
import { ODESolver } from "./solver.js";

const input = "dy/dx = x + y^2";

// Step 1: Tokenize
const lexer = new Lexer(input);
const tokens = lexer.tokenize();

// Step 2: Parse
const parser = new Parser(tokens);
const ast = parser.parseEquation();

// Step 3: Build function
const evaluator = new Evaluator(ast);
const f = evaluator.buildFunction();

// Step 4: Solve ODE
const solver = new ODESolver(f);

// Initial condition: y(0) = 1
const result = solver.solveRK4(0, 1, 0.1, 10);

console.log(result);