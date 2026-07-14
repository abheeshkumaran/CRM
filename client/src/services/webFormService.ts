import { api } from './api';

export interface WebFormField {
    label: string;
    name: string;
    type: string;
    required: boolean;
    placeholder?: string;
    options?: string[];
}

export interface WebForm {
    id: string;
    name: string;
    description?: string;
    fields: WebFormField[]; // JSON definition of fields
    submitAction: string; // 'message', 'redirect'
    submitMessage?: string;
    redirectUrl?: string;
    status: 'active' | 'inactive';
    submissionsCount: number;
    createdAt: string;
}

export interface CreateWebFormData {
    name: string;
    description?: string;
    fields?: WebFormField[];
}

export const getWebForms = async () => {
    const response = await api.get<WebForm[]>('/web-forms');
    return response.data;
};

export const createWebForm = async (data: CreateWebFormData) => {
    const response = await api.post<WebForm>('/web-forms', data);
    return response.data;
};

export const updateWebForm = async (id: string, data: Partial<CreateWebFormData>) => {
    const response = await api.put<WebForm>(`/web-forms/${id}`, data);
    return response.data;
};

export const deleteWebForm = async (id: string) => {
    await api.delete(`/web-forms/${id}`);
};
