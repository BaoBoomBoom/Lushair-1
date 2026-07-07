export function stripMarkdown(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/[*_~>#-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function truncateText(text: string, maxLength = 280): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1).trim()}…`;
}

export interface ChatSharePayload {
    question: string;
    answer: string;
    productTitle: string;
    productSub: string;
}

const PRODUCT_LINE = /(?:recommend|try|use|apply|consider|suggest)[^.!?\n]{0,80}(?:shampoo|serum|oil|conditioner|mask|minoxidil|finasteride|supplement|vitamin|treatment)/i;
const NAMED_PRODUCT = /(?:^|\n)[-*•\d.]+\s*([A-Z][^.!\n]{4,60}(?:shampoo|serum|oil|conditioner|mask|treatment)[^.!\n]{0,40})/i;

export function extractChatSharePayload(
    messages: Array<{ type: string; content: string }>,
    typingContent = '',
    fallbackQuestion = '',
    fallbackAnswer = '',
): ChatSharePayload {
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
        if (messages[i].type === 'user') {
            lastUserIndex = i;
            break;
        }
    }

    const questionRaw =
        lastUserIndex >= 0 ? messages[lastUserIndex].content : messages.find((m) => m.type === 'user')?.content || fallbackQuestion;

    const answerRaw =
        (lastUserIndex >= 0
            ? messages.slice(lastUserIndex + 1).find((m) => m.type === 'bot')?.content
            : [...messages].reverse().find((m) => m.type === 'bot')?.content) ||
        typingContent ||
        fallbackAnswer;

    const question = truncateText(stripMarkdown(questionRaw), 120);
    const answer = truncateText(stripMarkdown(answerRaw), 320);

    const productMatch =
        answerRaw.match(NAMED_PRODUCT)?.[1]?.trim() ||
        answerRaw.match(PRODUCT_LINE)?.[0]?.trim() ||
        '';

    let productTitle = '';
    let productSub = '';

    if (productMatch) {
        productTitle = truncateText(stripMarkdown(productMatch), 48);
        const rest = stripMarkdown(answerRaw.replace(productMatch, ''));
        productSub = truncateText(rest, 100) || 'Based on your scan and this conversation.';
    } else {
        const recLine = answerRaw
            .split('\n')
            .map((line) => stripMarkdown(line))
            .find((line) => /recommend|suggest|try|use|routine|care plan|treatment/i.test(line));
        if (recLine) {
            productTitle = truncateText(recLine, 48);
            productSub = truncateText(stripMarkdown(answerRaw), 100);
        }
    }

    return {
        question,
        answer,
        productTitle,
        productSub,
    };
}
