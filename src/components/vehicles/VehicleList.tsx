import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Loader2 } from "lucide-react";

interface Vehicle {
  id: string;
  name: string;
  number_plate: string;
  description: string | null;
  status: string;
}

interface Props {
  readOnly?: boolean;
}

const VehicleList = ({ readOnly = false }: Props) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("name");

    if (!error && data) {
      setVehicles(data);
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {vehicles.map((vehicle) => (
        <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              {vehicle.name}
            </CardTitle>
            <Badge
              variant={
                vehicle.status === "available"
                  ? "default"
                  : vehicle.status === "in_use"
                  ? "secondary"
                  : "outline"
              }
              className={
                vehicle.status === "available"
                  ? "bg-success text-success-foreground"
                  : ""
              }
            >
              {vehicle.status.replace("_", " ")}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Number Plate</p>
                <p className="font-medium">{vehicle.number_plate}</p>
              </div>
              {vehicle.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{vehicle.description}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {vehicles.length === 0 && (
        <Card className="col-span-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No vehicles available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VehicleList;
