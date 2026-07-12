export interface DetectionScoreRecord {
    createTime?: string;
    scalp?: string;
    hair?: string;
    follicle?: string;
    scalpScore?: string;
}

export interface ScoreDeltas {
    overall: number | null;
    scalp: number | null;
    hair: number | null;
    follicle: number | null;
    hasPrevious: boolean;
}

export type ScoreDimension = 'overall' | 'scalp' | 'hair' | 'follicle';

function parseScore(value: string | undefined): number {
    return Math.round(parseFloat(value || '0') || 0);
}

function sortByNewest(list: DetectionScoreRecord[]): DetectionScoreRecord[] {
    return [...list].sort((a, b) => {
        const ta = new Date(a.createTime || '').getTime();
        const tb = new Date(b.createTime || '').getTime();
        if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
        if (Number.isNaN(ta)) return 1;
        if (Number.isNaN(tb)) return -1;
        return tb - ta;
    });
}

export function computeScoreDeltas(list: DetectionScoreRecord[]): ScoreDeltas {
    const sorted = sortByNewest(list);
    if (sorted.length < 2) {
        return { overall: null, scalp: null, hair: null, follicle: null, hasPrevious: false };
    }

    const latest = sorted[0];
    const previous = sorted[1];

    return {
        overall: parseScore(latest.scalpScore) - parseScore(previous.scalpScore),
        scalp: parseScore(latest.scalp) - parseScore(previous.scalp),
        hair: parseScore(latest.hair) - parseScore(previous.hair),
        follicle: parseScore(latest.follicle) - parseScore(previous.follicle),
        hasPrevious: true,
    };
}

export function formatScoreDelta(delta: number | null): string {
    if (delta == null || delta === 0) return '';
    const rounded = Math.round(delta);
    return rounded > 0 ? `+${rounded}` : String(rounded);
}

export function deltaTone(delta: number | null): 'up' | 'down' | 'flat' | 'none' {
    if (delta == null) return 'none';
    if (delta > 0) return 'up';
    if (delta < 0) return 'down';
    return 'flat';
}

function dominantDimension(deltas: ScoreDeltas): ScoreDimension | null {
    const pairs: { key: ScoreDimension; value: number | null }[] = [
        { key: 'scalp', value: deltas.scalp },
        { key: 'hair', value: deltas.hair },
        { key: 'follicle', value: deltas.follicle },
    ].filter((item) => item.value != null && item.value !== 0) as { key: ScoreDimension; value: number }[];

    if (!pairs.length) return null;

    pairs.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    return pairs[0].key;
}

export function buildScoreSituationNote(params: {
    deltas: ScoreDeltas;
    watchoutLabels: string[];
    hasMildScalpOnly: boolean;
    t: (key: string, args?: unknown[]) => string;
}): string {
    const { deltas, watchoutLabels, hasMildScalpOnly, t } = params;

    if (!deltas.hasPrevious) {
        return t('home.scoreNoteFirstScan');
    }

    const overall = deltas.overall ?? 0;
    const dominant = dominantDimension(deltas);
    const parts: string[] = [];

    if (overall > 0 && dominant) {
        parts.push(t(`home.scoreNoteImproved_${dominant}`));
    } else if (overall < 0 && dominant) {
        parts.push(t(`home.scoreNoteDeclined_${dominant}`));
    } else if (overall === 0) {
        parts.push(t('home.scoreNoteStable'));
    } else if (dominant) {
        parts.push(t(`home.scoreNoteMixed_${dominant}`));
    }

    if (watchoutLabels.length) {
        parts.push(t('home.scoreNoteWatch', [watchoutLabels.join(' · ')]));
    } else if (hasMildScalpOnly) {
        parts.push(t('home.scoreNoteBalanced'));
    }

    return parts.filter(Boolean).join(' ');
}

export function buildScoreTrendLine(params: {
    deltas: ScoreDeltas;
    lastScanRelative: string;
    t: (key: string) => string;
}): string {
    const { deltas, lastScanRelative, t } = params;

    if (!deltas.hasPrevious) {
        return t('home.scoreTrendBaseline');
    }

    const overall = deltas.overall ?? 0;
    if (overall > 0) return t('home.scoreTrendUp', [lastScanRelative]);
    if (overall < 0) return t('home.scoreTrendDown', [lastScanRelative]);
    return t('home.scoreTrendFlat', [lastScanRelative]);
}
