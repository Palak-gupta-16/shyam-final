import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, CheckCircle, Clock, Filter, RefreshCw } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { neededItemsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface NeededItem {
  _id: string;
  productName: string;
  dimensions?: string;
  quantityNeeded: number;
  bundlesNeeded: number;
  quantityFulfilled: number;
  bundlesFulfilled: number;
  status: 'pending' | 'partially_fulfilled' | 'fulfilled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  orderReference: {
    orderId: string;
    orderNumber: number;
    customerOrSupplier: string;
  };
  inventoryItemId: {
    name: string;
    type: string;
    availableQuantity: number;
    status: string;
  };
  createdAt: string;
  fulfilledAt?: string;
  notes?: string;
  fulfillmentCheck?: {
    canFulfill: boolean;
    availableQuantity: number;
    neededQuantity: number;
    reason?: string;
  };
}

const NeededItems: React.FC = () => {
  const { hasRole } = useAuth();
  const [neededItems, setNeededItems] = useState<NeededItem[]>([]);
  const [fulfillableItems, setFulfillableItems] = useState<NeededItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'fulfillable'>('all');
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    canFulfill: 'all'
  });

  const canManageNeededItems = hasRole(['General_Manager', 'Director', 'Store_Keeper']);

  useEffect(() => {
    fetchNeededItems();
    if (canManageNeededItems) {
      fetchFulfillableItems();
    }
  }, [filters, canManageNeededItems]);

  const fetchNeededItems = async () => {
    try {
      setLoading(true);
      const response = await neededItemsAPI.getNeededItems({
        ...filters,
        status: filters.status === 'all' ? undefined : filters.status,
        priority: filters.priority === 'all' ? undefined : filters.priority,
        canFulfill: filters.canFulfill === 'all' ? undefined : filters.canFulfill
      });
      setNeededItems(response.data?.neededItems || []);
    } catch (error) {
      console.error('Error fetching needed items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFulfillableItems = async () => {
    try {
      const response = await neededItemsAPI.getFulfillableItems();
      setFulfillableItems(response.data?.fulfillableItems || []);
    } catch (error) {
      console.error('Error fetching fulfillable items:', error);
    }
  };

  const handleFulfillItems = async () => {
    if (selectedItems.length === 0) return;

    try {
      setLoading(true);
      const response = await neededItemsAPI.fulfillNeededItems({
        itemIds: selectedItems,
        notes: 'Fulfilled via needed items management'
      });

      const responseData = response.data;
      if (responseData && responseData.fulfilled && responseData.fulfilled.length > 0) {
        alert(`Successfully fulfilled ${responseData.fulfilled.length} items`);
        setSelectedItems([]);
        fetchNeededItems();
        fetchFulfillableItems();
      }

      if (responseData && responseData.errors && responseData.errors.length > 0) {
        console.error('Fulfillment errors:', responseData.errors);
        alert(`${responseData.errors.length} items could not be fulfilled. Check console for details.`);
      }
    } catch (error) {
      console.error('Error fulfilling items:', error);
      alert('Error fulfilling items');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'partially_fulfilled':
        return <Badge variant="info">Partially Fulfilled</Badge>;
      case 'fulfilled':
        return <Badge variant="success">Fulfilled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="error">Urgent</Badge>;
      case 'high':
        return <Badge variant="warning">High</Badge>;
      case 'medium':
        return <Badge variant="info">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const displayItems = activeTab === 'fulfillable' ? fulfillableItems : neededItems;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Needed Items</h1>
          <p className="text-gray-600 mt-1">
            Manage items needed for order fulfillment
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              fetchNeededItems();
              if (canManageNeededItems) fetchFulfillableItems();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Items ({neededItems.length})
          </button>
          {canManageNeededItems && (
            <button
              onClick={() => setActiveTab('fulfillable')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'fulfillable'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Can Fulfill ({fulfillableItems.length})
            </button>
          )}
        </nav>
      </div>

      {/* Filters */}
      <Card>
        <Card.Body>
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="partially_fulfilled">Partially Fulfilled</option>
                  <option value="fulfilled">Fulfilled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="all">All Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              {activeTab === 'all' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fulfillment
                  </label>
                  <select
                    value={filters.canFulfill}
                    onChange={(e) => setFilters({ ...filters, canFulfill: e.target.value })}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value="all">All Items</option>
                    <option value="true">Can Fulfill</option>
                    <option value="false">Cannot Fulfill</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Bulk Actions */}
      {canManageNeededItems && activeTab === 'fulfillable' && selectedItems.length > 0 && (
        <Card>
          <Card.Body>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedItems.length} item(s) selected
              </span>
              <Button
                variant="success"
                size="sm"
                onClick={handleFulfillItems}
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Fulfill Selected Items
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Items List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading needed items...</p>
          </div>
        ) : displayItems.length === 0 ? (
          <Card>
            <Card.Body className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'fulfillable' ? 'No Fulfillable Items' : 'No Needed Items'}
              </h3>
              <p className="text-gray-500">
                {activeTab === 'fulfillable' 
                  ? 'All needed items are currently out of stock or already fulfilled.'
                  : 'No items are currently needed for any orders.'
                }
              </p>
            </Card.Body>
          </Card>
        ) : (
          displayItems.map((item) => (
            <Card key={item._id} hover>
              <Card.Body>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {canManageNeededItems && activeTab === 'fulfillable' && (
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, item._id]);
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item._id));
                          }
                        }}
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.productName}
                        </h3>
                        {item.dimensions && (
                          <Badge variant="secondary">{item.dimensions}</Badge>
                        )}
                        {getStatusBadge(item.status)}
                        {getPriorityBadge(item.priority)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Quantity Needed</p>
                          <p className="text-sm text-gray-900">
                            {item.quantityNeeded - item.quantityFulfilled} / {item.quantityNeeded} units
                          </p>
                          {item.bundlesNeeded > 0 && (
                            <p className="text-xs text-gray-500">
                              {item.bundlesNeeded - item.bundlesFulfilled} / {item.bundlesNeeded} bundles
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Order Reference</p>
                          <p className="text-sm text-gray-900">
                            #{item.orderReference.orderNumber}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.orderReference.customerOrSupplier}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Inventory Status</p>
                          <p className="text-sm text-gray-900">
                            {item.inventoryItemId.availableQuantity} available
                          </p>
                          <Badge 
                            variant={
                              item.inventoryItemId.status === 'available' ? 'success' :
                              item.inventoryItemId.status === 'low_stock' ? 'warning' : 'error'
                            }
                            className="text-xs"
                          >
                            {item.inventoryItemId.status}
                          </Badge>
                        </div>
                      </div>

                      {item.fulfillmentCheck && (
                        <div className={`p-3 rounded-lg border ${
                          item.fulfillmentCheck.canFulfill 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center space-x-2">
                            {item.fulfillmentCheck.canFulfill ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            )}
                            <span className={`text-sm font-medium ${
                              item.fulfillmentCheck.canFulfill ? 'text-green-800' : 'text-red-800'
                            }`}>
                              {item.fulfillmentCheck.canFulfill ? 'Can Fulfill' : 'Cannot Fulfill'}
                            </span>
                          </div>
                          {item.fulfillmentCheck.reason && (
                            <p className={`text-sm mt-1 ${
                              item.fulfillmentCheck.canFulfill ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {item.fulfillmentCheck.reason}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-3">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>Created: {formatDate(item.createdAt)}</span>
                        </div>
                        {item.fulfilledAt && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-4 w-4" />
                            <span>Fulfilled: {formatDate(item.fulfilledAt)}</span>
                          </div>
                        )}
                      </div>

                      {item.notes && (
                        <div className="mt-3 p-2 bg-gray-50 rounded border">
                          <p className="text-sm text-gray-700">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default NeededItems;