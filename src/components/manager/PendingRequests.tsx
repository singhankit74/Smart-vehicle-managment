import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Loader2, MapPin, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  profiles: {
    full_name: string;
    email: string;
  };
  vehicles: {
    name: string;
    number_plate: string;
  };
}

const PendingRequests = ({ managerId }: Props) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data, error } = await supabase
      .from("trip_requests")
      .select(`
        *,
        profiles!trip_requests_employee_id_fkey (full_name, email),
        vehicles (name, number_plate)
      `)
      .eq("approval_status", "pending")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setRequests(data as any);
    }
    setLoading(false);
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("trip_requests")
        .update({
          approval_status: "approved",
          approved_by: managerId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Request approved successfully!");
      loadRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("trip_requests")
        .update({
          approval_status: "rejected",
          approved_by: managerId,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", selectedRequest);

      if (error) throw error;

      toast.success("Request rejected");
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedRequest(null);
      loadRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject request");
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
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Pending Requests</h2>
          <Badge variant="secondary" className="text-lg px-4 py-1">
            <Clock className="h-4 w-4 mr-1" />
            {requests.length}
          </Badge>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-success mb-4" />
              <p className="text-muted-foreground">No pending requests</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-card to-warning/10">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    {request.destination}
                  </span>
                  <Badge className="bg-warning text-warning-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
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
                      <p className="text-sm text-muted-foreground">Vehicle</p>
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

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleApprove(request.id)}
                      disabled={actionLoading}
                      className="flex-1 bg-success hover:bg-success/90"
                    >
                      {actionLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setSelectedRequest(request.id);
                        setShowRejectDialog(true);
                      }}
                      disabled={actionLoading}
                      className="flex-1"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PendingRequests;
