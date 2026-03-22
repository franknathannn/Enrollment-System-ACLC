/**
 * Pure-TypeScript enrollment ensemble predictor.
 * Implements the same 4-model LOO-CV ensemble as predict.py — no external deps.
 *
 * Models:
 *   1. OLS Linear Regression
 *   2. Recency-Weighted OLS
 *   3. Polynomial Regression (degree 2)
 *   4. Simple Exponential Smoothing (Holt)
 */

// ── HELPERS ───────────────────────────────────────────────────────────────────

/** Solve a 3×3 linear system Ax = b via Gaussian elimination with partial pivoting. */
function solve3x3(A: number[][], b: number[]): number[] | null {
  const aug = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < 3; col++) {
    let maxRow = col
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row
    }
    ;[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]
    if (Math.abs(aug[col][col]) < 1e-10) return null
    for (let row = col + 1; row < 3; row++) {
      const f = aug[row][col] / aug[col][col]
      for (let j = col; j <= 3; j++) aug[row][j] -= f * aug[col][j]
    }
  }
  const x = [0, 0, 0]
  for (let i = 2; i >= 0; i--) {
    x[i] = aug[i][3]
    for (let j = i + 1; j < 3; j++) x[i] -= aug[i][j] * x[j]
    x[i] /= aug[i][i]
  }
  return x
}

// ── MODELS ────────────────────────────────────────────────────────────────────

/** OLS Linear Regression — predict value at index `n` (next position). */
function olsPredict(y: number[]): number {
  const n = y.length
  const xMean = (n - 1) / 2
  const yMean = y.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (y[i] - yMean)
    den += (i - xMean) ** 2
  }
  const slope = den !== 0 ? num / den : 0
  return slope * n + (yMean - slope * xMean)
}

/** Recency-Weighted OLS — later years get linearly higher weight. */
function weightedOlsPredict(y: number[]): number {
  const n = y.length
  const wSum = (n * (n + 1)) / 2
  let wSX = 0, wSY = 0, wSXY = 0, wSXX = 0, wT = 0
  for (let i = 0; i < n; i++) {
    const w = (i + 1) / wSum
    wSX += w * i; wSY += w * y[i]
    wSXY += w * i * y[i]; wSXX += w * i * i; wT += w
  }
  const den = wT * wSXX - wSX * wSX
  const slope = den !== 0 ? (wT * wSXY - wSX * wSY) / den : 0
  return slope * n + (wSY - slope * wSX) / wT
}

/** Polynomial Regression degree 2 — falls back to OLS when fewer than 3 points. */
function polyPredict(y: number[]): number {
  const n = y.length
  if (n < 3) return olsPredict(y)
  // Build normal equations for [c, b, a] where f(x) = ax² + bx + c
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0
  let t0 = 0, t1 = 0, t2 = 0
  for (let i = 0; i < n; i++) {
    s0 += 1;       s1 += i;       s2 += i ** 2
    s3 += i ** 3;  s4 += i ** 4
    t0 += y[i];    t1 += i * y[i]; t2 += i ** 2 * y[i]
  }
  const coeffs = solve3x3(
    [[s0, s1, s2], [s1, s2, s3], [s2, s3, s4]],
    [t0, t1, t2],
  )
  if (!coeffs) return olsPredict(y)
  const [c, b, a] = coeffs
  return a * n ** 2 + b * n + c
}

/** Simple Exponential Smoothing — grid-searches optimal alpha (0.01–0.99). */
function holtPredict(y: number[]): number {
  const n = y.length
  if (n < 2) return y[n - 1]
  let bestAlpha = 0.3
  let bestSSE   = Infinity
  for (let a = 1; a <= 99; a++) {
    const alpha = a / 100
    let s = y[0], sse = 0
    for (let i = 1; i < n; i++) {
      sse += (y[i] - s) ** 2
      s    = alpha * y[i] + (1 - alpha) * s
    }
    if (sse < bestSSE) { bestSSE = sse; bestAlpha = alpha }
  }
  let s = y[0]
  for (let i = 1; i < n; i++) s = bestAlpha * y[i] + (1 - bestAlpha) * s
  return s // next forecast = last smoothed level
}

// ── LOO-CV ────────────────────────────────────────────────────────────────────

function looCv(y: number[], fn: (tr: number[]) => number): [number, number][] {
  return y.map((actual, i) => {
    const tr = [...y.slice(0, i), ...y.slice(i + 1)]
    return [actual, fn(tr)] as [number, number]
  })
}

