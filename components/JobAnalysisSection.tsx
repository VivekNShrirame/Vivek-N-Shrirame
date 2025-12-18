
import React, { useState } from 'react';
import { CheckCircleIcon, ClockIcon } from './icons';

interface JobAnalysisSectionProps {
  onAnalyze: (jobDescription: string) => void;
  isAnalyzing: boolean;
  hasCandidates: boolean;
}

const JobAnalysisSection: React.FC<JobAnalysisSectionProps> = ({ onAnalyze, isAnalyzing, hasCandidates }) => {
  const [jobDescription, setJobDescription] = useState('');

  const handleSubmit = () => {
    if (jobDescription.trim()) {
      onAnalyze(jobDescription);
    }
  };

  return (
    <div className="h-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-6 md:p-8 flex flex-col relative overflow-hidden transition-all">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 rounded-full filter blur-3xl translate-y-1/2 -translate-x-1/2"></div>

      <div className="relative z-10 flex-grow flex flex-col">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
              <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 p-1.5 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </span>
              Analyze with JD
          </h2>

          <div className="space-y-3 flex-grow flex flex-col">
            <label htmlFor="jd-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Paste Job Description to calculate match scores
            </label>
            <textarea
              id="jd-input"
              className="w-full p-4 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-900 dark:border-slate-600 dark:text-white resize-none shadow-sm flex-grow"
              placeholder="e.g. We are looking for a Senior React Developer with 5+ years of experience in AWS, TypeScript, and Node.js..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              style={{ minHeight: '200px' }}
            />
          </div>

          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={isAnalyzing || !jobDescription.trim() || !hasCandidates}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              {isAnalyzing ? (
                <>
                  <ClockIcon className="w-5 h-5 animate-spin" />
                  Analyzing Candidates...
                </>
              ) : !hasCandidates ? (
                 <span className="text-slate-500 dark:text-slate-400">Upload candidates first</span>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Start Match Analysis
                </>
              )}
            </button>
          </div>
      </div>
    </div>
  );
};

export default JobAnalysisSection;
