import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ConversionHistory = Database["public"]["Tables"]["conversion_history"]["Row"];
type ConversionInsert = Database["public"]["Tables"]["conversion_history"]["Insert"];

export interface ConversionRecord {
  type: "BZ_TO_BB" | "BB_TO_BZ";
  amountIn: number;
  amountOut: number;
  burnedAmount?: number;
  tierAtConversion: string;
  tierBonusPercent: number;
  exchangeRate: number;
  timestamp: number;
}

/**
 * Record a conversion to the database
 */
export async function recordConversion(
  userId: string,
  conversion: ConversionRecord
): Promise<{ success: boolean; error?: string }> {
  try {
    const conversionData: ConversionInsert = {
      user_id: userId,
      conversion_type: conversion.type,
      amount_in: conversion.amountIn,
      amount_out: conversion.amountOut,
      burned_amount: conversion.burnedAmount || 0,
      tier_at_conversion: conversion.tierAtConversion,
      tier_bonus_percent: conversion.tierBonusPercent,
      exchange_rate: conversion.exchangeRate,
    };

    const { error } = await supabase
      .from("conversion_history")
      .insert(conversionData);

    if (error) {
      console.error("Error recording conversion:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception recording conversion:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Get conversion history for a user
 * @param userId - The user's UUID
 * @param limit - Maximum number of records to fetch (default: 50)
 */
export async function getConversionHistory(
  userId: string,
  limit = 50
): Promise<{ success: boolean; data?: ConversionHistory[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("conversion_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching conversion history:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Exception fetching conversion history:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Get conversion statistics for a user
 */
export async function getConversionStats(
  userId: string
): Promise<{
  success: boolean;
  stats?: {
    totalBzToBb: number;
    totalBbToBz: number;
    totalBurned: number;
    conversionCount: number;
  };
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("conversion_history")
      .select("conversion_type, amount_in, amount_out, burned_amount")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching conversion stats:", error);
      return { success: false, error: error.message };
    }

    const stats = {
      totalBzToBb: 0,
      totalBbToBz: 0,
      totalBurned: 0,
      conversionCount: data?.length || 0,
    };

    data?.forEach((conversion) => {
      if (conversion.conversion_type === "BZ_TO_BB") {
        stats.totalBzToBb += Number(conversion.amount_in);
      } else if (conversion.conversion_type === "BB_TO_BZ") {
        stats.totalBbToBz += Number(conversion.amount_out);
      }
      stats.totalBurned += Number(conversion.burned_amount || 0);
    });

    return { success: true, stats };
  } catch (error) {
    console.error("Exception fetching conversion stats:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}