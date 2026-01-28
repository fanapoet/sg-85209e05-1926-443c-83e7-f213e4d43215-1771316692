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
      return { success: false, message: "Invalid QR code format. Expected: BUNERGY_PRODUCT_SERIAL_HASH" };
    }

    const [, productCode, serial, providedHash] = parts;

    // 2. Verify Hash locally first (SHA-256)
    const dataString = `${productCode}${serial}${SECRET_SALT}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 8);

    if (providedHash.toLowerCase() !== calculatedHash.toLowerCase()) {
      console.error("Hash mismatch:", { provided: providedHash, calculated: calculatedHash });
      return { success: false, message: "Security verification failed. Invalid QR code." };
    }

    // 3. Identify Product and Reward
    let productName = "Unknown Device";
    let rewardXP = 0;
    
    if (productCode.startsWith("GC")) {
      productName = "GameCore Stand";
      rewardXP = 5000;
    } else if (productCode.startsWith("BX")) {
      productName = "BIP-X Power Bank";
      rewardXP = 10000;
    } else {
      return { success: false, message: `Unknown product code: ${productCode}` };
    }

    // 4. Check Claim Status in DB
    const { data: existingDevice, error: checkError } = await supabase
      .from("hardware_devices")
      .select("*")
      .eq("unique_device_id", serial)
      .maybeSingle();

    if (checkError) {
      console.error("Database check error:", checkError);
      return { success: false, message: "Database error. Please try again." };
    }

    if (existingDevice) {
      return { success: false, message: "This device has already been claimed by another user!" };
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
      message: `Successfully connected ${productName}`, 
      xp: rewardXP,
      product: productName
    };

  } catch (error) {
    console.error("Verification error:", error);
    return { success: false, message: "An unexpected error occurred. Please try again." };
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

  if (error) {
    console.error("Get devices error:", error);
    return [];
  }
  return data || [];
}