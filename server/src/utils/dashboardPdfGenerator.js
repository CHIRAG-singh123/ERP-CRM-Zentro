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
 * Draw explanation text box below chart with numbered points
 * @param {PDFDocument} doc - PDF document
 * @param {string[]} explanationLines - Array of explanation text lines
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Width of explanation box
 * @returns {number} Height used
 */
const drawExplanation = (doc, explanationLines, x, y, width) => {
  const boxPadding = 10;
  const textWidth = width - boxPadding * 2;
  const lineGap = 6; // Increased for better readability
  
  // Calculate box height by measuring text
  let totalHeight = boxPadding * 2 + 18; // Title height
  explanationLines.forEach((line, index) => {
    doc.fontSize(10); // Increased font size for readability
    const numberedLine = `${index + 1}.) ${line}`;
    const textHeight = doc.heightOfString(numberedLine, { width: textWidth });
    totalHeight += textHeight + lineGap;
  });
  totalHeight -= lineGap; // Remove last gap

  // Draw explanation box background
  doc.rect(x, y, width, totalHeight)
    .fillColor('#F8FAFC')
    .fill();

  // Draw border
  doc.rect(x, y, width, totalHeight)
    .lineWidth(1)
    .strokeColor('#E2E8F0')
    .stroke();

  // Draw explanation title
  doc.fontSize(11) // Slightly larger title
    .font('Helvetica-Bold')
    .fillColor('#1E293B')
    .text('Analysis:', x + boxPadding, y + boxPadding, {
      width: textWidth,
    });

  let currentY = y + boxPadding + 18;

  // Draw explanation lines as numbered points
  explanationLines.forEach((line, index) => {
    const numberedLine = `${index + 1}.) ${line}`;
    doc.fontSize(10) // Increased from 9 for better readability
      .font('Helvetica')
      .fillColor('#0F172A') // Darker color for better readability (was #475569)
      .text(numberedLine, x + boxPadding, currentY, {
        width: textWidth,
        lineGap: lineGap,
      });
    
    // Calculate actual height used by this line
    const textHeight = doc.heightOfString(numberedLine, { width: textWidth });
    currentY += textHeight + lineGap;
  });

  return totalHeight;
};

/**
 * Generate dynamic explanation for Deals by Stage
 * @param {Array} dealsByStage - Array of {stage, count, totalValue}
 * @returns {string[]} Array of explanation lines (minimum 3)
 */
const generateDealsByStageExplanation = (dealsByStage) => {
  const validDeals = dealsByStage.filter((item) => item.count > 0);
  
  if (validDeals.length === 0) {
    return [
      'No deals data available for analysis.',
      'The pipeline is currently empty.',
      'Please ensure deals are being tracked in the system.',
    ];
  }

  const totalDeals = validDeals.reduce((sum, item) => sum + item.count, 0);
  const totalValue = validDeals.reduce((sum, item) => sum + item.totalValue, 0);
  const avgDealValue = totalDeals > 0 ? (totalValue / totalDeals) : 0;

  const stageWithMostDeals = validDeals.reduce((max, item) => item.count > max.count ? item : max, validDeals[0]);
  const stageWithHighestValue = validDeals.reduce((max, item) => item.totalValue > max.totalValue ? item : max, validDeals[0]);

  const closedWon = validDeals.find((item) => item.stage === 'Closed Won');
  const closedLost = validDeals.find((item) => item.stage === 'Closed Lost');
  const openDeals = validDeals.filter((item) => !['Closed Won', 'Closed Lost'].includes(item.stage));
  const openDealsCount = openDeals.reduce((sum, item) => sum + item.count, 0);
  const openDealsValue = openDeals.reduce((sum, item) => sum + item.totalValue, 0);

  const wonPercentage = totalDeals > 0 ? ((closedWon?.count || 0) / totalDeals * 100).toFixed(1) : '0.0';
  const lostPercentage = totalDeals > 0 ? ((closedLost?.count || 0) / totalDeals * 100).toFixed(1) : '0.0';
  const openPercentage = totalDeals > 0 ? ((openDealsCount / totalDeals) * 100).toFixed(1) : '0.0';

  // Split into numbered points, breaking after fullstops
  return [
    `The pipeline contains ${totalDeals} total deals with a combined value of ${formatAbbreviated(totalValue)}, resulting in an average deal value of ${formatAbbreviated(avgDealValue)}.`,
    `The ${stageWithMostDeals.stage} stage has the highest deal count with ${stageWithMostDeals.count} deals (${((stageWithMostDeals.count / totalDeals) * 100).toFixed(1)}%), while ${stageWithHighestValue.stage} stage holds the highest value at ${formatAbbreviated(stageWithHighestValue.totalValue)}.`,
    `Currently, ${openDealsCount} deals (${openPercentage}%) remain open in the pipeline with a total value of ${formatAbbreviated(openDealsValue)}.`,
    `${closedWon?.count || 0} deals (${wonPercentage}%) have been closed as won, contributing ${formatAbbreviated(closedWon?.totalValue || 0)} to revenue, while ${closedLost?.count || 0} deals (${lostPercentage}%) were closed as lost.`,
  ];
};

