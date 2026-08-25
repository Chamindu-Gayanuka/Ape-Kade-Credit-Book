export type Role = 'ADMIN' | 'CASHIER';

export interface User {
    id: string;
    _id?: string;
    username: string;
    fullName: string;
    role: Role;
    phone?: string;
    email?: string;
    address?: string;
    bio?: string;
    status: string;
    lastLogin?: string;
    createdAt?: string
}

export interface Customer {
    _id: string;
    customerCode: string;
    name: string;
    phone: string;
    nic: string;
    address: string;
    notes: string;
    status: string;
    createdAt: string;
    outstandingBalance: number
}

export interface Category {
    _id: string;
    name: string;
    status: string
}

export interface Tx {
    _id: string;
    transactionCode: string;
    customerId: any;
    transactionType: string;
    categoryId?: any;
    amount: number;
    description: string;
    paymentMethod?: string;
    referenceNumber?: string;
    status: string;
    createdBy: any;
    createdAt: string;
    previousBalance?: number;
    remainingBalance?: number
}
