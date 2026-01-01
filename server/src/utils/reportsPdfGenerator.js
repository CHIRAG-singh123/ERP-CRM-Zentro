import PDFDocument from 'pdfkit';
import { drawPieChart, drawBarChart, drawHorizontalBarChart, drawConversionRateBarChart, getPieChartHeight, getBarChartHeight, getHorizontalBarChartHeight, getConversionRateBarChartHeight } from './chartGenerator.js';

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
 * Draw section title with subtitle (matching dashboard format)
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
 * Generate dynamic explanation for Lead Conversion Funnel
 * @param {Object} funnel - Funnel data with new, contacted, qualified, converted, lost
 * @returns {string[]} Array of explanation lines (minimum 3)
 */
const generateFunnelExplanation = (funnel) => {
  const totalLeads = funnel.new + funnel.contacted + funnel.qualified + funnel.converted + funnel.lost;
  
  if (totalLeads === 0) {
    return [
      'No leads data available for analysis.',
      'The conversion funnel is empty.',
      'Please ensure leads are being tracked in the system.',
    ];
  }

  const newPercentage = ((funnel.new / totalLeads) * 100).toFixed(1);
  const contactedPercentage = ((funnel.contacted / totalLeads) * 100).toFixed(1);
  const qualifiedPercentage = ((funnel.qualified / totalLeads) * 100).toFixed(1);
  const convertedPercentage = ((funnel.converted / totalLeads) * 100).toFixed(1);
  const lostPercentage = ((funnel.lost / totalLeads) * 100).toFixed(1);

  const newToContactedRate = funnel.new > 0 ? ((funnel.contacted / funnel.new) * 100).toFixed(1) : '0.0';
  const contactedToQualifiedRate = funnel.contacted > 0 ? ((funnel.qualified / funnel.contacted) * 100).toFixed(1) : '0.0';
  const qualifiedToConvertedRate = funnel.qualified > 0 ? ((funnel.converted / funnel.qualified) * 100).toFixed(1) : '0.0';

  const maxStage = Math.max(funnel.new, funnel.contacted, funnel.qualified, funnel.converted, funnel.lost);
  const bottleneckStage = maxStage === funnel.new ? 'New' : 
                         maxStage === funnel.contacted ? 'Contacted' :
                         maxStage === funnel.qualified ? 'Qualified' :
                         maxStage === funnel.converted ? 'Converted' : 'Lost';

  // Split into numbered points, breaking after fullstops
  return [
    `Out of ${totalLeads} total leads, ${funnel.new} leads (${newPercentage}%) are in the New stage, ${funnel.contacted} leads (${contactedPercentage}%) have been Contacted, and ${funnel.qualified} leads (${qualifiedPercentage}%) are Qualified.`,
    `The conversion rate from New to Contacted is ${newToContactedRate}%, while ${contactedToQualifiedRate}% of contacted leads progress to Qualified status.`,
    `The final conversion rate from Qualified to Converted stands at ${qualifiedToConvertedRate}%.`,
    `Currently, ${funnel.converted} leads (${convertedPercentage}%) have been successfully converted, while ${funnel.lost} leads (${lostPercentage}%) were lost.`,
    `The ${bottleneckStage} stage contains the highest number of leads (${maxStage}), indicating a potential area for process optimization.`,
  ];
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
    `The win rate stands at ${wonPercentage}% based on closed deals, and the open pipeline represents ${openPercentage}% of all deals.`,
    `This distribution indicates ${openDealsCount > closedWon?.count ? 'significant potential revenue' : 'a balanced pipeline'} with ${openDealsCount} active opportunities worth ${formatAbbreviated(openDealsValue)} currently in progress.`,
  ];
};

/**
 * Generate dynamic explanation for Conversion Rate by Source
 * @param {Array} conversionBySource - Array of {source, total, converted, rate}
 * @returns {string[]} Array of explanation lines (minimum 3)
 */
