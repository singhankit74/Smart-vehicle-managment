import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, Square, Upload, Loader2, Camera, CheckCircle } from "lucide-react";
import { compressImage, calculateStorageSavings } from "@/utils/imageCompression";

interface Props {
  requestId: string;
  userId: string;
  onUpdate: () => void;
}

interface Trip {
  id: string;
  status: string;
  start_meter_photo: string | null;
  end_meter_photo: string | null;
  start_reading: number | null;
  end_reading: number | null;
  distance: number | null;
}

const TripTracker = ({ requestId, userId, onUpdate }: Props) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(false);
  const [startReading, setStartReading] = useState("");
  const [endReading, setEndReading] = useState("");
  const [startPhoto, setStartPhoto] = useState<File | null>(null);
  const [endPhoto, setEndPhoto] = useState<File | null>(null);

  useEffect(() => {
    loadTrip();
  }, [requestId]);

  const loadTrip = async () => {
    const { data } = await supabase
      .from("trips")
      .select("*")
      .eq("request_id", requestId)
      .single();

    if (data) setTrip(data);
  };

  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => reject(error)
      );
    });
  };

  const uploadPhoto = async (file: File, path: string) => {
    try {
      // Get original file size
      const originalSize = file.size;
      
      // Compress the image before uploading (silently)
      const compressedFile = await compressImage(file);
      
      // Calculate savings for logging only
      const savings = calculateStorageSavings(originalSize, compressedFile.size);
      console.log(`Image compressed: ${savings.originalSizeMB}MB → ${savings.compressedSizeKB}KB (${savings.savingsPercentage}% saved)`);
      
      // Upload compressed image
      const { data, error } = await supabase.storage
        .from("meter-photos")
        .upload(`${userId}/${path}`, compressedFile, {
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from("meter-photos")
        .getPublicUrl(data.path);
      
      // No toast notification - keep it clean
      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      throw new Error(error.message || "Failed to upload photo");
    }
  };

  const handleStartTrip = async () => {
    if (!startPhoto || !startReading) {
      toast.error("Please upload meter photo and enter reading");
      return;
    }

    setLoading(true);
    try {
      const location = await getLocation();
      const photoUrl = await uploadPhoto(startPhoto, `start-${requestId}-${Date.now()}.jpg`);

      const { data } = await supabase
        .from("trips")
        .insert({
          request_id: requestId,
          employee_id: userId,
          vehicle_id: (await supabase.from("trip_requests").select("vehicle_id").eq("id", requestId).single()).data?.vehicle_id,
          status: "active",
          start_time: new Date().toISOString(),
          start_meter_photo: photoUrl,
          start_reading: parseFloat(startReading),
          start_location_lat: location.lat,
          start_location_lng: location.lng,
        })
        .select()
        .single();

      if (data) {
        setTrip(data);
        toast.success("Trip started successfully!");
        onUpdate();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start trip");
    } finally {
      setLoading(false);
    }
  };

  const handleEndTrip = async () => {
    if (!endPhoto || !endReading || !trip) {
      toast.error("Please upload meter photo and enter reading");
      return;
    }

    setLoading(true);
    try {
      const location = await getLocation();
      const photoUrl = await uploadPhoto(endPhoto, `end-${requestId}-${Date.now()}.jpg`);
      const distance = parseFloat(endReading) - (trip.start_reading || 0);

      // Get vehicle ID to update status
      const { data: requestData } = await supabase
        .from("trip_requests")
        .select("vehicle_id")
        .eq("id", requestId)
        .single();

      // Update trip as completed
      await supabase
        .from("trips")
        .update({
          status: "completed",
          end_time: new Date().toISOString(),
          end_meter_photo: photoUrl,
          end_reading: parseFloat(endReading),
          end_location_lat: location.lat,
          end_location_lng: location.lng,
          distance,
        })
        .eq("id", trip.id);

      // Return vehicle to available status
      if (requestData?.vehicle_id) {
        await supabase
          .from("vehicles")
          .update({ status: "available" })
          .eq("id", requestData.vehicle_id);
      }

      toast.success(`Trip completed! Distance: ${distance.toFixed(2)} km`);
      
      // Auto-refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || "Failed to end trip");
    } finally {
      setLoading(false);
    }
  };

  if (!trip || trip.status === "completed") {
    return (
      <Card className="p-4 bg-success/10 border-success/20">
        {!trip ? (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Play className="h-5 w-5 text-success" />
              Start Your Trip
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="start-reading">Odometer Reading (km)</Label>
                <Input
                  id="start-reading"
                  type="number"
                  step="0.01"
                  value={startReading}
                  onChange={(e) => setStartReading(e.target.value)}
                  placeholder="Enter current reading"
                />
              </div>
              <div>
                <Label htmlFor="start-photo">Upload Meter Photo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="start-photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setStartPhoto(e.target.files?.[0] || null)}
                  />
                  <Camera className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <Button
                onClick={handleStartTrip}
                disabled={loading || !startPhoto || !startReading}
                className="w-full bg-success hover:bg-success/90"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Start Trip
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-success font-medium flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Trip Completed - Distance: {trip.distance} km
          </p>
        )}
      </Card>
    );
  }

  if (trip.status === "active") {
    return (
      <Card className="p-4 bg-warning/10 border-warning/20">
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Square className="h-5 w-5 text-warning" />
            End Your Trip
          </h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="end-reading">Odometer Reading (km)</Label>
              <Input
                id="end-reading"
                type="number"
                step="0.01"
                value={endReading}
                onChange={(e) => setEndReading(e.target.value)}
                placeholder="Enter final reading"
              />
            </div>
            <div>
              <Label htmlFor="end-photo">Upload Meter Photo</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="end-photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setEndPhoto(e.target.files?.[0] || null)}
                />
                <Camera className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <Button
              onClick={handleEndTrip}
              disabled={loading || !endPhoto || !endReading}
              className="w-full bg-warning hover:bg-warning/90"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Square className="mr-2 h-4 w-4" />
              )}
              End Trip
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return null;
};

export default TripTracker;
