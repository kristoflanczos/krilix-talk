import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const { conversation_id, message_id } = await req.json();

    const { data: message, error: messageError } = await admin
      .from("messages")
      .select("id,conversation_id,sender_id,body,message_type,attachment_name,metadata")
      .eq("id", message_id)
      .single();

    if (messageError || !message || message.sender_id !== user.id || message.conversation_id !== conversation_id) {
      return Response.json({ error: "Invalid message" }, { status: 400, headers: corsHeaders });
    }

    const { data: conversation } = await admin
      .from("conversations")
      .select("id,title,is_group")
      .eq("id", conversation_id)
      .single();

    const { data: sender } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const { data: members } = await admin
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", conversation_id)
      .neq("user_id", user.id);

    const recipientIds = (members || []).map((member) => member.user_id);

    if (!recipientIds.length) {
      return Response.json({ sent: 0 }, { headers: corsHeaders });
    }

    const { data: mutedSettings } = await admin
      .from("conversation_user_settings")
      .select("user_id")
      .eq("conversation_id", conversation_id)
      .eq("muted", true)
      .in("user_id", recipientIds);

    const mutedIds = new Set((mutedSettings || []).map((row) => row.user_id));
    const unmutedRecipientIds = recipientIds.filter((id) => !mutedIds.has(id));

    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("id,user_id,subscription")
      .in("user_id", unmutedRecipientIds);

    const body =
      message.body ||
      (message.message_type === "image"
        ? "Képet küldött."
        : message.message_type === "audio"
          ? "Hangüzenetet küldött."
          : message.message_type === "gif"
            ? "GIF-et küldött."
            : message.message_type === "sticker"
              ? "Matricát küldött."
              : message.attachment_name || "Új melléklet érkezett.");

    const title = conversation?.is_group
      ? `${conversation.title || "Csoport"} • ${sender?.display_name || "Valaki"}`
      : sender?.display_name || "Új Krilix üzenet";

    let sent = 0;
    const expiredIds: string[] = [];

    await Promise.all(
      (subscriptions || []).map(async (row) => {
        try {
          await webpush.sendNotification(
            row.subscription,
            JSON.stringify({
              title,
              body,
              tag: `krilix-${conversation_id}`,
              url: "/",
            }),
          );
          sent += 1;
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            expiredIds.push(row.id);
          }
        }
      }),
    );

    if (expiredIds.length) {
      await admin.from("push_subscriptions").delete().in("id", expiredIds);
    }

    return Response.json({ sent }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }
});
