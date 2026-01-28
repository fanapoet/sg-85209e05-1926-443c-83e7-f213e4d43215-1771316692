import { supabase } from "@/integrations/supabase/client";

const SECRET_SALT = "BUNERGY_2026_HARDWARE_VERIFY";

/**
 * Verify and claim a physical hardware device
 * QR Format: BUNERGY_{PRODUCT_CODE}_{SERIAL}_{HASH}
 */
export async function verifyAndClaimDevice(qrCode: string, userId: string): Promise<{ success: boolean; message: string; xp?: number; product?: string }> {
  try {
    // 1. Parse QR Code
    const parts = qrCode.split("_");
    if (parts.length !== 4 || parts[0] !== "BUNERGY") {
      return { success: false, message: "Invalid QR code format" };
    }

    const [prefix, productCode, serial, providedHash] = parts;

    // 2. Verify Hash locally first (SHA-256)
    const dataString = `${productCode}${serial}${SECRET_SALT}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 8);

    if (providedHash !== calculatedHash) {
      console.error("Hash mismatch:", { provided: providedHash, calculated: calculatedHash });
      return { success: false, message: "Security check failed: Invalid QR code" };
    }

    // 3. Identify Product
    let productName = "Unknown Device";
    let rewardXP = 0;
    
    if (productCode.startsWith("GC")) {
      productName = "GameCore Stand";
      rewardXP = 500; // Daily connection reward base? Or one time? Whitepaper says "Daily device connection 500 XP". 
      // But claim is usually one-time ownership. Let's give a big "New Device Bonus" of 5000 XP + daily connection rights.
      // The prompt says "never added by any users before ... to give users XP rewards".
      // Let's assume this is the "Claim" action giving a big bonus (e.g. 5000 XP)
    } else if (productCode.startsWith("BX")) {
      productName = "BIP-X Power Bank";
      rewardXP = 1000;
    }

    // 4. Check Claim Status in DB
    const { data: existingDevice, error: checkError } = await supabase
      .from("hardware_devices")
      .select("*")
      .eq("unique_device_id", serial)
      .single();

    if (existingDevice) {
      return { success: false, message: "This device has already been claimed!" };
    }

    // 5. Claim Device
    const { error: claimError } = await supabase
      .from("hardware_devices")
      .insert({
        user_id: userId,
        product_type: productName,
        unique_device_id: serial,
        qr_hash: providedHash,
        total_xp_earned: rewardXP
      });

    if (claimError) {
      console.error("Claim error:", claimError);
      return { success: false, message: "Failed to register device. Please try again." };
    }

    return { 
      success: true, 
      message: `Successfully connected ${productName}!`, 
      xp: rewardXP,
      product: productName
    };

  } catch (error) {
    console.error("Verification error:", error);
    return { success: false, message: "An unexpected error occurred" };
  }
}

/**
 * Get user's connected devices
 */
export async function getUserDevices(userId: string) {
  const { data, error } = await supabase
    .from("hardware_devices")
    .select("*")
    .eq("user_id", userId);

  if (error) return [];
  return data;
}