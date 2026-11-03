// app/punchcards/_components/PDFGenerator.tsx
"use client";

import React, { useState } from 'react';
import jsPDF from 'jspdf';

interface PunchCard {
  front: string;
  back: string;
  cardNumber: number;
  batchNumber: string;
}

interface PDFGeneratorProps {
  cards: PunchCard[];
  batchName: string;
  batchId: string;
}

interface GenerationProgress {
  stage: string;
  progress: number;
  total: number;
}

const PDFGenerator: React.FC<PDFGeneratorProps> = ({ cards, batchName, batchId }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [generatedPDF, setGeneratedPDF] = useState<jsPDF | null>(null);
  const [isReady, setIsReady] = useState(false);

  // A4 dimensions at 300 DPI
  const A4_WIDTH = 2480;
  const A4_HEIGHT = 3508;
  
  // Card dimensions (scaled for A4)
  const CARD_WIDTH = 1088;
  const CARD_HEIGHT = 638;
  
  // Layout settings
  const CARDS_PER_SHEET = 8;
  const COLS = 2;
  const ROWS = 4;
  
  // Calculate spacing for A4 layout
  const MARGIN_X = (A4_WIDTH - (COLS * CARD_WIDTH)) / (COLS + 1);
  const MARGIN_Y = (A4_HEIGHT - (ROWS * CARD_HEIGHT)) / (ROWS + 1);

  const generateIndividualCard = async (card: PunchCard, isBackSide: boolean = false): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

      if (isBackSide) {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';

        logoImg.onload = () => {
          const panelPadding = 18;
          const borderColor = '#111827';
          const accentColor = '#7f1d1d';

          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 7;
          ctx.strokeRect(panelPadding, panelPadding, CARD_WIDTH - panelPadding * 2, CARD_HEIGHT - panelPadding * 2);

          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(panelPadding + 18, panelPadding + 18, CARD_WIDTH - (panelPadding + 18) * 2, CARD_HEIGHT - (panelPadding + 18) * 2);

          ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
          ctx.lineWidth = 1;
          for (let i = 0; i < 18; i++) {
            const x = 24 + i * 54;
            ctx.beginPath();
            ctx.moveTo(x, 20);
            ctx.lineTo(x - 24, CARD_HEIGHT - 20);
            ctx.stroke();
          }

          ctx.save();
          ctx.translate(CARD_WIDTH / 2, CARD_HEIGHT / 2);
          ctx.rotate(-Math.PI / 7);
          ctx.globalAlpha = 0.12;
          const logoSize = Math.min(CARD_WIDTH, CARD_HEIGHT) * 0.66;
          ctx.drawImage(logoImg, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
          ctx.restore();

          ctx.fillStyle = accentColor;
          ctx.textAlign = 'center';
          ctx.font = '700 26px Arial';
          ctx.fillText('COPY RESTRICTED', CARD_WIDTH / 2, 72);

          ctx.fillStyle = '#111827';
          ctx.font = '700 20px Arial';
          ctx.fillText('DARTS PROGRAM • AUTHORIZED PRINT ONLY', CARD_WIDTH / 2, CARD_HEIGHT / 2 - 16);

          ctx.save();
          ctx.translate(CARD_WIDTH / 2, CARD_HEIGHT / 2 + 36);
          ctx.rotate(Math.PI / 10);
          ctx.fillStyle = 'rgba(127, 29, 29, 0.78)';
          ctx.font = '900 38px Arial';
          ctx.fillText('REPRODUCTION', 0, 0);
          ctx.restore();

          ctx.fillStyle = '#111827';
          ctx.font = '700 18px Arial';
          ctx.fillText('VOID • UNAUTHORIZED DUPLICATION PROHIBITED', CARD_WIDTH / 2, CARD_HEIGHT - 82);

          ctx.textAlign = 'left';
          ctx.fillStyle = '#111827';
          ctx.font = '700 21px Arial';
          ctx.fillText('Batch', 40, CARD_HEIGHT - 58);
          ctx.font = '700 28px Arial';
          ctx.fillText(card.batchNumber, 40, CARD_HEIGHT - 24);

          ctx.textAlign = 'right';
          ctx.font = '700 21px Arial';
          ctx.fillText('Printed', CARD_WIDTH - 40, CARD_HEIGHT - 58);
          ctx.font = '700 28px Arial';
          ctx.fillText(new Date().toLocaleDateString(), CARD_WIDTH - 40, CARD_HEIGHT - 24);

          resolve(canvas.toDataURL('image/png'));
        };

        logoImg.onerror = () => {
          const panelPadding = 18;
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
          ctx.strokeStyle = '#111827';
          ctx.lineWidth = 7;
          ctx.strokeRect(panelPadding, panelPadding, CARD_WIDTH - panelPadding * 2, CARD_HEIGHT - panelPadding * 2);

          ctx.fillStyle = '#7f1d1d';
          ctx.textAlign = 'center';
          ctx.font = '700 26px Arial';
          ctx.fillText('COPY RESTRICTED', CARD_WIDTH / 2, 72);

          ctx.fillStyle = '#111827';
          ctx.font = '700 20px Arial';
          ctx.fillText('DARTS PROGRAM • AUTHORIZED PRINT ONLY', CARD_WIDTH / 2, CARD_HEIGHT / 2 - 16);

          ctx.fillStyle = 'rgba(127, 29, 29, 0.8)';
          ctx.font = '900 38px Arial';
          ctx.fillText('REPRODUCTION', CARD_WIDTH / 2, CARD_HEIGHT / 2 + 32);

          ctx.textAlign = 'left';
          ctx.font = '700 21px Arial';
          ctx.fillStyle = '#111827';
          ctx.fillText('Batch', 40, CARD_HEIGHT - 58);
          ctx.font = '700 28px Arial';
          ctx.fillText(card.batchNumber, 40, CARD_HEIGHT - 24);

          ctx.textAlign = 'right';
          ctx.font = '700 21px Arial';
          ctx.fillText('Printed', CARD_WIDTH - 40, CARD_HEIGHT - 58);
          ctx.font = '700 28px Arial';
          ctx.fillText(new Date().toLocaleDateString(), CARD_WIDTH - 40, CARD_HEIGHT - 24);

          resolve(canvas.toDataURL('image/png'));
        };

        logoImg.src = '/images/home/dartboard.png';
      } else {
        // Generate front side with template + card number
        const templateImg = new Image();
        templateImg.crossOrigin = 'anonymous';
        
        templateImg.onload = () => {
          // Draw template image only - no card number
          ctx.drawImage(templateImg, 0, 0, CARD_WIDTH, CARD_HEIGHT);
          
          resolve(canvas.toDataURL('image/png'));
        };

        templateImg.onerror = () => {
          // Fallback template - no card number
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
          ctx.fillStyle = '#666666';
          ctx.font = '48px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Template', CARD_WIDTH/2, CARD_HEIGHT/2);
          
          resolve(canvas.toDataURL('image/png'));
        };

        templateImg.src = card.front;
      }
    });
  };

  const generateCardSheet = async (cardBatch: PunchCard[], isBackSide: boolean = false): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = A4_WIDTH;
      canvas.height = A4_HEIGHT;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

      try {
        // Generate individual cards first
        const cardImages: string[] = [];
        for (const card of cardBatch) {
          if (card) {
            const cardImage = await generateIndividualCard(card, isBackSide);
            cardImages.push(cardImage);
          } else {
            cardImages.push('');
          }
        }

        // Draw cards on sheet
        let loadedCards = 0;
        const totalCards = cardImages.filter(img => img !== '').length;

        if (totalCards === 0) {
          resolve(canvas.toDataURL('image/png'));
          return;
        }

        cardImages.forEach((cardImage, index) => {
          if (!cardImage) {
            loadedCards++;
            if (loadedCards === totalCards) {
              resolve(canvas.toDataURL('image/png'));
            }
            return;
          }

          const row = Math.floor(index / COLS);
          const col = index % COLS;
          
          // Calculate position (mirror for back side)
          const x = isBackSide 
            ? A4_WIDTH - MARGIN_X - ((col + 1) * CARD_WIDTH) - (col * MARGIN_X)
            : MARGIN_X + (col * (CARD_WIDTH + MARGIN_X));
          const y = MARGIN_Y + (row * (CARD_HEIGHT + MARGIN_Y));

          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, x, y, CARD_WIDTH, CARD_HEIGHT);
            
            // Draw cut lines
            ctx.strokeStyle = '#cccccc';
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 2;
            
            // Vertical cut lines
            if (col < COLS - 1) {
              const cutX = x + CARD_WIDTH + (MARGIN_X / 2);
              ctx.beginPath();
              ctx.moveTo(cutX, y - 20);
              ctx.lineTo(cutX, y + CARD_HEIGHT + 20);
              ctx.stroke();
            }
            
            // Horizontal cut lines
            if (row < ROWS - 1) {
              const cutY = y + CARD_HEIGHT + (MARGIN_Y / 2);
              ctx.beginPath();
              ctx.moveTo(x - 20, cutY);
              ctx.lineTo(x + CARD_WIDTH + 20, cutY);
              ctx.stroke();
            }
            
            loadedCards++;
            if (loadedCards === totalCards) {
              // Add sheet info
              ctx.setLineDash([]);
              ctx.fillStyle = '#666666';
              ctx.font = '24px Arial';
              ctx.textAlign = 'right';
              ctx.fillText(
                `${isBackSide ? 'Back' : 'Front'} - ${batchName || 'Punch Cards'}`,
                A4_WIDTH - 40,
                A4_HEIGHT - 40
              );
              
              resolve(canvas.toDataURL('image/png'));
            }
          };

          img.src = cardImage;
        });
      } catch (error) {
        reject(error);
      }
    });
  };

  const generateOptimizedPDF = async () => {
    try {
      setIsGenerating(true);
      setIsReady(false);
      setProgress({ stage: 'Initializing...', progress: 0, total: cards.length * 2 });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [A4_WIDTH, A4_HEIGHT]
      });

      const sheetsNeeded = Math.ceil(cards.length / CARDS_PER_SHEET);
      let pageAdded = false;

      for (let sheetIndex = 0; sheetIndex < sheetsNeeded; sheetIndex++) {
        const startCard = sheetIndex * CARDS_PER_SHEET;
        const endCard = Math.min(startCard + CARDS_PER_SHEET, cards.length);
        
        // Get cards for this sheet (pad with null if needed)
        const sheetCards = Array.from({ length: CARDS_PER_SHEET }, (_, i) => {
          const cardIndex = startCard + i;
          return cardIndex < cards.length ? cards[cardIndex] : null;
        });

        setProgress({
          stage: `Generating sheet ${sheetIndex + 1} front side...`,
          progress: sheetIndex * 2,
          total: sheetsNeeded * 2
        });

        // Generate front side
        const frontSide = await generateCardSheet(sheetCards, false);
        
        if (pageAdded) pdf.addPage();
        pdf.addImage(frontSide, 'PNG', 0, 0, A4_WIDTH, A4_HEIGHT);
        pageAdded = true;

        setProgress({
          stage: `Generating sheet ${sheetIndex + 1} back side...`,
          progress: sheetIndex * 2 + 1,
          total: sheetsNeeded * 2
        });

        // Generate back side (mirrored)
        const backSide = await generateCardSheet(sheetCards, true);
        
        pdf.addPage();
        pdf.addImage(backSide, 'PNG', 0, 0, A4_WIDTH, A4_HEIGHT);
      }

      setProgress({
        stage: 'PDF Ready for Download!',
        progress: sheetsNeeded * 2,
        total: sheetsNeeded * 2
      });

      // Store the PDF instead of auto-downloading
      setGeneratedPDF(pdf);
      setIsReady(true);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const handleDownload = () => {
    if (generatedPDF) {
      const fileName = `${batchName || 'PunchCards'}_${batchId}_${new Date().toISOString().split('T')[0]}.pdf`;
      generatedPDF.save(fileName);
    }
  };

  const handleRegenerate = () => {
    setGeneratedPDF(null);
    setIsReady(false);
    generateOptimizedPDF();
  };

  return (
    <div 
      className="space-y-4"
      style={{ 
        fontFamily: 'var(--font-sans)',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Progress Indicator */}
      {progress && (
        <div 
          className="border rounded-lg p-4"
          style={{
            backgroundColor: 'hsl(var(--primary) / 0.1)',
            borderColor: 'hsl(var(--primary))',
            borderRadius: 'var(--radius)',
            color: 'hsl(var(--primary-foreground))'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span 
              className="text-sm font-medium"
              style={{ 
                color: 'hsl(var(--primary))',
                fontFamily: 'var(--font-sans)'
              }}
            >
              {progress.stage}
            </span>
            <span 
              className="text-sm"
              style={{ color: 'hsl(var(--primary))' }}
            >
              {progress.progress}/{progress.total}
            </span>
          </div>
          <div 
            className="w-full rounded-full h-3"
            style={{ 
              backgroundColor: 'hsl(var(--primary) / 0.2)',
              borderRadius: 'var(--radius)'
            }}
          >
            <div 
              className="h-3 rounded-full transition-all duration-300"
              style={{ 
                width: `${(progress.progress / progress.total) * 100}%`,
                backgroundColor: 'hsl(var(--primary))',
                borderRadius: 'var(--radius)'
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Generation Status */}
      <div 
        className="border rounded-lg p-4"
        style={{
          backgroundColor: isReady ? 'hsl(var(--accent) / 0.1)' : 'hsl(var(--muted) / 0.5)',
          borderColor: isReady ? 'hsl(var(--accent))' : 'hsl(var(--border))',
          borderRadius: 'var(--radius)',
          transition: 'all 0.3s ease'
        }}
      >
        <h4 
          className="font-medium mb-3"
          style={{ 
            color: isReady ? 'hsl(var(--accent-foreground))' : 'hsl(var(--foreground))',
            fontFamily: 'var(--font-sans)'
          }}
        >
          {isReady ? '✅ PDF Ready for Download!' : '⏳ Cards Generated - Click to Create PDF'}
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div 
              className="font-medium"
              style={{ 
                color: isReady ? 'hsl(var(--accent-foreground))' : 'hsl(var(--foreground))',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Cards Generated
            </div>
            <ul 
              className="space-y-1"
              style={{ color: isReady ? 'hsl(var(--accent-foreground))' : 'hsl(var(--muted-foreground))' }}
            >
              <li>• {cards.length} individual cards</li>
              <li>• Batch ID: {batchId}</li>
              <li>• Dartboard watermark applied</li>
              <li>• Sequential numbering</li>
            </ul>
          </div>
          <div>
            <div 
              className="font-medium"
              style={{ 
                color: isReady ? 'hsl(var(--accent-foreground))' : 'hsl(var(--foreground))',
                fontFamily: 'var(--font-sans)'
              }}
            >
              PDF Layout
            </div>
            <ul 
              className="space-y-1"
              style={{ color: isReady ? 'hsl(var(--accent-foreground))' : 'hsl(var(--muted-foreground))' }}
            >
              <li>• A4 optimized sheets</li>
              <li>• Duplex print ready</li>
              <li>• Cut guides included</li>
              <li>• {isReady ? 'Ready to download' : 'Manual download'}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Download Controls */}
      <div className="flex space-x-4">
        {isReady ? (
          <>
            <button
              onClick={handleDownload}
              className="flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
              style={{
                backgroundColor: 'hsl(var(--accent))',
                color: 'hsl(var(--accent-foreground))',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-sans)',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid hsl(var(--accent))'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--accent))';
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = 'var(--shadow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--accent))';
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleRegenerate}
              className="px-4 py-3 rounded-lg transition-all duration-200"
              style={{
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--secondary))',
                color: 'hsl(var(--secondary-foreground))',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-sans)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--secondary))';
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--secondary))';
                e.currentTarget.style.opacity = '1';
              }}
            >
              🔄 Regenerate
            </button>
          </>
        ) : (
          <button
            onClick={generateOptimizedPDF}
            disabled={isGenerating || cards.length === 0}
            className="flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200"
            style={{
              backgroundColor: !isGenerating && cards.length > 0 
                ? 'hsl(var(--primary))' 
                : 'hsl(var(--muted))',
              color: !isGenerating && cards.length > 0 
                ? 'hsl(var(--primary-foreground))' 
                : 'hsl(var(--muted-foreground))',
              borderRadius: 'var(--radius)',
              border: `1px solid ${!isGenerating && cards.length > 0 
                ? 'hsl(var(--primary))' 
                : 'hsl(var(--border))'}`,
              cursor: !isGenerating && cards.length > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-sans)',
              boxShadow: !isGenerating && cards.length > 0 
                ? 'var(--shadow-sm)' 
                : 'none',
              opacity: !isGenerating && cards.length > 0 ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (!isGenerating && cards.length > 0) {
                e.currentTarget.style.backgroundColor = 'hsl(var(--primary))';
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = 'var(--shadow)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isGenerating && cards.length > 0) {
                e.currentTarget.style.backgroundColor = 'hsl(var(--primary))';
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }
            }}
          >
            {isGenerating ? 'Generating PDF...' : 'Create PDF'}
          </button>
        )}
      </div>

      {/* Success Message */}
      {isReady && (
        <div 
          className="border rounded-lg p-4"
          style={{
            backgroundColor: 'hsl(var(--primary) / 0.1)',
            borderColor: 'hsl(var(--primary))',
            borderRadius: 'var(--radius)'
          }}
        >
          <div className="flex items-center space-x-2">
            <svg 
              className="w-5 h-5" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              style={{ color: 'hsl(var(--primary))' }}
            >
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span 
              className="font-medium"
              style={{ 
                color: 'hsl(var(--primary))',
                fontFamily: 'var(--font-sans)'
              }}
            >
              PDF generated successfully! Click "Download PDF" above to save it.
            </span>
          </div>
        </div>
      )}

      {/* Print Instructions */}
      <div 
        className="border rounded-lg p-4"
        style={{
          backgroundColor: 'hsl(var(--secondary) / 0.5)',
          borderColor: 'hsl(var(--secondary))',
          borderRadius: 'var(--radius)'
        }}
      >
        <h4 
          className="font-medium mb-2"
          style={{ 
            color: 'hsl(var(--secondary-foreground))',
            fontFamily: 'var(--font-sans)'
          }}
        >
          📋 Print Instructions
        </h4>
        <ol 
          className="text-sm space-y-1 list-decimal list-inside"
          style={{ 
            color: 'hsl(var(--secondary-foreground))',
            fontFamily: 'var(--font-sans)'
          }}
        >
          <li>Load A4 paper in your printer</li>
          <li>Print at 100% scale (no scaling)</li>
          <li>Use duplex printing for front/back alignment</li>
          <li>Pages alternate: Front1, Back1, Front2, Back2...</li>
          <li>Cut along dotted lines with sharp blade</li>
        </ol>
      </div>
    </div>
  );
};

export default PDFGenerator;