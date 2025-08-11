export type BudgetConfig = { tokenBudget?: number; warnAt?: number };

export function shouldWarn(tokensUsed: number, cfg: BudgetConfig): boolean {
  if (!cfg.tokenBudget || !cfg.warnAt) return false;
  return tokensUsed >= Math.floor(cfg.tokenBudget * cfg.warnAt);
}


