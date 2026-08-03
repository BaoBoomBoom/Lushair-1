/**
 * 获取用户时区
 *
 * 使用 Intl API 获取用户系统的 IANA 时区标识符
 * 默认返回 Asia/Shanghai 作为兜底
 *
 * @returns IANA 时区标识符，如 'Asia/Shanghai', 'America/New_York'
 */
export function getUserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    } catch {
        // 兜底：某些老版本 WebView 可能不支持 Intl API
        return 'America/New_York';
    }
}
