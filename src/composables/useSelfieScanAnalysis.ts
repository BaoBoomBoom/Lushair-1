import md5 from 'js-md5';
import { post } from '@/utils/request';
import { ProjectBrand, getCurrentProjectBrand } from '@/utils/apiConfig';
import { useUserStore } from '@/stores/userStore';

export interface SelfieAnalysisResult {
    position: string;
    stage: number;
    imageUrl: string;
}

export async function analyzeSelfieImage(imageUrl: string): Promise<SelfieAnalysisResult> {
    const userStore = useUserStore();
    const userInfo = userStore.userInfo;
    const gender = userInfo?.gender || 2;
    const customer = 'lusHair1829de25';
    const key = 'owvI0JMeIXsM';
    const sign = md5(`${gender}${imageUrl}${key}${customer}`);

    const brand = getCurrentProjectBrand();
    const endpoint = brand === ProjectBrand.LUSHAIR ? '/file/selfieNetApi' : '/file/selfieApi';
    const response = (await post(endpoint, {
        customer,
        gender,
        imageUrl,
        sign,
    })) as { POSITION?: string; STAGE?: number };

    if (!response?.POSITION || response.STAGE == null) {
        throw new Error('Invalid selfie analysis response');
    }

    return {
        position: response.POSITION,
        stage: response.STAGE,
        imageUrl,
    };
}
