import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, Car, Package, TrendingUp, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ActiveTrips from "@/components/manager/ActiveTrips";
import VehicleManagement from "@/components/manager/VehicleManagement";
import ReportsView from "@/components/manager/ReportsView";
import AssignVehicles from "@/components/manager/AssignVehicles";

interface Props {
  user: User;
}

const VehicleManagerDashboard = ({ user }: Props) => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setUserName(data.full_name);
      }
    };

    fetchUserProfile();
  }, [user.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{userName || "User"} (Vehicle Manager)</h1>
              <p className="text-sm text-muted-foreground">Assign vehicles and manage fleet</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="assign" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="assign" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Assign Vehicles</span>
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Active Trips</span>
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="gap-2">
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">Vehicle Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assign" className="space-y-4">
            <AssignVehicles managerId={user.id} />
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <ActiveTrips />
          </TabsContent>

          <TabsContent value="vehicles" className="space-y-4">
            <VehicleManagement />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <ReportsView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default VehicleManagerDashboard;
