const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');

// Export attendance report to CSV
async function exportToCSV(data, filename) {
  try {
    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filepath = path.join(exportDir, filename);

    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'student_id', title: 'Student ID' },
        { id: 'student_name', title: 'Student Name' },
        { id: 'email', title: 'Email' },
        { id: 'course_code', title: 'Course Code' },
        { id: 'course_name', title: 'Course Name' },
        { id: 'total_sessions', title: 'Total Sessions' },
        { id: 'present_count', title: 'Present' },
        { id: 'late_count', title: 'Late' },
        { id: 'absent_count', title: 'Absent' },
        { id: 'attendance_percentage', title: 'Attendance %' },
      ],
    });

    await csvWriter.writeRecords(data);
    return { success: true, filepath };
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    return { success: false, error: error.message };
  }
}

// Export attendance report to PDF
async function exportToPDF(data, filename, reportTitle = 'Attendance Report') {
  return new Promise((resolve, reject) => {
    try {
      const exportDir = path.join(__dirname, '../../exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const filepath = path.join(exportDir, filename);
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20).text(reportTitle, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Table header
      const tableTop = 150;
      const itemHeight = 20;
      
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Student ID', 50, tableTop, { width: 70 });
      doc.text('Name', 120, tableTop, { width: 100 });
      doc.text('Course', 220, tableTop, { width: 80 });
      doc.text('Sessions', 300, tableTop, { width: 50 });
      doc.text('Present', 350, tableTop, { width: 50 });
      doc.text('Late', 400, tableTop, { width: 40 });
      doc.text('Absent', 440, tableTop, { width: 40 });
      doc.text('Att %', 480, tableTop, { width: 50 });

      // Draw line under header
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Table rows
      doc.font('Helvetica').fontSize(8);
      let y = tableTop + 25;

      data.forEach((record, index) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        doc.text(record.student_id || record.user_id || '-', 50, y, { width: 70 });
        doc.text(record.student_name || record.full_name || '-', 120, y, { width: 100 });
        doc.text(record.course_code || '-', 220, y, { width: 80 });
        doc.text(String(record.total_sessions || 0), 300, y, { width: 50 });
        doc.text(String(record.present_count || 0), 350, y, { width: 50 });
        doc.text(String(record.late_count || 0), 400, y, { width: 40 });
        doc.text(String(record.absent_count || 0), 440, y, { width: 40 });
        doc.text(String(record.attendance_percentage || 0) + '%', 480, y, { width: 50 });

        y += itemHeight;
      });

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(
          `Page ${i + 1} of ${pageCount}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );
      }

      doc.end();

      stream.on('finish', () => {
        resolve({ success: true, filepath });
      });

      stream.on('error', (error) => {
        reject({ success: false, error: error.message });
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      reject({ success: false, error: error.message });
    }
  });
}

// Export session attendance to CSV
async function exportSessionAttendanceCSV(data, filename) {
  try {
    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filepath = path.join(exportDir, filename);

    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'student_id', title: 'Student ID' },
        { id: 'student_name', title: 'Student Name' },
        { id: 'email', title: 'Email' },
        { id: 'scan_time', title: 'Scan Time' },
        { id: 'attendance_status', title: 'Status' },
        { id: 'gps_latitude', title: 'Latitude' },
        { id: 'gps_longitude', title: 'Longitude' },
        { id: 'is_within_geofence', title: 'Within Geofence' },
      ],
    });

    await csvWriter.writeRecords(data);
    return { success: true, filepath };
  } catch (error) {
    console.error('Error exporting session attendance to CSV:', error);
    return { success: false, error: error.message };
  }
}

// Export Excel format (CSV with .xlsx extension for compatibility)
async function exportToExcel(data, filename) {
  // For now, we'll use CSV format with .xlsx extension
  // For true Excel support, consider using 'exceljs' package
  const csvFilename = filename.replace('.xlsx', '.csv');
  return exportToCSV(data, csvFilename);
}

module.exports = {
  exportToCSV,
  exportToPDF,
  exportSessionAttendanceCSV,
  exportToExcel,
};
