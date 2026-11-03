// app/punchcards/_components/TemplateSelector.tsx
"use client";

import React, { useState } from 'react';
import { useTemplateStorage, type Template } from '@/hooks/useTemplateStorage';

interface TemplateSelectorProps {
  onTemplateSelect: (templatePath: string) => void;
  selectedTemplate: string;
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
  icon = "📁" 
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

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onTemplateSelect,
  selectedTemplate
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const {
    templates,
    categories,
    isLoading,
    error,
    refreshTemplates,
    getTemplatesByCategory,
    deleteTemplate
  } = useTemplateStorage();

  const filteredTemplates = getTemplatesByCategory(selectedCategory);

  const handleDelete = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    const success = await deleteTemplate(template.id);
    if (success && selectedTemplate === template.path) {
      onTemplateSelect(''); // Clear selection if deleted template was selected
    }
  };

  if (error) {
    return (
      <div 
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: 'hsl(var(--destructive) / 0.1)',
          borderColor: 'hsl(var(--destructive))',
          color: 'hsl(var(--destructive))',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-sans)'
        }}
      >
        <h3 className="font-medium mb-2">Error Loading Templates</h3>
        <p className="text-sm">{error}</p>
        <button
          onClick={refreshTemplates}
          className="mt-2 px-3 py-1 text-sm rounded transition-all duration-200"
          style={{
            backgroundColor: 'hsl(var(--destructive))',
            color: 'hsl(var(--destructive-foreground))',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-sans)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div 
      className="space-y-4"
      style={{ 
        fontFamily: 'var(--font-sans)',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Category Filter - No Dropdown */}
      <div className="mb-6">
        <h3 
          className="font-medium mb-3 text-sm"
          style={{ 
            color: 'hsl(var(--foreground))',
            fontFamily: 'var(--font-sans)'
          }}
        >
          🏷️ Filter by Category
        </h3>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className="px-3 py-1 text-sm capitalize transition-all duration-200"
              style={{
                backgroundColor: selectedCategory === category
                  ? 'hsl(var(--primary))'
                  : 'hsl(var(--secondary))',
                color: selectedCategory === category
                  ? 'hsl(var(--primary-foreground))'
                  : 'hsl(var(--secondary-foreground))',
                borderRadius: 'var(--radius)',
                border: '1px solid hsl(var(--border))',
                fontFamily: 'var(--font-sans)'
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== category) {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--secondary))';
                  e.currentTarget.style.opacity = '0.8';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== category) {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--secondary))';
                  e.currentTarget.style.opacity = '1';
                }
              }}
            >
              {category} {selectedCategory !== 'all' && `(${getTemplatesByCategory(category).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid - No Dropdown */}
      <div className="mb-6">
        <h3 
          className="font-medium mb-3 text-sm"
          style={{ 
            color: 'hsl(var(--foreground))',
            fontFamily: 'var(--font-sans)'
          }}
        >
          🎨 Available Templates
        </h3>
        {isLoading ? (
          <div 
            className="flex items-center justify-center py-8"
            style={{ 
              color: 'hsl(var(--muted-foreground))',
              fontFamily: 'var(--font-sans)'
            }}
          >
            <div 
              className="animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full mr-2"
              style={{ borderColor: 'hsl(var(--primary))' }}
            ></div>
            Loading templates...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                onClick={() => onTemplateSelect(template.path)}
                className="cursor-pointer rounded-lg border-2 p-3 transition-all duration-200 hover:shadow-md group"
                style={{
                  borderColor: selectedTemplate === template.path
                    ? 'hsl(var(--primary))'
                    : 'hsl(var(--border))',
                  backgroundColor: selectedTemplate === template.path
                    ? 'hsl(var(--primary) / 0.1)'
                    : 'hsl(var(--card))',
                  borderRadius: 'var(--radius)'
                }}
                onMouseEnter={(e) => {
                  if (selectedTemplate !== template.path) {
                    e.currentTarget.style.borderColor = 'hsl(var(--border))';
                    e.currentTarget.style.backgroundColor = 'hsl(var(--muted) / 0.3)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTemplate !== template.path) {
                    e.currentTarget.style.borderColor = 'hsl(var(--border))';
                    e.currentTarget.style.backgroundColor = 'hsl(var(--card))';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-16 h-10 rounded border flex items-center justify-center overflow-hidden"
                    style={{
                      backgroundColor: 'hsl(var(--muted) / 0.3)',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'calc(var(--radius) - 2px)'
                    }}
                  >
                    <img
                      src={template.path}
                      alt={template.name}
                      width={64}
                      height={40}
                      className="object-cover"
                      style={{ borderRadius: 'calc(var(--radius) - 3px)' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA2NCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEgzMlYyMkgyMFYyMFpNMjAgMjRIMzJWMjZIMjBWMjRaIiBmaWxsPSIjOUIxMDFDIi8+Cjx0ZXh0IHg9IjMyIiB5PSIyNCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjhweCIgZmlsbD0iIzZCNzI4MCI+UHVuY2ggQ2FyZDwvdGV4dD4KPC9zdmc+';
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 
                      className="font-medium text-sm"
                      style={{ 
                        color: 'hsl(var(--foreground))',
                        fontFamily: 'var(--font-sans)'
                      }}
                    >
                      {template.name}
                    </h3>
                    <p 
                      className="text-xs"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    >
                      {template.description}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex gap-1 flex-wrap">
                        {template.category.split('_').map((cat, index) => (
                          <span 
                            key={index}
                            className="inline-block px-2 py-0.5 text-xs rounded capitalize"
                            style={{
                              backgroundColor: `hsl(var(--chart-${(index % 5) + 1}) / 0.2)`,
                              color: 'hsl(var(--foreground))',
                              borderRadius: 'calc(var(--radius) - 2px)',
                              fontFamily: 'var(--font-sans)',
                              border: `1px solid hsl(var(--chart-${(index % 5) + 1}) / 0.3)`
                            }}
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(template);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded"
                        style={{
                          color: 'hsl(var(--destructive))',
                          backgroundColor: 'hsl(var(--destructive) / 0.1)',
                          borderRadius: 'calc(var(--radius) - 2px)'
                        }}
                        title="Delete template"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'hsl(var(--destructive) / 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'hsl(var(--destructive) / 0.1)';
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredTemplates.length === 0 && !isLoading && (
              <div 
                className="text-center py-8"
                style={{ 
                  color: 'hsl(var(--muted-foreground))',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                <p>No templates found in this category.</p>
                <p className="text-xs mt-1">Upload some templates to get started!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template Stats */}
      <div 
        className="rounded-lg p-4"
        style={{
          backgroundColor: 'hsl(var(--muted) / 0.3)',
          borderRadius: 'var(--radius)',
          border: '1px solid hsl(var(--border))'
        }}
      >
        <h4 
          className="font-medium mb-2"
          style={{ 
            color: 'hsl(var(--foreground))',
            fontFamily: 'var(--font-sans)'
          }}
        >
          📊 Template Library
        </h4>
        <div 
          className="grid grid-cols-2 gap-4 text-sm"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          <div>
            <div 
              className="font-medium"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              Total Templates
            </div>
            <div 
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              {templates.length} available
            </div>
          </div>
          <div>
            <div 
              className="font-medium"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              Categories
            </div>
            <div 
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              {categories.length - 1} unique {/* -1 to exclude 'all' */}
            </div>
          </div>
        </div>
        
        {selectedTemplate && (
          <div 
            className="mt-3 pt-3"
            style={{ borderTop: '1px solid hsl(var(--border))' }}
          >
            <div 
              className="font-medium text-sm"
              style={{ color: 'hsl(var(--primary))' }}
            >
              ✅ Selected Template
            </div>
            <div 
              className="text-xs"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              {templates.find(t => t.path === selectedTemplate)?.name || 'Unknown Template'}
            </div>
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={refreshTemplates}
        disabled={isLoading}
        className="w-full py-2 px-4 text-sm rounded transition-all duration-200"
        style={{
          backgroundColor: 'hsl(var(--secondary))',
          color: 'hsl(var(--secondary-foreground))',
          borderRadius: 'var(--radius)',
          border: '1px solid hsl(var(--border))',
          fontFamily: 'var(--font-sans)',
          opacity: isLoading ? 0.6 : 1,
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.backgroundColor = 'hsl(var(--secondary))';
            e.currentTarget.style.opacity = '0.8';
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading) {
            e.currentTarget.style.backgroundColor = 'hsl(var(--secondary))';
            e.currentTarget.style.opacity = '1';
          }
        }}
      >
        🔄 {isLoading ? 'Refreshing...' : 'Refresh Templates'}
      </button>
    </div>
  );
};

export default TemplateSelector;