import { api } from './api';

export interface Quote {
    id: string;
    quoteNumber: string;
    title: string;
    description?: string;
    opportunity?: { id: string; name: string };
    account?: { id: string; name: string };
    contact?: { id: string; firstName: string; lastName: string };
    lineItems: {
        product?: string;
        productName?: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        total: number;
    }[];
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    grandTotal: number;
    currency: string;
    validUntil: string;
    status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'revised';
    createdAt: string;
}

export interface LineItem {
    product?: string;
    productName?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
}

export interface CreateQuoteData {
    title: string;
    description?: string;
    opportunity?: string;
    account?: string;
    contact?: string;
    lineItems: LineItem[];
    subtotal: number;
    grandTotal: number;
    validUntil: string;
    isEMIEnabled?: boolean;
}

export interface QuoteSearchParams {
    status?: string;
    search?: string;
}

export const getQuotes = async (params?: QuoteSearchParams) => {
    const response = await api.get('/quotes', { params });
    return response.data;
};

export const createQuote = async (data: CreateQuoteData) => {
    const response = await api.post('/quotes', data);
    return response.data;
};

export const updateQuote = async (id: string, data: Partial<CreateQuoteData>) => {
    const response = await api.put(`/quotes/${id}`, data);
    return response.data;
};

export const deleteQuote = async (id: string) => {
    const response = await api.delete(`/quotes/${id}`);
    return response.data;
};
