export class Evaluator {
  constructor(ast) {
    this.ast = ast;
  }

  evaluate(node, context) {
    switch (node.type) {
      case "Number":
        return node.value;

      case "Variable":
        if (!(node.name in context)) {
          throw new Error(`Undefined variable: ${node.name}`);
        }
        return context[node.name];

      case "BinaryOp":
        return this.evalBinary(node, context);

      case "FunctionCall":
        return this.evalFunction(node, context);

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  evalBinary(node, context) {
    const left = this.evaluate(node.left, context);
    const right = this.evaluate(node.right, context);

    switch (node.operator) {
      case "PLUS":
        return left + right;
      case "MINUS":
        return left - right;
      case "MUL":
        return left * right;
      case "DIV":
        return left / right;
      case "POW":
        return Math.pow(left, right);
      default:
        throw new Error(`Unknown operator: ${node.operator}`);
    }
  }

  evalFunction(node, context) {
    const arg = this.evaluate(node.argument, context);

    switch (node.name) {
      case "sin":
        return Math.sin(arg);
      case "cos":
        return Math.cos(arg);
      case "exp":
        return Math.exp(arg);
      case "log":
        return Math.log(arg);
      default:
        throw new Error(`Unknown function: ${node.name}`);
    }
  }

  buildFunction() {
    const expr = this.ast.right;

    return (x, y) => {
      return this.evaluate(expr, { x, y });
    };
  }
}