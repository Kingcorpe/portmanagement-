// PDF Report Generation for Portfolio Rebalancing and Milestones
// @ts-ignore - pdfkit types are installed but may not resolve correctly
import PDFDocument from 'pdfkit';
import type { Milestone } from '@shared/schema';

interface PortfolioPosition {
  symbol: string;
  name?: string;
  quantity: number;
  currentPrice: number;
  marketValue: number;
  actualPercentage: number;
  targetPercentage: number;
  variance: number;
  changeNeeded: number;
  sharesToTrade: number;
  status: 'over' | 'under' | 'on-target' | 'unexpected';
}

interface ReportData {
  accountName: string;
  accountType: string;
  householdName: string;
  ownerName: string;
  totalValue: number;
  positions: PortfolioPosition[];
  generatedAt: Date;
}

export function generatePortfolioRebalanceReport(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).font('Helvetica-Bold')
       .text('Portfolio Rebalancing Report', { align: 'center' });
    doc.moveDown(0.5);
    
    // Account Info
    doc.fontSize(12).font('Helvetica')
       .text(`Household: ${data.householdName}`, { align: 'center' })
       .text(`Owner: ${data.ownerName}`, { align: 'center' })
       .text(`Account: ${data.accountType}${data.accountName ? ` - ${data.accountName}` : ''}`, { align: 'center' });
    doc.moveDown(0.3);
    
    doc.fontSize(14).font('Helvetica-Bold')
       .text(`Total Portfolio Value: $${data.totalValue.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { align: 'center' });
    doc.moveDown(0.3);
    
    doc.fontSize(10).font('Helvetica')
       .fillColor('#666666')
       .text(`Generated: ${data.generatedAt.toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' })}`, { align: 'center' });
    doc.fillColor('#000000');
    doc.moveDown(1);

    // Separator line
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(0.5);

    // Summary section
    const buyActions = data.positions.filter(p => p.sharesToTrade > 0);
    const sellActions = data.positions.filter(p => p.sharesToTrade < 0);
    const onTarget = data.positions.filter(p => p.status === 'on-target');
    
    doc.fontSize(14).font('Helvetica-Bold').text('Summary');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica')
       .text(`Positions to Buy: ${buyActions.length}`)
       .text(`Positions to Sell: ${sellActions.length}`)
       .text(`On Target: ${onTarget.length}`)
       .text(`Total Positions: ${data.positions.length}`);
    doc.moveDown(1);

    // Trade Actions Table
    doc.fontSize(14).font('Helvetica-Bold').text('Recommended Trade Actions');
    doc.moveDown(0.5);

    // Sort positions: sells first (liquidations), then buys, then on-target
    const sortedPositions = [...data.positions].sort((a, b) => {
      // Liquidations (no target) first
      if (a.targetPercentage === 0 && b.targetPercentage !== 0) return -1;
      if (b.targetPercentage === 0 && a.targetPercentage !== 0) return 1;
      // Then sells
      if (a.sharesToTrade < 0 && b.sharesToTrade >= 0) return -1;
      if (b.sharesToTrade < 0 && a.sharesToTrade >= 0) return 1;
      // Then by absolute change needed
      return Math.abs(b.changeNeeded) - Math.abs(a.changeNeeded);
    });

    // Table header - with checkbox column for print use
    const tableTop = doc.y;
    const colWidths = [20, 65, 55, 50, 50, 50, 70, 75];
    const colX = [50, 70, 135, 190, 240, 290, 340, 410];
    
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('', colX[0], tableTop, { width: colWidths[0] }); // Checkbox column header (empty)
    doc.text('Symbol', colX[1], tableTop);
    doc.text('Qty', colX[2], tableTop, { width: colWidths[2], align: 'right' });
    doc.text('Actual %', colX[3], tableTop, { width: colWidths[3], align: 'right' });
    doc.text('Target %', colX[4], tableTop, { width: colWidths[4], align: 'right' });
    doc.text('Variance', colX[5], tableTop, { width: colWidths[5], align: 'right' });
    doc.text('$ Change', colX[6], tableTop, { width: colWidths[6], align: 'right' });
    doc.text('Action', colX[7], tableTop, { width: colWidths[7], align: 'right' });
    
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(0.3);

    // Table rows
    doc.font('Helvetica').fontSize(9);
    
    for (const pos of sortedPositions) {
      if (doc.y > 700) {
        doc.addPage();
        doc.y = 50;
      }
      
      const rowY = doc.y;
      
      // Checkbox for print use - draw empty square
      const checkboxSize = 10;
      const checkboxX = colX[0] + 2;
      const checkboxY = rowY + 1;
      doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize).stroke();
      
      // Symbol and name
      doc.text(pos.symbol, colX[1], rowY);
      if (pos.name) {
        doc.fontSize(7).fillColor('#666666')
           .text(pos.name.substring(0, 18), colX[1], rowY + 10);
        doc.fillColor('#000000').fontSize(9);
      }
      
      // Quantity
      doc.text(pos.quantity.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
               colX[2], rowY, { width: colWidths[2], align: 'right' });
      
      // Actual %
      doc.text(`${pos.actualPercentage.toFixed(1)}%`, 
               colX[3], rowY, { width: colWidths[3], align: 'right' });
      
      // Target %
      doc.text(pos.targetPercentage > 0 ? `${pos.targetPercentage.toFixed(1)}%` : 'DEPLOY', 
               colX[4], rowY, { width: colWidths[4], align: 'right' });
      
      // Variance
      const varianceColor = pos.variance > 0 ? '#16a34a' : pos.variance < 0 ? '#dc2626' : '#000000';
      doc.fillColor(varianceColor)
         .text(`${pos.variance > 0 ? '+' : ''}${pos.variance.toFixed(1)}%`, 
                colX[5], rowY, { width: colWidths[5], align: 'right' });
      doc.fillColor('#000000');
      
      // $ Change
      const changeColor = pos.changeNeeded > 0 ? '#16a34a' : pos.changeNeeded < 0 ? '#dc2626' : '#000000';
      doc.fillColor(changeColor)
         .text(`${pos.changeNeeded > 0 ? '+' : ''}$${pos.changeNeeded.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 
                colX[6], rowY, { width: colWidths[6], align: 'right' });
      doc.fillColor('#000000');
      
      // Action (Shares to Trade)
      const actionColor = pos.sharesToTrade > 0 ? '#16a34a' : pos.sharesToTrade < 0 ? '#dc2626' : '#000000';
      const actionText = pos.sharesToTrade > 0 
        ? `Buy ${Math.abs(pos.sharesToTrade).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` 
        : pos.sharesToTrade < 0 
          ? `Sell ${Math.abs(pos.sharesToTrade).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
          : 'Hold';
      doc.font('Helvetica-Bold').fillColor(actionColor)
         .text(actionText, colX[7], rowY, { width: colWidths[7], align: 'right' });
      doc.font('Helvetica').fillColor('#000000');
      
      doc.moveDown(pos.name ? 1.2 : 0.8);
    }

    // Footer
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(0.5);
    
    doc.fontSize(8).fillColor('#666666')
       .text('This report is for informational purposes only and does not constitute investment advice.', { align: 'center' })
       .text('Please consult with your financial advisor before making any investment decisions.', { align: 'center' });

    doc.end();
  });
}

// Business category labels and colors for milestones
const MILESTONE_CATEGORIES: Record<string, { label: string; color: string }> = {
  client_win: { label: 'Client Win', color: '#16a34a' },
  personal_growth: { label: 'Personal Growth', color: '#9333ea' },
  business_milestone: { label: 'Business Milestone', color: '#2563eb' },
  team_achievement: { label: 'Team Achievement', color: '#d97706' },
  process_improvement: { label: 'Process Improvement', color: '#0891b2' },
  other: { label: 'Other', color: '#6b7280' },
};

// Personal category labels and colors
const PERSONAL_MILESTONE_CATEGORIES: Record<string, { label: string; color: string }> = {
  health_fitness: { label: 'Health & Fitness', color: '#16a34a' },
  family: { label: 'Family', color: '#ec4899' },
  learning: { label: 'Learning', color: '#8b5cf6' },
  hobbies: { label: 'Hobbies', color: '#f59e0b' },
  travel: { label: 'Travel', color: '#06b6d4' },
  financial: { label: 'Financial', color: '#10b981' },
  relationships: { label: 'Relationships', color: '#ef4444' },
  self_care: { label: 'Self Care', color: '#6366f1' },
  personal_other: { label: 'Other', color: '#6b7280' },
};

export function generateMilestonesReport(milestones: Milestone[], title: string = 'Milestones & Wins'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(22).font('Helvetica-Bold')
       .text(title, { align: 'center' });
    doc.moveDown(0.3);
    
    doc.fontSize(10).font('Helvetica')
       .fillColor('#666666')
       .text(`Generated: ${new Date().toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short' })}`, { align: 'center' });
    doc.fillColor('#000000');
    doc.moveDown(0.5);

    // Separator line
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(0.5);

    // Summary
    doc.fontSize(14).font('Helvetica-Bold').text('Summary');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica')
       .text(`Total Milestones: ${milestones.length}`);
    
    // Count by category (handles both business and personal categories)
    const categoryCounts: Record<string, number> = {};
    milestones.forEach(m => {
      const cat = m.milestoneType === 'personal' 
        ? (m.personalCategory || 'personal_other')
        : (m.category || 'other');
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      const catInfo = MILESTONE_CATEGORIES[cat] || PERSONAL_MILESTONE_CATEGORIES[cat] || MILESTONE_CATEGORIES.other;
      doc.fillColor(catInfo.color)
         .text(`${catInfo.label}: ${count}`);
    });
    doc.fillColor('#000000');
    doc.moveDown(1);

    if (milestones.length === 0) {
      doc.fontSize(12).font('Helvetica')
         .fillColor('#666666')
         .text('No milestones recorded yet.', { align: 'center' });
      doc.end();
      return;
    }

    // Group milestones by month
    const groupedByMonth: Record<string, Milestone[]> = {};
    milestones.forEach(m => {
      const date = m.achievedDate ? new Date(m.achievedDate) : new Date();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleString('en-CA', { month: 'long', year: 'numeric' });
      if (!groupedByMonth[monthLabel]) {
        groupedByMonth[monthLabel] = [];
      }
      groupedByMonth[monthLabel].push(m);
    });

    // Sort months in descending order
    const sortedMonths = Object.entries(groupedByMonth).sort((a, b) => {
      const dateA = new Date(a[1][0].achievedDate || new Date());
      const dateB = new Date(b[1][0].achievedDate || new Date());
      return dateB.getTime() - dateA.getTime();
    });

    // Timeline settings
    const timelineX = 70;        // X position for the vertical timeline line
    const contentX = 90;         // X position where content starts (after timeline)
    const contentWidth = 460;    // Width of content area
    const dotRadius = 4;         // Size of timeline dots
    const primaryColor = '#2563eb';  // Blue color for timeline
    const lineColor = '#d1d5db';     // Gray color for timeline line

    // Render each month section with timeline
    for (const [monthLabel, monthMilestones] of sortedMonths) {
      // Check if we need a new page
      if (doc.y > 620) {
        doc.addPage();
        doc.y = 50;
      }

      // Month header with calendar icon indicator
      doc.fontSize(16).font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text(monthLabel, contentX, doc.y);
      
      // Badge showing count
      const countBadgeX = contentX + doc.widthOfString(monthLabel) + 10;
      doc.fontSize(9).font('Helvetica')
         .fillColor('#6b7280')
         .text(`(${monthMilestones.length})`, countBadgeX, doc.y - 14);
      
      doc.fillColor('#000000');
      doc.moveDown(0.6);

      // Sort milestones within month by date (newest first)
      const sortedMilestones = monthMilestones.sort((a, b) => {
        const dateA = a.achievedDate ? new Date(a.achievedDate).getTime() : 0;
        const dateB = b.achievedDate ? new Date(b.achievedDate).getTime() : 0;
        return dateB - dateA;
      });

      // Track start of timeline section for drawing the vertical line
      const timelineStartY = doc.y;
      let timelineEndY = timelineStartY;

      for (const milestone of sortedMilestones) {
        // Check if we need a new page
        if (doc.y > 660) {
          // Draw timeline line for current page before moving
          if (timelineEndY > timelineStartY) {
            doc.save();
            doc.strokeColor(lineColor).lineWidth(2);
            doc.moveTo(timelineX, timelineStartY).lineTo(timelineX, timelineEndY).stroke();
            doc.restore();
          }
          doc.addPage();
          doc.y = 50;
        }

        const cardStartY = doc.y;
        // Get category info based on milestone type
        const catKey = milestone.milestoneType === 'personal' 
          ? (milestone.personalCategory || 'personal_other')
          : (milestone.category || 'other');
        const catInfo = MILESTONE_CATEGORIES[catKey] || PERSONAL_MILESTONE_CATEGORIES[catKey] || MILESTONE_CATEGORIES.other;
        const achievedDate = milestone.achievedDate 
          ? new Date(milestone.achievedDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
          : '';

        // Draw timeline dot
        doc.save();
        doc.circle(timelineX, cardStartY + 8, dotRadius).fill(primaryColor);
        doc.restore();

        // Category badge
        doc.fontSize(9).font('Helvetica-Bold')
           .fillColor(catInfo.color)
           .text(catInfo.label.toUpperCase(), contentX, doc.y, { continued: true });
        
        // Date next to category
        doc.font('Helvetica')
           .fillColor('#6b7280')
           .text(`  ${achievedDate}`);
        
        doc.fillColor('#000000');
        doc.moveDown(0.15);

        // Title - larger and bold
        doc.fontSize(13).font('Helvetica-Bold')
           .fillColor('#111827')
           .text(milestone.title, contentX, doc.y, { width: contentWidth });
        doc.fillColor('#000000');
        doc.moveDown(0.2);

        // Impact value if present - prominent green
        if (milestone.impactValue) {
          doc.fontSize(12).font('Helvetica-Bold')
             .fillColor('#059669')
             .text(milestone.impactValue, contentX);
          doc.fillColor('#000000');
          doc.moveDown(0.15);
        }

        // Description if present
        if (milestone.description) {
          doc.fontSize(10).font('Helvetica')
             .fillColor('#4b5563')
             .text(milestone.description, contentX, doc.y, { width: contentWidth });
          doc.fillColor('#000000');
        }

        doc.moveDown(1);
        timelineEndY = doc.y - 10;
      }

      // Draw the vertical timeline line for this month's milestones
      doc.save();
      doc.strokeColor(lineColor).lineWidth(2);
      doc.moveTo(timelineX, timelineStartY).lineTo(timelineX, timelineEndY).stroke();
      doc.restore();

      doc.moveDown(0.8);
    }

    // Footer
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(0.5);
    
    doc.fontSize(8).fillColor('#666666')
       .text('This report was generated from PracticeOS - Your Practice Management Platform', { align: 'center' });

    doc.end();
  });
}
