import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const botToken = process.env.TELEGRAM_BOT_TOKEN!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const update = req.body;
    console.log("Telegram webhook update:", JSON.stringify(update, null, 2));

    // 1. Handle Pre-Checkout Query (Must answer within 10 seconds)
    if (update.pre_checkout_query) {
      const preCheckoutQueryId = update.pre_checkout_query.id;
      
      // Auto-approve all valid star payments
      await fetch(`https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pre_checkout_query_id: preCheckoutQueryId,
          ok: true
        })
      });

      return res.status(200).json({ success: true });
    }

    // 2. Handle Successful Payment
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const invoicePayload = payment.invoice_payload;
      const telegramChargeId = payment.telegram_payment_charge_id;
      const totalAmount = payment.total_amount;
      const telegramUserId = update.message.from.id;

      console.log("Processing payment:", {
        invoicePayload,
        telegramChargeId,
        totalAmount,
        telegramUserId
      });

      // Find pending invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("star_invoices")
        .select("*")
        .eq("invoice_payload", invoicePayload)
        .eq("status", "pending")
        .single();

      if (invoiceError || !invoice) {
        console.error("Invoice not found or processed:", invoiceError);
        return res.status(200).json({ error: "Invoice processed or missing" }); // 200 to stop retries
      }

      // Update invoice to paid
      const { error: updateError } = await supabase
        .from("star_invoices")
        .update({
          status: "paid",
          telegram_payment_charge_id: telegramChargeId,
          paid_at: new Date().toISOString()
        })
        .eq("id", invoice.id);

      if (updateError) {
        console.error("Error updating invoice:", updateError);
        return res.status(500).json({ error: "DB update failed" });
      }

      // Record transaction
      await supabase
        .from("star_transactions")
        .insert({
          user_id: invoice.user_id,
          telegram_user_id: telegramUserId,
          invoice_id: invoice.id,
          stars_paid: invoice.stars_amount,
          transaction_type: "speedup",
          metadata: {
            part_key: invoice.part_key,
            part_name: invoice.part_name,
            part_level: invoice.part_level,
            telegram_charge_id: telegramChargeId
          }
        });

      console.log("Payment processed successfully:", invoice.id);
      return res.status(200).json({ success: true });
    }

    // Return 200 for other updates to acknowledge receipt
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}