import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, CheckCircle, X, Copy, Check } from 'lucide-react';
import { FileUploader } from './FileUploader';
import { useToast } from '../../context/ToastContext';

interface ImportWizardProps {
  onImport: (file: File) => Promise<{ created: number; duplicates?: number; errors?: string[] }>;
  onClose: () => void;
  entityName: string;
}

export function ImportWizard({ onImport, onClose, entityName }: ImportWizardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    duplicates?: number;
    errors?: string[];
  } | null>(null);
  const { success, error } = useToast();

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    try {
      const importResult = await onImport(file);
      setResult(importResult);
      success(`Successfully imported ${importResult.created} ${entityName}`);
      if (importResult.duplicates && importResult.duplicates > 0) {
        // Info about duplicates
      }
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to import');
    } finally {
      setIsImporting(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
          <h2 className="text-xl font-semibold text-white">Import {entityName}</h2>
          <button
            onClick={onClose}
            className="text-white/50 transition-colors duration-200 hover:text-white hover:scale-110"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6">

        {!result ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white">CSV Format:</p>
                <button
                  onClick={() => {
                    let csvFormat = '';
                    if (entityName === 'Companies') {
                      csvFormat = 'name,email,phone,website,industry,street,city,state,zipCode,country,tags';
                    } else if (entityName === 'Deals') {
                      csvFormat = 'title,leadId,contactEmail,companyName,value,currency,stage,probability,closeDate,description,notes';
                    } else {
                      csvFormat = 'firstName,lastName,email,phone,jobTitle,department,companyName,street,city,state,zipCode,country';
                    }
                    navigator.clipboard.writeText(csvFormat);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                  title="Copy CSV format"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              
              {entityName === 'Companies' ? (
                <div className="space-y-2">
                  <div className="rounded-md bg-[#1A1A1C] border border-white/5 p-3 font-mono text-xs text-white/80 leading-relaxed">
                    <div className="text-[#A8DADC]">name,email,phone,website,industry,</div>
                    <div className="text-[#A8DADC]">street,city,state,zipCode,country,tags</div>
                  </div>
                  <div className="text-xs text-white/50 space-y-1">
                    <p><span className="text-white/70 font-medium">Required:</span> name</p>
                    <p><span className="text-white/70 font-medium">Optional:</span> All other fields</p>
                  </div>
                </div>
              ) : entityName === 'Deals' ? (
                <div className="space-y-2">
                  <div className="rounded-md bg-[#1A1A1C] border border-white/5 p-3 font-mono text-xs text-white/80 leading-relaxed">
                    <div className="text-[#A8DADC]">title,leadId,contactEmail,companyName,value,</div>
                    <div className="text-[#A8DADC]">currency,stage,probability,closeDate,description,notes</div>
                  </div>
                  <div className="text-xs text-white/50 space-y-1">
                    <p><span className="text-white/70 font-medium">Required:</span> title, value, closeDate</p>
                    <p><span className="text-white/70 font-medium">Optional:</span> leadId, contactEmail, companyName, currency, stage, probability, description, notes</p>
                    <p className="text-white/40 mt-2 italic">Note: contactEmail and companyName will be matched to existing contacts/companies</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-md bg-[#1A1A1C] border border-white/5 p-3 font-mono text-xs text-white/80 leading-relaxed">
                    <div className="text-[#A8DADC]">firstName,lastName,email,phone,jobTitle,department,</div>
                    <div className="text-[#A8DADC]">companyName,street,city,state,zipCode,country</div>
                  </div>
                  <div className="text-xs text-white/50 space-y-1">
                    <p><span className="text-white/70 font-medium">Required:</span> firstName, lastName</p>
                    <p><span className="text-white/70 font-medium">Optional:</span> All other fields</p>
                  </div>
                </div>
              )}
            </div>

            <FileUploader
              accept=".csv"
              onFileSelect={handleFileSelect}
              label="Upload CSV File"
            />

            {file && (
              <div className="flex items-center gap-2 rounded-md bg-white/5 p-3">
                <FileText className="h-5 w-5 text-white/60" />
                <span className="flex-1 text-sm text-white">{file.name}</span>
                <button
                  onClick={() => setFile(null)}
                  className="rounded-md p-1 text-white/60 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-md border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!file || isImporting}
                className="rounded-md bg-[#A8DADC] px-4 py-2 text-sm font-medium text-[#1A1A1C] hover:bg-[#BCE7E5] disabled:opacity-50"
              >
                {isImporting ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-md bg-green-500/10 p-4">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                <p className="font-medium text-white">
                  Successfully imported {result.created} {entityName}
                </p>
                {result.duplicates && result.duplicates > 0 && (
                  <p className="text-sm text-white/60">
                    {result.duplicates} duplicates skipped
                  </p>
                )}
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md bg-red-500/10 p-3">
                <p className="mb-2 text-sm font-medium text-red-400">Errors:</p>
                <ul className="space-y-1 text-xs text-red-300">
                  {result.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full rounded-md bg-[#A8DADC] px-4 py-2 text-sm font-medium text-[#1A1A1C] hover:bg-[#BCE7E5]"
            >
              Done
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

