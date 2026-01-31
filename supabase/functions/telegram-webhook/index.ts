import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    const update = await req.json();
    console.log("Telegram webhook update:", JSON.stringify(update, null, 2));

    // Handle successful payment
    if (update.pre_checkout_query) {
      // Pre-checkout query - answer OK to allow payment
      const preCheckoutQueryId = update.pre_checkout_query.id;
      
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pre_checkout_query_id: preCheckoutQueryId,
          ok: true
        })
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Handle successful payment confirmation
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

      // Find invoice in database
      const { data: invoice, error: invoiceError } = await supabase
        .from("star_invoices")
        .select("*")
        .eq("invoice_payload", invoicePayload)
        .eq("status", "pending")
        .single();

      if (invoiceError || !invoice) {
        console.error("Invoice not found or already processed:", invoiceError);
        return new Response(JSON.stringify({ error: "Invoice not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Update invoice status
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
        return new Response(JSON.stringify({ error: "Failed to update invoice" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Create transaction record
      const { error: transactionError } = await supabase
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

      if (transactionError) {
        console.error("Error creating transaction:", transactionError);
      }

      console.log("Payment processed successfully:", invoice.id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});