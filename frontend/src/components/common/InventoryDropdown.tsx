import React, { useState, useEffect } from 'react';
import { ChevronDown, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { InventoryItem, InventoryDimension } from '../../types';
import { inventoryAPI } from '../../services/api';

interface InventoryDropdownProps {
  type: 'finished_product' | 'raw_material' | 'store_item';
  value: string | null; // This will be the dimension SKU
  onChange: (item: InventoryItem | null, dimension?: InventoryDimension | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showStock?: boolean;
  availableOnly?: boolean;
}

const InventoryDropdown: React.FC<InventoryDropdownProps> = ({
  type,
  value,
  onChange,
  placeholder = 'Select item...',
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

  // Find selected item and dimension by dimension SKU or item SKU for simple items
  const selectedData = React.useMemo(() => {
    if (!value) return null;
    
    for (const item of items) {
      if (item.type === 'finished_product' && item.dimensions) {
        const dimension = item.dimensions.find(d => d.sku === value);
        if (dimension) {
          return { item, dimension };
        }
      } else {
        // For raw materials and store items, match by item SKU
        if (item.sku === value) {
          return { item, dimension: null };
        }
      }
    }
    return null;
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

  // Create flattened list of options for filtering
  const itemOptions = React.useMemo(() => {
    const options: Array<{ item: InventoryItem; dimension: InventoryDimension | null }> = [];
    
    items.forEach(item => {
      if (item.type === 'finished_product' && item.dimensions) {
        // For finished products, add each dimension as an option
        item.dimensions.forEach(dimension => {
          if (!availableOnly || dimension.availableQuantity > 0) {
            options.push({ item, dimension });
          }
        });
      } else {
        // For raw materials and store items, add the item itself
        if (!availableOnly || (item.availableQuantity || 0) > 0) {
          options.push({ item, dimension: null });
        }
      }
    });
    
    return options.filter(option =>
      option.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (option.dimension && (
        option.dimension.dimension.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.dimension.sku.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
  }, [items, searchTerm, availableOnly]);

  const getStockIcon = (item: InventoryItem, dimension: InventoryDimension | null) => {
    const availableQty = dimension ? dimension.availableQuantity : (item.availableQuantity || 0);
    const qty = dimension ? dimension.quantity : (item.quantity || 0);
    const minStock = dimension ? dimension.minimumStock : (item.minimumStock || 0);
    
    if (availableQty === 0) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (qty <= minStock) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStockText = (item: InventoryItem, dimension: InventoryDimension | null) => {
    const availableQty = dimension ? dimension.availableQuantity : (item.availableQuantity || 0);
    const reservedQty = dimension ? dimension.reservedQuantity : (item.reservedQuantity || 0);
    const bundles = dimension ? dimension.bundles : (item.bundles || 0);
    
    return (
      <div className="text-xs text-gray-500">
        <div>Available: {availableQty} {item.unit}</div>
        {reservedQty > 0 && (
          <div>Reserved: {reservedQty} {item.unit}</div>
        )}
        {bundles > 0 && (
          <div>Bundles: {bundles}</div>
        )}
      </div>
    );
  };

  const handleSelect = (item: InventoryItem, dimension: InventoryDimension | null) => {
    onChange(item, dimension);
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
          ${selectedData ? 'border-gray-300' : 'border-gray-300'}
          ${required && !selectedData ? 'border-red-300' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
            {selectedData ? (
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900 truncate">
                    {selectedData.item.name}
                  </span>
                  {showStock && getStockIcon(selectedData.item, selectedData.dimension)}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {selectedData.dimension 
                    ? `${selectedData.dimension.sku} • ${selectedData.dimension.dimension}`
                    : selectedData.item.sku
                  }
                </div>
                {showStock && (
                  <div className="text-xs text-gray-400">
                    Stock: {selectedData.dimension 
                      ? selectedData.dimension.availableQuantity 
                      : (selectedData.item.availableQuantity || 0)
                    } {selectedData.item.unit}
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
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Dimension Options List */}
          <div className="overflow-y-auto max-h-64">
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-500">
                Loading...
              </div>
            ) : itemOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                {searchTerm ? 'No items found' : 'No items available'}
              </div>
            ) : (
              itemOptions.map((option) => {
                const optionKey = option.dimension ? option.dimension.sku : option.item.sku;
                const availableQty = option.dimension ? option.dimension.availableQuantity : (option.item.availableQuantity || 0);
                
                return (
                  <button
                    key={optionKey}
                    type="button"
                    onClick={() => handleSelect(option.item, option.dimension)}
                    disabled={availableOnly && availableQty <= 0}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50
                      border-b border-gray-100 last:border-b-0
                      ${(availableOnly && availableQty <= 0) 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'cursor-pointer'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 truncate">
                            {option.item.name}
                          </span>
                          {showStock && getStockIcon(option.item, option.dimension)}
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          SKU: {optionKey}
                        </div>
                        {option.dimension && (
                          <div className="text-sm text-gray-500 truncate">
                            Dimension: {option.dimension.dimension}
                          </div>
                        )}
                        {option.item.description && (
                          <div className="text-xs text-gray-400 truncate mt-1">
                            {option.item.description}
                          </div>
                        )}
                      </div>
                      {showStock && (
                        <div className="ml-4 text-right flex-shrink-0">
                          {getStockText(option.item, option.dimension)}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Clear Selection */}
          {selectedData && (
            <div className="border-t border-gray-200 p-2">
              <button
                type="button"
                onClick={() => {
                  onChange(null, null);
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

export default InventoryDropdown;
