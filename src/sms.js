/**
 * Mock SMS Service
 * In a real-world scenario, you would initialize a Twilio client here
 * e.g., const client = require('twilio')(accountSid, authToken);
 */

const sendSMS = async (to, body) => {
  return new Promise((resolve) => {
    console.log(`\n======================================`);
    console.log(`📱 MOCK SMS SENT`);
    console.log(`To: ${to}`);
    console.log(`Message: ${body}`);
    console.log(`======================================\n`);
    
    // Simulate network delay
    setTimeout(() => {
      resolve({ success: true, messageId: 'mock-id-' + Math.random().toString(36).substring(7) });
    }, 500);
  });
};

module.exports = { sendSMS };
