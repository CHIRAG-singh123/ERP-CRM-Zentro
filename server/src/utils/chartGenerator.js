// Vibrant chart color palette - professionally designed for PDF export
// Inspired by card aesthetic with bold, distinct colors for maximum visual impact

const STAGE_COLORS = {
    'Prospecting': '#3B82F6',      // Bright Blue
    'Qualification': '#8B5CF6',    // Violet
    'Proposal': '#10B981',         // Emerald Green
    'Negotiation': '#F59E0B',      // Amber
    'Closed Won': '#22C55E',       // Green (success)
    'Closed Lost': '#EF4444',      // Red (danger)
  };
  
  const SOURCE_COLORS = {
    'website': '#3B82F6',          // Bright Blue
    'email': '#8B5CF6',            // Violet
    'phone': '#EC4899',            // Pink
    'social': '#10B981',           // Emerald
    'referral': '#F59E0B',         // Amber
    'other': '#6B7280',            // Gray (neutral)
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
   * Draw a donut segment with vibrant colors and improved rendering
   * Color set BEFORE path construction for reliable state application
   */
  const drawDonutSegment = (doc, centerX, centerY, innerRadius, outerRadius, startAngle, endAngle, colorHex) => {
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
    
    const titleHeight = 35;
    const chartAreaHeight = 180;
    const legendPadding = 20;
    
    return titleHeight + chartAreaHeight + legendPadding;
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
  
    // Optimized dimensions for A4 - chartAreaWidth must be declared first
    const chartAreaWidth = width * 0.45;
    const chartTopPadding = 10;
    const centerX = x + chartAreaWidth / 2 + 10;
    const centerY = y + chartTopPadding + 85;
    const radius = 70;
    const innerRadius = radius * 0.5;
  
    // Title - positioned only over chart area to avoid overlap with legend
    doc.fillOpacity(1);
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1E293B')
      .text(
        `Total: ${totalDeals} Deals | $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        x,
        y + 3,
        { align: 'center', width: chartAreaWidth }
      );
  
    // Calculate angles for each segment
    let currentAngle = -90;
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
  
    // Draw each segment with vibrant colors
    segments.forEach((segment) => {
      const color = STAGE_COLORS[segment.stage] || '#9CA3AF';
      drawDonutSegment(doc, centerX, centerY, innerRadius, radius, segment.startAngle, segment.endAngle, color);
    });
  
    // Draw center white circle - color set before shape
    doc.fillColor('white');
    doc.fillOpacity(1);
    doc.circle(centerX, centerY, innerRadius).fill();
    doc.strokeColor('#E2E8F0');
    doc.lineWidth(1);
    doc.circle(centerX, centerY, innerRadius).stroke();
  
    // Add percentage labels inside segments with maximum contrast
    segments.forEach((segment) => {
      if (segment.percentage >= 5) {
        const midAngle = (segment.startAngle + segment.endAngle) / 2;
        const midAngleRad = (midAngle * Math.PI) / 180;
        const labelRadius = (radius + innerRadius) / 2;
        const labelX = centerX + labelRadius * Math.cos(midAngleRad);
        const labelY = centerY + labelRadius * Math.sin(midAngleRad);
  
        // Bold white text for maximum contrast on colored segments
        doc.fillOpacity(1);
        doc.fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text(`${segment.percentage.toFixed(0)}%`, labelX - 12, labelY - 6, {
            width: 24,
            align: 'center',
          });
      }
    });
  
    // Legend on the right side - enhanced styling with readable heading
    const legendStartX = x + chartAreaWidth + 18;
    const legendStartY = y + 25; // Start lower to avoid overlap with title
    let legendItemY = legendStartY;
  
    // Legend title - FIXED: Larger, darker, more readable, positioned to avoid overlap
    doc.fillOpacity(1);
    doc.fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#0F172A')  // Very dark for maximum contrast
      .text('Deal Stages', legendStartX, legendItemY);
  
    // Add spacing after title
    legendItemY += 18;
  
    segments.forEach((segment) => {
      const color = STAGE_COLORS[segment.stage] || '#9CA3AF';
  
      // Larger, more prominent color indicator with vibrant colors - using separate fill/stroke
      drawColoredRect(doc, legendStartX, legendItemY, 16, 16, color, '#FFFFFF', 1.5);
  
      // Stage name - bold and very dark for readability
      doc.fillOpacity(1);
      doc.fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')  // Very dark for maximum readability
        .text(segment.stage, legendStartX + 20, legendItemY + 3, {
          width: width - (legendStartX - x) - 20,
        });
  
      // Count and percentage - readable dark gray
      doc.fillOpacity(1);
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#334155')  // Dark gray for good readability
        .text(`${segment.count} (${segment.percentage.toFixed(1)}%)`, legendStartX + 20, legendItemY + 13, {
          width: width - (legendStartX - x) - 20,
        });
  
      legendItemY += 30;
    });
  
    // Return actual height used
    const actualHeight = Math.max(legendItemY - y + 10, centerY + radius + 15 - y);
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