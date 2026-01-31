import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lwvtwcezyhvxdiqyyypc.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3dnR3Y2V6eWh2eGRpcXl5eXBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMzNDg5OCwiZXhwIjoyMDg0OTEwODk4fQ.y8RP8fpO--FYiizOZ7NCsJEKZz_rVBoB2TUdFrfEMwk";
const botToken = process.env.TELEGRAM_BOT_TOKEN || "7774596180:AAFDvn2k-z7KFE1QLKpW5EAaM6N-JOL80kY";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, telegramUserId, stars, partKey, partName, partLevel } = req.body;

    console.log("Invoice request:", { userId, telegramUserId, stars, partKey, partName, partLevel });

    if (!userId || !telegramUserId || !stars || !partKey || !partName || partLevel === undefined) {
      console.error("Missing fields:", { userId, telegramUserId, stars, partKey, partName, partLevel });
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create unique invoice payload with proper structure
    const invoicePayload = JSON.stringify({
      userId,
      partKey,
      partName,
      partLevel,
      timestamp: Date.now()
    });

    console.log("Creating invoice with payload:", invoicePayload);

    // Store invoice in database
    const { data: invoice, error: dbError } = await supabase
      .from("star_invoices")
      .insert({
        user_id: userId,
        telegram_user_id: telegramUserId,
        invoice_payload: invoicePayload,
        stars_amount: stars,
        part_key: partKey,
        part_name: partName,
        part_level: partLevel,
        status: "pending"
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return res.status(500).json({ error: "Failed to create invoice record", details: dbError.message });
    }

    console.log("Invoice created in DB:", invoice.id);

    // Create Telegram invoice using createInvoiceLink
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/createInvoiceLink`;
    
    const invoiceData = {
      title: "⚡ Speed Up Build",
      description: `Complete "${partName}" (Level ${partLevel + 1}) instantly`,
      payload: invoicePayload,
      currency: "XTR",
      prices: [
        {
          label: `Speed Up ${partName}`,
          amount: stars
        }
      ]
    };

    console.log("Sending to Telegram API:", invoiceData);

    const telegramResponse = await fetch(telegramApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(invoiceData)
    });

    const telegramData = await telegramResponse.json();
    console.log("Telegram API response:", telegramData);

    if (!telegramData.ok) {
      console.error("Telegram API error:", telegramData);
      return res.status(500).json({ 
        error: "Failed to create Telegram invoice",
        details: telegramData.description 
      });
    }

    const invoiceLink = telegramData.result;
    console.log("Invoice link created:", invoiceLink);

    return res.status(200).json({
      success: true,
      invoiceLink,
      invoiceId: invoice.id,
      invoicePayload
    });

  } catch (error) {
    console.error("Error creating invoice:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}