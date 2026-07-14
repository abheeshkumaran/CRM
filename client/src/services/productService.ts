import { api } from './api';

export interface Product {
    id: string;
    name: string;
    sku?: string;
    description?: string;
    basePrice: number;
    currency: string;
    taxRate: number;
    category?: string;
    tags: string[];
    unit: string;
    isActive: boolean;
    isCustom: boolean;
    isOrgProduct: boolean;
    brochureUrl?: string;
    validFrom?: string;
    validUntil?: string;
    imageUrl?: string;
    createdAt: string;
}

export interface CreateProductData {
    name: string;
    sku?: string;
    description?: string;
    basePrice: number;
    currency?: string;
    category?: string;
    unit?: string;
    isActive?: boolean;
    isCustom?: boolean;
    brochureUrl?: string; // Add this line
}

export interface ProductSearchParams {
    search?: string;
    category?: string;
    isActive?: boolean;
    limit?: number;
}

export const getProducts = async (params?: ProductSearchParams) => {
    const response = await api.get('/products', { params });
    return response.data;
};

export const createProduct = async (data: CreateProductData) => {
    const response = await api.post('/products', data);
    return response.data;
};

export const updateProduct = async (id: string, data: Partial<CreateProductData>) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
};

// Upload Brochure
export const uploadBrochure = async (file: File) => {
    // Client-side validation: Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
        throw new Error(`File size exceeds the 5MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB. Please upload a smaller file.`);
    }

    const formData = new FormData();
    formData.append('document', file);

    try {
        const response = await api.post('/upload/document', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error: any) {
        // Handle server-side file size error
        if (error.response?.status === 413 || error.response?.data?.error === 'FILE_TOO_LARGE') {
            throw new Error(error.response?.data?.message || 'File size exceeds the 5MB limit. Please upload a smaller file.');
        }
        throw error;
    }
};

// Generate Share Link
interface ShareConfig {
    youtubeUrl?: string;
    customTitle?: string;
    customDescription?: string;
    leadId?: string;
}

export const generateShareLink = async (productId: string, config?: ShareConfig) => {
    const response = await api.post(`/products/${productId}/share`, config);
    return response.data;
};

export const getShareConfig = async (productId: string) => {
    const response = await api.get(`/products/${productId}/share`);
    return response.data;
};

export const deleteProduct = async (id: string) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
};
