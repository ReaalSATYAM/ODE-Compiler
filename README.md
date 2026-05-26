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
    - Token stream and hierarchical AST tree views.
    - Live Symbol Table and 2D Operator Precedence Matrix.
- **Execution:** Step-by-step processing .

---

## Architecture

The system follows a **modular compiler pipeline** paired with a numerical engine.

[![](https://mermaid.ink/img/pako:eNqVVNtu00AQ_ZXRVkUgnBDfE1dF8jWqgBI15QXMw9beJBbO2lrbrUPbn-IT-DLWl9hxC6LZh2g8mXNmZ-bM3qMgCQky0CpO7oINZjlcOz4Ffk5P4fxfp4v4hCMKHse-FNP8mt989CUjDC5oWuQGfHZcWOYsomsffW9CqjMavX_wERmvxxDu3oUlnEMJb2H3-5ePHsDiJB9JSViNaVBWi7lOfhBaURK8rWJtHrtgOM9hgVk2gNgtxE5olrMiyLMK4HCAecMdOMhhuaM5LuGaETIEjmvknFDCuUkNXNSZSEBCQgPCG8TLKuEV59jeJHF2gHe6xNs0ihu0y9HuLY4LnCeHl3Tb2NXrUoDdG_AKGuRRQiuMxzFXHxS4LLaERQGOYZnEt4MavYNUBb8oLJKINoXOq1FcwJzhdANXhIakG8MROlgWN-uKIXsJponJWgjYVcvaJjBYRCmJI0oGQrB60-5NpzcXvek2Jq_kWabLqr19m1y6fprIewZ-Wfn5Lq669uLigxhnmUNWEFULAKsojo0T0ZXNqSlw0XH1Gicz2VY9RwiSOGHGyao-7Z-juyjMN4aUlmdP-NJa3i2hbsum63SEtmIdT4iz_fUm6kzTZh2b5rq6pR_JRri2WzrXVKcTu6PzHMvUlSPpslroLaFjS5qk9YS2qZrqkYRFtC_W0zXN7Wcx8zT32NttSJx2t-O9VzW5I3RER3WsvxOGOOMvMcM7A1RQzwaaAbORzGEusAS7HfzA7VTDG3jcegADl9c2ceCc80YMHIu2mLODtdjvPGSH6q8-CN_pvaZFcSrpvWhkTfPEZ50b9uGQ6NLdE3nSTO6JXE_h5z9ESEBrFoXI4O86ERDf-y2uPtF9lcJH-YZs-f4b3Awx--Ejnz5yTIrp1yTZ7mEsKdYbZKxwnPGvIg35U-9EmNe-7bysfjjtpKA5MqqaaxZk3KMSGdJkMhb1ma4okqjLiq4KaIeMkawqY1UWpYmkqZIkz6aPAvpZ5xXHsiJOdE0Sp6rK41X58Q9I3lRo?type=png)](https://mermaid.live/edit#pako:eNqVVNtu00AQ_ZXRVkUgnBDfE1dF8jWqgBI15QXMw9beJBbO2lrbrUPbn-IT-DLWl9hxC6LZh2g8mXNmZ-bM3qMgCQky0CpO7oINZjlcOz4Ffk5P4fxfp4v4hCMKHse-FNP8mt989CUjDC5oWuQGfHZcWOYsomsffW9CqjMavX_wERmvxxDu3oUlnEMJb2H3-5ePHsDiJB9JSViNaVBWi7lOfhBaURK8rWJtHrtgOM9hgVk2gNgtxE5olrMiyLMK4HCAecMdOMhhuaM5LuGaETIEjmvknFDCuUkNXNSZSEBCQgPCG8TLKuEV59jeJHF2gHe6xNs0ihu0y9HuLY4LnCeHl3Tb2NXrUoDdG_AKGuRRQiuMxzFXHxS4LLaERQGOYZnEt4MavYNUBb8oLJKINoXOq1FcwJzhdANXhIakG8MROlgWN-uKIXsJponJWgjYVcvaJjBYRCmJI0oGQrB60-5NpzcXvek2Jq_kWabLqr19m1y6fprIewZ-Wfn5Lq669uLigxhnmUNWEFULAKsojo0T0ZXNqSlw0XH1Gicz2VY9RwiSOGHGyao-7Z-juyjMN4aUlmdP-NJa3i2hbsum63SEtmIdT4iz_fUm6kzTZh2b5rq6pR_JRri2WzrXVKcTu6PzHMvUlSPpslroLaFjS5qk9YS2qZrqkYRFtC_W0zXN7Wcx8zT32NttSJx2t-O9VzW5I3RER3WsvxOGOOMvMcM7A1RQzwaaAbORzGEusAS7HfzA7VTDG3jcegADl9c2ceCc80YMHIu2mLODtdjvPGSH6q8-CN_pvaZFcSrpvWhkTfPEZ50b9uGQ6NLdE3nSTO6JXE_h5z9ESEBrFoXI4O86ERDf-y2uPtF9lcJH-YZs-f4b3Awx--Ejnz5yTIrp1yTZ7mEsKdYbZKxwnPGvIg35U-9EmNe-7bysfjjtpKA5MqqaaxZk3KMSGdJkMhb1ma4okqjLiq4KaIeMkawqY1UWpYmkqZIkz6aPAvpZ5xXHsiJOdE0Sp6rK41X58Q9I3lRo)
1.  **User Input**: String representation of the ODE.
2.  **Lexer**: Breaks input into a stream of typed tokens.
3.  **Pratt Parser**: Transforms tokens into an Abstract Syntax Tree (AST) using strict operator precedence rules.
4.  **Evaluator**: Dynamically compiles the AST into an executable JS function for `f(x, y)`.
5.  **RK4 Solver**: Iteratively calculates the numerical solution using the compiled expression.
6.  **Visualization**: Renders the data points, token stream, symbol table, precedence matrix, and AST.

---

## Tech Stack

### Compiler Logic & Numerical Engine
- **JavaScript (ES Modules)**
- **Custom Lexer**: Robust tokenization for mathematical symbols.
- **Custom Parser**: Operator Precedence (Pratt) Parser for nested mathematical syntax.
- **Numerical Methods**: RK4 numerical integration algorithm.

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
The following files can be used to test the compiler (Unit Tests)
* testEvaluator.js
* testLexer.js
* testParser.js
* testSolver.js
