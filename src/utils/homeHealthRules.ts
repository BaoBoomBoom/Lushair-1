/** Metric thresholds aligned with advanced-result hexagon / AI payload conventions. */

export const METRIC_THRESHOLDS = {
    hairRadius: { standard: 27.5, poor: 15 },
    hairTexture: { standard: 27.5, poor: 15 },
    follicleDensity: { standard: 80, poor: 50 },
    avgHairPerFollicle: { standard: 1, poor: 1 },
    scalpOil: { standard: 7.5, poor: 20 },
    keratin: { standard: 1.5, poor: 5 },
    sensitivity: { standard: 7.5, poor: 20 },
} as const;

export type ScalpConditionLabel =
    | 'oily scalp'
    | 'dry scalp'
    | 'scurfy scalp'
    | 'mild scalp'
    | 'sensitive scalp';

export interface TrichoscopyMetrics {
    hairRadius?: number;
    hairTexture?: number;
    follicleDensity?: number;
    avgHairPerFollicle?: number;
    scalpOil?: number;
    keratin?: number;
    sensitivity?: number;
}

export interface HomeHealthFindings {
    hairThinning: boolean;
    shedding: boolean;
    scalpConditions: ScalpConditionLabel[];
    scalpSummary: string;
    hairSummary: string;
}

function num(value: unknown): number | undefined {
    if (value == null || value === '') return undefined;
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : undefined;
}

export function extractTrichoscopyMetrics(report: Record<string, any> | null | undefined): TrichoscopyMetrics {
    if (!report) return {};
    return {
        hairRadius: num(report.hair_max_rad_score_map?.score),
        hairTexture: num(report.hair_texture_score_map?.score),
        follicleDensity: num(report.hair_density_score_map?.score),
        avgHairPerFollicle: num(report.follicle_score_map?.score),
        scalpOil: num(report.scalp_oil_area_score_map?.score),
        keratin: num(report.keratinocytes_score_map?.score),
        sensitivity: num(report.redness_area_score_map?.score),
    };
}

export function deriveHomeHealthFindings(metrics: TrichoscopyMetrics): HomeHealthFindings {
    const t = METRIC_THRESHOLDS;
    const hairThinning =
        (metrics.hairRadius != null && metrics.hairRadius < t.hairRadius.standard) ||
        (metrics.hairTexture != null && metrics.hairTexture < t.hairTexture.standard);

    const shedding =
        (metrics.follicleDensity != null && metrics.follicleDensity < t.follicleDensity.standard) ||
        (metrics.avgHairPerFollicle != null && metrics.avgHairPerFollicle < t.avgHairPerFollicle.poor);

    const oily = metrics.scalpOil != null && metrics.scalpOil > t.scalpOil.standard;
    const scurfyOrDry = metrics.keratin != null && metrics.keratin > t.keratin.standard;
    const sensitive = metrics.sensitivity != null && metrics.sensitivity > t.sensitivity.standard;

    const scalpConditions: ScalpConditionLabel[] = [];
    if (oily) scalpConditions.push('oily scalp');
    if (scurfyOrDry) {
        scalpConditions.push(metrics.keratin! >= t.keratin.poor ? 'dry scalp' : 'scurfy scalp');
    }
    if (!oily && !scurfyOrDry) scalpConditions.push('mild scalp');
    if (sensitive) scalpConditions.push('sensitive scalp');

    const scalpParts: string[] = [];
    if (oily) scalpParts.push('elevated oil');
    if (scurfyOrDry) scalpParts.push('flaking/keratin buildup');
    if (sensitive) scalpParts.push('sensitivity');
    if (!scalpParts.length) scalpParts.push('generally balanced');

    const hairParts: string[] = [];
    if (hairThinning) hairParts.push('hair thinning signals');
    if (shedding) hairParts.push('shedding signals');
    if (!hairParts.length) hairParts.push('stable density profile');

    return {
        hairThinning,
        shedding,
        scalpConditions: [...new Set(scalpConditions)],
        scalpSummary: scalpParts.join(', '),
        hairSummary: hairParts.join(', '),
    };
}

export function formatSelfiePositionLabel(position: string | null | undefined, stage: number | null | undefined): string {
    const pos = (position || '').trim();
    const stageNum = stage != null && stage > 0 ? stage : null;
    if (!pos && stageNum == null) return '';
    if (!pos) return `Stage ${stageNum}`;
    if (stageNum == null) return pos;
    return `${pos}·Stage ${stageNum}`;
}

