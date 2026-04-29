import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
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
    const { metaOrgId } = await req.json()
    
    if (!metaOrgId) {
      return new Response(
        JSON.stringify({ error: 'metaOrgId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is system_admin
    const { data: systemAdminRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'system_admin')
      .maybeSingle()

    let role: 'system_admin' | 'meta_org_admin' | 'org_admin' | null = null

    if (systemAdminRole) {
      role = 'system_admin'
    } else {
      // Check meta org membership (meta_org_admin or org_admin)
      const { data: metaOrgMembership } = await supabase
        .from('meta_organization_memberships')
        .select('role')
        .eq('user_id', userId)
        .eq('meta_organization_id', metaOrgId)
        .maybeSingle()

      if (metaOrgMembership && (metaOrgMembership.role === 'meta_org_admin' || metaOrgMembership.role === 'org_admin')) {
        role = metaOrgMembership.role
      }
    }

    if (!role) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin token payload
    const now = Math.floor(Date.now() / 1000)
    const exp = now + 3600 // 1 hour expiry

    const payload = {
      user_id: userId,
      meta_org_id: metaOrgId,
      role,
      iat: now,
      exp
    }

    const payloadBase64 = btoa(JSON.stringify(payload))
    const signature = await signPayload(payloadBase64, adminTokenSecret)
    const adminToken = `${payloadBase64}.${signature}`

    return new Response(
      JSON.stringify({
        token: adminToken,
        expiresAt: exp * 1000 // Return as milliseconds for JS
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating admin token:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
