import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OFFICER_RESOURCES } from '../../data/mockData';
import { ROUTES } from '../../lib/constants';
import { Button } from '../ui/Button';

export function OfficerQuickLogin() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  return (
    <div
      className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-5"
      id="officer-access"
    >
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
        <div>
          <span className="text-[10px] font-bold text-gov-blue uppercase">Authorized Access</span>
          <h3 className="text-sm font-bold text-slate-900">Officer / Administrator Access</h3>
        </div>
        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
          UI Only
        </span>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed mb-4">
        Authorized officers can review applications, verify documents, inspect AI-assisted
        extraction results, evaluate configured rules, and record decisions.
      </p>

      <form
        className="space-y-3"
        data-purpose="officer-quick-login"
        onSubmit={(event) => {
          event.preventDefault();
          navigate(ROUTES.admin.login);
        }}
      >
        <div>
          <label htmlFor="officer-code" className="block text-xs font-medium text-slate-700 mb-1">
            Officer Code / ID
          </label>
          <input
            id="officer-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. OFF-0123 (demo)"
            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-gov-blue"
            type="text"
          />
        </div>
        <div>
          <label htmlFor="officer-password" className="block text-xs font-medium text-slate-700 mb-1">
            Password / DSC
          </label>
          <input
            id="officer-password"
            placeholder="••••••••"
            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-gov-blue"
            type="password"
          />
        </div>
        <Button variant="primary" size="md" className="w-full justify-center" type="submit">
          Officer Login
        </Button>
      </form>

      <p className="mt-3 text-[11px] text-slate-500 italic">
        Prototype UI only — no real authentication is implemented in this build.
      </p>

      <div className="mt-3 pt-3 border-t border-slate-200 text-xs space-y-1.5">
        {OFFICER_RESOURCES.map((resource) => (
          <a key={resource} className="block text-gov-blue hover:underline" href="#officer-resources">
            {resource}
          </a>
        ))}
      </div>
    </div>
  );
}