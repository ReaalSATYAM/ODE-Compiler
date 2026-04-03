import { useState, useEffect, useRef, useCallback } from "react";
import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";
import { Evaluator } from "./evaluator.js";
import { ODESolver } from "./solver.js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";


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
    if (node.right) walk(node.right);
  }
  walk(ast.right);
  return { vars: [...vars], funcs: [...funcs] };
}

// ─── token pill colors 

const TOKEN_STYLE = {
  DYDX:     { bg: "#4f46e5", label: "dy/dx" },
  EQUAL:    { bg: "#0891b2", label: "=" },
  PLUS:     { bg: "#059669", label: "+" },
  MINUS:    { bg: "#dc2626", label: "−" },
  MUL:      { bg: "#d97706", label: "×" },
  DIV:      { bg: "#7c3aed", label: "÷" },
  POW:      { bg: "#db2777", label: "^" },
  LPAREN:   { bg: "#475569", label: "(" },
  RPAREN:   { bg: "#475569", label: ")" },
  NUMBER:   { bg: "#0f766e", label: null },
  VARIABLE: { bg: "#1d4ed8", label: null },
  FUNCTION: { bg: "#9333ea", label: null },
};

// ─── AST tree renderer 

function ASTNode({ node, depth = 0 }) {
  if (!node) return null;
  const indent = depth * 20;

  const nodeColor =
    node.type === "BinaryOp" ? "#a78bfa" :
    node.type === "Variable" ? "#38bdf8" :
    node.type === "Number"   ? "#34d399" :
    node.type === "FunctionCall" ? "#fb923c" : "#e2e8f0";

  const label =
    node.type === "BinaryOp" ? node.operator :
    node.type === "Variable" ? node.name :
    node.type === "Number"   ? node.value :
    node.type === "FunctionCall" ? `${node.name}(...)` :
    node.type === "Equation" ? "Equation" : node.type;

  return (
    <div style={{ marginLeft: indent }}>
      <div className="flex items-center gap-2 py-0.5">
        {depth > 0 && (
          <span style={{ color: "#475569", fontSize: 12 }}>└─</span>
        )}
        <span
          className="px-2 py-0.5 rounded text-xs font-mono font-bold"
          style={{ background: nodeColor + "22", color: nodeColor, border: `1px solid ${nodeColor}44` }}
        >
          {node.type}
        </span>
        <span className="text-white/60 font-mono text-xs">{String(label)}</span>
      </div>
      {node.left  && <ASTNode node={node.left}  depth={depth + 1} />}
      {node.right && <ASTNode node={node.right} depth={depth + 1} />}
      {node.argument && <ASTNode node={node.argument} depth={depth + 1} />}
    </div>
  );
}

// ─── custom chart tooltip ────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="rounded-xl px-3 py-2 text-xs font-mono"
        style={{ background: "rgba(15,23,42,0.92)", border: "1px solid rgba(139,92,246,0.4)", backdropFilter: "blur(8px)" }}>
        <div style={{ color: "#a78bfa" }}>x = {d.x?.toFixed(4)}</div>
        <div style={{ color: "#38bdf8" }}>y = {d.y?.toFixed(6)}</div>
      </div>
    );
  }
  return null;
};

// ─── main app ─────────

