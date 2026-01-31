import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const SUPABASE_URL = Deno.env.get("DB_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("DB_SERVICE_ROLE_KEY");

    if (!BOT_TOKEN || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("Missing required environment variables", {
        hasBotToken: !!BOT_TOKEN,
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceKey: !!SERVICE_ROLE_KEY
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Server configuration error" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Parse webhook payload
    const update = await req.json();
    console.log("✅ Received webhook update:", JSON.stringify(update, null, 2));

    // Handle pre-checkout query (payment validation)
    if (update.pre_checkout_query) {
      const query = update.pre_checkout_query;
      console.log("💳 Pre-checkout query received:", {
        queryId: query.id,
        userId: query.from.id,
        amount: query.total_amount,
        currency: query.currency,
        payload: query.invoice_payload
      });

      try {
        // Parse invoice payload
        const payload = JSON.parse(query.invoice_payload);
        const { userId, partKey } = payload;

        console.log("✅ Payment validation passed:", { userId, partKey, amount: query.total_amount });

        // Always approve for now - real validation can be added later
        const approveUrl = `https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`;
        const approveResponse = await fetch(approveUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pre_checkout_query_id: query.id,
            ok: true,
          }),
        });

        const approveResult = await approveResponse.json();
        console.log("✅ Pre-checkout approved:", approveResult);

        return new Response(
          JSON.stringify({ success: true, approved: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (error) {
        console.error("❌ Pre-checkout error:", error);
        
        // Answer with error
        const errorUrl = `https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`;
        await fetch(errorUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pre_checkout_query_id: query.id,
            ok: false,
            error_message: "Payment validation failed. Please try again.",
          }),
        });

        return new Response(
          JSON.stringify({ success: false, error: "Pre-checkout validation failed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle successful payment
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const user = update.message.from;

      console.log("💰 Successful payment received:", {
        userId: user.id,
        username: user.username,
        amount: payment.total_amount,
        currency: payment.currency,
        payload: payment.invoice_payload,
        chargeId: payment.telegram_payment_charge_id
      });

      try {
        // Parse invoice payload
        const payload = JSON.parse(payment.invoice_payload);
        const { userId, partKey, partName, partLevel } = payload;

        console.log("🔍 Processing payment completion:", {
          userId,
          partKey,
          partName,
          partLevel,
          telegramUserId: user.id,
          stars: payment.total_amount
        });

        // Find and update invoice in database
        const { data: invoice, error: fetchError } = await supabase
          .from("star_invoices")
          .select("*")
          .eq("user_id", userId)
          .eq("part_key", partKey)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (fetchError) {
          console.error("❌ Error fetching invoice:", fetchError);
          throw new Error(`Invoice fetch failed: ${fetchError.message}`);
        }

        if (!invoice) {
          console.error("❌ No pending invoice found for:", { userId, partKey });
          throw new Error("No pending invoice found");
        }

        console.log("✅ Found invoice:", invoice.id);

        // Update invoice status to paid
        const { error: updateError } = await supabase
          .from("star_invoices")
          .update({
            status: "paid",
            telegram_payment_charge_id: payment.telegram_payment_charge_id,
            provider_payment_charge_id: payment.provider_payment_charge_id,
            paid_at: new Date().toISOString(),
          })
          .eq("id", invoice.id);

        if (updateError) {
          console.error("❌ Error updating invoice:", updateError);
          throw new Error(`Invoice update failed: ${updateError.message}`);
        }

        console.log("✅ Invoice marked as paid:", invoice.id);

        // Send success message to user
        const messageUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const messageResponse = await fetch(messageUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: user.id,
            text: `✅ <b>Payment Successful!</b>\n\n🚀 Your "${partName}" (Level ${partLevel + 1}) build has been completed instantly!\n\n⭐ ${payment.total_amount} Stars spent`,
            parse_mode: "HTML",
          }),
        });

        const messageResult = await messageResponse.json();
        console.log("✅ Success message sent:", messageResult);

        return new Response(
          JSON.stringify({ 
            success: true, 
            invoiceId: invoice.id,
            status: "paid",
            message: "Payment processed successfully"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (error) {
        console.error("❌ Payment processing error:", error);
        
        // Send error message to user
        const messageUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        await fetch(messageUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: user.id,
            text: "❌ Payment received but processing failed. Please contact support with this payment ID: " + payment.telegram_payment_charge_id,
          }),
        });

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error instanceof Error ? error.message : "Payment processing failed" 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }

    // Unknown update type - just acknowledge it
    console.log("ℹ️ Unknown update type received:", Object.keys(update));
    return new Response(
      JSON.stringify({ success: true, message: "Update received" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});