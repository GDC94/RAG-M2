/** Simulated Alba People staff shown as overlapping avatars in the sidebar
 * (`StaffAvatars`). Not real users — decorative, to sell the "internal
 * team" framing of the demo. Avatars are DiceBear "notionists" SVGs. */

export interface StaffMember {
  name: string;
  seed: string;
  avatarUrl: string;
}

/** Rest of the team, shown as a trailing "+N" counter after the avatars. */
export const STAFF_EXTRA_COUNT = 45;

const STAFF_SEEDS = ['Lucia', 'Mateo', 'Valentina', 'Tomas'] as const;

export const STAFF_MEMBERS: readonly StaffMember[] = STAFF_SEEDS.map((seed) => ({
  name: seed,
  seed,
  avatarUrl: `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}&backgroundColor=f4f4f5`,
}));
