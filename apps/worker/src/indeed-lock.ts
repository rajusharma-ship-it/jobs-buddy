let lock = Promise.resolve();
let holder: string | null = null;

export function getIndeedLockHolder(): string | null {
  return holder;
}

/** Only one Indeed Chrome profile session at a time (Playwright persistent context). */
export async function acquireIndeedLock(who: string): Promise<() => void> {
  await lock;
  let releaseLock!: () => void;
  lock = new Promise<void>((resolve) => {
    releaseLock = () => {
      holder = null;
      resolve();
    };
  });
  holder = who;
  return releaseLock;
}
