const HOME_TAB = '/pages/index/home';

function h5ForceHome() {
    if (typeof window === 'undefined') return;
    const { pathname, search, origin } = window.location;
    const target = `${origin}${pathname}${search}#/pages/index/home`;
    if (window.location.href === target) {
        window.location.reload();
        return;
    }
    window.location.href = target;
}

export function goHome() {
    const pages = getCurrentPages();
    const currentRoute = pages[pages.length - 1]?.route;
    if (currentRoute === 'pages/index/home') return;

    // reLaunch is more reliable than switchTab when leaving non-tab pages in H5 preview
    uni.reLaunch({
        url: HOME_TAB,
        fail: () => {
            uni.switchTab({
                url: HOME_TAB,
                fail: () => h5ForceHome(),
            });
        },
    });
}

export function goBackOrHome() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
        uni.navigateBack({
            fail: () => goHome(),
        });
        return;
    }
    goHome();
}
