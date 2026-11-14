export function SetupScreen() {
  return (
    <main className="app justify-center">
      <section className="gate-card p-6" role="alert">
        <h1 className="mb-2 text-lg font-bold">Supabase is not configured</h1>
        <p className="mb-3 text-[13px] leading-relaxed text-[#d4edf5]">
          Set these two environment variables, then restart the app (or redeploy on Vercel):
        </p>
        <pre className="overflow-x-auto rounded-2xl bg-[#09283c]/50 p-3 text-[12px] leading-relaxed text-[#d4edf5]">
          VITE_SUPABASE_URL{'\n'}VITE_SUPABASE_ANON_KEY
        </pre>
        <p className="mt-3 text-[12px] text-[#b9dcec]">Find them in Supabase → Project Settings → API. See README.md for the full guide.</p>
      </section>
    </main>
  );
}
