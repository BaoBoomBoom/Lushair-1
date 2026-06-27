import { post } from '@/utils/request';
import { ProjectBrand } from '@/utils/apiConfig';
import { env } from '@/utils/env';
export type AuthPushType = '0' | '1';

export interface SendCodeParams {
    pushType: AuthPushType;
    type: 'email' | 'phone';
    email?: string;
    phone?: string;
    countryCode?: string;
    inviteCode?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
    return EMAIL_RE.test(email.trim());
}

export function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const masked =
        local.length <= 2 ? '*'.repeat(Math.max(local.length, 1)) : `${local[0]}***${local.slice(-1)}`;
    return `${masked}@${domain}`;
}

export function maskPhone(countryCode: string, phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return `${countryCode} ${phone}`;
    return `${countryCode} ***${digits.slice(-4)}`;
}

export function buildSendCodeUrl(params: SendCodeParams): string {
    const q: string[] = [
        `pushType=${params.pushType}`,
        `type=${params.type}`,
    ];
    if (params.email) q.push(`email=${encodeURIComponent(params.email)}`);
    if (params.phone) q.push(`phone=${encodeURIComponent(params.phone)}`);
    if (params.countryCode) q.push(`countryCode=${encodeURIComponent(params.countryCode)}`);
    if (params.inviteCode) q.push(`inviteCode=${encodeURIComponent(params.inviteCode)}`);
    return `/pages/auth/send-code?${q.join('&')}`;
}

export function navigateToSendCode(params: SendCodeParams) {
    uni.navigateTo({
        url: buildSendCodeUrl(params),
        animationType: 'slide-in-right',
        animationDuration: 200,
    });
}

export function navigateAuthPage(path: string, pushType?: AuthPushType) {
    const url = pushType !== undefined ? `${path}?pushType=${pushType}` : path;
    uni.navigateTo({
        url,
        animationType: 'slide-in-right',
        animationDuration: 200,
    });
}

export async function sendEmailCaptcha(email: string, isDebug?: boolean) {
    const shouldDebug = isDebug ?? env.isDevelopment();
    const result = await post('login/sendEmailCaptcha', {
        email: email.trim(),
        isDebug: shouldDebug,
    }, { brand: ProjectBrand.LUSHAIR_NEW });

    // 开发环境：打印验证码到控制台
    if (shouldDebug && result?.data?.captcha) {
        console.log('🔐 [开发环境] 邮箱验证码:', result.data.captcha);
    }

    return result;
}

export async function sendPhoneCaptcha(countryCode: string, phone: string, isDebug?: boolean) {
    const shouldDebug = isDebug ?? env.isDevelopment();
    const result = await post('login/sendCaptcha', {
        countryCode,
        phone,
        isDebug: shouldDebug,
    }, { brand: ProjectBrand.LUSHAIR_NEW });

    // 开发环境：打印验证码到控制台
    if (shouldDebug && result?.data?.captcha) {
        console.log('🔐 [开发环境] 手机验证码:', result.data.captcha);
    }

    return result;
}

export function setUserIdToApp(userId: string) {
    try {
        if (typeof uni.getSystemInfoSync !== 'undefined') {
            const systemInfo = uni.getSystemInfoSync();
            if (systemInfo.platform !== 'devtools') {
                // @ts-ignore
                const w = window as Window & { webkit?: any; android?: any };
                if (w.webkit?.messageHandlers?.setUserId) {
                    w.webkit.messageHandlers.setUserId.postMessage(userId);
                } else if (w.android?.setUserId) {
                    w.android.setUserId(userId);
                }
            }
        }
    } catch (error) {
        console.error('Failed to set userId:', error);
    }
}
