import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller identity
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = user.id;
    const { target_user_id, new_password } = await req.json();

    if (!target_user_id || !new_password) {
      return new Response(
        JSON.stringify({ error: "target_user_id and new_password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check caller is system admin
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "system_admin")
      .maybeSingle();

    const isSystemAdmin = !!callerRole;

    if (!isSystemAdmin) {
      // Check if caller is meta_org_admin and target is in their meta org
      const { data: callerMemberships } = await supabaseAdmin
        .from("meta_organization_memberships")
        .select("meta_organization_id, role")
        .eq("user_id", callerId)
        .eq("role", "meta_org_admin");

      if (!callerMemberships || callerMemberships.length === 0) {
        return new Response(
          JSON.stringify({ error: "Insufficient permissions" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const callerMetaOrgIds = callerMemberships.map(m => m.meta_organization_id);

      // Check target user is in one of caller's meta orgs
      const { data: targetMembership } = await supabaseAdmin
        .from("meta_organization_memberships")
        .select("meta_organization_id, role")
        .eq("user_id", target_user_id)
        .in("meta_organization_id", callerMetaOrgIds)
        .maybeSingle();

      if (!targetMembership) {
        return new Response(
          JSON.stringify({ error: "Target user is not in your organization" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Cannot reset password for another meta_org_admin
      if (targetMembership.role === "meta_org_admin") {
        return new Response(
          JSON.stringify({ error: "Cannot reset password for users at your permission level" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Prevent resetting own password through this endpoint
    if (callerId === target_user_id) {
      return new Response(
        JSON.stringify({ error: "Use the profile settings to change your own password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // System admins cannot reset other system admins
    if (isSystemAdmin) {
      const { data: targetRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", target_user_id)
        .eq("role", "system_admin")
        .maybeSingle();

      if (targetRole) {
        return new Response(
          JSON.stringify({ error: "Cannot reset password for other system admins" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Reset the password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      target_user_id,
      { password: new_password }
    );

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