const generateConversionBySourceExplanation = (conversionBySource) => {
  if (!conversionBySource || conversionBySource.length === 0) {
    return [
      'No conversion data by source available for analysis.',
      'Source tracking is not available.',
      'Please ensure lead sources are being tracked in the system.',
    ];
  }

  const validSources = conversionBySource.filter((item) => item.total > 0);
  
  if (validSources.length === 0) {
    return [
      'All sources have zero leads.',
      'No conversion data available.',
      'Please ensure leads are being tracked with sources.',
    ];
  }

  const bestSource = validSources.reduce((max, item) => item.rate > max.rate ? item : max, validSources[0]);
  const worstSource = validSources.reduce((min, item) => item.rate < min.rate ? item : min, validSources[0]);
  const totalLeads = validSources.reduce((sum, item) => sum + item.total, 0);
  const totalConverted = validSources.reduce((sum, item) => sum + item.converted, 0);
  const overallRate = totalLeads > 0 ? ((totalConverted / totalLeads) * 100).toFixed(1) : '0.0';

  const sourceWithMostLeads = validSources.reduce((max, item) => item.total > max.total ? item : max, validSources[0]);
  const sourceWithMostConversions = validSources.reduce((max, item) => item.converted > max.converted ? item : max, validSources[0]);

  const bestSourcePercentage = ((bestSource.total / totalLeads) * 100).toFixed(1);
  const worstSourcePercentage = ((worstSource.total / totalLeads) * 100).toFixed(1);

  // Split into numbered points, breaking after fullstops
  return [
    `The ${bestSource.source} source demonstrates the highest conversion rate at ${bestSource.rate.toFixed(1)}%, successfully converting ${bestSource.converted} out of ${bestSource.total} total leads.`,
    `In contrast, the ${worstSource.source} source shows the lowest conversion rate at ${worstSource.rate.toFixed(1)}%, converting only ${worstSource.converted} out of ${worstSource.total} leads.`,
    `Across all sources, ${totalLeads} total leads were generated, with ${totalConverted} leads (${overallRate}%) successfully converted.`,
    `The ${sourceWithMostLeads.source} source generated the highest volume with ${sourceWithMostLeads.total} leads (${((sourceWithMostLeads.total / totalLeads) * 100).toFixed(1)}% of total), while ${sourceWithMostConversions.source} source achieved the most conversions with ${sourceWithMostConversions.converted} converted leads.`,
    `The performance gap between the best (${bestSource.source} at ${bestSource.rate.toFixed(1)}%) and worst (${worstSource.source} at ${worstSource.rate.toFixed(1)}%) performing sources is ${(bestSource.rate - worstSource.rate).toFixed(1)} percentage points.`,
    `${bestSource.source} represents ${bestSourcePercentage}% of total leads but achieves superior conversion efficiency, suggesting this channel should be prioritized for lead generation efforts.`,
  ];
};

/**
 * Draw horizontal legend with color swatches and labels
 * @param {PDFDocument} doc - PDF document
 * @param {Array} legendData - Array of {label, color} objects
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Width of legend area
 * @returns {number} Height used
 */
