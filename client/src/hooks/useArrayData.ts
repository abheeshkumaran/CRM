/**
 * Custom hook to ensure data is always an array
 * Prevents "I.map is not a function" errors
 */
export function useArrayData<T>(data: T[] | undefined | null): T[] {
    if (Array.isArray(data)) {
        return data;
    }
    return [];
}

/**
 * Safely convert any value to an array
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ensureArray<T>(value: any): T[] {
    if (Array.isArray(value)) {
        return value;
    }
    if (value === null || value === undefined) {
        return [];
    }
    // If it's an object with a data property that's an array
    if (typeof value === 'object' && Array.isArray(value.data)) {
        return value.data;
    }
    // If it's an object with an items property that's an array
    if (typeof value === 'object' && Array.isArray(value.items)) {
        return value.items;
    }
    return [];
}