export type FindingDetailKey =
    | 'mild scalp'
    | 'oily scalp'
    | 'dry scalp'
    | 'scurfy scalp'
    | 'sensitive scalp'
    | 'hairThinning'
    | 'shedding';

export function isNormalFindingKey(key: string): boolean {
    return key === 'mild scalp';
}

export function getFindingDetailKey(key: string): FindingDetailKey | null {
    const map: Record<string, FindingDetailKey> = {
        'mild scalp': 'mild scalp',
        'oily scalp': 'oily scalp',
        'dry scalp': 'dry scalp',
        'scurfy scalp': 'scurfy scalp',
        'sensitive scalp': 'sensitive scalp',
        hairThinning: 'hairThinning',
        shedding: 'shedding',
    };
    return map[key] || null;
}

export function getFindingDetailParams(
    key: FindingDetailKey,
    metrics: TrichoscopyMetrics,
): Record<string, string | number> {
    const th = METRIC_THRESHOLDS;
    switch (key) {
        case 'oily scalp':
            return { value: metrics.scalpOil ?? '—', standard: th.scalpOil.standard };
        case 'dry scalp':
        case 'scurfy scalp':
            return { value: metrics.keratin ?? '—', standard: th.keratin.standard };
        case 'sensitive scalp':
            return { value: metrics.sensitivity ?? '—', standard: th.sensitivity.standard };
        case 'hairThinning':
            return {
                radius: metrics.hairRadius ?? '—',
                radiusStandard: th.hairRadius.standard,
                texture: metrics.hairTexture ?? '—',
                textureStandard: th.hairTexture.standard,
            };
        case 'shedding':
            return {
                density: metrics.follicleDensity ?? '—',
                densityStandard: th.follicleDensity.standard,
                avgCount: metrics.avgHairPerFollicle ?? '—',
                countStandard: th.avgHairPerFollicle.standard,
            };
        case 'mild scalp':
        default:
            return { oil: metrics.scalpOil ?? '—', keratin: metrics.keratin ?? '—' };
    }
}

export function buildCareRecommendationPrompt(params: {
    trichoscopyMetrics: TrichoscopyMetrics;
    findings: HomeHealthFindings;
    scores: { scalp: number; hair: number; follicle: number; overall: number };
    selfieLabel: string;
    language?: string;
}): string {
    const { trichoscopyMetrics: m, findings, scores, selfieLabel, language = 'zh' } = params;
    const langNote = language.startsWith('zh') ? '请用中文回答。' : 'Please respond in English.';

    return `${langNote}

Based on this person's most recent trichoscopy and selfie quantitative results, recommend active ingredients, daily habits to follow (including morning and evening routines), additional treatments that could be added, and dietary/supplement suggestions.

## Latest trichoscopy scores
- Overall: ${scores.overall}/100
- Scalp: ${scores.scalp}/100
- Hair: ${scores.hair}/100
- Follicle: ${scores.follicle}/100

## Detailed metrics
- Hair shaft radius (μm): ${m.hairRadius ?? 'N/A'}
- Hair texture score: ${m.hairTexture ?? 'N/A'}
- Follicle density score: ${m.follicleDensity ?? 'N/A'}
- Avg hairs per follicle: ${m.avgHairPerFollicle ?? 'N/A'}
- Scalp oil score: ${m.scalpOil ?? 'N/A'}
- Keratin/scurf score: ${m.keratin ?? 'N/A'}
- Sensitivity score: ${m.sensitivity ?? 'N/A'}

## Derived findings
- Hair thinning: ${findings.hairThinning ? 'yes' : 'no'}
- Shedding: ${findings.shedding ? 'yes' : 'no'}
- Scalp: ${findings.scalpConditions.join(', ')}
- Hair pattern summary: ${findings.hairSummary}
- Scalp pattern summary: ${findings.scalpSummary}

## Latest selfie
${selfieLabel || 'No selfie on file'}

Return ONLY a JSON code block (no extra prose) with this schema:
\`\`\`json
{
  "sections": [
    { "period": "ingredient", "items": [{ "title": "...", "subtitle": "..." }] },
    { "period": "morning", "items": [{ "title": "...", "subtitle": "..." }] },
    { "period": "evening", "items": [{ "title": "...", "subtitle": "..." }] },
    { "period": "treatment", "items": [{ "title": "...", "subtitle": "..." }] },
    { "period": "diet", "items": [{ "title": "...", "subtitle": "..." }] }
  ]
}
\`\`\`

Use period values: ingredient, morning, evening, treatment, diet. Each item must be a short, checkable daily action. Keep it practical and screening-oriented, not a medical diagnosis.`;
}
