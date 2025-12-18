
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Candidate, FileStatus } from './types';
import { parseResume, analyzeCandidateMatch } from './services/geminiService';
import FileUpload from './components/FileUpload';
import CandidateTable from './components/CandidateTable';
import ResumePreviewer from './components/ResumePreviewer';
import JobAnalysisSection from './components/JobAnalysisSection';
import { ExcelIcon, LogoIcon, TrashIcon, SunIcon, MoonIcon, CopyIcon, StarIcon } from './components/icons';

// Declare XLSX to be available from the window object via CDN
declare const XLSX: any;

export default function App() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [fileStatuses, setFileStatuses] = useState<Map<string, FileStatus>>(new Map());
  const [filters, setFilters] = useState({
    designation: '',
    noticePeriod: '',
    currentLocation: '',
    skills: '',
  });
  const [sortConfig, setSortConfig] = useState<{ key: keyof Candidate | null; direction: 'ascending' | 'descending' }>({
    key: null,
    direction: 'ascending',
  });
  const [isCopied, setIsCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // File Processing Queue State
  const [fileQueue, setFileQueue] = useState<File[]>([]);
  const [currentFileForPreview, setCurrentFileForPreview] = useState<File | null>(null);
  const [isAutoParse, setIsAutoParse] = useState(false);

  // Job Analysis State
  const [isAnalyzingJob, setIsAnalyzingJob] = useState(false);

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
        const storedTheme = window.localStorage.getItem('theme');
        if (storedTheme) return storedTheme;
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleFiles = useCallback((files: FileList) => {
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const currentFiles = new Map(fileStatuses);
    for (const file of files) {
      if (!currentFiles.has(file.name)) {
        newFiles.push(file);
      }
    }
    setFileQueue(prev => [...prev, ...newFiles]);
  }, [fileStatuses]);

  const processFile = useCallback(async (file: File, pages?: number[]) => {
    setFileStatuses(prev => new Map(prev).set(file.name, { status: 'parsing', progress: 0 }));

    const onProgress = (progress: number) => {
        setFileStatuses(prev => new Map(prev).set(file.name, { status: 'parsing', progress }));
    };

    try {
        const result = await parseResume(file, pages, onProgress);
        setCandidates(prev => [...prev, result]);
        setFileStatuses(prev => new Map(prev).set(file.name, { status: 'success', progress: 100 }));
    } catch (error) {
        console.error(`Failed to parse ${file.name}:`, error);
        setFileStatuses(prev => {
            const updated = new Map(prev);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            updated.set(file.name, { status: 'error', error: errorMessage, progress: 100 });
            return updated;
        });
    } finally {
        // If this file was the one currently in preview (mostly for manual mode), clear it
        if (currentFileForPreview && currentFileForPreview.name === file.name) {
            setCurrentFileForPreview(null);
        }
        // Remove from queue
        setFileQueue(prev => prev.filter(f => f.name !== file.name));
    }
  }, [currentFileForPreview]);

  // Queue Manager
  useEffect(() => {
    // If queue is empty or we are already showing a preview (and not auto-parsing), do nothing
    if (fileQueue.length === 0) return;
    if (currentFileForPreview && !isAutoParse) return;

    const nextFile = fileQueue[0];

    // Safety check if already processing
    if (fileStatuses.has(nextFile.name) && fileStatuses.get(nextFile.name)?.status === 'parsing') {
        return; // Already processing
    }

    if (isAutoParse) {
        // In auto mode, process immediately (default to page 1 for PDFs handled in service)
        processFile(nextFile);
    } else {
        // In manual mode, set for preview
        if (!currentFileForPreview) {
            setCurrentFileForPreview(nextFile);
        }
    }
  }, [fileQueue, currentFileForPreview, isAutoParse, fileStatuses, processFile]);


  const handlePreviewConfirm = (options?: { pages?: number[] }) => {
    if (currentFileForPreview) {
        processFile(currentFileForPreview, options?.pages);
    }
  };

  const handlePreviewCancel = () => {
    if (currentFileForPreview) {
        setFileQueue(prev => prev.slice(1)); // Remove from queue
        setCurrentFileForPreview(null);
    }
  };


  const handleClear = () => {
    setCandidates([]);
    setFileStatuses(new Map());
    setFileQueue([]);
    setCurrentFileForPreview(null);
    setFilters({ designation: '', noticePeriod: '', currentLocation: '', skills: '' });
    setSortConfig({ key: null, direction: 'ascending' });
    setSelectedIds(new Set());
  };

  const handleCopy = () => {
    if (displayedCandidates.length === 0) return;

    const headers = [
        "Candidate Full Name", "JD Match %", "Email Id", "Mobile Number", "Date of Birth", 
        "Current Company", "Designation in Current Company", "Total Experience", 
        "Relevant Experience", "Skills", "Current CTC", "Expected CTC", 
        "Notice Period", "Highest Qualification", "Education in/Branch/Field", 
        "Current Location", "Uploaded CV/Resume"
    ];

    const rows = displayedCandidates.map(c => [
        c.fullName, c.matchScore ? `${c.matchScore}%` : 'N/A', c.email, c.mobile, c.dob,
        c.currentCompany, c.designation, c.totalExperience,
        c.relevantExperience, (c.skills || []).join(', '), c.currentCTC, c.expectedCTC,
        c.noticePeriod, c.highestQualification, c.educationField,
        c.currentLocation, c.fileName
    ]);

    const tsvContent = [
        headers.join('\t'),
        ...rows.map(row => row.map(cell => {
             let cellStr = String(cell || '');
             if (cellStr.includes('\t') || cellStr.includes('\n')) {
                 cellStr = cellStr.replace(/[\t\n]/g, ' '); 
             }
             return cellStr;
        }).join('\t'))
    ].join('\n');

    navigator.clipboard.writeText(tsvContent).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleExport = () => {
    if (displayedCandidates.length === 0) return;
    
    const columnHeaders = {
        fullName: "Candidate Full Name",
        matchScore: "JD Match %",
        matchReason: "JD Match Reason",
        email: "Email Id",
        mobile: "Mobile Number",
        dob: "Date of Birth",
        currentCompany: "Current Company",
        designation: "Designation in Current Company",
        totalExperience: "Total Experience (Yrs)",
        relevantExperience: "Relevant Experience (Yrs)",
        skills: "Skills",
        currentCTC: "Current CTC",
        expectedCTC: "Expected CTC",
        noticePeriod: "Notice Period",
        highestQualification: "Highest Qualification",
        educationField: "Education in/Branch/Field",
        currentLocation: "Current Location",
        fileName: "Uploaded CV/Resume"
    };
    
    const dataToExport = displayedCandidates.map(c => {
        const row: {[key: string]: any} = {};
        for (const key in columnHeaders) {
            const candidateKey = key as keyof Candidate;
            const headerKey = columnHeaders[candidateKey as keyof typeof columnHeaders];
            if (candidateKey === 'skills') {
                row[headerKey] = (c.skills ?? []).join(', ');
            } else {
                row[headerKey] = c[candidateKey as Exclude<keyof Candidate, 'skills'>];
            }
        }
        return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates');
    XLSX.writeFile(workbook, 'CandidateData.xlsx');
  };

  const parseCTC = (ctc: string): number => {
      if (!ctc) return 0;
      const lowerCtc = ctc.toLowerCase().replace(/[,₹$]/g, '');
      let amount = 0;
      const lakhMatch = lowerCtc.match(/(\d+\.?\d*)\s*(l|lpa|lakh)/);
      const kMatch = lowerCtc.match(/(\d+\.?\d*)\s*k/);

      if (lakhMatch) {
          amount = parseFloat(lakhMatch[1]) * 100000;
      } else if (kMatch) {
          amount = parseFloat(kMatch[1]) * 1000;
      } else {
          const numMatch = lowerCtc.match(/(\d+\.?\d*)/);
          if (numMatch) {
              amount = parseFloat(numMatch[1]);
          }
      }
      return amount;
  };

  const handleJobAnalysis = async (jobDescription: string) => {
    if (candidates.length === 0) return;
    setIsAnalyzingJob(true);
    
    try {
        // Analyze all candidates in parallel
        const analysisPromises = candidates.map(async (candidate) => {
            const result = await analyzeCandidateMatch(candidate, jobDescription);
            return {
                ...candidate,
                matchScore: result.matchScore,
                matchReason: result.matchReason
            };
        });

        const analyzedCandidates = await Promise.all(analysisPromises);
        setCandidates(analyzedCandidates);
        
        // Auto-sort by match score descending after analysis
        setSortConfig({ key: 'matchScore', direction: 'descending' });

    } catch (error) {
        console.error("Error during job analysis:", error);
        alert("An error occurred while analyzing candidates against the job description.");
    } finally {
        setIsAnalyzingJob(false);
    }
  };

  const displayedCandidates = useMemo(() => {
    let filteredCandidates = [...candidates];

    if (filters.designation) {
      filteredCandidates = filteredCandidates.filter(c =>
        c.designation.toLowerCase().includes(filters.designation.toLowerCase())
      );
    }
    if (filters.noticePeriod) {
      filteredCandidates = filteredCandidates.filter(c =>
        c.noticePeriod.toLowerCase().includes(filters.noticePeriod.toLowerCase())
      );
    }
     if (filters.currentLocation) {
      filteredCandidates = filteredCandidates.filter(c =>
        c.currentLocation.toLowerCase().includes(filters.currentLocation.toLowerCase())
      );
    }
    if (filters.skills) {
      filteredCandidates = filteredCandidates.filter(c =>
        c.skills && c.skills.some(skill => 
            skill.toLowerCase().includes(filters.skills.toLowerCase())
        )
      );
    }

    if (sortConfig.key) {
      filteredCandidates.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];
        
        let comparison = 0;
        
        if (sortConfig.key === 'matchScore') {
            const aScore = (aVal as number) ?? -1;
            const bScore = (bVal as number) ?? -1;
            comparison = aScore - bScore;
        } else if (sortConfig.key === 'totalExperience' || sortConfig.key === 'relevantExperience') {
            comparison = (aVal as number) - (bVal as number);
        } else if (sortConfig.key === 'currentCTC' || sortConfig.key === 'expectedCTC') {
            comparison = parseCTC(aVal as string) - parseCTC(bVal as string);
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
            comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
        } else {
            comparison = 0; // cannot compare
        }

        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }

    return filteredCandidates;
  }, [candidates, filters, sortConfig]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const requestSort = (key: keyof Candidate) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Bulk Action Handlers
  const handleToggleSelect = (id: string) => {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
          newSelected.delete(id);
      } else {
          newSelected.add(id);
      }
      setSelectedIds(newSelected);
  };

  const handleToggleSelectAll = () => {
      if (displayedCandidates.length === 0) return;
      
      const allSelected = displayedCandidates.every(c => selectedIds.has(c.id));
      const newSelected = new Set(selectedIds);
      
      if (allSelected) {
          displayedCandidates.forEach(c => newSelected.delete(c.id));
      } else {
          displayedCandidates.forEach(c => newSelected.add(c.id));
      }
      setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
      if (window.confirm(`Are you sure you want to delete ${selectedIds.size} candidate(s)?`)) {
          setCandidates(prev => prev.filter(c => !selectedIds.has(c.id)));
          setSelectedIds(new Set());
      }
  };

  const handleBulkShortlist = () => {
      setCandidates(prev => prev.map(c => selectedIds.has(c.id) ? { ...c, isShortlisted: true } : c));
      setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900">
      {currentFileForPreview && !isAutoParse && (
        <ResumePreviewer 
          file={currentFileForPreview}
          onConfirm={handlePreviewConfirm}
          onCancel={handlePreviewCancel}
        />
      )}
      
      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between max-w-7xl">
              <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/30">
                     <LogoIcon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
                      Robocrats AI
                  </span>
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Toggle theme"
             >
                {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
             </button>
          </div>
      </nav>

      <div className="container mx-auto px-4 md:px-8 py-8 max-w-7xl space-y-12">
        
        {/* Hero Section */}
        <header className="text-center space-y-6 pt-8 pb-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Turn Resumes into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">Actionable Data</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Instantly extract candidate details, analyze skills, and calculate job fit using advanced AI.
          </p>
        </header>

        <main className="space-y-8">
          {/* Top Section: Split Layout for Upload and Job Description */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Upload Section */}
              <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-6 md:p-8 relative overflow-hidden flex flex-col h-full">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                 <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 rounded-full filter blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                 <div className="flex justify-between items-center mb-6 relative z-10">
                     <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Upload Resumes</h2>
                     <label className="inline-flex items-center cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={isAutoParse} 
                        onChange={() => setIsAutoParse(!isAutoParse)} 
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                      <span className="ms-3 text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Auto-parse</span>
                    </label>
                 </div>
                <FileUpload onFilesSelected={handleFiles} statuses={fileStatuses} />
              </section>

              {/* Right Column: Job Description Section */}
              <section className="h-full">
                  <JobAnalysisSection 
                    onAnalyze={handleJobAnalysis} 
                    isAnalyzing={isAnalyzingJob} 
                    hasCandidates={candidates.length > 0}
                  />
              </section>
          </div>

          {/* Results Section */}
          {candidates.length > 0 && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Sticky Actions Toolbar */}
              <div className="sticky top-20 z-30 bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-lg rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
                   <div className="flex items-center gap-3 w-full sm:w-auto">
                      {selectedIds.size > 0 ? (
                          <div className="flex items-center gap-3 w-full justify-between sm:justify-start bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                                  {selectedIds.size} selected
                              </span>
                              <div className="h-4 w-px bg-indigo-200 dark:bg-indigo-700 mx-1"></div>
                              <div className="flex gap-2">
                                  <button
                                      onClick={handleBulkShortlist}
                                      className="text-xs font-medium flex items-center gap-1 text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-100 transition-colors"
                                  >
                                      <StarIcon className="w-3.5 h-3.5" filled /> Shortlist
                                  </button>
                                  <button
                                      onClick={handleBulkDelete}
                                      className="text-xs font-medium flex items-center gap-1 text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200 transition-colors"
                                  >
                                      <TrashIcon className="w-3.5 h-3.5" /> Delete
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 px-2 hidden sm:block">Parsed Results</h3>
                      )}
                   </div>

                   <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors focus:ring-2 focus:ring-slate-300"
                            title="Copy to Clipboard"
                        >
                            <CopyIcon className="w-4 h-4" />
                            {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md shadow-emerald-500/20 transition-all focus:ring-2 focus:ring-emerald-500"
                        >
                            <ExcelIcon className="w-4 h-4" />
                            Export
                        </button>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <button
                            onClick={handleClear}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            title="Clear All Data"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                   </div>
              </div>

              <CandidateTable 
                candidates={displayedCandidates} 
                requestSort={requestSort} 
                sortConfig={sortConfig} 
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
              />
            </div>
          )}
        </main>

        <footer className="text-center py-8 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-500">
              &copy; {new Date().getFullYear()} Robocrats AI Resume Parser. Powered by Google Gemini.
          </p>
        </footer>
      </div>
    </div>
  );
}
