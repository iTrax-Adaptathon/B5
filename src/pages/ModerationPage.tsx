import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchReports, updateReportStatus, updateSubmissionVerification, recomputeScores } from '@/lib/api';
import { Loader2, Shield, Flag, Check, X, AlertCircle, RefreshCw } from 'lucide-react';

interface ModerationPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

interface ReportItem {
  id: string;
  reporter_id: string;
  submission_id: string;
  reason: string;
  status: string;
  created_at: string;
  username: string;
  submission_payload: Record<string, unknown>;
}

export function ModerationPage({ onNavigate }: ModerationPageProps) {
  const { profile } = useAuth();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const r = await fetchReports();
      setReports(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (reportId: string, submissionId: string, action: 'verified' | 'rejected' | 'flagged', reportStatus: 'resolved' | 'dismissed') => {
    setActionLoading(reportId);
    try {
      await updateSubmissionVerification(submissionId, action);
      await updateReportStatus(reportId, reportStatus);
      await loadReports();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      await recomputeScores();
      alert('Scores recomputed successfully');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Recompute failed');
    } finally {
      setRecomputing(false);
    }
  };

  if (!profile?.is_moderator) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">You don't have moderator access.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-violet-600" />
            <h1 className="text-2xl font-bold text-slate-800">Moderation</h1>
          </div>
          <p className="text-slate-500 text-sm">Review reported submissions and manage verification.</p>
        </div>
        <button
          onClick={handleRecompute}
          disabled={recomputing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${recomputing ? 'animate-spin' : ''}`} />
          {recomputing ? 'Recomputing...' : 'Recompute Scores'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Check className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
          <p className="text-slate-500">No reports to review. All clear!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                    <Flag className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Reported by {report.username}</p>
                    <p className="text-xs text-slate-400">{new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-md ${
                  report.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                  report.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' :
                  report.status === 'dismissed' ? 'bg-slate-50 text-slate-500' :
                  'bg-slate-50 text-slate-500'
                }`}>
                  {report.status}
                </span>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 mb-3">
                <p className="text-xs text-slate-400 mb-1">Reason:</p>
                <p className="text-sm text-slate-700">{report.reason}</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 mb-3">
                <p className="text-xs text-slate-400 mb-1">Submission payload:</p>
                <pre className="text-xs text-slate-600 overflow-x-auto">
                  {JSON.stringify(report.submission_payload, null, 2)}
                </pre>
              </div>

              {report.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolve(report.id, report.submission_id, 'flagged', 'resolved')}
                    disabled={actionLoading === report.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Flag Submission
                  </button>
                  <button
                    onClick={() => handleResolve(report.id, report.submission_id, 'verified', 'resolved')}
                    disabled={actionLoading === report.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-medium hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleResolve(report.id, report.submission_id, 'rejected', 'resolved')}
                    disabled={actionLoading === report.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-sm font-medium hover:bg-amber-100 disabled:opacity-50"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleResolve(report.id, report.submission_id, 'verified', 'dismissed')}
                    disabled={actionLoading === report.id}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    Dismiss Report
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
