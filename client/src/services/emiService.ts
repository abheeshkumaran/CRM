import { api } from './api';

export interface EMIInstallment {
    id: string;
    installmentNumber: number;
    amount: number;
    dueDate: string;
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    paidDate?: string;
    notes?: string;
}

export interface EMISchedule {
    id: string;
    opportunityId: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    status: 'active' | 'completed' | 'cancelled';
    installments: EMIInstallment[];
    createdAt: string;
    updatedAt: string;
}

export interface ConvertToEMIData {
    installments: Array<{
        dueDate: string;
        amount: number;
    }>;
}

export const getEMISchedule = async (opportunityId: string): Promise<EMISchedule | null> => {
    try {
        const response = await api.get(`/opportunities/${opportunityId}/emi`);
        return response.data?.emiSchedule || null;
    } catch (error: unknown) {
        const err = error as { response?: { status?: number } };
        if (err.response?.status === 404) return null;
        throw error;
    }
};

export const convertToEMI = async (opportunityId: string, data: ConvertToEMIData) => {
    const response = await api.post(`/opportunities/${opportunityId}/emi/convert`, data);
    return response.data;
};

export const markInstallmentPaid = async (installmentId: string, data?: { paymentDate?: string; notes?: string }) => {
    const response = await api.post(`/emi/installments/${installmentId}/pay`, data || {});
    return response.data;
};

export const updateInstallment = async (installmentId: string, data: { dueDate?: string; amount?: number }) => {
    const response = await api.put(`/emi/installments/${installmentId}`, data);
    return response.data;
};

export const deleteInstallment = async (installmentId: string) => {
    const response = await api.delete(`/emi/installments/${installmentId}`);
    return response.data;
};
