import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Clock,
  CheckCircle,
  Package,
  Eye
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import OrderCard from '../components/orders/OrderCard';
import OrderStatusBadge from '../components/orders/OrderStatusBadge';
import Pagination from '../components/common/Pagination';
import InventoryDropdown from '../components/common/InventoryDropdown';
import { ordersAPI } from '../services/api';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';

const Orders: React.FC = () => {
  const { hasRole } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');



  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        perPage: 12,
      };
      
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedType !== 'all') params.type = selectedType;
      
      const response = await ordersAPI.getOrders(params);
      setOrders(response.orders || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedStatus, selectedType]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);





  const handleActionClick = (action: string, orderId: string) => {
    const order = orders.find(o => o._id === orderId);
    if (order) {
      setSelectedOrder(order);
      setActionType(action);
      setShowActionModal(true);
    }
  };

  const executeAction = async (actionData: any) => {
    if (!selectedOrder) return;

    try {
     switch (actionType) {
      case 'guard-approve':
        await ordersAPI.guardApprove(selectedOrder._id);
        break;
      case 'empty-weight':
        await ordersAPI.recordEmptyWeight(selectedOrder._id, actionData);
        break;
      case 'ready-loading':
        await ordersAPI.readyForLoading(selectedOrder._id);
        break;
      case 'accept-loading':
        await ordersAPI.acceptLoading(selectedOrder._id);
        break;
      case 'complete-loading':
        await ordersAPI.loadingComplete(selectedOrder._id, actionData);
        break;
      case 'ready-unloading':
        await ordersAPI.readyForUnloading(selectedOrder._id);
        break;
      case 'accept-unloading':
        await ordersAPI.acceptUnloading(selectedOrder._id);
        break;
      case 'unloading-complete':
        await ordersAPI.unloadingComplete(selectedOrder._id);
        break;
      case 'final-weight':
        await ordersAPI.recordFinalWeight(selectedOrder._id, actionData);
        break;
      case 'generate-invoice':
        await ordersAPI.generateInvoice(selectedOrder._id, actionData);
        break;
      case 'exit':
        await ordersAPI.exitOrder(selectedOrder._id);
        break;
      default:
        console.warn(`Unknown action type: ${actionType}`);
        // Optionally show a toast notification for invalid action
        return;
    }
      
      setShowActionModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('Error executing action:', error);
    }
  };

  const getStats = () => {
    return [
      {
        title: 'Total Orders',
        value: orders.length,
        icon: FileText,
        color: 'primary' as const,
      },
      {
        title: 'Pending',
        value: orders.filter(o => o.status.includes('pending')).length,
        icon: Clock,
        color: 'warning' as const,
      },
      {
        title: 'In Progress',
        value: orders.filter(o => o.status.includes('inside_factory')).length,
        icon: Package,
        color: 'info' as const,
      },
      {
        title: 'Completed',
        value: orders.filter(o => o.status === 'completed').length,
        icon: CheckCircle,
        color: 'success' as const,
      },
    ];
  };

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toString().includes(searchTerm) ||
    order.customerOrSupplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.vehicle.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
            <p className="text-gray-600 mt-2">Track and manage factory orders</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Table
              </button>
            </div>
            {hasRole(['Store_Keeper', 'Purchasing', 'General_Manager', 'Director']) && (
              <Button
                icon={Plus}
                onClick={() => setShowCreateModal(true)}
              >
                Create Order
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getStats().map((stat, index) => (
            <Card key={index}>
              <Card.Body>
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-${stat.color === 'primary' ? 'blue' : stat.color === 'info' ? 'blue' : stat.color}-50`}>
                    <stat.icon className={`h-6 w-6 text-${stat.color === 'primary' ? 'blue' : stat.color === 'info' ? 'blue' : stat.color}-600`} />
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <Card.Body>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by order number, customer, or vehicle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={Search}
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending_guard_approval">Pending Approval</option>
                  <option value="inside_factory_pending_empty_weight">Pending Empty Weight</option>
                  <option value="inside_factory_pending_loading">Pending Loading</option>
                  <option value="ready_for_billing">Ready for Billing</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="dispatch">Dispatch</option>
                  <option value="purchase">Purchase</option>
                </select>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Orders Grid/Table */}
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onActionClick={handleActionClick}
                showActions={true}
              />
            ))}
          </div>
        ) : (
          <OrdersTable 
            orders={filteredOrders} 
            loading={loading}
            onActionClick={handleActionClick}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            total={orders.length}
            pageSize={12}
          />
        )}

        {/* Create Order Modal */}
        <CreateOrderModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchOrders();
          }}
        />

        {/* Action Modal */}
        <ActionModal
          isOpen={showActionModal}
          onClose={() => {
            setShowActionModal(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          actionType={actionType}
          onExecute={executeAction}
        />
      </div>
    </DashboardLayout>
  );
};

// Orders Table Component
const OrdersTable: React.FC<{
  orders: Order[];
  loading: boolean;
  onActionClick: (action: string, orderId: string) => void;
}> = ({ orders, loading, onActionClick }) => {
  const columns = [
    {
      key: 'orderNumber',
      title: 'Order #',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">#{value}</span>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      render: (value: string) => (
        <Badge variant={value === 'dispatch' ? 'primary' : 'warning'} size="sm">
          {value}
        </Badge>
      ),
    },
    {
      key: 'customerOrSupplier',
      title: 'Customer/Supplier',
      sortable: true,
    },
    {
      key: 'vehicle.number',
      title: 'Vehicle',
      render: (_: any, record: Order) => (
        <div>
          <div className="font-medium">{record.vehicle.number}</div>
          <div className="text-sm text-gray-500">{record.vehicle.driverName}</div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: OrderStatus) => <OrderStatusBadge status={value} />,
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value: string) => (
        new Date(value).toLocaleDateString()
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Order) => (
        <Button
          variant="ghost"
          size="sm"
          icon={Eye}
          onClick={() => onActionClick('view', record._id)}
        />
      ),
    },
  ];

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order._id} className="hover:bg-gray-50">
                {columns.map((column, index) => {
                  const getValue = (key: string) => {
                    if (key.includes('.')) {
                      return key.split('.').reduce((obj: any, k) => obj?.[k], order);
                    }
                    return order[key as keyof Order];
                  };
                  
                  const value = getValue(column.key);
                  
                  return (
                    <td key={index} className="px-6 py-4 whitespace-nowrap text-sm">
                      {column.render ? column.render(value, order) : value as React.ReactNode}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// Create Order Modal
// Create Order Modal
const CreateOrderModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    type: 'dispatch' as 'dispatch' | 'purchase',
    customerOrSupplier: '',
    vehicle: {
      number: '',
      driverName: '',
      driverNumber: '',
    },
    products: [{ inventoryItemId: '', name: '', dimensions: '', length: '', quantity: 0 }],
  });
  const [loading, setLoading] = useState(false);

  const addProduct = () => {
    setFormData((prev) => ({
      ...prev,
      products: [...prev.products, { inventoryItemId: '', name: '', dimensions: '', length: '', quantity: 0 }],
    }));
  };

  const updateProduct = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const newProducts = [...prev.products];
      newProducts[index] = { ...newProducts[index], [field]: value };
      return { ...prev, products: newProducts };
    });
  };

  const removeProduct = (index: number) => {
    if (formData.products.length > 1) {
      setFormData((prev) => ({
        ...prev,
        products: prev.products.filter((_, i) => i !== index),
      }));
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Validate that all products have inventory items selected
      const validProducts = formData.products.filter((p) => p.inventoryItemId && p.quantity > 0);
      const invalidProducts = formData.products.filter((p) => !p.inventoryItemId && p.quantity > 0);
      
      if (invalidProducts.length > 0) {
        alert('Please select inventory items for all products before creating the order.');
        setLoading(false);
        return;
      }
      
      if (validProducts.length === 0) {
        alert('Please add at least one product with a valid inventory item and quantity.');
        setLoading(false);
        return;
      }
      
      const processedData = {
        type: formData.type,
        customerOrSupplier: formData.customerOrSupplier,
        vehicle: {
          number: formData.vehicle.number,
          driverName: formData.vehicle.driverName,
          driverNumber: formData.vehicle.driverNumber,
        },
        products: validProducts,
      };
      await ordersAPI.createOrder(processedData);
      onSuccess();
      setFormData({
        type: 'dispatch',
        customerOrSupplier: '',
        vehicle: { number: '', driverName: '', driverNumber: '' },
        products: [{ inventoryItemId: '', name: '', dimensions: '', length: '', quantity: 0 }],
      });
    } catch (error) {
      console.error('Error creating order:', error);
      // TODO: Show toast notification, e.g., toast.error('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Order" size="4xl">
  <div className="flex flex-col max-h-[80vh]">
    {/* Scrollable content */}
    <div className="overflow-y-auto pr-2 space-y-6 flex-1">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="dispatch"
                checked={formData.type === 'dispatch'}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: e.target.value as 'dispatch' | 'purchase',
                  }))
                }
                className="mr-2"
              />
              Dispatch (Outgoing)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="purchase"
                checked={formData.type === 'purchase'}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: e.target.value as 'dispatch' | 'purchase',
                  }))
                }
                className="mr-2"
              />
              Purchase (Incoming)
            </label>
          </div>
        </div>

        {/* Customer/Supplier Details */}
        <Input
          label={formData.type === 'dispatch' ? 'Customer Name' : 'Supplier Name'}
          value={formData.customerOrSupplier}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, customerOrSupplier: e.target.value }))
          }
          required
          placeholder="Enter name"
        />

        {/* Vehicle Information */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Vehicle Number"
            value={formData.vehicle.number}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, number: e.target.value },
              }))
            }
            required
            placeholder="e.g., GJ01AB1234"
          />
          <Input
            label="Driver Name"
            value={formData.vehicle.driverName}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, driverName: e.target.value },
              }))
            }
            required
            placeholder="Enter driver name"
          />
          <Input
            label="Driver Phone Number"
            value={formData.vehicle.driverNumber}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, driverNumber: e.target.value },
              }))
            }
            required
            type="tel"
            pattern="[0-9]{10}"
            title="Please enter a valid 10-digit phone number"
            placeholder="e.g., 9876543210"
          />
        </div>

        {/* Products */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">Products</label>
            <Button type="button" variant="secondary" size="sm" onClick={addProduct}>
              Add Product
            </Button>
          </div>
          <div className="space-y-3">
            {formData.products.map((product, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg"
              >
                <div className="col-span-4">
                  <InventoryDropdown
                    type={
                      formData.type === 'dispatch'
                        ? 'finished_product'
                        : 'raw_material'
                    }
                    value={product.inventoryItemId || null}
                    onChange={(item) => {
                      if (item) {
                        updateProduct(index, 'inventoryItemId', item._id);
                        updateProduct(index, 'name', item.name);
                        updateProduct(index, 'dimensions', item.dimensions || '');
                        updateProduct(index, 'length', item.length || '');
                      } else {
                        updateProduct(index, 'inventoryItemId', '');
                        updateProduct(index, 'name', '');
                        updateProduct(index, 'dimensions', '');
                        updateProduct(index, 'length', '');
                      }
                    }}
                    placeholder="Select material... *"
                    showStock={true}
                    required={true}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    placeholder="Dimensions"
                    value={product.dimensions}
                    onChange={(e) =>
                      updateProduct(index, 'dimensions', e.target.value)
                    }
                    disabled
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    placeholder="Length"
                    value={product.length}
                    onChange={(e) =>
                      updateProduct(index, 'length', e.target.value)
                    }
                    disabled
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Quantity"
                    min="0"
                    step="1"
                    value={product.quantity}
                    onChange={(e) =>
                      updateProduct(index, 'quantity', Number(e.target.value))
                    }
                    required
                  />
                </div>
                <div className="col-span-1">
                  {formData.products.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeProduct(index)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>

    {/* Fixed footer */}
    <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" loading={loading} onClick={handleSubmit}>
        Create Order
      </Button>
    </div>
  </div>
</Modal>

  );
};

// Action Modal
const ActionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  actionType: string;
  onExecute: (data: any) => void;
}> = ({ isOpen, onClose, order, actionType, onExecute }) => {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    let processedData = { ...formData };
    
    // Special processing for complete-loading action
    if (actionType === 'complete-loading') {
      processedData = {
        bundles: formData.bundles || 0,
        weightPerBundle: formData.weightPerBundle || 0,
        productLoads: (formData.productLoads || []).filter((load: any) => 
          load.productIndex !== undefined && 
          load.productIndex !== "" && 
          load.bundles > 0 && 
          load.weightPerBundle > 0
        ).map((load: any) => ({
          productIndex: Number(load.productIndex),
          bundles: Number(load.bundles),
          weightPerBundle: Number(load.weightPerBundle)
        }))
      };
    }
    
    // Special processing for generate-invoice action
    if (actionType === 'generate-invoice') {
      processedData = {
        amount: Number(formData.amount) || 0,
        RatePerUnit: Number(formData.rate) || 0,
        TaxPercentage: Number(formData.taxRate) || 0,
        pdfUrl: formData.pdfUrl || '',
        invoiceNotes: formData.invoiceNotes || '',
      };
    }
    
    await onExecute(processedData);
    setLoading(false);
  };

  const renderActionForm = () => {
    switch (actionType) {
      case 'guard-approve':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900">Guard Approval</h4>
              <p className="text-sm text-blue-700 mt-1">
                Approve vehicle entry for Order #{order.orderNumber}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approval Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      case 'empty-weight':
        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900">Record Empty Weight</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Vehicle: {order.vehicle.number} | Driver: {order.vehicle.driverName}
              </p>
            </div>
            <Input
              label="Empty Weight (KG)"
              type="number"
              step="0.1"
              value={formData.emptyWeight || ''}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, emptyWeight: Number(e.target.value) }))}
              required
              placeholder="Enter empty vehicle weight"
            />
            <Input
              label="Weighbridge Slip Number"
              value={formData.slipNumber || ''}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, slipNumber: e.target.value }))}
              placeholder="Enter slip number"
            />
          </div>
        );

      case 'accept-loading':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900">Accept for Loading</h4>
              <p className="text-sm text-green-700 mt-1">
                Confirm vehicle is ready for loading operations
              </p>
            </div>
            <Input
              label="Accepted By"
              value={formData.acceptedBy || ''}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, acceptedBy: e.target.value }))}
              required
              placeholder="Enter your name"
            />
          </div>
        );

      case 'complete-loading':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900">Complete Loading</h4>
              <p className="text-sm text-blue-700 mt-1">
                Record loading completion details
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Total Bundles"
                type="number"
                value={formData.bundles || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, bundles: Number(e.target.value) }))}
                placeholder="Number of bundles"
                required
              />
              <Input
                label="Weight per Bundle (KG)"
                type="number"
                step="0.1"
                value={formData.weightPerBundle || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, weightPerBundle: Number(e.target.value) }))}
                placeholder="Weight per bundle"
                required
              />
            </div>
            

            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loading Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any loading observations..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      case 'final-weight':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900">Record Final Weight</h4>
              <p className="text-sm text-purple-700 mt-1">
                Record final loaded vehicle weight
              </p>
            </div>
            <Input
              label="Final Weight (KG)"
              type="number"
              step="0.1"
              value={formData.finalWeight || ''}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, finalWeight: Number(e.target.value) }))}
              required
              placeholder="Enter final vehicle weight"
            />
            <Input
              label="Final Weighbridge Slip Number"
              value={formData.finalSlipNumber || ''}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, finalSlipNumber: e.target.value }))}
              placeholder="Enter final slip number"
            />
          </div>
        );

       case 'generate-invoice':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900">Generate Invoice</h4>
              <p className="text-sm text-green-700 mt-1">
                Create billing invoice for Order #{order.orderNumber}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Invoice Amount (₹)"
                type="number"
                step="1"
                value={formData.amount || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, amount: Number(e.target.value) }))}
                required
                placeholder="Enter total invoice amount"
              />
              <Input
                label="Rate per Unit (₹)"
                type="number"
                step="1"
                value={formData.rate || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, rate: Number(e.target.value) }))}
                required
                placeholder="Rate per unit"
              />
              <Input
                label="Tax Percentage (%)"
                type="number"
                step="1"
                value={formData.taxRate || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, taxRate: Number(e.target.value) }))}
                required
                placeholder="Tax percentage"
              />
              <Input
                label="Invoice PDF URL"
                value={formData.pdfUrl || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, pdfUrl: e.target.value }))}
                placeholder="Enter invoice PDF URL (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Notes
              </label>
              <textarea
                value={formData.invoiceNotes || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, invoiceNotes: e.target.value }))}
                placeholder="Additional invoice details..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );
     
      case 'exit':
        return (
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-900">Vehicle Exit</h4>
              <p className="text-sm text-red-700 mt-1">
                Confirm vehicle exit and order completion
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exit Notes
              </label>
              <textarea
                value={formData.exitNotes || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, exitNotes: e.target.value }))}
                placeholder="Any exit observations..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Action: {actionType}</h3>
            <p className="text-gray-600">Unknown action type</p>
          </div>
        );
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`${actionType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} - Order #${order.orderNumber}`} 
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        {renderActionForm()}
        
        <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Execute Action
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default Orders;
