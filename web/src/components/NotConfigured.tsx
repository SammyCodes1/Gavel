/** Shown when NEXT_PUBLIC_GAVEL_ADDRESS is missing, so the app knows no contract to talk to. */
export function NotConfigured() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-sun/60 bg-sun/10 p-6 text-fg">
      <h2 className="font-display text-2xl font-extrabold text-sun">Contract not configured</h2>
      <p className="mt-2 text-sm text-muted">
        The Gavel contract address is not set. Deploy the contract, then set{" "}
        <code className="rounded bg-panel px-1 text-fg">NEXT_PUBLIC_GAVEL_ADDRESS</code> in{" "}
        <code className="rounded bg-panel px-1 text-fg">web/.env.local</code> (or in your Vercel project settings) and
        restart the app.
      </p>
    </div>
  );
}
