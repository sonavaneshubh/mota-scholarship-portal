import { Link } from 'react-router-dom';
import { FOOTER_LINK_COLUMNS, FOOTER_SECURITY_SEALS, SITE } from '../../lib/constants';
import type { FooterLink } from '../../types';

function renderFooterLink(link: FooterLink) {
  const className = 'hover:text-amber-400 transition';
  const href = link.href.startsWith('#') ? `/${link.href}` : link.href;

  if (href.startsWith('/')) {
    return (
      <Link className={className} to={href}>
        {link.label}
      </Link>
    );
  }

  return (
    <a className={className} href={href}>
      {link.label}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="bg-gov-blue-dark text-slate-300 text-xs border-t-4 border-amber-500" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        <div>
          <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3 pb-1 border-b border-blue-900">
            About This Prototype
          </h4>
          <p className="text-slate-400 text-xs leading-relaxed mb-3">
            Educational prototype for the AI-Enabled Scholarship &amp; Fellowship Management System.
            The interface follows Government of India portal conventions but is not an official MoTA
            deployment.
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
              {column.links.map((link, linkIndex) => (
                <li key={`${column.id}-${linkIndex}`}>{renderFooterLink(link)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-blue-900/80 bg-slate-950 py-4 px-4 text-center text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-left leading-relaxed">
            <div>Prototype interface for demonstration and evaluation.</div>
            <div>Not an official Government of India information system.</div>
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
              Build: <span className="text-slate-300 font-semibold">{SITE.portalVersion}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-950 text-center py-2 text-[10px] text-slate-500 border-t border-blue-900">
        {SITE.helpdeskLabel}: {SITE.helpdeskPhone} | {SITE.helpdeskHours}
      </div>
    </footer>
  );
}
