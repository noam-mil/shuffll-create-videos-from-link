import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N8N_PROD_URL = 'https://n8n.shuffll.cloud/webhook'
const N8N_TEST_URL = 'https://n8n.shuffll.cloud/webhook-test'

// HMAC-SHA256 signing
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const data = encoder.encode(payload)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, data)
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

async function generateAdminToken(userId: string, metaOrgId: string, role: string, secret: string) {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 3600

  const payload = {
    user_id: userId,
    meta_org_id: metaOrgId,
    role,
    iat: now,
    exp,
  }

  const payloadBase64 = btoa(JSON.stringify(payload))
  const signature = await signPayload(payloadBase64, secret)
  return `${payloadBase64}.${signature}`
}

async function verifyUserRole(supabase: any, userId: string, metaOrgId: string): Promise<string | null> {
  // Check system_admin
  const { data: systemAdminRole } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'system_admin')
    .maybeSingle()

  if (systemAdminRole) return 'system_admin'

  // Check meta org membership (meta_org_admin or org_admin)
  const { data: metaOrgMembership } = await supabase
    .from('meta_organization_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('meta_organization_id', metaOrgId)
    .maybeSingle()

  if (metaOrgMembership) {
    if (metaOrgMembership.role === 'meta_org_admin' || metaOrgMembership.role === 'org_admin') {
      return metaOrgMembership.role
    }
  }

  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const adminTokenSecret = Deno.env.get('ADMIN_TOKEN_SECRET')

    if (!adminTokenSecret) {
      console.error('ADMIN_TOKEN_SECRET not configured')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Validate user JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // Parse request body
    const { metaOrgId, path, testMode, method: httpMethod, payload } = await req.json()

    if (!metaOrgId || !path) {
      return new Response(
        JSON.stringify({ error: 'metaOrgId and path are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify role
    const role = await verifyUserRole(supabase, userId, metaOrgId)
    if (!role) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate admin token and call n8n
    const adminToken = await generateAdminToken(userId, metaOrgId, role, adminTokenSecret)
    const baseUrl = testMode ? N8N_TEST_URL : N8N_PROD_URL
    const n8nUrl = `${baseUrl}${path}`
    const resolvedMethod = (httpMethod || 'GET').toUpperCase()

    console.log(`Proxying ${resolvedMethod} to n8n: ${n8nUrl}`)

    const fetchOptions: RequestInit = {
      method: resolvedMethod,
      headers: {
        'X-Admin-Token': adminTokenSecret,
        'Content-Type': 'application/json',
      },
    }

    if (resolvedMethod !== 'GET' && payload) {
      fetchOptions.body = JSON.stringify(payload)
    }

    const n8nResponse = await fetch(n8nUrl, fetchOptions)

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error(`n8n error: ${n8nResponse.status} - ${errorText}`)
      return new Response(
        JSON.stringify({ error: `n8n request failed: ${n8nResponse.status}` }),
        { status: n8nResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const responseText = await n8nResponse.text()
    
    let data
    if (!responseText || responseText.trim() === '') {
      data = { success: true }
    } else {
      try {
        data = JSON.parse(responseText)
      } catch {
        console.error(`n8n returned non-JSON response: ${responseText.substring(0, 500)}`)
        return new Response(
          JSON.stringify({ error: 'Invalid response from n8n', raw: responseText.substring(0, 200) }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
