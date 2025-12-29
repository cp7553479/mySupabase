import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("Hello from Supabase Edge Function!")

serve(async (req) => {
  const { name } = await req.json()

  const data = {
    message: `Hello ${name || 'World'}!`,
    timestamp: new Date().toISOString(),
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})
