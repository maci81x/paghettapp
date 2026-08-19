export interface CompoundResult {
  /** Valore totale alla fine del periodo. */
  finalValue: number;
  /** Capitale iniziale più tutti i versamenti. */
  totalContributed: number;
  /** Interessi maturati. */
  totalGrowth: number;
  monthlyBreakdown: { month: number; balance: number; contributed: number; growth: number }[];
}

const r2 = (n: number) => +n.toFixed(2);

/**
 * Interesse composto con versamenti periodici:
 *   A = P(1 + r/n)^(nt) + PMT · [((1 + r/n)^(nt) − 1) / (r/n)]
 *
 * Il breakdown è calcolato mese per mese: prima maturano gli interessi sul
 * saldo, poi entra il versamento (rendita posticipata, come nella formula).
 */
export function calcCompoundInterest(
  principal: number,
  monthlyAdd: number,
  annualRate: number,
  months: number,
  compoundingPerYear = 12,
): CompoundResult {
  const periods = Math.max(0, Math.round(months));
  const i = annualRate / compoundingPerYear;
  const monthlyBreakdown: CompoundResult["monthlyBreakdown"] = [];

  let balance = principal;
  let contributed = principal;
  for (let m = 1; m <= periods; m++) {
    balance = balance * (1 + i) + monthlyAdd;
    contributed += monthlyAdd;
    monthlyBreakdown.push({
      month: m,
      balance: r2(balance),
      contributed: r2(contributed),
      growth: r2(balance - contributed),
    });
  }

  const finalValue = periods === 0 ? principal : balance;
  return {
    finalValue: r2(finalValue),
    totalContributed: r2(contributed),
    totalGrowth: r2(finalValue - contributed),
    monthlyBreakdown,
  };
}

/** Rendimento della settimana in corso, capitalizzato settimanalmente. */
export function weeklyGrowth(balance: number, annualRate = 0.1): number {
  return balance * (Math.pow(1 + annualRate / 52, 1) - 1);
}

/** Rendimento di un anno. */
export function yearlyGrowth(balance: number, annualRate = 0.1): number {
  return balance * annualRate;
}
