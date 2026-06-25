/**
 * Clerk Authentication Client
 *
 * Clerk 集成客户端，用于 UniApp 前端
 * 提供用户注册、登录、Token 管理等功能
 *
 * 由于 UniApp 环境的特殊性和 Clerk 生产环境 API 限制：
 * 1. 用户通过验证码验证
 * 2. 验证成功后调用后端 API 创建/获取 Clerk 用户
 * 3. 后端返回 Clerk 用户 ID
 * 4. 前端使用原有认证流程完成登录（Clerk 用户已创建供后续使用）
 */

// Clerk 配置 - 后端 API 地址
const CLERK_BACKEND_API = process.env.VUE_APP_CLERK_BACKEND_API || 'https://lushair-backend-overseas.vercel.app/api';

/**
 * 为已验证的用户创建或获取 Clerk 用户
 *
 * 这是专门针对验证码登录场景的方法
 * 由于用户已经通过验证码验证，我们通过后端创建 Clerk 用户
 *
 * 注意：由于 Clerk 生产环境的 API 限制，后端不再返回 session token
 * 前端应使用原有认证流程，Clerk 用户 ID 保存供后续使用
 *
 * @param identifier 邮箱或手机号
 * @param type 'email' | 'phone'
 * @param countryCode 国家代码（仅 phone 类型需要）
 * @returns 创建的 Clerk 用户信息
 */
export async function createClerkUserAfterVerification(
    identifier: string,
    type: 'email' | 'phone',
    countryCode?: string
): Promise<{
    success: boolean;
    clerkUserId?: string;
    token?: string;
    error?: string;
}> {
    try {
        // 通过后端创建 Clerk 用户
        const response = await fetch(`${CLERK_BACKEND_API}/clerk/create-or-get-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                identifier,
                type,
                countryCode,
            }),
        });

        const data = await response.json();

        // 检查响应是否成功（支持新旧两种格式）
        const isSuccess = data.code === 200 || data.success === true;

        if (isSuccess && data.data) {
            const clerkUserId = data.data.clerkUserId;

            // 保存 Clerk 用户 ID 到本地存储
            if (clerkUserId) {
                uni.setStorageSync('clerkUserId', clerkUserId);
            }

            // 如果有 token 也保存（向后兼容）
            if (data.data.token) {
                uni.setStorageSync('clerkToken', data.data.token);
            }

            return {
                success: true,
                clerkUserId: clerkUserId,
                token: data.data.token, // 可能为 undefined
            };
        }

        return {
            success: false,
            error: data.message || data.error || 'Failed to create Clerk user',
        };
    } catch (error) {
        console.error('Create Clerk user error:', error);
        return {
            success: false,
            error: 'Network error creating Clerk user',
        };
    }
}

/**
 * 使用已有 Clerk Token 登录到后端
 *
 * @param clerkToken Clerk Session Token
 * @param userData 用户数据（邮箱、手机号等）
 * @returns 后端用户信息
 */
export async function loginWithClerkToken(
    clerkToken: string,
    userData: {
        email?: string;
        phone?: string;
        countryCode?: string;
        region?: string;
        age?: number;
        gender?: number;
        name?: string;
        nickName?: string;
    }
): Promise<{
    success: boolean;
    user?: any;
    error?: string;
}> {
    try {
        const response = await fetch(`${CLERK_BACKEND_API}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${clerkToken}`,
            },
            body: JSON.stringify(userData),
        });

        const data = await response.json();

        if (data.code === 200) {
            return {
                success: true,
                user: data.data,
            };
        }

        return {
            success: false,
            error: data.message || 'Login failed',
        };
    } catch (error) {
        console.error('Login with Clerk token error:', error);
        return {
            success: false,
            error: 'Network error during login',
        };
    }
}

/**
 * 使用 Clerk Token 注册用户到后端
 *
 * @param clerkToken Clerk Session Token
 * @param userData 用户数据
 * @returns 后端用户信息
 */
export async function registerWithClerkToken(
    clerkToken: string,
    userData: {
        email?: string;
        phone?: string;
        countryCode?: string;
        region?: string;
        age?: number;
        gender?: number;
        name?: string;
        nickName?: string;
    }
): Promise<{
    success: boolean;
    user?: any;
    error?: string;
}> {
    try {
        const response = await fetch(`${CLERK_BACKEND_API}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${clerkToken}`,
            },
            body: JSON.stringify(userData),
        });

        const data = await response.json();

        if (data.code === 200) {
            return {
                success: true,
                user: data.data,
            };
        }

        return {
            success: false,
            error: data.message || 'Registration failed',
        };
    } catch (error) {
        console.error('Register with Clerk token error:', error);
        return {
            success: false,
            error: 'Network error during registration',
        };
    }
}

/**
 * 获取当前存储的 Clerk Token
 */
export function getClerkToken(): string | null {
    return uni.getStorageSync('clerkToken') || null;
}

/**
 * 获取当前存储的 Clerk User ID
 */
export function getClerkUserId(): string | null {
    return uni.getStorageSync('clerkUserId') || null;
}

/**
 * 清除 Clerk 会话
 */
export function clearClerkSession(): void {
    uni.removeStorageSync('clerkToken');
    uni.removeStorageSync('clerkUserId');
}

/**
 * 检查是否有有效的 Clerk 会话
 */
export function hasClerkSession(): boolean {
    return !!getClerkToken();
}

/**
 * 获取自拍报告列表（分页）
 * 从 hair_reports 表获取，按 reportType='selfie' 筛选
 *
 * @param userId 用户 ID（老系统的 userId）
 * @param page 页码，从 1 开始
 * @param pageSize 每页条数，默认 10
 * @returns 自拍报告列表数据
 */
export async function getSelfieReports(userId: string, page = 1, pageSize = 10): Promise<{
    reports: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
}> {
    try {
        const url = new URL(`${CLERK_BACKEND_API}/report/selfie`);
        url.searchParams.append('userId', userId);
        url.searchParams.append('page', String(page));
        url.searchParams.append('pageSize', String(pageSize));

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (data.code === 200 && data.data) {
            return data.data;
        }

        throw new Error(data.message || 'Failed to fetch selfie reports');
    } catch (error) {
        console.error('Get selfie reports error:', error);
        throw error;
    }
}

/**
 * 获取毛囊镜报告列表（分页）
 * 从 hair_reports 表获取，按 reportType='trichoscopy' 筛选
 *
 * @param userId 用户 ID（老系统的 userId）
 * @param page 页码，从 1 开始
 * @param pageSize 每页条数，默认 10
 * @returns 毛囊镜报告列表数据
 */
export async function getTrichoReports(userId: string, page = 1, pageSize = 10): Promise<{
    reports: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
}> {
    try {
        const url = new URL(`${CLERK_BACKEND_API}/report/trichoscopy`);
        url.searchParams.append('userId', userId);
        url.searchParams.append('page', String(page));
        url.searchParams.append('pageSize', String(pageSize));

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (data.code === 200 && data.data) {
            return data.data;
        }

        throw new Error(data.message || 'Failed to fetch tricho reports');
    } catch (error) {
        console.error('Get tricho reports error:', error);
        throw error;
    }
}

/**
 * Clerk 错误处理
 */
export function handleClerkError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return 'Unknown authentication error';
}
