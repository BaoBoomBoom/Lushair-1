<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import MainTabLayout from '@/components/layout/MainTabLayout.vue';
import TablerIcon from '@/components/icons/TablerIcon.vue';
import ScanAnalyzingOverlay from '@/components/scan/ScanAnalyzingOverlay.vue';
import { runScanAction, type ScanActionType } from '@/composables/useScanActions';
import { analyzeSelfieImage } from '@/composables/useSelfieScanAnalysis';
import { useMerchantScanCustomer, type MerchantContactType } from '@/composables/useMerchantScanCustomer';
import { useUserStore } from '@/stores/userStore';
import { getApiUrl } from '@/utils/apiHelper';

const { t } = useI18n();
const userStore = useUserStore();
const {
    isMerchant,
    hasActiveCustomer,
    activeCustomer,
    isSaving: isSavingCustomer,
    registerCustomer,
    clearCustomer,
    getScanUserId,
} = useMerchantScanCustomer();

const customerName = ref('');
const customerContactType = ref<MerchantContactType>('phone');
const customerPhone = ref('');
const customerEmail = ref('');

type ScanOptionId = 'phone' | 'lushairOne' | 'advanced';
type SelfieAngleId = 'front' | 'crown' | 'back' | 'sideFront';

const angleOptions: { id: SelfieAngleId; labelKey: string }[] = [
    { id: 'front', labelKey: 'scan.angleFront' },
    { id: 'crown', labelKey: 'scan.angleCrown' },
    { id: 'back', labelKey: 'scan.angleBack' },
    { id: 'sideFront', labelKey: 'scan.angleSideFront' },
];

const options: { id: ScanOptionId; labelKey: string; descKey: string }[] = [
    { id: 'phone', labelKey: 'scan.selfie', descKey: 'scan.selfieDesc' },
    { id: 'lushairOne', labelKey: 'scan.lushairOne', descKey: 'scan.lushairOneDesc' },
    { id: 'advanced', labelKey: 'scan.lushairPro', descKey: 'scan.lushairProDesc' },
];

const selected = ref<ScanOptionId>('phone');
const activeAngle = ref<SelfieAngleId>('front');
const angleImages = ref<Record<SelfieAngleId, { preview: string; url: string }>>({
    front: { preview: '', url: '' },
    crown: { preview: '', url: '' },
    back: { preview: '', url: '' },
    sideFront: { preview: '', url: '' },
});
const uploadingAngles = ref<Record<SelfieAngleId, boolean>>({
    front: false,
    crown: false,
    back: false,
    sideFront: false,
});
const isAnalyzing = ref(false);

const selectedDescKey = computed(() => options.find((option) => option.id === selected.value)?.descKey || '');
const currentAnglePreview = computed(() => angleImages.value[activeAngle.value].preview);
const currentAngleUrl = computed(() => angleImages.value[activeAngle.value].url);
const hasCurrentPreview = computed(() => !!currentAnglePreview.value);
const allAnglesUploaded = computed(() => angleOptions.every((angle) => !!angleImages.value[angle.id].url));
const isAnyUploading = computed(() => angleOptions.some((angle) => uploadingAngles.value[angle.id]));
const isCurrentUploading = computed(() => uploadingAngles.value[activeAngle.value]);
const isCurrentUploadPending = computed(
    () => !!angleImages.value[activeAngle.value].preview && !angleImages.value[activeAngle.value].url,
);
const captureLabel = computed(() => {
    if (selected.value !== 'phone') return t('scan.capture');
    if (isAnyUploading.value) return t('scan.uploadingWait');
    if (allAnglesUploaded.value) return t('scan.analyze');
    return t('scan.capture');
});
const isCaptureDisabled = computed(() => isAnalyzing.value || isAnyUploading.value || isSavingCustomer.value);
const merchantBlocksScan = computed(() => isMerchant.value && !hasActiveCustomer.value);

function ensureMerchantCustomerReady(): boolean {
    if (!merchantBlocksScan.value) return true;
    uni.showToast({ title: t('scan.merchantCustomerRequired'), icon: 'none' });
    return false;
}

async function saveMerchantCustomer() {
    if (!customerName.value.trim()) {
        uni.showToast({ title: t('scan.merchantCustomerNameRequired'), icon: 'none' });
        return;
    }
    if (customerContactType.value === 'phone' && !customerPhone.value.trim()) {
        uni.showToast({ title: t('scan.merchantCustomerContactRequired'), icon: 'none' });
        return;
    }
    if (customerContactType.value === 'email' && !customerEmail.value.trim()) {
        uni.showToast({ title: t('scan.merchantCustomerContactRequired'), icon: 'none' });
        return;
    }

    try {
        await registerCustomer({
            name: customerName.value,
            contactType: customerContactType.value,
            phone: customerPhone.value,
            email: customerEmail.value,
        });
        uni.showToast({ title: t('scan.merchantCustomerSaved'), icon: 'success' });
    } catch (error) {
        console.error('[scan] merchant customer save failed', error);
        uni.showToast({ title: t('scan.merchantCustomerSaveFailed'), icon: 'none' });
    }
}

function resetMerchantCustomerForm() {
    clearCustomer();
    customerName.value = '';
    customerPhone.value = '';
    customerEmail.value = '';
    customerContactType.value = 'phone';
}

function selectOption(id: ScanOptionId) {
    selected.value = id;
}

async function launchNativeScan(action: ScanActionType) {
    if (!ensureMerchantCustomerReady()) return;
    const success = await runScanAction(action);
    if (!success) {
        uni.showToast({
            title: t('scan.nativeAppRequired'),
            icon: 'none',
        });
    }
}

function advanceToNextAngle(afterAngleId: SelfieAngleId) {
    const currentIndex = angleOptions.findIndex((angle) => angle.id === afterAngleId);
    const nextAngle = angleOptions.slice(currentIndex + 1).find((angle) => !angleImages.value[angle.id].url);
    if (nextAngle) {
        activeAngle.value = nextAngle.id;
    }
}

async function uploadImage(tempFilePath: string, angleId: SelfieAngleId) {
    uploadingAngles.value[angleId] = true;
    angleImages.value[angleId].url = '';
    uni.uploadFile({
        url: getApiUrl('file/uploadSelfieNet'),
        filePath: tempFilePath,
        name: 'file',
        formData: {
            userId: getScanUserId() || '',
            type: userStore.userInfo.type || '0',
            pos: angleId,
        },
        success: (uploadRes) => {
            try {
                const data = JSON.parse(uploadRes.data);
                if (data.code === 200 && data.data) {
                    angleImages.value[angleId] = {
                        preview: data.data,
                        url: data.data,
                    };
                    advanceToNextAngle(angleId);
                } else {
                    uni.showToast({ title: data.msg || t('scan.uploadFailed'), icon: 'none' });
                }
            } catch {
                uni.showToast({ title: t('scan.uploadFailed'), icon: 'none' });
            }
        },
        fail: () => uni.showToast({ title: t('scan.uploadFailed'), icon: 'none' }),
        complete: () => {
            uploadingAngles.value[angleId] = false;
        },
    });
}

function choosePhoneImage(angleId: SelfieAngleId = activeAngle.value) {
    if (!ensureMerchantCustomerReady()) return;
    activeAngle.value = angleId;
    uni.chooseImage({
        count: 1,
        sourceType: ['camera', 'album'],
        success: (res) => {
            const tempFilePath = res.tempFilePaths[0];
            angleImages.value[angleId].preview = tempFilePath;
            uploadImage(tempFilePath, angleId);
        },
    });
}

async function runPhoneAnalysis(imageUrl: string) {
    isAnalyzing.value = true;
    try {
        const result = await analyzeSelfieImage(imageUrl);
        const anglePayload = encodeURIComponent(JSON.stringify({
            front: angleImages.value.front.url,
            crown: angleImages.value.crown.url,
            back: angleImages.value.back.url,
            sideFront: angleImages.value.sideFront.url,
        }));
        angleOptions.forEach((angle) => {
            angleImages.value[angle.id] = { preview: '', url: '' };
        });
        uni.navigateTo({
            url: `/pages/questionnaire/index?position=${encodeURIComponent(result.position)}&stage=${result.stage}&image=${encodeURIComponent(result.imageUrl)}&angles=${anglePayload}`,
        });
    } catch (error) {
        console.error('[scan] analysis failed', error);
        uni.showToast({ title: t('scan.analysisFailed'), icon: 'none' });
    } finally {
        isAnalyzing.value = false;
    }
}

