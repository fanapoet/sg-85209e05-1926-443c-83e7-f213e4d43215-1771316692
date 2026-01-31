import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lwvtwcezyhvxdiqyyypc.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3dnR3Y2V6eWh2eGRpcXl5eXBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMzNDg5OCwiZXhwIjoyMDg0OTEwODk4fQ.y8RP8fpO--FYiizOZ7NCsJEKZz_rVBoB2TUdFrfEMwk";
const botToken = process.env.TELEGRAM_BOT_TOKEN || "7774596180:AAFDvn2k-z7KFE1QLKpW5EAaM6N-JOL80kY";
const providerToken = process.env.TELEGRAM_PAYMENT_PROVIDER_TOKEN || "1877036958:TEST:baf85695ca7fc4a12f5ad4462baaa500b9201ed8";

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

    if (!userId || !telegramUserId || !stars || !partKey || !partName || !partLevel) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create unique invoice payload
    const invoicePayload = `speedup_${partKey}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
      return res.status(500).json({ error: "Failed to create invoice record" });
    }

    // Create Telegram invoice
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/createInvoiceLink`;
    
    const invoiceData = {
      title: `⚡ Speed Up Build`,
      description: `Complete "${partName}" (Level ${partLevel}) instantly`,
      payload: invoicePayload,
      provider_token: providerToken,
      currency: "XTR", // Telegram Stars currency code
      prices: [
        {
          label: `Speed Up ${partName}`,
          amount: stars // For Telegram Stars, amount = number of stars
        }
      ]
    };

    const telegramResponse = await fetch(telegramApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(invoiceData)
    });

    const telegramData = await telegramResponse.json();

    if (!telegramData.ok) {
      console.error("Telegram API error:", telegramData);
      return res.status(500).json({ 
        error: "Failed to create Telegram invoice",
        details: telegramData.description 
      });
    }

    const invoiceLink = telegramData.result;

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