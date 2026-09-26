export function isPushEndpoint(value: string): boolean {
    try {
        const url = new URL(value);
        const allowed =
            url.hostname === 'fcm.googleapis.com' ||
            url.hostname === 'updates.push.services.mozilla.com' ||
            url.hostname.endsWith('.push.services.mozilla.com') ||
            url.hostname === 'web.push.apple.com' ||
            url.hostname.endsWith('.notify.windows.com');
        return (
            allowed && url.protocol === 'https:' && !url.port && !url.username && !url.password && !url.hash
        );
    } catch {
        return false;
    }
}
