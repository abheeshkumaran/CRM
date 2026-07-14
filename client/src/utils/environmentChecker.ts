// Environment checker utility
// Helps identify which environment the user is connected to

export interface EnvironmentInfo {
    environment: 'production' | 'local' | 'unknown';
    frontendUrl: string;
    backendUrl: string;
    isProduction: boolean;
    isLocal: boolean;
}

export function getEnvironmentInfo(): EnvironmentInfo {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const protocol = window.location.protocol;

    let environment: 'production' | 'local' | 'unknown' = 'unknown';
    let backendUrl = '';
    let isProduction = false;
    let isLocal = false;

    // Check if production
    if (hostname.includes('vercel.app') || hostname.includes('dad-frontend') || hostname === '65.2.29.78' || hostname.includes('pypecrm.com')) {
        environment = 'production';
        backendUrl = 'https://pypecrm.com';
        isProduction = true;
    }
    // Check if local
    else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        environment = 'local';
        backendUrl = 'http://localhost:5001';
        isLocal = true;
    }

    return {
        environment,
        frontendUrl: `${protocol}//${hostname}${port ? ':' + port : ''}`,
        backendUrl,
        isProduction,
        isLocal
    };
}

export function logEnvironmentInfo() {
    const info = getEnvironmentInfo();
    // console.log('🌍 Environment Info:', {
    //     environment: info.environment,
    //     frontend: info.frontendUrl,
    //     backend: info.backendUrl,
    //     isProduction: info.isProduction,
    //     isLocal: info.isLocal
    // });
    return info;
}

export function warnIfLocalEnvironment() {
    const info = getEnvironmentInfo();
    if (info.isLocal) {
        console.warn(
            '⚠️ WARNING: You are using LOCAL DEVELOPMENT environment!\n' +
            'Data is stored in a LOCAL DATABASE and will NOT sync with other PCs.\n' +
            'For consistent data across all devices, use: https://dad-frontend-psi.vercel.app'
        );
    }
}
