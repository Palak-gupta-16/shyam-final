import { Order, LoadingCompletePayload } from '../types';

export interface BundleDetailInput {
  bundleNumber?: number;
  weight?: number | string;
  size?: string;
  length?: number | string;
}

export interface ProductLoadForm {
  productIndex: number;
  bundleDetails: BundleDetailInput[];
}

export interface LoadingFormState {
  productLoads: ProductLoadForm[];
  notes?: string;
}

export interface LoadingPayloadBuildResult {
  payload?: LoadingCompletePayload;
  errors?: string[];
}

export const createInitialLoadingFormState = (order: Order): LoadingFormState => {
  const productLoads = order.products.map((product, index) => {
    // Start with empty bundleDetails - user will add them manually
    return {
      productIndex: index,
      bundleDetails: []
    };
  });

  return {
    productLoads,
    notes: ''
  };
};

export const buildLoadingPayload = (
  order: Order,
  state: LoadingFormState
): LoadingPayloadBuildResult => {
  if (!state.productLoads || state.productLoads.length === 0) {
    return {
      errors: ['Please provide bundle information for all products before completing loading.']
    };
  }

  const errors: string[] = [];
  const payloadLoads: LoadingCompletePayload['productLoads'] = [];

  let totalBundles = 0;
  let totalWeight = 0;

  order.products.forEach((product, index) => {
    const loadEntry = state.productLoads.find((load) => load.productIndex === index);
    if (!loadEntry) {
      errors.push(`No bundle details provided for ${product.name}.`);
      return;
    }

    if (!Array.isArray(loadEntry.bundleDetails) || loadEntry.bundleDetails.length === 0) {
      errors.push(`Add at least one bundle entry for ${product.name}.`);
      return;
    }

    const sanitizedBundles: LoadingCompletePayload['productLoads'][number]['bundleDetails'] = [];
    let productWeight = 0;

    loadEntry.bundleDetails.forEach((bundle, bundleIndex) => {
      const weightValue = Number(bundle.weight);
      if (Number.isNaN(weightValue) || weightValue <= 0) {
        errors.push(`Bundle ${bundleIndex + 1} for ${product.name} must have a valid weight.`);
        return;
      }

      let lengthValue: number | undefined;
      if (bundle.length !== undefined && bundle.length !== null && bundle.length !== '') {
        const parsedLength = Number(bundle.length);
        if (Number.isNaN(parsedLength) || parsedLength < 0) {
          errors.push(`Bundle ${bundleIndex + 1} for ${product.name} must have a positive length.`);
          return;
        }
        lengthValue = Number(parsedLength.toFixed(3));
      }

      const sanitizedBundle = {
        bundleNumber: bundle.bundleNumber ?? bundleIndex + 1,
        weight: Number(weightValue.toFixed(3))
      } as LoadingCompletePayload['productLoads'][number]['bundleDetails'][number];

      const sizeValue = typeof bundle.size === 'string' ? bundle.size.trim() : '';
      if (sizeValue) {
        sanitizedBundle.size = sizeValue;
      }

      if (lengthValue !== undefined) {
        sanitizedBundle.length = lengthValue;
      }

      sanitizedBundles.push(sanitizedBundle);
      productWeight += weightValue;
    });

    if (sanitizedBundles.length === 0) {
      return;
    }

    if (product.quantity && sanitizedBundles.length !== product.quantity) {
      errors.push(
        `${product.name} expects ${product.quantity} bundle entries but ${sanitizedBundles.length} were provided.`
      );
    }

    const bundleCount = sanitizedBundles.length;
    totalBundles += bundleCount;
    totalWeight += productWeight;

    payloadLoads.push({
      productIndex: index,
      bundles: bundleCount,
      totalWeight: Number(productWeight.toFixed(3)),
      weightPerBundle: bundleCount > 0 ? Number((productWeight / bundleCount).toFixed(3)) : undefined,
      bundleDetails: sanitizedBundles
    });
  });

  if (errors.length > 0) {
    return { errors };
  }

  const payload: LoadingCompletePayload = {
    bundles: totalBundles,
    totalLoadedWeight: Number(totalWeight.toFixed(3)),
    averageWeightPerBundle: totalBundles > 0 ? Number((totalWeight / totalBundles).toFixed(3)) : undefined,
    productLoads: payloadLoads
  };

  const trimmedNotes = typeof state.notes === 'string' ? state.notes.trim() : '';
  if (trimmedNotes) {
    payload.notes = trimmedNotes;
  }

  return { payload };
};
