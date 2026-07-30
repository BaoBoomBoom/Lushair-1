import { md5 } from 'js-md5';
import { post } from '@/utils/request';
import { ProjectBrand, getCurrentProjectBrand } from '@/utils/apiConfig';
import { useUserStore } from '@/stores/userStore';

export interface SelfieAnalysisResult {
    position: string;
    stage: number;
    imageUrl: string;
    pattern: number;
}

// Position value mapping from new API (0: None, 1: Forehead, 2: Top-head, 3: Alopecia areata)
const POSITION_VALUE_MAP: Record<number, string> = {
    0: 'None',
    1: 'Forehead',
    2: 'Top-head',
    3: 'Alopecia areata',
};

// Old API format
interface OldApiFormat {
    POSITION?: string;
    STAGE?: number;
}

// New API format
interface NewApiFormat {
    stage?: { conf: number; value: number };
    pattern?: { conf: number; value: number };
    position?: { conf: number; value: number };
    url?: string;
    status?: string;
}

// Type guard for new API format
function isNewApiFormat(response: any): response is NewApiFormat {
    return 'position' in response && typeof response.position?.value === 'number';
}

export async function analyzeSelfieImage(imageUrl: string): Promise<SelfieAnalysisResult> {
    const userStore = useUserStore();
    const userInfo = userStore.userInfo;
    const gender = userInfo?.gender || 2;
    const age = userInfo?.age || 30;
    const customer = 'lusHair1829de25';
    const key = 'owvI0JMeIXsM';
    const sign = md5(`${gender}${imageUrl}${key}${customer}`);

    const brand = getCurrentProjectBrand();
    const endpoint = brand === ProjectBrand.LUSHAIR ? '/file/hairlineApi' : '/file/hairlineApi';
    const response = (await post(endpoint, {
        customer,
        gender,
        age,
        imageUrl,
        sign,
    })) as OldApiFormat | NewApiFormat;

    // Handle new API format
    if (isNewApiFormat(response)) {
        const positionValue = response.position?.value ?? 0;
        const position = POSITION_VALUE_MAP[positionValue] || 'Unknown';
        const stage = response.stage?.value ?? 0;
        const pattern = response.pattern?.value ?? 0;
        const processedImageUrl = response.url || imageUrl;

        return {
            position,
            stage,
            pattern,
            imageUrl: processedImageUrl,
        };
    }

    // Handle old API format (fallback)
    const oldResponse = response as OldApiFormat;
    if (!oldResponse?.POSITION || oldResponse.STAGE == null) {
        throw new Error('Invalid selfie analysis response');
    }

    return {
        position: oldResponse.POSITION,
        stage: oldResponse.STAGE,
        pattern: 0,
        imageUrl,
    };
}
