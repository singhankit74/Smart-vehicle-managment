import * as XLSX from 'xlsx';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

export interface TripReportData {
  id: string;
  vehicle_name: string;
  vehicle_number_plate: string;
  employee_name: string;
  employee_email: string;
  purpose: string;
  destination: string;
  start_time: string;
  end_time: string | null;
  distance: number | null;
  status: string;
  approval_status: string;
  start_reading: number | null;
  end_reading: number | null;
  start_location: string | null;
  end_location: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface WeeklyReportSummary {
  weekStart: Date;
  weekEnd: Date;
  totalTrips: number;
  completedTrips: number;
  activeTrips: number;
  pendingTrips: number;
  approvedTrips: number;
  rejectedTrips: number;
  totalDistance: number;
  avgDistancePerTrip: number;
  totalVehicles: number;
  totalEmployees: number;
  avgTripsPerVehicle: number;
  avgTripsPerEmployee: number;
  trips: TripReportData[];
}

export interface VehicleUtilization {
  vehicleName: string;
  vehicleNumber: string;
  totalTrips: number;
  totalDistance: number;
  avgDistance: number;
  utilizationDays: number;
  utilizationPercentage: number;
}

export interface EmployeeActivity {
  employeeName: string;
  employeeEmail: string;
  totalTrips: number;
  completedTrips: number;
  totalDistance: number;
  avgDistancePerTrip: number;
}

/**
 * Get the start and end dates for a specific week
 */
export const getWeekRange = (weeksAgo: number = 0): { start: Date; end: Date } => {
  const today = new Date();
  const targetDate = subWeeks(today, weeksAgo);
  
  return {
    start: startOfWeek(targetDate, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(targetDate, { weekStartsOn: 1 }), // Sunday
  };
};

/**
 * Format trip data for Excel export - Simple format with essential fields only
 */
export const formatTripDataForExcel = (trips: TripReportData[]) => {
  return trips.map((trip, index) => {
    const startTime = trip.start_time ? new Date(trip.start_time) : null;
    
    return {
      'Sr. No.': index + 1,
      'Date': startTime ? format(startTime, 'dd MMM yyyy') : '-',
      'Employee Name': trip.employee_name,
      'Vehicle Number': trip.vehicle_number_plate || '-',
      'Start Meter': trip.start_reading ?? '-',
      'End Meter': trip.end_reading ?? '-',
      'Total Distance (km)': trip.distance ? trip.distance.toFixed(2) : '-',
      'Trip Purpose': trip.purpose,
      'Status': trip.status === 'completed' ? 'Completed' : trip.status === 'active' ? 'Active' : 'Pending',
    };
  });
};

/**
 * Generate comprehensive summary statistics for the report
 */
export const generateSummary = (trips: TripReportData[], weekStart: Date, weekEnd: Date): WeeklyReportSummary => {
  const completedTrips = trips.filter(t => t.status === 'completed').length;
  const activeTrips = trips.filter(t => t.status === 'active').length;
  const pendingTrips = trips.filter(t => t.approval_status === 'pending').length;
  const approvedTrips = trips.filter(t => t.approval_status === 'approved').length;
  const rejectedTrips = trips.filter(t => t.approval_status === 'rejected').length;
  const totalDistance = trips.reduce((sum, t) => sum + (t.distance || 0), 0);
  const avgDistancePerTrip = trips.length > 0 ? totalDistance / trips.length : 0;
  
  const uniqueVehicles = new Set(trips.map(t => t.vehicle_name).filter(Boolean));
  const uniqueEmployees = new Set(trips.map(t => t.employee_name));
  
  const totalVehicles = uniqueVehicles.size;
  const totalEmployees = uniqueEmployees.size;
  const avgTripsPerVehicle = totalVehicles > 0 ? trips.length / totalVehicles : 0;
  const avgTripsPerEmployee = totalEmployees > 0 ? trips.length / totalEmployees : 0;

  return {
    weekStart,
    weekEnd,
    totalTrips: trips.length,
    completedTrips,
    activeTrips,
    pendingTrips,
    approvedTrips,
    rejectedTrips,
    totalDistance,
    avgDistancePerTrip,
    totalVehicles,
    totalEmployees,
    avgTripsPerVehicle,
    avgTripsPerEmployee,
    trips,
  };
};

/**
 * Calculate vehicle utilization metrics
 */
export const calculateVehicleUtilization = (trips: TripReportData[], weekStart: Date, weekEnd: Date): VehicleUtilization[] => {
  const vehicleMap = new Map<string, TripReportData[]>();
  
  trips.forEach(trip => {
    if (trip.vehicle_name) {
      const key = trip.vehicle_name;
      if (!vehicleMap.has(key)) {
        vehicleMap.set(key, []);
      }
      vehicleMap.get(key)!.push(trip);
    }
  });
  
  const totalDaysInWeek = 7;
  const utilization: VehicleUtilization[] = [];
  
  vehicleMap.forEach((vehicleTrips, vehicleName) => {
    const totalTrips = vehicleTrips.length;
    const totalDistance = vehicleTrips.reduce((sum, t) => sum + (t.distance || 0), 0);
    const avgDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;
    
    // Count unique days with trips
    const uniqueDays = new Set(
      vehicleTrips
        .filter(t => t.start_time)
        .map(t => format(new Date(t.start_time), 'yyyy-MM-dd'))
    ).size;
    
    const utilizationPercentage = (uniqueDays / totalDaysInWeek) * 100;
    
    utilization.push({
      vehicleName,
      vehicleNumber: vehicleTrips[0].vehicle_number_plate || '-',
      totalTrips,
      totalDistance,
      avgDistance,
      utilizationDays: uniqueDays,
      utilizationPercentage,
    });
  });
  
  return utilization.sort((a, b) => b.totalTrips - a.totalTrips);
};

/**
 * Calculate employee activity metrics
 */
export const calculateEmployeeActivity = (trips: TripReportData[]): EmployeeActivity[] => {
  const employeeMap = new Map<string, TripReportData[]>();
  
  trips.forEach(trip => {
    const key = trip.employee_name;
    if (!employeeMap.has(key)) {
      employeeMap.set(key, []);
    }
    employeeMap.get(key)!.push(trip);
  });
  
  const activity: EmployeeActivity[] = [];
  
  employeeMap.forEach((employeeTrips, employeeName) => {
    const totalTrips = employeeTrips.length;
    const completedTrips = employeeTrips.filter(t => t.status === 'completed').length;
    const totalDistance = employeeTrips.reduce((sum, t) => sum + (t.distance || 0), 0);
    const avgDistancePerTrip = totalTrips > 0 ? totalDistance / totalTrips : 0;
    
    activity.push({
      employeeName,
      employeeEmail: employeeTrips[0].employee_email,
      totalTrips,
      completedTrips,
      totalDistance,
      avgDistancePerTrip,
    });
  });
  
  return activity.sort((a, b) => b.totalTrips - a.totalTrips);
};

/**
 * Export weekly report to Excel file
 */
export const exportWeeklyReportToExcel = (
  trips: TripReportData[],
  weekStart: Date,
  weekEnd: Date,
  reportType: 'all' | 'vehicle' | 'employee' = 'all',
  filterName?: string
) => {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Format trip data with only essential fields
  const formattedData = formatTripDataForExcel(trips);

  // Create simple header with report info
  const headerData = [
    ['Weekly Vehicle Report'],
    ['Report Period:', `${format(weekStart, 'dd MMM yyyy')} - ${format(weekEnd, 'dd MMM yyyy')}`],
    ['Generated On:', format(new Date(), 'dd MMM yyyy HH:mm')],
    ['Total Trips:', trips.length.toString()],
    [''], // Empty row before data
  ];

  if (reportType !== 'all' && filterName) {
    headerData.splice(3, 0, [
      reportType === 'vehicle' ? 'Vehicle:' : 'Employee:',
      filterName
    ]);
  }

  // Create worksheet with header
  const ws = XLSX.utils.aoa_to_sheet(headerData);
  
  // Append trip data below header
  XLSX.utils.sheet_add_json(ws, formattedData, { 
    origin: -1, // Append after existing data
    skipHeader: false 
  });

  // Set column widths for better readability
  ws['!cols'] = [
    { wch: 8 },   // Sr. No.
    { wch: 14 },  // Date
    { wch: 22 },  // Employee Name
    { wch: 16 },  // Vehicle Number
    { wch: 14 },  // Start Meter
    { wch: 14 },  // End Meter
    { wch: 18 },  // Total Distance
    { wch: 35 },  // Trip Purpose
    { wch: 12 },  // Status
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Weekly Report');

  // Generate filename
  const dateStr = format(weekStart, 'yyyy-MM-dd');
  const filterStr = filterName ? `_${filterName.replace(/\s+/g, '_')}` : '';
  const filename = `Trip_Report_${dateStr}${filterStr}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);

  return filename;
};

/**
 * Export vehicle-specific weekly report
 */
export const exportVehicleWeeklyReport = (
  trips: TripReportData[],
  vehicleName: string,
  weekStart: Date,
  weekEnd: Date
) => {
  const vehicleTrips = trips.filter(t => t.vehicle_name === vehicleName);
  return exportWeeklyReportToExcel(vehicleTrips, weekStart, weekEnd, 'vehicle', vehicleName);
};

/**
 * Export employee-specific weekly report
 */
export const exportEmployeeWeeklyReport = (
  trips: TripReportData[],
  employeeName: string,
  weekStart: Date,
  weekEnd: Date
) => {
  const employeeTrips = trips.filter(t => t.employee_name === employeeName);
  return exportWeeklyReportToExcel(employeeTrips, weekStart, weekEnd, 'employee', employeeName);
};

/**
 * Get available weeks for report generation (last 12 weeks)
 */
export const getAvailableWeeks = (count: number = 12) => {
  const weeks = [];
  for (let i = 0; i < count; i++) {
    const { start, end } = getWeekRange(i);
    weeks.push({
      value: i,
      label: `${format(start, 'dd MMM')} - ${format(end, 'dd MMM yyyy')}`,
      start,
      end,
    });
  }
  return weeks;
};
