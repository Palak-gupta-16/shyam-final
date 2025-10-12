const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function testCreateDailySummary() {
  try {
    console.log('🧪 Testing Mill Daily Summary Creation\n');

    // Step 1: Login to get token
    console.log('🔐 Step 1: Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'director@shyam.com',
      password: 'Director123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Set up axios with auth header
    const authAxios = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Step 2: Get available finished products
    console.log('\n📦 Step 2: Getting finished products...');
    const finishedProductsResponse = await authAxios.get('/mill/finished-products');
    const finishedProducts = finishedProductsResponse.data.products || [];
    console.log(`Found ${finishedProducts.length} finished products`);
    
    if (finishedProducts.length === 0) {
      console.log('❌ No finished products available for testing');
      return;
    }

    const selectedProduct = finishedProducts[0];
    console.log('Selected product:', selectedProduct.name);

    // Step 3: Get available raw materials
    console.log('\n🔧 Step 3: Getting raw materials...');
    const rawMaterialsResponse = await authAxios.get('/mill/raw-materials');
    const rawMaterials = rawMaterialsResponse.data.materials || [];
    console.log(`Found ${rawMaterials.length} raw materials`);
    
    if (rawMaterials.length === 0) {
      console.log('❌ No raw materials available for testing');
      return;
    }

    const selectedRawMaterial = rawMaterials[0];
    console.log('Selected raw material:', selectedRawMaterial.name);

    // Step 4: Create daily summary
    console.log('\n🏭 Step 4: Creating daily summary...');
    
    const testData = {
      date: `2025-12-${Math.floor(Math.random() * 28) + 1}`, // Random date in December 2025
      finishedProduct: {
        inventoryItemId: selectedProduct._id,
        dimensions: [
          {
            dimension: selectedProduct.dimensions?.[0]?.dimension || '12mm x 6m',
            bundles: 5,
            quantity: 1.5
          }
        ]
      },
      rawMaterials: [
        {
          inventoryItemId: selectedRawMaterial._id,
          materialName: selectedRawMaterial.name,
          quantityUsed: 2.0,
          unit: 'mt'
        }
      ],
      wasteMaterials: [
        {
          materialName: 'Test Scrap',
          quantity: 0.1,
          unit: 'mt'
        }
      ],
      totalPieces: 100,
      totalWeight: 1.5,
      productionHours: 8,
      efficiency: 95.5,
      breakdownSummary: 'Test summary',
      remarks: 'Test remarks'
    };

    console.log('Sending data:', JSON.stringify(testData, null, 2));

    try {
      const createResponse = await authAxios.post('/mill/daily', testData);
      console.log('✅ Daily summary created successfully!');
      console.log('Response:', createResponse.data);
    } catch (error) {
      console.log('❌ Failed to create daily summary');
      console.log('Error status:', error.response?.status);
      console.log('Error message:', error.response?.data?.message);
      console.log('Error details:', error.response?.data?.error);
      console.log('Validation errors:', error.response?.data?.errors);
      if (error.response?.data?.details) {
        console.log('Stack trace:', error.response.data.details);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

// Run the test
testCreateDailySummary();