function evalLoo(pairs: [number, number][]): { mae: number; mape: number } {
  const n    = pairs.length
  const mae  = pairs.reduce((s, [a, p]) => s + Math.abs(a - p), 0) / n
  const mape = pairs.reduce((s, [a, p]) => s + Math.abs((a - p) / a), 0) / n * 100
  return { mae, mape }
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

export interface EnsembleResult {
  ensemble:   number
  declining:  number
  realistic:  number
  optimistic: number
  ci_lo:      number
  ci_hi:      number
  res_std:    number
  models: Record<string, { label: string; pred: number; weight: number; mape: number; mae: number }>
  accuracy: { best_mape: number; avg_mae: number; r2: number }
  n_records:   number
  target_year: string
}

export function computeEnsemble(totals: number[], targetYear: string): EnsembleResult | null {
  const n = totals.length
  if (n === 0) return null

  // Full-data predictions
  const olsPred  = olsPredict(totals)
  const wolsPred = weightedOlsPredict(totals)
  const polyPred = polyPredict(totals)
  const holtPred = holtPredict(totals)

  // LOO-CV
  const olsPairs  = looCv(totals, olsPredict)
  const wolsPairs = looCv(totals, weightedOlsPredict)
  const polyPairs = looCv(totals, polyPredict)
  const holtPairs = looCv(totals, holtPredict)

  const ols  = evalLoo(olsPairs)
  const wols = evalLoo(wolsPairs)
  const poly = evalLoo(polyPairs)
  const holt = evalLoo(holtPairs)

  // Ensemble — inverse-MAPE weighted
  const rawMapes = [ols.mape, wols.mape, poly.mape, holt.mape].map(m => m === 0 ? 0.001 : m)
  const invSum   = rawMapes.reduce((s, m) => s + 1 / m, 0)
  const weights  = rawMapes.map(m => 1 / m / invSum)
  const preds    = [olsPred, wolsPred, polyPred, holtPred]
  const ensemble = preds.reduce((s, p, i) => s + p * weights[i], 0)

  // 95% CI from pooled LOO residuals
  const residuals = [...olsPairs, ...wolsPairs, ...polyPairs, ...holtPairs].map(([a, p]) => p - a)
  const resMean   = residuals.reduce((a, b) => a + b, 0) / residuals.length
  const resStd    = Math.sqrt(
    residuals.reduce((s, r) => s + (r - resMean) ** 2, 0) / Math.max(1, residuals.length - 1)
  )

  // OLS R²
  const yMean = totals.reduce((a, b) => a + b, 0) / n
  const xMean = (n - 1) / 2
  let num = 0, den = 0
  for (let i = 0; i < n; i++) { num += (i - xMean) * (totals[i] - yMean); den += (i - xMean) ** 2 }
  const slope  = den !== 0 ? num / den : 0
  const intercept = yMean - slope * xMean
  const ssRes  = totals.reduce((s, v, i) => s + (v - (slope * i + intercept)) ** 2, 0)
  const ssTot  = totals.reduce((s, v) => s + (v - yMean) ** 2, 0)
  const r2     = ssTot !== 0 ? 1 - ssRes / ssTot : 0

  const round1 = (v: number) => Math.round(v * 10) / 10
  // Floor: never go below 70% of the lowest historical value (enrollment can't be negative)
  const dataFloor = Math.max(1, Math.round(Math.min(...totals) * 0.70))

  return {
    ensemble:   Math.round(ensemble),
    declining:  Math.max(dataFloor, Math.round(ensemble - 1.96 * resStd)),
    realistic:  Math.round(ensemble),
    optimistic: Math.round(ensemble + 1.96 * resStd),
    ci_lo:      Math.max(dataFloor, Math.round(ensemble - 1.96 * resStd)),
    ci_hi:      Math.round(ensemble + 1.96 * resStd),
    res_std:    round1(resStd),
    models: {
      ols:          { label: 'Straight-Line Trend',   pred: round1(olsPred),  weight: round1(weights[0] * 100), mape: round1(ols.mape),  mae: round1(ols.mae)  },
      weighted_ols: { label: 'Recent Years Priority', pred: round1(wolsPred), weight: round1(weights[1] * 100), mape: round1(wols.mape), mae: round1(wols.mae) },
      polynomial:   { label: 'Curved Trend',          pred: round1(polyPred), weight: round1(weights[2] * 100), mape: round1(poly.mape), mae: round1(poly.mae) },
      holt:         { label: 'Smoothed Average',       pred: round1(holtPred), weight: round1(weights[3] * 100), mape: round1(holt.mape), mae: round1(holt.mae) },
    },
    accuracy: {
      best_mape: round1(Math.min(ols.mape, wols.mape, poly.mape, holt.mape)),
      avg_mae:   round1((ols.mae + wols.mae + poly.mae + holt.mae) / 4),
      r2:        Math.round(r2 * 1000) / 1000,
    },
    n_records:   n,
    target_year: targetYear,
  }
}
