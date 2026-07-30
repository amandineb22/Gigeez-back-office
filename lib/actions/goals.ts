"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GoalMetric, GoalPeriod } from "@/lib/types";

export interface FormState {
  error: string | null;
}

const METRICS: GoalMetric[] = ["revenue", "profit", "orders", "aov"];
const PERIODS: GoalPeriod[] = ["monthly", "quarterly", "yearly"];

function parseGoalForm(formData: FormData) {
  return {
    metric_type: String(formData.get("metric_type") ?? "") as GoalMetric,
    target_amount: Number(formData.get("target_amount")),
    period_type: String(formData.get("period_type") ?? "") as GoalPeriod,
    period_start: String(formData.get("period_start") ?? ""),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

function validateGoalForm(fields: ReturnType<typeof parseGoalForm>): string | null {
  if (!METRICS.includes(fields.metric_type as GoalMetric)) return "Choose a metric.";
  if (!PERIODS.includes(fields.period_type as GoalPeriod)) return "Choose a period.";
  if (!fields.period_start) return "Choose a period start date.";
  if (!Number.isFinite(fields.target_amount) || fields.target_amount < 0) return "Target must be zero or more.";
  return null;
}

export async function createGoal(_prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parseGoalForm(formData);
  const validationError = validateGoalForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("goals").insert(fields);
  if (error) return { error: error.message };

  revalidatePath("/goals");
  revalidatePath("/");
  redirect("/goals");
}

export async function updateGoal(id: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  const fields = parseGoalForm(formData);
  const validationError = validateGoalForm(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("goals").update(fields).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/goals");
  revalidatePath("/");
  redirect("/goals");
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/goals");
  revalidatePath("/");
}
