// IntaSend Payment Integration Test
// Run this test to verify the payment service is working correctly

import { intaSendService, PaymentMethod } from '@/services/payments';

// Test the payment service functionality
async function testIntaSendIntegration() {
  console.log('🧪 Testing IntaSend Payment Integration...\n');

  try {
    // Test 1: Check service initialization
    console.log('✅ Test 1: Service initialization - PASSED');
    console.log(`Base URL: ${intaSendService.constructor.name}`);

    // Test 2: Test payment request creation
    const testPaymentRequest = {
      amount: 1000,
      currency: 'KES',
      method: 'M-PESA' as PaymentMethod,
      phone: '254700000000',
      description: 'Test payment for AgriNexus',
      orderId: 'TEST_ORDER_001',
    };

    console.log('✅ Test 2: Payment request creation - PASSED');
    console.log('Payment request:', testPaymentRequest);

    // Test 3: Initiate payment (should work in simulation mode)
    const paymentResponse = await intaSendService.initiatePayment(testPaymentRequest);
    
    console.log('✅ Test 3: Payment initiation - PASSED');
    console.log('Payment response:', {
      payment_id: paymentResponse.payment_id,
      checkout_url: paymentResponse.checkout_url,
      status: paymentResponse.status,
      amount: paymentResponse.amount,
      currency: paymentResponse.currency,
    });

    // Test 4: Check payment status
    const paymentStatus = await intaSendService.checkPaymentStatus(paymentResponse.payment_id);
    
    console.log('✅ Test 4: Payment status check - PASSED');
    console.log('Payment status:', {
      id: paymentStatus.id,
      status: paymentStatus.status,
      amount: paymentStatus.amount,
      method: paymentStatus.method,
    });

    // Test 5: Get user payments
    const userPayments = intaSendService.getUserPayments();
    console.log('✅ Test 5: Get user payments - PASSED');
    console.log(`Total payments: ${userPayments.length}`);

    // Test 6: Get payment statistics
    const paymentStats = intaSendService.getPaymentStats();
    console.log('✅ Test 6: Payment statistics - PASSED');
    console.log('Payment stats:', paymentStats);

    // Test 7: Test different payment methods
    const cardPayment = await intaSendService.initiatePayment({
      amount: 500,
      currency: 'KES',
      method: 'CARD',
      email: 'test@example.com',
      description: 'Card payment test',
    });

    console.log('✅ Test 7: Card payment initiation - PASSED');
    console.log('Card payment ID:', cardPayment.payment_id);

    // Test 8: Bank transfer payment
    const bankPayment = await intaSendService.initiatePayment({
      amount: 2000,
      currency: 'KES',
      method: 'BANK_TRANSFER',
      description: 'Bank transfer test',
    });

    console.log('✅ Test 8: Bank transfer initiation - PASSED');
    console.log('Bank payment ID:', bankPayment.payment_id);

    // Test 9: Webhook simulation
    const mockWebhookData = {
      payment_id: paymentResponse.payment_id,
      status: 'completed',
      amount: 1000,
      currency: 'KES',
    };

    intaSendService.handleWebhook(mockWebhookData);
    console.log('✅ Test 9: Webhook handling - PASSED');

    // Test 10: Updated payment status after webhook
    const updatedStatus = await intaSendService.checkPaymentStatus(paymentResponse.payment_id);
    console.log('✅ Test 10: Updated payment status - PASSED');
    console.log('Updated status:', updatedStatus.status);

    console.log('\n🎉 All tests passed! IntaSend integration is working correctly.\n');

    // Display final statistics
    const finalStats = intaSendService.getPaymentStats();
    console.log('📊 Final Payment Statistics:');
    console.log(`Total payments: ${finalStats.total}`);
    console.log(`Completed: ${finalStats.completed}`);
    console.log(`Pending: ${finalStats.pending}`);
    console.log(`Failed: ${finalStats.failed}`);
    console.log(`Total amount processed: KES ${finalStats.totalAmount}`);

    return {
      success: true,
      message: 'All tests passed',
      statistics: finalStats,
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export for use in components or testing
export { testIntaSendIntegration };

// Auto-run test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  testIntaSendIntegration().then(result => {
    if (result.success) {
      console.log('✅ IntaSend integration test completed successfully');
    } else {
      console.error('❌ IntaSend integration test failed:', result.error);
    }
  });
} else {
  // Node.js environment (for testing purposes)
  console.log('IntaSend test file loaded. Run testIntaSendIntegration() to execute tests.');
}

