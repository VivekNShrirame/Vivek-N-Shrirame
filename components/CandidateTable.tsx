
import React from 'react';
import type { Candidate } from '../types';
import { ArrowUpIcon, ArrowDownIcon, StarIcon } from './icons';

interface CandidateTableProps {
  candidates: Candidate[];
  sortConfig: { key: keyof Candidate | null; direction: string };
  requestSort: (key: keyof Candidate) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

const CandidateTable: React.FC<CandidateTableProps> = ({ 
  candidates, 
  sortConfig, 
  requestSort,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll
}) => {
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 transition-colors">
        <div className="p-6 rounded-full bg-indigo-50 dark:bg-slate-700 mb-4">
            <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">No candidates parsed yet</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Upload a resume to get started or adjust your filters.</p>
      </div>
    );
  }

  const getMatchColor = (score?: number) => {
      if (score === undefined) return 'text-slate-300 dark:text-slate-600';
      if (score >= 75) return 'text-emerald-500 dark:text-emerald-400';
      if (score >= 50) return 'text-amber-500 dark:text-amber-400';
      return 'text-rose-500 dark:text-rose-400';
  };

  const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
  };

  // SVG Gauge Component
  const MatchGauge = ({ score }: { score?: number }) => {
      if (score === undefined) return <span className="text-xs text-slate-400 font-medium">--</span>;
      
      const radius = 16;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (score / 100) * circumference;
      const colorClass = getMatchColor(score);

      return (
        <div className="relative flex items-center justify-center w-10 h-10">
             <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Circle */}
                <path
                    className="text-slate-200 dark:text-slate-700"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                />
                {/* Progress Circle */}
                <path
                    className={`${colorClass} transition-all duration-1000 ease-out`}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={offset}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-[10px] font-bold ${colorClass.replace('text-', 'text-slate-900 dark:text-white')}`}>
                    {score}
                </span>
            </div>
        </div>
      );
  };

  const allSelected = candidates.length > 0 && candidates.every(c => selectedIds.has(c.id));
  const someSelected = candidates.some(c => selectedIds.has(c.id));

  const renderHeader = (label: string, sortKey?: keyof Candidate, className: string = "") => (
    <th scope="col" className={`px-6 py-4 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400 whitespace-nowrap ${className}`}>
        {sortKey ? (
            <button 
                type="button"
                onClick={() => requestSort(sortKey)} 
                className="group flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none"
            >
                {label}
                <span className={`transition-opacity duration-200 ${sortConfig.key === sortKey ? 'opacity-100 text-indigo-600 dark:text-indigo-400' : 'opacity-0 group-hover:opacity-50'}`}>
                    {sortConfig.key === sortKey && sortConfig.direction === 'descending' ? (
                        <ArrowDownIcon className="w-3.5 h-3.5" />
                    ) : (
                        <ArrowUpIcon className="w-3.5 h-3.5" />
                    )}
                </span>
            </button>
        ) : (
            label
        )}
    </th>
  );

  return (
    <div className="relative overflow-x-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-slate-200/40 dark:shadow-none border border-slate-200 dark:border-slate-700">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
          <tr>
              <th scope="col" className="px-6 py-4 w-12">
                <div className="flex items-center justify-center">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 dark:focus:ring-offset-slate-800 dark:bg-slate-700 dark:border-slate-600 transition duration-150 ease-in-out cursor-pointer"
                        checked={allSelected}
                        ref={input => { if (input) input.indeterminate = someSelected && !allSelected; }}
                        onChange={onToggleSelectAll}
                    />
                </div>
              </th>
              {/* Columns with optimized widths */}
              {renderHeader("Match %", "matchScore", "text-center min-w-[100px]")}
              {renderHeader("Candidate Profile", "fullName", "min-w-[260px]")}
              {renderHeader("Contact Info", "email", "min-w-[200px]")}
              {renderHeader("Experience", "totalExperience", "min-w-[110px]")}
              {renderHeader("Skills", undefined, "min-w-[200px] max-w-[300px]")}
              {renderHeader("CTC", "currentCTC", "min-w-[140px]")}
              {renderHeader("Notice", "noticePeriod", "min-w-[100px]")}
              {renderHeader("Location", "currentLocation", "min-w-[150px]")}
              {renderHeader("Resume", "fileName", "text-right min-w-[100px]")}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {candidates.map((candidate) => {
                const isSelected = selectedIds.has(candidate.id);
                return (
                <tr 
                    key={candidate.id} 
                    className={`group transition-colors duration-150 ease-in-out
                        ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}
                    `}
                >
                    {/* Checkbox */}
                    <td className="px-6 py-4 align-middle text-center">
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 dark:focus:ring-offset-slate-800 dark:bg-slate-700 dark:border-slate-600 cursor-pointer"
                            checked={isSelected}
                            onChange={() => onToggleSelect(candidate.id)}
                        />
                    </td>

                    {/* JD Match */}
                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center">
                             <div className="group/tooltip relative cursor-help">
                                 <MatchGauge score={candidate.matchScore} />
                                 
                                 {/* Tooltip */}
                                 {candidate.matchScore !== undefined && (
                                     <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900/95 backdrop-blur text-white text-xs rounded-lg shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none z-50 whitespace-normal text-center scale-95 group-hover/tooltip:scale-100 border border-slate-700">
                                         <p className="font-semibold mb-1 text-slate-300">Match Analysis</p>
                                         <p>{candidate.matchReason || "No reason provided."}</p>
                                         <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900/95"></div>
                                     </div>
                                 )}
                             </div>
                        </div>
                    </td>

                    {/* Candidate Profile */}
                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-4">
                            <div className="relative flex-shrink-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-transform transform group-hover:scale-105
                                    ${candidate.isShortlisted 
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 ring-2 ring-amber-400 dark:ring-amber-500' 
                                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                                    }`}
                                >
                                    {getInitials(candidate.fullName)}
                                </div>
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onToggleSelect(candidate.id); }}
                                    className={`absolute -bottom-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full shadow-sm border border-white dark:border-slate-800 transition-colors cursor-pointer
                                        ${candidate.isShortlisted ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-slate-200 text-slate-400 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600'}
                                    `}
                                    title={candidate.isShortlisted ? "Remove from Shortlist" : "Add to Shortlist"}
                                >
                                    <StarIcon className="w-3 h-3" filled={candidate.isShortlisted} />
                                </button>
                            </div>
                            <div className="min-w-0 max-w-[200px]">
                                <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate" title={candidate.fullName}>
                                    {candidate.fullName}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={`${candidate.designation || 'N/A'}${candidate.currentCompany ? ` at ${candidate.currentCompany}` : ''}`}>
                                    <span className="font-medium">{candidate.designation || 'N/A'}</span>
                                    {candidate.currentCompany && <span className="text-slate-400 dark:text-slate-500 font-normal"> @ {candidate.currentCompany}</span>}
                                </div>
                            </div>
                        </div>
                    </td>

                    {/* Contact Info */}
                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <div className="flex flex-col space-y-1.5">
                            <div className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 max-w-[190px]" title={candidate.email}>
                                <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                <span className="truncate">{candidate.email}</span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                {candidate.mobile}
                            </div>
                        </div>
                    </td>

                    {/* Experience */}
                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {candidate.totalExperience > 0 ? `${candidate.totalExperience} Yrs` : 'Fresher'}
                            </span>
                            {candidate.relevantExperience > 0 && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    Rel: {candidate.relevantExperience} Yrs
                                </span>
                            )}
                        </div>
                    </td>

                    {/* Skills (Truncated with Rich Tooltip) */}
                    <td className="px-6 py-4 align-middle max-w-[250px]">
                         <div className="group/skills relative flex items-center">
                            <p className="truncate text-sm text-slate-600 dark:text-slate-300 cursor-help w-full">
                                {(candidate.skills && candidate.skills.length > 0) 
                                    ? candidate.skills.join(', ') 
                                    : <span className="italic text-slate-400">None listed</span>
                                }
                            </p>
                            
                            {/* Rich Tooltip for Skills */}
                            {candidate.skills && candidate.skills.length > 0 && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/skills:block z-50 w-64 p-3 bg-slate-900/95 backdrop-blur text-white text-xs rounded-lg shadow-xl pointer-events-none text-center border border-slate-700">
                                    <p className="font-semibold mb-2 text-slate-300 border-b border-slate-700 pb-1">Key Skills</p>
                                    <div className="flex flex-wrap gap-1 justify-center">
                                        {candidate.skills.map((skill, i) => (
                                            <span key={i} className="bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded text-[10px]">{skill}</span>
                                        ))}
                                    </div>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900/95"></div>
                                </div>
                            )}
                         </div>
                    </td>

                    {/* CTC */}
                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <div className="text-xs space-y-1 w-full">
                            <div className="flex justify-between gap-2 items-center">
                                <span className="text-slate-500 dark:text-slate-400 font-medium w-8">Curr:</span>
                                <span className="font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[11px] min-w-[60px] text-right truncate">{candidate.currentCTC || '--'}</span>
                            </div>
                            <div className="flex justify-between gap-2 items-center">
                                <span className="text-slate-500 dark:text-slate-400 font-medium w-8">Exp:</span>
                                <span className="font-semibold text-slate-900 dark:text-white bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[11px] min-w-[60px] text-right truncate">{candidate.expectedCTC || '--'}</span>
                            </div>
                        </div>
                    </td>

                    {/* Notice */}
                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-md font-semibold border block text-center truncate max-w-[100px]
                            ${(candidate.noticePeriod?.toLowerCase().includes('immediate') || candidate.noticePeriod?.toLowerCase().includes('15')) 
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800' 
                                : 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-700 dark:border-slate-600'
                            }`}
                            title={candidate.noticePeriod}
                        >
                            {candidate.noticePeriod || 'N/A'}
                        </span>
                    </td>

                    {/* Location */}
                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                         <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 max-w-[140px]" title={candidate.currentLocation}>
                            <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span className="truncate">{candidate.currentLocation || 'N/A'}</span>
                         </div>
                    </td>

                    {/* Resume Link */}
                    <td className="px-6 py-4 align-middle whitespace-nowrap text-right">
                         <div className="flex flex-col items-end gap-1">
                             <button type="button" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                View
                             </button>
                             <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[100px] bg-slate-50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded" title={candidate.fileName}>
                                {candidate.fileName}
                             </div>
                         </div>
                    </td>
                </tr>
                );
            })}
        </tbody>
      </table>
    </div>
  );
};

export default CandidateTable;
