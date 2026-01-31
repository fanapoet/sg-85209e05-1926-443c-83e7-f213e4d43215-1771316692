import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PreCheckoutQuery {
  id: string;
  from: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  currency: string;
  total_amount: number;
  invoice_payload: string;
}

interface SuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id: string;
}

interface TelegramUpdate {
  update_id: number;
  pre_checkout_query?: PreCheckoutQuery;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    successful_payment?: SuccessfulPayment;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const update: TelegramUpdate = await req.json();
    console.log("Received update:", JSON.stringify(update, null, 2));

    // Handle pre-checkout query (approve payment)
    if (update.pre_checkout_query) {
      const query = update.pre_checkout_query;
      console.log("Processing pre-checkout query:", query.id);

      // Verify invoice exists and is pending
      try {
        const payload = JSON.parse(query.invoice_payload);
        const { invoiceId } = payload;

        const { data: invoice, error: fetchError } = await supabase
          .from("star_invoices")
          .select("*")
          .eq("invoice_id", invoiceId)
          .single();

        if (fetchError || !invoice) {
          console.error("Invoice not found:", invoiceId);
          // Reject payment
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pre_checkout_query_id: query.id,
              ok: false,
              error_message: "Invoice not found"
            })
          });
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (invoice.status !== "pending") {
          console.error("Invoice not pending:", invoice.status);
          // Reject payment
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pre_checkout_query_id: query.id,
              ok: false,
              error_message: "Invoice already processed"
            })
          });
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Approve payment
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pre_checkout_query_id: query.id,
            ok: true
          })
        });

        console.log("Pre-checkout approved:", query.id);

      } catch (error) {
        console.error("Error processing pre-checkout:", error);
        // Reject on error
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pre_checkout_query_id: query.id,
            ok: false,
            error_message: "Server error"
          })
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Handle successful payment
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const userId = update.message.from.id;

      console.log("Processing successful payment:", payment.telegram_payment_charge_id);

      try {
        const payload = JSON.parse(payment.invoice_payload);
        const { invoiceId, partKey } = payload;

        // Update invoice status
        const { error: updateError } = await supabase
          .from("star_invoices")
          .update({
            status: "paid",
            telegram_payment_charge_id: payment.telegram_payment_charge_id,
            provider_payment_charge_id: payment.provider_payment_charge_id,
            paid_at: new Date().toISOString()
          })
          .eq("invoice_id", invoiceId);

        if (updateError) {
          console.error("Error updating invoice:", updateError);
        } else {
          console.log("Invoice updated successfully:", invoiceId);
        }

        // Send confirmation message
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: userId,
            text: `✅ Payment successful! Your build has been completed instantly.`,
            parse_mode: "Markdown"
          })
        });

      } catch (error) {
        console.error("Error processing payment:", error);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Acknowledge other updates
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});