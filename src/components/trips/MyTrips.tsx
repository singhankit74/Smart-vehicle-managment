import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import TripTracker from "./TripTracker";
import { format } from "date-fns";

interface Props {
  userId: string;
}

interface TripRequest {
  id: string;
  destination: string;
  purpose: string;
  expected_time: string;
  approval_status: string;
  created_at: string;
  rejection_reason: string | null;
  vehicles: {
    name: string;
    number_plate: string;
  };
  trips: Array<{
    id: string;
    status: string;
  }>;
}

const MyTrips = ({ userId }: Props) => {
  const [requests, setRequests] = useState<TripRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, [userId]);

  const loadRequests = async () => {
    const { data, error } = await supabase
      .from("trip_requests")
      .select(`
        *,
        vehicles (name, number_plate),
        trips (id, status)
      `)
      .eq("employee_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data as any);
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
      <h2 className="text-2xl font-bold">My Trip Requests</h2>
      
      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No trip requests yet</p>
          </CardContent>
        </Card>
      ) : (
        requests.map((request) => (
          <Card key={request.id} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-card to-secondary/20">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    {request.destination}
                  </CardTitle>
                  <CardDescription>
                    {request.vehicles ? (
                      `${request.vehicles.name} (${request.vehicles.number_plate})`
                    ) : (
                      <span className="text-warning">⏳ Waiting for vehicle assignment</span>
                    )}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    request.approval_status === "assigned"
                      ? "default"
                      : request.approval_status === "approved"
                      ? "default"
                      : request.approval_status === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                  className={
                    request.approval_status === "assigned"
                      ? "bg-success text-success-foreground"
                      : request.approval_status === "approved"
                      ? "bg-blue-500 text-white"
                      : request.approval_status === "pending"
                      ? "bg-warning text-warning-foreground"
                      : ""
                  }
                >
                  {request.approval_status === "assigned" && <CheckCircle className="h-3 w-3 mr-1" />}
                  {request.approval_status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                  {request.approval_status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                  {request.approval_status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                  {request.approval_status === "assigned" ? "Vehicle Assigned" : request.approval_status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Purpose</p>
                    <p className="text-sm">{request.purpose}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Time</p>
                    <p className="text-sm flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(request.expected_time), "PPp")}
                    </p>
                  </div>
                </div>

                {request.rejection_reason && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                    <p className="text-sm text-destructive/90">{request.rejection_reason}</p>
                  </div>
                )}

                {request.approval_status === "approved" && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-600">Request Approved</p>
                    <p className="text-sm text-muted-foreground">Waiting for vehicle manager to assign a vehicle...</p>
                  </div>
                )}

                {request.approval_status === "assigned" && (
                  <TripTracker requestId={request.id} userId={userId} onUpdate={loadRequests} />
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default MyTrips;
