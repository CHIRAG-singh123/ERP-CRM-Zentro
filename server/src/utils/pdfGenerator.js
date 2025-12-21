import PDFDocument from 'pdfkit';

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
};

/**
 * Generate PDF for invoice with professional design optimized for A4
 * @param {Object} invoice - Invoice document with populated fields
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generateInvoicePDF = async (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      // Validate invoice data
      if (!invoice) {
        return reject(new Error('Invoice data is required'));
      }

      if (!invoice.invoiceNumber) {
        return reject(new Error('Invoice number is required'));
      }

      // PDF setup optimized for A4 (595.28 x 841.89 points)
      const margin = 40; // Reduced margins for more content space
      const pageWidth = 595.28; // A4 width in points
      const pageHeight = 841.89; // A4 height in points
      const contentWidth = pageWidth - 2 * margin; // ~515 points usable width

      const doc = new PDFDocument({
        margin: margin,
        size: 'A4',
        bufferPages: true,
      });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        try {
          const pdfBuffer = Buffer.concat(buffers);
          if (!pdfBuffer || pdfBuffer.length === 0) {
            return reject(new Error('Generated PDF buffer is empty'));
          }
          resolve(pdfBuffer);
        } catch (error) {
          reject(new Error(`Failed to create PDF buffer: ${error.message}`));
        }
      });
      doc.on('error', (error) => {
        reject(new Error(`PDF generation error: ${error.message}`));
      });

      // Layout constants optimized for A4
      const sectionSpacing = 20;
      let currentY = margin;

      // ============================================
      // HEADER SECTION - Professional Design
      // ============================================
      const headerHeight = 95;
      const headerY = currentY;

      // Header background with gradient effect (subtle)
      doc.rect(margin, headerY, contentWidth, headerHeight)
        .fillColor('#F8F9FA')
        .fill();

      // Accent line at top
      doc.rect(margin, headerY, contentWidth, 4)
        .fillColor('#2563EB')
        .fill();

      // Left side - Invoice Title with better typography
      doc.fontSize(34)
        .font('Helvetica-Bold')
        .fillColor('#1E293B')
        .text('INVOICE', margin + 15, headerY + 28);

      // Right side - Invoice metadata in a clean box
      const metadataBoxX = margin + contentWidth - 230;
      const metadataBoxY = headerY + 18;
      const metadataBoxWidth = 210;
      const metadataBoxHeight = 62;

      // Metadata background
      doc.rect(metadataBoxX, metadataBoxY, metadataBoxWidth, metadataBoxHeight)
        .fillColor('#FFFFFF')
        .fill();

      // Metadata border
      doc.rect(metadataBoxX, metadataBoxY, metadataBoxWidth, metadataBoxHeight)
        .lineWidth(1)
        .strokeColor('#E2E8F0')
        .stroke();

      // Invoice Number
      let metaY = metadataBoxY + 10;
      doc.fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#64748B')
        .text('INVOICE #', metadataBoxX + 12, metaY);
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#1E293B')
        .text(invoice.invoiceNumber, metadataBoxX + 12, metaY + 13);

      // Date
      metaY += 30;
      if (invoice.createdAt) {
        doc.fontSize(9)
          .font('Helvetica')
          .fillColor('#64748B')
          .text('Date:', metadataBoxX + 12, metaY);
        doc.fontSize(10)
          .font('Helvetica')
          .fillColor('#334155')
          .text(
            new Date(invoice.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }),
            metadataBoxX + 12,
            metaY + 13,
            { width: 186 }
          );
      }

      // Header bottom border
      doc.moveTo(margin, headerY + headerHeight)
        .lineTo(margin + contentWidth, headerY + headerHeight)
        .lineWidth(1)
        .strokeColor('#E2E8F0')
        .stroke();

      currentY = headerY + headerHeight + sectionSpacing;

      // ============================================
      // CONTACT INFORMATION SECTION - Clean Grid
      // ============================================
      const contactSectionY = currentY;
      const contactBoxHeight = 110;
      const contactBoxPadding = 18;

      // Contact info background
      doc.rect(margin, contactSectionY, contentWidth, contactBoxHeight)
        .fillColor('#FFFFFF')
        .fill();

      // Draw border
      doc.rect(margin, contactSectionY, contentWidth, contactBoxHeight)
        .lineWidth(1.5)
        .strokeColor('#E2E8F0')
        .stroke();

      // Vertical divider
      const dividerX = margin + contentWidth / 2;
      doc.moveTo(dividerX, contactSectionY + 10)
        .lineTo(dividerX, contactSectionY + contactBoxHeight - 10)
        .lineWidth(1)
        .strokeColor('#F1F5F9')
        .stroke();

      const leftColumnX = margin + contactBoxPadding;
      const contactRightColumnX = dividerX + contactBoxPadding;
      const labelFontSize = 10;
      const valueFontSize = 14;
      const rowSpacing = 25;

      // Left Column
      let contactRowY = contactSectionY + contactBoxPadding;

      // Contact
      doc.fontSize(labelFontSize)
        .font('Helvetica-Bold')
        .fillColor('#64748B')
        .text('BILL TO', leftColumnX, contactRowY);
      doc.fontSize(valueFontSize)
        .font('Helvetica')
        .fillColor('#1E293B');
      const contactName = invoice.contactId
        ? `${invoice.contactId.firstName || ''} ${invoice.contactId.lastName || ''}`.trim() || 'N/A'
        : 'N/A';
      doc.text(contactName, leftColumnX, contactRowY + 14, { width: 200 });

      // Due Date
      contactRowY += rowSpacing + 8;
      doc.fontSize(labelFontSize)
        .font('Helvetica-Bold')
        .fillColor('#64748B')
        .text('DUE DATE', leftColumnX, contactRowY);
      doc.fontSize(valueFontSize)
        .font('Helvetica')
        .fillColor('#1E293B');
      const dueDateText = invoice.dueDate
        ? new Date(invoice.dueDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'N/A';
      doc.text(dueDateText, leftColumnX, contactRowY + 14, { width: 200 });

      // Right Column
      contactRowY = contactSectionY + contactBoxPadding;

      // Company
      doc.fontSize(labelFontSize)
        .font('Helvetica-Bold')
        .fillColor('#64748B')
        .text('COMPANY', contactRightColumnX, contactRowY);
      doc.fontSize(valueFontSize)
        .font('Helvetica')
        .fillColor('#1E293B');
      const companyName = invoice.companyId?.name || 'N/A';
      doc.text(companyName, contactRightColumnX, contactRowY + 14, { width: 200 });

      // Amount Paid
      contactRowY += rowSpacing + 8;
      doc.fontSize(labelFontSize)
        .font('Helvetica-Bold')
        .fillColor('#64748B')
        .text('AMOUNT PAID', contactRightColumnX, contactRowY);
      doc.fontSize(valueFontSize)
        .font('Helvetica')
        .fillColor('#1E293B');
      const amountPaid = formatCurrency(invoice.amountPaid || 0);
      doc.text(amountPaid, contactRightColumnX, contactRowY + 14, { width: 200 });

      currentY = contactSectionY + contactBoxHeight + sectionSpacing;

      // ============================================
      // LINE ITEMS SECTION - Professional Table
      // ============================================
      const lineItemsTitleY = currentY;
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#1E293B')
        .text('LINE ITEMS', margin, lineItemsTitleY);
      currentY = lineItemsTitleY + 25;

      // Table configuration - optimized column widths for A4
      const tableStartX = margin;
      const tableStartY = currentY;
      const tableRowHeight = 34; // Increased for better readability
      const cellPadding = 12;

      // Column widths optimized to fit A4 perfectly (total ~495 points)
      // Column widths optimized to fit A4 perfectly
const colWidths = {
  item: 227,
  quantity: 70,
  unitPrice: 100,
  total: 120,
};
const totalTableWidth =
  colWidths.item +
  colWidths.quantity +
  colWidths.unitPrice +
  colWidths.total;

      // Draw header background
      doc.rect(tableStartX, tableStartY, totalTableWidth, tableRowHeight)
        .fillColor('#1E293B')
        .fill();

      // Draw header text (white on dark background)
      let headerX = tableStartX + cellPadding;
      doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#FFFFFF');
      doc.text('ITEM', headerX, tableStartY + 10);
      headerX += colWidths.item;
      doc.text('QTY', headerX, tableStartY + 10, { width: colWidths.quantity - cellPadding * 2, align: 'right' });
      headerX += colWidths.quantity;
      doc.text('UNIT PRICE', headerX, tableStartY + 10, { width: colWidths.unitPrice - cellPadding * 2, align: 'right' });
      headerX += colWidths.unitPrice;
      doc.text('TOTAL', headerX, tableStartY + 10, { width: colWidths.total - cellPadding * 2, align: 'right' });

      // Draw header bottom border
      doc.moveTo(tableStartX, tableStartY + tableRowHeight)
        .lineTo(tableStartX + totalTableWidth, tableStartY + tableRowHeight)
        .lineWidth(2)
        .strokeColor('#1E293B')
        .stroke();

      let rowY = tableStartY + tableRowHeight;

      // Prepare and draw table rows
      if (!invoice.lineItems || invoice.lineItems.length === 0) {
        // Draw row background
        doc.rect(tableStartX, rowY, totalTableWidth, tableRowHeight)
          .fillColor('#FAFAFA')
          .fill();
        
        doc.fontSize(12)
          .font('Helvetica')
          .fillColor('#64748B')
          .text('No items', tableStartX + cellPadding, rowY + 9);
        rowY += tableRowHeight;
      } else {
        invoice.lineItems.forEach((item, index) => {
          const itemName = item.productId?.name || item.description || 'Item';
          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unitPrice) || 0;
          const discount = Number(item.discount) || 0;
          const tax = Number(item.tax) || 0;
          const lineTotal = quantity * unitPrice * (1 - discount / 100) + tax;

          // Draw alternating row background
          if (index % 2 === 0) {
            doc.rect(tableStartX, rowY, totalTableWidth, tableRowHeight)
              .fillColor('#F8F9FA')
              .fill();
          }

          // Draw row text with larger fonts
          let cellX = tableStartX + cellPadding;
          doc.fontSize(12)
            .font('Helvetica')
            .fillColor('#1E293B');
          doc.text(itemName, cellX, rowY + 10, { width: colWidths.item - cellPadding * 2 });
          cellX += colWidths.item;
          doc.text(quantity.toString(), cellX, rowY + 10, { width: colWidths.quantity - cellPadding * 2, align: 'right' });
          cellX += colWidths.quantity;
          doc.text(formatCurrency(unitPrice), cellX, rowY + 10, { width: colWidths.unitPrice - cellPadding * 2, align: 'right' });
          cellX += colWidths.unitPrice;
          doc.font('Helvetica-Bold')
            .fontSize(12);
          doc.text(formatCurrency(lineTotal), cellX, rowY + 10, { width: colWidths.total - cellPadding * 2, align: 'right' });

          // Draw row separator
          if (index < invoice.lineItems.length - 1) {
            doc.moveTo(tableStartX, rowY + tableRowHeight)
              .lineTo(tableStartX + totalTableWidth, rowY + tableRowHeight)
              .lineWidth(0.5)
              .strokeColor('#E2E8F0')
              .stroke();
          }

          rowY += tableRowHeight;
        });
      }

      // Draw bottom border
      doc.moveTo(tableStartX, rowY)
        .lineTo(tableStartX + totalTableWidth, rowY)
        .lineWidth(2)
        .strokeColor('#1E293B')
        .stroke();

      currentY = rowY + sectionSpacing;

      // ============================================
      // TOTALS SECTION - Professional Design with Perfect Alignment
      // ============================================
      const totalsBoxWidth = 300; // Optimal width for A4
      const totalsBoxX = margin + contentWidth - totalsBoxWidth;
      const totalsBoxHeight = 110;
      const totalsBoxY = currentY;

      // Totals box background
      doc.rect(totalsBoxX, totalsBoxY, totalsBoxWidth, totalsBoxHeight)
        .fillColor('#F8F9FA')
        .fill();

      // Totals box border
      doc.rect(totalsBoxX, totalsBoxY, totalsBoxWidth, totalsBoxHeight)
        .lineWidth(2)
        .strokeColor('#1E293B')
        .stroke();

      // Top accent line
      doc.rect(totalsBoxX, totalsBoxY, totalsBoxWidth, 3)
        .fillColor('#2563EB')
        .fill();

      // Two-column layout for perfect alignment - reduced right padding
      const totalsLeftPadding = 18;
      const totalsRightPadding = 12; // Reduced from right side
      const labelColumnWidth = 100; // Fixed width for labels
      const valueColumnStartX = totalsBoxX + totalsLeftPadding + labelColumnWidth;
      const valueColumnEndX = totalsBoxX + totalsBoxWidth - totalsRightPadding; // Right edge for all values
      const valueColumnWidth = valueColumnEndX - valueColumnStartX;
      const totalsLabelX = totalsBoxX + totalsLeftPadding;
      let totalsY = totalsBoxY + totalsLeftPadding + 8;

      // Subtotal - perfectly aligned to same right edge
      doc.fontSize(12)
        .font('Helvetica')
        .fillColor('#64748B')
        .text('Subtotal', totalsLabelX, totalsY);
      doc.fontSize(12)
        .font('Helvetica')
        .fillColor('#334155')
        .text(formatCurrency(invoice.subtotal || 0), valueColumnStartX, totalsY, {
          align: 'right',
          width: valueColumnWidth,
        });

      totalsY += 24;

      // Tax - perfectly aligned to same right edge
      doc.fontSize(12)
        .font('Helvetica')
        .fillColor('#64748B')
        .text('Tax', totalsLabelX, totalsY);
      doc.fontSize(12)
        .font('Helvetica')
        .fillColor('#334155')
        .text(formatCurrency(invoice.tax || 0), valueColumnStartX, totalsY, {
          align: 'right',
          width: valueColumnWidth,
        });

      totalsY += 24;

      // Divider line before total - aligned to same edges
      doc.moveTo(totalsLabelX, totalsY + 3)
        .lineTo(valueColumnEndX, totalsY + 3)
        .lineWidth(1)
        .strokeColor('#CBD5E1')
        .stroke();

      totalsY += 14;

      // Total (prominent) - perfectly aligned to same right edge
      doc.fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#1E293B')
        .text('TOTAL', totalsLabelX, totalsY);
      doc.fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#1E293B')
        .text(formatCurrency(invoice.total || 0), valueColumnStartX, totalsY, {
          align: 'right',
          width: valueColumnWidth,
        });

      currentY = totalsBoxY + totalsBoxHeight + sectionSpacing;

      // ============================================
      // NOTES SECTION - Clean Design
      // ============================================
      if (invoice.notes && invoice.notes.trim()) {
        const notesBoxY = currentY;
        const notesBoxHeight = Math.min(100, 50 + (invoice.notes.length / 60) * 15); // Dynamic height
        const notesPadding = 18;

        // Notes box background
        doc.rect(margin, notesBoxY, contentWidth, notesBoxHeight)
          .fillColor('#FFFFFF')
          .fill();

        // Notes box border
        doc.rect(margin, notesBoxY, contentWidth, notesBoxHeight)
          .lineWidth(1.5)
          .strokeColor('#E2E8F0')
          .stroke();

        // Notes title
        doc.fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#1E293B')
          .text('NOTES', margin + notesPadding, notesBoxY + notesPadding);

        // Notes content
        doc.fontSize(11)
          .font('Helvetica')
          .fillColor('#475569')
          .text(invoice.notes, margin + notesPadding, notesBoxY + notesPadding + 16, {
            width: contentWidth - 2 * notesPadding,
            align: 'left',
            lineGap: 4,
          });
      }

      // ============================================
      // FINALIZE
      // ============================================
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