const drawLegend = (doc, legendData, x, y, width) => {
  if (!legendData || legendData.length === 0) return 0;
  
  const itemSpacing = 12;
  const colorBoxSize = 12;
  const labelGap = 8;
  const rowHeight = 20;
  
  let currentX = x;
  let currentY = y;
  let itemsPerRow = Math.floor((width - 20) / 120); // ~120px per item
  itemsPerRow = Math.max(3, Math.min(itemsPerRow, 6)); // Between 3-6 items per row
  
  let itemCount = 0;
  legendData.forEach((item) => {
    if (itemCount > 0 && itemCount % itemsPerRow === 0) {
      currentX = x;
      currentY += rowHeight;
    }
    
    // Draw color box
    doc.rect(currentX, currentY + 2, colorBoxSize, colorBoxSize)
      .fillColor(item.color)
      .fill();
    
    doc.rect(currentX, currentY + 2, colorBoxSize, colorBoxSize)
      .lineWidth(0.5)
      .strokeColor('#E2E8F0')
      .stroke();
    
    // Draw label
    doc.fontSize(9)
      .font('Helvetica')
      .fillColor('#334155')
      .text(item.label, currentX + colorBoxSize + labelGap, currentY + 4, {
        width: 80,
      });
    
    currentX += 120; // Move to next item position
    itemCount++;
  });
  
  const rows = Math.ceil(legendData.length / itemsPerRow);
  return rows * rowHeight + 5; // Add small padding at bottom
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
 * Generate PDF for reports snapshot with professional design
 * Optimized for A4 with proper page breaks
 * @param {Object} reportsData - Reports data from getLeadConversionAnalytics and getKPIs/getCrossEntityAnalytics
 * @returns {Promise<Buffer>} PDF buffer
 */
export const generateReportsPDF = async (reportsData) => {
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
      // HEADER SECTION - Professional Design (matching dashboard)
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
        .text('Reports & Analytics Overview', margin + 18, headerY + 16);

      // Subtitle
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#A8DADC')
        .text('Composable analytics powered by Mongo aggregations. Track lead conversion rates and sales performance.', margin + 18, headerY + 42, {
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
      // METRIC CARDS SECTION - 2x2 Grid (matching dashboard)
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
      const totalLeads = reportsData.totalLeads || 0;
      const conversionRate = reportsData.overallConversionRate || 0;
      const totalDeals = reportsData.dealsByStage?.reduce((sum, item) => sum + item.count, 0) || 0;
      const avgTimeToConvert = reportsData.avgTimeToConversion || 0;

      const metrics = [
        {
          label: 'Total Leads',
          value: totalLeads,
          format: 'number',
          subtitle: `${reportsData.convertedLeads || 0} converted`,
        },
        {
          label: 'Conversion Rate',
          value: conversionRate,
          format: 'percentage',
          subtitle: 'Overall rate',
        },
        {
          label: 'Total Deals',
          value: totalDeals,
          format: 'number',
          subtitle: `${reportsData.dealsByStage?.reduce((sum, item) => sum + item.totalValue, 0) || 0} value`,
        },
        {
          label: 'Avg. Time to Convert',
          value: avgTimeToConvert,
          format: 'days',
          subtitle: 'Days average',
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
        } else if (metrics[i].format === 'days') {
          valueText = `${metrics[i].value} days`;
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
      // PAGE 1: LEAD CONVERSION FUNNEL (Full Width)
      // ============================================
      const funnel = reportsData.funnel || { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 };
      const funnelChartData = [
        { name: 'New', value: funnel.new },
        { name: 'Contacted', value: funnel.contacted },
        { name: 'Qualified', value: funnel.qualified },
        { name: 'Converted', value: funnel.converted },
        { name: 'Lost', value: funnel.lost },
      ];
      
      const horizontalBarChartHeight = getHorizontalBarChartHeight(funnelChartData);
      const titleHeight = 38; // Title + subtitle (matching dashboard)
      const separatorHeight = 15;
      const explanationHeight = 80; // Approximate height for explanation with numbered points
      // Legend is now included in horizontalBarChartHeight, so no need to add separately
      const funnelTotalHeight = separatorHeight + titleHeight + horizontalBarChartHeight + explanationHeight + 20;

      // Check if ENTIRE section (title + chart + explanation) fits on current page
      // If not, add new page BEFORE drawing anything
      if (currentY + funnelTotalHeight > pageHeight - footerHeight) {
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

      // Section title (matching dashboard format)
      drawSectionTitle(doc, 'Lead Conversion Funnel', 'Visual progression through lead stages', margin, currentY, contentWidth);
      currentY += titleHeight;

      // Draw horizontal bar chart (legend is now included in the chart function)
      try {
        const usedHeight = drawHorizontalBarChart(doc, funnelChartData, margin, currentY, contentWidth, horizontalBarChartHeight);
        currentY += usedHeight + 10; // Reduced spacing
      } catch (error) {
        console.error('Error drawing horizontal bar chart:', error);
        doc.fontSize(10)
          .font('Helvetica')
          .fillColor('#94A3B8')
          .text('Unable to generate chart. Please try again.', margin, currentY);
        currentY += 30;
      }

      // Draw explanation
      const funnelExplanation = generateFunnelExplanation(funnel);
      const explanationHeightUsed = drawExplanation(doc, funnelExplanation, margin, currentY, contentWidth);
      currentY += explanationHeightUsed + 10; // Reduced spacing

      // ============================================
      // PAGE 2: DEALS BY STAGE (Full Width)
      // ============================================
      doc.addPage();
      currentY = margin;

      const dealsByStage = reportsData.dealsByStage || [];
      const pieChartHeight = getPieChartHeight(dealsByStage);
      const pieChartExplanationHeight = 90; // Approximate height for deals explanation
      const pieChartTotalHeight = separatorHeight + titleHeight + pieChartHeight + pieChartExplanationHeight + 10;

      // Separator line
      doc.moveTo(margin, currentY)
        .lineTo(margin + contentWidth, currentY)
        .strokeColor('#E2E8F0')
        .lineWidth(1)
        .stroke();
      currentY += separatorHeight;

      // Section title (matching dashboard format)
      drawSectionTitle(doc, 'Deals by Stage', 'Deal distribution across pipeline stages', margin, currentY, contentWidth);
      currentY += titleHeight;

      // Draw pie chart
      try {
        const usedHeight = drawPieChart(doc, dealsByStage, margin, currentY, contentWidth, pieChartHeight);
        currentY += usedHeight + 10; // Reduced spacing
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
      currentY += dealsExplanationHeightUsed + 8; // Reduced spacing to ensure bar chart fits on page 2

      // ============================================
      // PAGE 2: CONVERSION RATE BY SOURCE (Full Width)
      // ============================================
      const conversionBySource = reportsData.conversionBySource || [];
      const conversionBarChartHeight = getConversionRateBarChartHeight(conversionBySource);
      const conversionExplanationHeight = 100; // Approximate height for source explanation
      const conversionTotalHeight = separatorHeight + titleHeight + conversionBarChartHeight + conversionExplanationHeight + 10;

      // Check if entire section fits on current page, if not move to page 3
      if (currentY + conversionTotalHeight > pageHeight - footerHeight) {
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

      // Section title (matching dashboard format)
      drawSectionTitle(doc, 'Conversion Rate by Source', 'Compare conversion performance across lead sources', margin, currentY, contentWidth);
      currentY += titleHeight;

      // Draw conversion rate bar chart (includes legend in the function)
      try {
        const usedHeight = drawConversionRateBarChart(doc, conversionBySource, margin, currentY, contentWidth, conversionBarChartHeight);
        currentY += usedHeight + 10; // Reduced spacing
      } catch (error) {
        console.error('Error drawing conversion rate bar chart:', error);
        doc.fontSize(10)
          .font('Helvetica')
          .fillColor('#94A3B8')
          .text('Unable to generate chart. Please try again.', margin, currentY);
        currentY += 30;
      }

      // Always draw explanation
      let sourceExplanation = generateConversionBySourceExplanation(conversionBySource);
      if (!sourceExplanation || sourceExplanation.length === 0) {
        sourceExplanation = ['No analysis available for conversion rates by source.'];
      }
      
      // Draw the explanation box
      const sourceExplanationHeightUsed = drawExplanation(doc, sourceExplanation, margin, currentY, contentWidth);
      currentY += sourceExplanationHeightUsed + 10; // Reduced spacing

      // No need for separate footer loop - PDFKit will handle on doc.end()
      doc.end();
    } catch (error) {
      reject(new Error(`PDF generation failed: ${error.message}`));
    }
  });
};
