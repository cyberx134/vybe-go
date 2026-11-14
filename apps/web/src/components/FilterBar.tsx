import { FILTER_COUNTRIES, type GenderPreference } from '@vybe/shared';
import { Icon } from './Icon';

interface FilterBarProps {
  wantGender: GenderPreference;
  wantCountry: string;
  onCycleGender: () => void;
  onCountry: (country: string) => void;
}

const GENDER_LABEL: Record<GenderPreference, string> = { any: 'Anyone', boy: 'Boy', girl: 'Girl' };

/** শুরু/থামা/পরের — কোনো বাটন নেই; সবকিছু স্লাইডে। এখানে শুধু কাকে খুঁজবেন সেই ফিল্টার। */
export function FilterBar({ wantGender, wantCountry, onCycleGender, onCountry }: FilterBarProps) {
  return (
    <nav className="controls" aria-label="Match filters" data-no-swipe>
      <button
        className="choice grow gender"
        type="button"
        onClick={onCycleGender}
        aria-label={`Who you want to meet: ${GENDER_LABEL[wantGender]}. Tap to change`}
      >
        <Icon name="gender" size={17} />
        <span>{GENDER_LABEL[wantGender]}</span>
      </button>
      <label className="choice grow">
        <Icon name="globe" size={17} />
        <select value={wantCountry} onChange={(e) => onCountry(e.target.value)} aria-label="Country filter">
          {FILTER_COUNTRIES.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
