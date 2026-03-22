"""
ACLC Northbay Enrollment Predictor
===================================
Interactive mode:
    python predict.py

JSON mode (called from Next.js /api/predict route):
    echo '{"totals":[1000,932,941,912,982],"targetYear":"2026-2027"}' | python predict.py --json

Packages required:
    pip install numpy scikit-learn statsmodels
"""

import sys
import json
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error
from statsmodels.tsa.holtwinters import SimpleExpSmoothing


# ── CORE PREDICTION FUNCTION ──────────────────────────────────────────────────

def run_prediction(totals_input, target_year):
    """Ensemble of 4 models with LOO-CV. Returns a dict, or None if no data."""
    if not totals_input:
        return None

    totals = np.array(totals_input, dtype=float)
    n      = len(totals)
    years  = np.arange(n)

    # LOO-CV helpers
    def loo_cv(model_fn):
        pairs = []
        for i in range(n):
            X_tr = np.delete(years, i)
            y_tr = np.delete(totals, i)
            pairs.append((totals[i], model_fn(X_tr, y_tr, years[i])))
        return pairs

    def eval_loo(pairs):
        actual = np.array([p[0] for p in pairs])
        pred   = np.array([p[1] for p in pairs])
        mae    = float(mean_absolute_error(actual, pred))
        rmse   = float(np.sqrt(mean_squared_error(actual, pred)))
        mape   = float(np.mean(np.abs((actual - pred) / actual)) * 100)
        return mae, rmse, mape

    # Model functions
    def ols_fn(X_tr, y_tr, X_te):
        slope, intercept = np.polyfit(X_tr, y_tr, 1)
        return float(slope * X_te + intercept)

    def wols_fn(X_tr, y_tr, X_te):
        w = np.arange(1, len(X_tr) + 1, dtype=float); w /= w.sum()
        slope, intercept = np.polyfit(X_tr, y_tr, 1, w=w)
        return float(slope * X_te + intercept)

    def poly_fn(X_tr, y_tr, X_te):
        deg = 2 if len(X_tr) >= 3 else 1
        return float(np.polyval(np.polyfit(X_tr, y_tr, deg), X_te))

    def holt_fn(X_tr, y_tr, X_te):
        if len(y_tr) < 2:
            return float(y_tr.mean())
        try:
            m = SimpleExpSmoothing(y_tr, initialization_method="estimated")
            return float(m.fit(optimized=True, remove_bias=False).forecast(1)[0])
        except Exception:
            return float(y_tr[-1])

    # Full-data predictions
    slope, intercept = np.polyfit(years, totals, 1)
    ols_pred  = float(slope * n + intercept)

    w = np.arange(1, n + 1, dtype=float); w /= w.sum()
    wslope, wintercept = np.polyfit(years, totals, 1, w=w)
    wols_pred = float(wslope * n + wintercept)

    poly_pred = float(np.polyval(np.polyfit(years, totals, 2), n))

    try:
        ses       = SimpleExpSmoothing(totals, initialization_method="estimated")
        holt_pred = float(ses.fit(optimized=True, remove_bias=False).forecast(1)[0])
    except Exception:
        holt_pred = float(totals[-1])

    # LOO-CV evaluation
    ols_pairs  = loo_cv(ols_fn)
    wols_pairs = loo_cv(wols_fn)
    poly_pairs = loo_cv(poly_fn)
    holt_pairs = loo_cv(holt_fn)

    mae1, rmse1, mape1 = eval_loo(ols_pairs)
    mae2, rmse2, mape2 = eval_loo(wols_pairs)
    mae3, rmse3, mape3 = eval_loo(poly_pairs)
    mae4, rmse4, mape4 = eval_loo(holt_pairs)

    # Ensemble — inverse-MAPE weighted
    mapes   = np.array([mape1, mape2, mape3, mape4])
    mapes   = np.where(mapes == 0, 0.001, mapes)
    weights = (1.0 / mapes) / (1.0 / mapes).sum()

    ensemble = float(np.dot(weights, [ols_pred, wols_pred, poly_pred, holt_pred]))

    # 95% CI from pooled LOO residuals
    residuals = [p[1] - p[0] for pairs in [ols_pairs, wols_pairs, poly_pairs, holt_pairs] for p in pairs]
    res_std   = float(np.std(residuals, ddof=1))
    ci_lo     = ensemble - 1.96 * res_std
    ci_hi     = ensemble + 1.96 * res_std

    # OLS in-sample R²
    ss_res = float(np.sum((totals - (slope * years + intercept)) ** 2))
    ss_tot = float(np.sum((totals - totals.mean()) ** 2))
    r2     = float(1 - ss_res / ss_tot) if ss_tot != 0 else 0.0

    return {
        'ensemble':   int(round(ensemble)),
        'declining':  int(round(ci_lo)),
        'realistic':  int(round(ensemble)),
        'optimistic': int(round(ci_hi)),
        'ci_lo':      int(round(ci_lo)),
        'ci_hi':      int(round(ci_hi)),
        'res_std':    round(res_std, 1),
        'models': {
            'ols':          {'label': 'OLS Linear',            'pred': round(ols_pred,  1), 'weight': round(float(weights[0]*100), 1), 'mape': round(mape1, 1), 'mae': round(mae1, 1)},
            'weighted_ols': {'label': 'Weighted OLS',          'pred': round(wols_pred, 1), 'weight': round(float(weights[1]*100), 1), 'mape': round(mape2, 1), 'mae': round(mae2, 1)},
            'polynomial':   {'label': 'Polynomial (deg 2)',    'pred': round(poly_pred, 1), 'weight': round(float(weights[2]*100), 1), 'mape': round(mape3, 1), 'mae': round(mae3, 1)},
            'holt':         {'label': 'Holt Exp. Smoothing',   'pred': round(holt_pred, 1), 'weight': round(float(weights[3]*100), 1), 'mape': round(mape4, 1), 'mae': round(mae4, 1)},
        },
        'accuracy': {
            'best_mape': round(float(min(mape1, mape2, mape3, mape4)), 1),
            'avg_mae':   round(float(np.mean([mae1, mae2, mae3, mae4])), 1),
            'r2':        round(r2, 3),
        },
        'n_records':   n,
        'target_year': target_year,
    }


