import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Car, TrendingUp, Users, Loader2 } from "lucide-react";

interface Stats {
  totalTrips: number;
  totalDistance: number;
  activeEmployees: number;
  mostUsedVehicle: string;
}

const ReportsView = () => {
  const [stats, setStats] = useState<Stats>({
    totalTrips: 0,
    totalDistance: 0,
    activeEmployees: 0,
    mostUsedVehicle: "N/A",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    // Get total completed trips
    const { data: tripsData } = await supabase
      .from("trips")
      .select("distance, employee_id, vehicle_id")
      .eq("status", "completed");

    if (tripsData) {
      const totalTrips = tripsData.length;
      const totalDistance = tripsData.reduce((sum, trip) => sum + (trip.distance || 0), 0);
      const activeEmployees = new Set(tripsData.map((t) => t.employee_id)).size;

      // Find most used vehicle
      const vehicleCount = tripsData.reduce((acc, trip) => {
        acc[trip.vehicle_id] = (acc[trip.vehicle_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostUsedVehicleId = Object.entries(vehicleCount).sort((a, b) => b[1] - a[1])[0]?.[0];

      let mostUsedVehicle = "N/A";
      if (mostUsedVehicleId) {
        const { data: vehicleData } = await supabase
          .from("vehicles")
          .select("name")
          .eq("id", mostUsedVehicleId)
          .single();

        if (vehicleData) {
          mostUsedVehicle = vehicleData.name;
        }
      }

      setStats({
        totalTrips,
        totalDistance,
        activeEmployees,
        mostUsedVehicle,
      });
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        Reports & Analytics
      </h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrips}</div>
            <p className="text-xs text-muted-foreground">Completed trips</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDistance.toFixed(2)} km</div>
            <p className="text-xs text-muted-foreground">All vehicles combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEmployees}</div>
            <p className="text-xs text-muted-foreground">Completed at least one trip</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used Vehicle</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mostUsedVehicle}</div>
            <p className="text-xs text-muted-foreground">Highest trip count</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Average Distance per Trip:</strong>{" "}
              {stats.totalTrips > 0 ? (stats.totalDistance / stats.totalTrips).toFixed(2) : 0} km
            </p>
            <p className="text-muted-foreground">
              This dashboard provides real-time analytics for all completed trips in the system.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsView;
