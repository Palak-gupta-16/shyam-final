// User types
export interface User {
  _id: string;
  name: string;
  alias: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 
  | 'Guard'
  | 'Weighbridge'
  | 'Loading'
  | 'Unloading'
  | 'Mill_Supervisor'
  | 'Accounting'
  | 'Stocks'
  | 'General_Manager'
  | 'Director'
  | 'Store_Keeper'
  | 'Purchasing';

// Order types
export interface Order {
  _id: string;
  orderNumber: number;
  type: 'dispatch' | 'purchase';
  status: OrderStatus;
  customerOrSupplier: string;
  vehicle?: {
    number?: string;
    driverName?: string;
    driverNumber?: string;
    addedAt?: string;
  };
  products: Product[];
  weights?: {
    emptyWeight?: number;
    finalWeight?: number;
    slipUrl?: string;
  };
  netWeight?: number;
  loadingDetails?: {
    acceptedBy?: string;
    bundles?: number;
    totalLoadedWeight?: number;
    averageWeightPerBundle?: number;
    productLoads?: ProductLoad[];
    notes?: string;
  };
  invoice?: {
    billNumber?: number;
    amount?: number;
    RatePerUnit?: number;
    TaxPercentage?: number;
    fare?: {
      amount?: number;
      paidBy?: 'our_side' | 'other_party';
      notes?: string;
    };
    invoiceNotes?: string;
    pdfUrl?: string;
  };
  createdBy: string;
  history: OrderHistory[];
  isBlocked?: boolean;
  blockedReason?: string;
  blockedAt?: string;
  blockedBy?: User;
  fulfilledAt?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 
  | 'pending_guard_approval'
  | 'inside_factory_pending_empty_weight'
  | 'inside_factory_pending_loading'
  | 'inside_factory_pending_final_weight'
  | 'ready_for_billing'
  | 'ready_for_dispatch'
  | 'inside_factory_pending_empty_weight_purchase'
  | 'inside_factory_pending_unloading'
  | 'inside_factory_pending_unloaded'
  | 'inside_factory_pending_final_weight_purchase'
  | 'ready_for_billing_purchase'
  | 'ready_for_exit_purchase'
  | 'completed';

export interface Product {
  inventoryItemId?: string | InventoryItem;
  name: string;
  dimensions?: string;
  length?: string;
  quantity: number;
  quantityFulfilled?: number;
  quantityPending?: number;
  weightPerBundle?: number;
  grade?: string;
  unit?: string;
}

export interface ProductLoad {
  productIndex: number;
  bundles: number;
  totalWeight?: number;
  weightPerBundle?: number;
  bundleDetails?: BundleDetail[];
}

export interface BundleDetail {
  bundleNumber?: number;
  weight: number;
  size?: string;
  length?: number;
}

export interface LoadingCompletePayload {
  bundles?: number;
  totalLoadedWeight?: number;
  weightPerBundle?: number;
  averageWeightPerBundle?: number;
  notes?: string;
  productLoads: Array<{
    productIndex: number;
    bundles: number;
    totalWeight?: number;
    weightPerBundle?: number;
    bundleDetails: BundleDetail[];
  }>;
}

export interface OrderHistory {
  by: string;
  from?: string;
  to: string;
  note?: string;
  at: string;
}

// Inventory types
export interface InventorySize {
  dimension: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
}

export interface InventoryItem {
  _id: string;
  type: 'finished_product' | 'raw_material' | 'store_item' | 'waste_material';
  status: 'available' | 'needed' | 'low_stock' | 'out_of_stock' | 'blocked';
  name: string;
  dimensions?: string;
  sizes?: InventorySize[];
  quantity: number;
  unit: string;
  location?: string;
  description?: string;
  minimumStock?: number;
  length?: number;
  maxStock?: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  lastUpdatedBy?: string;
  blockedOrders?: BlockedOrder[];
  createdAt: string;
  updatedAt: string;
}

export interface BlockedOrder {
  orderId: string;
  quantityNeeded: number;
  dateBlocked: string;
}

// Gate Pass types
export interface GatePass {
  _id: string;
  requestBy: User;
  vehicle: {
    number: string;
    driverName: string;
  };
  purpose: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: User;
  approvedAt?: string;
  rejectedBy?: User;
  rejectedAt?: string;
  rejectionReason?: string;
  validUntil?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

// Mill Report types
export interface FinalProduct {
  productId?: string;
  productName: string;
  dimension?: string;
  quantity: number;
}

export interface RawMaterialConsumed {
  materialId?: string;
  materialName: string;
  quantity: number;
  unit: string;
}

export interface WasteProduct {
  wasteId?: string;
  wasteName: string;
  quantity: number;
  unit: string;
}

export interface MillHourlyReport {
  _id: string;
  date: string;
  hour: number;
  finalProducts?: FinalProduct[];
  rawMaterialsConsumed?: RawMaterialConsumed[];
  wasteProducts?: WasteProduct[];
  breakdowns: string[];
  createdBy: User;
  shift?: string;
  operatorName?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}
export interface RawMaterialUsage {
  inventoryItemId?: string;
  materialName: string;
  quantityUsed: number;
  unit: string;
}

export interface WasteMaterialOutput {
  inventoryItemId?: string;
  materialName: string;
  quantityProduced: number;
  unit: string;
}

export interface MillDailySummary {
  _id: string;
  date: string;
  name: string; // Finished product name
  dimensions?: string; 
  totalPieces: number;
  totalWeight: number;
  breakdownSummary?: string;
  createdBy: User;
  productionHours?: number;
  efficiency?: number;
  remarks?: string;
  rawMaterials?: RawMaterialUsage[];
  finishedProduct?: {
    inventoryItemId?: string;
    quantityProduced?: number;
  };
  wasteMaterials?: WasteMaterialOutput[];
  createdAt: string;
  updatedAt: string;
}

// Store Issuance types
export interface StoreIssuance {
  _id: string;
  issuedBy: User;
  issuedTo: string;
  item: {
    name: string;
    quantity: number;
    unit: string;
    description?: string;
  };
  dateIssued: string;
  purpose?: string;
  department?: string;
  employeeId?: string;
  returnExpected: boolean;
  returnDate?: string;
  returned: boolean;
  returnedQuantity?: number;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  message: string;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
}

export interface PaginationInfo {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  orders?: T[];
  gatePasses?: T[];
  pagination: PaginationInfo;
}

export interface OrdersResponse {
  orders: Order[];
  pagination: PaginationInfo;
}

export interface GatePassesResponse {
  gatePasses: GatePass[];
  pagination: PaginationInfo;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  alias: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface CreateOrderForm {
  type: 'dispatch' | 'purchase';
  customerOrSupplier: string;
  products: Product[];
}

// Component props types
export interface TableColumn<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, record: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface FilterOption {
  label: string;
  value: string;
}

// Chart data types
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
  }[];
}

// Navigation types
export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  current?: boolean;
  children?: NavigationItem[];
}

// Dashboard stats types
export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalInventoryItems: number;
  lowStockItems: number;
  pendingGatePasses: number;
  todayProduction: number;
  monthlyProduction: number;
}
