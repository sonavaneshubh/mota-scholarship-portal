import { FOOTER_LINK_COLUMNS, FOOTER_SECURITY_SEALS, SITE } from '../../lib/constants';

export function Footer() {
  return (
    <footer className="bg-gov-blue-dark text-slate-300 text-xs border-t-4 border-amber-500" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b border-blue-900">
            About MoTA Portal
          </h4>
          <p className="text-slate-400 text-xs leading-relaxed mb-3">
            National Tribal Scholarship &amp; Fellowship Management System is an end-to-end digital
            initiative of the Ministry of Tribal Affairs, Government of India, promoting higher
            education among Scheduled Tribes.
          </p>
          <div className="text-[11px] text-slate-400">
            <div>{SITE.addressLine1}</div>
            <div>Email: {SITE.email}</div>
          </div>
        </div>

        {FOOTER_LINK_COLUMNS.map((column) => (
          <div key={column.id}>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b border-blue-900">
              {column.heading}
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {column.links.map((link) => (
                <li key={link}>
                  <a className="hover:text-amber-400 transition" href="#home-links-placeholder">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b border-blue-900">
            Support &amp; Feedback
          </h4>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block">{SITE.helpdeskLabel}:</span>
              <span className="text-amber-400 font-bold text-sm">{SITE.helpdeskPhone}</span>
            </div>
            <div>
              <span className="text-slate-400 block">{SITE.dbtHelpdeskLabel}:</span>
              <span className="text-white font-semibold">{SITE.dbtHelpdeskPhone}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Operational Hours:</span>
              <span className="text-slate-300">{SITE.helpdeskHours}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-blue-900/80 bg-slate-950 py-4 px-4 text-center text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-left leading-relaxed">
            <div>
              Content Managed by <strong>Ministry of Tribal Affairs, Government of India</strong>.
            </div>
            <div>
              Designed, Developed and Hosted by <strong>National Informatics Centre (NIC)</strong>.
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            {FOOTER_SECURITY_SEALS.map((seal) => (
              <span key={seal} className="border border-slate-700 px-2 py-0.5 rounded text-slate-300">
                {seal}
              </span>
            ))}
          </div>
          <div className="text-right">
            <div>
              Last Updated: <span className="text-slate-300 font-semibold">{SITE.lastUpdated}</span>
            </div>
            <div>
              Portal Version: <span className="text-slate-300 font-semibold">{SITE.portalVersion}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}