# ── JSON MODE — called from Next.js /api/predict ──────────────────────────────

if '--json' in sys.argv:
    try:
        raw    = json.loads(sys.stdin.read())
        result = run_prediction(raw['totals'], raw.get('targetYear', 'Next Year'))
        print(json.dumps(result if result else {'error': 'No data provided'}))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
    sys.exit(0)


# ── INTERACTIVE (HUMAN-READABLE) MODE ────────────────────────────────────────

import pandas as pd  # only needed for the pretty table below

# ── FILL IN YOUR DATA HERE ────────────────────────────────────────────────────
historical = [
    # school_year      total_enrolled
    ("2021-2022",         1000),
    ("2022-2023",          932),
    ("2023-2024",          941),
    ("2024-2025",          912),
    ("2025-2026",          982),
]
TARGET_YEAR = "2026-2027"
# ─────────────────────────────────────────────────────────────────────────────

df     = pd.DataFrame(historical, columns=["year", "enrolled"])
totals = df["enrolled"].values.tolist()
r      = run_prediction(totals, TARGET_YEAR)

if r is None:
    print("No data."); sys.exit(1)

print("=" * 60)
print("  ACLC NORTHBAY — ENROLLMENT PREDICTION REPORT")
print("=" * 60)
print(f"\n  Historical records: {r['n_records']}   Target: {r['target_year']}\n")
print("  Historical data:")
for _, row in df.iterrows():
    print(f"    {row['year']}  →  {int(row['enrolled'])} enrolled")
print()
print("  Leave-One-Out Cross-Validation results:")
print("  " + "-" * 56)
for m in r['models'].values():
    print(f"  {m['label']:<26}  pred={m['pred']:7.1f}  MAPE={m['mape']:5.1f}%  weight={m['weight']}%")
print()
print("=" * 60)
print(f"  ENSEMBLE PREDICTION  →  {r['ensemble']} students")
print(f"  95% confidence range →  {r['ci_lo']} – {r['ci_hi']}")
print(f"  Declining scenario   →  {r['declining']}")
print(f"  Realistic scenario   →  {r['realistic']}")
print(f"  Optimistic scenario  →  {r['optimistic']}")
print("=" * 60)
print()
print(f"  Best MAPE: {r['accuracy']['best_mape']}%   Avg MAE: {r['accuracy']['avg_mae']}   R²: {r['accuracy']['r2']}")
print()
print("  NOTE: 100% accuracy is not achievable on real-world enrollment data.")
print("  This ensemble minimizes error across 4 models via LOO cross-validation.")
print("=" * 60)