export default function App() {
  const [equation, setEquation] = useState("dy/dx = x + y");
  const [x0, setX0] = useState(0);
  const [y0, setY0] = useState(1);
  const [h, setH] = useState(0.1);
  const [steps, setSteps] = useState(50);

  const [tokens, setTokens] = useState([]);
  const [ast, setAst] = useState(null);
  const [symbols, setSymbols] = useState(null);
  const [solutionData, setSolutionData] = useState([]);
  const [error, setError] = useState("");
  const [solved, setSolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0); // for step-by-step
  const [stepMode, setStepMode] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState([]);

  const containerRef = useRef(null);
  const gradientRef = useRef({ x: 50, y: 50 });
  const rafRef = useRef(null);

  // mouse gradient effect
  useEffect(() => {
    const handleMouse = (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      gradientRef.current = { x, y };
      if (containerRef.current) {
        containerRef.current.style.setProperty("--mx", `${x}%`);
        containerRef.current.style.setProperty("--my", `${y}%`);
      }
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  const animateTokens = useCallback((toks) => {
    setVisibleTokens([]);
    toks.forEach((tok, i) => {
      setTimeout(() => {
        setVisibleTokens(prev => [...prev, tok]);
      }, i * 60);
    });
  }, []);

  const runStepMode = useCallback((toks, astResult, solData) => {
    setActiveStep(0);
    setVisibleTokens([]);
    const delays = [0, 600, 1200, 1800, 2400];
    delays.forEach((d, i) => setTimeout(() => setActiveStep(i + 1), d));
    setTimeout(() => animateTokens(toks), 200);
  }, [animateTokens]);

  const handleSolve = useCallback(async () => {
    setError("");
    setLoading(true);
    setSolved(false);

    await new Promise(r => setTimeout(r, 300));

    try {
      const { tokens: toks, ast: astResult, f } = compile(equation);
      const sym = extractSymbols(astResult);
      const solver = new ODESolver(f);
      const raw = solver.solveRK4(Number(x0), Number(y0), Number(h), Number(steps));

      // filter out NaN/Infinity
      const clean = raw.filter(p => isFinite(p.y) && !isNaN(p.y));

      setTokens(toks);
      setAst(astResult);
      setSymbols(sym);
      setSolutionData(clean);
      setSolved(true);

      if (stepMode) {
        runStepMode(toks, astResult, clean);
      } else {
        animateTokens(toks);
        setActiveStep(5);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [equation, x0, y0, h, steps, stepMode, animateTokens, runStepMode]);

  const EXAMPLES = [
    "dy/dx = x + y",
    "dy/dx = x * y",
    "dy/dx = sin(x) + y",
    "dy/dx = x^2 - y",
    "dy/dx = cos(x)",
    "dy/dx = exp(x) - y",
  ];

  const stepVisible = (s) => !stepMode || activeStep >= s;

  return (
    <div
      ref={containerRef}
      className="min-h-screen text-white font-sans overflow-x-hidden"
      style={{
        "--mx": "50%", "--my": "50%",
        background: `
          radial-gradient(ellipse 80vw 60vh at var(--mx) var(--my), rgba(109,40,217,0.18) 0%, transparent 70%),
          radial-gradient(ellipse 60vw 80vh at 80% 20%, rgba(14,116,144,0.12) 0%, transparent 60%),
          radial-gradient(ellipse 50vw 50vh at 10% 80%, rgba(219,39,119,0.10) 0%, transparent 60%),
          #060b18
        `,
        fontFamily: "'DM Mono', 'Fira Code', 'Cascadia Code', monospace",
        transition: "background 0.1s ease",
      }}
    >
      {/* noise texture overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
        opacity: 0.4, zIndex: 0
      }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10">

        {/* ── header ── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-4"
            style={{ background: "rgba(109,40,217,0.2)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse inline-block" />
            RK4 · Lexer · Parser · Evaluator
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2"
            style={{ background: "linear-gradient(135deg, #e2e8f0 0%, #a78bfa 50%, #38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ODE Solver
          </h1>
          <p className="text-white/40 text-sm">First-order differential equations · Compiler pipeline · Visual debugger</p>
        </div>

        {/* ── input card ── */}
        <div className="rounded-2xl p-6 mb-6"
          style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}>

          <div className="mb-4">
            <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-widest">Equation</label>
            <input
              value={equation}
              onChange={e => setEquation(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSolve()}
              placeholder="dy/dx = x + y^2"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(139,92,246,0.3)",
                color: "#e2e8f0",
                fontFamily: "inherit",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.7)"}
              onBlur={e => e.target.style.borderColor = "rgba(139,92,246,0.3)"}
            />
          </div>

          {/* examples */}
          <div className="flex flex-wrap gap-2 mb-5">
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setEquation(ex)}
                className="px-2.5 py-1 rounded-lg text-xs transition-all hover:scale-105"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc" }}>
                {ex}
              </button>
            ))}
          </div>

          {/* params */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: "x₀", val: x0, set: setX0 },
              { label: "y₀", val: y0, set: setY0 },
              { label: "Step h", val: h, set: setH },
              { label: "Steps", val: steps, set: setSteps },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="block text-xs text-white/40 mb-1 uppercase tracking-widest">{label}</label>
                <input
                  type="number" value={val}
                  onChange={e => set(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontFamily: "inherit" }}
                />
              </div>
            ))}
          </div>

          {/* controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={handleSolve} disabled={loading}
              className="relative px-6 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #0891b2)",
                boxShadow: "0 0 20px rgba(124,58,237,0.4), 0 0 40px rgba(8,145,178,0.2)",
              }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                  </svg>
                  Computing…
                </span>
              ) : "⟶ Solve"}
            </button>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-white/50 select-none">
              <div onClick={() => setStepMode(p => !p)}
                className="relative w-10 h-5 rounded-full transition-all"
                style={{ background: stepMode ? "#7c3aed" : "rgba(255,255,255,0.1)" }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow"
                  style={{ left: stepMode ? "22px" : "2px" }} />
              </div>
              Step-by-step mode
            </label>
          </div>

          {error && (
            <div className="mt-4 rounded-xl px-4 py-3 text-sm"
              style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", color: "#fca5a5" }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* ── graph ── */}
        {solved && solutionData.length > 0 && (
          <div className="rounded-2xl p-6 mb-6"
            style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold tracking-widest uppercase text-white/60">Solution Curve</h2>
              <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(56,189,248,0.15)", color: "#38bdf8" }}>
                {solutionData.length} points
              </span>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={solutionData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#db2777" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="x" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)", fontFamily: "inherit" }} label={{ value: "x", position: "insideBottomRight", offset: -5, fill: "#a78bfa", fontSize: 12 }} tickFormatter={v => v.toFixed(1)} />
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)", fontFamily: "inherit" }} label={{ value: "y", angle: -90, position: "insideLeft", fill: "#38bdf8", fontSize: 12 }} tickFormatter={v => v.toFixed(2)} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.1)" />
                <Line
                  type="monotone" dataKey="y"
                  stroke="url(#curveGrad)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "#a78bfa", stroke: "#e2e8f0", strokeWidth: 2 }}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── compiler pipeline grid ── */}
        {solved && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

            {/* tokens */}
            {stepVisible(1) && (
              <div className="rounded-2xl p-5 transition-all"
                style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", animationName: "fadeUp", animationDuration: "0.5s", animationFillMode: "both" }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📦</span>
                  <h3 className="text-xs font-bold tracking-widest uppercase text-white/60">Tokens</h3>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded" style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>{tokens.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {visibleTokens.map((tok, i) => {
                    const s = TOKEN_STYLE[tok.type] || { bg: "#374151", label: tok.type };
                    const label = s.label ?? (tok.value !== undefined ? String(tok.value) : tok.type);
                    return (
                      <span key={i} className="px-2 py-1 rounded-lg text-xs font-bold font-mono transition-all"
                        style={{ background: s.bg + "33", border: `1px solid ${s.bg}66`, color: s.bg === "#475569" ? "#94a3b8" : "white",
                          animation: "tokenPop 0.3s ease both" }}>
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AST */}
            {stepVisible(2) && ast && (
              <div className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🌳</span>
                  <h3 className="text-xs font-bold tracking-widest uppercase text-white/60">AST</h3>
                </div>
                <div className="overflow-auto max-h-48 text-xs">
                  <ASTNode node={ast} />
                </div>
              </div>
            )}

            {/* symbol table */}
            {stepVisible(3) && symbols && (
              <div className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📊</span>
                  <h3 className="text-xs font-bold tracking-widest uppercase text-white/60">Symbol Table</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-white/30 mb-1.5">Variables</div>
                    <div className="flex gap-2 flex-wrap">
                      {symbols.vars.length ? symbols.vars.map(v => (
                        <span key={v} className="px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{ background: "#1d4ed833", border: "1px solid #1d4ed866", color: "#93c5fd" }}>{v}</span>
                      )) : <span className="text-white/20 text-xs">none</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/30 mb-1.5">Functions</div>
                    <div className="flex gap-2 flex-wrap">
                      {symbols.funcs.length ? symbols.funcs.map(fn => (
                        <span key={fn} className="px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{ background: "#9333ea33", border: "1px solid #9333ea66", color: "#d8b4fe" }}>{fn}()</span>
                      )) : <span className="text-white/20 text-xs">none</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* evaluation */}
            {stepVisible(4) && (
              <div className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">⚙️</span>
                  <h3 className="text-xs font-bold tracking-widest uppercase text-white/60">Evaluation</h3>
                </div>
                <div className="rounded-xl p-3 font-mono text-sm"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "#a78bfa" }}>f</span>
                  <span style={{ color: "#e2e8f0" }}>(</span>
                  <span style={{ color: "#93c5fd" }}>x</span>
                  <span style={{ color: "#e2e8f0" }}>, </span>
                  <span style={{ color: "#93c5fd" }}>y</span>
                  <span style={{ color: "#e2e8f0" }}>) = </span>
                  <span style={{ color: "#34d399" }}>{equation.split("=").slice(1).join("=").trim()}</span>
                </div>
                <div className="mt-3 text-xs text-white/30">
                  Evaluates RHS at each RK4 stage using compiled AST
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── solution table ── */}
        {solved && stepVisible(5) && solutionData.length > 0 && (
          <div className="rounded-2xl p-5 mb-6"
            style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📈</span>
              <h3 className="text-xs font-bold tracking-widest uppercase text-white/60">Solver Output</h3>
              <span className="ml-auto text-xs text-white/30">RK4 · h = {h}</span>
            </div>
            <div className="overflow-auto max-h-52 rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                    <th className="px-4 py-2 text-left text-white/40 font-normal">#</th>
                    <th className="px-4 py-2 text-left font-bold" style={{ color: "#a78bfa" }}>x</th>
                    <th className="px-4 py-2 text-left font-bold" style={{ color: "#38bdf8" }}>y</th>
                  </tr>
                </thead>
                <tbody>
                  {solutionData.map((p, i) => (
                    <tr key={i} className="transition-colors"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.08)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td className="px-4 py-1.5 text-white/20">{i}</td>
                      <td className="px-4 py-1.5" style={{ color: "#a78bfa" }}>{p.x.toFixed(4)}</td>
                      <td className="px-4 py-1.5" style={{ color: "#38bdf8" }}>{p.y.toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* footer */}
        <div className="text-center text-xs text-white/20 pb-6">
          Lexer → Parser → AST → Evaluator → RK4 Solver
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes tokenPop {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
        * { scrollbar-width: thin; scrollbar-color: rgba(139,92,246,0.3) transparent; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 4px; }
      `}</style>
    </div>
  );
}
