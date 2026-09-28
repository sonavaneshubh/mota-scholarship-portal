/**
 * A standing notice for the admin screens that still render illustrative data.
 *
 * The Demo Admin path - the submitted applications list and the application
 * detail page - reads the real database. The remaining screens (dashboard,
 * verification desk, reports, notifications, admin users) still render sample
 * rows, and saying so is the only honest option until they are wired up. Each of
 * them renders this component above its content so nobody can mistake an
 * illustrative figure for a real one.
 */
export function PrototypeDataNotice({ page }: { page: string }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
      <p className="font-bold uppercase tracking-wider">Not connected to live data</p>
      <p className="mt-1">
        Everything on this {page} screen is illustrative sample content, not a real record. The numbers,
        names and documents shown here do not come from the portal database and no action here changes anything.
        Real submitted applications are on the{' '}
        <a className="font-semibold underline" href="/admin/applications">Applications</a> screen, which reads
        the database through a read-only policy.
      </p>
    </div>
  );
}
