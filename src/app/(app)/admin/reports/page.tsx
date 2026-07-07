import { listReports } from '@/lib/admin'
import { TimeAgo } from '@/components/TimeAgo'
import { adminDeleteContentAction, resolveReportAction } from '../admin-actions'

export const dynamic = 'force-dynamic'

export default function AdminReportsPage() {
  const reports = listReports(true)

  return (
    <div className="space-y-3">
      {reports.length === 0 ? (
        <div className="vt-card p-6 text-center text-[#999] text-sm">
          No open reports. The room is calm.
        </div>
      ) : (
        reports.map((r) => (
          <div key={r.id} className="vt-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-[#999]">
                  {r.reporterName ? `@${r.reporterName}` : 'Someone'} reported a {r.targetType} ·{' '}
                  <TimeAgo iso={r.createdAt.toISOString()} />
                </div>
                <div className="text-sm font-bold mt-0.5">Reason: {r.reason}</div>
                <div className="text-sm text-[#444] mt-1 border-l-2 border-[#cfe5dd] pl-2 italic">
                  {r.targetExcerpt}
                  {r.targetDeleted && <span className="ml-1 text-[#c0503c]">(already deleted)</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {!r.targetDeleted && (
                  <form action={adminDeleteContentAction}>
                    <input type="hidden" name="targetType" value={r.targetType} />
                    <input type="hidden" name="targetId" value={r.targetId} />
                    <button className="vt-btn-ghost text-xs" style={{ color: '#c0503c' }}>
                      Delete {r.targetType}
                    </button>
                  </form>
                )}
                <form action={resolveReportAction}>
                  <input type="hidden" name="reportId" value={r.id} />
                  <button className="vt-btn-ghost text-xs">Mark resolved</button>
                </form>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
