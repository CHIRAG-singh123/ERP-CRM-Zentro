import PDFDocument from 'pdfkit';
import { drawPieChart, drawBarChart, getPieChartHeight, getBarChartHeight } from './chartGenerator.js';

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

/**
 * Format number with abbreviation (K, M)
 * @param {number} value - Number to format
 * @returns {string} Formatted string
 */
const formatAbbreviated = (value) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return formatCurrency(value);
};

/**
 * Draw section title with subtitle
 * @returns {number} Height used for title section
 */
const drawSectionTitle = (doc, title, subtitle, x, y, width) => {
  doc.fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#1E293B')
    .text(title, x, y);

  doc.fontSize(9)
    .font('Helvetica')
    .fillColor('#64748B')
    .text(subtitle, x, y + 18);

  return 38; // Title + subtitle + spacing
};

/**
 * Generate PDF for dashboard snapshot with professional design
 * Optimized for A4 with proper page breaks
 * @param {Object} dashboardData - Dashboard data from getKPIs
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generateDashboardPDF = async (dashboardData) => {
  return new Promise((resolve, reject) => {
    try {
      // PDF setup optimized for A4 (595.28 x 841.89 points)
      const margin = 40;
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const contentWidth = pageWidth - 2 * margin;
      const footerHeight = 50; // Reserve space for footer

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

      let currentY = margin;

      // ============================================
      // HEADER SECTION - Professional Design
      // ============================================
      const headerHeight = 80;
      const headerY = currentY;

      // Header background
      doc.rect(margin, headerY, contentWidth, headerHeight)
        .fillColor('#1A1A1C')
        .fill();

      // Accent line at top (purple)
      doc.rect(margin, headerY, contentWidth, 3)
        .fillColor('#B39CD0')
        .fill();

      // Title
      doc.fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#FFFFFF')
        .text('Revenue Operations Overview', margin + 18, headerY + 16);

      // Subtitle
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#A8DADC')
        .text('Monitor pipeline velocity, conversion health, and high-priority work across teams.', margin + 18, headerY + 42, {
          width: contentWidth - 36,
        });

      // Timestamp on the right
      const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      doc.fontSize(8)
        .font('Helvetica')
        .fillColor('#FFFFFF')
        .opacity(0.7)
        .text(`Generated: ${timestamp}`, margin + contentWidth - 160, headerY + 58, {
          width: 140,
          align: 'right',
        });

      doc.opacity(1);
      currentY = headerY + headerHeight + 20;

      // ============================================
      // METRIC CARDS SECTION - 2x2 Grid
      // ============================================
      const cardSpacing = 12;
      const cardWidth = (contentWidth - cardSpacing) / 2;
      const cardHeight = 85;
      const cardY = currentY;

      // Card colors
      const cardColors = [
        { bg: '#1E3A5F', border: '#3B82F6', text: '#FFFFFF' },
        { bg: '#2D1B3D', border: '#B39CD0', text: '#FFFFFF' },
        { bg: '#1E3A5F', border: '#3B82F6', text: '#FFFFFF' },
        { bg: '#2D1B3D', border: '#B39CD0', text: '#FFFFFF' },
      ];

      // Metric data
      const metrics = [
        {
          label: 'Open Deals Value',
          value: dashboardData.openDeals?.totalValue || 0,
          format: 'currency',
          subtitle: `${dashboardData.openDeals?.count || 0} deals`,
        },
        {
          label: 'Lead Conversion Rate',
          value: dashboardData.conversionRate || 0,
          format: 'percentage',
          subtitle: 'Last 30 days',
        },
        {
          label: 'Total Invoices',
          value: dashboardData.totalInvoices?.totalAmount || 0,
          format: 'currency',
          subtitle: `${dashboardData.totalInvoices?.count || 0} invoices`,
        },
        {
          label: 'Weekly Tasks',
          value: dashboardData.weeklyTasks || 0,
          format: 'number',
          subtitle: 'Due this week',
        },
      ];

      // Draw 4 cards in 2x2 grid
      for (let i = 0; i < 4; i++) {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const cardX = margin + col * (cardWidth + cardSpacing);
        const cardYPos = cardY + row * (cardHeight + cardSpacing);
        const cardColor = cardColors[i];

        // Card background
        doc.rect(cardX, cardYPos, cardWidth, cardHeight)
          .fillColor(cardColor.bg)
          .fill();

        // Card border
        doc.rect(cardX, cardYPos, cardWidth, cardHeight)
          .lineWidth(2)
          .strokeColor(cardColor.border)
          .stroke();

        // Card content
        const cardPadding = 12;
        let textY = cardYPos + cardPadding;

        // Label
        doc.fontSize(8)
          .font('Helvetica-Bold')
          .fillColor(cardColor.text)
          .opacity(0.8)
          .text(metrics[i].label.toUpperCase(), cardX + cardPadding, textY, {
            width: cardWidth - 2 * cardPadding,
          });

        textY += 16;

        // Value
        let valueText = '';
        if (metrics[i].format === 'currency') {
          valueText = formatAbbreviated(metrics[i].value);
        } else if (metrics[i].format === 'percentage') {
          valueText = `${metrics[i].value.toFixed(1)}%`;
        } else {
          valueText = metrics[i].value.toString();
        }

        doc.fontSize(22)
          .font('Helvetica-Bold')
          .fillColor(cardColor.text)
          .opacity(1)
          .text(valueText, cardX + cardPadding, textY, {
            width: cardWidth - 2 * cardPadding,
          });

        textY += 26;

        // Subtitle
        doc.fontSize(8)
          .font('Helvetica')
          .fillColor(cardColor.text)
          .opacity(0.7)
          .text(metrics[i].subtitle, cardX + cardPadding, textY, {
            width: cardWidth - 2 * cardPadding,
          });
      }

      currentY = cardY + 2 * (cardHeight + cardSpacing) + 25;

      // ============================================
      // DEALS BY STAGE CHART SECTION
      // ============================================
      const dealsByStage = dashboardData.dealsByStage || [];
      const pieChartHeight = getPieChartHeight(dealsByStage);
      const titleHeight = 38; // Title + subtitle
      const separatorHeight = 15;
      const pieChartTotalHeight = separatorHeight + titleHeight + pieChartHeight + 10;

      // Check if ENTIRE section (title + chart) fits on current page
      // If not, add new page BEFORE drawing anything
      if (currentY + pieChartTotalHeight > pageHeight - footerHeight) {
        doc.addPage();
        currentY = margin;
      }

      // Separator line
      doc.moveTo(margin, currentY)
        .lineTo(margin + contentWidth, currentY)
        .strokeColor('#E2E8F0')
        .lineWidth(1)
        .stroke();
      currentY += separatorHeight;

      // Section title (now guaranteed to be on same page as chart)
      drawSectionTitle(doc, 'Deals by Stage', 'Deal distribution across pipeline stages', margin, currentY, contentWidth);
      currentY += titleHeight;

      // Draw pie chart
      try {
        const usedHeight = drawPieChart(doc, dealsByStage, margin, currentY, contentWidth, pieChartHeight);
        currentY += usedHeight + 15;
      } catch (error) {
        console.error('Error drawing pie chart:', error);
        doc.fontSize(10)
          .font('Helvetica')
          .fillColor('#94A3B8')
          .text('Unable to generate chart. Please try again.', margin, currentY);
        currentY += 30;
      }

      // ============================================
      // LEADS BY SOURCE CHART SECTION
      // ============================================
      const leadsBySource = dashboardData.leadsBySource || [];
      const barChartHeight = getBarChartHeight(leadsBySource);
      const barChartTotalHeight = separatorHeight + titleHeight + barChartHeight + 10;

      // Check if ENTIRE section (title + chart) fits on current page
      // If not, add new page BEFORE drawing anything
      if (currentY + barChartTotalHeight > pageHeight - footerHeight) {
        doc.addPage();
        currentY = margin;
      }

      // Separator line
      doc.moveTo(margin, currentY)
        .lineTo(margin + contentWidth, currentY)
        .strokeColor('#E2E8F0')
        .lineWidth(1)
        .stroke();
      currentY += separatorHeight;

      // Section title (now guaranteed to be on same page as chart)
      drawSectionTitle(doc, 'Leads by Source', 'Lead distribution across sources', margin, currentY, contentWidth);
      currentY += titleHeight;

      // Draw bar chart
      try {
        const usedHeight = drawBarChart(doc, leadsBySource, margin, currentY, contentWidth, barChartHeight);
        currentY += usedHeight + 15;
      } catch (error) {
        console.error('Error drawing bar chart:', error);
        doc.fontSize(10)
          .font('Helvetica')
          .fillColor('#94A3B8')
          .text('Unable to generate chart. Please try again.', margin, currentY);
        currentY += 30;
      }

      // No need for separate footer loop - PDFKit will handle on doc.end()
      doc.end();
    } catch (error) {
      reject(new Error(`PDF generation failed: ${error.message}`));
    }
  });
};
