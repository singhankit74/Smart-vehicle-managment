import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import VehicleManagerDashboard from "@/components/dashboard/VehicleManagerDashboard";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUser(user);

      // Get all roles and redirect to the correct dashboard
      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (roleError) {
        console.error("Error fetching role:", roleError);
      }

      const roleList = (roles || []).map((r: any) => r.role);

      if (roleList.includes("admin")) {
        navigate("/admin/dashboard");
      } else if (roleList.includes("vehicle_manager")) {
        navigate("/vehicle-manager/dashboard");
      } else {
        navigate("/employee/dashboard");
      }

      setLoading(false);
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

  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">No role assigned to your account. Please contact an administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {userRole === "admin" ? (
        <AdminDashboard user={user} />
      ) : userRole === "vehicle_manager" ? (
        <VehicleManagerDashboard user={user} />
      ) : (
        <EmployeeDashboard user={user} />
      )}
    </>
  );
};

export default Dashboard;
