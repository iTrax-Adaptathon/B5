import { useState } from 'react';
import { X, Flag } from 'lucide-react';
import { reportSubmission } from '@/lib/api';

interface ReportModalProps {
  submissionId: string;
  onClose: () => void;
}

export function ReportModal({ submissionId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reasons = [
    'Duplicate or stolen proof',
    'Fake or manipulated evidence',
    'Inappropriate content',
    'Spam submission',
    'Cheating or exploitation',
  ];

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await reportSubmission(submissionId, reason);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <Flag className="w-4 h-4 text-rose-600" />
            </div>
            <h2 className="font-semibold text-slate-800">Report Submission</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <Flag className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-slate-700 font-medium">Report submitted</p>
            <p className="text-sm text-slate-500 mt-1">The submission will be reviewed by moderators.</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">Reason</label>
              <div className="space-y-1.5">
                {reasons.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                      reason === r
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <input
                  type="text"
                  placeholder="Other reason..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 focus:outline-none focus:border-rose-300"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
