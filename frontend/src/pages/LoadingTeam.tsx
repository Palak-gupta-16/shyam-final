import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Search } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import OrderCard from '../components/orders/OrderCard';
import OrderStatusBadge from '../components/orders/OrderStatusBadge';
import Pagination from '../components/common/Pagination';
import OrderActionModal from '../components/orders/OrderActionModal';
import { ordersAPI } from '../services/api';
import { Order, OrderStatus } from '../types';

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
      status: [
        'inside_factory_pending_loading',
    
      ] // Default statuses as array
    };

    if (selectedStatus !== 'all') params.status = [selectedStatus];
    if (selectedType !== 'all') params.type = selectedType;

    const response = await ordersAPI.getOrdersByStatus(params);
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
            <h1 className="text-3xl font-bold text-gray-900">Weighbridge Management</h1>
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
                  <option value="inside_factory_pending_loading">Pending Loading</option>
                  {/* <option value="inside_factory_pending_final_weight">Pending Final Weight</option>
                  <option value="inside_factory_pending_empty_weight_purchase">Pending Empty Weight (Purchase)</option>
                  <option value="inside_factory_pending_final_weight_purchase">Pending Final Weight (Purchase)</option> */}
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

       

        {/* Action Modal */}
        <OrderActionModal
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
      render: (value: number) => <span className="font-medium">#{value}</span>,
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
          {record.vehicle?.number ? (
            <>
              <div className="font-medium">{record.vehicle.number}</div>
              <div className="text-sm text-gray-500">{record.vehicle.driverName}</div>
            </>
          ) : (
            <span className="text-sm text-gray-400 italic">Not added</span>
          )}
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
      render: (value: string) => new Date(value).toLocaleDateString(),
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
                      {column.render ? column.render(value, order) : (value as React.ReactNode)}
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

export default Orders;