/**
 * Finestre fisse di aggiornamento foto: 15 feb, 15 mag, 15 ago, 15 nov.
 * Unica fonte di verità condivisa tra server e frontend.
 */
export const UPDATE_WINDOWS = [
  { month: 1,  day: 15 }, // 15 febbraio
  { month: 4,  day: 15 }, // 15 maggio
  { month: 7,  day: 15 }, // 15 agosto
  { month: 10, day: 15 }, // 15 novembre
] as const;

/**
 * Numero di slot foto sbloccati in base alle finestre fisse trimestrali.
 * Accetta sia Date (server, valore raw dal DB) che string ISO (client, risposta API).
 */
export function getUnlockedPhotoSlots(createdAt: Date | string, now = new Date()): number {
  const createdAtDate = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  let count = 0;
  for (let year = createdAtDate.getFullYear(); year <= now.getFullYear() + 1; year++) {
    for (const { month, day } of UPDATE_WINDOWS) {
      const windowDate = new Date(year, month, day);
      if (windowDate > createdAtDate && windowDate <= now) count++;
    }
  }
  return count;
}

/**
 * Restituisce la stringa del trimestre corrente, es. "2026-Q2".
 */
export function getCurrentQuarterString(now = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const q = month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : 4;
  return `${year}-Q${q}`;
}

/**
 * Restituisce la data localizzata della prossima finestra di aggiornamento disponibile.
 */
export function getNextSlotDate(now = new Date()): string {
  for (let year = now.getFullYear(); year <= now.getFullYear() + 2; year++) {
    for (const { month, day } of UPDATE_WINDOWS) {
      const windowDate = new Date(year, month, day);
      if (windowDate > now) {
        return windowDate.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
      }
    }
  }
  return "prossima finestra";
}
