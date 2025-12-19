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
 * Generate PDF for invoice matching the InvoiceView component format
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

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
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

      // Title
      doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
      doc.moveDown(1.5);

      // Invoice Number and Date
      doc.fontSize(12).font('Helvetica');
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' });
      if (invoice.createdAt) {
        doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-US')}`, { align: 'right' });
      }
      doc.moveDown(2);

      // Contact Information Section (2-column grid matching InvoiceView)
      const contactSectionY = doc.y;
      const leftColumnX = 50;
      const rightColumnX = 300;
      const labelFontSize = 11;
      const valueFontSize = 12;

      // Left Column - Contact
      doc.fontSize(labelFontSize).font('Helvetica-Bold');
      doc.text('Contact', leftColumnX, contactSectionY);
      doc.fontSize(valueFontSize).font('Helvetica');
      const contactName = invoice.contactId
        ? `${invoice.contactId.firstName || ''} ${invoice.contactId.lastName || ''}`.trim()
        : 'N/A';
      doc.text(contactName, leftColumnX, doc.y + 5);

      // Right Column - Company
      doc.fontSize(labelFontSize).font('Helvetica-Bold');
      doc.text('Company', rightColumnX, contactSectionY);
      doc.fontSize(valueFontSize).font('Helvetica');
      const companyName = invoice.companyId?.name || 'N/A';
      doc.text(companyName, rightColumnX, doc.y + 5);

      // Move to next row
      const nextRowY = doc.y + 20;

      // Left Column - Due Date
      doc.fontSize(labelFontSize).font('Helvetica-Bold');
      doc.text('Due Date', leftColumnX, nextRowY);
      doc.fontSize(valueFontSize).font('Helvetica');
      const dueDateText = invoice.dueDate
        ? new Date(invoice.dueDate).toLocaleDateString('en-US')
        : 'N/A';
      doc.text(dueDateText, leftColumnX, doc.y + 5);

      // Right Column - Amount Paid
      doc.fontSize(labelFontSize).font('Helvetica-Bold');
      doc.text('Amount Paid', rightColumnX, nextRowY);
      doc.fontSize(valueFontSize).font('Helvetica');
      const amountPaid = formatCurrency(invoice.amountPaid || 0);
      doc.text(amountPaid, rightColumnX, doc.y + 5);

      doc.moveDown(3);

      // Line Items Section
      doc.fontSize(18).font('Helvetica-Bold');
      doc.text('Line Items', 50);
      doc.moveDown(1);

      // Table setup
      const tableStartY = doc.y;
      const tableLeft = 50;
      const tableRight = 550;
      const col1X = tableLeft; // Item
      const col2X = 400; // Quantity
      const col3X = 450; // Unit Price
      const col4X = 500; // Total

      // Table header
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('Item', col1X, tableStartY);
      doc.text('Quantity', col2X, tableStartY, { align: 'right' });
      doc.text('Unit Price', col3X, tableStartY, { align: 'right' });
      doc.text('Total', col4X, tableStartY, { align: 'right' });

      // Draw header underline
      const headerLineY = tableStartY + 15;
      doc.moveTo(tableLeft, headerLineY).lineTo(tableRight, headerLineY).stroke();
      doc.moveDown(1);

      // Table rows
      const rowStartY = doc.y;
      let currentY = rowStartY;

      if (!invoice.lineItems || invoice.lineItems.length === 0) {
        doc.fontSize(10).font('Helvetica');
        doc.text('No items', col1X, currentY);
        currentY += 20;
      } else {
        invoice.lineItems.forEach((item, index) => {
          const itemName = item.productId?.name || item.description || 'Item';
          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unitPrice) || 0;
          const discount = Number(item.discount) || 0;
          const tax = Number(item.tax) || 0;
          const lineTotal = quantity * unitPrice * (1 - discount / 100) + tax;

          doc.fontSize(10).font('Helvetica');
          
          // Truncate item name if too long (limit to 40 characters for table layout)
          const maxItemWidth = col2X - col1X - 10;
          const displayItemName = itemName.length > 40 ? itemName.substring(0, 37) + '...' : itemName;
          doc.text(displayItemName, col1X, currentY, { width: maxItemWidth });
          
          doc.text(quantity.toString(), col2X, currentY, { align: 'right' });
          doc.text(formatCurrency(unitPrice), col3X, currentY, { align: 'right' });
          doc.font('Helvetica-Bold');
          doc.text(formatCurrency(lineTotal), col4X, currentY, { align: 'right' });
          doc.font('Helvetica');

          // Draw row separator
          currentY += 18;
          if (index < invoice.lineItems.length - 1) {
            doc.moveTo(tableLeft, currentY - 5).lineTo(tableRight, currentY - 5).stroke();
          }
        });
      }

      doc.y = currentY + 10;
      doc.moveDown(2);

      // Summary Totals Section (matching InvoiceView layout)
      const totalsStartY = doc.y;
      const totalsRightX = 500;
      const totalsLabelX = 400;
      const totalsWidth = 150;

      doc.fontSize(10).font('Helvetica');
      
      // Subtotal
      doc.text('Subtotal:', totalsLabelX, totalsStartY, { align: 'right', width: totalsWidth });
      doc.text(formatCurrency(invoice.subtotal || 0), totalsRightX, totalsStartY, { align: 'right' });
      doc.moveDown(0.8);

      // Tax
      doc.text('Tax:', totalsLabelX, doc.y, { align: 'right', width: totalsWidth });
      doc.text(formatCurrency(invoice.tax || 0), totalsRightX, doc.y, { align: 'right' });
      doc.moveDown(0.8);

      // Total (bold, larger)
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Total:', totalsLabelX, doc.y, { align: 'right', width: totalsWidth });
      doc.text(formatCurrency(invoice.total || 0), totalsRightX, doc.y, { align: 'right' });
      doc.font('Helvetica').fontSize(10);

      // Notes Section
      if (invoice.notes) {
        doc.moveDown(3);
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('Notes', 50);
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        // Handle multi-line notes
        doc.text(invoice.notes, 50, doc.y, {
          width: 500,
          align: 'left',
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

