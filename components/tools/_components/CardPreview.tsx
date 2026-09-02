// app/punchcards/_components/CardPreview.tsx
"use client";

import React, { useState } from 'react';
import { getCardPosition, getPerforatedGuideColor, type PaperLayout } from './layout';

interface CardPreviewProps {
  templatePath: string;
  cardCount: number;
  batchId?: string;
  layout: PaperLayout;
}

const CardPreview: React.FC<CardPreviewProps> = ({ templatePath, cardCount, batchId, layout }) => {
  const [showBackSide, setShowBackSide] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  const sheetsNeeded = Math.ceil(cardCount / layout.cardsPerSheet);
  
  // Generate card numbers for preview
  const generateCardNumbers = (sheetIndex: number) => {
    const startCard = sheetIndex * layout.cardsPerSheet + 1;
    const endCard = Math.min(startCard + layout.cardsPerSheet - 1, cardCount);
    return Array.from({ length: layout.cardsPerSheet }, (_, i) => {
      const cardNumber = startCard + i;
      return cardNumber <= endCard ? cardNumber : null;
    });
  };

  const toggleCardFlip = (cardNumber: number) => {
    const newFlippedCards = new Set(flippedCards);
    if (newFlippedCards.has(cardNumber)) {
      newFlippedCards.delete(cardNumber);
    } else {
      newFlippedCards.add(cardNumber);
    }
    setFlippedCards(newFlippedCards);
  };

  const generateBatchNumber = (cardNumber: number) => {
    return `${batchId || '123456'}-${cardNumber.toString().padStart(3, '0')}`;
  };

  return (
    <div 
      className="space-y-6"
      style={{ 
        fontFamily: 'var(--font-sans)',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Preview Info */}
      <div className="flex justify-between items-center">
        <div>
          <h3 
            className="font-medium"
            style={{ 
              color: 'hsl(var(--foreground))',
              fontFamily: 'var(--font-sans)'
            }}
          >
            {layout.pageSize === 'a4' ? 'A4' : 'Letter'} Layout Preview
          </h3>
          <p 
            className="text-sm"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            {layout.columns}×{layout.rows} layout • {cardCount} total cards • {sheetsNeeded} sheet{sheetsNeeded > 1 ? 's' : ''}
          </p>
          {batchId && (
            <p 
              className="text-xs mt-1"
              style={{ color: 'hsl(var(--primary))' }}
            >
              Batch ID: {batchId}
            </p>
          )}
        </div>
        <div className="text-right">
          <div 
            className="text-sm mb-2"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            <div>Card size: {layout.effectiveCardWidth / 300}×{layout.effectiveCardHeight / 300}in</div>
            <div>Paper: {layout.pageSize === 'a4' ? 'A4 (210×297mm)' : 'Letter (8.5×11in)'}</div>
          </div>
          {/* Flip Controls */}
          <div className="flex space-x-2">
            <button
              onClick={() => setShowBackSide(false)}
              className="px-3 py-1 text-xs rounded transition-all duration-200"
              style={{
                backgroundColor: !showBackSide 
                  ? 'hsl(var(--primary))' 
                  : 'hsl(var(--secondary))',
                color: !showBackSide 
                  ? 'hsl(var(--primary-foreground))' 
                  : 'hsl(var(--secondary-foreground))',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-sans)',
                border: '1px solid hsl(var(--border))'
              }}
              onMouseEnter={(e) => {
                if (!showBackSide) return;
                e.currentTarget.style.backgroundColor = 'hsl(var(--secondary))';
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                if (!showBackSide) return;
                e.currentTarget.style.backgroundColor = 'hsl(var(--secondary))';
                e.currentTarget.style.opacity = '1';
              }}
            >
              Front Side
            </button>
            <button
              onClick={() => setShowBackSide(true)}
              className="px-3 py-1 text-xs rounded transition-all duration-200"
              style={{
                backgroundColor: showBackSide 
                  ? 'hsl(var(--primary))' 
                  : 'hsl(var(--secondary))',
                color: showBackSide 
                  ? 'hsl(var(--primary-foreground))' 
                  : 'hsl(var(--secondary-foreground))',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-sans)',
                border: '1px solid hsl(var(--border))'
              }}
              onMouseEnter={(e) => {
                if (showBackSide) return;
                e.currentTarget.style.backgroundColor = 'hsl(var(--secondary))';
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                if (showBackSide) return;
                e.currentTarget.style.backgroundColor = 'hsl(var(--secondary))';
                e.currentTarget.style.opacity = '1';
              }}
            >
              Back Side
            </button>
          </div>
        </div>
      </div>

      {/* Sheet Previews */}
      <div className="space-y-8">
        {Array.from({ length: sheetsNeeded }, (_, sheetIndex) => {
          const cardNumbers = generateCardNumbers(sheetIndex);
          
          return (
            <div key={sheetIndex} className="space-y-4">
              <h4 
                className="font-medium"
                style={{ 
                  color: 'hsl(var(--foreground))',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                Sheet {sheetIndex + 1} {sheetsNeeded > 1 && `of ${sheetsNeeded}`} - {showBackSide ? 'Back Side' : 'Front Side'}
              </h4>
              
              {/* A4 Sheet Container */}
              <div 
                className="relative mx-auto rounded-lg shadow-sm"
                style={{ 
                   width: '300px',
                   height: `${300 * layout.pageHeight / layout.pageWidth}px`,
                  backgroundColor: 'hsl(var(--card))',
                  border: '2px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                
                <div className="absolute inset-0">
                  {cardNumbers.map((cardNumber, index) => {
                    const isCardFlipped = cardNumber ? flippedCards.has(cardNumber) : false;
                    const displayBackSide = showBackSide || isCardFlipped;
                    
                    return (
                      <div
                        key={index}
                        className="relative overflow-hidden cursor-pointer transition-transform hover:scale-105"
                        style={{
                          position: 'absolute',
                          left: `${getCardPosition(layout, index).x / layout.pageWidth * 100}%`,
                          top: `${getCardPosition(layout, index).y / layout.pageHeight * 100}%`,
                          width: `${layout.effectiveCardWidth / layout.pageWidth * 100}%`,
                          height: `${layout.effectiveCardHeight / layout.pageHeight * 100}%`,
                          border: cardNumber 
                            ? layout.showGuides ? `3px solid ${layout.stockType === 'perforated' ? getPerforatedGuideColor(index) : 'hsl(var(--muted-foreground))'}` : '1px solid transparent'
                            : '1px dashed hsl(var(--border))',
                          backgroundColor: cardNumber 
                            ? 'hsl(var(--muted) / 0.3)' 
                            : 'transparent',
                          borderRadius: 'calc(var(--radius) - 2px)',
                          opacity: cardNumber ? 1 : 0.4
                        }}
                        onClick={() => cardNumber && toggleCardFlip(cardNumber)}
                      >
                        {cardNumber && (
                          <>
                            {/* Card content */}
                            <div className="w-full h-full relative">
                              {displayBackSide ? (
                                // Back side preview
                                <div 
                                  className="w-full h-full flex flex-col items-center justify-center relative"
                                  style={{ backgroundColor: 'hsl(var(--card))' }}
                                >
                                  {/* Dartboard watermark */}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-15">
                                    <img
                                      src="/images/home/dartboard.png"
                                      alt="Dartboard"
                                      className="w-8 h-8 object-contain"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                  
                                  {/* Batch number */}
                                  <div 
                                    className="absolute bottom-1 right-1 text-xs font-bold"
                                    style={{ color: 'hsl(var(--foreground))' }}
                                  >
                                    {generateBatchNumber(cardNumber)}
                                  </div>
                                  
                                  {/* Date */}
                                  <div 
                                    className="absolute bottom-1 left-1 text-xs"
                                    style={{ color: 'hsl(var(--muted-foreground))' }}
                                  >
                                    {new Date().toLocaleDateString()}
                                  </div>
                                  
                                  {/* Back indicator */}
                                  <div 
                                    className="text-xs font-medium"
                                    style={{ color: 'hsl(var(--muted-foreground))' }}
                                  >
                                    BACK
                                  </div>
                                </div>
                              ) : (
                                // Front side preview
                                <img
                                  src={templatePath}
                                  alt={`Card ${cardNumber}`}
                                  className="w-full h-full object-cover"
                                  style={{ borderRadius: 'calc(var(--radius) - 3px)' }}
                                  onError={(e) => {
                                    // Fallback for missing images
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjYwIiB2aWV3Qm94PSIwIDAgMTAwIDYwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjIwIiBjeT0iMTUiIHI9IjIiIGZpbGw9IiM5QjEwMUMiLz4KPGNpcmNsZSBjeD0iMzAiIGN5PSIxNSIgcj0iMiIgZmlsbD0iIzlCMTAxQyIvPgo8Y2lyY2xlIGN4PSI0MCIgY3k9IjE1IiByPSIyIiBmaWxsPSIjOUIxMDFDIi8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMTUiIHI9IjIiIGZpbGw9IiM5QjEwMUMiLz4KPHN2Zz4K';
                                  }}
                                />
                              )}
                            </div>
                            
                            {/* Card number overlay (only on front) */}
                            {!displayBackSide && (
                              <div 
                                className="absolute top-1 left-1 text-xs px-1 rounded"
                                style={{
                                  backgroundColor: 'hsl(var(--foreground) / 0.8)',
                                  color: 'hsl(var(--background))',
                                  borderRadius: 'calc(var(--radius) - 4px)',
                                  fontFamily: 'var(--font-mono)'
                                }}
                              >
                                #{cardNumber.toString().padStart(3, '0')}
                              </div>
                            )}
                            {!displayBackSide && (
                              <div className="absolute bottom-1 right-1 text-xs font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                                {generateBatchNumber(cardNumber)}
                              </div>
                            )}
                            
                            {/* Flip indicator */}
                            <div 
                              className="absolute top-1 right-1 text-xs px-1 rounded"
                              style={{
                                backgroundColor: 'hsl(var(--primary) / 0.9)',
                                color: 'hsl(var(--primary-foreground))',
                                borderRadius: 'calc(var(--radius) - 4px)'
                              }}
                            >
                              {displayBackSide ? '↻' : '🔄'}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Sheet label */}
                <div 
                  className="absolute bottom-2 right-2 text-xs"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  Sheet {sheetIndex + 1} - {showBackSide ? 'Back' : 'Front'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Guide */}
      <div 
        className="rounded-lg p-4"
        style={{
          backgroundColor: 'hsl(var(--primary) / 0.1)',
          borderRadius: 'var(--radius)',
          border: '1px solid hsl(var(--primary) / 0.2)'
        }}
      >
        <h4 
          className="font-medium mb-2"
          style={{ 
            color: 'hsl(var(--primary))',
            fontFamily: 'var(--font-sans)'
          }}
        >
          💡 Interactive Preview
        </h4>
        <ul 
          className="text-sm space-y-1"
          style={{ 
            color: 'hsl(var(--primary))',
            fontFamily: 'var(--font-sans)'
          }}
        >
          <li>• Click <strong>Front/Back Side</strong> buttons to view all cards at once</li>
          <li>• Click individual cards to flip them (🔄 icon appears)</li>
          <li>• Back side shows dartboard watermark + batch number</li>
          <li>• Front side shows template + card number</li>
        </ul>
      </div>

      {/* Layout Info */}
      <div 
        className="rounded-lg p-4"
        style={{
          backgroundColor: 'hsl(var(--muted) / 0.5)',
          borderRadius: 'var(--radius)',
          border: '1px solid hsl(var(--border))'
        }}
      >
        <h4 
          className="font-medium mb-3"
          style={{ 
            color: 'hsl(var(--foreground))',
            fontFamily: 'var(--font-sans)'
          }}
        >
          Production Pipeline
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div 
              className="font-medium"
              style={{ 
                color: 'hsl(var(--foreground))',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Front Side
            </div>
            <ul 
              className="space-y-1"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              <li>• Template design</li>
              <li>• Card number (#001, #002...)</li>
              <li>• Cut guides</li>
            </ul>
          </div>
          <div>
            <div 
              className="font-medium"
              style={{ 
                color: 'hsl(var(--foreground))',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Back Side
            </div>
            <ul 
              className="space-y-1"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              <li>• Dartboard logo watermark (15% opacity)</li>
              <li>• Batch number ({batchId || 'XXXXXX'}-001)</li>
              <li>• Print date stamp</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardPreview;