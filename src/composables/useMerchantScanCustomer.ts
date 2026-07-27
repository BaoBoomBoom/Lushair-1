import { computed, ref } from 'vue';
import { post, ProjectBrand } from '@/utils/request';
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
    return Number(info?.type ?? info?.userType) === 1;
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
        let userInfo: { userId?: string } | null = null;

        try {
            userInfo = (await post('user/info', lookupPayload, { silent: true })) as { userId?: string };
        } catch {
            userInfo = null;
        }

        if (userInfo?.userId) {
            return userInfo.userId;
        }

        await post('login/registUser', {
            ...lookupPayload,
            name: contact.phone || contact.email,
        });

        const created = (await post('user/info', lookupPayload)) as { userId?: string };
        if (!created?.userId) {
            throw new Error('customer_user_missing');
        }
        return created.userId;
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

            // 调用新后端 API 创建客户
            const response = await post(
                'customer',
                {
                    merchantId: merchantId.value,
                    userId,
                    name: trimmedName,
                    ...contact,
                    gender: input.gender,
                    birthDate: input.birthDate,
                },
                { brand: ProjectBrand.LUSHAIR_NEW }
            ) as { exists?: boolean; customer?: { id: string; userId: string; merchantId: string; name: string; phone?: string; email?: string } };

            const customerData = response.customer || response;

            const customer: MerchantScanCustomer = {
                customerId: customerData.id,
                userId: customerData.userId || userId,
                merchantId: customerData.merchantId || merchantId.value,
                name: customerData.name || trimmedName,
                ...(customerData.phone ? { phone: customerData.phone } : {}),
                ...(customerData.email ? { email: customerData.email } : {}),
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

    function getMerchantScanPayload(): Record<string, string> {
        if (!isMerchant.value || !activeCustomer.value) {
            return {};
        }
        const { customerId, merchantId: mid, userId, name, phone, email } = activeCustomer.value;
        return {
            customerId,
            merchantId: mid,
            userId,
            name,
            ...(phone ? { phone } : {}),
            ...(email ? { email } : {}),
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
