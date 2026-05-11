import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getMeta(html: string, key: string) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Csak http/https link engedélyezett.");
    }

    const response = await fetch(parsed.toString(), {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; KrilixTalkPreview/1.0)",
      },
      redirect: "follow",
    });

    const html = await response.text();
    const title =
      getMeta(html, "og:title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ||
      parsed.hostname;
    const description = getMeta(html, "og:description") || getMeta(html, "description");
    const image = getMeta(html, "og:image");

    return Response.json(
      {
        url: parsed.toString(),
        title,
        description,
        image,
        host: parsed.hostname,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 400, headers: corsHeaders }
    );
  }
});
