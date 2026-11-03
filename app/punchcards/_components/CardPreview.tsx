// app/punchcards/_components/CardPreview.tsx
"use client";

import React, { useState } from 'react';

interface CardPreviewProps {
  templatePath: string;
  cardCount: number;
  batchId?: string;
}

const CardPreview: React.FC<CardPreviewProps> = ({ templatePath, cardCount, batchId }) => {
  const [showBackSide, setShowBackSide] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  // Calculate layout based on card count
  const getLayout = (count: number) => {
    if (count <= 4) return { cols: 2, rows: 2, cardsPerSheet: 4 };
    if (count <= 6) return { cols: 2, rows: 3, cardsPerSheet: 6 };
    return { cols: 2, rows: 4, cardsPerSheet: 8 };
  };

  const layout = getLayout(cardCount);
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
    <div className="space-y-6">
      {/* Preview Info */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium text-gray-900">A4 Layout Preview</h3>
          <p className="text-sm text-gray-500">
            {layout.cols}×{layout.rows} layout • {cardCount} total cards • {sheetsNeeded} sheet{sheetsNeeded > 1 ? 's' : ''}
          </p>
          {batchId && (
            <p className="text-xs text-blue-600 mt-1">
              Batch ID: {batchId}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 mb-2">
            <div>Card size: 92×54mm</div>
            <div>Paper: A4 (210×297mm)</div>
          </div>
          {/* Flip Controls */}
          <div className="flex space-x-2">
            <button
              onClick={() => setShowBackSide(false)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                !showBackSide 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              Front Side
            </button>
            <button
              onClick={() => setShowBackSide(true)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                showBackSide 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
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
              <h4 className="font-medium text-gray-700">
                Sheet {sheetIndex + 1} {sheetsNeeded > 1 && `of ${sheetsNeeded}`} - {showBackSide ? 'Back Side' : 'Front Side'}
              </h4>
              
              {/* A4 Sheet Container */}
              <div className="relative bg-white border-2 border-gray-300 rounded-lg shadow-sm mx-auto"
                   style={{ 
                     width: '300px', 
                     height: '424px', // A4 ratio scaled down
                     padding: '20px' 
                   }}>
                
                {/* Cut line guides */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Vertical center line */}
                  <div className="absolute left-1/2 top-5 bottom-5 w-px border-l border-dashed border-gray-300 transform -translate-x-px"></div>
                  
                  {/* Horizontal lines */}
                  {Array.from({ length: layout.rows - 1 }, (_, i) => (
                    <div 
                      key={i}
                      className="absolute left-5 right-5 border-t border-dashed border-gray-300"
                      style={{ top: `${((i + 1) / layout.rows) * 100}%` }}
                    ></div>
                  ))}
                </div>

                {/* Cards Grid */}
                <div 
                  className="grid gap-2 h-full"
                  style={{ 
                    gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${layout.rows}, 1fr)`
                  }}
                >
                  {cardNumbers.map((cardNumber, index) => {
                    const isCardFlipped = cardNumber ? flippedCards.has(cardNumber) : false;
                    const displayBackSide = showBackSide || isCardFlipped;
                    
                    return (
                      <div
                        key={index}
                        className={`relative border rounded-sm overflow-hidden cursor-pointer transition-transform hover:scale-105 ${
                          cardNumber ? 'bg-gray-50' : 'bg-transparent border-dashed border-gray-200'
                        }`}
                        onClick={() => cardNumber && toggleCardFlip(cardNumber)}
                      >
                        {cardNumber && (
                          <>
                            {/* Card content */}
                            <div className="w-full h-full relative">
                              {displayBackSide ? (
                                // Back side preview
                                <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden" style={{ border: '2px solid #111827', boxShadow: 'inset 0 0 0 2px rgba(127,29,29,0.8)' }}>
                                  <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(135deg, rgba(15,23,42,0.05) 0%, rgba(15,23,42,0.05) 50%, transparent 50%, transparent 100%)', backgroundSize: '24px 24px' }} />

                                  <div className="absolute inset-0 flex items-center justify-center opacity-15">
                                    <img
                                      src="/images/home/dartboard.png"
                                      alt="Dartboard"
                                      className="object-contain"
                                      style={{ width: '85%', height: '85%', transform: 'rotate(-20deg)' }}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  </div>

                                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[7px] font-bold tracking-widest text-red-800">COPY RESTRICTED</div>
                                  <div className="absolute inset-x-0 top-5 flex justify-center items-center text-center px-2 text-[7px] font-bold text-gray-800">DARTS PROGRAM • AUTHORIZED PRINT ONLY</div>
                                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-black text-red-900" style={{ transform: 'translate(-50%, -50%) rotate(12deg)' }}>REPRODUCTION</div>
                                  <div className="absolute bottom-1 left-1 text-[7px] font-bold text-gray-800">Batch {generateBatchNumber(cardNumber)}</div>
                                  <div className="absolute bottom-1 right-1 text-[7px] font-bold text-gray-800">{new Date().toLocaleDateString()}</div>
                                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[6px] uppercase tracking-[0.2em] text-gray-600">VOID • DUPLICATION PROHIBITED</div>
                                </div>
                              ) : (
                                // Front side preview
                                <img
                                  src={templatePath}
                                  alt={`Card ${cardNumber}`}
                                  className="w-full h-full object-cover"
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
                              <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                                #{cardNumber.toString().padStart(3, '0')}
                              </div>
                            )}
                            
                            {/* Flip indicator */}
                            <div className="absolute top-1 right-1 bg-blue-500 bg-opacity-80 text-white text-xs px-1 rounded">
                              {displayBackSide ? '↻' : '🔄'}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Sheet label */}
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  Sheet {sheetIndex + 1} - {showBackSide ? 'Back' : 'Front'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Guide */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 Interactive Preview</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Click <strong>Front/Back Side</strong> buttons to view all cards at once</li>
          <li>• Click individual cards to flip them (🔄 icon appears)</li>
          <li>• Back side includes anti-copy security watermark, stripes, and copy-control text</li>
          <li>• Front side shows template + card number</li>
        </ul>
      </div>

      {/* Layout Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Production Pipeline</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-gray-700">Front Side</div>
            <ul className="text-gray-600 space-y-1">
              <li>• Template design</li>
              <li>• Card number (#001, #002...)</li>
              <li>• Cut guides</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-gray-700">Back Side</div>
            <ul className="text-gray-600 space-y-1">
              <li>• Anti-copy watermark + security border</li>
              <li>• Batch number ({batchId || 'XXXXXX'}-001)</li>
              <li>• Printed date + copy restriction text</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardPreview;