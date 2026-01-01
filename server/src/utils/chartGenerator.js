// Vibrant chart color palette - professionally designed for PDF export
// Inspired by card aesthetic with bold, distinct colors for maximum visual impact

const STAGE_COLORS = {
    'Prospecting': '#3B82F6',      // Bright Blue
    'Qualification': '#A855F7',    // Purple (updated to match requirements)
    'Proposal': '#10B981',         // Emerald Green
    'Negotiation': '#F59E0B',      // Orange/Amber
    'Closed Won': '#34D399',       // Light Green (updated to match requirements)
    'Closed Lost': '#EF4444',      // Red
  };
  
  const SOURCE_COLORS = {
    'social': '#10B981',           // Green (30.0%)
    'website': '#3B82F6',          // Blue (23.5%)
    'phone': '#EC4899',            // Pink (20.0%)
    'other': '#6B7280',            // Gray (16.7%)
    'referral': '#F59E0B',         // Orange (10.5%)
    'email': '#A855F7',            // Purple (9.1%)
  };
  
  const getSourceColor = (source) => {
    return SOURCE_COLORS[source.toLowerCase()] || SOURCE_COLORS.other;
  };
  
  /**
   * Apply fill color to PDF document with guaranteed rendering
   * Uses hex string directly for PDFKit compatibility and ensures opacity is properly set
   * @returns {string} The hex color used
   */
  const applyFillColor = (doc, colorHex) => {
    // Reset any previous opacity settings
    doc.fillOpacity(1);
    // Set color using hex string (PDFKit supports this directly)
    doc.fillColor(colorHex);
    return colorHex;
  };
  
  /**
   * Draw a donut segment with vibrant colors, white borders, and drop shadow
   * Color set BEFORE path construction for reliable state application
   */
  const drawDonutSegment = (doc, centerX, centerY, innerRadius, outerRadius, startAngle, endAngle, colorHex, withShadow = true) => {
    if (withShadow) {
      // Draw soft drop shadow (offset 2pt, gray with low opacity)
      doc.save();
      doc.fillOpacity(0.12);
      doc.fillColor('#000000');
      const shadowOffset = 2;
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      // Draw shadow arc using path
      doc.moveTo(centerX + shadowOffset + Math.cos(startRad) * innerRadius, centerY + shadowOffset + Math.sin(startRad) * innerRadius);
      doc.arc(centerX + shadowOffset, centerY + shadowOffset, outerRadius, startAngle, endAngle, false);
      doc.arc(centerX + shadowOffset, centerY + shadowOffset, innerRadius, endAngle, startAngle, true);
      doc.closePath().fill();
      doc.restore();
    }
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const angleDiff = endRad - startRad;
  
    // Calculate start and end points
    const innerStartX = centerX + Math.cos(startRad) * innerRadius;
    const innerStartY = centerY + Math.sin(startRad) * innerRadius;
    const outerStartX = centerX + Math.cos(startRad) * outerRadius;
    const outerStartY = centerY + Math.sin(startRad) * outerRadius;
    const outerEndX = centerX + Math.cos(endRad) * outerRadius;
    const outerEndY = centerY + Math.sin(endRad) * outerRadius;
    const innerEndX = centerX + Math.cos(endRad) * innerRadius;
    const innerEndY = centerY + Math.sin(endRad) * innerRadius;
  
    // Apply fill color BEFORE building path
    applyFillColor(doc, colorHex);
  
    // Build path for the segment
    doc.save();
    
    // Start from inner edge
    doc.moveTo(innerStartX, innerStartY);
    // Line to outer edge
    doc.lineTo(outerStartX, outerStartY);
    
    // Draw outer arc using small line segments for smooth curves
    const arcSegments = Math.max(16, Math.ceil(Math.abs(angleDiff) * 180 / Math.PI / 2));
    for (let i = 1; i <= arcSegments; i++) {
      const t = i / arcSegments;
      const angle = startRad + angleDiff * t;
      const x = centerX + Math.cos(angle) * outerRadius;
      const y = centerY + Math.sin(angle) * outerRadius;
      doc.lineTo(x, y);
    }
    
    // Line to inner edge
    doc.lineTo(innerEndX, innerEndY);
    
    // Draw inner arc (reverse direction)
    for (let i = arcSegments - 1; i >= 0; i--) {
      const t = i / arcSegments;
      const angle = startRad + angleDiff * t;
      const x = centerX + Math.cos(angle) * innerRadius;
      const y = centerY + Math.sin(angle) * innerRadius;
      doc.lineTo(x, y);
    }
    
    // Close the path
    doc.closePath();
  
    // Fill with pre-set color
    doc.fill();
  
    // Add bold white border for visual separation - set stroke before second path
    doc.strokeColor('#FFFFFF');
    doc.strokeOpacity(1);
    doc.lineWidth(3);
    // Re-draw path for stroking (simple for vectors)
    doc.moveTo(innerStartX, innerStartY);
    doc.lineTo(outerStartX, outerStartY);
    for (let i = 1; i <= arcSegments; i++) {
      const t = i / arcSegments;
      const angle = startRad + angleDiff * t;
      const x = centerX + Math.cos(angle) * outerRadius;
      const y = centerY + Math.sin(angle) * outerRadius;
      doc.lineTo(x, y);
    }
    doc.lineTo(innerEndX, innerEndY);
    for (let i = arcSegments - 1; i >= 0; i--) {
      const t = i / arcSegments;
      const angle = startRad + angleDiff * t;
      const x = centerX + Math.cos(angle) * innerRadius;
      const y = centerY + Math.sin(angle) * innerRadius;
      doc.lineTo(x, y);
    }
    doc.closePath();
    doc.stroke();
  
    doc.restore();
  };
  
  /**
   * Calculate the height needed for pie chart (for page break calculations)
   */
  export const getPieChartHeight = (data) => {
    const chartData = data.filter((item) => item.count > 0);
    if (chartData.length === 0) return 50;
    
    const titleHeight = 30; // Title "Total: X Deals | $X"
    const chartAreaHeight = 180; // Pie chart area (radius 80pt + padding)
    const legendHeight = chartData.length * 28 + 10; // Dynamic legend height (28pt per item)
    
    return titleHeight + Math.max(chartAreaHeight, legendHeight) + 20; // Max of chart or legend + padding
  };
  
  /**
   * Calculate the height needed for bar chart (for page break calculations)
   */
  export const getBarChartHeight = (data) => {
    if (!data || data.length === 0) return 50;
    
    const titleHeight = 35;
    const chartAreaHeight = 180;
    const labelsHeight = 45;
    const legendHeight = 50;
    
    return titleHeight + chartAreaHeight + labelsHeight + legendHeight;
  };
  
  /**
   * Draw filled rectangle with separate fill and stroke for reliable coloring
   */
  const drawColoredRect = (doc, x, y, width, height, fillColorHex, strokeColorHex = null, lineWidth = 1) => {
    // Fill
    applyFillColor(doc, fillColorHex);
    doc.rect(x, y, width, height).fill();
  
    // Stroke if specified
    if (strokeColorHex) {
      doc.strokeColor(strokeColorHex);
      doc.lineWidth(lineWidth);
      doc.rect(x, y, width, height).stroke();
    }
  };
  
  /**
   * Draw pie chart directly in PDF document for Deals by Stage
   * With vibrant colors and improved text readability
   * @returns {number} Actual height used
   */
  /**
   * Draw pie chart for Deals by Stage - Professional Dashboard Quality
   * @returns {number} Actual height used
   */
  export const drawPieChart = (doc, data, x, y, width, height) => {
    // Filter out stages with 0 count
    const chartData = data.filter((item) => item.count > 0);
  
    if (chartData.length === 0) {
      doc.fillOpacity(1);
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#94A3B8')
        .text('No deals data available', x, y + 20, { align: 'center', width });
      return 50;
    }
  
    // Calculate totals
    const totalDeals = chartData.reduce((sum, item) => sum + item.count, 0);
    const totalValue = chartData.reduce((sum, item) => sum + item.totalValue, 0);
  
    // Professional dimensions - pie at 50% width, legend at 60%+
    const chartAreaWidth = width * 0.4; // 40% for pie chart
    const chartPadding = 10;
    const centerX = x + chartAreaWidth / 2;
    const radius = 80; // Full radius ~80pt as specified
    const innerRadius = radius * 0.25; // Center hole for donut effect (20pt diameter)

    // Professional title - centered above pie, semi-bold 11pt
    const abbreviatedValue = totalValue >= 1000000 
      ? `$${(totalValue / 1000000).toFixed(2)}M`
      : totalValue >= 1000
      ? `$${(totalValue / 1000).toFixed(0)}K`
      : `$${totalValue.toFixed(0)}`;
    
    // Measure title height dynamically to prevent overlap
    const titleText = `Total: ${totalDeals} Deals | ${abbreviatedValue}`;
    doc.fontSize(11)
      .font('Helvetica-Bold');
    const titleHeight = doc.heightOfString(titleText, { width: chartAreaWidth });
    
    // Minimum top padding between title and chart
    const chartTopPadding = 15; // Minimum space between title and chart
    
    // Calculate centerY dynamically: title starts at y+3, add title height, padding, and radius
    // This ensures donut top (centerY - radius) doesn't overlap with title
    const centerY = y + 3 + titleHeight + chartTopPadding + radius;
    
    doc.fillOpacity(1);
    doc.fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#475569')
      .text(
        titleText,
        x,
        y + 3,
        { align: 'center', width: chartAreaWidth }
      );
  
    // Calculate angles for each segment
    let currentAngle = -90; // Start from top
    const segments = [];
  
    chartData.forEach((item) => {
      const percentage = item.count / totalDeals;
      const angle = percentage * 360;
      segments.push({
        ...item,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        percentage: percentage * 100,
      });
      currentAngle += angle;
    });
  
    // Draw each segment with professional styling (shadows, borders)
    segments.forEach((segment) => {
      const color = STAGE_COLORS[segment.stage] || '#9CA3AF';
      drawDonutSegment(doc, centerX, centerY, innerRadius, radius, segment.startAngle, segment.endAngle, color, true);
    });
  
    // Draw center white circle with border
    doc.fillColor('#FFFFFF');
    doc.fillOpacity(1);
    doc.circle(centerX, centerY, innerRadius).fill();
    doc.strokeColor('#E2E8F0');
    doc.lineWidth(1);
    doc.circle(centerX, centerY, innerRadius).stroke();
  
    // Draw percentage labels outside slices with leader lines
    segments.forEach((segment) => {
      if (segment.percentage >= 3) { // Show label if >= 3%
        const midAngle = (segment.startAngle + segment.endAngle) / 2;
        const midAngleRad = (midAngle * Math.PI) / 180;
        
        // Calculate label position (10pt from edge)
        const labelRadius = radius + 10;
        const labelX = centerX + labelRadius * Math.cos(midAngleRad);
        const labelY = centerY + labelRadius * Math.sin(midAngleRad);
        
        // Draw leader line (dashed, from arc midpoint to label)
        const arcMidX = centerX + radius * Math.cos(midAngleRad);
        const arcMidY = centerY + radius * Math.sin(midAngleRad);
        
        doc.strokeColor('#E2E8F0');
        doc.lineWidth(0.5);
        doc.dash(3, 3);
        doc.moveTo(arcMidX, arcMidY)
          .lineTo(labelX, labelY)
          .stroke();
        doc.undash();
        
        // Draw percentage label - bold 10pt, #1E293B
        doc.fillOpacity(1);
        doc.fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#1E293B')
          .text(`${segment.percentage.toFixed(0)}%`, labelX - 15, labelY - 6, {
            width: 30,
            align: 'center',
          });
      }
    });
  
    // Professional vertical legend on the right - with subtle background
    const legendStartX = x + chartAreaWidth + 20;
    const legendStartY = y + 25;
    const legendWidth = width - (legendStartX - x) - 10;
    const legendItemHeight = 28;
    let legendItemY = legendStartY;
    
    // Draw subtle legend background (#F8FAFC)
    const legendBackgroundHeight = segments.length * legendItemHeight + 10;
    doc.rect(legendStartX - 5, legendStartY - 5, legendWidth + 10, legendBackgroundHeight)
      .fillColor('#F8FAFC')
      .fill();
    
    segments.forEach((segment) => {
      const color = STAGE_COLORS[segment.stage] || '#9CA3AF';
  
      // Color swatch - 12x12pt with 1pt #64748B border
      doc.rect(legendStartX, legendItemY, 12, 12)
        .fillColor(color)
        .fill();
      doc.rect(legendStartX, legendItemY, 12, 12)
        .lineWidth(1)
        .strokeColor('#64748B')
        .stroke();
  
      // Stage name and count - Helvetica 9pt, #64748B, right-aligned
      const labelText = `${segment.stage} ${segment.count} (${segment.percentage.toFixed(1)}%)`;
      doc.fillOpacity(1);
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#64748B')
        .text(labelText, legendStartX + 16, legendItemY + 2, {
          width: legendWidth - 16,
          align: 'left',
        });
  
      legendItemY += legendItemHeight;
    });
  
    // Return actual height used (title + chart + legend)
    const chartBottom = centerY + radius + 15;
    const legendBottom = legendStartY + segments.length * legendItemHeight;
    const actualHeight = Math.max(chartBottom - y, legendBottom - y) + 10;
    return actualHeight;
  };
  
  /**
   * Draw bar chart directly in PDF document for Leads by Source
   * With vibrant colors and improved text readability
   * @returns {number} Actual height used
   */
  export const drawBarChart = (doc, data, x, y, width, height) => {
    if (!data || data.length === 0) {
      doc.fillOpacity(1);
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#94A3B8')
        .text('No leads data available', x, y + 20, { align: 'center', width });
      return 50;
    }
  
    // Calculate total
    const total = data.reduce((sum, item) => sum + item.count, 0);
  
    // Sort data by count (descending)
    const sortedData = [...data].sort((a, b) => b.count - a.count);
  
    // Title - larger and more prominent with guaranteed readability
    doc.fillOpacity(1);
    doc.fontSize(13)
      .font('Helvetica-Bold')
      .fillColor('#1E293B')
      .text(`Total: ${total} Leads`, x, y + 3, {
        align: 'center',
        width: width,
      });
  
    // Chart area dimensions
    const chartMarginLeft = 45;
    const chartMarginRight = 20;
    const chartX = x + chartMarginLeft;
    const chartY = y + 30;
    const chartWidth = width - chartMarginLeft - chartMarginRight;
    const maxBarHeight = 150;
    const barSpacing = 10;
    const availableWidth = chartWidth - (sortedData.length - 1) * barSpacing;
    const barWidth = Math.min(50, Math.max(30, availableWidth / sortedData.length));
  
    // Find max count for scaling
    const maxCount = Math.max(...sortedData.map((item) => item.count), 1);
  
    // Draw bars with vibrant colors - color set before shape
    sortedData.forEach((item, index) => {
      const barX = chartX + index * (barWidth + barSpacing);
      const barHeight = (item.count / maxCount) * maxBarHeight;
      const barY = chartY + maxBarHeight - barHeight;
  
      // Get vibrant color
      const color = getSourceColor(item.source);
  
      // Draw bar with full vibrant color intensity - separate fill and stroke
      drawColoredRect(doc, barX, barY, barWidth, barHeight, color, '#FFFFFF', 2);
  
      // Value label above bar - bold and very dark for readability
      if (barHeight > 15) {
        doc.fillOpacity(1);
        doc.fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#0F172A')  // Very dark for maximum readability
          .text(item.count.toString(), barX, barY - 16, {
            align: 'center',
            width: barWidth,
          });
      }
  
      // Source name below chart - bold and dark
      const sourceName = item.source
        ? item.source.charAt(0).toUpperCase() + item.source.slice(1)
        : 'Other';
      
      doc.fillOpacity(1);
      doc.fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')  // Very dark for maximum readability
        .text(sourceName, barX, chartY + maxBarHeight + 6, {
          align: 'center',
          width: barWidth,
        });
  
      // Percentage below source name - readable dark gray
      const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0';
      doc.fillOpacity(1);
      doc.fontSize(8)
        .font('Helvetica')
        .fillColor('#334155')  // Dark gray for good readability
        .text(`${percentage}%`, barX, chartY + maxBarHeight + 20, {
          align: 'center',
          width: barWidth,
        });
    });
  
    // Draw axes with darker color for better visibility
    // Y-axis line
    doc.strokeColor('#1E293B');
    doc.lineWidth(1.5);
    doc.moveTo(chartX - 3, chartY)
      .lineTo(chartX - 3, chartY + maxBarHeight + 2)
      .stroke();
  
    // X-axis line
    doc.moveTo(chartX - 3, chartY + maxBarHeight + 2)
      .lineTo(chartX + chartWidth, chartY + maxBarHeight + 2)
      .stroke();
  
    // Y-axis labels and grid lines
    const yAxisSteps = 4;
    for (let i = 0; i <= yAxisSteps; i++) {
      const value = Math.round((maxCount / yAxisSteps) * i);
      const yPos = chartY + maxBarHeight - (maxBarHeight / yAxisSteps) * i;
  
      // Grid line (subtle dashed)
      if (i > 0 && i < yAxisSteps) {
        doc.strokeColor('#E5E7EB');
        doc.lineWidth(0.5);
        doc.dash(3, 3);  // Fixed: proper dash pattern (on 3, off 3)
        doc.moveTo(chartX, yPos)
          .lineTo(chartX + chartWidth - 5, yPos)
          .stroke();
        doc.undash(); // Reset dash
      }
  
      // Y-axis label - readable and bold
      doc.fillOpacity(1);
      doc.fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#334155')
        .text(value.toString(), x + 5, yPos - 4, { align: 'right', width: 35 });
    }
  
    // Legend below chart - enhanced styling with readable heading
    const legendY = chartY + maxBarHeight + 38;
    const legendX = x + 45;
    
    // Legend title - FIXED: Larger, darker, more readable, positioned to avoid overlap
    doc.fillOpacity(1);
    doc.fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#0F172A')  // Very dark for maximum contrast
      .text('Lead Sources', legendX, legendY);
  
    let legendItemX = legendX + 75;
    let legendItemY = legendY + 18; // More spacing after title
    let itemCount = 0;
  
    sortedData.forEach((item) => {
      if (itemCount > 0 && itemCount % 3 === 0) {
        legendItemX = legendX + 80;
        legendItemY += 18;
      }
  
      const color = getSourceColor(item.source);
      const sourceName = item.source ? item.source.charAt(0).toUpperCase() + item.source.slice(1) : 'Other';
  
      // Larger color box for better visibility with vibrant colors - using separate fill/stroke
      drawColoredRect(doc, legendItemX, legendItemY, 14, 14, color, '#FFFFFF', 1);
  
      // Source name - readable dark text
      doc.fillOpacity(1);
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#334155')  // Dark gray for good readability
        .text(sourceName, legendItemX + 17, legendItemY + 3, {
          width: 55,
        });
  
      legendItemX += 90;
      itemCount++;
    });
  
    // Calculate legend rows
    const legendRows = Math.ceil(sortedData.length / 3);
    const actualHeight = legendY + (legendRows * 18) + 10 - y;
    
    return actualHeight;
  };

  /**
   * Funnel stage colors for Lead Conversion Funnel
   */
  const FUNNEL_STAGE_COLORS = {
    'New': '#3B82F6',        // Bright Blue
    'Contacted': '#F59E0B',  // Amber
    'Qualified': '#10B981',  // Emerald Green
    'Converted': '#34D399',   // Light Green (as per requirement)
    'Lost': '#EF4444',       // Red
  };

  const getFunnelStageColor = (stage) => {
    return FUNNEL_STAGE_COLORS[stage] || '#6B7280';
  };

  /**
   * Calculate the height needed for horizontal bar chart (for page break calculations)
   * Includes: title, chart area, axes, and legend
   */
  export const getHorizontalBarChartHeight = (data) => {
    if (!data || data.length === 0) return 50;
    
    const titleHeight = 25; // Title "Total: X Leads"
    const barHeight = 20; // Fixed bar height
    const barSpacing = 8; // Spacing between bars
    const chartAreaHeight = data.length * barHeight + (data.length - 1) * barSpacing; // Dynamic based on data
    const axisHeight = 20; // X-axis line, ticks, and labels
    const legendHeight = 40; // Horizontal legend below chart
    
    return titleHeight + chartAreaHeight + axisHeight + legendHeight;
  };

  /**
   * Calculate the height needed for conversion rate bar chart (for page break calculations)
   */
  export const getConversionRateBarChartHeight = (data) => {
    if (!data || data.length === 0) return 50;
    
    const validData = data.filter((item) => item.total > 0);
    if (validData.length === 0) return 50;
    
    const titleHeight = 25; // Title "Total: X Leads | X Converted"
    const subtitleHeight = 15; // Subtitle "Compare conversion performance..."
    const chartAreaHeight = 180; // Bar chart area (maxBarHeight - increased for wider bars/spacing)
    const labelsHeight = 30; // X-axis labels (single-line source name + converted/total)
    const leadSourcesSubtitleHeight = 12; // "Lead Sources" subtitle
    const legendHeight = 35; // Horizontal legend below chart (increased for better spacing)
    const padding = 20; // Vertical padding between sections
    
    return titleHeight + subtitleHeight + chartAreaHeight + labelsHeight + leadSourcesSubtitleHeight + legendHeight + padding;
    
    return titleHeight + chartAreaHeight + labelsHeight + legendHeight;
  };

  /**
   * Draw rounded rectangle with optional shadow for professional bar styling
   * @param {PDFDocument} doc - PDF document
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {string} fillColor - Fill color hex
   * @param {number} radius - Corner radius in points
   * @param {boolean} withShadow - Whether to add drop shadow
   */
  const drawRoundedRect = (doc, x, y, width, height, fillColor, radius = 3, withShadow = true) => {
    if (withShadow) {
      // Draw soft drop shadow (offset 2pt down and right, gray with opacity)
      doc.save();
      doc.fillOpacity(0.15);
      doc.fillColor('#000000');
      const shadowOffset = 2;
      doc.roundedRect(x + shadowOffset, y + shadowOffset, width, height, radius).fill();
      doc.restore();
    }

    // Draw rounded rectangle with fill
    applyFillColor(doc, fillColor);
    doc.roundedRect(x, y, width, height, radius).fill();

    // Draw white border
    doc.strokeColor('#FFFFFF');
    doc.lineWidth(1);
    doc.roundedRect(x, y, width, height, radius).stroke();
  };

  /**
   * Draw horizontal bar chart for Lead Conversion Funnel - Professional Dashboard Quality
   * @returns {number} Actual height used
   */
  export const drawHorizontalBarChart = (doc, data, x, y, width, height) => {
    if (!data || data.length === 0) {
      doc.fillOpacity(1);
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#94A3B8')
        .text('No data available', x, y + 20, { align: 'center', width });
      return 50;
    }

    // Calculate total
    const total = data.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
      doc.fillOpacity(1);
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#94A3B8')
        .text('No leads data available', x, y + 20, { align: 'center', width });
      return 50;
    }

    // Professional title styling - centered, semi-bold
    doc.fillOpacity(1);
    doc.fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#475569')
      .text(`Total: ${total} Leads`, x, y + 3, {
        align: 'center',
        width: width,
      });

    // Chart area dimensions - professional spacing
    const chartPadding = 10; // Padding around chart edges
    const chartMarginLeft = 85; // Space for Y-axis labels (8pt padding + label width)
    const chartMarginRight = 95; // Space for value labels (5pt gap + 80pt label + 10pt padding)
    const chartX = x + chartMarginLeft;
    const chartY = y + 25; // Space for title
    // Use 80% of available width for bars to prevent overflow
    const effectiveWidth = width - chartMarginLeft - chartMarginRight;
    const chartWidth = Math.floor(effectiveWidth * 0.80); // 80% max width for responsive scaling
    
    // Bar dimensions - professional sizing
    const barHeight = 20; // Fixed 20pt height as specified
    const barSpacing = 8; // 8pt vertical spacing between bars
    const barRadius = 3; // 3pt rounded corners
    
    // Calculate total chart area height needed
    const totalBarsHeight = data.length * barHeight + (data.length - 1) * barSpacing;
    const chartAreaHeight = totalBarsHeight;

    // Find max value for scaling bars
    const maxValue = Math.max(...data.map((item) => item.value), 1);

    // Draw horizontal gridlines for readability (faint)
    data.forEach((item, index) => {
      const barY = chartY + index * (barHeight + barSpacing) + barHeight / 2;
      doc.strokeColor('#F1F5F9');
      doc.lineWidth(0.5);
      doc.moveTo(chartX, barY)
        .lineTo(chartX + chartWidth, barY)
        .stroke();
    });

    // Draw bars with professional styling
    data.forEach((item, index) => {
      const barY = chartY + index * (barHeight + barSpacing);
      const barWidth = Math.min((item.value / maxValue) * chartWidth, chartWidth);
      const barX = chartX;

      // Get vibrant color matching requirements
      const color = getFunnelStageColor(item.name);

      // Draw bar with rounded corners, border, and shadow
      drawRoundedRect(doc, barX, barY, barWidth, barHeight, color, barRadius, true);

      // Value label - right-aligned, 5pt from bar end, bold 10pt
      const labelX = barX + barWidth + 5; // 5pt gap from bar end
      if (barWidth > 15 && labelX + 80 <= x + width) { // Only draw if bar is visible and label fits
        doc.fillOpacity(1);
        doc.fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#1E293B')
          .text(`${item.value} (${((item.value / total) * 100).toFixed(1)}%)`, labelX, barY + 5, {
            width: 80,
            align: 'left',
          });
      }

      // Y-axis label - left-aligned, bold 10pt, 8pt left padding
      doc.fillOpacity(1);
      doc.fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#1E293B')
        .text(item.name, x + 8, barY + 5, {
          width: chartMarginLeft - 16,
          align: 'left',
        });
    });

    // Draw X-axis line - professional styling
    doc.strokeColor('#E2E8F0');
    doc.lineWidth(1);
    const axisY = chartY + chartAreaHeight + 2;
    doc.moveTo(chartX, axisY)
      .lineTo(chartX + chartWidth, axisY)
      .stroke();

    // X-axis ticks and labels - every 4 units (0, 4, 8, 12, 16, 20)
    const tickInterval = 4;
    const maxTickValue = Math.ceil(maxValue / tickInterval) * tickInterval;
    const numTicks = Math.floor(maxTickValue / tickInterval) + 1;

    for (let i = 0; i < numTicks; i++) {
      const value = i * tickInterval;
      if (value > maxValue) break;
      
      const xPos = chartX + (value / maxValue) * chartWidth;

      // Draw tick mark (3pt vertical line down from axis)
      doc.strokeColor('#E2E8F0');
      doc.lineWidth(1);
      doc.moveTo(xPos, axisY)
        .lineTo(xPos, axisY + 3)
        .stroke();

      // X-axis label - Helvetica 9pt, #64748B, centered
      doc.fillOpacity(1);
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#64748B')
        .text(value.toString(), xPos - 10, axisY + 6, {
          width: 20,
          align: 'center',
        });
    }

    // Draw horizontal legend below chart - professional styling
    const legendY = axisY + 25; // Space after axis
    const legendItemSpacing = 15; // Spacing between legend items
    const swatchSize = 12; // 12x12pt color swatches
    const swatchLabelGap = 4; // 4pt gap between swatch and label
    let legendX = x + (width - (data.length * (swatchSize + swatchLabelGap + 60))) / 2; // Center legend

    data.forEach((item) => {
      const color = getFunnelStageColor(item.name);

      // Draw color swatch with 1pt black border
      doc.rect(legendX, legendY, swatchSize, swatchSize)
        .fillColor(color)
        .fill();
      doc.rect(legendX, legendY, swatchSize, swatchSize)
        .lineWidth(1)
        .strokeColor('#000000')
        .stroke();

      // Draw label - Helvetica 9pt, #64748B
      doc.fillOpacity(1);
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#64748B')
        .text(item.name, legendX + swatchSize + swatchLabelGap, legendY + 2, {
          width: 50,
        });

      legendX += swatchSize + swatchLabelGap + 60; // Move to next item
    });

    // Return actual height used (title + chart + axis + legend)
    const legendHeight = 40; // ~40pt for legend
    const actualHeight = (chartY - y) + chartAreaHeight + 20 + legendHeight; // 20pt for axis and spacing
    return actualHeight;
  };

  /**
   * Draw rounded rectangle with top rounded corners for vertical bars
   */
  const drawRoundedTopRect = (doc, x, y, width, height, fillColor, radius = 3, withShadow = true) => {
    if (withShadow && height > 0) {
      // Draw soft drop shadow (offset 2pt down and right, gray with opacity)
      doc.save();
      doc.fillOpacity(0.2);
      doc.fillColor('#000000');
      const shadowOffset = 2;
      doc.roundedRect(x + shadowOffset, y + shadowOffset, width, height, radius).fill();
      doc.restore();
    }

    // Draw rounded rectangle with fill (all corners rounded for simplicity)
    applyFillColor(doc, fillColor);
    doc.roundedRect(x, y, width, height, radius).fill();

    // Draw white border
    doc.strokeColor('#FFFFFF');
    doc.lineWidth(1);
    doc.roundedRect(x, y, width, height, radius).stroke();
  };

  /**
   * Helper: Calculate text width to prevent overlaps
   */
  const calculateTextFit = (doc, text, fontSize, maxWidth) => {
    doc.fontSize(fontSize);
    const textWidth = doc.widthOfString(text);
    if (textWidth > maxWidth && fontSize > 8) {
      return calculateTextFit(doc, text, fontSize - 1, maxWidth);
    }
    return fontSize;
  };

  /**
   * Helper: Fit text to width, return optimal font size and text (with ellipsis if needed)
   */
  const fitTextWidth = (doc, text, maxWidth, minFontSize = 8, preferredFontSize = 9) => {
    let fontSize = preferredFontSize;
    doc.fontSize(fontSize);
    let textWidth = doc.widthOfString(text);
    
    // Try reducing font size first
    while (textWidth > maxWidth && fontSize > minFontSize) {
      fontSize--;
      doc.fontSize(fontSize);
      textWidth = doc.widthOfString(text);
    }
    
    // If still too wide, add ellipsis
    if (textWidth > maxWidth && fontSize === minFontSize) {
      const ellipsis = '...';
      doc.fontSize(fontSize);
      const ellipsisWidth = doc.widthOfString(ellipsis);
      let truncatedText = text;
      while (doc.widthOfString(truncatedText + ellipsis) > maxWidth && truncatedText.length > 0) {
        truncatedText = truncatedText.slice(0, -1);
      }
      return { fontSize, text: truncatedText + ellipsis };
    }
    
    return { fontSize, text };
  };

  /**
   * Draw conversion rate bar chart for Conversion Rate by Source - Professional Dashboard Quality
   * Completely restructured to ensure proper spacing and alignment
   * @returns {number} Actual height used
   */
  export const drawConversionRateBarChart = (doc, data, x, y, width, height) => {
    if (!data || data.length === 0) {
      doc.fillOpacity(1);
      doc.fontSize(12)
        .font('Helvetica')
        .fillColor('#94A3B8')
        .text('No conversion data available', x, y + 20, { align: 'center', width });
      return 50;
    }

    // Filter out sources with zero total
    const validData = data.filter((item) => item.total > 0);

    if (validData.length === 0) {
      doc.fillOpacity(1);
      doc.fontSize(12)
        .font('Helvetica')
        .fillColor('#94A3B8')
        .text('No conversion data available', x, y + 20, { align: 'center', width });
      return 50;
    }

    // Sort data by conversion rate (descending)
    const sortedData = [...validData].sort((a, b) => b.rate - a.rate);

    // Calculate totals
    const totalLeads = sortedData.reduce((sum, item) => sum + item.total, 0);
    const totalConverted = sortedData.reduce((sum, item) => sum + item.converted, 0);

    // ============================================
    // TITLE AND SUBTITLE
    // ============================================
    const titleText = `Total: ${totalLeads} Leads | ${totalConverted} Converted`;
    doc.fillOpacity(1);
    doc.fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#475569')
      .text(titleText, x, y + 3, {
        align: 'center',
        width: width,
      });

    const subtitleText = 'Compare conversion performance across lead sources';
    const titleHeight = doc.heightOfString(titleText, { width: width });
    doc.fillOpacity(1);
    doc.fontSize(9)
      .font('Helvetica-Oblique')
      .fillColor('#64748B')
      .text(subtitleText, x, y + 3 + titleHeight + 4, {
        align: 'center',
        width: width,
      });

    // ============================================
    // CHART AREA SETUP
    // ============================================
    const chartMarginLeft = 50; // Space for Y-axis labels
    const chartMarginRight = 20; // Space for potential overflow
    const chartX = x + chartMarginLeft; // Y-axis line position
    const chartY = y + 25 + titleHeight + 8; // Start of chart area
    const chartWidth = width - chartMarginLeft - chartMarginRight;
    
    // Bar dimensions
    const maxBarHeight = 180;
    const barWidth = 30;
    const barSpacing = 25;
    const barInset = 37; // CRITICAL: Horizontal spacing between Y-axis and first bar (increased 50% for better visibility)
    
    // Calculate bar area (where bars actually start)
    const barAreaStartX = chartX + barInset; // Bars start here, not at chartX
    const totalBarsWidth = sortedData.length * barWidth + (sortedData.length - 1) * barSpacing;
    const barAreaEndX = barAreaStartX + totalBarsWidth;

    // ============================================
    // Y-AXIS SCALING
    // ============================================
    const maxDataRate = Math.max(...sortedData.map((item) => item.rate), 1);
    const bufferRate = Math.max(maxDataRate * 1.25, maxDataRate + 5);
    const maxRate = Math.ceil(bufferRate / 5) * 5; // Round up to nearest 5%

    // ============================================
    // CHART POSITIONING
    // ============================================
    const topPadding = 15; // Space at top for labels
    const baseY = chartY + topPadding + maxBarHeight; // Bottom of chart area

    // ============================================
    // DRAW GRIDLINES (from bar area start to end)
    // ============================================
    const yAxisSteps = Math.floor(maxRate / 5);
    for (let i = 0; i <= yAxisSteps; i++) {
      const value = i * 5;
      const yPos = baseY - (value / maxRate) * maxBarHeight;
      
      doc.strokeColor('#F1F5F9');
      doc.lineWidth(0.5);
      doc.moveTo(barAreaStartX, yPos) // Start from bar area, not chartX
        .lineTo(barAreaEndX, yPos) // End at bar area end
        .stroke();
    }

    // ============================================
    // DRAW BARS
    // ============================================
    sortedData.forEach((item, index) => {
      // Bar X position: shift bars only, not the axis - use direct calculation with barInset
      const barX = chartX + barInset + index * (barWidth + barSpacing);
      const barHeight = (item.rate / maxRate) * maxBarHeight;
      const barY = baseY - barHeight;

      // Get color
      const color = getSourceColor(item.source);

      // Draw bar
      drawRoundedTopRect(doc, barX, barY, barWidth, barHeight, color, 3, true);

      // Rate label above bar
      if (barHeight > 12) {
        const labelText = `${item.rate.toFixed(1)}%`;
        doc.fontSize(10);
        const labelHeight = doc.heightOfString(labelText, { width: barWidth });
        const labelClearance = 5;
        const labelY = barY - labelHeight - labelClearance;
        const minLabelY = chartY + 5;
        const finalLabelY = Math.max(labelY, minLabelY);
        
        doc.fillOpacity(1);
        doc.fontSize(10)
          .font('Helvetica-Bold')
          .fillColor('#1E293B')
          .text(labelText, barX, finalLabelY, {
            align: 'center',
            width: barWidth,
          });
      }

      // X-axis label below bar
      const sourceName = item.source
        ? item.source.charAt(0).toUpperCase() + item.source.slice(1)
        : 'Other';
      const xAxisLabelText = `${sourceName} ${item.converted}/${item.total}`;
      
      doc.fontSize(9);
      const labelFits = doc.widthOfString(xAxisLabelText) <= barWidth;
      const finalFontSize = labelFits ? 9 : 8;
      
      doc.fontSize(finalFontSize);
      const xLabelHeight = doc.heightOfString(xAxisLabelText, { width: barWidth });
      const xLabelY = baseY + 8;
      
      doc.fillOpacity(1);
      doc.fontSize(finalFontSize)
        .font('Helvetica-Bold')
        .fillColor('#1E293B')
        .text(xAxisLabelText, barX, xLabelY, {
          align: 'center',
          width: barWidth,
          continued: false,
        });
    });

    // ============================================
    // DRAW Y-AXIS LINE AND TICKS
    // ============================================
    const yAxisTop = chartY + topPadding;
    doc.strokeColor('#E2E8F0');
    doc.lineWidth(1);
    doc.moveTo(chartX, yAxisTop)
      .lineTo(chartX, baseY + 2)
      .stroke();

    // Y-axis ticks and labels
    for (let i = 0; i <= yAxisSteps; i++) {
      const value = i * 5;
      const yPos = baseY - (value / maxRate) * maxBarHeight;

      // Tick mark
      doc.strokeColor('#E2E8F0');
      doc.lineWidth(1);
      doc.moveTo(chartX, yPos)
        .lineTo(chartX + 3, yPos)
        .stroke();

      // Label
      doc.fillOpacity(1);
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#64748B')
        .text(`${value}%`, chartX - 8, yPos - 5, {
          width: 35,
          align: 'right',
        });
    }

    // ============================================
    // DRAW X-AXIS LINE (from bar area start to end)
    // ============================================
    const axisY = baseY + 2;
    doc.strokeColor('#E2E8F0');
    doc.lineWidth(1);
    doc.moveTo(barAreaStartX, axisY) // Start from bar area, not chartX
      .lineTo(barAreaEndX, axisY) // End at bar area end
      .stroke();

    // ============================================
    // X-AXIS LABELS AND SUBTITLE
    // ============================================
    doc.fontSize(9);
    const sampleSourceName = sortedData[0].source
      ? sortedData[0].source.charAt(0).toUpperCase() + sortedData[0].source.slice(1)
      : 'Other';
    const sampleLabel = `${sampleSourceName} ${sortedData[0].converted}/${sortedData[0].total}`;
    const xLabelsHeight = doc.heightOfString(sampleLabel, { width: barWidth });
    const xLabelsBottom = axisY + 8 + xLabelsHeight;

    // "Lead Sources" subtitle
    doc.fillOpacity(1);
    doc.fontSize(9)
      .font('Helvetica-Oblique')
      .fillColor('#64748B')
      .text('Lead Sources', x, xLabelsBottom + 8, {
        align: 'center',
        width: width,
      });

    // ============================================
    // LEGEND
    // ============================================
    const legendY = xLabelsBottom + 22;
    const swatchSize = 12;
    const swatchLabelGap = 5;
    const numItems = sortedData.length;
    const legendItemWidth = (width - 40) / numItems;
    const legendBgHeight = 20;
    const legendBgPadding = 6;
    
    // Legend background
    doc.roundedRect(x + 20 - legendBgPadding, legendY - legendBgPadding, width - 40 + legendBgPadding * 2, legendBgHeight + legendBgPadding * 2, 2)
      .fillColor('#F8FAFC')
      .fill();

    sortedData.forEach((item, index) => {
      const color = getSourceColor(item.source);
      const sourceName = item.source
        ? item.source.charAt(0).toUpperCase() + item.source.slice(1)
        : 'Other';

      const legendX = x + 20 + (index * legendItemWidth);
      const availableWidth = legendItemWidth - swatchSize - swatchLabelGap - 5;
      
      const { fontSize: finalFontSize, text: finalText } = fitTextWidth(doc, sourceName, availableWidth, 8, 9);

      // Color swatch
      doc.rect(legendX, legendY, swatchSize, swatchSize)
        .fillColor(color)
        .fill();
      doc.rect(legendX, legendY, swatchSize, swatchSize)
        .lineWidth(1)
        .strokeColor('#64748B')
        .stroke();

      // Label
      doc.fillOpacity(1);
      doc.fontSize(finalFontSize)
        .font('Helvetica')
        .fillColor('#64748B')
        .text(finalText, legendX + swatchSize + swatchLabelGap, legendY + 4, {
          width: availableWidth,
          continued: false,
        });
    });

    // ============================================
    // RETURN HEIGHT
    // ============================================
    const legendHeight = legendBgHeight + legendBgPadding * 2 + 8;
    const labelsHeight = xLabelsHeight + 8 + 22;
    const actualHeight = (chartY - y) + topPadding + maxBarHeight + labelsHeight + legendHeight;
    return actualHeight;
  };