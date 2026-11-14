import { Icon } from './Icon';

export function BannedScreen({ until }: { until: number }) {
  const when = until > 0 ? new Date(until).toLocaleString() : null;
  return (
    <main className="app justify-center">
      <section className="gate-card p-6 text-center" role="alert">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-white/15">
          <Icon name="block" size={24} />
        </div>
        <h1 className="mb-2 text-lg font-bold">Access paused</h1>
        <p className="text-[13px] leading-relaxed text-[#d4edf5]">
          Your device was reported by several people for breaking the community rules.
          {when ? ` You can come back after ${when}.` : ' Please try again later.'}
        </p>
      </section>
    </main>
  );
}