async function captureScan() {
    if (!ensureMerchantCustomerReady()) return;

    if (selected.value !== 'phone') {
        launchNativeScan(selected.value);
        return;
    }

    if (isAnyUploading.value) {
        uni.showToast({ title: t('scan.uploadingWait'), icon: 'none' });
        return;
    }

    if (allAnglesUploaded.value) {
        await runPhoneAnalysis(angleImages.value.front.url);
        return;
    }

    const nextMissing = angleOptions.find((angle) => !angleImages.value[angle.id].preview);
    if (nextMissing) {
        choosePhoneImage(nextMissing.id);
        return;
    }

    uni.showToast({ title: t('scan.angleRequired'), icon: 'none' });
}

function clearAngle(angleId: SelfieAngleId) {
    uploadingAngles.value[angleId] = false;
    angleImages.value[angleId] = { preview: '', url: '' };
}

function selectAngle(angleId: SelfieAngleId) {
    activeAngle.value = angleId;
}
</script>

<template>
    <MainTabLayout fill-screen fixed-header>
        <view class="scan-scroll">
            <view class="scan-shell">
                <text class="shell-ptitle">{{ t('scan.title') }}</text>

                <view v-if="isMerchant" class="shell-card shell-card-compact merchant-customer-card">
                    <text class="shell-label">{{ t('scan.merchantCustomerTitle') }}</text>
                    <text class="scan-desc">{{ t('scan.merchantCustomerSubtitle') }}</text>

                    <template v-if="!hasActiveCustomer">
                        <view class="shell-form-field">
                            <text class="shell-form-label">{{ t('scan.merchantCustomerName') }}</text>
                            <input
                                v-model="customerName"
                                class="shell-input"
                                type="text"
                                :placeholder="t('scan.merchantCustomerNamePlaceholder')"
                            />
                        </view>

                        <view class="merchant-contact-toggle">
                            <view
                                class="merchant-contact-chip"
                                :class="{ on: customerContactType === 'phone' }"
                                @click="customerContactType = 'phone'"
                            >
                                {{ t('scan.merchantCustomerContactPhone') }}
                            </view>
                            <view
                                class="merchant-contact-chip"
                                :class="{ on: customerContactType === 'email' }"
                                @click="customerContactType = 'email'"
                            >
                                {{ t('scan.merchantCustomerContactEmail') }}
                            </view>
                        </view>

                        <view class="shell-form-field">
                            <text class="shell-form-label">
                                {{ customerContactType === 'phone' ? t('scan.merchantCustomerPhone') : t('scan.merchantCustomerEmail') }}
                            </text>
                            <input
                                v-if="customerContactType === 'phone'"
                                v-model="customerPhone"
                                class="shell-input"
                                type="tel"
                                inputmode="tel"
                            />
                            <input
                                v-else
                                v-model="customerEmail"
                                class="shell-input"
                                type="email"
                                inputmode="email"
                            />
                        </view>

                        <button class="shell-btn merchant-customer-btn" :disabled="isSavingCustomer" @click="saveMerchantCustomer">
                            {{ t('scan.merchantCustomerSave') }}
                        </button>
                    </template>

                    <view v-else class="merchant-customer-active">
                        <text class="merchant-customer-active-label">
                            {{ t('scan.merchantCustomerActive', { name: activeCustomer?.name || '' }) }}
                        </text>
                        <text v-if="activeCustomer?.phone" class="merchant-customer-active-meta">{{ activeCustomer.phone }}</text>
                        <text v-else-if="activeCustomer?.email" class="merchant-customer-active-meta">{{ activeCustomer.email }}</text>
                        <text class="merchant-customer-change" @click="resetMerchantCustomerForm">
                            {{ t('scan.merchantCustomerChange') }}
                        </text>
                    </view>
                </view>

                <view class="shell-card shell-card-compact">
                    <text class="shell-label">{{ t('scan.scanType') }}</text>
                    <view class="shell-scan-types">
                        <view
                            v-for="opt in options"
                            :key="opt.id"
                            class="shell-scan-chip"
                            :class="{ on: selected === opt.id }"
                            @click="selectOption(opt.id)"
                        >
                            {{ t(opt.labelKey) }}
                        </view>
                    </view>
                    <text class="scan-desc">{{ t(selectedDescKey) }}</text>
                </view>

                <view v-if="selected === 'phone'" class="shell-card shell-card-compact scan-angles-card">
                    <text class="shell-label">{{ t('scan.anglesTitle') }}</text>
                    <text class="scan-desc">{{ t('scan.anglesSubtitle') }}</text>
                    <view class="scan-angle-grid">
                        <view
                            v-for="angle in angleOptions"
                            :key="angle.id"
                            class="scan-angle-tile"
                            :class="{
                                on: activeAngle === angle.id,
                                done: !!angleImages[angle.id].url,
                                uploading: uploadingAngles[angle.id],
                            }"
                            @click="selectAngle(angle.id)"
                        >
                            <image
                                v-if="angleImages[angle.id].preview"
                                :src="angleImages[angle.id].preview"
                                class="scan-angle-thumb"
                                mode="aspectFill"
                            />
                            <text v-else class="scan-angle-label">{{ t(angle.labelKey) }}</text>
                            <view v-if="uploadingAngles[angle.id]" class="scan-angle-uploading">
                                <text>{{ t('scan.uploading') }}</text>
                            </view>
                        </view>
                    </view>
                    <text v-if="isAnyUploading" class="scan-upload-hint">{{ t('scan.uploadingHint') }}</text>
                    <text v-else-if="allAnglesUploaded" class="scan-all-ready">{{ t('scan.allAnglesReady') }}</text>
                </view>

                <view
                    class="shell-cambox"
                    :class="{ 'shell-cambox--preview': selected === 'phone' && hasCurrentPreview }"
                    @click="selected === 'phone' ? choosePhoneImage(activeAngle) : undefined"
                >
                    <image
                        v-if="selected === 'phone' && hasCurrentPreview"
                        :src="currentAnglePreview"
                        class="scan-preview-image"
                        mode="aspectFill"
                    />
                    <view v-if="selected === 'phone' && hasCurrentPreview" class="scan-preview-actions">
                        <view class="scan-preview-badge" @click.stop="clearAngle(activeAngle)">
                            <TablerIcon name="x" :size="12" color="#1A1228" />
                        </view>
                        <text v-if="isCurrentUploading || isCurrentUploadPending" class="scan-preview-status">
                            {{ t('scan.uploading') }}
                        </text>
                        <text v-else-if="currentAngleUrl" class="scan-preview-status scan-preview-status--ready">
                            {{ t('scan.previewReady') }}
                        </text>
                    </view>
                    <template v-if="selected !== 'phone' || !hasCurrentPreview">
                        <TablerIcon name="camera" :size="34" color="#6B21C8" />
                        <text class="cam-hint">{{ t('scan.positionHint') }}</text>
                        <text v-if="selected === 'phone'" class="cam-upload-hint">{{ t('scan.tapToUpload') }}</text>
                    </template>
                </view>

                <view class="status-row">
                    <view class="shell-pill shell-pill-g pill-with-icon">
                        <TablerIcon name="check" :size="11" color="#0e9e62" />
                        <text>{{ t('scan.focus') }}</text>
                    </view>
                    <view class="shell-pill shell-pill-g pill-with-icon">
                        <TablerIcon name="check" :size="11" color="#0e9e62" />
                        <text>{{ t('scan.lighting') }}</text>
                    </view>
                    <view class="shell-pill" :class="allAnglesUploaded ? 'shell-pill-g' : isAnyUploading ? 'shell-pill-w' : 'shell-pill-w'">
                        <TablerIcon
                            :name="allAnglesUploaded ? 'check' : isAnyUploading ? 'clock' : 'x'"
                            :size="11"
                            :color="allAnglesUploaded ? '#0e9e62' : '#c2610a'"
                        />
                        <text>{{ isAnyUploading ? t('scan.uploading') : t('scan.angle') }}</text>
                    </view>
                </view>

                <button
                    class="shell-btn"
                    :class="{ 'shell-btn--muted': (isCaptureDisabled || merchantBlocksScan) && selected === 'phone' }"
                    :disabled="isCaptureDisabled || merchantBlocksScan"
                    @click="captureScan"
                >
                    {{ captureLabel }}
                </button>

                <view class="extra-actions">
                    <text class="extra-link" @click="runScanAction('device')">{{ t('home.getDevice') }}</text>
                </view>
            </view>
        </view>
    </MainTabLayout>

    <ScanAnalyzingOverlay :visible="isAnalyzing" />
</template>

<style scoped lang="scss">
@import '@/styles/app-shell.scss';

.scan-shell {
    padding: 18px 16px calc(24px + env(safe-area-inset-bottom));
    box-sizing: border-box;
}

.scan-desc {
    display: block;
    font-size: 12px;
    color: #8a82a0;
    margin-top: 10px;
    line-height: 1.45;
}

.scan-angles-card {
    margin-bottom: 12px;
}

.scan-angle-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 12px;
}

.scan-angle-tile {
    position: relative;
    aspect-ratio: 1;
    border-radius: 12px;
    border: 1.5px dashed #d8d2ea;
    background: #faf8ff;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    &.on {
        border-color: #6b21c8;
    }

    &.done {
        border-style: solid;
    }

    &.uploading {
        border-color: #c2610a;
        border-style: solid;
    }
}

.scan-angle-uploading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(26, 18, 40, 0.48);
    padding: 4px;

    text {
        font-size: 9px;
        font-weight: 600;
        color: #fff;
        text-align: center;
        line-height: 1.2;
    }
}

.scan-upload-hint {
    display: block;
    margin-top: 10px;
    font-size: 12px;
    color: #c2610a;
    font-weight: 600;
    line-height: 1.4;
}

.scan-angle-thumb {
    width: 100%;
    height: 100%;
}

