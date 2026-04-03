import { useState, useEffect, useRef, useCallback } from "react";
import { Lexer } from "../lexer.js";
import { Parser } from "../parser.js";
import { Evaluator } from "../evaluator.js";
import { ODESolver } from "../solver.js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// ─── SVG Icon Components ─────────────────────────────────────────────────────

function IconTokens({ className = "" }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconTree({ className = "" }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="2" />
      <circle cx="6" cy="14" r="2" />
      <circle cx="18" cy="14" r="2" />
      <circle cx="12" cy="20" r="2" />
      <path d="M12 6v4l-6 4" />
      <path d="M12 10l6 4" />
      <path d="M12 16v4" />
    </svg>
  );
}

function IconTable({ className = "" }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
    </svg>
  );
}

function IconGear({ className = "" }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function IconChart({ className = "" }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h18" />
      <path d="M3 20V4" />
      <path d="M6 16l4-8 4 4 4-8" />
    </svg>
  );
}

function IconCurve({ className = "" }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20c2-4 4-16 10-16s8 12 10 16" />
    </svg>
  );
}

// ─── Compiler pipeline ───────────────────────────────────────────────────────

function compile(input) {
  const lexer = new Lexer(input);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parseEquation();
  const evaluator = new Evaluator(ast);
  const f = evaluator.buildFunction();
  return { tokens, ast, f };
}

function extractSymbols(ast) {
  const vars = new Set();
  const funcs = new Set();
  function walk(node) {
    if (!node) return;
    if (node.type === "Variable") vars.add(node.name);
    if (node.type === "FunctionCall") { funcs.add(node.name); walk(node.argument); }
    if (node.type === "BinaryOp") { walk(node.left); walk(node.right); }
    if (node.type === "Equation") walk(node.right);
  }
  walk(ast);
  return { vars: [...vars], funcs: [...funcs] };
}

// ─── Token style map ─────────────────────────────────────────────────────────

const TOKEN_COLORS = {
  DYDX:     { bg: "rgba(244,63,94,0.15)", border: "rgba(244,63,94,0.35)", color: "#fb7185", label: "dy/dx" },
  EQUAL:    { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)", color: "#94a3b8", label: "=" },
  PLUS:     { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)", color: "#fbbf24", label: "+" },
  MINUS:    { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)", color: "#fbbf24", label: "−" },
  MUL:      { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)", color: "#fbbf24", label: "×" },
  DIV:      { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)", color: "#fbbf24", label: "÷" },
  POW:      { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)", color: "#fbbf24", label: "^" },
  LPAREN:   { bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.3)", color: "#94a3b8", label: "(" },
  RPAREN:   { bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.3)", color: "#94a3b8", label: ")" },
  NUMBER:   { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)", color: "#34d399", label: null },
  VARIABLE: { bg: "rgba(34,211,238,0.12)", border: "rgba(34,211,238,0.3)", color: "#22d3ee", label: null },
  FUNCTION: { bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)", color: "#a78bfa", label: null },
};

// ─── AST tree renderer ───────────────────────────────────────────────────────

