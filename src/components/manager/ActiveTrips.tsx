import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, User, Car, Calendar, Navigation } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Trip {
  id: string;
  start_time: string;
  start_reading: number;
  start_meter_photo: string;
  start_location_lat: number;
  start_location_lng: number;
  status: string;
  profiles: {
    full_name: string;
    email: string;
  };
  vehicles: {
    name: string;
    number_plate: string;
  };
  trip_requests: {
    destination: string;
    purpose: string;
  };
}

const ActiveTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadActiveTrips();
  }, []);

  const loadActiveTrips = async () => {
    const { data, error } = await supabase
      .from("trips")
      .select(`
        *,
        profiles!trips_employee_id_fkey (full_name, email),
        vehicles (name, number_plate),
        trip_requests (destination, purpose)
      `)
      .eq("status", "active")
      .order("start_time", { ascending: false });

    if (!error && data) {
      setTrips(data as any);
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
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Active Trips</h2>
          <Badge variant="secondary" className="text-lg px-4 py-1">
            {trips.length} Active
          </Badge>
        </div>

        {trips.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Car className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active trips</p>
            </CardContent>
          </Card>
        ) : (
          trips.map((trip) => (
            <Card key={trip.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-card to-accent/10">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-accent" />
                    {trip.trip_requests.destination}
                  </span>
                  <Badge className="bg-accent text-accent-foreground">Active</Badge>
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
                      <p className="font-medium">{trip.profiles.full_name}</p>
                      <p className="text-sm text-muted-foreground">{trip.profiles.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        Vehicle
                      </p>
                      <p className="font-medium">{trip.vehicles.name}</p>
                      <p className="text-sm text-muted-foreground">{trip.vehicles.number_plate}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Purpose</p>
                    <p className="text-sm">{trip.trip_requests.purpose}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Started
                      </p>
                      <p className="text-sm">{format(new Date(trip.start_time), "PPp")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Start Reading</p>
                      <p className="text-sm font-medium">{trip.start_reading} km</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPhoto(trip.start_meter_photo)}
                      className="flex-1"
                    >
                      View Start Photo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(
                          `https://www.google.com/maps?q=${trip.start_location_lat},${trip.start_location_lng}`,
                          "_blank"
                        );
                      }}
                      className="flex-1"
                    >
                      <Navigation className="h-4 w-4 mr-1" />
                      View Location
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Odometer Photo</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="Odometer reading"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActiveTrips;
