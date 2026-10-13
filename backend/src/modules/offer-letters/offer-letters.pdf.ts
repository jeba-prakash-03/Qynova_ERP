import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { OfferLetterSnapshot } from './offer-letters.types';

export interface GenerateOfferLetterPdfOptions {
  snapshot: OfferLetterSnapshot;
  outputPath: string;
}

export async function generateOfferLetterPdf(
  options: GenerateOfferLetterPdfOptions
): Promise<string> {
  const { snapshot, outputPath } = options;

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 50, left: 50, right: 50 },
      bufferPages: true,
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // ==========================================
    // 1. LETTERHEAD
    // ==========================================
    const startY = 40;
    let logoDrawn = false;

    if (snapshot.company_name) {
      // Check for logo
      const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'storage');
      // Look for company logo
      const possibleLogos = [
        path.join(uploadDir, 'branding', 'company_logo.png'),
        path.join(uploadDir, 'branding', 'logo.png'),
      ];

      for (const logoFile of possibleLogos) {
        if (fs.existsSync(logoFile)) {
          try {
            doc.image(logoFile, 50, startY, { fit: [100, 45] });
            logoDrawn = true;
            break;
          } catch {
            // Ignore image format error and continue
          }
        }
      }
    }

    const headerLeft = logoDrawn ? 165 : 50;
    const headerWidth = doc.page.width - 50 - headerLeft;

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#0F172A')
      .text(snapshot.company_name || 'QYNOVA TECHNOLOGIES', headerLeft, startY, {
        width: headerWidth,
        align: logoDrawn ? 'right' : 'center',
      });

    const addressLine = snapshot.company_address || 'India';
    const contactLine = [
      snapshot.company_email ? `Email: ${snapshot.company_email}` : '',
      snapshot.company_phone ? `Phone: ${snapshot.company_phone}` : '',
      snapshot.company_website ? `Web: ${snapshot.company_website}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    doc
      .fontSize(8.5)
      .font('Helvetica')
      .fillColor('#64748B')
      .text(addressLine, headerLeft, doc.y + 2, {
        width: headerWidth,
        align: logoDrawn ? 'right' : 'center',
      });

    if (contactLine) {
      doc.text(contactLine, headerLeft, doc.y + 1, {
        width: headerWidth,
        align: logoDrawn ? 'right' : 'center',
      });
    }

    doc.moveDown(1.5);

    // Divider Line
    const dividerY = Math.max(doc.y, 95);
    doc
      .strokeColor('#2563EB')
      .lineWidth(2)
      .moveTo(50, dividerY)
      .lineTo(doc.page.width - 50, dividerY)
      .stroke();

    doc.y = dividerY + 15;

    // ==========================================
    // 2. REFERENCE AND DATE
    // ==========================================
    const metaY = doc.y;
    doc
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .fillColor('#1E293B')
      .text(`Reference No: ${snapshot.reference_no}`, 50, metaY);

    doc
      .fontSize(9.5)
      .font('Helvetica')
      .fillColor('#475569')
      .text(`Date: ${snapshot.letter_date}`, 50, metaY, {
        align: 'right',
        width: doc.page.width - 100,
      });

    doc.moveDown(1.2);

    // ==========================================
    // 3. CANDIDATE ADDRESS BLOCK
    // ==========================================
    doc
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .fillColor('#0F172A')
      .text('To,');

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#0F172A')
      .text(snapshot.employee_name);

    if (snapshot.employee_address) {
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#334155')
        .text(snapshot.employee_address, { width: 300 });
    }

    if (snapshot.employee_email) {
      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('#64748B')
        .text(`Email: ${snapshot.employee_email}`);
    }

    doc.moveDown(1.2);

    // Subject
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#1E3A8A')
      .text(`Subject: Offer of Employment - ${snapshot.designation}`);

    doc.moveDown(0.8);

    // ==========================================
    // 4. BODY CONTENT (Parsed HTML/Blocks)
    // ==========================================
    renderHtmlContent(doc, snapshot);

    // ==========================================
    // 5. SIGNATURE BLOCK
    // ==========================================
    checkPageSpace(doc, 130);

    doc.moveDown(1.5);
    doc
      .fontSize(9.5)
      .font('Helvetica')
      .fillColor('#334155')
      .text('Sincerely,');

    doc.moveDown(0.5);

    // Check for signature image
    let sigDrawn = false;
    if (snapshot.signature_image_path && fs.existsSync(snapshot.signature_image_path)) {
      try {
        doc.image(snapshot.signature_image_path, 50, doc.y, { fit: [140, 45] });
        doc.y += 50;
        sigDrawn = true;
      } catch {
        // Fallback to text
      }
    }

    if (!sigDrawn) {
      doc.moveDown(2);
    }

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#0F172A')
      .text(snapshot.signatory_name || 'Authorized Signatory');

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#64748B')
      .text(snapshot.signatory_designation || 'Human Resources');

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#1E293B')
      .text(snapshot.company_name || 'Qynova Technologies');

    // ==========================================
    // 6. PAGE NUMBERS & FOOTER
    // ==========================================
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);

      // Footer divider
      const footerLineY = doc.page.height - 45;
      doc
        .strokeColor('#E2E8F0')
        .lineWidth(0.5)
        .moveTo(50, footerLineY)
        .lineTo(doc.page.width - 50, footerLineY)
        .stroke();

      // Page numbers
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#64748B')
        .text(
          `Page ${i + 1} of ${range.count}`,
          50,
          doc.page.height - 35,
          { align: 'right', width: doc.page.width - 100 }
        );

      // Payslip/Letterhead Footer Text
      const footerMsg =
        snapshot.payslip_footer_text ||
        'This document is strictly confidential and intended solely for the recipient.';
      doc
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor('#94A3B8')
        .text(footerMsg, 50, doc.page.height - 35, {
          align: 'left',
          width: doc.page.width - 160,
        });
    }

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', (err) => reject(err));
  });
}

function checkPageSpace(doc: PDFKit.PDFDocument, requiredHeight: number): void {
  if (doc.y + requiredHeight > doc.page.height - 55) {
    doc.addPage();
  }
}

function renderHtmlContent(doc: PDFKit.PDFDocument, snapshot: OfferLetterSnapshot): void {
  const html = snapshot.rendered_html || '';

  // Extract paragraphs, headings, and table markers
  // We clean up basic HTML tags
  const tokens = html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .split(/(<h[1-6][^>]*>.*?<\/h[1-6]>|<table[^>]*>.*?<\/table>|<p[^>]*>.*?<\/p>|<ul[^>]*>.*?<\/ul>)/gis)
    .filter((t) => t.trim().length > 0);

  for (const token of tokens) {
    const trimmed = token.trim();

    if (/^<h[1-6]/i.test(trimmed)) {
      checkPageSpace(doc, 30);
      const headingText = stripHtml(trimmed);
      doc.moveDown(0.6);
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#1E293B')
        .text(headingText);
      doc.moveDown(0.3);
    } else if (/^<table/i.test(trimmed) || trimmed.includes('salary_breakup_table')) {
      // Render clean salary breakup table
      renderSalaryBreakupTable(doc, snapshot);
    } else if (/^<ul/i.test(trimmed)) {
      const listItems = trimmed.match(/<li[^>]*>(.*?)<\/li>/gis) || [];
      for (const li of listItems) {
        checkPageSpace(doc, 20);
        const text = stripHtml(li);
        doc
          .fontSize(9.5)
          .font('Helvetica')
          .fillColor('#334155')
          .text(`  •  ${text}`, { lineGap: 2 });
      }
      doc.moveDown(0.4);
    } else {
      // Paragraph or text
      const clean = stripHtml(trimmed);
      if (clean.length > 0) {
        checkPageSpace(doc, 25);
        doc
          .fontSize(9.5)
          .font('Helvetica')
          .fillColor('#334155')
          .text(clean, {
            align: 'justify',
            lineGap: 3,
          });
        doc.moveDown(0.5);
      }
    }
  }
}

function renderSalaryBreakupTable(doc: PDFKit.PDFDocument, snapshot: OfferLetterSnapshot): void {
  checkPageSpace(doc, 140);
  doc.moveDown(0.5);

  const startX = 50;
  const tableWidth = doc.page.width - 100;
  const colWidths = [tableWidth * 0.46, tableWidth * 0.27, tableWidth * 0.27];

  const sb = snapshot.salary_breakup;
  const formatInr = (n: number) =>
    `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const rows = [
    { component: 'Basic Salary (50%)', monthly: formatInr(sb.basic), annual: formatInr(sb.basic * 12) },
    { component: 'House Rent Allowance (HRA - 20%)', monthly: formatInr(sb.hra), annual: formatInr(sb.hra * 12) },
    {
      component: 'Special Allowance',
      monthly: formatInr(sb.special_allowance),
      annual: formatInr(sb.special_allowance * 12),
    },
  ];

  if (sb.pf && sb.pf > 0) {
    rows.push({
      component: 'Provident Fund (PF Employer Contribution)',
      monthly: formatInr(sb.pf),
      annual: formatInr(sb.pf * 12),
    });
  }

  const totals = {
    component: 'Total Cost to Company (CTC)',
    monthly: formatInr(sb.gross),
    annual: formatInr(sb.annual_ctc),
  };

  let currentY = doc.y;

  // Header row
  doc.rect(startX, currentY, tableWidth, 22).fill('#F1F5F9');
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#0F172A')
    .text('Salary Component', startX + 8, currentY + 6, { width: colWidths[0] - 16 })
    .text('Monthly (INR)', startX + colWidths[0] + 8, currentY + 6, {
      width: colWidths[1] - 16,
      align: 'right',
    })
    .text('Annual (INR)', startX + colWidths[0] + colWidths[1] + 8, currentY + 6, {
      width: colWidths[2] - 16,
      align: 'right',
    });

  currentY += 22;

  // Data rows
  doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
  for (const r of rows) {
    doc.rect(startX, currentY, tableWidth, 19).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
    doc
      .text(r.component, startX + 8, currentY + 5, { width: colWidths[0] - 16 })
      .text(r.monthly, startX + colWidths[0] + 8, currentY + 5, {
        width: colWidths[1] - 16,
        align: 'right',
      })
      .text(r.annual, startX + colWidths[0] + colWidths[1] + 8, currentY + 5, {
        width: colWidths[2] - 16,
        align: 'right',
      });
    currentY += 19;
  }

  // Total row
  doc.rect(startX, currentY, tableWidth, 22).fillAndStroke('#F8FAFC', '#CBD5E1');
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#0F172A')
    .text(totals.component, startX + 8, currentY + 6, { width: colWidths[0] - 16 })
    .text(totals.monthly, startX + colWidths[0] + 8, currentY + 6, {
      width: colWidths[1] - 16,
      align: 'right',
    })
    .text(totals.annual, startX + colWidths[0] + colWidths[1] + 8, currentY + 6, {
      width: colWidths[2] - 16,
      align: 'right',
    });

  currentY += 26;
  doc.y = currentY;
  doc.moveDown(0.6);
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
