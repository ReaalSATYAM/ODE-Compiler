export class ODESolver {
  constructor(f) {
    this.f = f; // function f(x, y)
  }

  // RK4 method
  solveRK4(x0, y0, h, steps) {
    let x = x0;
    let y = y0;

    const result = [];
    result.push({ x, y });

    for (let i = 0; i < steps; i++) {
      const k1 = h * this.f(x, y);
      const k2 = h * this.f(x + h / 2, y + k1 / 2);
      const k3 = h * this.f(x + h / 2, y + k2 / 2);
      const k4 = h * this.f(x + h, y + k3);

      y = y + (k1 + 2 * k2 + 2 * k3 + k4) / 6;
      x = x + h;

      result.push({ x, y });
    }

    return result;
  }
}