import { supabase } from "@/integrations/supabase/client";

/**
 * Load daily claims from database
 */
export async function loadDailyClaimsFromDB(
  telegramId: number
): Promise<Array<{ day: number; week: number; type: string; amount: number; timestamp: number }> | null> {
  try {
    console.log("📥 [DAILY-CLAIMS] Loading from DB for telegram_id:", telegramId);

    // Cast to any to avoid "excessively deep" type error with complex schema inference
    const { data, error } = await (supabase
      .from("user_daily_claims") as any)
      .select("*")
      .eq("telegram_id", telegramId)
      .order("claimed_at", { ascending: false });

    if (error) {
      console.error("❌ [DAILY-CLAIMS] Load error:", error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log("📥 [DAILY-CLAIMS] No claims found in DB (fresh start)");
      return [];
    }

    // Convert DB format to app format
    const claims = data.map((row: any) => {
      const type = row.bz_claimed > 0 ? "BZ" : row.bb_claimed > 0 ? "BB" : "XP";
      const amount = row.bz_claimed || Number(row.bb_claimed) || row.xp_claimed || 0;
      
      return {
        day: row.day,
        week: 1, // TODO: Add week field to DB query when available
        type,
        amount,
        timestamp: new Date(row.claimed_at).getTime()
      };
    });

    console.log(`✅ [DAILY-CLAIMS] Loaded ${claims.length} claims from DB`);
    return claims;

  } catch (error: any) {
    console.error("❌ [DAILY-CLAIMS] Load exception:", error);
    return null;
  }
}

/**
 * Load NFTs from database
 */
export async function loadNFTsFromDB(
  telegramId: number
): Promise<Array<{ nftId: string; purchasePrice: number; timestamp: number }> | null> {
  try {
    console.log("📥 [NFT] Loading from DB for telegram_id:", telegramId);

    // Cast to any to avoid "excessively deep" type error
    const { data, error } = await (supabase
      .from("user_nfts") as any)
      .select("*")
      .eq("telegram_id", telegramId)
      .order("purchased_at", { ascending: false });

    if (error) {
      console.error("❌ [NFT] Load error:", error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log("📥 [NFT] No NFTs found in DB (fresh start)");
      return [];
    }

    const nfts = data.map((row: any) => ({
      nftId: row.nft_id,
      purchasePrice: Number(row.price_paid_bb),
      timestamp: new Date(row.purchased_at).getTime()
    }));

    console.log(`✅ [NFT] Loaded ${nfts.length} NFTs from DB`);
    return nfts;

  } catch (error: any) {
    console.error("❌ [NFT] Load exception:", error);
    return null;
  }
}

/**
 * Sync daily claims to database (UPSERT all local claims)
 */
export async function syncDailyClaimsToDB(
  telegramId: number,
  userId: string,
  claims: Array<{ day: number; week: number; type: string; amount: number; timestamp: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (claims.length === 0) {
      console.log("⏭️ [DAILY-CLAIMS-SYNC] No claims to sync");
      return { success: true };
    }

    console.log(`📤 [DAILY-CLAIMS-SYNC] Syncing ${claims.length} claims to DB...`);

    const upsertData = claims.map(claim => ({
      user_id: userId,
      telegram_id: telegramId,
      day: claim.day,
      week: claim.week,
      bz_claimed: claim.type === "BZ" ? claim.amount : 0,
      bb_claimed: claim.type === "BB" ? claim.amount : 0,
      xp_claimed: claim.type === "XP" ? claim.amount : 0,
      claimed_at: new Date(claim.timestamp).toISOString()
    }));

    const { error } = await (supabase
      .from("user_daily_claims") as any)
      .upsert(upsertData, {
        onConflict: "telegram_id,day",
        ignoreDuplicates: false
      });

    if (error) {
      console.error("❌ [DAILY-CLAIMS-SYNC] Sync failed:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ [DAILY-CLAIMS-SYNC] ${claims.length} claims synced successfully!`);
    return { success: true };

  } catch (error: any) {
    console.error("❌ [DAILY-CLAIMS-SYNC] Sync exception:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync NFTs to database (UPSERT all local NFTs)
 */
export async function syncNFTsToDB(
  telegramId: number,
  userId: string,
  nfts: Array<{ nftId: string; purchasePrice: number; timestamp: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (nfts.length === 0) {
      console.log("⏭️ [NFT-SYNC] No NFTs to sync");
      return { success: true };
    }

    console.log(`📤 [NFT-SYNC] Syncing ${nfts.length} NFTs to DB...`);

    const upsertData = nfts.map(nft => ({
      user_id: userId,
      telegram_id: telegramId,
      nft_id: nft.nftId,
      price_paid_bb: nft.purchasePrice,
      purchased_at: new Date(nft.timestamp).toISOString()
    }));

    const { error } = await (supabase
      .from("user_nfts") as any)
      .upsert(upsertData, {
        onConflict: "user_id,nft_id",
        ignoreDuplicates: false
      });

    if (error) {
      console.error("❌ [NFT-SYNC] Sync failed:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ [NFT-SYNC] ${nfts.length} NFTs synced successfully!`);
    return { success: true };

  } catch (error: any) {
    console.error("❌ [NFT-SYNC] Sync exception:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Merge local and server claims (deduplicate by day+week, keep all unique)
 */
export function mergeDailyClaims(
  localClaims: Array<{ day: number; week: number; type: string; amount: number; timestamp: number }>,
  serverClaims: Array<{ day: number; week: number; type: string; amount: number; timestamp: number }>
): Array<{ day: number; week: number; type: string; amount: number; timestamp: number }> {
  const mergedMap = new Map<string, any>();

  // Add all local claims
  localClaims.forEach(claim => {
    const key = `${claim.week}-${claim.day}`;
    mergedMap.set(key, claim);
  });

  // Add server claims (only if not already present)
  serverClaims.forEach(claim => {
    const key = `${claim.week}-${claim.day}`;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, claim);
    }
  });

  const merged = Array.from(mergedMap.values());
  console.log(`🔀 [DAILY-CLAIMS] Merged: ${localClaims.length} local + ${serverClaims.length} server = ${merged.length} unique`);
  return merged;
}

/**
 * Merge local and server NFTs (deduplicate by nftId, keep all unique)
 */
export function mergeNFTs(
  localNFTs: Array<{ nftId: string; purchasePrice: number; timestamp: number }>,
  serverNFTs: Array<{ nftId: string; purchasePrice: number; timestamp: number }>
): Array<{ nftId: string; purchasePrice: number; timestamp: number }> {
  const mergedMap = new Map<string, any>();

  // Add all local NFTs
  localNFTs.forEach(nft => {
    mergedMap.set(nft.nftId, nft);
  });

  // Add server NFTs (only if not already present)
  serverNFTs.forEach(nft => {
    if (!mergedMap.has(nft.nftId)) {
      mergedMap.set(nft.nftId, nft);
    }
  });

  const merged = Array.from(mergedMap.values());
  console.log(`🔀 [NFT] Merged: ${localNFTs.length} local + ${serverNFTs.length} server = ${merged.length} unique`);
  return merged;
}