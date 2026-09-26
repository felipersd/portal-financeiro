import { isPushEndpoint } from './PushEndpoint';
describe('Push endpoint egress policy', () => {
    it.each([
        'https://fcm.googleapis.com/fcm/send/fixture',
        'https://updates.push.services.mozilla.com/wpush/v2/fixture',
        'https://web.push.apple.com/fixture',
        'https://wns2.notify.windows.com/fixture',
    ])('permits known providers: %s', (endpoint) => expect(isPushEndpoint(endpoint)).toBe(true));
    it.each([
        'http://fcm.googleapis.com/send',
        'https://localhost/push',
        'https://127.0.0.1/push',
        'https://169.254.169.254/latest/meta-data',
        'https://fcm.googleapis.com.evil.test/',
        'https://user:pass@fcm.googleapis.com/send',
        'https://fcm.googleapis.com:9443/send',
        'https://fcm.googleapis.com/send#fragment',
        'file:///etc/passwd',
        'not a url',
    ])('rejects unsafe egress: %s', (endpoint) => expect(isPushEndpoint(endpoint)).toBe(false));
});
