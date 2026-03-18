/**
 * Evaluates a formula string like "qty=rango/(1.2*paso_felt)"
 * with the given variable values.
 */
export function evaluateFormula(
  formula: string,
  vars: { rango: number; paso_felt: number; product_product_qty: number }
): number {
  // Strip "qty=" prefix
  let expr = formula.replace(/^\s*qty\s*=\s*/i, '').trim()

  // Normalize comma decimal separators → dots (e.g. "0,02" → "0.02")
  expr = expr.replace(/(\d),(\d)/g, '$1.$2')

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      'rango',
      'paso_felt',
      'product_product_qty',
      `return ${expr}`
    )
    const result = fn(vars.rango, vars.paso_felt, vars.product_product_qty)
    if (typeof result !== 'number' || !isFinite(result)) return 0
    return Math.round(result * 1000) / 1000
  } catch {
    return 0
  }
}
