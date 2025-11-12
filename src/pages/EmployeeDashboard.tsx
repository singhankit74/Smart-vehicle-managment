import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";

const EmployeeDashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Verify roles and redirect appropriately
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roleList = (roles || []).map((r: any) => r.role);

      // Redirect to higher precedence roles if present
      if (roleList.includes("admin")) {
        navigate("/admin/dashboard");
        return;
      }
      if (roleList.includes("vehicle_manager")) {
        navigate("/vehicle-manager/dashboard");
        return;
      }

      if (roleList.includes("employee")) {
        setUser(user);
        setLoading(false);
        return;
      }

      navigate("/auth");
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <EmployeeDashboard user={user} />;
};

export default EmployeeDashboardPage;
