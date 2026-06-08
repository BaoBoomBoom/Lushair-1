<template>
  <view class="wallet-login-button-container">
    <button class="wallet-login-btn" @tap="goToWalletLogin">
      <image class="wallet-icon" src="/static/images/wallet-icon.png" mode="aspectFit"></image>
      <text>{{ $t('login.walletLogin') }}</text>
    </button>
  </view>
</template>

<script setup lang="ts">
const goToWalletLogin = () => {
  uni.navigateTo({
    url: '/pages/auth/wallet-login'
  });
};
</script>

<style>
.wallet-login-button-container {
  margin: 10px 0;
}

.wallet-login-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: #8b5cf6;
  color: white;
  padding: 12px 20px;
  border-radius: 10px;
  border: none;
  font-size: 16px;
  font-weight: 500;
}

.wallet-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
}
</style> 