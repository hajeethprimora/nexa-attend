import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceRecord, AttendanceSummary, MonthlyReportRow, User } from '../types';
import { formatTime } from './dates';

const BRAND: [number, number, number] = [79, 70, 229];

const header = (doc: jsPDF, title: string, lines: string[]) => {
  doc.setFontSize(18);
  doc.setTextColor(...BRAND);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  lines.forEach((line, i) => doc.text(line, 14, 28 + i * 6));
};

export const exportMonthlyTimesheetPDF = (
  user: User,
  month: string,
  records: AttendanceRecord[],
  summary: AttendanceSummary | null,
  timeZone?: string
) => {
  const doc = new jsPDF();

  header(doc, 'SOFTNIX - Monthly Attendance Timesheet', [
    `Employee: ${user.full_name} (${user.employee_id})`,
    `Department: ${user.department} | Period: ${month}${timeZone ? ` | Times in ${timeZone}` : ''}`,
    `Generated: ${new Date().toLocaleString()}`
  ]);

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 46, 182, 18, 3, 3, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`Days: ${summary?.days_worked || 0} (Office ${summary?.office_days || 0} / WFH ${summary?.remote_days || 0})`, 18, 57);
  doc.text(`Hours: ${summary?.total_hours || 0}`, 95, 57);
  doc.text(`Overtime: ${summary?.total_overtime_hours || 0}`, 128, 57);
  doc.text(`Late days: ${summary?.late_days || 0}`, 165, 57);
  doc.setFont('helvetica', 'normal');

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date) || a.clock_in.localeCompare(b.clock_in));
  autoTable(doc, {
    startY: 70,
    head: [['Date', 'Mode', 'Clock In', 'Clock Out', 'Hours', 'Overtime', 'Late', 'Notes']],
    body: sorted.map((r) => [
      r.date,
      r.work_mode === 'remote' ? 'WFH' : 'Office',
      formatTime(r.clock_in, timeZone),
      r.clock_out ? formatTime(r.clock_out, timeZone) : 'Open',
      Number(r.total_hours || 0).toFixed(2),
      Number(r.overtime_hours || 0).toFixed(2),
      r.late_minutes ? `${r.late_minutes}m` : '-',
      [r.auto_closed ? 'Missed clock-out' : '', r.edited_at ? 'Edited by admin' : ''].filter(Boolean).join(', ')
    ]),
    theme: 'grid',
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 8 }
  });

  doc.save(`Softnix_Timesheet_${user.employee_id}_${month}.pdf`);
};

export const exportAdminSummaryPDF = (
  month: string,
  reportData: MonthlyReportRow[],
  workingDays?: number
) => {
  const doc = new jsPDF({ orientation: 'landscape' });

  header(doc, 'SOFTNIX - Monthly Attendance Report', [
    `Period: ${month} | Employees: ${reportData.length}${workingDays !== undefined ? ` | Working days in month: ${workingDays}` : ''}`,
    `Generated: ${new Date().toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 42,
    head: [['Emp ID', 'Name', 'Department', 'Present', 'Office', 'WFH', 'Hours', 'Overtime', 'Late Days', 'Leave', 'Absent', 'Missed Out']],
    body: reportData.map((row) => [
      row.employee_id,
      row.full_name,
      row.department,
      row.total_days_worked,
      row.office_days,
      row.remote_days,
      Number(row.total_hours_worked || 0).toFixed(1),
      Number(row.total_overtime_hours || 0).toFixed(1),
      row.late_days,
      row.leaves_taken,
      row.absent_days,
      row.missed_clock_outs
    ]),
    theme: 'striped',
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8 }
  });

  doc.save(`Softnix_Attendance_Report_${month}.pdf`);
};
