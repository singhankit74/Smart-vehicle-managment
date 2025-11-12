import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2, MapPin, Calendar, User, Car } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  managerId: string;
}

interface Request {
  id: string;
  destination: string;
  purpose: string;
  expected_time: string;
  approval_status: string;
  created_at: string;
  vehicle_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
  vehicles: {
    name: string;
    number_plate: string;
  };
}

interface Vehicle {
  id: string;
  name: string;
  number_plate: string;
  status: string;
}

const AssignVehicles = ({ managerId }: Props) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedVehicles, setSelectedVehicles] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load approved requests
    const { data: requestsData, error: requestsError } = await supabase
      .from("trip_requests")
      .select(`
        *,
        profiles!trip_requests_employee_id_fkey (full_name, email),
        vehicles (name, number_plate)
      `)
      .eq("approval_status", "approved")
      .order("created_at", { ascending: true });

    // Load available vehicles
    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("*")
      .eq("status", "available")
      .order("name");

    if (!requestsError && requestsData) {
      setRequests(requestsData as any);
    }

    if (!vehiclesError && vehiclesData) {
      setVehicles(vehiclesData);
    }

    setLoading(false);
  };

  const handleAssign = async (requestId: string) => {
    const vehicleId = selectedVehicles[requestId];
    
    if (!vehicleId) {
      toast.error("Please select a vehicle");
      return;
    }

    setActionLoading(true);
    try {
      // Update trip request status and assigned vehicle
      const { error: requestError } = await supabase
        .from("trip_requests")
        .update({
          approval_status: "assigned",
          assigned_by: managerId,
          vehicle_id: vehicleId,
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      // Update vehicle status to in_use
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({ status: "in_use" })
        .eq("id", vehicleId);

      if (vehicleError) throw vehicleError;

      toast.success("Vehicle assigned successfully!");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign vehicle");
    } finally {
      setActionLoading(false);
    }
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Assign Vehicles to Approved Requests</h2>
        <Badge variant="secondary" className="text-lg px-4 py-1">
          {requests.length} Approved
        </Badge>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-success mb-4" />
            <p className="text-muted-foreground">No requests waiting for vehicle assignment</p>
          </CardContent>
        </Card>
      ) : (
        requests.map((request) => (
          <Card key={request.id} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-card to-success/10">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {request.destination}
                </span>
                <Badge className="bg-success text-success-foreground">
                  Approved - Assign Vehicle
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Employee
                    </p>
                    <p className="font-medium">{request.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground">{request.profiles.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Requested Vehicle</p>
                    {request.vehicles ? (
                      <>
                        <p className="font-medium">{request.vehicles.name}</p>
                        <p className="text-sm text-muted-foreground">{request.vehicles.number_plate}</p>
                      </>
                    ) : (
                      <p className="text-sm text-warning font-medium">⏳ Not assigned yet</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Purpose</p>
                  <p className="text-sm">{request.purpose}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Expected Time
                  </p>
                  <p className="text-sm">{format(new Date(request.expected_time), "PPp")}</p>
                </div>

                <div className="flex gap-2 pt-2 items-end">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      Assign Vehicle
                    </p>
                    <Select
                      value={selectedVehicles[request.id] || ""}
                      onValueChange={(value) =>
                        setSelectedVehicles({ ...selectedVehicles, [request.id]: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select available vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.name} - {vehicle.number_plate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => handleAssign(request.id)}
                    disabled={actionLoading || !selectedVehicles[request.id]}
                    className="bg-success hover:bg-success/90"
                  >
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Assign
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default AssignVehicles;
