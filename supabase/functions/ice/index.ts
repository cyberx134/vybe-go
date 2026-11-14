// Edge Function: ice — TURN/STUN credential সরবরাহ (ফ্রি TURN এর জন্য)
//
// এখানে কোনো গোপন কী ক্লায়েন্টে যায় না; ক্লায়েন্ট লগইন (anonymous) JWT দিয়ে এই ফাংশন ডাকে।
// Supabase Dashboard → Edge Functions → Secrets এ নিচের যেকোনো একটি সেট করুন:
//
//   (ক) Cloudflare Calls TURN (ফ্রি ১ TB/মাস — সুপারিশ)
//       CF_TURN_KEY_ID, CF_TURN_API_TOKEN
//   (খ) Metered.ca (ফ্রি ৫০ GB/মাস)
//       METERED_APP_NAME (যেমন "vybego" → vybego.metered.live), METERED_API_KEY
//   (গ) নিজস্ব স্ট্যাটিক TURN
//       TURN_URLS (কমা দিয়ে আলাদা), TURN_USERNAME, TURN_CREDENTIAL
//
// কিছুই সেট না থাকলে শুধু public STUN ফেরত যায় (প্রায় ৭০–৮০% কানেকশন তাতেই চলে, বাকিগুলোর জন্য TURN লাগে)।

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const TTL_SECONDS = 3600;
const STUN = { urls: 'stun:stun.l.google.com:19302' };

type IceServer = { urls: string | string[]; username?: string; credential?: string };

async function fromCloudflare(keyId: string, token: string): Promise<IceServer[]> {
  const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: TTL_SECONDS }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const servers = data?.iceServers;
  if (Array.isArray(servers)) return servers as IceServer[];
  if (servers && typeof servers === 'object') return [servers as IceServer];
  return [];
}

async function fromMetered(appName: string, apiKey: string): Promise<IceServer[]> {
  const res = await fetch(`https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? (data as IceServer[]) : [];
}

function fromStatic(): IceServer[] {
  const urls = (Deno.env.get('TURN_URLS') ?? '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  const username = Deno.env.get('TURN_USERNAME');
  const credential = Deno.env.get('TURN_CREDENTIAL');
  return urls.length > 0 && username && credential ? [{ urls, username, credential }] : [];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const iceServers: IceServer[] = [STUN];
  try {
    const cfKey = Deno.env.get('CF_TURN_KEY_ID');
    const cfToken = Deno.env.get('CF_TURN_API_TOKEN');
    const meteredApp = Deno.env.get('METERED_APP_NAME');
    const meteredKey = Deno.env.get('METERED_API_KEY');

    if (cfKey && cfToken) iceServers.push(...(await fromCloudflare(cfKey, cfToken)));
    else if (meteredApp && meteredKey) iceServers.push(...(await fromMetered(meteredApp, meteredKey)));
    else iceServers.push(...fromStatic());
  } catch (_error) {
    // TURN প্রদানকারী ব্যর্থ হলেও STUN দিয়ে চলবে
  }

  return new Response(JSON.stringify({ iceServers, ttlSeconds: TTL_SECONDS }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
});
