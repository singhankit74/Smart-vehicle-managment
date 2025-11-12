import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, Car, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VehicleList from "@/components/vehicles/VehicleList";
import TripRequestForm from "@/components/trips/TripRequestForm";
import MyTrips from "@/components/trips/MyTrips";

interface Props {
  user: User;
}

const EmployeeDashboard = ({ user }: Props) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("trips");
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
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{userName || "User"} (Employee)</h1>
              <p className="text-sm text-muted-foreground">Vehicle Management</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="trips">My Trips</TabsTrigger>
            <TabsTrigger value="request">
              <Plus className="h-4 w-4 mr-1" />
              New Request
            </TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          </TabsList>

          <TabsContent value="trips" className="space-y-4">
            <MyTrips userId={user.id} />
          </TabsContent>

          <TabsContent value="request" className="space-y-4">
            <TripRequestForm userId={user.id} onSuccess={() => setActiveTab("trips")} />
          </TabsContent>

          <TabsContent value="vehicles" className="space-y-4">
            <VehicleList readOnly />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default EmployeeDashboard;
