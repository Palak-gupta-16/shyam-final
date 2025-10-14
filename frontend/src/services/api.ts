import axios, { AxiosResponse } from 'axios';
import { 
  User, 
  Order, 
  InventoryItem, 
  GatePass, 
  MillHourlyReport, 
  MillDailySummary, 
  StoreIssuance,
  Fare,
  FareStats,
  LoginForm,
  RegisterForm,
  CreateOrderForm,
  LoginResponse,
  ApiResponse,
  PaginatedResponse,
  OrdersResponse,
  GatePassesResponse,
  RawMaterialUsage,
  ProductionDimension,
  WasteMaterial
} from '../types';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('API Request:', config.method?.toUpperCase(), config.url, 'with token:', token.substring(0, 20) + '...');
    } else {
      console.log('API Request:', config.method?.toUpperCase(), config.url, 'NO TOKEN');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.method?.toUpperCase(), response.config.url);
    return response;
  },
  (error) => {
    console.log('API Error:', error.response?.status, error.response?.statusText, error.config?.method?.toUpperCase(), error.config?.url);
    console.log('Error response data:', error.response?.data);
    
    if (error.response?.status === 401) {
      console.log('401 Unauthorized - redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (data: LoginForm): Promise<LoginResponse> => {
    const response: AxiosResponse<LoginResponse> = await api.post('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterForm): Promise<ApiResponse<User>> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.post('/auth/register', data);
    return response.data;
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.get('/auth/profile');
    return response.data;
  },
};

// Orders API
export const ordersAPI = {
  getOrders: async (params?: {
    status?: string;
    type?: string;
    page?: number;
    perPage?: number;
  }): Promise<OrdersResponse> => {
    const response: AxiosResponse<OrdersResponse> = await api.get('/orders', { params });
    return response.data;
  },

getOrdersByStatus: async (params?: {
  status?: string[]; // accepts array
  type?: string;
  page?: number;
  perPage?: number;
}): Promise<OrdersResponse> => {
  const queryParams = {
    ...params,
    status: params?.status?.length ? params.status.join(',') : undefined
  };

  const response: AxiosResponse<OrdersResponse> = await api.get(
    '/orders?',
    { params: queryParams }
  );

  return response.data;
},


  createOrder: async (data: CreateOrderForm): Promise<ApiResponse<Order>> => {
    const response: AxiosResponse<ApiResponse<Order>> = await api.post('/orders', data);
    return response.data;
  },

  approveDispatch: async (orderId: string, vehicleData: {
    number: string;
    driverName: string;
    driverNumber: string;
  }): Promise<ApiResponse<Order>> => {
    const response: AxiosResponse<ApiResponse<Order>> = await api.patch(`/orders/${orderId}/approve-dispatch`, {
      vehicle: vehicleData
    });
    return response.data;
  },

  guardApprove: async (orderId: string): Promise<ApiResponse<Order>> => {
    const response: AxiosResponse<ApiResponse<Order>> = await api.patch(`/orders/${orderId}/guard-approve`);
    return response.data;
  },

  recordEmptyWeight: async (orderId: string, data: { emptyWeight: number; slipUrl?: string }): Promise<ApiResponse<Order>> => {
    const response: AxiosResponse<ApiResponse<Order>> = await api.post(`/orders/${orderId}/weight/empty`, data);
    return response.data;
  },

  readyForLoading: async (orderId: string): Promise<ApiResponse<Order>> => {
    const response: AxiosResponse<ApiResponse<Order>> = await api.patch(`/orders/${orderId}/ready-loading`);
    return response.data;
  },

  acceptLoading: async (orderId: string): Promise<ApiResponse<Order>> => {
    const response: AxiosResponse<ApiResponse<Order>> = await api.patch(`/orders/${orderId}/accept-loading`);
    return response.data;
  },

   // Signal ready for unloading (purchase)
  readyForUnloading: async (orderId: string): Promise<ApiResponse<Order>> => {
    const response: AxiosResponse<ApiResponse<Order>> = await api.patch(`/orders/${orderId}/ready-unloading`);
    return response.data;
  },

  // Accept unloading (purchase)
  acceptUnloading: async (orderId: string): Promise<ApiResponse<Order>> => {
    const response: AxiosResponse<ApiResponse<Order>> = await api.patch(`/orders/${orderId}/accept-unloading`);
    return response.data;
  },

  // Complete unloading (purchase)
  unloadingComplete: async (orderId: string): Promise<ApiResponse<Order>> => {
    const response: AxiosResponse<ApiResponse<Order>> = await api.post(`/orders/${orderId}/unloading-complete`);
    return response.data;
  },

  loadingComplete: async (orderId: string, data: {
    bundles: number;
    weightPerBundle: number;
    productLoads: Array<{
      productIndex: number;
      bundles: number;
      weightPerBundle: number;
    }>;
  }): Promise<ApiResponse<Order>> => {
    const response: AxiosResponse<ApiResponse<Order>> = await api.post(`/orders/${orderId}/loading-complete`, data);
    return response.data;
  },

  recordFinalWeight: async (orderId: string, data: { finalWeight: number; slipUrl?: string }): Promise<ApiResponse<Order>> => {
    const response: AxiosResponse<ApiResponse<Order>> = await api.post(`/orders/${orderId}/weight/final`, data);
    return response.data;
  },

  generateInvoice: async (orderId: string, data: { 
    amount: number; 
    RatePerUnit?: number; 
    TaxPercentage?: number; 
    invoiceNotes?: string;
    billingPartyName?: string;
    billingPartyAddress?: string;
    billingPartyGSTIN?: string;
    billingPartyContact?: string;
    billingPartyEmail?: string;
    billingPartyState?: string;
    billingPartyPincode?: string;
    companyName?: string;
    companyAddress?: string;
    companyGSTIN?: string;
    companyContact?: string;
    companyEmail?: string;
  }): Promise<ApiResponse<Order>> => {
    const response: AxiosResponse<ApiResponse<Order>> = await api.post(`/orders/${orderId}/generate-invoice`, data);
    return response.data;
  },

  moveToGate: async (orderId: string): Promise<ApiResponse<Order>> => {
    const response: AxiosResponse<ApiResponse<Order>> = await api.patch(`/orders/${orderId}/move-to-gate`);
    return response.data;
  },

  exitOrder: async (orderId: string): Promise<ApiResponse<Order>> => {
    const response: AxiosResponse<ApiResponse<Order>> = await api.patch(`/orders/${orderId}/exit`);
    return response.data;
  },

  getBlockedOrders: async (): Promise<ApiResponse<{ orders: Order[] }>> => {
    const response = await api.get('/orders/blocked');
    return response.data;
  },

  fulfillBlockedOrder: async (orderId: string): Promise<ApiResponse<Order>> => {
    const response = await api.patch(`/orders/${orderId}/fulfill-blocked`);
    return response.data;
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    const response: AxiosResponse<Order> = await api.get(`/orders/${orderId}`);
    return response.data;
  },
};

// Inventory API
export const inventoryAPI = {
  getInventory: async (params?: {
    type?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    inventory: InventoryItem[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  }> => {
    const response = await api.get('/inventory', { params });
    return response.data;
  },

  addInventoryItem: async (data: {
    sku?: string; // Optional - will be auto-generated if not provided
    type: 'finished_product' | 'raw_material' | 'store_item' | 'waste_material';
    name: string;
    // For finished products
    dimensions?: {
      dimension: string;
      quantity: number;
      bundles: number;
      minimumStock: number;
      maxStock?: number;
    }[];
    // For raw materials and store items
    quantity?: number;
    bundles?: number;
    minimumStock?: number;
    maxStock?: number;
    unit: string;
    location?: string;
    description?: string;
    length?: number;
  }): Promise<ApiResponse<InventoryItem>> => {
    const response: AxiosResponse<ApiResponse<InventoryItem>> = await api.post('/inventory', data);
    return response.data;
  },

  updateInventoryItem: async (itemId: string, data: { 
    dimensionId: string;
    quantity: number; 
    bundles?: number;
    action?: 'set' | 'add' | 'subtract' 
  }): Promise<ApiResponse<InventoryItem>> => {
    const response: AxiosResponse<ApiResponse<InventoryItem>> = await api.patch(`/inventory/${itemId}`, data);
    return response.data;
  },

  addDimensionToItem: async (itemId: string, data: {
    dimension: string;
    quantity: number;
    bundles: number;
    minimumStock: number;
    maxStock?: number;
  }): Promise<ApiResponse<InventoryItem>> => {
    const response: AxiosResponse<ApiResponse<InventoryItem>> = await api.post(`/inventory/${itemId}/dimensions`, data);
    return response.data;
  },

  getInventoryByType: async (type: string, availableOnly?: boolean): Promise<InventoryItem[]> => {
    const response: AxiosResponse<InventoryItem[]> = await api.get(`/inventory/type/${type}`, {
      params: { available_only: availableOnly }
    });
    return response.data;
  },

  getInventoryByDimensionSku: async (dimensionSku: string): Promise<{
    item: InventoryItem;
    dimension: any;
  }> => {
    const response = await api.get(`/inventory/dimension/${dimensionSku}`);
    return response.data;
  },

  getLowStockItems: async (): Promise<ApiResponse<InventoryItem[]>> => {
    const response: AxiosResponse<ApiResponse<InventoryItem[]>> = await api.get('/inventory/low-stock');
    return response.data;
  },

  getNeededItems: async (): Promise<ApiResponse<{
    neededItems: InventoryItem[];
    blockedOrders: Order[];
  }>> => {
    const response = await api.get('/inventory/needed-items');
    return response.data;
  },

  reserveInventory: async (data: {
    inventoryItemId: string;
    dimensionId: string;
    quantity: number;
    orderId: string;
  }): Promise<ApiResponse<{ 
    _id: string; 
    name: string; 
    dimension: {
      _id: string;
      dimension: string;
      sku: string;
      availableQuantity: number;
      reservedQuantity: number;
    }
  }>> => {
    const response = await api.post('/inventory/reserve', data);
    return response.data;
  },

  searchInventory: async (query: string, type?: string): Promise<ApiResponse<InventoryItem[]>> => {
    const response: AxiosResponse<ApiResponse<InventoryItem[]>> = await api.get('/inventory/search', {
      params: { query, type }
    });
    return response.data;
  },
};

// Needed Items API
export const neededItemsAPI = {
  getNeededItems: async (params?: {
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
    orderId?: string;
    canFulfill?: string;
  }): Promise<ApiResponse<{
    neededItems: any[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  }>> => {
    const response = await api.get('/needed-items', { params });
    return response.data;
  },

  getFulfillableItems: async (): Promise<ApiResponse<{
    fulfillableItems: any[];
    count: number;
  }>> => {
    const response = await api.get('/needed-items/fulfillable');
    return response.data;
  },

  fulfillNeededItems: async (data: {
    itemIds: string[];
    notes?: string;
  }): Promise<ApiResponse<{
    fulfilled: any[];
    errors: any[];
    summary: {
      totalRequested: number;
      fulfilled: number;
      failed: number;
    };
  }>> => {
    const response = await api.post('/needed-items/fulfill', data);
    return response.data;
  },

  checkFulfillmentStatus: async (data: {
    itemIds: string[];
  }): Promise<ApiResponse<any[]>> => {
    const response = await api.post('/needed-items/check-status', data);
    return response.data;
  },

  autoDetectNeededItems: async (orderId: string): Promise<ApiResponse<{
    neededItems: any[];
    canDispatch: boolean;
    order: any;
  }>> => {
    const response = await api.post(`/needed-items/auto-detect/${orderId}`);
    return response.data;
  },

  deleteNeededItem: async (id: string): Promise<ApiResponse<{}>> => {
    const response = await api.delete(`/needed-items/${id}`);
    return response.data;
  }
};

// Gate Pass API
export const gatePassAPI = {
  getGatePasses: async (params?: {
    status?: string;
    page?: number;
    perPage?: number;
  }): Promise<GatePassesResponse> => {
    const response: AxiosResponse<GatePassesResponse> = await api.get('/gatepasses', { params });
    return response.data;
  },

  createGatePass: async (data: {
    vehicle: { number: string; driverName: string };
    purpose: string;
  }): Promise<ApiResponse<GatePass>> => {
    const response: AxiosResponse<ApiResponse<GatePass>> = await api.post('/gatepasses', data);
    return response.data;
  },

  approveGatePass: async (gatePassId: string): Promise<ApiResponse<GatePass>> => {
    const response: AxiosResponse<ApiResponse<GatePass>> = await api.patch(`/gatepasses/${gatePassId}/approve`);
    return response.data;
  },

  rejectGatePass: async (gatePassId: string, rejectionReason?: string): Promise<ApiResponse<GatePass>> => {
    const response: AxiosResponse<ApiResponse<GatePass>> = await api.patch(`/gatepasses/${gatePassId}/reject`, {
      rejectionReason
    });
    return response.data;
  },

  getPendingGatePasses: async (): Promise<ApiResponse<GatePass[]>> => {
    const response: AxiosResponse<ApiResponse<GatePass[]>> = await api.get('/gatepasses/status/pending');
    return response.data;
  },
};

// Mill API
export const millAPI = {
  createHourlyReport: async (data: {
    date: string;
    hour: number;
    billetSize: string;
    piecesProduced: number;
    missRolls: number;
    breakdowns?: string[];
    shift?: string;
    operatorName?: string;
    remarks?: string;
  }): Promise<ApiResponse<MillHourlyReport>> => {
    const response: AxiosResponse<ApiResponse<MillHourlyReport>> = await api.post('/mill/hourly', data);
    return response.data;
  },

  createDailySummary: async (data: {
    date: string;
    name: string;
    dimensions?: string;
    rawMaterials: RawMaterialUsage[];
    finishedProduct: {
      inventoryItemId: string;
      dimensions: ProductionDimension[];
    };
    wasteMaterials?: WasteMaterial[];
    totalPieces: number;
    totalWeight: number;
    breakdownSummary?: string;
    productionHours?: number;
    efficiency?: number;
    remarks?: string;
  }): Promise<ApiResponse<MillDailySummary>> => {
    const response: AxiosResponse<ApiResponse<MillDailySummary>> = await api.post('/mill/daily', data);
    return response.data;
  },

  getAvailableRawMaterials: async (): Promise<{
    message: string;
    materials: InventoryItem[];
  }> => {
    const response = await api.get('/mill/raw-materials');
    return response.data;
  },

  getAvailableFinishedProducts: async (): Promise<{
    message: string;
    products: InventoryItem[];
  }> => {
    const response = await api.get('/mill/finished-products');
    return response.data;
  },

  stockTake: async (data: {
    productName: string;
    quantity: number;
  }): Promise<ApiResponse<InventoryItem>> => {
    const response: AxiosResponse<ApiResponse<InventoryItem>> = await api.post('/mill/stock-take', data);
    return response.data;
  },

  getHourlyReports: async (params?: {
    date?: string;
    shift?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<MillHourlyReport>> => {
    const response: AxiosResponse<PaginatedResponse<MillHourlyReport>> = await api.get('/mill/hourly', { params });
    return response.data;
  },

  getDailySummaries: async (params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<MillDailySummary>> => {
    const response: AxiosResponse<PaginatedResponse<MillDailySummary>> = await api.get('/mill/daily', { params });
    return response.data;
  },

  getProductionStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/mill/stats', { params });
    return response.data;
  },
};

// Store API
export const storeAPI = {
  issueStoreItem: async (data: {
    issuedTo: string;
    item: {
      name: string;
      quantity: number;
      unit: string;
      description?: string;
    };
    purpose?: string;
    department?: string;
    employeeId?: string;
    returnExpected?: boolean;
    returnDate?: string;
    remarks?: string;
  }): Promise<ApiResponse<StoreIssuance>> => {
    const response: AxiosResponse<ApiResponse<StoreIssuance>> = await api.post('/store/issue', data);
    return response.data;
  },

  returnStoreItem: async (issuanceId: string, data: {
    returnedQuantity: number;
    remarks?: string;
  }): Promise<ApiResponse<StoreIssuance>> => {
    const response: AxiosResponse<ApiResponse<StoreIssuance>> = await api.patch(`/store/return/${issuanceId}`, data);
    return response.data;
  },

  getStoreIssuances: async (params?: {
    issuedTo?: string;
    department?: string;
    returnExpected?: boolean;
    returned?: boolean;
    startDate?: string;
    endDate?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<StoreIssuance>> => {
    const response: AxiosResponse<PaginatedResponse<StoreIssuance>> = await api.get('/store/issuances', { params });
    return response.data;
  },

  getPendingReturns: async (): Promise<ApiResponse<StoreIssuance[]>> => {
    const response: AxiosResponse<ApiResponse<StoreIssuance[]>> = await api.get('/store/pending-returns');
    return response.data;
  },

  getIssuanceStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/store/stats', { params });
    return response.data;
  },
};

// File upload API
export const uploadAPI = {
  uploadFile: async (file: File): Promise<ApiResponse<{ filename: string; path: string; size: number }>> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response: AxiosResponse<ApiResponse<{ filename: string; path: string; size: number }>> = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Fare API
export const fareAPI = {
  recordFare: async (orderId: string, data: {
    fareType: 'given_by_us' | 'given_by_other_party';
    amount: number;
    notes?: string;
  }): Promise<ApiResponse<Fare>> => {
    console.log('API: Recording fare for order:', orderId, 'with data:', data);
    const response: AxiosResponse<ApiResponse<Fare>> = await api.post(`/fares/order/${orderId}`, data);
    console.log('API: Fare recorded successfully:', response.data);
    return response.data;
  },

  getFares: async (params?: {
    page?: number;
    limit?: number;
    fareType?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<Fare>> => {
    const response: AxiosResponse<PaginatedResponse<Fare>> = await api.get('/fares', { params });
    return response.data;
  },

  getFareByOrderId: async (orderId: string): Promise<Fare> => {
    const response: AxiosResponse<Fare> = await api.get(`/fares/order/${orderId}`);
    return response.data;
  },

  updateFare: async (orderId: string, data: {
    fareType: 'given_by_us' | 'given_by_other_party';
    amount: number;
    notes?: string;
  }): Promise<ApiResponse<Fare>> => {
    const response: AxiosResponse<ApiResponse<Fare>> = await api.put(`/fares/order/${orderId}`, data);
    return response.data;
  },

  deleteFare: async (orderId: string): Promise<ApiResponse<void>> => {
    const response: AxiosResponse<ApiResponse<void>> = await api.delete(`/fares/order/${orderId}`);
    return response.data;
  },

  getFareStats: async (): Promise<FareStats> => {
    const response: AxiosResponse<FareStats> = await api.get('/fares/stats');
    return response.data;
  }
};

export default api;
