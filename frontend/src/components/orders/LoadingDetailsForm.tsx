import React from 'react';
import { InventoryItem, Order } from '../../types';
import Button from '../common/Button';
import Input from '../common/Input';
import { BundleDetailInput, LoadingFormState, ProductLoadForm } from '../../utils/loading';

interface LoadingDetailsFormProps {
  order: Order;
  state: LoadingFormState;
  onStateChange: (nextState: LoadingFormState) => void;
}

const LoadingDetailsForm: React.FC<LoadingDetailsFormProps> = ({ order, state, onStateChange }) => {
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

  const handleAddBundle = (productIndex: number) => {
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
          size: product.dimensions || '',
          length: product.length !== undefined && product.length !== null ? product.length : undefined
        };

        return {
          ...load,
          bundleDetails: [...currentDetails, nextDetail]
        };
      })
    );
  };

  const handleRemoveBundle = (productIndex: number, bundleIndex: number) => {
    updateProductLoads((loads) =>
      loads.map((load) => {
        if (load.productIndex !== productIndex) {
          return load;
        }

        const nextDetails = (load.bundleDetails ?? []).filter((_, idx) => idx !== bundleIndex);
        if (nextDetails.length === 0) {
          return load;
        }

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

        const expectedBundles = product.quantity || 0;
        const recordedBundles = load.bundleDetails ? load.bundleDetails.length : 0;
        const recordedWeight = (load.bundleDetails || []).reduce((sum, detail) => {
          const weightValue = Number(detail.weight);
          return Number.isNaN(weightValue) ? sum : sum + weightValue;
        }, 0);

        const bundleMismatch = expectedBundles > 0 && recordedBundles !== expectedBundles;

        return (
          <div key={productKey} className="border border-gray-200 rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{product.name}</h4>
                <p className="text-sm text-gray-500">
                  SKU: {skuLabel}
                  {product.dimensions ? ` • Dimensions: ${product.dimensions}` : ''}
                  {product.length ? ` • Length: ${product.length}` : ''}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    bundleMismatch ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  Recorded bundles: {recordedBundles}
                  {expectedBundles ? ` / Expected: ${expectedBundles}` : ''}
                </p>
                <p className="text-sm text-gray-500">
                  Recorded weight: {recordedWeight.toFixed(2)} kg
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddBundle(load.productIndex)}
                >
                  Add Bundle
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {(load.bundleDetails || []).map((bundle, bundleIndex) => (
                <div key={`${load.productIndex}-${bundleIndex}`} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-12 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500">Bundle</label>
                    <div className="text-sm font-medium text-gray-900">
                      #{bundle.bundleNumber ?? bundleIndex + 1}
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <Input
                      label="Weight (kg)"
                      type="number"
                      step="0.01"
                      required
                      value={bundle.weight ?? ''}
                      onChange={(e) =>
                        handleBundleFieldChange(load.productIndex, bundleIndex, 'weight', e.target.value)
                      }
                      placeholder="Enter weight"
                    />
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <Input
                      label="Size"
                      value={bundle.size ?? ''}
                      onChange={(e) =>
                        handleBundleFieldChange(load.productIndex, bundleIndex, 'size', e.target.value)
                      }
                      placeholder={product.dimensions || 'Bundle size'}
                    />
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
                    {(load.bundleDetails?.length || 0) > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBundle(load.productIndex, bundleIndex)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LoadingDetailsForm;
