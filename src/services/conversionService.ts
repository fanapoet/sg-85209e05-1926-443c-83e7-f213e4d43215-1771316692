import { supabase } from "@/integrations/supabase/client";

export interface ConversionRecord {
  id: string;
  type: "bz-to-bb" | "bb-to-bz";
  input: number;
  output: number;
  bonus?: number;
  tier?: string;
  timestamp: number;
}

/**
 * Save conversion record to database
 * Uses telegram_id directly (no auth session needed)
 * Uses client-provided ID to prevent duplicates
 */
export async function saveConversionToDB(
  telegramId: number,
  conversion: ConversionRecord
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("💾 [Conversion] Saving to DB:", {
      id: conversion.id,
      telegramId,
      type: conversion.type,
      input: conversion.input,
      output: conversion.output
    });

    const { error } = await supabase
      .from("conversion_history")
      .upsert({
        id: conversion.id,
        telegram_id: telegramId,
        conversion_type: conversion.type,
        amount_in: conversion.input,
        amount_out: conversion.output,
        tier_bonus_percent: conversion.bonus ? Math.round(conversion.bonus * 100) : 0,
        tier_at_conversion: conversion.tier || "Bronze",
        created_at: new Date(conversion.timestamp).toISOString()
      }, {
        onConflict: "id"
      });

    if (error) {
      console.error("❌ [Conversion] DB save failed:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Conversion] Saved to DB successfully with ID:", conversion.id);
    return { success: true };
  } catch (error) {
    console.error("❌ [Conversion] Exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Load conversion history from database
 */
export async function loadConversionHistory(
  telegramId: number,
  limit = 50
): Promise<{ success: boolean; data?: ConversionRecord[]; error?: string }> {
  try {
    console.log("📥 [Conversion] Loading history from DB for telegram_id:", telegramId);

    const { data, error } = await supabase
      .from("conversion_history")
      .select("*")
      .eq("telegram_id", telegramId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ [Conversion] Load failed:", error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      console.log("📥 [Conversion] No history found (fresh start)");
      return { success: true, data: [] };
    }

    // Convert DB format to ConversionRecord format
    const conversions: ConversionRecord[] = data.map(record => ({
      id: record.id,
      type: record.conversion_type as "bz-to-bb" | "bb-to-bz",
      input: Number(record.amount_in),
      output: Number(record.amount_out),
      bonus: record.tier_bonus_percent ? record.tier_bonus_percent / 100 : undefined,
      tier: record.tier_at_conversion || undefined,
      timestamp: new Date(record.created_at).getTime()
    }));

    console.log(`✅ [Conversion] Loaded ${conversions.length} records from DB`);
    return { success: true, data: conversions };

  } catch (error) {
    console.error("❌ [Conversion] Load exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Batch sync conversions from localStorage to DB
 */
export async function syncConversionsToDB(
  telegramId: number,
  conversions: ConversionRecord[]
): Promise<{ success: boolean; synced: number; error?: string }> {
  try {
    if (!conversions || conversions.length === 0) {
      return { success: true, synced: 0 };
    }

    console.log(`🔄 [Conversion] Batch syncing ${conversions.length} conversions...`);

    const records = conversions.map(conv => ({
      telegram_id: telegramId,
      conversion_type: conv.type,
      amount_in: conv.input,
      amount_out: conv.output,
      tier_bonus_percent: conv.bonus ? Math.round(conv.bonus * 100) : 0,
      tier_at_conversion: conv.tier || "Bronze",
      created_at: new Date(conv.timestamp).toISOString()
    }));

    const { error } = await supabase
      .from("conversion_history")
      .insert(records);

    if (error) {
      console.error("❌ [Conversion] Batch sync failed:", error);
      return { success: false, synced: 0, error: error.message };
    }

    console.log(`✅ [Conversion] Batch synced ${conversions.length} records`);
    return { success: true, synced: conversions.length };

  } catch (error) {
    console.error("❌ [Conversion] Batch sync exception:", error);
    return { 
      success: false, 
      synced: 0,
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}