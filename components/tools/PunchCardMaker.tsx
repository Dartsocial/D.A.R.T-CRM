// app/punchcards/PunchCardClient.tsx
"use client";

import React, { useState } from 'react';
import TemplateSelector from './_components/TemplateSelector';
import CardPreview from './_components/CardPreview';
import PDFGenerator from './_components/PDFGenerator';
import BatchSettings from './_components/BatchSettings';

interface PunchCard {
  front: string;
  back: string;
  cardNumber: number;
  batchNumber: string;
}

const PunchCardClient: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [cardCount, setCardCount] = useState<number>(8);
  const [batchName, setBatchName] = useState<string>('');
  const [generatedCards, setGeneratedCards] = useState<PunchCard[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentBatchId, setCurrentBatchId] = useState<string>('');

  const handleTemplateSelect = (templatePath: string) => {
    setSelectedTemplate(templatePath);
  };

  const generateBatchId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleGenerateCards = async () => {
    if (!selectedTemplate) {
      alert('Please select a template first');
      return;
    }

    setIsGenerating(true);
    const batchId = generateBatchId();
    setCurrentBatchId(batchId);

    try {
      const cards: PunchCard[] = [];
      
      // Generate individual cards
      for (let i = 1; i <= cardCount; i++) {
        const cardNumber = i;
        const batchNumber = `${batchId}-${i.toString().padStart(3, '0')}`;
        
        // This will be handled by PDFGenerator
        cards.push({
          front: selectedTemplate,
          back: '/images/home/dartboard.png',
          cardNumber,
          batchNumber
        });
      }

      setGeneratedCards(cards);
    } catch (error) {
      console.error('Error generating cards:', error);
      alert('Error generating cards. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div 
      className="container mx-auto p-6 max-w-6xl"
      style={{ 
        fontFamily: 'var(--font-sans)',
        backgroundColor: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        transition: 'background-color 0.3s ease, color 0.3s ease'
      }}
    >
      <div className="mb-8">
        <h1 
          className="text-3xl font-bold mb-2"
          style={{ 
            color: 'hsl(var(--foreground))',
            fontFamily: 'var(--font-sans)'
          }}
        >
          DARTS Punch Card Maker
        </h1>
        <p 
          style={{ 
            color: 'hsl(var(--muted-foreground))',
            fontFamily: 'var(--font-sans)'
          }}
        >
          Use one of our templates or upload your own! Create professional punch cards with A4-optimized layouts for easy printing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Template Selection & Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div 
            className="p-6"
            style={{
              backgroundColor: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid hsl(var(--border))',
              transition: 'all 0.3s ease'
            }}
          >
            <h2 
              className="text-xl font-semibold mb-4"
              style={{ 
                color: 'hsl(var(--card-foreground))',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Select Template
            </h2>
            <TemplateSelector 
              onTemplateSelect={handleTemplateSelect}
              selectedTemplate={selectedTemplate}
            />
          </div>

          <div 
            className="p-6"
            style={{
              backgroundColor: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid hsl(var(--border))',
              transition: 'all 0.3s ease'
            }}
          >
            <h2 
              className="text-xl font-semibold mb-4"
              style={{ 
                color: 'hsl(var(--card-foreground))',
                fontFamily: 'var(--font-sans)'
              }}
            >
              Batch Settings
            </h2>
            <BatchSettings
              cardCount={cardCount}
              onCardCountChange={setCardCount}
              batchName={batchName}
              onBatchNameChange={setBatchName}
            />
          </div>

          <button
            onClick={handleGenerateCards}
            disabled={!selectedTemplate || isGenerating}
            className="w-full py-3 px-4 font-medium transition-all duration-200"
            style={{
              backgroundColor: selectedTemplate && !isGenerating 
                ? 'hsl(var(--primary))' 
                : 'hsl(var(--muted))',
              color: selectedTemplate && !isGenerating 
                ? 'hsl(var(--primary-foreground))' 
                : 'hsl(var(--muted-foreground))',
              borderRadius: 'var(--radius)',
              border: `1px solid ${selectedTemplate && !isGenerating 
                ? 'hsl(var(--primary))' 
                : 'hsl(var(--border))'}`,
              cursor: selectedTemplate && !isGenerating ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-sans)',
              boxShadow: selectedTemplate && !isGenerating 
                ? 'var(--shadow-sm)' 
                : 'none',
              opacity: selectedTemplate && !isGenerating ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (selectedTemplate && !isGenerating) {
                e.currentTarget.style.backgroundColor = 'hsl(var(--primary))';
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = 'var(--shadow)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedTemplate && !isGenerating) {
                e.currentTarget.style.backgroundColor = 'hsl(var(--primary))';
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }
            }}
          >
            {isGenerating ? 'Generating Cards...' : 'Generate Punch Cards'}
          </button>
        </div>

        {/* Right Column - Preview & Results */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTemplate && (
            <div 
              className="p-6"
              style={{
                backgroundColor: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid hsl(var(--border))',
                transition: 'all 0.3s ease'
              }}
            >
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ 
                  color: 'hsl(var(--card-foreground))',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                Preview
              </h2>
              <CardPreview 
                templatePath={selectedTemplate}
                cardCount={cardCount}
                batchId={currentBatchId}
              />
            </div>
          )}

          {generatedCards.length > 0 && (
            <div 
              className="p-6"
              style={{
                backgroundColor: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid hsl(var(--border))',
                transition: 'all 0.3s ease'
              }}
            >
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ 
                  color: 'hsl(var(--card-foreground))',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                Generated Cards
              </h2>
              <PDFGenerator 
                cards={generatedCards}
                batchName={batchName}
                batchId={currentBatchId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PunchCardClient;