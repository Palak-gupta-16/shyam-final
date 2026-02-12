import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  Package,
  ShoppingCart,
  CheckCircle2,
  RefreshCw,
  Eye,
  ArrowRight
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { inventoryAPI, ordersAPI } from '../services/api';
import { InventoryItem, Order } from '../types';

const NeededItems: React.FC = () => {
  const navigate = useNavigate();
  const [neededItems, setNeededItems] = useState<InventoryItem[]>([]);
  const [blockedOrders, setBlockedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [fulfilling, setFulfilling] = useState<string | null>(null);

  useEffect(() => {
    fetchNeededItems();
  }, []);

  const fetchNeededItems = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getNeededItems();
      setNeededItems(response.data?.neededItems || []);
      setBlockedOrders(response.data?.blockedOrders || []);
    } catch (error) {
      console.error('Error fetching needed items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFulfillOrder = async (orderId: string) => {
    setFulfilling(orderId);
    try {
      await ordersAPI.fulfillBlockedOrder(orderId);
      await fetchNeededItems(); // Refresh data
    } catch (error: any) {
      console.error('Error fulfilling order:', error);
    } finally {
      // Always redirect to inventory page
      navigate('/inventory');
    }
  };

  const getOrderPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="error" size="sm">Urgent</Badge>;
      case 'high':
        return <Badge variant="warning" size="sm">High</Badge>;
      case 'medium':
        return <Badge variant="info" size="sm">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary" size="sm">Low</Badge>;
      default:
        return <Badge variant="secondary" size="sm">Medium</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const neededItemsColumns = [
    {
      key: 'name',
      title: 'Item',
      render: (value: string, record: InventoryItem) => (
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Package className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{record.type}</div>
            {record.dimensions && (
              <div className="text-xs text-gray-400">{record.dimensions}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      render: (value: string) => (
        <Badge variant="secondary" size="sm">
          {value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Badge>
      ),
    },
    {
      key: 'quantity',
      title: 'Needed Quantity',
      align: 'right' as const,
      render: (value: number, record: InventoryItem) => (
        <div className="text-right">
          <div className="font-medium text-red-600">{value.toLocaleString()}</div>
          <div className="text-sm text-gray-500">{record.unit}</div>
          {record._calculatedNeeded && (
            <div className="text-xs text-gray-400 mt-1">
              {record._calculatedNeeded.totalNeeded} needed - {record._calculatedNeeded.available} available
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'blockedOrders',
      title: 'Blocked Orders',
      align: 'center' as const,
      render: (value: any[], record: InventoryItem) => (
        <div className="text-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {value?.length || 0} orders
          </span>
        </div>
      ),
    },
  ];

  const blockedOrdersColumns = [
    {
      key: 'orderNumber',
      title: 'Order #',
      render: (value: number, record: Order) => (
        <div className="flex items-center space-x-2">
          <ShoppingCart className="h-4 w-4 text-gray-400" />
          <span className="font-medium">#{value}</span>
        </div>
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
      render: (value: string) => (
        <div className="max-w-32 truncate" title={value}>
          {value}
        </div>
      ),
    },
    {
      key: 'priority',
      title: 'Priority',
      render: (value: string) => getOrderPriorityBadge(value),
    },
    {
      key: 'blockedAt',
      title: 'Blocked Since',
      render: (value: string) => (
        <div className="text-sm text-gray-600">
          {formatDate(value)}
        </div>
      ),
    },
    {
      key: 'blockedReason',
      title: 'Reason',
      render: (value: string) => (
        <div className="max-w-48 text-sm text-gray-600 truncate" title={value}>
          {value}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: Order) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            icon={Eye}
            onClick={() => {
              setSelectedOrder(record);
              setShowOrderModal(true);
            }}
          />
          <Button
            variant="primary"
            size="sm"
            loading={fulfilling === record._id}
            onClick={() => handleFulfillOrder(record._id)}
            disabled={!!fulfilling}
          >
            Try Fulfill
          </Button>
        </div>
      ),
    },
  ];

  const stats = [
    {
      title: 'Needed Items',
      value: neededItems.length,
      icon: Package,
      color: 'warning' as const,
      description: 'Items required for production'
    },
    {
      title: 'Blocked Orders',
      value: blockedOrders.length,
      icon: AlertTriangle,
      color: 'error' as const,
      description: 'Orders waiting for inventory'
    },
    {
      title: 'Total Quantity Needed',
      value: neededItems.reduce((sum, item) => sum + item.quantity, 0),
      icon: ShoppingCart,
      color: 'info' as const,
      description: 'Combined needed quantities'
    },
    {
      title: 'Urgent Orders',
      value: blockedOrders.filter(order => order.priority === 'urgent').length,
      icon: Clock,
      color: 'error' as const,
      description: 'High priority blocked orders'
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Needed Items & Blocked Orders</h1>
            <p className="text-gray-600 mt-2">Monitor inventory shortages and blocked orders</p>
          </div>
          <Button
            icon={RefreshCw}
            onClick={fetchNeededItems}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index}>
              <Card.Body>
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    stat.color === 'error' ? 'bg-red-50' :
                    stat.color === 'warning' ? 'bg-yellow-50' :
                    stat.color === 'info' ? 'bg-blue-50' : 'bg-gray-50'
                  }`}>
                    <stat.icon className={`h-6 w-6 ${
                      stat.color === 'error' ? 'text-red-600' :
                      stat.color === 'warning' ? 'text-yellow-600' :
                      stat.color === 'info' ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>

        {/* Needed Items Table */}
        <Card>
          <Card.Header>
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-medium">Items Needed for Production</h2>
            </div>
          </Card.Header>
          <Card.Body>
            <Table
              columns={neededItemsColumns}
              data={neededItems}
              loading={loading}
              emptyText="No items needed - all inventory sufficient!"
            />
          </Card.Body>
        </Card>

        {/* Blocked Orders Table */}
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h2 className="text-lg font-medium">Blocked Orders</h2>
              </div>
              {blockedOrders.length > 0 && (
                <Badge variant="error" size="sm">
                  {blockedOrders.length} blocked
                </Badge>
              )}
            </div>
          </Card.Header>
          <Card.Body>
            <Table
              columns={blockedOrdersColumns}
              data={blockedOrders}
              loading={loading}
              emptyText="No blocked orders - all orders can be fulfilled!"
            />
          </Card.Body>
        </Card>

        {/* Order Details Modal */}
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            isOpen={showOrderModal}
            onClose={() => {
              setShowOrderModal(false);
              setSelectedOrder(null);
            }}
            onFulfill={() => handleFulfillOrder(selectedOrder._id)}
            fulfilling={fulfilling === selectedOrder._id}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

// Order Details Modal Component
const OrderDetailsModal: React.FC<{
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onFulfill: () => void;
  fulfilling: boolean;
}> = ({ order, isOpen, onClose, onFulfill, fulfilling }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Order #${order.orderNumber} Details`} size="lg">
      <div className="space-y-6">
        {/* Order Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Customer/Supplier</label>
              <p className="text-gray-900">{order.customerOrSupplier}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Vehicle</label>
              <p className="text-gray-900">{order.vehicle?.number || 'Not added yet'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Type</label>
              <p>
                <Badge variant={order.type === 'dispatch' ? 'primary' : 'warning'}>
                  {order.type}
                </Badge>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Priority</label>
              <p>
                <Badge variant={order.priority === 'urgent' ? 'error' : 'secondary'}>
                  {order.priority || 'medium'}
                </Badge>
              </p>
            </div>
          </div>
        </div>

        {/* Blocked Info */}
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="font-medium text-red-800">Order Blocked</span>
          </div>
          <p className="text-red-700 text-sm">{order.blockedReason}</p>
          {order.blockedAt && (
            <p className="text-red-600 text-xs mt-1">
              Blocked since: {new Date(order.blockedAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Products */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Products</h3>
          <div className="space-y-3">
            {order.products.map((product, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                    {product.dimensions && (
                      <p className="text-sm text-gray-600">{product.dimensions}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {product.quantityFulfilled || 0}
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {product.quantity} {product.unit || 'pcs'}
                      </span>
                    </div>
                    {(product.quantityPending || 0) > 0 && (
                      <Badge variant="warning" size="sm">
                        {product.quantityPending} pending
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={onFulfill}
            loading={fulfilling}
            icon={CheckCircle2}
          >
            Try to Fulfill Order
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default NeededItems;
