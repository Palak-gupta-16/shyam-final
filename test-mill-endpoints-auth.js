const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function testMillEndpointsWithAuth() {
  try {
    console.log('🧪 Testing Mill Endpoints with Authentication\n');

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

    // Test 2: Get raw materials
    console.log('\n📦 Test 2: Getting raw materials');
    try {
      const rawMaterialsResponse = await authAxios.get('/mill/raw-materials');
      console.log('✅ Raw materials endpoint working');
      console.log(`   Found ${rawMaterialsResponse.data.materials?.length || 0} raw materials`);
      if (rawMaterialsResponse.data.materials?.length > 0) {
        console.log('   Sample materials:');
        rawMaterialsResponse.data.materials.slice(0, 3).forEach(material => {
          console.log(`   - ${material.name} (${material.status}) - ${material.availableQuantity || 0} ${material.unit}`);
        });
      }
    } catch (error) {
      console.log('❌ Raw materials endpoint failed:', error.response?.data?.message || error.message);
    }

    // Test 3: Get finished products
    console.log('\n🏭 Test 3: Getting finished products');
    try {
      const finishedProductsResponse = await authAxios.get('/mill/finished-products');
      console.log('✅ Finished products endpoint working');
      console.log(`   Found ${finishedProductsResponse.data.products?.length || 0} finished products`);
      if (finishedProductsResponse.data.products?.length > 0) {
        console.log('   Sample products:');
        finishedProductsResponse.data.products.slice(0, 3).forEach(product => {
          console.log(`   - ${product.name} (${product.status}) - ${product.availableQuantity || 0} ${product.unit}`);
          if (product.dimensions && product.dimensions.length > 0) {
            console.log(`     Dimensions: ${product.dimensions.map(d => d.dimension).join(', ')}`);
          }
        });
      }
    } catch (error) {
      console.log('❌ Finished products endpoint failed:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 Mill endpoints test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

// Run the test
testMillEndpointsWithAuth();