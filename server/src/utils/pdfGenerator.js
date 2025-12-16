import PDFDocument from 'pdfkit';

/**
 * Generate PDF for invoice
 * @param {Object} invoice - Invoice document with populated fields
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generateInvoicePDF = async (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' });
      doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, { align: 'right' });
      if (invoice.dueDate) {
        doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, { align: 'right' });
      }
      doc.moveDown();

      // Company/Billing Info
      if (invoice.companyId) {
        doc.fontSize(14).text('Bill To:', { underline: true });
        doc.fontSize(10);
        if (invoice.companyId.name) doc.text(invoice.companyId.name);
        if (invoice.contactId) {
          doc.text(`${invoice.contactId.firstName} ${invoice.contactId.lastName}`);
        }
        doc.moveDown();
      }

      // Line Items Table
      doc.fontSize(12).text('Items:', { underline: true });
      doc.moveDown(0.5);

      // Table header
      const tableTop = doc.y;
      doc.fontSize(10);
      doc.text('Item', 50, tableTop);
      doc.text('Qty', 250, tableTop);
      doc.text('Price', 300, tableTop);
      doc.text('Total', 400, tableTop, { align: 'right' });
      doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
      doc.moveDown();

      // Table rows
      invoice.lineItems.forEach((item) => {
        const itemName = item.productId?.name || item.description || 'Item';
        const quantity = item.quantity || 0;
        const unitPrice = item.unitPrice || 0;
        const discount = item.discount || 0;
        const tax = item.tax || 0;
        const lineTotal = quantity * unitPrice * (1 - discount / 100) + tax;

        doc.text(itemName, 50);
        doc.text(quantity.toString(), 250);
        doc.text(`$${unitPrice.toFixed(2)}`, 300);
        doc.text(`$${lineTotal.toFixed(2)}`, 400, undefined, { align: 'right' });
        doc.moveDown(0.5);
      });

      doc.moveDown();

      // Totals
      const totalsY = doc.y;
      doc.text('Subtotal:', 400, totalsY, { align: 'right' });
      doc.text(`$${invoice.subtotal.toFixed(2)}`, 500, totalsY, { align: 'right' });
      doc.moveDown(0.5);
      doc.text('Tax:', 400, doc.y, { align: 'right' });
      doc.text(`$${invoice.tax.toFixed(2)}`, 500, doc.y, { align: 'right' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Total:', 400, doc.y, { align: 'right' });
      doc.text(`$${invoice.total.toFixed(2)}`, 500, doc.y, { align: 'right' });
      doc.font('Helvetica').fontSize(10);

      // Status
      doc.moveDown(2);
      doc.text(`Status: ${invoice.status}`, { align: 'center' });

      // Notes
      if (invoice.notes) {
        doc.moveDown();
        doc.text('Notes:', { underline: true });
        doc.text(invoice.notes);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

