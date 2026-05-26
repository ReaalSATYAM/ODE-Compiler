import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";

const runTest = (name, input) => {
  console.log(`\n--- Test: ${name} ---`);
  console.log(`Input: ${input}`);

  try {
    const lexer = new Lexer(input);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parseEquation();

    console.log(JSON.stringify(ast, null, 2));
  } catch (err) {
    console.error(`Error parsing: ${err.message}`);
  }
};

// Simple test
runTest("Simple Equation", "dy/dx = sin(x) + y^2");

// Test operator precedence: Multiplication before addition
runTest("Operator Precedence", "dy/dx = 2 + 3 * x");

// Test operator precedence: Powers before multiplication
runTest("Powers Precedence", "dy/dx = 2 * x ^ 3");

// Test right-associativity of powers (x^y^z = x^(y^z))
runTest("Right-Associative Powers", "dy/dx = x ^ y ^ 2");

// Test explicit parentheses overriding precedence
runTest("Parentheses Override", "dy/dx = (2 + 3) * x");

// Test complex nesting
runTest("Complex Nesting", "dy/dx = sin(x + y * 2) ^ 2 - 1 / x");