import React, { useState } from 'react';
import { ChevronDown, AlertTriangle, CheckCircle, Ruler } from 'lucide-react';
import { InventoryItem, InventoryDimension } from '../../types';

interface DimensionDropdownProps {
  inventoryItem: InventoryItem | null;
  value: string | null; // dimension ID
  onChange: (dimension: InventoryDimension | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showStock?: boolean;
  availableOnly?: boolean;
  allowCustom?: boolean;
  customValue?: string;
  onCustomChange?: (value: string) => void;
}

const DimensionDropdown: React.FC<DimensionDropdownProps> = ({
  inventoryItem,
  value,
  onChange,
  placeholder = 'Select dimension...',
  required = false,
  disabled = false,
  className = '',
  showStock = true,
  availableOnly = false,
  allowCustom = true,
  customValue = '',
  onCustomChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Get dimensions from inventory item
  const dimensions = React.useMemo(() => {
    if (!inventoryItem || inventoryItem.type !== 'finished_product' || !inventoryItem.dimensions) {
      return [];
    }
    return inventoryItem.dimensions;
  }, [inventoryItem]);

  // Find selected dimension
  const selectedDimension = React.useMemo(() => {
    if (!value || !dimensions.length) return null;
    return dimensions.find(dim => dim._id === value) || null;
  }, [dimensions, value]);

  // Filter dimensions based on search term and availability
  const filteredDimensions = React.useMemo(() => {
    let filtered = dimensions.filter(dim =>
      dim.dimension.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dim.sku && dim.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (availableOnly) {
      filtered = filtered.filter(dim => dim.availableQuantity > 0);
    }

    // Sort by availability first, then by dimension name
    return filtered.sort((a, b) => {
      if (a.availableQuantity > 0 && b.availableQuantity === 0) return -1;
      if (a.availableQuantity === 0 && b.availableQuantity > 0) return 1;
      return a.dimension.localeCompare(b.dimension);
    });
  }, [dimensions, searchTerm, availableOnly]);

  const getStockIcon = (dimension: InventoryDimension) => {
    const availableQty = dimension.availableQuantity || 0;
    const qty = dimension.quantity || 0;
    const minStock = dimension.minimumStock || 0;
    
    if (availableQty === 0) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (qty <= minStock) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const handleSelect = (dimension: InventoryDimension) => {
    onChange(dimension);
    setIsOpen(false);
    setSearchTerm('');
    setShowCustomInput(false);
  };

  const handleCustomSelect = () => {
    setShowCustomInput(true);
    onChange(null);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onCustomChange) {
      onCustomChange(e.target.value);
    }
  };

  // If no inventory item selected or no dimensions available
  if (!inventoryItem) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full px-3 py-2 text-gray-400 bg-gray-100 border border-gray-300 rounded-lg cursor-not-allowed">
          <div className="flex items-center space-x-2">
            <Ruler className="h-4 w-4" />
            <span>Select a product first</span>
          </div>
        </div>
      </div>
    );
  }

  if (inventoryItem.type !== 'finished_product' || !dimensions.length) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full px-3 py-2 text-gray-500 bg-gray-50 border border-gray-300 rounded-lg">
          <div className="flex items-center space-x-2">
            <Ruler className="h-4 w-4" />
            <span>No dimensions available for this product</span>
          </div>
        </div>
      </div>
    );
  }

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
          ${selectedDimension || showCustomInput ? 'border-gray-300' : 'border-gray-300'}
          ${required && !selectedDimension && !showCustomInput ? 'border-red-300' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Ruler className="h-4 w-4 text-gray-400 flex-shrink-0" />
            {selectedDimension ? (
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900 truncate">
                    {selectedDimension.dimension}
                  </span>
                  {showStock && getStockIcon(selectedDimension)}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {selectedDimension.sku}
                </div>
                {showStock && (
                  <div className="text-xs text-gray-400">
                    Available: {selectedDimension.availableQuantity} • Bundles: {selectedDimension.bundles || 0}
                  </div>
                )}
              </div>
            ) : showCustomInput ? (
              <span className="text-blue-600 truncate">Custom dimension</span>
            ) : (
              <span className="text-gray-500 truncate">{placeholder}</span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Custom Input */}
      {showCustomInput && (
        <div className="mt-2">
          <input
            type="text"
            placeholder="Enter custom dimension (e.g., 12x8x2, 150mm x 100mm)"
            value={customValue}
            onChange={handleCustomInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
          <div className="mt-1 text-xs text-gray-500">
            Stock availability will be verified when order is processed
          </div>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Box */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search dimensions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Dimension Options List */}
          <div className="overflow-y-auto max-h-64">
            {/* Custom Option */}
            {allowCustom && (
              <>
                <button
                  type="button"
                  onClick={handleCustomSelect}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:outline-none focus:bg-blue-50 border-b border-gray-100 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">✏️</span>
                    </div>
                    <div>
                      <div className="font-medium text-blue-700">Enter Custom Dimension</div>
                      <div className="text-sm text-blue-600">For dimensions not in the list</div>
                    </div>
                  </div>
                </button>
                <div className="border-b border-gray-200 my-1"></div>
              </>
            )}

            {filteredDimensions.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                {searchTerm ? 'No dimensions found' : 'No dimensions available'}
              </div>
            ) : (
              <>
                {/* Available Dimensions */}
                {filteredDimensions.filter(dim => dim.availableQuantity > 0).length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-green-50 border-b border-green-200">
                      <div className="text-sm font-semibold text-green-800">
                        ✅ Available Dimensions ({filteredDimensions.filter(dim => dim.availableQuantity > 0).length})
                      </div>
                    </div>
                    {filteredDimensions
                      .filter(dim => dim.availableQuantity > 0)
                      .map((dimension) => (
                        <button
                          key={dimension._id}
                          type="button"
                          onClick={() => handleSelect(dimension)}
                          className="w-full px-4 py-3 text-left hover:bg-green-50 focus:outline-none focus:bg-green-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900 truncate">
                                  {dimension.dimension}
                                </span>
                                {showStock && getStockIcon(dimension)}
                              </div>
                              <div className="text-sm text-gray-600 truncate">
                                SKU: {dimension.sku}
                              </div>
                              {dimension.length && (
                                <div className="text-sm text-gray-500 truncate">
                                  Length: {dimension.length}
                                </div>
                              )}
                            </div>
                            {showStock && (
                              <div className="ml-4 text-right flex-shrink-0">
                                <div className="text-xs text-gray-500">
                                  <div className="text-green-600 font-semibold">
                                    Available: {dimension.availableQuantity} {inventoryItem.unit}
                                  </div>
                                  <div>
                                    Bundles: {dimension.bundles || 0}
                                  </div>
                                  <div>
                                    Total: {dimension.quantity} {inventoryItem.unit}
                                  </div>
                                  {dimension.reservedQuantity > 0 && (
                                    <div className="text-orange-600">
                                      Reserved: {dimension.reservedQuantity}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                  </>
                )}

                {/* Out of Stock Dimensions */}
                {filteredDimensions.filter(dim => dim.availableQuantity === 0).length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                      <div className="text-sm font-semibold text-red-800">
                        ❌ Out of Stock ({filteredDimensions.filter(dim => dim.availableQuantity === 0).length})
                      </div>
                    </div>
                    {filteredDimensions
                      .filter(dim => dim.availableQuantity === 0)
                      .map((dimension) => (
                        <button
                          key={dimension._id}
                          type="button"
                          onClick={() => handleSelect(dimension)}
                          className="w-full px-4 py-3 text-left hover:bg-red-50 focus:outline-none focus:bg-red-50 border-b border-gray-100 last:border-b-0 cursor-pointer opacity-75"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-700 truncate">
                                  {dimension.dimension}
                                </span>
                                {showStock && getStockIcon(dimension)}
                              </div>
                              <div className="text-sm text-gray-600 truncate">
                                SKU: {dimension.sku}
                              </div>
                              {dimension.length && (
                                <div className="text-sm text-gray-500 truncate">
                                  Length: {dimension.length}
                                </div>
                              )}
                            </div>
                            {showStock && (
                              <div className="ml-4 text-right flex-shrink-0">
                                <div className="text-xs text-gray-500">
                                  <div className="text-red-600 font-semibold">
                                    Out of Stock
                                  </div>
                                  <div>
                                    Bundles: {dimension.bundles || 0}
                                  </div>
                                  <div>
                                    Total: {dimension.quantity} {inventoryItem.unit}
                                  </div>
                                  {dimension.reservedQuantity > 0 && (
                                    <div className="text-orange-600">
                                      Reserved: {dimension.reservedQuantity}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* Clear Selection */}
          {(selectedDimension || showCustomInput) && (
            <div className="border-t border-gray-200 p-2">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                  setSearchTerm('');
                  setShowCustomInput(false);
                  if (onCustomChange) {
                    onCustomChange('');
                  }
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

export default DimensionDropdown;