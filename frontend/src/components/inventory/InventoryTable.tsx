import React, { useState } from 'react';
import { Package, Edit, Plus, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { InventoryItem, InventoryDimension } from '../../types';

interface InventoryTableProps {
  items: InventoryItem[];
  onEditItem?: (item: InventoryItem) => void;
  onEditDimension?: (item: InventoryItem, dimension: InventoryDimension) => void;
  onAddDimension?: (item: InventoryItem) => void;
  onViewDetails?: (item: InventoryItem) => void;
  loading?: boolean;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  onEditItem,
  onEditDimension,
  onAddDimension,
  onViewDetails,
  loading = false
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getStatusIcon = (status: string, availableQuantity: number) => {
    if (status === 'out_of_stock' || availableQuantity === 0) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (status === 'low_stock') {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    if (status === 'blocked') {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { bg: 'bg-green-100', text: 'text-green-800', label: 'Available' },
      low_stock: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Low Stock' },
      out_of_stock: { bg: 'bg-red-100', text: 'text-red-800', label: 'Out of Stock' },
      blocked: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Blocked' },
      needed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Needed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.available;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getTotalQuantity = (item: InventoryItem) => {
    if (item.type === 'finished_product' && item.dimensions) {
      return item.dimensions.reduce((total, dim) => total + dim.quantity, 0);
    }
    return item.quantity || 0;
  };

  const getTotalAvailableQuantity = (item: InventoryItem) => {
    if (item.type === 'finished_product' && item.dimensions) {
      return item.dimensions.reduce((total, dim) => total + dim.availableQuantity, 0);
    }
    return item.availableQuantity || 0;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory items found</h3>
          <p className="text-gray-500">Start by adding your first inventory item.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dimensions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <React.Fragment key={item._id}>
                {/* Main Item Row */}
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                        {item.description && (
                          <div className="text-xs text-gray-400 mt-1">{item.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="capitalize text-sm text-gray-900">
                      {item.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.status, getTotalAvailableQuantity(item))}
                      {getStatusBadge(item.status)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>Total: {getTotalQuantity(item)} {item.unit}</div>
                      <div className="text-xs text-gray-500">
                        Available: {getTotalAvailableQuantity(item)} {item.unit}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.type === 'finished_product' && item.dimensions ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-900">
                          {item.dimensions.length} dimension{item.dimensions.length !== 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={() => toggleExpanded(item._id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {expandedItems.has(item._id) ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Simple quantity</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {onViewDetails && (
                        <button
                          onClick={() => onViewDetails(item)}
                          className="text-gray-600 hover:text-gray-800"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {onEditItem && (
                        <button
                          onClick={() => onEditItem(item)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit Item"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {onAddDimension && (
                        <button
                          onClick={() => onAddDimension(item)}
                          className="text-green-600 hover:text-green-800"
                          title="Add Dimension"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Expanded Dimensions Rows */}
                {expandedItems.has(item._id) && item.type === 'finished_product' && item.dimensions && (
                  <>
                    {/* Dimensions Header */}
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="px-6 py-2">
                        <div className="text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Dimension Details
                        </div>
                      </td>
                    </tr>
                    {item.dimensions?.map((dimension) => (
                      <tr key={dimension._id} className="bg-gray-25 border-l-4 border-blue-200">
                        <td className="px-6 py-3 pl-12">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{dimension.dimension}</div>
                            <div className="text-xs text-gray-500 font-mono">{dimension.sku}</div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm text-gray-500">Dimension</span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(
                              dimension.availableQuantity > 0 ? 'available' : 'out_of_stock',
                              dimension.availableQuantity
                            )}
                            <span className="text-sm text-gray-600">
                              {dimension.availableQuantity > 0 ? 'Available' : 'Out of Stock'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-sm">
                            <div className="text-gray-900">
                              Qty: {dimension.quantity} {item.unit}
                            </div>
                            <div className="text-xs text-gray-500">
                              Available: {dimension.availableQuantity} {item.unit}
                            </div>
                            {dimension.bundles > 0 && (
                              <div className="text-xs text-gray-500">
                                Bundles: {dimension.bundles}
                              </div>
                            )}
                            {dimension.reservedQuantity > 0 && (
                              <div className="text-xs text-orange-600">
                                Reserved: {dimension.reservedQuantity} {item.unit}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-sm text-gray-500">
                            {dimension.minimumStock > 0 && (
                              <div>Min: {dimension.minimumStock} {item.unit}</div>
                            )}
                            {dimension.maxStock && (
                              <div>Max: {dimension.maxStock} {item.unit}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          {onEditDimension && (
                            <button
                              onClick={() => onEditDimension(item, dimension)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit Dimension"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;