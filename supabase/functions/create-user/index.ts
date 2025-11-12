// Supabase Edge Function: create-user
// Creates a new user (employee or vehicle_manager) securely without switching the admin session
// - Verifies caller is an admin
// - Creates auth user with service role
// - Inserts profile and assigns role

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing server configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");

    // Client to validate caller and read roles under RLS
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    // Admin client to perform privileged operations (bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: caller },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure caller is admin
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message || "Role check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fullName, email, password, phone, role } = await req.json();

    if (!fullName || !email || !password || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["employee", "vehicle_manager"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user (email confirmed so they can login immediately)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createErr || !created?.user?.id) {
      return new Response(
        JSON.stringify({ error: createErr?.message || "Failed to create user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = created.user.id;

    // Create profile record
    const { error: profileErr } = await supabaseAdmin.from("profiles").insert({
      id: newUserId,
      full_name: fullName,
      email,
      phone: phone ?? null,
    });

    if (profileErr) {
      return new Response(
        JSON.stringify({ error: profileErr.message || "Failed to create profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Small delay to ensure any triggers have completed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Ensure the user has exactly the intended role by clearing all existing roles first
    const { error: clearErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", newUserId);

    if (clearErr) {
      return new Response(
        JSON.stringify({ error: clearErr.message || "Failed to reset roles" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign the selected role
    console.log(`Assigning role ${role} to user ${newUserId}`);
    const { data: roleData, error: roleAssignErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUserId,
      role,
    }).select();

    if (roleAssignErr) {
      console.error("Role assignment error:", roleAssignErr);
      return new Response(
        JSON.stringify({ error: roleAssignErr.message || "Failed to assign role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Role assigned successfully:", roleData);

    return new Response(
      JSON.stringify({ success: true, userId: newUserId, role: role }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
