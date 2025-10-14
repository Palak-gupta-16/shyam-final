import React, { useState, useEffect } from 'react';
import { ChevronDown, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { InventoryItem } from '../../types';
import { inventoryAPI } from '../../services/api';

interface ProductDropdownProps {
  type: 'finished_product' | 'raw_material' | 'store_item' | 'waste_material';
  value: string | null; // This will be the item ID
  onChange: (item: InventoryItem | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showStock?: boolean;
  availableOnly?: boolean;
}

const ProductDropdown: React.FC<ProductDropdownProps> = ({
  type,
  value,
  onChange,
  placeholder = 'Select product...',
  required = false,
  disabled = false,
  className = '',
  showStock = true,
  availableOnly = false
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Find selected item by ID
  const selectedItem = React.useMemo(() => {
    if (!value) return null;
    return items.find(item => item._id === value) || null;
  }, [items, value]);

  useEffect(() => {
    fetchItems();
  }, [type, availableOnly]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await inventoryAPI.getInventoryByType(type, availableOnly);
      setItems(data);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter items based on search term
  const filteredItems = React.useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const getStockIcon = (item: InventoryItem) => {
    const availableQty = item.availableQuantity || 0;
    const qty = item.quantity || 0;
    const minStock = item.minimumStock || 0;
    
    if (availableQty === 0) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (qty <= minStock) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getTotalStock = (item: InventoryItem) => {
    if (item.type === 'finished_product' && item.dimensions) {
      return item.dimensions.reduce((total, dim) => total + dim.availableQuantity, 0);
    }
    return item.availableQuantity || 0;
  };

  const handleSelect = (item: InventoryItem) => {
    onChange(item);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left bg-white border rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'}
          ${selectedItem ? 'border-gray-300' : 'border-gray-300'}
          ${required && !selectedItem ? 'border-red-300' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
            {selectedItem ? (
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900 truncate">
                    {selectedItem.name}
                  </span>
                  {showStock && getStockIcon(selectedItem)}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {selectedItem.sku}
                </div>
                {showStock && (
                  <div className="text-xs text-gray-400">
                    Total Stock: {getTotalStock(selectedItem)} {selectedItem.unit}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-500 truncate">{placeholder}</span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Box */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Product Options List */}
          <div className="overflow-y-auto max-h-64">
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-500">
                Loading...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                {searchTerm ? 'No products found' : 'No products available'}
              </div>
            ) : (
              filteredItems.map((item) => {
                const totalStock = getTotalStock(item);
                
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 truncate">
                            {item.name}
                          </span>
                          {showStock && getStockIcon(item)}
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          SKU: {item.sku}
                        </div>
                        {item.type === 'finished_product' && item.dimensions && (
                          <div className="text-sm text-gray-500 truncate">
                            {item.dimensions.length} dimension(s) available
                          </div>
                        )}
                        {item.description && (
                          <div className="text-xs text-gray-400 truncate mt-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                      {showStock && (
                        <div className="ml-4 text-right flex-shrink-0">
                          <div className="text-xs text-gray-500">
                            <div>Total: {totalStock} {item.unit}</div>
                            {item.type === 'finished_product' && item.dimensions && (
                              <div>Dimensions: {item.dimensions.length}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Clear Selection */}
          {selectedItem && (
            <div className="border-t border-gray-200 p-2">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ProductDropdown;