import { computed, ref } from 'vue';
import { get, post, ProjectBrand } from '@/utils/request';
import { useUserStore } from '@/stores/userStore';
import { setUserIdToApp } from '@/composables/useAuthFlow';

export const MERCHANT_SCAN_CUSTOMER_KEY = 'merchant_scan_customer';

export interface MerchantScanCustomer {
    customerId: string;
    userId: string;
    merchantId: string;
    name: string;
    phone?: string;
    email?: string;
    gender?: string;
    birthDate?: string;
}

export type MerchantContactType = 'phone' | 'email';

function readStoredCustomer(): MerchantScanCustomer | null {
    try {
        const raw = uni.getStorageSync(MERCHANT_SCAN_CUSTOMER_KEY);
        if (!raw) return null;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!parsed?.customerId || !parsed?.userId || !parsed?.merchantId) return null;
        return parsed as MerchantScanCustomer;
    } catch {
        return null;
    }
}

export function isMerchantAccount(userInfo: { type?: number | string; userType?: number | string } | null | undefined): boolean {
    const info = userInfo as { type?: number | string; userType?: number | string };
    return Number(info?.userType ?? info?.type) === 1;
}

export function useMerchantScanCustomer() {
    const userStore = useUserStore();
    const activeCustomer = ref<MerchantScanCustomer | null>(readStoredCustomer());
    const isSaving = ref(false);

    const isMerchant = computed(() => isMerchantAccount(userStore.userInfo));
    const hasActiveCustomer = computed(() => !!activeCustomer.value);
    const merchantId = computed(() => userStore.userInfo.userId || '');

    function persistCustomer(customer: MerchantScanCustomer | null) {
        activeCustomer.value = customer;
        if (customer) {
            uni.setStorageSync(MERCHANT_SCAN_CUSTOMER_KEY, JSON.stringify(customer));
            setUserIdToApp(customer.userId);
        } else {
            uni.removeStorageSync(MERCHANT_SCAN_CUSTOMER_KEY);
            if (merchantId.value) {
                setUserIdToApp(merchantId.value);
            }
        }
    }

    function clearCustomer() {
        persistCustomer(null);
    }

    async function resolveCustomerUserId(contact: { phone?: string; email?: string }): Promise<string> {
        const lookupPayload = contact.phone ? { phone: contact.phone } : { email: contact.email };

        // 1. 先查询新后端
        let userInfo = await get('user/profile', lookupPayload, { brand: ProjectBrand.LUSHAIR_NEW }) as any;
        if (userInfo?.userId) {
            console.log('[resolveCustomerUserId] 新后端找到用户:', userInfo.userId);
            return userInfo.userId;
        }

        // 2. 新后端没有，查询老后端
        try {
            const legacyUserInfo = await post('user/info', lookupPayload, { silent: true }) as any;
            if (legacyUserInfo?.userId) {
                console.log('[resolveCustomerUserId] 老后端找到用户，同步到新后端:', legacyUserInfo.userId);
                // 3. 老后端有，同步到新后端
                await post('user/sync', { ...legacyUserInfo, userType: legacyUserInfo.type }, { brand: ProjectBrand.LUSHAIR_NEW });
                return legacyUserInfo.userId;
            }
        } catch (error) {
            console.log('[resolveCustomerUserId] 老后端查询失败:', error);
        }

        // 4. 都没有，注册到老后端
        console.log('[resolveCustomerUserId] 注册新用户到老后端');
        const registerResult = await post('login/registUser', {
            ...lookupPayload,
            name: contact.phone || contact.email,
        }) as any;

        // 5. 同步到新后端
        if (registerResult?.userId || registerResult?.customerId) {
            const userData = registerResult.userId ? registerResult : {
                userId: registerResult.customerId || registerResult.userId,
                ...registerResult,
            };
            console.log('[resolveCustomerUserId] 同步新用户到新后端:', userData.userId);
            await post('user/sync', { ...userData, userType: userData.type }, { brand: ProjectBrand.LUSHAIR_NEW });
            return userData.userId;
        }

        throw new Error('customer_user_missing');
    }

    async function registerCustomer(input: {
        name: string;
        contactType: MerchantContactType;
        phone?: string;
        email?: string;
        gender?: string;
        birthDate?: string;
    }): Promise<MerchantScanCustomer> {
        const trimmedName = input.name.trim();
        const phone = input.phone?.replace(/\D/g, '') || '';
        const email = input.email?.trim().toLowerCase() || '';

        if (!trimmedName) {
            throw new Error('name_required');
        }
        if (!merchantId.value) {
            throw new Error('merchant_missing');
        }
        if (input.contactType === 'phone') {
            if (phone.length < 6 || phone.length > 15) {
                throw new Error('phone_invalid');
            }
        } else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('email_invalid');
        }

        isSaving.value = true;
        try {
            const contact = input.contactType === 'phone' ? { phone } : { email };
            const userId = await resolveCustomerUserId(contact);

            // gender 直接使用字符串值
            const genderValue = input.gender || undefined;

            // 调用新后端 API 创建客户
            const response = await post(
                'customer',
                {
                    merchantId: merchantId.value,
                    userId,
                    name: trimmedName,
                    ...contact,
                    gender: genderValue,
                    birthDate: input.birthDate,
                },
                { brand: ProjectBrand.LUSHAIR_NEW }
            ) as { exists?: boolean; customer?: { id: string; userId: string; merchantId: string; name: string; phone?: string; email?: string } };

            // 检查是否是客户已存在的情况
            if (response.exists) {
                const error = new Error('Customer already exists') as any;
                error.customer = response.customer;
                throw error;
            }

            const customerData = response.customer || response;

            const customer: MerchantScanCustomer = {
                customerId: customerData.id,
                userId: customerData.userId || userId,
                merchantId: customerData.merchantId || merchantId.value,
                name: customerData.name || trimmedName,
                ...(customerData.phone ? { phone: customerData.phone } : {}),
                ...(customerData.email ? { email: customerData.email } : {}),
                gender: input.gender,
                birthDate: input.birthDate,
            };

            persistCustomer(customer);
            return customer;
        } finally {
            isSaving.value = false;
        }
    }

    function getScanUserId(): string {
        if (isMerchant.value && activeCustomer.value?.userId) {
            return activeCustomer.value.userId;
        }
        return userStore.userInfo.userId;
    }

    function getMerchantScanPayload(): Record<string, any> {
        if (!isMerchant.value || !activeCustomer.value) {
            return {};
        }
        const { customerId, merchantId: mid, userId, name, phone, email, gender, birthDate } = activeCustomer.value;

        // gender 字符串转数字 (male=1, female=2, other=0) - 传递给 App 需要数字
        const genderMap: Record<string, number> = { male: 1, female: 2, other: 0 };
        const genderValue = gender ? genderMap[gender] ?? 0 : undefined;

        return {
            customerId,
            merchantId: mid,
            userId,
            name,
            ...(phone ? { phone } : {}),
            ...(email ? { email } : {}),
            ...(genderValue ? { gender: genderValue } : {}),
            ...(birthDate ? { birthDate } : {}),
        };
    }

    return {
        activeCustomer,
        isMerchant,
        hasActiveCustomer,
        merchantId,
        isSaving,
        registerCustomer,
        clearCustomer,
        getScanUserId,
        getMerchantScanPayload,
        persistCustomer,
    };
}

export function getMerchantScanCustomer(): MerchantScanCustomer | null {
    return readStoredCustomer();
}
