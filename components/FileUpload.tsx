
import React, { useCallback, useState } from 'react';
import type { FileStatus } from '../types';
import { UploadIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from './icons';

interface FileUploadProps {
  onFilesSelected: (files: FileList) => void;
  statuses: Map<string, FileStatus>;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, statuses }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
    e.target.value = ''; // Reset input to allow re-uploading the same file
  };

  const getStatusIcon = (status: FileStatus) => {
    switch(status.status) {
      case 'parsing': return <ClockIcon className="w-5 h-5 text-indigo-500 animate-spin" />;
      case 'success': return <CheckCircleIcon className="w-5 h-5 text-emerald-500" />;
      case 'error': return <XCircleIcon className="w-5 h-5 text-rose-500" />;
    }
  }

  return (
    <div className="space-y-8">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`group relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 ease-out
            ${isDragging 
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.01]' 
                : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none relative z-10">
          <div className={`p-4 rounded-full transition-colors ${isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500 dark:bg-slate-700 dark:text-slate-400'}`}>
               <UploadIcon className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              <span className="text-indigo-600 dark:text-indigo-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              PDF, Word Documents, or Images (Max 10MB)
            </p>
          </div>
        </div>
      </div>

      {statuses.size > 0 && (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                 <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Upload Queue</h3>
                 <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300">
                     {statuses.size} Files
                 </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from(statuses.entries()).map(([fileName, fileStatus]) => (
                    <div key={fileName} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                                <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded flex-shrink-0">
                                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200" title={fileName}>{fileName}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{fileStatus.status}</p>
                                </div>
                            </div>
                            {getStatusIcon(fileStatus)}
                        </div>

                        {fileStatus.status === 'parsing' && (
                            <div className="w-full bg-slate-100 rounded-full h-1.5 dark:bg-slate-700 overflow-hidden">
                                <div
                                    className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${fileStatus.progress}%` }}
                                ></div>
                            </div>
                        )}
                        {fileStatus.status === 'error' && (
                             <p className="text-xs text-rose-500 mt-1 bg-rose-50 dark:bg-rose-900/20 p-1.5 rounded border border-rose-100 dark:border-rose-800/50">
                                {fileStatus.error}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
