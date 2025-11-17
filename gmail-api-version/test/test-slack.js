import SlackNotifier from '../slack-notifier.js';

async function testSlackConnection() {
    console.log('🧪 Testing Slack connection...');
    
    const slackNotifier = new SlackNotifier();
    
    try {
        const result = await slackNotifier.testConnection();
        
        if (result.success) {
            console.log('✅ SUCCESS:', result.message);
            console.log('🎉 Slack integration is working perfectly!');
        } else {
            console.log('❌ FAILED:', result.error || result.reason);
        }
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

testSlackConnection();
