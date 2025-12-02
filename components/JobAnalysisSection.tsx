
import React, { useState } from 'react';
import { CheckCircleIcon, ClockIcon } from './icons';

interface JobAnalysisSectionProps {
  onAnalyze: (jobDescription: string) => void;
  isAnalyzing: boolean;
}

const JobAnalysisSection: React.FC<JobAnalysisSectionProps> = ({ onAnalyze, isAnalyzing }) => {
  const [jobDescription, setJobDescription] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    if (jobDescription.trim()) {
      onAnalyze(jobDescription);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all hover:shadow-md">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex justify-between items-center bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left group"
      >
        <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-3">
                <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 p-1.5 rounded-lg">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </span>
                Compare with Job Description
            </h3>
        </div>
        <div className={`p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all transform ${isOpen ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </div>
      </button>

      {isOpen && (
        <div className="p-6 border-t border-slate-100 dark:border-slate-700 animate-fade-in">
          <div className="space-y-3">
            <label htmlFor="jd-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Paste Job Description (JD) below to calculate match scores
            </label>
            <div className="relative">
                <textarea
                id="jd-input"
                rows={6}
                className="w-full p-4 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-900 dark:border-slate-600 dark:text-white resize-y shadow-sm"
                placeholder="e.g. We are looking for a Senior React Developer with 5+ years of experience in AWS, TypeScript, and Node.js..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleSubmit}
              disabled={isAnalyzing || !jobDescription.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              {isAnalyzing ? (
                <>
                  <ClockIcon className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Analyze Match
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobAnalysisSection;
