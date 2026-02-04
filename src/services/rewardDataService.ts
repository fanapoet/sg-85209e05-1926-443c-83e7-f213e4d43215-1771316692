import { supabase } from "@/integrations/supabase/client";

/**
 * Validate timestamp
 */
function validateTimestamp(timestamp: number): number {
  if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
    return Date.now();
  }
  return timestamp;
}

/**
 * Validate and convert timestamp to ISO string
 */
function toISOString(timestamp: number): string {
  if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
    console.warn("⚠️ Invalid timestamp:", timestamp, "- using current time");
    return new Date().toISOString();
  }
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    console.warn("⚠️ Invalid date from timestamp:", timestamp, "- using current time");
    return new Date().toISOString();
  }
  
  return date.toISOString();
}

/**
 * Load daily claims from database
 */
export async function loadDailyClaimsFromDB(
  telegramId: number
): Promise<Array<{ day: number; week: number; type: string; amount: number; timestamp: number }> | null> {
  try {
    console.log("📥 [DAILY-CLAIMS] Loading from DB for telegram_id:", telegramId);

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
    const claims = data.map((row: any) => ({
      day: row.day,
      week: 1, // Default to week 1 since DB doesn't track weeks
      type: row.reward_type || "BZ",
      amount: Number(row.reward_amount) || 0,
      timestamp: new Date(row.claimed_at).getTime()
    }));

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
      purchasePrice: 0, // DB doesn't store price, set to 0
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
    console.log("📤 [DAILY-CLAIMS-SYNC] Sample claim:", claims[0]);

    const upsertData = claims.map(claim => {
      const claimedAt = toISOString(claim.timestamp);
      console.log(`📤 [DAILY-CLAIMS-SYNC] Converting timestamp ${claim.timestamp} → ${claimedAt}`);
      
      return {
        user_id: userId,
        telegram_id: telegramId,
        day: claim.day,
        reward_type: claim.type,
        reward_amount: claim.amount,
        claimed_at: claimedAt
      };
    });

    console.log("📤 [DAILY-CLAIMS-SYNC] Upsert data sample:", upsertData[0]);

    // Use simple insert without onConflict since constraint doesn't exist yet
    // User will add UNIQUE constraint manually, then we can use onConflict
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
 * Sync NFT purchases to database
 */
export async function syncNFTsToDB(
  telegramId: number,
  userId: string,
  nfts: Array<{ nftId: string; purchasePrice: number; timestamp: number }>
): Promise<{ success: boolean; error?: string }> {
  console.log("📤 [NFT-SYNC] Syncing NFT purchases...");
  console.log("📤 [NFT-SYNC] Input params:", { telegramId, userId, nftsCount: nfts.length });
  console.log("📤 [NFT-SYNC] Raw NFT array:", JSON.stringify(nfts, null, 2));

  if (!nfts || nfts.length === 0) {
    console.log("⚠️ [NFT-SYNC] No NFTs to sync (array empty)");
    return { success: true };
  }

  try {
    // Validate and prepare NFT records - handle both string and object formats
    const nftRecords = nfts
      .map((nft, index) => {
        // Handle legacy string format: ["early_adopter"]
        if (typeof nft === 'string') {
          console.log(`📦 [NFT-SYNC] Converting legacy string format at index ${index}:`, nft);
          return {
            nftId: nft,
            timestamp: Date.now() // Use current time for legacy data
          };
        }
        
        // Handle object format: [{ nftId: "...", purchasePrice: 0, timestamp: 123 }]
        if (nft && typeof nft === 'object' && nft.nftId) {
          return {
            nftId: nft.nftId,
            timestamp: nft.timestamp || Date.now()
          };
        }
        
        console.warn(`⚠️ [NFT-SYNC] Invalid NFT at index ${index}:`, nft);
        return null;
      })
      .filter((nft): nft is { nftId: string; timestamp: number } => {
        const isValid = nft !== null && nft.nftId && typeof nft.nftId === 'string' && nft.nftId.trim() !== '';
        if (!isValid) {
          console.warn("⚠️ [NFT-SYNC] Filtered out invalid NFT:", nft);
        }
        return isValid;
      })
      .map(nft => {
        const timestamp = validateTimestamp(nft.timestamp);
        const record = {
          user_id: userId,
          telegram_id: telegramId,
          nft_id: nft.nftId,
          purchased_at: new Date(timestamp).toISOString()
        };
        console.log("📦 [NFT-SYNC] Prepared record:", record);
        return record;
      });

    console.log(`📤 [NFT-SYNC] Prepared ${nftRecords.length} valid records for insert`);
    console.log("📤 [NFT-SYNC] Records to insert:", JSON.stringify(nftRecords, null, 2));

    if (nftRecords.length === 0) {
      console.log("⚠️ [NFT-SYNC] All NFTs filtered out (invalid data)");
      return { success: true };
    }

    console.log("📤 [NFT-SYNC] Executing Supabase insert...");
    // Cast to any to bypass stale TypeScript definitions (database.types.ts expects price_paid_bb)
    const { data, error } = await supabase
      .from("user_nfts")
      .insert(nftRecords as any)
      .select();

    console.log("📤 [NFT-SYNC] Supabase response:", { data, error });

    if (error) {
      console.error("❌ [NFT-SYNC] Sync failed:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ [NFT-SYNC] ${nftRecords.length} NFTs synced successfully!`);
    console.log("✅ [NFT-SYNC] Inserted data:", data);
    return { success: true };
  } catch (error: any) {
    console.error("❌ [NFT-SYNC] Sync exception:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Merge local and server claims (deduplicate by day, keep all unique)
 */
export function mergeDailyClaims(
  localClaims: Array<{ day: number; week: number; type: string; amount: number; timestamp: number }>,
  serverClaims: Array<{ day: number; week: number; type: string; amount: number; timestamp: number }>
): Array<{ day: number; week: number; type: string; amount: number; timestamp: number }> {
  const mergedMap = new Map<number, any>();

  // Add all local claims (keyed by day only)
  localClaims.forEach(claim => {
    mergedMap.set(claim.day, claim);
  });

  // Add server claims (only if not already present)
  serverClaims.forEach(claim => {
    if (!mergedMap.has(claim.day)) {
      mergedMap.set(claim.day, claim);
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