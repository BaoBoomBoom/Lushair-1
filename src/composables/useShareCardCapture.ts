import html2canvas from 'html2canvas';

export async function captureShareCard(selector: string, fileName = 'lushair-share.png'): Promise<string> {
    const element = document.querySelector(selector) as HTMLElement | null;
    if (!element) {
        throw new Error('Share card element not found');
    }

    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.zIndex = '-9999';
    clone.style.opacity = '1';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);

    try {
        const canvas = await html2canvas(clone, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false,
        });
        return canvas.toDataURL('image/png');
    } finally {
        document.body.removeChild(clone);
    }
}

export async function shareCapturedImage(dataUrl: string, title: string, text: string): Promise<void> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], 'lushair-share.png', { type: 'image/png' });

    const isiOS =
        typeof navigator !== 'undefined' &&
        (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (/Macintosh/.test(navigator.userAgent) && 'ontouchend' in document));

    const w = window as Window & {
        webkit?: { messageHandlers?: Record<string, { postMessage: (d: unknown) => void }> };
    };

    if (isiOS && w.webkit?.messageHandlers?.savePassportImage) {
        w.webkit.messageHandlers.savePassportImage.postMessage({
            action: 'savePassportImage',
            imageData: dataUrl,
        });
        return;
    }

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
        return;
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'lushair-share.png';
    link.click();
}
