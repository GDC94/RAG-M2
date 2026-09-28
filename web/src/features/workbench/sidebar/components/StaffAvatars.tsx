import { cn } from '@/lib/utils';
import { STAFF_EXTRA_COUNT, STAFF_MEMBERS } from '../staff';

/** Shared circle for avatars and the trailing "+N" counter. */
const AVATAR_CIRCLE =
  'size-[60px] shrink-0 rounded-full border-[3px] border-avatar-ring transition-transform duration-150 hover:z-10 hover:-translate-y-[3px]';

/** Overlapping simulated-staff avatars plus a "+N" counter for the rest of the
 * team, used to sell "real people asking real questions" in the sidebar.
 * See `sidebar/staff.ts` for the data. */
export function StaffAvatars() {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex">
        {STAFF_MEMBERS.map((member, index) => (
          <img
            key={member.seed}
            src={member.avatarUrl}
            alt={member.name}
            width={60}
            height={60}
            loading="lazy"
            className={cn(AVATAR_CIRCLE, index > 0 && '-ml-3.5')}
          />
        ))}
        <span
          data-testid="staff-extra"
          className={cn(
            AVATAR_CIRCLE,
            '-ml-3.5 grid place-items-center bg-ink-300 font-medium text-fg-soft text-sm',
          )}
        >
          <span aria-hidden="true">+{STAFF_EXTRA_COUNT}</span>
          <span className="sr-only">{STAFF_EXTRA_COUNT} personas más</span>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-base text-fg-soft">Personal de Alba</span>
        <span className="text-sm text-fg-subtle">Consultas simuladas del equipo</span>
      </div>
    </div>
  );
}
