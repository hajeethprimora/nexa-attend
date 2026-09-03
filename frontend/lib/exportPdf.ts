import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceRecord, MonthlyReportRow, User } from '../types';

export const exportMonthlyTimesheetPDF = (
  user: User,
  month: string,
  records: AttendanceRecord[],
  summary: { total_hours: number; total_overtime_hours?: number; total_late_minutes?: number; days_worked: number } | null
) => {
  const doc = new jsPDF();

  // Header Title
  doc.setFontSize(18);
  doc.setTextColor(79, 70, 229); // Primary Indigo
  doc.text('SOFTNIX - Monthly Attendance Timesheet', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Employee Name: ${user.full_name} (${user.employee_id})`, 14, 28);
  doc.text(`Department: ${user.department} | Period: ${month}`, 14, 34);
  doc.text(`Generated On: ${new Date().toLocaleDateString()} | Softnix Workforce Systems`, 14, 40);

  // Summary box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 46, 182, 18, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Days Worked: ${summary?.days_worked || 0}`, 20, 57);
  doc.text(`Total Hours: ${summary?.total_hours || 0} hrs`, 75, 57);
  doc.text(`Overtime: ${summary?.total_overtime_hours || 0} hrs`, 130, 57);

  // Table Data
  const tableData = records.map((r) => [
    r.date,
    r.clock_in ? new Date(r.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
    r.clock_out ? new Date(r.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Open',
    `${r.total_hours || 0} hrs`,
    `${r.overtime_hours || 0} hrs`,
    r.late_minutes ? `${r.late_minutes} min` : 'On Time'
  ]);

  autoTable(doc, {
    startY: 70,
    head: [['Date', 'Clock In', 'Clock Out', 'Worked Hours', 'Overtime', 'Late Arrival']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 9 }
  });

  doc.save(`Softnix_Timesheet_${user.employee_id}_${month}.pdf`);
};

export const exportAdminSummaryPDF = (
  month: string,
  reportData: MonthlyReportRow[]
) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(79, 70, 229);
  doc.text('SOFTNIX - Corporate Monthly Attendance Report', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Report Period: ${month} | Total Workforce: ${reportData.length}`, 14, 28);
  doc.text(`Generated On: ${new Date().toLocaleDateString()} | Softnix Workforce Systems`, 14, 34);

  const tableData = reportData.map((row) => [
    row.employee_id,
    row.full_name,
    row.department,
    `${row.total_days_worked} days`,
    `${row.leaves_taken} days`,
    `${row.total_hours_worked} hrs`,
    `${row.total_overtime_hours || 0} hrs`
  ]);

  autoTable(doc, {
    startY: 42,
    head: [['Emp ID', 'Full Name', 'Department', 'Days Worked', 'Leaves', 'Total Hours', 'Overtime']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9 }
  });

  doc.save(`Softnix_Executive_Report_${month}.pdf`);
};
