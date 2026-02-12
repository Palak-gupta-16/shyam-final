import React from 'react';
import { InventoryItem, Order } from '../../types';
import Button from '../common/Button';
import Input from '../common/Input';
import { BundleDetailInput, LoadingFormState, ProductLoadForm } from '../../utils/loading';

// Loading Details Form Component
interface LoadingDetailsFormProps {
  order: Order;
  state: LoadingFormState;
  onStateChange: (nextState: LoadingFormState) => void;
}

const LoadingDetailsForm: React.FC<LoadingDetailsFormProps> = ({ order, state, onStateChange }) => {
  // State for selected sizes - one per product
  const [selectedSizes, setSelectedSizes] = React.useState<Record<number, string>>({});
  // State for quick add form
  const [quickAddForms, setQuickAddForms] = React.useState<Record<number, {
    numBundles: number;
    weight: string;
    size: string;
    length: string;
  }>>({});

  const updateProductLoads = (updater: (loads: ProductLoadForm[]) => ProductLoadForm[]) => {
    const loads = state.productLoads ?? [];
    onStateChange({
      ...state,
      productLoads: updater(loads)
    });
  };

  const handleBundleFieldChange = (
    productIndex: number,
    bundleIndex: number,
    field: keyof BundleDetailInput,
    value: string
  ) => {
    updateProductLoads((loads) =>
      loads.map((load) => {
        if (load.productIndex !== productIndex) {
          return load;
        }

        const details = load.bundleDetails ?? [];
        const nextDetails = details.map((detail, idx) =>
          idx === bundleIndex
            ? {
                ...detail,
                [field]: value
              }
            : detail
        );

        return {
          ...load,
          bundleDetails: nextDetails
        };
      })
    );
  };

  const handleAddBundle = (productIndex: number, selectedSize: string = '') => {
    updateProductLoads((loads) =>
      loads.map((load) => {
        if (load.productIndex !== productIndex) {
          return load;
        }

        const currentDetails = load.bundleDetails ?? [];
        const largestNumber = currentDetails.reduce(
          (max, detail) => Math.max(max, detail.bundleNumber ?? 0),
          0
        );

        const product = order.products[productIndex];
        const nextDetail: BundleDetailInput = {
          bundleNumber: largestNumber + 1,
          weight: '',
          size: selectedSize || product.dimensions || '',
          length: product.length !== undefined && product.length !== null ? product.length : undefined
        };

        return {
          ...load,
          bundleDetails: [...currentDetails, nextDetail]
        };
      })
    );
  };

  const handleQuickAddBundles = (productIndex: number) => {
    const quickForm = quickAddForms[productIndex];
    if (!quickForm || !quickForm.numBundles || !quickForm.weight || !quickForm.size) {
      return;
    }

    updateProductLoads((loads) =>
      loads.map((load) => {
        if (load.productIndex !== productIndex) {
          return load;
        }

        const currentDetails = load.bundleDetails ?? [];
        const largestNumber = currentDetails.reduce(
          (max, detail) => Math.max(max, detail.bundleNumber ?? 0),
          0
        );

        const product = order.products[productIndex];
        const newBundles: BundleDetailInput[] = Array.from({ length: quickForm.numBundles }).map((_, idx) => ({
          bundleNumber: largestNumber + idx + 1,
          weight: quickForm.weight,
          size: quickForm.size,
          length: quickForm.length || (product.length !== undefined && product.length !== null ? product.length : undefined)
        }));

        return {
          ...load,
          bundleDetails: [...currentDetails, ...newBundles]
        };
      })
    );

    // Reset quick add form
    setQuickAddForms(prev => ({
      ...prev,
      [productIndex]: { numBundles: 0, weight: '', size: '', length: '' }
    }));
  };

  const handleRemoveBundle = (productIndex: number, bundleIndex: number) => {
    updateProductLoads((loads) =>
      loads.map((load) => {
        if (load.productIndex !== productIndex) {
          return load;
        }

        const nextDetails = (load.bundleDetails ?? []).filter((_, idx) => idx !== bundleIndex);
        return {
          ...load,
          bundleDetails: nextDetails
        };
      })
    );
  };

  if (!state.productLoads || state.productLoads.length === 0) {
    return <div className="text-sm text-gray-500">Preparing product data...</div>;
  }

  return (
    <div className="space-y-6">
      {state.productLoads.map((load) => {
        const product = order.products[load.productIndex];
        if (!product) {
          return null;
        }

        const inventoryRef = product.inventoryItemId;
        const inventoryObject =
          inventoryRef && typeof inventoryRef === 'object'
            ? (inventoryRef as InventoryItem)
            : null;

        const productKey = inventoryObject?._id
          || (typeof inventoryRef === 'string' ? inventoryRef : `${product.name}-${load.productIndex}`);

        const skuLabel = inventoryObject?.name
          || (typeof inventoryRef === 'string' ? inventoryRef : inventoryObject?._id)
          || 'N/A';

        const recordedBundles = load.bundleDetails ? load.bundleDetails.length : 0;
        const recordedWeight = (load.bundleDetails || []).reduce((sum, detail) => {
          const weightValue = Number(detail.weight);
          return Number.isNaN(weightValue) ? sum : sum + weightValue;
        }, 0);

        const availableSizes = inventoryObject?.sizes || [];
        const selectedSizeForAdd = selectedSizes[load.productIndex] || '';
        const setSelectedSizeForAdd = (value: string) => {
          setSelectedSizes(prev => ({ ...prev, [load.productIndex]: value }));
        };

        const quickForm = quickAddForms[load.productIndex] || { numBundles: 0, weight: '', size: '', length: '' };
        const setQuickForm = (updates: Partial<typeof quickForm>) => {
          setQuickAddForms(prev => ({
            ...prev,
            [load.productIndex]: { ...quickForm, ...updates }
          }));
        };

        return (
          <div key={productKey} className="border border-gray-200 rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{product.name}</h4>
                <p className="text-sm text-gray-500">
                  SKU: {skuLabel}
                  {product.dimensions ? ` • Dimensions: ${product.dimensions}` : ''}
                  {product.length ? ` • Length: ${product.length}` : ''}
                </p>
                <p className="text-sm mt-1 text-gray-500">
                  Recorded bundles: <strong>{recordedBundles}</strong>
                </p>
                <p className="text-sm text-gray-500">
                  Total weight: <strong>{recordedWeight.toFixed(2)} kg</strong>
                </p>
              </div>
            </div>

            {/* Quick Add Multiple Bundles Section */}
            <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h5 className="text-sm font-semibold text-green-900 mb-3">Quick Add Multiple Bundles</h5>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-2">
                  <Input
                    label="# of Bundles"
                    type="number"
                    min="1"
                    value={quickForm.numBundles || ''}
                    onChange={(e) => setQuickForm({ numBundles: Number(e.target.value) })}
                    placeholder="e.g., 5"
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Size *</label>
                    <select
                      value={quickForm.size}
                      onChange={(e) => setQuickForm({ size: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Select size...</option>
                      {availableSizes.map((size: any, idx: number) => (
                        <option key={idx} value={size.dimension}>
                          {size.dimension} (Avail: {size.availableQuantity})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-2">
                  <Input
                    label="Weight (kg)"
                    type="number"
                    step="0.01"
                    value={quickForm.weight}
                    onChange={(e) => setQuickForm({ weight: e.target.value })}
                    placeholder="Per bundle"
                  />
                </div>
                <div className="col-span-12 md:col-span-2">
                  <Input
                    label="Length"
                    type="number"
                    step="0.01"
                    value={quickForm.length}
                    onChange={(e) => setQuickForm({ length: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="col-span-12 md:col-span-3 flex items-end">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleQuickAddBundles(load.productIndex)}
                    disabled={!quickForm.numBundles || !quickForm.weight || !quickForm.size}
                    className="w-full"
                  >
                    Add {quickForm.numBundles || 0} Bundles
                  </Button>
                </div>
              </div>
            </div>

            {/* Add Single Bundle Section */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <h5 className="text-sm font-semibold text-blue-900 mb-3">Add Single Bundle</h5>
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-12 md:col-span-5">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Size *</label>
                  <select
                    value={selectedSizeForAdd}
                    onChange={(e) => setSelectedSizeForAdd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select size...</option>
                    {availableSizes.map((size: any, idx: number) => (
                      <option key={idx} value={size.dimension}>
                        {size.dimension} (Available: {size.availableQuantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-12 md:col-span-7">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      handleAddBundle(load.productIndex, selectedSizeForAdd);
                      setSelectedSizeForAdd('');
                    }}
                    disabled={!selectedSizeForAdd}
                  >
                    Add Bundle with Selected Size
                  </Button>
                </div>
              </div>
            </div>

            {/* Bundles List */}
            <div className="space-y-3">
              {(load.bundleDetails || []).map((bundle, bundleIndex) => (
                <div key={`${load.productIndex}-${bundleIndex}`} className="grid grid-cols-12 gap-3 items-end p-3 border rounded-lg bg-white">
                  <div className="col-span-12 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500">Bundle #</label>
                    <div className="text-sm font-medium text-gray-900">
                      #{bundle.bundleNumber ?? bundleIndex + 1}
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <Input
                      label="Weight (kg)"
                      type="number"
                      step="0.01"
                      value={bundle.weight ?? ''}
                      onChange={(e) =>
                        handleBundleFieldChange(load.productIndex, bundleIndex, 'weight', e.target.value)
                      }
                      placeholder="Enter weight"
                    />
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Size</label>
                    <div className="text-sm font-medium text-gray-900 px-3 py-2 bg-gray-50 rounded border">
                      {bundle.size || 'N/A'}
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <Input
                      label="Length"
                      type="number"
                      step="0.01"
                      value={bundle.length ?? ''}
                      onChange={(e) =>
                        handleBundleFieldChange(load.productIndex, bundleIndex, 'length', e.target.value)
                      }
                      placeholder={
                        product.length !== undefined && product.length !== null
                          ? String(product.length)
                          : 'Length'
                      }
                    />
                  </div>
                  <div className="col-span-12 md:col-span-1 flex md:justify-end">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveBundle(load.productIndex, bundleIndex)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}

              {(load.bundleDetails?.length || 0) === 0 && (
                <div className="text-center py-6 text-gray-500 border-2 border-dashed rounded-lg">
                  <p>No bundles added yet. Use the forms above to add bundles.</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LoadingDetailsForm;
