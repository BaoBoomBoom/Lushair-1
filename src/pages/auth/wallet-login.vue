<template>
  <view class="wallet-login-container">
    <view class="login-header">
      <text class="header-title">{{ $t('login.connectWallet') }}</text>
      <text class="header-subtitle">{{ $t('login.walletLogin') }}</text>
    </view>

    <view class="wallet-options">
      <button class="wallet-connect-btn" @tap="connectWallet">
        <image class="wallet-icon" src="/static/images/wallet-icon.png" mode="aspectFit"></image>
        <text class="wallet-text">{{ $t('login.connectWallet') }}</text>
      </button>
    </view>

    <view class="wallet-status" v-if="walletAddress">
      <text class="status-text">Connected Wallet:</text>
      <text class="address-text">{{ formatAddress(walletAddress) }}</text>
    </view>

    <view class="login-status" v-if="loginStatus">
      <text :class="['status-message', loginStatus.success ? 'success' : 'error']">
        {{ loginStatus.message }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { post } from '@/utils/request';
import { useI18n } from 'vue-i18n';

const userStore = useUserStore();
const walletAddress = ref('');
const provider = ref<any>(null);
const loginStatus = ref<{ success: boolean; message: string } | null>(null);
const i18n = useI18n();

// Format wallet address for display (first 6 and last 4 characters)
const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Connect to wallet using just the injected provider (MetaMask)
const connectWallet = async () => {
  try {
    // Reset login status
    loginStatus.value = null;
    
    // Check if MetaMask is installed
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask and try again.');
    }
    
    // Connect to provider
    provider.value = window.ethereum;
    
    // Request accounts
    const accounts = await provider.value.request({ method: 'eth_requestAccounts' });
    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }
    
    walletAddress.value = accounts[0];
    
    // Subscribe to provider events
    provider.value.on("accountsChanged", handleAccountsChanged);
    provider.value.on("chainChanged", handleChainChanged);
    provider.value.on("disconnect", handleDisconnect);

    // Sign message and login
    await signMessageAndLogin(walletAddress.value);
  } catch (error) {
    console.error("Error connecting to wallet:", error);
    loginStatus.value = {
      success: false,
      message: i18n.t('login.connectFailed')
    };
  }
};

// Handle account change events
const handleAccountsChanged = (accounts: string[]) => {
  if (accounts.length === 0) {
    // User disconnected their wallet
    disconnectWallet();
  } else {
    // User switched accounts
    walletAddress.value = accounts[0];
    // Re-login with new account
    signMessageAndLogin(accounts[0]);
  }
};

// Handle chain change events
const handleChainChanged = () => {
  // Refresh the page when chain changes
  window.location.reload();
};

// Handle disconnect events
const handleDisconnect = () => {
  disconnectWallet();
};

// Disconnect wallet
const disconnectWallet = () => {
  if (provider.value) {
    // Remove event listeners
    provider.value.removeListener("accountsChanged", handleAccountsChanged);
    provider.value.removeListener("chainChanged", handleChainChanged);
    provider.value.removeListener("disconnect", handleDisconnect);
  }
  
  walletAddress.value = '';
  provider.value = null;
  loginStatus.value = null;
};

// Clean up on component unmount
onUnmounted(() => {
  disconnectWallet();
});

// Sign message and login
const signMessageAndLogin = async (address: string) => {
  try {
    // Create message with timestamp to prevent replay attacks
    const timestamp = Date.now();
    const message = `Sign this message to verify you own this wallet and login to Lushair.\n\nNonce: ${timestamp}`;
    
    loginStatus.value = {
      success: false,
      message: i18n.t('login.signMessage')
    };
    
    // Request signature from user using native ethereum API
    const signature = await provider.value.request({
      method: 'personal_sign',
      params: [message, address]
    });
    
    // Call login API with signature
    const loginData = {
      channel: "ETHEREUM",
      channelCode: signature,
      channelMessage: message,
      channelAddress: address
    };
    
    loginStatus.value = {
      success: false,
      message: i18n.t('login.loggingIn')
    };
    
    const response = await post('user/sso', loginData) as { userId?: string };
    
    // Handle successful login
    if (response && response.userId) {
      loginStatus.value = {
        success: true,
        message: i18n.t('login.loginSuccess')
      };
      
      // Update user store with the returned user info
      await userStore.fetchUserInfo(response.userId);
      
      // Notify app about successful login
      notifyAppAboutLogin(response.userId);
      
      // Redirect to home page after short delay
      setTimeout(() => {
        uni.navigateTo({
          url: '/pages/index/home'
        });
      }, 1000);
    } else {
      loginStatus.value = {
        success: false,
        message: i18n.t('login.loginFailed')
      };
    }
  } catch (error) {
    console.error("Error during login:", error);
    loginStatus.value = {
      success: false,
      message: i18n.t('login.authFailed')
    };
  }
};

// Notify the native app about successful login
const notifyAppAboutLogin = (userId: string) => {
  try {
    const u = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(u) ||
                  (/Macintosh/.test(u) && 'ontouchend' in document);
    const isAndroid = u.indexOf('Android') > -1 || u.indexOf('Adr') > -1;
    
    if (isiOS && window.webkit && window.webkit.messageHandlers) {
      window.webkit.messageHandlers.walletLoginSuccess.postMessage({
        action: 'walletLoginSuccess',
        userId: userId
      });
      console.log('Notified iOS app about successful wallet login');
    } else if (isAndroid && window.android) {
      window.android.walletLoginSuccess(userId);
      console.log('Notified Android app about successful wallet login');
    } else {
      console.log('Not in native app environment, skipping notification');
    }
  } catch (error) {
    console.error('Failed to notify app about login:', error);
  }
};

// Declare window interface with native app communication methods
declare global {
  interface Window {
    ethereum?: any;
    webkit?: {
      messageHandlers: {
        walletLoginSuccess: {
          postMessage: (message: any) => void;
        };
        [key: string]: any;
      };
    };
    android?: {
      walletLoginSuccess: (userId: string) => void;
      [key: string]: any;
    };
  }
}
</script>

<style>
.wallet-login-container {
  width: 100%;
  min-height: 100vh;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #f8f9fa;
}

.login-header {
  margin-bottom: 60px;
  text-align: center;
  display: flex;
  flex-direction: column;
}

.header-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.header-subtitle {
  font-size: 16px;
  color: #666;
}

.wallet-options {
  width: 100%;
  max-width: 320px;
  margin-bottom: 40px;
}

.wallet-connect-btn {
  width: 100%;
  height: 60px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: #8b5cf6; /* Purple color similar to your passport UI */
  border-radius: 12px;
  padding: 0 20px;
  margin-bottom: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.wallet-icon {
  width: 24px;
  height: 24px;
  margin-right: 12px;
}

.wallet-text {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.wallet-status {
  margin-top: 20px;
  text-align: center;
  padding: 10px 20px;
  background-color: rgba(139, 92, 246, 0.1);
  border-radius: 8px;
  width: 100%;
  max-width: 320px;
}

.status-text {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
  display: block;
}

.address-text {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  word-break: break-all;
}

.login-status {
  margin-top: 30px;
  width: 100%;
  max-width: 320px;
  text-align: center;
}

.status-message {
  font-size: 16px;
  padding: 10px 15px;
  border-radius: 8px;
  display: inline-block;
}

.success {
  color: #10b981;
  background-color: rgba(16, 185, 129, 0.1);
}

.error {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}
</style> 