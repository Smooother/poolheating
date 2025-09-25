/**
 * Test script for Tuya Pulsar real-time connection
 * This script tests the Pulsar client service and API endpoints
 */

// For now, let's test the API endpoints directly since we can't import TypeScript modules
// in a Node.js script without compilation

async function testPulsarAPI() {
  console.log('🧪 Testing Tuya Pulsar API Endpoints...\n');

  const baseUrl = 'https://poolheating.vercel.app/api/pulsar-manager';
  
  try {
    // Test 1: Start Pulsar connection
    console.log('1️⃣ Testing Pulsar connection start...');
    const startResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'start' })
    });
    
    const startResult = await startResponse.json();
    console.log('Start result:', startResult);
    
    if (startResult.success) {
      console.log('✅ Pulsar connection started successfully\n');
    } else {
      console.log('❌ Failed to start Pulsar connection:', startResult.error);
      return;
    }

    // Test 2: Check status
    console.log('2️⃣ Testing status check...');
    const statusResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'status' })
    });
    
    const statusResult = await statusResponse.json();
    console.log('Status result:', statusResult);
    console.log('✅ Status check completed\n');

    // Test 3: Check health info
    console.log('3️⃣ Testing health info...');
    const healthResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'health' })
    });
    
    const healthResult = await healthResponse.json();
    console.log('Health result:', healthResult);
    console.log('✅ Health check completed\n');

    // Test 4: Wait for messages (simulation)
    console.log('4️⃣ Waiting for simulated messages...');
    console.log('⏳ Waiting 30 seconds for simulated messages...');
    
    let messageCount = 0;
    const checkInterval = setInterval(async () => {
      try {
        const statusResponse = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'status' })
        });
        
        const statusResult = await statusResponse.json();
        if (statusResult.success && statusResult.status.messageCount > messageCount) {
          console.log(`📨 New message received! Total: ${statusResult.status.messageCount}`);
          messageCount = statusResult.status.messageCount;
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    }, 5000);

    // Wait for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));
    clearInterval(checkInterval);

    // Test 5: Final status check
    console.log('\n5️⃣ Final status check...');
    const finalStatusResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'status' })
    });
    
    const finalStatusResult = await finalStatusResponse.json();
    console.log('Final status result:', finalStatusResult);
    console.log('✅ Final status check completed\n');

    // Test 6: Stop Pulsar connection
    console.log('6️⃣ Testing Pulsar connection stop...');
    const stopResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'stop' })
    });
    
    const stopResult = await stopResponse.json();
    console.log('Stop result:', stopResult);
    
    if (stopResult.success) {
      console.log('✅ Pulsar connection stopped successfully\n');
    } else {
      console.log('❌ Failed to stop Pulsar connection:', stopResult.error);
    }

    console.log('🎉 All API tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPulsarAPI().catch(console.error);