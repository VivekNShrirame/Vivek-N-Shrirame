
import React, { useState, useEffect, useCallback } from 'react';
import { LogoIcon, XCircleIcon } from './icons';
import { getConfiguredPdfjsLib } from '../services/geminiService';

const Spinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-2">
    <LogoIcon className="w-12 h-12 text-blue-500 animate-spin" />
    <p className="text-gray-600 dark:text-gray-400">Loading Preview...</p>
  </div>
);

interface ResumePreviewerProps {
  file: File;
  onConfirm: (options?: { pages?: number[] }) => void;
  onCancel: () => void;
}

const MAX_PREVIEW_DIMENSION = 1024; // Max width or height in pixels for preview
const PREVIEW_QUALITY = 0.7; // JPEG quality for preview

const ResumePreviewer: React.FC<ResumePreviewerProps> = ({ file, onConfirm, onCancel }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PDF state
  const [numPages, setNumPages] = useState(0);
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [manualPageInput, setManualPageInput] = useState('');

  // Image state
  const [imageUrl, setImageUrl] = useState<string>('');

  // DOCX state
  const [docHtmlContent, setDocHtmlContent] = useState<string>('');
  
  const loadFile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        if (file.type === 'application/pdf') {
            const pdfjsLib = await getConfiguredPdfjsLib();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            setNumPages(pdf.numPages);
            
            // Auto-select all pages by default
            if (pdf.numPages > 0) {
                // Explicitly creating the array of page numbers [1, 2, ... numPages]
                const allPages = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
                setSelectedPages(new Set(allPages));
            }

            const loadedThumbnails: string[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.4 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                if (context) {
                    await page.render({ canvasContext: context, viewport }).promise;
                    loadedThumbnails.push(canvas.toDataURL('image/png'));
                }
            }
            setPageThumbnails(loadedThumbnails);
        } else if (file.type.startsWith('image/')) {
            // Optimize image loading: Resize large images for preview to save memory
            await new Promise<void>((resolve, reject) => {
                const img = new Image();
                const objectUrl = URL.createObjectURL(file);
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions if image is too large
                    if (width > MAX_PREVIEW_DIMENSION || height > MAX_PREVIEW_DIMENSION) {
                        if (width > height) {
                            height = Math.round(height * (MAX_PREVIEW_DIMENSION / width));
                            width = MAX_PREVIEW_DIMENSION;
                        } else {
                            width = Math.round(width * (MAX_PREVIEW_DIMENSION / height));
                            height = MAX_PREVIEW_DIMENSION;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        // Use JPEG with compression for preview
                        setImageUrl(canvas.toDataURL('image/jpeg', PREVIEW_QUALITY));
                    } else {
                        // Fallback to original if context fails (unlikely)
                        setImageUrl(objectUrl);
                    }
                    
                    URL.revokeObjectURL(objectUrl); // Clean up intermediate URL
                    resolve();
                };

                img.onerror = (e) => {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error("Failed to load image for resizing."));
                };

                img.src = objectUrl;
            });

        } else if (file.type.includes('wordprocessingml') || file.type.includes('msword')) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await (window as any).mammoth.convertToHtml({ arrayBuffer });
            setDocHtmlContent(result.value);
        }
    } catch (err) {
        console.error("Failed to load file preview:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(`Failed to load preview: ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  }, [file]);

  useEffect(() => {
    loadFile();
    
    // Cleanup not strictly necessary for Data URLs generated by canvas, 
    // but good practice if we reverted to ObjectURLs
    return () => {
        // No-op for data URLs
    };
  }, [loadFile]);

  useEffect(() => {
    // Sync selected pages to manual input when selection changes
    if (selectedPages.size > 0) {
        const sorted: number[] = Array.from<number>(selectedPages).sort((a: number, b: number) => a - b);
        
        // Convert to ranges for nicer display (e.g., "1-3, 5")
        const ranges: string[] = [];
        let start: number = sorted[0];
        let prev: number = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === prev + 1) {
                prev = sorted[i];
            } else {
                ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
                start = sorted[i];
                prev = sorted[i];
            }
        }
        ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
        setManualPageInput(ranges.join(', '));
    } else {
        setManualPageInput('');
    }
  }, [selectedPages]);

  const handleTogglePage = (pageNumber: number) => {
    setSelectedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageNumber)) {
        newSet.delete(pageNumber);
      } else {
        newSet.add(pageNumber);
      }
      return newSet;
    });
  };
  
  const selectAllPages = () => {
    const all = new Set<number>(Array.from({ length: numPages }, (_, i: number) => i + 1));
    setSelectedPages(all);
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
  };

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setManualPageInput(e.target.value);
  };

  const applyManualSelection = () => {
    const parts = manualPageInput.split(',').map(p => p.trim()).filter(p => p);
    const newSelection = new Set<number>();

    parts.forEach(part => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n, 10));
            if (!isNaN(start) && !isNaN(end)) {
                const min = Math.min(start, end);
                const max = Math.max(start, end);
                for (let i = min; i <= max; i++) {
                    if (i >= 1 && i <= numPages) newSelection.add(i);
                }
            }
        } else {
            const page = parseInt(part, 10);
            if (!isNaN(page) && page >= 1 && page <= numPages) {
                newSelection.add(page);
            }
        }
    });

    setSelectedPages(newSelection);
  };


  const handleConfirm = () => {
    if (file.type === 'application/pdf') {
        onConfirm({ pages: Array.from<number>(selectedPages).sort((a: number, b: number) => a - b) });
    } else {
        onConfirm();
    }
  };
  
  const renderPreviewContent = () => {
    if (isLoading) {
        return <div className="h-full flex items-center justify-center"><Spinner /></div>;
    }

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center text-red-500">
                <XCircleIcon className="w-12 h-12 mb-2" />
                <p className="font-semibold">Error Loading Preview</p>
                <p className="text-sm">{error}</p>
            </div>
        );
    }
    
    if (file.type === 'application/pdf') {
        return (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <p className="text-sm font-medium whitespace-nowrap">{selectedPages.size} / {numPages} selected</p>
                    <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                    <div className="flex gap-2">
                        <button 
                            onClick={selectAllPages} 
                            disabled={selectedPages.size === numPages}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-900/30 dark:text-blue-300"
                        >
                            All
                        </button>
                        <button 
                            onClick={clearSelection} 
                            disabled={selectedPages.size === 0}
                            className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-600 dark:text-gray-300"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <input 
                        type="text" 
                        value={manualPageInput}
                        onChange={handleManualInputChange}
                        placeholder="e.g. 1, 3-5" 
                        className="flex-1 md:w-32 px-2 py-1 text-sm border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <button 
                        onClick={applyManualSelection}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Apply
                    </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[60vh] overflow-y-auto p-1">
                {pageThumbnails.map((thumbnail, index) => {
                  const pageNum = index + 1;
                  const isSelected = selectedPages.has(pageNum);
                  return (
                    <div key={pageNum} className="relative cursor-pointer group" onClick={() => handleTogglePage(pageNum)}>
                      <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center border-2 shadow-sm transition-all z-10 ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                        {isSelected ? (
                             <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                            <span className="text-[10px] text-gray-500 font-medium">{pageNum}</span>
                        )}
                      </div>
                      <div className={`rounded-lg overflow-hidden border-2 transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-transparent hover:border-blue-300'}`}>
                          <img src={thumbnail} alt={`Page ${pageNum}`} className="w-full h-auto block" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
        );
    }
    
    if (file.type.startsWith('image/')) {
        return (
            <div className="flex justify-center items-center h-full bg-gray-100 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <img src={imageUrl} alt="Resume Preview" className="max-w-full max-h-[60vh] object-contain shadow-sm rounded"/>
            </div>
        );
    }

    if (file.type.includes('wordprocessingml')) {
        return (
             <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg max-h-[65vh] overflow-y-auto shadow-inner">
                 <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: docHtmlContent }} />
             </div>
        );
    }
    
    return <p className="text-center text-gray-500">Preview is not available for this file type.</p>;
  }
  
  const getConfirmButtonText = () => {
    if (file.type === 'application/pdf') {
        return `Parse ${selectedPages.size} Selected Page(s)`;
    }
    return 'Parse Resume';
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh] animate-fade-in">
        <header className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700">
          <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Resume Preview</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">{file.name}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <XCircleIcon className="w-8 h-8" />
          </button>
        </header>
        
        <main className="p-6 flex-grow overflow-y-auto">
          {renderPreviewContent()}
        </main>
        
        <footer className="p-5 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <button onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
            Cancel
          </button>
          <button 
            onClick={handleConfirm} 
            disabled={isLoading || !!error || (file.type === 'application/pdf' && selectedPages.size === 0)} 
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30"
          >
            {getConfirmButtonText()}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ResumePreviewer;
