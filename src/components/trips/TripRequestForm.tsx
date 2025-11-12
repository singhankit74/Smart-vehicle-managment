import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  userId: string;
  onSuccess: () => void;
}

const TripRequestForm = ({ userId, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    destination: "",
    purpose: "",
    expected_time: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get the current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to submit a request");
      }

      const { error } = await supabase.from("trip_requests").insert({
        employee_id: user.id,
        vehicle_id: null, // Vehicle will be assigned by manager
        destination: formData.destination,
        purpose: formData.purpose,
        expected_time: formData.expected_time,
      });

      if (error) throw error;

      toast.success("Trip request submitted successfully! Waiting for vehicle assignment.");
      setFormData({
        destination: "",
        purpose: "",
        expected_time: "",
      });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Trip Request</CardTitle>
        <CardDescription>Submit a request for your marketing trip. Vehicle will be assigned by manager.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Vehicle will be assigned by the Vehicle Manager based on availability.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              placeholder="Enter destination"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Describe the purpose of your trip"
              required
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_time">Expected Time</Label>
            <Input
              id="expected_time"
              type="datetime-local"
              value={formData.expected_time}
              onChange={(e) => setFormData({ ...formData, expected_time: e.target.value })}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!loading && <Send className="mr-2 h-4 w-4" />}
            Submit Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TripRequestForm;
