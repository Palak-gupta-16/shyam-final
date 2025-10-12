import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw } from 'lucide-react';
import { InventoryItem, InventoryDimension } from '../types';
import { inventoryAPI } from '../services/api';
import InventoryTable from '../components/inventory/InventoryTable';
import InventoryForm, { InventoryFormData } from '../components/inventory/InventoryForm';
import DimensionModal, { DimensionFormData } from '../components/inventory/DimensionModal';

const Inventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDimensionModal, setShowDimensionModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingDimension, setEditingDimension] = useState<{
    item: InventoryItem;
    dimension?: InventoryDimension;
  } | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    search: ''
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchInventory();
  }, [filters, pagination.page]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.search && { search: filters.search })
      };

      const response = await inventoryAPI.getInventory(params);
      setItems(response.inventory);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        pages: response.pagination.pages
      }));
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (data: InventoryFormData) => {
    try {
      setLoading(true);
      await inventoryAPI.addInventoryItem(data);
      setShowForm(false);
      setEditingItem(null);
      fetchInventory();
    } catch (error) {
      console.error('Error adding inventory item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleEditDimension = (item: InventoryItem, dimension: InventoryDimension) => {
    setEditingDimension({ item, dimension });
    setShowDimensionModal(true);
  };

  const handleAddDimension = (item: InventoryItem) => {
    setEditingDimension({ item });
    setShowDimensionModal(true);
  };

  const handleDimensionSubmit = async (data: DimensionFormData) => {
    if (!editingDimension) return;

    try {
      setLoading(true);
      
      if (editingDimension.dimension) {
        // Update existing dimension
        await inventoryAPI.updateInventoryItem(editingDimension.item._id, {
          dimensionId: editingDimension.dimension._id,
          quantity: data.quantity,
          bundles: data.bundles,
          action: data.action
        });
      } else {
        // Add new dimension
        await inventoryAPI.addDimensionToItem(editingDimension.item._id, {
          dimension: data.dimension,
          quantity: data.quantity,
          bundles: data.bundles,
          minimumStock: data.minimumStock,
          maxStock: data.maxStock
        });
      }

      setShowDimensionModal(false);
      setEditingDimension(null);
      fetchInventory();
    } catch (error) {
      console.error('Error updating dimension:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchInventory();
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Manage your inventory items and dimensions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchInventory}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setShowForm(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </form>

          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="finished_product">Finished Products</option>
              <option value="raw_material">Raw Materials</option>
              <option value="store_item">Store Items</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <InventoryTable
        items={items}
        onEditItem={handleEditItem}
        onEditDimension={handleEditDimension}
        onAddDimension={handleAddDimension}
        loading={loading}
      />

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-3 rounded-lg shadow">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {/* Page Numbers */}
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const pageNum = Math.max(1, pagination.page - 2) + i;
              if (pageNum > pagination.pages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 text-sm border rounded ${
                    pageNum === pagination.page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Inventory Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <InventoryForm
              item={editingItem || undefined}
              onSubmit={handleAddItem}
              onCancel={() => {
                setShowForm(false);
                setEditingItem(null);
              }}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* Dimension Modal */}
      {editingDimension && (
        <DimensionModal
          isOpen={showDimensionModal}
          onClose={() => {
            setShowDimensionModal(false);
            setEditingDimension(null);
          }}
          item={editingDimension.item}
          dimension={editingDimension.dimension}
          onSubmit={handleDimensionSubmit}
          loading={loading}
        />
      )}
    </div>
  );
};

export default Inventory;