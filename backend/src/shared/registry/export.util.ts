import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { ReportDataResult, ReportDefinition, ReportFilterParams } from './types';

/**
 * Generate Excel buffer for report data
 */
export async function generateExcelReport(
  report: ReportDefinition,
  data: ReportDataResult,
  filters?: ReportFilterParams
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Qynova ERP';
  workbook.created = new Date();

  const sheetName = (data.title || report.title).replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 31) || 'Report';
  const worksheet = workbook.addWorksheet(sheetName);

  // Set columns
  worksheet.columns = report.columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || Math.max(col.header.length + 5, 14),
  }));

  // Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate 800
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;

  // Add Data Rows
  for (const row of data.rows) {
    const formattedRow: Record<string, any> = {};
    for (const col of report.columns) {
      let val = row[col.key];
      if (val === undefined || val === null) {
        formattedRow[col.key] = '-';
      } else if (col.format === 'currency' && typeof val === 'number') {
        formattedRow[col.key] = val;
      } else if (col.format === 'date' && val instanceof Date) {
        formattedRow[col.key] = val.toISOString().split('T')[0];
      } else {
        formattedRow[col.key] = val;
      }
    }
    const addedRow = worksheet.addRow(formattedRow);
    addedRow.alignment = { vertical: 'middle' };
  }

  // Summary Row if available
  if (data.summary && Object.keys(data.summary).length > 0) {
    worksheet.addRow({});
    const summaryRowData: Record<string, any> = {};
    for (const col of report.columns) {
      if (data.summary[col.key] !== undefined) {
        summaryRowData[col.key] = data.summary[col.key];
      }
    }
    const sumRow = worksheet.addRow(summaryRowData);
    sumRow.font = { bold: true };
    sumRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generate PDF buffer for report data
 */
export async function generatePdfReport(
  report: ReportDefinition,
  data: ReportDataResult,
  filters?: ReportFilterParams
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const isWide = report.columns.length > 5;
      const doc = new PDFDocument({
        layout: isWide ? 'landscape' : 'portrait',
        size: 'A4',
        margin: 36,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = isWide ? 841.89 : 595.28;
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;

      // Header Brand
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#0F172A').text('QYNOVA ERP', margin, margin);
      doc.fontSize(12).font('Helvetica').fillColor('#475569').text(data.title || report.title, { underline: false });

      // Meta info
      const filterTexts: string[] = [];
      if (filters?.from) filterTexts.push(`From: ${filters.from}`);
      if (filters?.to) filterTexts.push(`To: ${filters.to}`);
      if (filters?.department) filterTexts.push(`Dept ID: ${filters.department}`);
      filterTexts.push(`Generated: ${new Date().toISOString().split('T')[0]}`);

      doc.fontSize(9).font('Helvetica').fillColor('#64748B').text(filterTexts.join('  |  '));
      doc.moveDown(1);

      // Table Setup
      const startX = margin;
      let startY = doc.y;
      const totalColWidthRatio = report.columns.reduce((acc, c) => acc + (c.width || 15), 0);
      const colWidths = report.columns.map((c) => ((c.width || 15) / totalColWidthRatio) * contentWidth);

      const renderHeader = () => {
        doc.rect(startX, startY, contentWidth, 20).fill('#1E293B');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
        let curX = startX;
        for (let i = 0; i < report.columns.length; i++) {
          const col = report.columns[i];
          const w = colWidths[i];
          doc.text(col.header, curX + 4, startY + 5, { width: w - 8, align: col.align || 'left', lineBreak: false });
          curX += w;
        }
        startY += 20;
      };

      renderHeader();

      // Rows
      doc.font('Helvetica').fontSize(8);
      for (let rIdx = 0; rIdx < data.rows.length; rIdx++) {
        // Page break check
        if (startY > (isWide ? 530 : 770)) {
          doc.addPage();
          startY = margin;
          renderHeader();
        }

        const row = data.rows[rIdx];
        if (rIdx % 2 === 1) {
          doc.rect(startX, startY, contentWidth, 18).fill('#F8FAFC');
        }

        let curX = startX;
        doc.fillColor('#0F172A');
        for (let i = 0; i < report.columns.length; i++) {
          const col = report.columns[i];
          const w = colWidths[i];
          let val = row[col.key];
          let textVal = '-';
          if (val !== undefined && val !== null) {
            textVal = String(val);
          }
          doc.text(textVal, curX + 4, startY + 4, {
            width: w - 8,
            align: col.align || 'left',
            lineBreak: false,
          });
          curX += w;
        }
        startY += 18;
      }

      // Summary row
      if (data.summary && Object.keys(data.summary).length > 0) {
        if (startY > (isWide ? 530 : 770)) {
          doc.addPage();
          startY = margin;
          renderHeader();
        }
        doc.rect(startX, startY, contentWidth, 20).fill('#EEF2FF');
        let curX = startX;
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#4338CA');
        for (let i = 0; i < report.columns.length; i++) {
          const col = report.columns[i];
          const w = colWidths[i];
          const sumVal = data.summary[col.key];
          if (sumVal !== undefined) {
            doc.text(String(sumVal), curX + 4, startY + 5, {
              width: w - 8,
              align: col.align || 'left',
              lineBreak: false,
            });
          }
          curX += w;
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
