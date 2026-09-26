import { readFileSync } from 'fs';

// Candidates can answer health checks without running scheduled financial writes.
// Re-read the atomically replaced marker, so promotion needs no process restart.
export function isActiveWorker(): boolean {
    const slot = process.env.DEPLOYMENT_SLOT;
    if (!slot) return true;
    if (!['blue', 'green'].includes(slot) || !process.env.ACTIVE_SLOT_FILE) return false;
    try {
        return readFileSync(process.env.ACTIVE_SLOT_FILE, 'utf8').trim() === slot;
    } catch {
        return false;
    }
}
