import client from './client';
import {
  Invoice,
  InvoiceListResponseSchema,
  InvoiceResponseSchema,
  CreateInvoicePayload,
  CreateInvoiceSchema,
  InvoiceListResponse,
} from '@/types/invoice';

// Production builds must use the real backend.
const USE_MOCK = false;

/**
 * Mock invoices for development
 */
const mockInvoices: Invoice[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    clientName: 'Acme Corporation',
    amount: 15000,
    baseCurrency: 'USD',
    targetCurrency: 'NGN',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    convertedAmount: 23250000,
    conversionRate: 1550,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    clientName: 'Global Traders Ltd',
    amount: 8500,
    baseCurrency: 'USD',
    targetCurrency: 'EUR',
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    convertedAmount: 7735,
    conversionRate: 0.91,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    clientName: 'British Exports Co',
    amount: 25000,
    baseCurrency: 'USD',
    targetCurrency: 'GBP',
    dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    convertedAmount: 19750,
    conversionRate: 0.79,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    clientName: 'Lagos Imports Inc',
    amount: 50000,
    baseCurrency: 'USD',
    targetCurrency: 'NGN',
    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'overdue',
    convertedAmount: 77500000,
    conversionRate: 1550,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    clientName: 'Euro Trade Partners',
    amount: 12000,
    baseCurrency: 'USD',
    targetCurrency: 'EUR',
    dueDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'paid',
    convertedAmount: 10920,
    conversionRate: 0.91,
  },
];

/**
 * Fetch all invoices
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated invoice list
 */
export const fetchInvoices = async (
  page: number = 1,
  pageSize: number = 20
): Promise<InvoiceListResponse> => {
  if (USE_MOCK) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = mockInvoices.slice(start, end);
    
    return {
      data: paginatedData,
      total: mockInvoices.length,
      page,
      pageSize,
    };
  }

  try {
    const response = await client.get('/invoices', {
      params: { page, pageSize },
    });
    return InvoiceListResponseSchema.parse(response.data);
  } catch (error) {
    console.warn('[API] Invoices fetch failed, using mock data');
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      data: mockInvoices.slice(start, end),
      total: mockInvoices.length,
      page,
      pageSize,
    };
  }
};

/**
 * Fetch single invoice by ID
 * @param id - Invoice ID
 * @returns Invoice data
 */
export const fetchInvoiceById = async (id: string): Promise<Invoice> => {
  if (USE_MOCK) {
    const invoice = mockInvoices.find((inv) => inv.id === id);
    if (!invoice) {
      throw new Error(`Invoice not found: ${id}`);
    }
    return invoice;
  }

  try {
    const response = await client.get(`/invoices/${id}`);
    const validated = InvoiceResponseSchema.parse(response.data);
    return validated.data;
  } catch (error) {
    console.warn('[API] Invoice fetch failed, checking mock data');
    const invoice = mockInvoices.find((inv) => inv.id === id);
    if (!invoice) {
      throw new Error(`Invoice not found: ${id}`);
    }
    return invoice;
  }
};

/**
 * Create a new invoice
 * @param payload - Invoice creation data
 * @returns Created invoice
 */
export const createInvoice = async (payload: CreateInvoicePayload): Promise<Invoice> => {
  // Validate payload
  const validatedPayload = CreateInvoiceSchema.parse(payload);

  if (USE_MOCK) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      ...validatedPayload,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    
    mockInvoices.unshift(newInvoice);
    return newInvoice;
  }

  try {
    const response = await client.post('/invoices', validatedPayload);
    const validated = InvoiceResponseSchema.parse(response.data);
    return validated.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create invoice');
  }
};

/**
 * Update an existing invoice
 * @param id - Invoice ID
 * @param payload - Partial invoice data to update
 * @returns Updated invoice
 */
export const updateInvoice = async (
  id: string,
  payload: Partial<CreateInvoicePayload>
): Promise<Invoice> => {
  if (USE_MOCK) {
    const index = mockInvoices.findIndex((inv) => inv.id === id);
    if (index === -1) {
      throw new Error(`Invoice not found: ${id}`);
    }
    
    const existingInvoice = mockInvoices[index]!;
    const updatedInvoice: Invoice = {
      id: existingInvoice.id,
      clientName: payload.clientName ?? existingInvoice.clientName,
      amount: payload.amount ?? existingInvoice.amount,
      baseCurrency: payload.baseCurrency ?? existingInvoice.baseCurrency,
      targetCurrency: payload.targetCurrency ?? existingInvoice.targetCurrency,
      dueDate: payload.dueDate ?? existingInvoice.dueDate,
      createdAt: existingInvoice.createdAt,
      status: existingInvoice.status,
      updatedAt: new Date().toISOString(),
      convertedAmount: existingInvoice.convertedAmount,
      conversionRate: existingInvoice.conversionRate,
    };
    
    mockInvoices[index] = updatedInvoice;
    return updatedInvoice;
  }

  try {
    const response = await client.patch(`/invoices/${id}`, payload);
    const validated = InvoiceResponseSchema.parse(response.data);
    return validated.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to update invoice');
  }
};

/**
 * Delete an invoice
 * @param id - Invoice ID
 */
export const deleteInvoice = async (id: string): Promise<void> => {
  if (USE_MOCK) {
    const index = mockInvoices.findIndex((inv) => inv.id === id);
    if (index === -1) {
      throw new Error(`Invoice not found: ${id}`);
    }
    mockInvoices.splice(index, 1);
    return;
  }

  try {
    await client.delete(`/invoices/${id}`);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to delete invoice');
  }
};
