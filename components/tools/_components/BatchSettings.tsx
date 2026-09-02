// app/punchcards/_components/BatchSettings.tsx
"use client";

import React, { useState } from 'react';
import { type PaperLayout, type PaperStockSettings } from './layout';

interface BatchSettingsProps {
  cardCount: number;
  onCardCountChange: (count: number) => void;
  batchName: string;
  onBatchNameChange: (name: string) => void;
  paperStock: PaperStockSettings;
  onPaperStockChange: (settings: PaperStockSettings) => void;
  layout: PaperLayout;
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  children, 
  defaultOpen = true, 
  icon = "⚙️" 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div 
      className="border rounded-lg overflow-hidden transition-all duration-200"
      style={{
        borderColor: 'hsl(var(--border))',
        borderRadius: 'var(--radius)',
        backgroundColor: 'hsl(var(--card))',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between transition-all duration-200"
        style={{
          backgroundColor: 'hsl(var(--secondary) / 0.3)',
          color: 'hsl(var(--foreground))',
          fontFamily: 'var(--font-sans)',
          borderBottom: isOpen ? '1px solid hsl(var(--border))' : 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'hsl(var(--secondary) / 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'hsl(var(--secondary) / 0.3)';
        }}
      >
        <div className="flex items-center space-x-2">
          <span>{icon}</span>
          <span 
            className="font-medium text-sm"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            {title}
          </span>
        </div>
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={{
          backgroundColor: 'hsl(var(--card))',
          maxHeight: isOpen ? '1000px' : '0'
        }}
      >
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

const BatchSettings: React.FC<BatchSettingsProps> = ({
  cardCount,
  onCardCountChange,
  batchName,
  onBatchNameChange, paperStock, onPaperStockChange, layout
}) => {
  const layoutOptions = [
    { count: 4, layout: '2×2', description: 'Small batch, more spacing' },
    { count: 6, layout: '2×3', description: 'Medium batch, good spacing' },
    { count: 8, layout: '2×4', description: 'One full perforated sheet' },
    { count: 10, layout: '8 + 2', description: 'Ten cards across two sheets' }
  ];

  const handleQuickCounts = (count: number) => {
    onCardCountChange(count);
  };

  const calculateSheets = (totalCards: number, cardsPerSheet: number) => {
    return Math.ceil(totalCards / cardsPerSheet);
  };

  const updatePaperStock = (field: keyof PaperStockSettings, value: string | number) => {
    const nextSettings = { ...paperStock, [field]: value };
    onPaperStockChange(nextSettings);
    if (window.localStorage.getItem('dart-punch-card-paper-stock')) {
      window.localStorage.setItem('dart-punch-card-paper-stock', JSON.stringify(nextSettings));
    }
  };
  const savePaperStock = (checked: boolean) => checked
    ? window.localStorage.setItem('dart-punch-card-paper-stock', JSON.stringify(paperStock))
    : window.localStorage.removeItem('dart-punch-card-paper-stock');

  return (
    <div 
      className="space-y-4"
      style={{ 
        fontFamily: 'var(--font-sans)',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Basic Settings - Always Visible */}
      <CollapsibleSection title="Basic Settings" defaultOpen={true} icon="📝">
        <div className="space-y-4">
          {/* Batch Name */}
          <div>
            <label 
              htmlFor="batch-name" 
              className="block text-sm font-medium mb-2"
              style={{ 
                color: 'hsl(var(--foreground))',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Batch Name
            </label>
            <input
              id="batch-name"
              type="text"
              value={batchName}
              onChange={(e) => onBatchNameChange(e.target.value)}
              placeholder="e.g., Employee Cards Q1"
              className="w-full px-3 py-2 rounded-md transition-all duration-200"
              style={{
                backgroundColor: 'hsl(var(--input))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-sans)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'hsl(var(--ring))';
                e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ring) / 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'hsl(var(--border))';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Total Cards */}
          <div>
            <label 
              htmlFor="card-count" 
              className="block text-sm font-medium mb-2"
              style={{ 
                color: 'hsl(var(--foreground))',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Total Cards Needed
            </label>
            <div className="flex items-center space-x-3">
              <input
                id="card-count"
                type="number"
                min="1"
                max="1000"
                value={cardCount}
                onChange={(e) => onCardCountChange(parseInt(e.target.value) || 1)}
                className="flex-1 px-3 py-2 rounded-md transition-all duration-200"
                style={{
                  backgroundColor: 'hsl(var(--input))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-sans)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'hsl(var(--ring))';
                  e.currentTarget.style.boxShadow = '0 0 0 3px hsl(var(--ring) / 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'hsl(var(--border))';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <div 
                className="text-sm"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                cards
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Layout Options */}
      <CollapsibleSection title="Layout Options" defaultOpen={false} icon="📐">
        <div>
          <label 
            className="block text-sm font-medium mb-3"
            style={{ 
              color: 'hsl(var(--foreground))',
              fontFamily: 'var(--font-sans)'
            }}
          >
            Batch Size Presets
          </label>
          <div className="space-y-2">
            {layoutOptions.map(option => (
              <div
                key={option.count}
                onClick={() => handleQuickCounts(option.count)}
                className="cursor-pointer rounded-lg border-2 p-3 transition-all duration-200"
                style={{
                  borderColor: cardCount === option.count 
                    ? 'hsl(var(--primary))' 
                    : 'hsl(var(--border))',
                  backgroundColor: cardCount === option.count 
                    ? 'hsl(var(--primary) / 0.1)' 
                    : 'hsl(var(--card))',
                  borderRadius: 'var(--radius)'
                }}
                onMouseEnter={(e) => {
                  if (cardCount !== option.count) {
                    e.currentTarget.style.borderColor = 'hsl(var(--border))';
                    e.currentTarget.style.backgroundColor = 'hsl(var(--muted) / 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (cardCount !== option.count) {
                    e.currentTarget.style.borderColor = 'hsl(var(--border))';
                    e.currentTarget.style.backgroundColor = 'hsl(var(--card))';
                  }
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span 
                      className="font-medium"
                      style={{ 
                        color: 'hsl(var(--foreground))',
                        fontFamily: 'var(--font-sans)'
                      }}
                    >
                      {option.count} cards
                    </span>
                    <span 
                      className="ml-2"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    >
                      ({option.layout})
                    </span>
                  </div>
                  <div 
                    className="text-xs"
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                  >
                    {option.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* Quick Select */}
      <CollapsibleSection title="Quick Select" defaultOpen={false} icon="⚡">
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ 
              color: 'hsl(var(--foreground))',
              fontFamily: 'var(--font-sans)'
            }}
          >
            Common Quantities
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[10, 25, 50, 100, 200, 500].map(count => (
              <button
                key={count}
                onClick={() => handleQuickCounts(count)}
                className="px-3 py-2 text-sm rounded transition-all duration-200"
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
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--secondary))';
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* Print Summary - Always Visible */}
      <CollapsibleSection title="Paper Stock" defaultOpen={true} icon="📄">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm col-span-2">Use case
            <select value={paperStock.stockType} onChange={(e) => updatePaperStock('stockType', e.target.value)} className="mt-1 w-full rounded-md p-2" style={{ backgroundColor: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}>
              <option value="perforated">Pre-perforated stock (no bleed or cut lines)</option>
              <option value="standard">Standard paper (bleed and cut lines)</option>
            </select>
          </label>
          <label className="text-sm">Page size
            <select value={paperStock.pageSize} onChange={(e) => updatePaperStock('pageSize', e.target.value)} className="mt-1 w-full rounded-md p-2" style={{ backgroundColor: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}><option value="letter">Letter (8.5×11 in)</option><option value="a4">A4 (210×297 mm)</option></select>
          </label>
          <label className="text-sm">Card orientation
            <select value={paperStock.orientation} onChange={(e) => updatePaperStock('orientation', e.target.value)} className="mt-1 w-full rounded-md p-2" style={{ backgroundColor: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select>
          </label>
          {([['cardWidth', 'Card width (in)'], ['cardHeight', 'Card height (in)'], ['topMargin', 'Top margin (in)'], ['leftMargin', 'Left margin (in)'], ['horizontalGap', 'Horizontal gap (in)'], ['verticalGap', 'Vertical gap (in)'], ['bleed', 'Bleed (in)']] as const).map(([field, label]) => <label key={field} className="text-sm">{label}<input type="number" min="0" step="0.01" disabled={field === 'bleed' && paperStock.stockType === 'perforated'} value={paperStock[field]} onChange={(e) => updatePaperStock(field, Number(e.target.value) || 0)} className="mt-1 w-full rounded-md p-2 disabled:opacity-50" style={{ backgroundColor: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }} /></label>)}
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--foreground))' }}><input type="checkbox" onChange={(e) => savePaperStock(e.target.checked)} /> Save as default</label>
        <label className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--foreground))' }}><input type="checkbox" checked={paperStock.showGuides} onChange={(e) => updatePaperStock('showGuides', e.target.checked)} /> Show removable alignment guides</label>
        <p className="mt-2 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Default offsets are provisional until Social confirms the physical stock measurements.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm">Columns<input type="number" min="1" step="1" value={paperStock.columns} disabled={paperStock.stockType === 'standard'} onChange={(e) => updatePaperStock('columns', Number(e.target.value) || 1)} className="mt-1 w-full rounded-md p-2 disabled:opacity-50" style={{ backgroundColor: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }} /></label>
          <label className="text-sm">Rows<input type="number" min="1" step="1" value={paperStock.rows} disabled={paperStock.stockType === 'standard'} onChange={(e) => updatePaperStock('rows', Number(e.target.value) || 1)} className="mt-1 w-full rounded-md p-2 disabled:opacity-50" style={{ backgroundColor: 'hsl(var(--input))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }} /></label>
        </div>
        <p className="mt-3 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{paperStock.stockType === 'perforated' ? 'Stock grid' : 'Calculated layout'}: {layout.columns}×{layout.rows} ({layout.cardsPerSheet} cards per sheet)</p>
      </CollapsibleSection>

      <CollapsibleSection title="Print Summary" defaultOpen={true} icon="📊">
        <div 
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'hsl(var(--muted) / 0.3)',
            borderRadius: 'var(--radius)'
          }}
        >
          <h4 
            className="font-medium mb-2"
            style={{ 
              color: 'hsl(var(--foreground))',
              fontFamily: 'var(--font-sans)'
            }}
          >
            Print Summary
          </h4>
          <div 
            className="space-y-1 text-sm"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            <div className="flex justify-between">
              <span>Total cards:</span>
              <span 
                className="font-medium"
                style={{ color: 'hsl(var(--foreground))' }}
              >
                {cardCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{paperStock.pageSize === 'a4' ? 'A4' : 'Letter'} sheets needed:</span>
              <span 
                className="font-medium"
                style={{ color: 'hsl(var(--foreground))' }}
              >
                {calculateSheets(cardCount, layout.cardsPerSheet)} sheets
              </span>
            </div>
            <div className="flex justify-between">
              <span>Cards per sheet:</span>
              <span 
                className="font-medium"
                style={{ color: 'hsl(var(--foreground))' }}
              >
                {layout.cardsPerSheet} ({layout.columns}×{layout.rows} layout)
              </span>
            </div>
            {cardCount % layout.cardsPerSheet !== 0 && (
              <div 
                className="flex justify-between"
                style={{ color: 'hsl(var(--destructive))' }}
              >
                <span>Last sheet:</span>
                <span className="font-medium">{cardCount % layout.cardsPerSheet} cards</span>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Print Tips */}
      <CollapsibleSection title="Print Tips" defaultOpen={false} icon="💡">
        <div 
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'hsl(var(--primary) / 0.1)',
            borderRadius: 'var(--radius)'
          }}
        >
          <h4 
            className="font-medium mb-2"
            style={{ 
              color: 'hsl(var(--primary))',
              fontFamily: 'var(--font-sans)'
            }}
          >
            💡 Print Tips
          </h4>
          <ul 
            className="text-sm space-y-1"
            style={{ 
              color: 'hsl(var(--primary))',
              fontFamily: 'var(--font-sans)'
            }}
          >
            <li>• Use {paperStock.pageSize === 'a4' ? 'A4 paper (210×297mm)' : 'US Letter paper (8.5×11in)'}</li>
            <li>• Set printer to 100% scale</li>
            <li>• Enable duplex for front/back printing</li>
            <li>• {paperStock.stockType === 'perforated' ? 'Tear along the pre-perforated lines' : 'Cut along the printed dotted lines'}</li>
          </ul>
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default BatchSettings;