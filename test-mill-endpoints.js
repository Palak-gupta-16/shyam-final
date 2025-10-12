const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function testMillEndpoints() {
  try {
    console.log('🧪 Testing Mill Endpoints\n');

    // Test 1: Get raw materials
    console.log('📦 Test 1: Getting raw materials');
    try {
      const rawMaterialsResponse = await axios.get(`${BASE_URL}/mill/raw-materials`);
      console.log('✅ Raw materials endpoint working');
      console.log(`   Found ${rawMaterialsResponse.data.materials?.length || 0} raw materials`);
      if (rawMaterialsResponse.data.materials?.length > 0) {
        console.log('   Sample:', rawMaterialsResponse.data.materials[0].name);
      }
    } catch (error) {
      console.log('❌ Raw materials endpoint failed:', error.response?.data?.message || error.message);
    }

    // Test 2: Get finished products
    console.log('\n🏭 Test 2: Getting finished products');
    try {
      const finishedProductsResponse = await axios.get(`${BASE_URL}/mill/finished-products`);
      console.log('✅ Finished products endpoint working');
      console.log(`   Found ${finishedProductsResponse.data.products?.length || 0} finished products`);
      if (finishedProductsResponse.data.products?.length > 0) {
        console.log('   Sample:', finishedProductsResponse.data.products[0].name);
      }
    } catch (error) {
      console.log('❌ Finished products endpoint failed:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 Mill endpoints test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testMillEndpoints();