.scan-angle-label {
    font-size: 10px;
    color: #6b21c8;
    text-align: center;
    padding: 4px;
    line-height: 1.2;
}

.scan-all-ready {
    display: block;
    margin-top: 10px;
    font-size: 12px;
    color: #0e9e62;
    font-weight: 600;
}

.scan-preview-image {
    width: 100%;
    height: 240px;
    display: block;
    border-radius: 12px;
}

.scan-preview-actions {
    position: absolute;
    top: 10px;
    right: 10px;
    left: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    pointer-events: none;
}

.scan-preview-badge {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.92);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    box-shadow: 0 2px 8px rgba(20, 18, 45, 0.12);
}

.scan-preview-status {
    font-size: 11px;
    font-weight: 600;
    color: #fff;
    background: rgba(26, 18, 40, 0.55);
    padding: 4px 10px;
    border-radius: 999px;

    &--ready {
        background: rgba(15, 107, 73, 0.82);
    }
}

.cam-hint {
    font-size: 12px;
    color: #8a82a0;
    margin-top: 10px;
    line-height: 1.4;
}

.cam-upload-hint {
    margin-top: 6px;
    font-size: 12px;
    color: #6b21c8;
    font-weight: 600;
}

.status-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
}

.pill-with-icon {
    display: inline-flex;
    align-items: center;
    gap: 3px;
}

.extra-actions {
    margin-top: 16px;
    text-align: center;
    padding-bottom: 8px;
}

.extra-link {
    font-size: 13px;
    color: #6b21c8;
    font-weight: 600;
}

.shell-btn--muted {
    opacity: 0.72;
}

.shell-cambox {
    position: relative;
    overflow: hidden;
}

.merchant-customer-card {
    margin-bottom: 12px;
}

.merchant-contact-toggle {
    display: flex;
    gap: 8px;
    margin: 12px 0;
}

.merchant-contact-chip {
    flex: 1;
    text-align: center;
    padding: 10px 8px;
    border-radius: 12px;
    border: 1.5px solid #e8e4f4;
    background: #faf8ff;
    font-size: 13px;
    font-weight: 600;
    color: #6b21c8;

    &.on {
        border-color: #6b21c8;
        background: rgba(107, 33, 200, 0.08);
    }
}

.merchant-customer-btn {
    margin-top: 4px;
}

.merchant-customer-active {
    margin-top: 12px;
    padding: 12px;
    border-radius: 12px;
    background: rgba(14, 158, 98, 0.08);
    border: 1px solid rgba(14, 158, 98, 0.18);
}

.merchant-customer-active-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #0e6b49;
}

.merchant-customer-active-meta {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: #4a4060;
}

.merchant-customer-change {
    display: inline-block;
    margin-top: 10px;
    font-size: 13px;
    font-weight: 600;
    color: #6b21c8;
}
</style>
