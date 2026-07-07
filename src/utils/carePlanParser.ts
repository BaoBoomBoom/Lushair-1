import type { TablerIconName } from '@/components/icons/tabler-icons';

export type CarePlanPeriod = 'morning' | 'evening' | 'treatment' | 'diet' | 'ingredient';

export interface ParsedCarePlanItem {
    title: string;
    subtitle?: string;
    period: CarePlanPeriod;
}

export interface ParsedCarePlan {
    sections: { period: CarePlanPeriod; items: ParsedCarePlanItem[] }[];
    rawText: string;
}

const SECTION_ALIASES: Record<string, CarePlanPeriod> = {
    morning: 'morning',
    'morning routine': 'morning',
    evening: 'evening',
    'evening routine': 'evening',
    treatment: 'treatment',
    treatments: 'treatment',
    'additional treatments': 'treatment',
    diet: 'diet',
    'diet & supplements': 'diet',
    supplements: 'diet',
    ingredient: 'ingredient',
    ingredients: 'ingredient',
    'active ingredients': 'ingredient',
};

function normalizeHeading(value: string): string {
    return value.toLowerCase().replace(/[#*_`]/g, '').trim();
}

function mapPeriodFromHeading(heading: string): CarePlanPeriod | null {
    const key = normalizeHeading(heading);
    if (SECTION_ALIASES[key]) return SECTION_ALIASES[key];
    for (const [alias, period] of Object.entries(SECTION_ALIASES)) {
        if (key.includes(alias)) return period;
    }
    return null;
}

function stripBullet(line: string): string {
    return line.replace(/^[\s>*-]+/, '').replace(/^\d+\.\s*/, '').trim();
}

function splitTitleSubtitle(text: string): { title: string; subtitle: string } {
    const parts = text.split(/[·—–-]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
        return { title: parts[0], subtitle: parts.slice(1).join(' · ') };
    }
    return { title: text, subtitle: '' };
}

function iconForPeriod(period: CarePlanPeriod, title: string): TablerIconName {
    const lower = title.toLowerCase();
    if (lower.includes('shampoo') || lower.includes('洗发')) return 'bath';
    if (lower.includes('massage') || lower.includes('按摩')) return 'yoga';
    if (lower.includes('minoxidil') || lower.includes('serum') || lower.includes('精华')) return 'droplet';
    if (lower.includes('biotin') || lower.includes('vitamin') || lower.includes('补充') || lower.includes('剂')) return 'pill';
    if (lower.includes('fish') || lower.includes('omega') || lower.includes('鱼油')) return 'fish';
    if (lower.includes('protein') || lower.includes('蛋白')) return 'egg';
    switch (period) {
        case 'morning':
            return 'flame';
        case 'evening':
            return 'bath';
        case 'treatment':
            return 'flask';
        case 'diet':
            return 'fish';
        case 'ingredient':
        default:
            return 'flask';
    }
}

export function iconForCareItem(period: CarePlanPeriod, title: string): TablerIconName {
    return iconForPeriod(period, title);
}

function parseJsonPlan(text: string): ParsedCarePlan | null {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/(\{[\s\S]*"sections"[\s\S]*\})/);
    if (!jsonMatch) return null;
    try {
        const payload = JSON.parse(jsonMatch[1]);
        const sections: ParsedCarePlan['sections'] = [];
        const rawSections = payload.sections || payload.items || [];
        if (!Array.isArray(rawSections)) return null;

        rawSections.forEach((section: any) => {
            const period = (section.period || section.id || section.title || 'morning') as string;
            const mapped = mapPeriodFromHeading(String(period)) || 'morning';
            const items = (section.items || section.tasks || []).map((item: any) => {
                const title = String(item.title || item.name || item.text || '').trim();
                if (!title) return null;
                return {
                    title,
                    subtitle: String(item.subtitle || item.sub || item.detail || '').trim(),
                    period: (mapPeriodFromHeading(String(item.period || mapped)) || mapped) as CarePlanPeriod,
                };
            }).filter(Boolean) as ParsedCarePlanItem[];
            if (items.length) sections.push({ period: mapped, items });
        });

        if (!sections.length) return null;
        return { sections, rawText: text };
    } catch {
        return null;
    }
}

function parseMarkdownPlan(text: string): ParsedCarePlan {
    const lines = text.split('\n');
    const sections: ParsedCarePlan['sections'] = [];
    let currentPeriod: CarePlanPeriod | null = null;
    let bucket: ParsedCarePlanItem[] = [];

    const flush = () => {
        if (currentPeriod && bucket.length) {
            sections.push({ period: currentPeriod, items: [...bucket] });
        }
        bucket = [];
    };

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const headingMatch = trimmed.match(/^#{1,3}\s+(.+)/);
        if (headingMatch) {
            flush();
            currentPeriod = mapPeriodFromHeading(headingMatch[1]) || currentPeriod;
            return;
        }

        const bulletMatch = trimmed.match(/^[-*•]\s+(.+)/) || trimmed.match(/^\d+\.\s+(.+)/);
        if (bulletMatch && currentPeriod) {
            const cleaned = stripBullet(bulletMatch[1]);
            if (!cleaned) return;
            const { title, subtitle } = splitTitleSubtitle(cleaned);
            bucket.push({ title, subtitle, period: currentPeriod });
        }
    });

    flush();

    if (!sections.length) {
        const fallbackItems = lines
            .map(stripBullet)
            .filter((l) => l.length > 8)
            .slice(0, 6)
            .map((line) => {
                const { title, subtitle } = splitTitleSubtitle(line);
                return { title, subtitle, period: 'morning' as CarePlanPeriod };
            });
        if (fallbackItems.length) sections.push({ period: 'morning', items: fallbackItems });
    }

    return { sections, rawText: text };
}

export function parseCarePlanFromAiResponse(text: string): ParsedCarePlan {
    const jsonPlan = parseJsonPlan(text);
    if (jsonPlan) return jsonPlan;
    return parseMarkdownPlan(text);
}

export function flattenCarePlan(plan: ParsedCarePlan): ParsedCarePlanItem[] {
    return plan.sections.flatMap((section) =>
        section.items.map((item) => ({ ...item, period: item.period || section.period })),
    );
}

export interface StoredCareRoutineItem {
    id: string;
    period: CarePlanPeriod;
    name: string;
    sub: string;
    icon: TablerIconName;
    done: boolean;
}

export function toStoredRoutineItems(plan: ParsedCarePlan, previous: StoredCareRoutineItem[] = []): StoredCareRoutineItem[] {
    const prevDone = new Map(previous.map((item) => [item.id, item.done]));
    const flat = flattenCarePlan(plan);

    return flat.map((item, index) => {
        const id = `${item.period}-${index}-${item.title.slice(0, 24).replace(/\s+/g, '-').toLowerCase()}`;
        const { title, subtitle } = splitTitleSubtitle(item.title);
        return {
            id,
            period: item.period,
            name: title,
            sub: subtitle || item.subtitle || '',
            icon: iconForCareItem(item.period, title),
            done: prevDone.get(id) ?? false,
        };
    });
}
