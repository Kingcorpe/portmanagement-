// PDF Report Generation for Portfolio Rebalancing
// @ts-ignore - pdfkit types are installed but may not resolve correctly
import PDFDocument from 'pdfkit';

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

    // Table header
    const tableTop = doc.y;
    const colWidths = [70, 60, 55, 55, 55, 75, 80];
    const colX = [50, 120, 180, 235, 290, 345, 420];
    
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Symbol', colX[0], tableTop);
    doc.text('Qty', colX[1], tableTop, { width: colWidths[1], align: 'right' });
    doc.text('Actual %', colX[2], tableTop, { width: colWidths[2], align: 'right' });
    doc.text('Target %', colX[3], tableTop, { width: colWidths[3], align: 'right' });
    doc.text('Variance', colX[4], tableTop, { width: colWidths[4], align: 'right' });
    doc.text('$ Change', colX[5], tableTop, { width: colWidths[5], align: 'right' });
    doc.text('Action', colX[6], tableTop, { width: colWidths[6], align: 'right' });
    
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
      
      // Symbol and name
      doc.text(pos.symbol, colX[0], rowY);
      if (pos.name) {
        doc.fontSize(7).fillColor('#666666')
           .text(pos.name.substring(0, 20), colX[0], rowY + 10);
        doc.fillColor('#000000').fontSize(9);
      }
      
      // Quantity
      doc.text(pos.quantity.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
               colX[1], rowY, { width: colWidths[1], align: 'right' });
      
      // Actual %
      doc.text(`${pos.actualPercentage.toFixed(1)}%`, 
               colX[2], rowY, { width: colWidths[2], align: 'right' });
      
      // Target %
      doc.text(pos.targetPercentage > 0 ? `${pos.targetPercentage.toFixed(1)}%` : 'LIQUIDATE', 
               colX[3], rowY, { width: colWidths[3], align: 'right' });
      
      // Variance
      const varianceColor = pos.variance > 0 ? '#16a34a' : pos.variance < 0 ? '#dc2626' : '#000000';
      doc.fillColor(varianceColor)
         .text(`${pos.variance > 0 ? '+' : ''}${pos.variance.toFixed(1)}%`, 
                colX[4], rowY, { width: colWidths[4], align: 'right' });
      doc.fillColor('#000000');
      
      // $ Change
      const changeColor = pos.changeNeeded > 0 ? '#16a34a' : pos.changeNeeded < 0 ? '#dc2626' : '#000000';
      doc.fillColor(changeColor)
         .text(`${pos.changeNeeded > 0 ? '+' : ''}$${pos.changeNeeded.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 
                colX[5], rowY, { width: colWidths[5], align: 'right' });
      doc.fillColor('#000000');
      
      // Action (Shares to Trade)
      const actionColor = pos.sharesToTrade > 0 ? '#16a34a' : pos.sharesToTrade < 0 ? '#dc2626' : '#000000';
      const actionText = pos.sharesToTrade > 0 
        ? `Buy ${Math.abs(pos.sharesToTrade).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` 
        : pos.sharesToTrade < 0 
          ? `Sell ${Math.abs(pos.sharesToTrade).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
          : 'Hold';
      doc.font('Helvetica-Bold').fillColor(actionColor)
         .text(actionText, colX[6], rowY, { width: colWidths[6], align: 'right' });
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