function ASTNode({ node, depth = 0, isRoot = true }) {
  if (!node) return null;

  const colorMap = {
    BinaryOp: "#fbbf24",
    Variable: "#22d3ee",
    Number: "#34d399",
    FunctionCall: "#a78bfa",
    Equation: "#fb7185",
  };
  const c = colorMap[node.type] || "#94a3b8";

  const typeLabel = {
    BinaryOp: "Op",
    Variable: "Var",
    Number: "Num",
    FunctionCall: "Fn",
    Equation: "Eq",
  }[node.type] || node.type;

  const valueLabel =
    node.type === "BinaryOp" ? node.operator :
    node.type === "Variable" ? node.name :
    node.type === "Number" ? node.value :
    node.type === "FunctionCall" ? `${node.name}()` :
    node.type === "Equation" ? "=" : node.type;

  const children = [];
  if (node.type === "Equation" && node.right) {
    children.push(node.right);
  } else {
    if (node.left) children.push(node.left);
    if (node.right) children.push(node.right);
    if (node.argument) children.push(node.argument);
  }

  return (
    <div className="ast-tree-node">
      {/* Node badge */}
      <div
        className="ast-node-badge"
        style={{
          "--node-color": c,
          animationName: "nodeAppear",
          animationDuration: `${0.35 + depth * 0.1}s`,
          animationFillMode: "both",
          animationTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <span className="ast-node-type">{typeLabel}</span>
        <span className="ast-node-value">{String(valueLabel)}</span>
      </div>

      {/* Children with connector lines */}
      {children.length > 0 && (
        <div className="ast-children-wrapper">
          {/* Vertical stem from parent */}
          <div className="ast-stem" style={{ background: `${c}40` }} />
          {/* Children container */}
          <div className="ast-children">
            {children.map((ch, i) => (
              <div key={i} className="ast-child-branch">
                {/* Vertical connector down to child */}
                <div className="ast-branch-line" style={{ background: `${colorMap[ch?.type] || "#94a3b8"}35` }} />
                <ASTNode node={ch} depth={depth + 1} isRoot={false} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Custom chart tooltip ────────────────────────────────────────────────────

function CustomTooltip({ active, payload }) {
  if (active && payload?.length) {
    const { x, y } = payload[0].payload;
    return (
      <div
        className="rounded-xl px-4 py-2.5 text-xs font-mono"
        style={{
          background: "rgba(2, 6, 23, 0.95)",
          border: "1px solid rgba(34,211,238,0.3)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ color: "#22d3ee" }}>x = {x?.toFixed(4)}</div>
        <div style={{ color: "#fbbf24" }}>y = {y?.toFixed(6)}</div>
      </div>
    );
  }
  return null;
}

// ─── Pipeline step labels ────────────────────────────────────────────────────

const PIPELINE_STEPS = ["Tokenize", "Parse", "Symbols", "Evaluate", "Solve"];

const EXAMPLES = [
  "dy/dx = x + y",
  "dy/dx = x * y",
  "dy/dx = sin(x) + y",
  "dy/dx = x^2 - y",
  "dy/dx = cos(x)",
  "dy/dx = exp(x) - y",
];

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [equation, setEquation] = useState("dy/dx = x + y");
  const [x0, setX0] = useState("0");
  const [y0, setY0] = useState("1");
  const [h, setH] = useState("0.1");
  const [steps, setSteps] = useState("50");

  const [tokens, setTokens] = useState([]);
  const [ast, setAst] = useState(null);
  const [symbols, setSymbols] = useState(null);
  const [solutionData, setSolutionData] = useState([]);
  const [error, setError] = useState("");
  const [solved, setSolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [stepMode, setStepMode] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState([]);

  const containerRef = useRef(null);
  const hueRef = useRef(0);
  const rafRef = useRef(null);
  const stepTimersRef = useRef([]);

  // ── Animated hue + mouse follow gradient ──
  useEffect(() => {
    let mouseX = 50, mouseY = 50;
    const handleMouse = (e) => {
      mouseX = (e.clientX / window.innerWidth) * 100;
      mouseY = (e.clientY / window.innerHeight) * 100;
    };
    window.addEventListener("mousemove", handleMouse);

    const animate = () => {
      hueRef.current = (hueRef.current + 0.15) % 360;
      const h1 = hueRef.current;
      const h2 = (h1 + 60) % 360;
      const h3 = (h1 + 180) % 360;
      if (containerRef.current) {
        containerRef.current.style.background = `
          radial-gradient(ellipse 70vw 50vh at ${mouseX}% ${mouseY}%, hsla(${h1},70%,45%,0.14) 0%, transparent 65%),
          radial-gradient(ellipse 50vw 60vh at ${100 - mouseX}% ${100 - mouseY}%, hsla(${h2},60%,40%,0.10) 0%, transparent 55%),
          radial-gradient(ellipse 40vw 40vh at 80% 80%, hsla(${h3},50%,35%,0.08) 0%, transparent 50%),
          #020617
        `;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouse);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Animate tokens one-by-one ──
  const animateTokens = useCallback((toks) => {
    setVisibleTokens([]);
    toks.forEach((tok, i) => {
      const timer = setTimeout(() => {
        setVisibleTokens(prev => [...prev, tok]);
      }, i * 55);
      stepTimersRef.current.push(timer);
    });
  }, []);

  // ── Run step-by-step reveal ──
  const runStepMode = useCallback((toks) => {
    // Clear old timers
    stepTimersRef.current.forEach(clearTimeout);
    stepTimersRef.current = [];

    setActiveStep(0);
    setVisibleTokens([]);

    // Step 0 → Tokenize: animate tokens
    const t1 = setTimeout(() => {
      setActiveStep(1);
      animateTokens(toks);
    }, 600);

    // Step 1 → Parse (AST)
    const t2 = setTimeout(() => setActiveStep(2), 1400);

    // Step 2 → Symbols
    const t3 = setTimeout(() => setActiveStep(3), 2200);

    // Step 3 → Evaluate
    const t4 = setTimeout(() => setActiveStep(4), 3000);

    // Step 4 → Solve (graph + table)
    const t5 = setTimeout(() => setActiveStep(5), 3800);

    stepTimersRef.current.push(t1, t2, t3, t4, t5);
  }, [animateTokens]);

  // ── Solve handler ──
  const handleSolve = useCallback(async () => {
    // Clear old step timers
    stepTimersRef.current.forEach(clearTimeout);
    stepTimersRef.current = [];

    setError("");
    setLoading(true);
    setSolved(false);
    setActiveStep(-1);
    setVisibleTokens([]);

    await new Promise(r => setTimeout(r, 250));

    try {
      const { tokens: toks, ast: astResult, f } = compile(equation);
      const sym = extractSymbols(astResult);
      const solver = new ODESolver(f);
      const raw = solver.solveRK4(
        parseFloat(x0), parseFloat(y0), parseFloat(h), parseInt(steps)
      );
      const clean = raw.filter(p => isFinite(p.y) && !isNaN(p.y));

      setTokens(toks);
      setAst(astResult);
      setSymbols(sym);
      setSolutionData(clean);
      setSolved(true);

      if (stepMode) {
        runStepMode(toks);
      } else {
        animateTokens(toks);
        setActiveStep(5); // show everything immediately
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [equation, x0, y0, h, steps, stepMode, animateTokens, runStepMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stepTimersRef.current.forEach(clearTimeout);
  }, []);

  const stepVisible = (s) => activeStep >= s;
  const rhsStr = equation.includes("=") ? equation.split("=").slice(1).join("=").trim() : equation;

  return (
    <div
      ref={containerRef}
      className="min-h-screen text-slate-100 overflow-x-hidden"
      style={{
        background: "#020617",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        transition: "background 0.08s ease",
      }}
    >
      {/* Noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
          opacity: 0.5,
          zIndex: 0,
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* ── Header ── */}
        <header className="text-center mb-10 animate-fade-up">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono mb-5"
            style={{
              background: "rgba(34,211,238,0.08)",
              border: "1px solid rgba(34,211,238,0.25)",
              color: "#22d3ee",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block animate-pulse"
              style={{ background: "#22d3ee" }}
            />
            Compiler-Powered ODE Solver
          </div>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-3"
            style={{
              background: "linear-gradient(135deg, #e2e8f0 0%, #22d3ee 40%, #a78bfa 70%, #fb7185 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundSize: "200% 200%",
              animation: "gradientShift 6s ease infinite",
            }}
          >
            Differential Equation Solver
          </h1>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            Enter a first-order ODE. Watch the full compiler pipeline
            — lexer → parser → evaluator — then visualize the RK4 solution.
          </p>
        </header>

        {/* ── Input Card ── */}
        <div className="glass-card p-6 mb-6" style={{ animationDelay: "0.1s" }}>
          {/* Example equation pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setEquation(ex)}
                className="px-3 py-1.5 rounded-full text-xs font-mono transition-all duration-200"
                style={{
                  background: equation === ex ? "rgba(34,211,238,0.15)" : "rgba(30,41,59,0.6)",
                  border: `1px solid ${equation === ex ? "rgba(34,211,238,0.5)" : "rgba(71,85,105,0.4)"}`,
                  color: equation === ex ? "#22d3ee" : "#94a3b8",
                }}
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Equation input */}
          <div className="mb-4">
            <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-widest font-mono">
              Equation
            </label>
            <input
              id="equation-input"
              value={equation}
              onChange={e => setEquation(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSolve()}
              placeholder="dy/dx = x + y^2"
              className="w-full rounded-xl px-4 py-3.5 text-base font-mono outline-none transition-all duration-200"
              style={{
                background: "rgba(15,23,42,0.6)",
                border: "1px solid rgba(71,85,105,0.4)",
                color: "#22d3ee",
              }}
            />
          </div>

          {/* Params */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: "x₀ (initial x)", val: x0, set: setX0 },
              { label: "y₀ (initial y)", val: y0, set: setY0 },
              { label: "Step size h", val: h, set: setH },
              { label: "Steps", val: steps, set: setSteps },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="block text-xs text-slate-500 mb-1 font-mono">{label}</label>
                <input
                  type="number"
                  step="any"
                  value={val}
                  onChange={e => set(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm font-mono outline-none transition-all duration-200"
                  style={{
                    background: "rgba(15,23,42,0.6)",
                    border: "1px solid rgba(71,85,105,0.4)",
                    color: "#e2e8f0",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <button
              id="solve-button"
              onClick={handleSolve}
              disabled={loading}
              className="relative px-8 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 hover:scale-[1.03] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
                color: "#020617",
                boxShadow: "0 0 20px rgba(6,182,212,0.3), 0 0 40px rgba(139,92,246,0.15)",
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Computing…
                </span>
              ) : "⟶ Solve ODE"}
            </button>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => setStepMode(p => !p)}
                className="relative w-11 h-[22px] rounded-full transition-all duration-300"
                style={{ background: stepMode ? "#06b6d4" : "rgba(71,85,105,0.5)" }}
              >
                <div
                  className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300"
                  style={{ left: stepMode ? "24px" : "3px" }}
                />
              </div>
              <span className="text-sm text-slate-400">Step-by-step mode</span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mt-4 rounded-xl px-5 py-3 text-sm font-mono flex items-center gap-2"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
                animation: "fadeUp 0.3s ease both",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* ── Pipeline Step Indicators (step mode) ── */}
        {solved && stepMode && (
          <div
            className="flex items-center justify-center gap-1 sm:gap-2 mb-6 flex-wrap"
            style={{ animation: "fadeUp 0.4s ease both" }}
          >
            {PIPELINE_STEPS.map((name, i) => {
              const stepI = i + 1;
              const done = activeStep > stepI;
              const active = activeStep === stepI;
              const pending = activeStep < stepI;
              return (
                <div key={name} className="flex items-center gap-1 sm:gap-2">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all duration-500"
                    style={{
                      background: done ? "rgba(6,182,212,0.9)" : active ? "rgba(6,182,212,0.6)" : "rgba(30,41,59,0.6)",
                      border: `1px solid ${done || active ? "rgba(6,182,212,0.7)" : "rgba(71,85,105,0.4)"}`,
                      color: done ? "#020617" : active ? "#020617" : "#64748b",
                      transform: active ? "scale(1.08)" : "scale(1)",
                      boxShadow: active ? "0 0 16px rgba(6,182,212,0.4)" : "none",
                    }}
                  >
                    <span>{done ? "✓" : stepI}</span>
                    <span className={done || active ? "font-bold" : ""}>{name}</span>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div
                      className="w-4 sm:w-6 h-px transition-all duration-500"
                      style={{ background: done ? "#06b6d4" : "#1e293b" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Solution Curve ── */}
        {solved && solutionData.length > 0 && stepVisible(5) && (
          <div className="glass-card p-6 mb-6" style={{ animation: "fadeUp 0.5s ease both" }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <IconCurve className="text-cyan-400" />
                <div>
                  <h2 className="text-sm font-bold tracking-widest uppercase text-slate-300">Solution Curve</h2>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">f(x, y) = {rhsStr}</p>
                </div>
              </div>
              <span
                className="text-xs px-3 py-1 rounded-lg font-mono"
                style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.25)", color: "#22d3ee" }}
              >
                {solutionData.length} pts
              </span>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={solutionData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#fb7185" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
                <XAxis
                  dataKey="x" stroke="#334155"
                  tick={{ fill: "#64748b", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                  label={{ value: "x", position: "insideBottomRight", offset: -5, fill: "#64748b", fontSize: 12 }}
                  tickFormatter={v => v.toFixed(1)}
                />
                <YAxis
                  stroke="#334155"
                  tick={{ fill: "#64748b", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                  label={{ value: "y", angle: -90, position: "insideLeft", offset: 10, fill: "#64748b", fontSize: 12 }}
                  tickFormatter={v => v.toFixed(2)}
                  width={55}
                />
                <ReferenceLine y={0} stroke="#1e293b" strokeDasharray="4 4" />
                <ReferenceLine x={0} stroke="#1e293b" strokeDasharray="4 4" />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke="url(#lineGrad)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "#22d3ee", stroke: "#e2e8f0", strokeWidth: 2 }}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Compiler Pipeline Grid ── */}
        {solved && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

            {/* Tokens */}
            {stepVisible(1) && (
              <div
                className="glass-card p-5 md:col-span-2 lg:col-span-2"
                style={{ animation: "fadeUp 0.4s ease both", animationDelay: "0.05s" }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <IconTokens className="text-cyan-400" />
                  <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400">Token Stream</h3>
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded font-mono"
                    style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}
                  >
                    {tokens.length}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3">Lexer output — characters grouped into typed symbols</p>
                <div className="flex flex-wrap gap-2">
                  {visibleTokens.map((tok, i) => {
                    const s = TOKEN_COLORS[tok.type] || { bg: "rgba(71,85,105,0.2)", border: "rgba(71,85,105,0.4)", color: "#94a3b8", label: tok.type };
                    const display = s.label ?? (tok.value !== undefined ? String(tok.value) : tok.type);
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                        style={{
                          background: s.bg,
                          border: `1px solid ${s.border}`,
                          color: s.color,
                          animation: "tokenPop 0.25s ease both",
                        }}
                      >
                        <span style={{ opacity: 0.45, fontSize: 9 }}>{tok.type}</span>
                        {display}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Symbol Table */}
            {stepVisible(3) && symbols && (
              <div
                className="glass-card p-5"
                style={{ animation: "fadeUp 0.4s ease both", animationDelay: "0.1s" }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <IconTable className="text-violet-400" />
                  <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400">Symbol Table</h3>
                </div>
                <p className="text-xs text-slate-600 mb-3">Extracted identifiers</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 font-mono mb-1.5">Variables</p>
                    <div className="flex gap-2 flex-wrap">
                      {symbols.vars.length ? symbols.vars.map(v => (
                        <span
                          key={v}
                          className="px-3 py-1 rounded-lg text-xs font-mono font-bold"
                          style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.35)", color: "#22d3ee" }}
                        >
                          {v}
                        </span>
                      )) : <span className="text-slate-600 text-xs">none</span>}
                    </div>
                  </div>
                  {symbols.funcs.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 font-mono mb-1.5">Functions</p>
                      <div className="flex gap-2 flex-wrap">
                        {symbols.funcs.map(fn => (
                          <span
                            key={fn}
                            className="px-3 py-1 rounded-lg text-xs font-mono font-bold"
                            style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.35)", color: "#a78bfa" }}
                          >
                            {fn}(·)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Evaluation */}
            {stepVisible(4) && (
              <div
                className="glass-card p-5"
                style={{ animation: "fadeUp 0.4s ease both", animationDelay: "0.15s" }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <IconGear className="text-amber-400" />
                  <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400">Evaluation</h3>
                </div>
                <p className="text-xs text-slate-600 mb-3">Compiled to callable f(x, y)</p>
                <div
                  className="rounded-xl p-4 font-mono text-sm"
                  style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(71,85,105,0.3)" }}
                >
                  <span style={{ color: "#a78bfa" }}>f</span>
                  <span style={{ color: "#94a3b8" }}>(</span>
                  <span style={{ color: "#22d3ee" }}>x</span>
                  <span style={{ color: "#94a3b8" }}>, </span>
                  <span style={{ color: "#22d3ee" }}>y</span>
                  <span style={{ color: "#94a3b8" }}>) = </span>
                  <span style={{ color: "#34d399" }}>{rhsStr}</span>
                </div>
                <div className="mt-3 text-xs text-slate-600">
                  Evaluates RHS at each RK4 stage using compiled AST
                </div>
              </div>
            )}

            {/* AST */}
            {stepVisible(2) && ast && (
              <div
                className="glass-card p-5 md:col-span-2 lg:col-span-2"
                style={{ animation: "fadeUp 0.4s ease both", animationDelay: "0.2s" }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <IconTree className="text-emerald-400" />
                  <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400">Abstract Syntax Tree</h3>
                </div>
                <p className="text-xs text-slate-600 mb-3">Parser output — expression hierarchy</p>
                <div className="overflow-x-auto">
                  <div className="min-w-max p-2">
                    <ASTNode node={ast} />
                  </div>
                </div>
              </div>
            )}

            {/* Solver output table */}
            {stepVisible(5) && solutionData.length > 0 && (
              <div
                className="glass-card p-5 lg:col-span-3 md:col-span-2"
                style={{ animation: "fadeUp 0.4s ease both", animationDelay: "0.25s" }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <IconChart className="text-rose-400" />
                  <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400">RK4 Solution Points</h3>
                  <span className="ml-auto text-xs text-slate-600 font-mono">h = {h} · {solutionData.length} pts</span>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Numerical solution — x₀={x0}, y₀={y0}
                </p>
                <div
                  className="overflow-auto max-h-52 rounded-xl"
                  style={{ border: "1px solid rgba(71,85,105,0.3)" }}
                >
                  <table className="w-full text-xs font-mono">
                    <thead className="sticky top-0" style={{ background: "rgba(15,23,42,0.9)", backdropFilter: "blur(8px)" }}>
                      <tr>
                        <th className="px-4 py-2.5 text-left text-slate-500 font-medium">#</th>
                        <th className="px-4 py-2.5 text-left font-medium" style={{ color: "#22d3ee" }}>x</th>
                        <th className="px-4 py-2.5 text-left font-medium" style={{ color: "#fbbf24" }}>y</th>
                        <th className="px-4 py-2.5 text-left font-medium" style={{ color: "#34d399" }}>Δy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {solutionData.map((p, i) => (
                        <tr
                          key={i}
                          className="transition-colors duration-150 hover:bg-cyan-500/5"
                          style={{ borderTop: "1px solid rgba(51,65,85,0.3)" }}
                        >
                          <td className="px-4 py-1.5 text-slate-600">{i}</td>
                          <td className="px-4 py-1.5" style={{ color: "#22d3ee" }}>{p.x.toFixed(4)}</td>
                          <td className="px-4 py-1.5" style={{ color: "#fbbf24" }}>{p.y.toFixed(6)}</td>
                          <td className="px-4 py-1.5" style={{ color: "#34d399" }}>
                            {i > 0 ? (p.y - solutionData[i - 1].y).toFixed(6) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Empty state ── */}
        {!solved && !error && (
          <div className="text-center py-20" style={{ animation: "fadeUp 0.5s ease both", animationDelay: "0.3s" }}>
            <div className="text-5xl mb-4 text-slate-700" style={{ fontFamily: "serif" }}>∫</div>
            <p className="text-slate-600 text-sm font-mono">
              Enter an equation above and click <span className="text-cyan-500">Solve ODE</span>
            </p>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="text-center text-xs text-slate-700 pb-6 mt-8 font-mono">
          Lexer → Parser → AST → Evaluator → RK4 Solver
        </footer>
      </div>
    </div>
  );
}