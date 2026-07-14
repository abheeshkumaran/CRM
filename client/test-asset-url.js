// Quick test to verify getAssetUrl logic
// Run with: node test-asset-url.js

const getAssetUrl = (path, isDev) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    // In development, always use localhost to avoid React Router conflicts
    if (isDev) {
        return `http://localhost:5001${path}`;
    }

    // In production, construct full URL to backend
    const backendUrl = 'https://dad-backend.onrender.com';
    return `${backendUrl}${path}`;
}

// Test cases
console.log('Development mode:');
console.log('  Input: /uploads/documents/file.pdf');
console.log('  Output:', getAssetUrl('/uploads/documents/file.pdf', true));
console.log('  Expected: http://localhost:5001/uploads/documents/file.pdf');
console.log('');

console.log('Production mode:');
console.log('  Input: /uploads/documents/file.pdf');
console.log('  Output:', getAssetUrl('/uploads/documents/file.pdf', false));
console.log('  Expected: https://dad-backend.onrender.com/uploads/documents/file.pdf');
console.log('');

console.log('Already absolute URL:');
console.log('  Input: https://example.com/file.pdf');
console.log('  Output:', getAssetUrl('https://example.com/file.pdf', true));
console.log('  Expected: https://example.com/file.pdf');
