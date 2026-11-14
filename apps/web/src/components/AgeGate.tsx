import { useState } from 'react';
import { COUNTRIES, MIN_AGE, type Gender } from '@vybe/shared';
import type { Profile } from '../lib/storage';
import { Icon } from './Icon';

interface AgeGateProps {
  onAccept: (profile: Profile) => void;
}

const RULES = [
  'No nudity, sexual content or sexual behaviour.',
  'No harassment, hate, threats or bullying.',
  'No spam, scams, advertising or begging.',
  `You must be ${MIN_AGE} or older. Users under ${MIN_AGE} are not allowed.`,
  'Never share personal information such as your address or passwords.',
  'Report anyone who breaks these rules — repeat offenders are banned.',
];

export function AgeGate({ onAccept }: AgeGateProps) {
  const [gender, setGender] = useState<Gender>('boy');
  const [country, setCountry] = useState<Profile['country']>('Bangladesh');
  const [agreed, setAgreed] = useState(false);

  return (
    <main className="app justify-center py-6">
      <div className="mb-1 flex flex-col items-center">
        <img src="/logo.png" alt="VYBE GO — Meet the world" width={300} height={300} className="w-[min(70vw,290px)] select-none" draggable={false} />
      </div>

      <section className="gate-card p-5" aria-labelledby="gate-title">
        <h2 id="gate-title" className="mb-3 text-[15px] font-bold">
          Before you start
        </h2>

        <div className="mb-3">
          <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-[#d4edf5]">I AM</div>
          <div className="seg" role="group" aria-label="I am">
            <button type="button" aria-pressed={gender === 'boy'} onClick={() => setGender('boy')}>
              Boy
            </button>
            <button type="button" aria-pressed={gender === 'girl'} onClick={() => setGender('girl')}>
              Girl
            </button>
          </div>
        </div>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-[11px] font-semibold tracking-wide text-[#d4edf5]">I&apos;M FROM</span>
          <select className="field" value={country} onChange={(e) => setCountry(e.target.value as Profile['country'])}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-3 flex cursor-pointer items-start gap-3 text-[12px] leading-relaxed text-[#e4f4fa]">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#79e4e6]"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span>
            I confirm that I am <strong>{MIN_AGE} or older</strong> and I agree to follow the community rules below.
          </span>
        </label>

        <details className="mb-4 rounded-2xl border border-white/20 bg-[#09283c]/30 px-3 py-2 text-[12px] text-[#d4edf5]">
          <summary className="cursor-pointer font-semibold">Community rules</summary>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed">
            {RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </details>

        <button
          type="button"
          className="action primary w-full"
          disabled={!agreed}
          onClick={() => onAccept({ gender, country, acceptedAt: Date.now() })}
        >
          <Icon name="shield" size={18} /> Continue
        </button>
      </section>

      <p className="px-4 text-center text-[10px] leading-relaxed text-[#b9dcec]">
        Video is sent directly between you and the other person. Conversations are not recorded. Reports include the last few chat messages.
      </p>
    </main>
  );
}
