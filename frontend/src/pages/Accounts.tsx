import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Clock,
  CheckCircle,
  Package,
  Eye,
  DollarSign,
  Receipt,
  AlertCircle
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
import FareModal from '../components/fares/FareModal';
import FareTable from '../components/fares/FareTable';
import InvoiceModal from '../components/invoices/InvoiceModal';
import { ordersAPI, fareAPI } from '../services/api';
import { Order, OrderStatus, Fare } from '../types';
import { useAuth } from '../context/AuthContext';

const Accounts: React.FC = () => {
  const { hasRole } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fares, setFares] = useState<Fare[]>([]);
  const [loading, setLoading] = useState(true);
  const [faresLoading, setFaresLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fareSearchTerm, setFareSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFareType, setSelectedFareType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [fareCurrentPage, setFareCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fareTotalPages, setFareTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showFareModal, setShowFareModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedFare, setSelectedFare] = useState<Fare | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [activeTab, setActiveTab] = useState<'orders' | 'fares'>('orders');



const fetchOrders = useCallback(async () => {
  try {
    setLoading(true);

    const params: any = {
      page: currentPage,
      perPage: 12,
      // Show all orders for accounting - they need to see orders with invoices
      status: 'ready_for_billing,ready_for_billing_purchase,ready_for_dispatch,ready_for_exit_purchase,completed'
    };

    if (selectedStatus !== 'all') params.status = selectedStatus;
    if (selectedType !== 'all') params.type = selectedType;

    const response = await ordersAPI.getOrders(params);
    
    // Filter to show orders that have invoices or are ready for billing
    const filteredOrders = (response.orders || []).filter(order => 
      order.invoice || 
      order.status === 'ready_for_billing' || 
      order.status === 'ready_for_billing_purchase'
    );
    
    setOrders(filteredOrders);
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

  const fetchFares = useCallback(async () => {
    try {
      setFaresLoading(true);
      const params: any = {
        page: fareCurrentPage,
        limit: 10,
      };
      
      if (selectedFareType !== 'all') params.fareType = selectedFareType;
      if (fareSearchTerm) params.search = fareSearchTerm;
      
      const response = await fareAPI.getFares(params);
      setFares(response.fares || []);
      setFareTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching fares:', error);
    } finally {
      setFaresLoading(false);
    }
  }, [fareCurrentPage, selectedFareType, fareSearchTerm]);

  useEffect(() => {
    if (activeTab === 'fares') {
      fetchFares();
    }
  }, [fetchFares, activeTab]);



  const handleActionClick = (action: string, orderId: string) => {
    const order = orders.find(o => o._id === orderId);
    if (order) {
      setSelectedOrder(order);
      
      if (action === 'view-invoice' || action === 'generate-invoice') {
        setShowInvoiceModal(true);
      } else {
        setActionType(action);
        setShowActionModal(true);
      }
    }
  };

  const executeAction = async (actionData: any) => {
    if (!selectedOrder) return;

    try {
     switch (actionType) {

      case 'empty-weight':
        await ordersAPI.recordEmptyWeight(selectedOrder._id, actionData);
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
        // Check if fare exists before generating invoice
        try {
          await fareAPI.getFareByOrderId(selectedOrder._id);
          await ordersAPI.generateInvoice(selectedOrder._id, actionData);
        } catch (fareError: any) {
          if (fareError.response?.status === 404) {
            alert('Please record the vehicle fare before generating invoice.');
            setShowActionModal(false);
            handleRecordFare(selectedOrder);
            return;
          }
          throw fareError;
        }
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

  // Fare-related handlers
  const handleRecordFare = (order: Order) => {
    // Check if user has required role
    if (!hasRole(['Accounting', 'Director'])) {
      alert('You need Accounting or Director role to record vehicle fares.');
      return;
    }
    
    setSelectedOrder(order);
    setSelectedFare(null);
    setShowFareModal(true);
  };

  const handleEditFare = (fare: Fare) => {
    const order = orders.find(o => o._id === fare.orderId);
    if (order) {
      setSelectedOrder(order);
      setSelectedFare(fare);
      setShowFareModal(true);
    }
  };

  const handleDeleteFare = async (fare: Fare) => {
    if (window.confirm('Are you sure you want to delete this fare record?')) {
      try {
        await fareAPI.deleteFare(fare.orderId);
        fetchFares();
        fetchOrders(); // Refresh orders to update invoice generation availability
      } catch (error) {
        console.error('Error deleting fare:', error);
      }
    }
  };

  const handleFareSuccess = () => {
    fetchFares();
    fetchOrders(); // Refresh orders to update invoice generation availability
  };

  // Check if an order has fare recorded
  const orderHasFare = (orderId: string) => {
    return fares.some(fare => fare.orderId === orderId);
  };


  const filteredOrders = orders.filter(order =>
    order.orderNumber.toString().includes(searchTerm) ||
    order.customerOrSupplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.vehicle?.number && order.vehicle.number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Accounts Management</h1>
            <p className="text-gray-600 mt-2">Manage orders, fares, and billing</p>
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
           
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Receipt className="h-4 w-4" />
                <span>Orders & Billing</span>
              </div>
            </button>
            {hasRole(['Accounting', 'Director', 'General_Manager']) && (
              <button
                onClick={() => setActiveTab('fares')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'fares'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Vehicle Fares</span>
                </div>
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'orders' && (
          <>
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
                  <option value="ready_for_billing">Final billing for dispatch</option>
                  <option value="ready_for_billing_purchase">Final billing for purchase</option>

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
                hasFare={orderHasFare(order._id)}
                onRecordFare={handleRecordFare}
                pageType="accounts"
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
          </>
        )}

        {/* Fares Tab */}
        {activeTab === 'fares' && (
          <>
            {/* Fare Filters */}
            <Card>
              <Card.Body>
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by order number, customer, vehicle, or driver..."
                      value={fareSearchTerm}
                      onChange={(e) => setFareSearchTerm(e.target.value)}
                      icon={Search}
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedFareType}
                      onChange={(e) => setSelectedFareType(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Fare Types</option>
                      <option value="given_by_us">Given by Us</option>
                      <option value="given_by_other_party">Given by Other Party</option>
                    </select>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Fare Table */}
            <FareTable
              fares={fares}
              loading={faresLoading}
              onEdit={handleEditFare}
              onDelete={handleDeleteFare}
            />

            {/* Fare Pagination */}
            {fareTotalPages > 1 && (
              <Pagination
                currentPage={fareCurrentPage}
                totalPages={fareTotalPages}
                onPageChange={setFareCurrentPage}
                total={fares.length}
                pageSize={10}
              />
            )}
          </>
        )}

        {/* Fare Modal */}
        <FareModal
          isOpen={showFareModal}
          onClose={() => {
            setShowFareModal(false);
            setSelectedOrder(null);
            setSelectedFare(null);
          }}
          order={selectedOrder}
          existingFare={selectedFare}
          onSuccess={handleFareSuccess}
        />

        {/* Invoice Modal */}
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          onSuccess={() => {
            fetchOrders();
            setShowInvoiceModal(false);
          }}
          onRecordFare={handleRecordFare}
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
          <div className="font-medium">{record.vehicle?.number || 'N/A'}</div>
          <div className="text-sm text-gray-500">{record.vehicle?.driverName || 'N/A'}</div>
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
    
    // Special processing for empty-weight action
    if (actionType === 'empty-weight') {
      processedData = {
        emptyWeight: formData.emptyWeight || 0,
        slipUrl: formData.slipNumber || ''
      };
    }
    
    // Special processing for final-weight action
    if (actionType === 'final-weight') {
      processedData = {
        finalWeight: formData.finalWeight || 0,
        slipUrl: formData.finalSlipNumber || ''
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
    // console.log('Processed Data:', processedData);
    await onExecute(processedData);
    setLoading(false);
  };

  const renderActionForm = () => {
    switch (actionType) {
     
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

export default Accounts;