
interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FB: any;
    fbAsyncInit: () => void;
    checkLoginState: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let FB: any;
