import { api } from './api';

export interface LandingPage {
    id: string;
    name: string;
    slug: string;
    content?: Record<string, unknown>;
    html?: string;
    status: 'draft' | 'published' | 'archived';
    publishedAt?: string;
    views: number;
    conversions: number;
    createdAt: string;
}

export interface CreateLandingPageData {
    name: string;
    slug: string;
    content?: Record<string, unknown>;
    html?: string;
    status?: 'draft' | 'published' | 'archived';
}

export const getLandingPages = async () => {
    const response = await api.get<LandingPage[]>('/landing-pages');
    return response.data;
};

export const createLandingPage = async (data: CreateLandingPageData) => {
    const response = await api.post<LandingPage>('/landing-pages', data);
    return response.data;
};

export const updateLandingPage = async (id: string, data: Partial<CreateLandingPageData>) => {
    const response = await api.put<LandingPage>(`/landing-pages/${id}`, data);
    return response.data;
};

export const deleteLandingPage = async (id: string) => {
    await api.delete(`/landing-pages/${id}`);
};
