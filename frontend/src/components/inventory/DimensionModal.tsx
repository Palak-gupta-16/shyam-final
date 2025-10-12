import React, { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import { InventoryItem, InventoryDimension } from '../../types';

interface DimensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem;
  dimension?: InventoryDimension;
  onSubmit: (data: DimensionFormData) => void;
  loading?: boolean;
}

export interface DimensionFormData {
  dimension: string;
  quantity: number;
  bundles: number;
  minimumStock: number;
  maxStock?: number;
  action?: 'set' | 'add' | 'subtract';
}

const DimensionModal: React.FC<DimensionModalProps> = ({
  isOpen,
  onClose,
  item,
  dimension,
  onSubmit,
  loading = false
}) => {
  const [formData, setFormData] = useState<DimensionFormData>({
    dimension: '',
    quantity: 0,
    bundles: 0,
    minimumStock: 0,
    maxStock: undefined,
    action: 'set'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (dimension) {
      setFormData({
        dimension: dimension.dimension,
        quantity: dimension.quantity,
        bundles: dimension.bundles,
        minimumStock: dimension.minimumStock,
        maxStock: dimension.maxStock,
        action: 'set'
      });
    } else {
      setFormData({
        dimension: '',
        quantity: 0,
        bundles: 0,
        minimumStock: 0,
        maxStock: undefined,
        action: 'set'
      });
    }
    setErrors({});
  }, [dimension, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.dimension.trim()) {
      newErrors.dimension = 'Dimension is required';
    }

    if (formData.quantity < 0) {
      newErrors.quantity = 'Quantity cannot be negative';
    }

    if (formData.bundles < 0) {
      newErrors.bundles = 'Bundles cannot be negative';
    }

    if (formData.minimumStock < 0) {
      newErrors.minimumStock = 'Minimum stock cannot be negative';
    }

    if (formData.maxStock !== undefined && formData.maxStock < 0) {
      newErrors.maxStock = 'Maximum stock cannot be negative';
    }

    if (formData.maxStock !== undefined && formData.maxStock < formData.minimumStock) {
      newErrors.maxStock = 'Maximum stock cannot be less than minimum stock';
    }

    // Check for duplicate dimension name (only for new dimensions)
    if (!dimension && item.dimensions) {
      const existingDimension = item.dimensions.find(d => 
        d.dimension.toLowerCase() === formData.dimension.toLowerCase()
      );
      if (existingDimension) {
        newErrors.dimension = 'This dimension already exists for this item';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const generatePreviewSku = () => {
    if (!formData.dimension) return '';
    const dimensionSlug = formData.dimension.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    if (item.sku) {
      return `${item.sku}-${dimensionSlug}`;
    } else {
      // If base SKU is not set, it will be auto-generated
      return `[BASE-SKU-AUTO-GENERATED]-${dimensionSlug}`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {dimension ? 'Edit Dimension' : 'Add New Dimension'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Item Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-gray-900">{item.name}</div>
            <div className="text-xs text-gray-500">Base SKU: {item.sku}</div>
          </div>

          {/* Dimension Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dimension *
            </label>
            <input
              type="text"
              value={formData.dimension}
              onChange={(e) => setFormData(prev => ({ ...prev, dimension: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.dimension ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., 12mm, Large, etc."
              disabled={!!dimension} // Don't allow editing dimension name for existing dimensions
            />
            {errors.dimension && <p className="text-red-500 text-xs mt-1">{errors.dimension}</p>}
          </div>

          {/* Auto-generated SKU preview */}
          {formData.dimension && (
            <div className="p-2 bg-blue-50 rounded border">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Auto-generated SKU:</span>{' '}
                <span className="font-mono text-blue-600">
                  {generatePreviewSku()}
                </span>
              </p>
            </div>
          )}

          {/* Quantity Update Section */}
          {dimension && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Update Action
              </label>
              <select
                value={formData.action}
                onChange={(e) => setFormData(prev => ({ ...prev, action: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="set">Set to exact quantity</option>
                <option value="add">Add to current quantity</option>
                <option value="subtract">Subtract from current quantity</option>
              </select>
            </div>
          )}

          {/* Current Stock Info (for existing dimensions) */}
          {dimension && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-700">
                <div>Current Quantity: {dimension.quantity} {item.unit}</div>
                <div>Available: {dimension.availableQuantity} {item.unit}</div>
                {dimension.reservedQuantity > 0 && (
                  <div className="text-orange-600">Reserved: {dimension.reservedQuantity} {item.unit}</div>
                )}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {dimension && formData.action !== 'set' 
                ? `Quantity to ${formData.action}` 
                : 'Quantity'
              }
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.quantity ? 'border-red-300' : 'border-gray-300'
              }`}
              min="0"
            />
            {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
          </div>

          {/* Bundles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bundles
            </label>
            <input
              type="number"
              value={formData.bundles}
              onChange={(e) => setFormData(prev => ({ ...prev, bundles: Number(e.target.value) }))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.bundles ? 'border-red-300' : 'border-gray-300'
              }`}
              min="0"
            />
            {errors.bundles && <p className="text-red-500 text-xs mt-1">{errors.bundles}</p>}
          </div>

          {/* Minimum Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Stock
            </label>
            <input
              type="number"
              value={formData.minimumStock}
              onChange={(e) => setFormData(prev => ({ ...prev, minimumStock: Number(e.target.value) }))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.minimumStock ? 'border-red-300' : 'border-gray-300'
              }`}
              min="0"
            />
            {errors.minimumStock && <p className="text-red-500 text-xs mt-1">{errors.minimumStock}</p>}
          </div>

          {/* Maximum Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Stock (Optional)
            </label>
            <input
              type="number"
              value={formData.maxStock || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                maxStock: e.target.value ? Number(e.target.value) : undefined 
              }))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.maxStock ? 'border-red-300' : 'border-gray-300'
              }`}
              min="0"
            />
            {errors.maxStock && <p className="text-red-500 text-xs mt-1">{errors.maxStock}</p>}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (dimension ? 'Update Dimension' : 'Add Dimension')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DimensionModal;