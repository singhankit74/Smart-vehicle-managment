import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Truck, Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) throw error;

      if (authData.user) {
        console.log("User logged in:", authData.user.id);
        
        const { data: roles, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", authData.user.id);

        console.log("Roles fetched:", roles);
        console.log("Role error:", roleError);

        if (roleError) {
          console.error("Role fetch error:", roleError);
          toast.error("Failed to fetch user role. Please contact admin.");
          throw roleError;
        }

        const roleList = (roles || []).map((r: any) => r.role);
        console.log("Role list:", roleList);
        
        toast.success("Logged in successfully!");

        if (roleList.length === 0) {
          toast.error("No role assigned. Please contact admin.");
          await supabase.auth.signOut();
          return;
        }

        if (roleList.includes("admin")) {
          console.log("Redirecting to admin dashboard");
          navigate("/admin/dashboard");
        } else if (roleList.includes("vehicle_manager")) {
          console.log("Redirecting to vehicle manager dashboard");
          navigate("/vehicle-manager/dashboard");
        } else if (roleList.includes("employee")) {
          console.log("Redirecting to employee dashboard");
          navigate("/employee/dashboard");
        } else {
          toast.error("Invalid role. Please contact admin.");
          await supabase.auth.signOut();
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Truck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Vehicle Management</CardTitle>
          <CardDescription>Sign in to manage your fleet and trips</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="name@company.com"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
