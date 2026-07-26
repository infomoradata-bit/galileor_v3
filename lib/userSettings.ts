import type { BankParams, BuyerInput, FinancingPresetId } from "./affordability";
import { DEFAULT_BANK_PARAMS } from "./affordability";
import { getSupabaseBrowserClient } from "./supabase/client";

export const EMPTY_BUYER: BuyerInput = {
  grossIncomePrimary: 0,
  grossIncomeSecondary: 0,
  recognizedBonusIncome: 0,
  otherRecognizedIncome: 0,
  existingAnnualObligations: 0,
  availableEquity: 0,
  purchasePrice: 0,
  bankValuation: 0,
  actualMortgageRate: 0,
  annualInsurance: 0,
};

export interface AffordabilitySettings {
  buyer: BuyerInput;
  params: BankParams;
  selectedPresetId: FinancingPresetId;
}

const PRESET_IDS = new Set<string>(["20", "25", "33", "40", "50"]);

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizeAffordabilitySettings(raw: unknown): AffordabilitySettings {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const buyerRaw = (data.buyer && typeof data.buyer === "object" ? data.buyer : {}) as Record<
    string,
    unknown
  >;
  const paramsRaw = (data.params && typeof data.params === "object" ? data.params : {}) as Record<
    string,
    unknown
  >;
  const preset =
    typeof data.selectedPresetId === "string" && PRESET_IDS.has(data.selectedPresetId)
      ? (data.selectedPresetId as FinancingPresetId)
      : "20";

  return {
    buyer: {
      grossIncomePrimary: asNumber(buyerRaw.grossIncomePrimary, 0),
      grossIncomeSecondary: asNumber(buyerRaw.grossIncomeSecondary, 0),
      recognizedBonusIncome: asNumber(buyerRaw.recognizedBonusIncome, 0),
      otherRecognizedIncome: asNumber(buyerRaw.otherRecognizedIncome, 0),
      existingAnnualObligations: asNumber(buyerRaw.existingAnnualObligations, 0),
      availableEquity: asNumber(buyerRaw.availableEquity, 0),
      purchasePrice: asNumber(buyerRaw.purchasePrice, 0),
      bankValuation: asNumber(buyerRaw.bankValuation, 0),
      actualMortgageRate: asNumber(buyerRaw.actualMortgageRate, 0),
      annualInsurance: asNumber(buyerRaw.annualInsurance, 0),
    },
    params: {
      calcRate: asNumber(paramsRaw.calcRate, DEFAULT_BANK_PARAMS.calcRate),
      maintenanceRate: asNumber(paramsRaw.maintenanceRate, DEFAULT_BANK_PARAMS.maintenanceRate),
      maxAffordability: asNumber(paramsRaw.maxAffordability, DEFAULT_BANK_PARAMS.maxAffordability),
      maxLtv: asNumber(paramsRaw.maxLtv, DEFAULT_BANK_PARAMS.maxLtv),
      firstMortgageLtv: asNumber(paramsRaw.firstMortgageLtv, DEFAULT_BANK_PARAMS.firstMortgageLtv),
      amortizationYears: asNumber(
        paramsRaw.amortizationYears,
        DEFAULT_BANK_PARAMS.amortizationYears
      ),
    },
    selectedPresetId: preset,
  };
}

/** Returns null when nothing has been saved yet (new account). */
export async function loadAffordabilitySettings(): Promise<AffordabilitySettings | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_settings")
    .select("affordability")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Could not load affordability settings:", error.message);
    return null;
  }
  if (!data?.affordability || Object.keys(data.affordability as object).length === 0) {
    return null;
  }
  return normalizeAffordabilitySettings(data.affordability);
}

export async function saveAffordabilitySettings(
  settings: AffordabilitySettings
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to save." };

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    affordability: settings as unknown as Record<string, unknown>,
  });

  if (error) {
    console.error("Could not save affordability settings:", error.message);
    return { error: error.message };
  }
  return { error: null };
}
