/** Shown when NEXT_PUBLIC_GAVEL_ADDRESS is missing, so the app knows no contract to talk to. */
export function NotConfigured() {
  return (
    <div className="rounded-xl border border-amber-600 bg-amber-950/40 p-5 text-amber-200">
      <h2 className="text-lg font-semibold">Contract not configured</h2>
      <p className="mt-2 text-sm">
        The Gavel contract address is not set. Deploy the contract, then set{" "}
        <code className="rounded bg-neutral-900 px-1">NEXT_PUBLIC_GAVEL_ADDRESS</code> in{" "}
        <code className="rounded bg-neutral-900 px-1">web/.env.local</code> (or in your Vercel project settings) and
        restart the app.
      </p>
    </div>
  );
}
