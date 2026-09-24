import { useState } from 'react';
import { OFFICER_RESOURCES } from '../../data/mockData';
import { Button } from '../ui/Button';

export function OfficerQuickLogin() {
  const [code, setCode] = useState('');

  return (
    <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-lg p-5">
      <div className="border-b border-slate-200 pb-2 mb-3">
        <span className="text-[10px] font-bold text-gov-blue uppercase">Official Portal</span>
        <h3 className="text-sm font-bold text-slate-900">University &amp; Institute Corner</h3>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed mb-4">
        Authorized Nodal Officers from Central, State, Deemed, and Private Universities accredited
        under UGC/NIRF can access pending verifications and upload student joining reports.
      </p>

      <form
        className="space-y-3"
        data-purpose="officer-quick-login"
        onSubmit={(e) => e.preventDefault()}
      >
        <div>
          <label htmlFor="aishe-code" className="block text-xs font-medium text-slate-700 mb-1">
            AISHE / University Code
          </label>
          <input
            id="aishe-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. U-0123"
            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-gov-blue"
            type="text"
          />
        </div>
        <div>
          <label htmlFor="officer-password" className="block text-xs font-medium text-slate-700 mb-1">
            Officer Password / DSC
          </label>
          <input
            id="officer-password"
            placeholder="••••••••"
            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-gov-blue"
            type="password"
          />
        </div>
        <Button variant="primary" size="md" className="w-full justify-center" type="submit">
          Institutional Login
        </Button>
      </form>

      <div className="mt-4 pt-3 border-t border-slate-200 text-xs space-y-1.5">
        {OFFICER_RESOURCES.map((resource) => (
          <a key={resource} className="block text-gov-blue hover:underline" href="#officer-manual">
            {resource}
          </a>
        ))}
      </div>
    </div>
  );
}