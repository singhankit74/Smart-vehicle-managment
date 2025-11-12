import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileSpreadsheet, Download, Loader2, Calendar, TrendingUp } from "lucide-react";
import {
  exportWeeklyReportToExcel,
  exportVehicleWeeklyReport,
  exportEmployeeWeeklyReport,
  getAvailableWeeks,
  getWeekRange,
  type TripReportData,
} from "@/utils/reportGenerator";
import { format } from "date-fns";

const WeeklyReports = () => {
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [reportType, setReportType] = useState<'all' | 'vehicle' | 'employee'>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalTrips: 0,
    completedTrips: 0,
    totalDistance: 0,
  });

  const availableWeeks = getAvailableWeeks(12);

  useEffect(() => {
    fetchVehiclesAndEmployees();
    fetchWeekStats();
  }, [selectedWeek]);

  const fetchVehiclesAndEmployees = async () => {
    try {
      // Fetch vehicles
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, name')
        .order('name');

      // Fetch employees
      const { data: employeesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      setVehicles(vehiclesData || []);
      setEmployees(employeesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchWeekStats = async () => {
    try {
      const { start, end } = getWeekRange(selectedWeek);

      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString());

      if (trips) {
        const completed = trips.filter(t => t.status === 'completed').length;
        const totalDist = trips.reduce((sum, t) => sum + (t.distance || 0), 0);

        setStats({
          totalTrips: trips.length,
          completedTrips: completed,
          totalDistance: totalDist,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTripData = async (): Promise<TripReportData[]> => {
    const { start, end } = getWeekRange(selectedWeek);

    const { data: trips, error } = await supabase
      .from('trips')
      .select(`
        id,
        start_time,
        end_time,
        distance,
        status,
        start_reading,
        end_reading,
        created_at,
        vehicle:vehicles(name, number_plate),
        employee:profiles!trips_employee_id_fkey(full_name, email),
        request:trip_requests(
          purpose, 
          destination, 
          approval_status,
          approved_by,
          approved_at,
          rejection_reason
        )
      `)
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString())
      .order('start_time', { ascending: false });

    if (error) throw error;

    return (trips || []).map((trip: any) => ({
      id: trip.id,
      vehicle_name: trip.vehicle?.name || 'Not Assigned',
      vehicle_number_plate: trip.vehicle?.number_plate || '-',
      employee_name: trip.employee?.full_name || 'Unknown',
      employee_email: trip.employee?.email || '-',
      purpose: trip.request?.purpose || '-',
      destination: trip.request?.destination || '-',
      start_time: trip.start_time,
      end_time: trip.end_time,
      distance: trip.distance,
      status: trip.status,
      approval_status: trip.request?.approval_status || 'pending',
      start_reading: trip.start_reading,
      end_reading: trip.end_reading,
      start_location: null,
      end_location: null,
      approved_by: trip.request?.approved_by || null,
      approved_at: trip.request?.approved_at || null,
      rejection_reason: trip.request?.rejection_reason || null,
      created_at: trip.created_at,
    }));
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const trips = await fetchTripData();

      if (trips.length === 0) {
        toast.info('No trips found for the selected period');
        return;
      }

      const { start, end } = getWeekRange(selectedWeek);
      let filename = '';

      switch (reportType) {
        case 'vehicle':
          if (!selectedVehicle) {
            toast.error('Please select a vehicle');
            return;
          }
          const vehicleName = vehicles.find(v => v.id === selectedVehicle)?.name || '';
          filename = exportVehicleWeeklyReport(trips, vehicleName, start, end);
          break;

        case 'employee':
          if (!selectedEmployee) {
            toast.error('Please select an employee');
            return;
          }
          const employeeName = employees.find(e => e.id === selectedEmployee)?.full_name || '';
          filename = exportEmployeeWeeklyReport(trips, employeeName, start, end);
          break;

        default:
          filename = exportWeeklyReportToExcel(trips, start, end);
      }

      toast.success(`Report generated successfully: ${filename}`);
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const selectedWeekInfo = availableWeeks.find(w => w.value === selectedWeek);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrips}</div>
            <p className="text-xs text-muted-foreground">
              {selectedWeekInfo?.label}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTrips}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTrips > 0 
                ? `${((stats.completedTrips / stats.totalTrips) * 100).toFixed(0)}% completion rate`
                : 'No trips yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDistance.toFixed(1)} km</div>
            <p className="text-xs text-muted-foreground">
              Across all trips
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Generation Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <CardTitle>Generate Weekly Report</CardTitle>
          </div>
          <CardDescription>
            Export trip data to Excel format. Reports are generated on-demand and not stored in the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Week Selection */}
          <div className="space-y-2">
            <Label htmlFor="week">Select Week</Label>
            <Select
              value={selectedWeek.toString()}
              onValueChange={(value) => setSelectedWeek(parseInt(value))}
            >
              <SelectTrigger id="week">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {availableWeeks.map((week) => (
                  <SelectItem key={week.value} value={week.value.toString()}>
                    {week.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Report Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type</Label>
            <Select
              value={reportType}
              onValueChange={(value: any) => {
                setReportType(value);
                setSelectedVehicle('');
                setSelectedEmployee('');
              }}
            >
              <SelectTrigger id="reportType">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trips</SelectItem>
                <SelectItem value="vehicle">By Vehicle</SelectItem>
                <SelectItem value="employee">By Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vehicle Selection (conditional) */}
          {reportType === 'vehicle' && (
            <div className="space-y-2">
              <Label htmlFor="vehicle">Select Vehicle</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger id="vehicle">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Employee Selection (conditional) */}
          {reportType === 'employee' && (
            <div className="space-y-2">
              <Label htmlFor="employee">Select Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerateReport}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate & Download Excel Report
              </>
            )}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Report will be downloaded automatically as an Excel (.xlsx) file
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyReports;
