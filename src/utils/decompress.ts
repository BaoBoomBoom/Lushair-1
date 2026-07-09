/**
 * Decompression utilities for Base64 + GZIP compressed data
 * Uses browser native APIs (no external dependencies)
 */

/**
 * Convert Base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Decompress Base64 + GZIP compressed data using native browser API
 * @param base64GzipData Base64 encoded GZIP compressed string
 * @returns Promise that resolves to decompressed and parsed JSON object
 */
export async function decompressBase64Gzip(base64GzipData: string): Promise<any> {
    try {
        // Decode Base64 to Uint8Array
        const bytes = base64ToUint8Array(base64GzipData);

        // Check if DecompressionStream is available
        if (typeof DecompressionStream === 'undefined') {
            console.error('DecompressionStream not supported in this browser');
            return null;
        }

        // Create a blob from the bytes
        const blob = new Blob([bytes], { type: 'application/gzip' });

        // Create a decompression stream
        const stream = blob.stream()
            .pipeThrough(new DecompressionStream('gzip'));

        // Convert stream back to text
        const decompressedResponse = new Response(stream);
        const decompressedText = await decompressedResponse.text();

        // Parse JSON
        return JSON.parse(decompressedText);
    } catch (error) {
        console.error('Failed to decompress data:', error);
        return null;
    }
}

/**
 * Extract ext_info from compressed detail data
 * @param base64GzipData Base64 encoded GZIP compressed string containing {input: {ext_info: {...}}, output: {...}}
 * @returns Promise that resolves to the ext_info object or null if extraction fails
 */
export async function extractExtInfo(base64GzipData: string): Promise<any> {
    try {
        const decompressed = await decompressBase64Gzip(base64GzipData);
        if (decompressed && decompressed.input && decompressed.input.ext_info) {
            return decompressed.input.ext_info;
        }
        return null;
    } catch (error) {
        console.error('Failed to extract ext_info:', error);
        return null;
    }
}

/**
 * Synchronous version - returns null if not supported
 * Note: Native DecompressionStream API is async, so synchronous version is not possible
 * This function exists for backward compatibility but always returns null
 */
export function decompressBase64GzipSync(base64GzipData: string): any {
    console.warn('Synchronous decompression not supported in browser environment');
    return null;
}

export default {
    decompressBase64Gzip,
    decompressBase64GzipSync,
    extractExtInfo
};