/**
 * Generate dynamic explanation for Leads by Source
 * @param {Array} leadsBySource - Array of {source, count}
 * @returns {string[]} Array of explanation lines (minimum 3)
 */
const generateLeadsBySourceExplanation = (leadsBySource) => {
  if (!leadsBySource || leadsBySource.length === 0) {
    return [
      'No leads data available by source for analysis.',
      'Source tracking is not currently active.',
      'Please ensure leads are being categorized by source.',
    ];
  }

  const validSources = leadsBySource.filter((item) => item.count > 0);
  
  if (validSources.length === 0) {
    return [
      'All sources have zero leads.',
      'No lead generation activity detected.',
      'Please ensure leads are being tracked with sources.',
    ];
  }

  const totalLeads = validSources.reduce((sum, item) => sum + item.count, 0);
  const sourceWithMostLeads = validSources.reduce((max, item) => item.count > max.count ? item : max, validSources[0]);
  const sourceWithLeastLeads = validSources.reduce((min, item) => item.count < min.count ? item : min, validSources[0]);
  
  const topSourcePercentage = ((sourceWithMostLeads.count / totalLeads) * 100).toFixed(1);
  const bottomSourcePercentage = ((sourceWithLeastLeads.count / totalLeads) * 100).toFixed(1);
  const topSourceName = sourceWithMostLeads.source ? sourceWithMostLeads.source.charAt(0).toUpperCase() + sourceWithMostLeads.source.slice(1) : 'Other';
  const bottomSourceName = sourceWithLeastLeads.source ? sourceWithLeastLeads.source.charAt(0).toUpperCase() + sourceWithLeastLeads.source.slice(1) : 'Other';

  return [
    `Lead generation across all sources has produced ${totalLeads} total leads, with distribution varying significantly by channel.`,
    `The ${topSourceName} source is the primary lead generator, contributing ${sourceWithMostLeads.count} leads (${topSourcePercentage}% of total), demonstrating strong channel performance.`,
    `The ${bottomSourceName} source represents the lowest volume at ${sourceWithLeastLeads.count} leads (${bottomSourcePercentage}% of total), indicating a need for optimization or increased investment.`,
    `With ${validSources.length} active source channels, the lead portfolio shows good diversification, reducing dependency on any single acquisition channel and mitigating risk.`,
  ];
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
      const dealsExplanationHeight = 95; // Approximate height for deals explanation
      const pieChartTotalHeight = separatorHeight + titleHeight + pieChartHeight + dealsExplanationHeight + 20; // Include explanation and spacing

      // Check if ENTIRE section (title + chart + explanation) fits on current page
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
      let dealsChartUsedHeight = 0;
      try {
        dealsChartUsedHeight = drawPieChart(doc, dealsByStage, margin, currentY, contentWidth, pieChartHeight);
        currentY += dealsChartUsedHeight + 10; // 10pt spacing after chart
      } catch (error) {
        console.error('Error drawing pie chart:', error);
        doc.fontSize(10)
          .font('Helvetica')
          .fillColor('#94A3B8')
          .text('Unable to generate chart. Please try again.', margin, currentY);
        currentY += 30;
      }

      // Draw explanation
      const dealsExplanation = generateDealsByStageExplanation(dealsByStage);
      const dealsExplanationHeightUsed = drawExplanation(doc, dealsExplanation, margin, currentY, contentWidth);
      currentY += dealsExplanationHeightUsed + 15; // 15pt spacing after explanation

      // ============================================
      // LEADS BY SOURCE CHART SECTION
      // ============================================
      const leadsBySource = dashboardData.leadsBySource || [];
      const barChartHeight = getBarChartHeight(leadsBySource);
      const leadsExplanationHeight = 85; // Approximate height for leads explanation
      const barChartTotalHeight = separatorHeight + titleHeight + barChartHeight + leadsExplanationHeight + 20; // Include explanation and spacing

      // Check if ENTIRE section (title + chart + explanation) fits on current page
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
      let leadsChartUsedHeight = 0;
      try {
        leadsChartUsedHeight = drawBarChart(doc, leadsBySource, margin, currentY, contentWidth, barChartHeight);
        currentY += leadsChartUsedHeight + 10; // 10pt spacing after chart
      } catch (error) {
        console.error('Error drawing bar chart:', error);
        doc.fontSize(10)
          .font('Helvetica')
          .fillColor('#94A3B8')
          .text('Unable to generate chart. Please try again.', margin, currentY);
        currentY += 30;
      }

      // Draw explanation
      const leadsExplanation = generateLeadsBySourceExplanation(leadsBySource);
      const leadsExplanationHeightUsed = drawExplanation(doc, leadsExplanation, margin, currentY, contentWidth);
      currentY += leadsExplanationHeightUsed + 15; // 15pt spacing after explanation

      // No need for separate footer loop - PDFKit will handle on doc.end()
      doc.end();
    } catch (error) {
      reject(new Error(`PDF generation failed: ${error.message}`));
    }
  });
};
