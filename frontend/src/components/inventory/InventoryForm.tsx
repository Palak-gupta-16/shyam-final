import React, { useState } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { InventoryItem, InventoryDimension } from '../../types';

interface InventoryFormProps {
  item?: InventoryItem;
  onSubmit: (data: InventoryFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export interface InventoryFormData {
  sku?: string; // Optional - will be auto-generated if not provided
  type: 'finished_product' | 'raw_material' | 'store_item' | 'waste_material';
  name: string;
  // For finished products
  dimensions?: {
    dimension: string;
    quantity: number;
    bundles: number;
    minimumStock: number;
    maxStock?: number;
  }[];
  // For raw materials and store items
  quantity?: number;
  bundles?: number;
  minimumStock?: number;
  maxStock?: number;
  unit: string;
  location?: string;
  description?: string;
  length?: number;
}

const InventoryForm: React.FC<InventoryFormProps> = ({
  item,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<InventoryFormData>({
    sku: item?.sku || '',
    type: item?.type || 'finished_product',
    name: item?.name || '',
    dimensions: item?.type === 'finished_product' ? (item?.dimensions?.map(d => ({
      dimension: d.dimension,
      quantity: d.quantity,
      bundles: d.bundles,
      minimumStock: d.minimumStock,
      maxStock: d.maxStock
    })) || [{ dimension: '', quantity: 0, bundles: 0, minimumStock: 0 }]) : undefined,
    quantity: item?.type !== 'finished_product' ? (item as any)?.quantity || 0 : undefined,
    bundles: item?.type !== 'finished_product' ? (item as any)?.bundles || 0 : undefined,
    minimumStock: item?.type !== 'finished_product' ? (item as any)?.minimumStock || 0 : undefined,
    maxStock: item?.type !== 'finished_product' ? (item as any)?.maxStock : undefined,
    unit: item?.unit || 'pieces',
    location: item?.location || '',
    description: item?.description || '',
    length: item?.length || undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // SKU is optional - will be auto-generated if not provided

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.type) {
      newErrors.type = 'Type is required';
    }

    if (formData.type === 'finished_product') {
      if (!formData.dimensions || formData.dimensions.length === 0) {
        newErrors.dimensions = 'At least one dimension is required for finished products';
      }

      formData.dimensions?.forEach((dim, index) => {
        if (!dim.dimension.trim()) {
          newErrors[`dimension_${index}`] = 'Dimension is required';
        }
        if (dim.quantity < 0) {
          newErrors[`quantity_${index}`] = 'Quantity cannot be negative';
        }
        if (dim.bundles < 0) {
          newErrors[`bundles_${index}`] = 'Bundles cannot be negative';
        }
        if (dim.minimumStock < 0) {
          newErrors[`minimumStock_${index}`] = 'Minimum stock cannot be negative';
        }
      });
    } else {
      // For raw materials and store items
      if ((formData.quantity || 0) < 0) {
        newErrors.quantity = 'Quantity cannot be negative';
      }
      if ((formData.bundles || 0) < 0) {
        newErrors.bundles = 'Bundles cannot be negative';
      }
      if ((formData.minimumStock || 0) < 0) {
        newErrors.minimumStock = 'Minimum stock cannot be negative';
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

  const handleTypeChange = (newType: 'finished_product' | 'raw_material' | 'store_item' | 'waste_material') => {
    setFormData(prev => {
      const newData: InventoryFormData = {
        ...prev,
        type: newType
      };

      if (newType === 'finished_product') {
        // Switch to dimensions
        newData.dimensions = [{ dimension: '', quantity: 0, bundles: 0, minimumStock: 0 }];
        delete newData.quantity;
        delete newData.bundles;
        delete newData.minimumStock;
        delete newData.maxStock;
      } else {
        // Switch to simple quantity
        newData.quantity = 0;
        newData.bundles = 0;
        newData.minimumStock = 0;
        delete newData.dimensions;
      }

      return newData;
    });
  };

  const addDimension = () => {
    if (formData.dimensions) {
      setFormData(prev => ({
        ...prev,
        dimensions: [...(prev.dimensions || []), { dimension: '', quantity: 0, bundles: 0, minimumStock: 0 }]
      }));
    }
  };

  const removeDimension = (index: number) => {
    if (formData.dimensions && formData.dimensions.length > 1) {
      setFormData(prev => ({
        ...prev,
        dimensions: prev.dimensions?.filter((_, i) => i !== index)
      }));
    }
  };

  const updateDimension = (index: number, field: string, value: any) => {
    if (formData.dimensions) {
      setFormData(prev => ({
        ...prev,
        dimensions: prev.dimensions?.map((dim, i) => 
          i === index ? { ...dim, [field]: value } : dim
        )
      }));
    }
  };

  const generatePreviewSku = (dimension: string) => {
    if (!dimension) return '';
    
    const dimensionSlug = dimension.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    if (formData.sku) {
      // Use provided base SKU
      return `${formData.sku}-${dimensionSlug}`;
    } else if (formData.name && formData.type) {
      // Generate preview based on auto-generation logic
      const nameSlug = formData.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 8);
      const typePrefix = formData.type.toUpperCase().substring(0, 3);
      return `${typePrefix}-${nameSlug}-001-${dimensionSlug}`;
    }
    
    return `[AUTO-GENERATED]-${dimensionSlug}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Package className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          {item ? 'Edit Inventory Item' : 'Add New Inventory Item'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base SKU (Optional)
            </label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.sku ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Leave empty to auto-generate"
              disabled={!!item} // Don't allow editing SKU for existing items
            />
            {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku}</p>}
            {!formData.sku && !item && (
              <p className="text-xs text-gray-500 mt-1">
                SKU will be auto-generated based on type and name
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value as any)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.type ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="finished_product">Finished Product</option>
              <option value="raw_material">Raw Material</option>
              <option value="store_item">Store Item</option>
              <option value="waste_material">Waste Material</option>
            </select>
            {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter item name"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., pieces, kg, mt"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Storage location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Length
            </label>
            <input
              type="number"
              value={formData.length || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, length: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Length (optional)"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Item description"
          />
        </div>

        {/* Conditional Fields Based on Type */}
        {formData.type === 'finished_product' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Dimensions</h3>
              <button
                type="button"
                onClick={addDimension}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Dimension</span>
              </button>
            </div>

            {errors.dimensions && <p className="text-red-500 text-sm mb-4">{errors.dimensions}</p>}

            <div className="space-y-4">
              {formData.dimensions?.map((dimension, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-700">Dimension {index + 1}</h4>
                  {formData.dimensions && formData.dimensions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDimension(index)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dimension *
                    </label>
                    <input
                      type="text"
                      value={dimension.dimension}
                      onChange={(e) => updateDimension(index, 'dimension', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors[`dimension_${index}`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="e.g., 12mm, Large, etc."
                    />
                    {errors[`dimension_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`dimension_${index}`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={dimension.quantity}
                      onChange={(e) => updateDimension(index, 'quantity', Number(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors[`quantity_${index}`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="0"
                    />
                    {errors[`quantity_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`quantity_${index}`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bundles
                    </label>
                    <input
                      type="number"
                      value={dimension.bundles}
                      onChange={(e) => updateDimension(index, 'bundles', Number(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors[`bundles_${index}`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="0"
                    />
                    {errors[`bundles_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`bundles_${index}`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Stock
                    </label>
                    <input
                      type="number"
                      value={dimension.minimumStock}
                      onChange={(e) => updateDimension(index, 'minimumStock', Number(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors[`minimumStock_${index}`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      min="0"
                    />
                    {errors[`minimumStock_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`minimumStock_${index}`]}</p>
                    )}
                  </div>
                </div>

                {/* Auto-generated SKU preview */}
                {dimension.dimension && (
                  <div className="mt-3 p-2 bg-gray-50 rounded border">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Auto-generated SKU:</span>{' '}
                      <span className="font-mono text-blue-600">
                        {generatePreviewSku(dimension.dimension)}
                      </span>
                    </p>
                  </div>
                )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={formData.quantity || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.quantity ? 'border-red-300' : 'border-gray-300'
                  }`}
                  min="0"
                />
                {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bundles
                </label>
                <input
                  type="number"
                  value={formData.bundles || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, bundles: Number(e.target.value) }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.bundles ? 'border-red-300' : 'border-gray-300'
                  }`}
                  min="0"
                />
                {errors.bundles && <p className="text-red-500 text-xs mt-1">{errors.bundles}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Stock
                </label>
                <input
                  type="number"
                  value={formData.minimumStock || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimumStock: Number(e.target.value) }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.minimumStock ? 'border-red-300' : 'border-gray-300'
                  }`}
                  min="0"
                />
                {errors.minimumStock && <p className="text-red-500 text-xs mt-1">{errors.minimumStock}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Stock (Optional)
                </label>
                <input
                  type="number"
                  value={formData.maxStock || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxStock: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
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
            {loading ? 'Saving...' : (item ? 'Update Item' : 'Add Item')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InventoryForm;