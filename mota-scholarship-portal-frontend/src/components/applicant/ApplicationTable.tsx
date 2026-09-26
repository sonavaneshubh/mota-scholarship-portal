import { applicantApplicationPath } from '../../lib/constants';
import type { ApplicantApplication } from '../../types';
import { ApplicationStatusBadge } from './StatusBadge';
import { Button } from '../ui/Button';

interface ApplicationTableProps {
  applications: ApplicantApplication[];
  caption: string;
}

export function ApplicationTable({ applications, caption }: ApplicationTableProps) {
  return (
    <div className="min-w-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3 font-bold" scope="col">Reference</th>
              <th className="px-4 py-3 font-bold" scope="col">Scheme</th>
              <th className="px-4 py-3 font-bold" scope="col">Submitted</th>
              <th className="px-4 py-3 font-bold" scope="col">Last update</th>
              <th className="px-4 py-3 font-bold" scope="col">Status</th>
              <th className="px-4 py-3 font-bold" scope="col">Documents</th>
              <th className="px-4 py-3 text-right font-bold" scope="col">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.map((application) => (
              <tr className="align-middle" key={application.id ?? application.referenceNumber}>
                {/* The quotable reference, not the row's uuid. The uuid is the
                    internal routing key and means nothing to an applicant or an
                    officer reading a printed list; this column used to print the
                    raw uuid under an "Application ID" heading, while the mobile
                    view showed the reference. */}
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">
                  {application.referenceNumber}
                </td>
                <td className="max-w-xs px-4 py-3 font-semibold text-slate-900 truncate">{application.schemeName}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{application.submittedAt}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{application.updatedAt}</td>
                <td className="px-4 py-3"><ApplicationStatusBadge status={application.status} label={application.statusLabel} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{application.documentsComplete}/{application.documentsTotal}</td>
                <td className="px-4 py-3 text-right">
                  {application.id ? (
                    <Button size="sm" to={applicantApplicationPath(application.id)} variant="outline">View details</Button>
                  ) : (
                    /* No id means the row could not be read, so there is nothing
                       valid to link to. Rendering a link anyway would navigate to
                       a URL that can only ever render "Application not found". */
                    <span className="text-xs text-slate-400">Unavailable</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 md:hidden">
        {applications.map((application) => (
          <article className="space-y-3 p-4" key={application.id ?? application.referenceNumber}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">{application.referenceNumber}</p>
                <h3 className="mt-1 text-sm font-bold text-gov-blue-dark">{application.schemeName}</h3>
              </div>
              <ApplicationStatusBadge status={application.status} label={application.statusLabel} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div><dt className="text-slate-500">Submitted</dt><dd className="mt-1 font-semibold text-slate-800">{application.submittedAt}</dd></div>
              <div><dt className="text-slate-500">Last update</dt><dd className="mt-1 font-semibold text-slate-800">{application.updatedAt}</dd></div>
              <div><dt className="text-slate-500">Documents</dt><dd className="mt-1 font-semibold text-slate-800">{application.documentsComplete}/{application.documentsTotal} complete</dd></div>
              <div><dt className="text-slate-500">Reference</dt><dd className="mt-1 break-all font-semibold text-slate-800">{application.referenceNumber}</dd></div>
            </dl>
            {application.id ? (
              <Button className="w-full" size="sm" to={applicantApplicationPath(application.id)} variant="outline">View details</Button>
            ) : (
              <span className="block w-full rounded border border-dashed border-slate-300 px-3 py-1.5 text-center text-xs text-slate-400">
                Details unavailable
              </span>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}