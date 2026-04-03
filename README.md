# ODE Compiler & Solver

A modular compiler-inspired tool to parse, evaluate, and numerically solve first-order Ordinary Differential Equations (ODEs) using the Runge-Kutta (RK4) method.

---

## Features

- **Natural Input:** Enter ODEs in standard form (e.g., `dy/dx = x + y`).
- **Tokenization:** Built-in Lexer for scanning mathematical expressions.
- **AST Generation:** Parser creates an Abstract Syntax Tree for execution.
- **Expression Evaluation:** Dynamic evaluation of `f(x, y)`.
- **RK4 Solver:** High-accuracy numerical solving using the 4th Order Runge-Kutta method.
- **Visualizations:** 
    - Interactive solution curve graphs.
    - Token stream and AST tree views.
    - Live Symbol Table display.
- **Execution:** Step-by-step processing .

---

## Architecture

The system follows a **modular compiler pipeline**:

1.  **User Input**: String representation of the ODE.
2.  **Lexer**: Breaks input into a stream of tokens.
3.  **Parser**: Transforms tokens into an Abstract Syntax Tree (AST).
4.  **Evaluator**: Computes the numerical value of the expression at `(x, y)`.
5.  **RK4 Solver**: Iteratively calculates the numerical solution.
6.  **Visualization**: Renders the graph and UI components.

---

## Tech Stack

### Backend (Compiler Logic)
- **JavaScript (ES Modules)**
- **Custom Lexer & Parser**: Recursive Descent Parsing.
- **Numerical Methods**: RK4 algorithm.

### Frontend
- **React**: UI Framework.
- **Tailwind CSS**: Styling.
- **Recharts**: Data visualization and graphing.
- **Framer Motion**: Smooth UI animations.

---

# Getting Started

### 1️ Clone the Repository
```bash
git clone https://github.com/ReaalSATYAM/ODE-Compiler
cd ODE-Compiler
```
### 2️ Install Dependencies

```bash
npm install
npm install framer-motion recharts
```
### 3️ Run the Project
```bash
npm run dev
```

### Example Input

**Equation:**  
`dy/dx = x + y^2`

**Initial Conditions:**  
*   **x0** = 0  
*   **y0** = 1  
*   **h (step size)** = 0.1  
*   **steps** = 50  

---

### Limitations

*   **Supports first-order ODEs only.**  
*   **Limited function support:** Currently only `sin`, `cos`, `exp`, and `log`.  
*   **Fixed step-size:** No adaptive step-size logic implemented.  
*   **Numerical only:** Does not provide symbolic or analytical solutions.  

---

### Future Improvements

*   **Adaptive RK4:** Implement error-based step-size adjustment.  
*   **Expanded Math Library:** Support for `tan`, `pi`, `e`, and more constants.  
*   **Robust Error Handling:** Better syntax error reporting in the UI.  
*   **UI/UX:** Enhanced interactive AST visualization.

## Note 
The following files can be used to test the compiler
* testEvaluator.js
* testLexer.js
* testParser.js
* testSolver.js
