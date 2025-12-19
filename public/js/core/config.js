// Core configuration (ESM)
export const apiBaseUrl = window.location.hostname.includes('app.blockswine.com')
    ? 'https://app.blockswine.com'
    : window.location.hostname.includes('apps.run-on-seenode.com')
    ? 'https://web-sdzlt1djuiql.up-de-fra1-k8s-1.apps.run-on-seenode.com'
    : 'http://localhost:6001';
