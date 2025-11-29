#!/usr/bin/env node

/**
 * Basic Usage Example for FeedbackResolver
 * 
 * This example demonstrates the most common usage patterns
 * for the FeedbackResolver npm package.
 */

import FeedbackResolver from '../src/index.js';

async function basicGmailExample() {
    console.log('📧 Example 1: Basic Gmail Integration\n');
    
    try {
        // Initialize with Gmail mode
        const resolver = new FeedbackResolver({
            mode: 'gmail',
            config: {
                gmail: {
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    targetEmail: 'support@example.com', // Optional: specific email to monitor
                    daysToSearch: 7,
                    maxResults: 10
                },
                ai: {
                    provider: 'vertex'
                },
                notifications: {
                    slack: {
                        enabled: false // Disable for this example
                    },
                    file: {
                        enabled: true,
                        path: './example-report.md'
                    }
                }
            }
        });
        
        // Authenticate (automated OAuth flow)
        console.log('🔐 Authenticating with Gmail...');
        await resolver.authenticate();
        
        // Analyze feedback
        console.log('🔍 Analyzing feedback...');
        const result = await resolver.analyze();
        
        console.log('✅ Analysis complete!');
        console.log(`📊 Results: ${result.emails} emails processed, ${result.analysis.summary.relevantEmails} relevant`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function fileProcessingExample() {
    console.log('\n📄 Example 2: File Processing Mode\n');
    
    try {
        // Initialize with file mode
        const resolver = new FeedbackResolver({
            mode: 'file',
            config: {
                file: {
                    path: './sample-feedback.txt'
                },
                ai: {
                    provider: 'vertex'
                },
                notifications: {
                    file: {
                        enabled: true,
                        path: './file-analysis-report.md'
                    }
                }
            }
        });
        
        // Create sample feedback file
        console.log('📝 Creating sample feedback...');
        const sampleFeedback = `
Subject: Bug Report - Login Issue
From: user@example.com

Hi team,

I'm experiencing a bug with the login system. When I try to log in with my credentials, 
the system shows "Invalid credentials" even though I'm sure my password is correct.
This started happening yesterday after the update.

Steps to reproduce:
1. Go to login page
2. Enter correct username and password
3. Click login button
4. Error message appears

Could you please investigate this issue?

Thanks,
John Doe

---

Subject: Feature Request - Dark Mode
From: developer@example.com

Hello,

I would like to request a dark mode feature for the application. Many users prefer 
dark interfaces, especially when working late at night. This would be a great 
addition to improve user experience.

Best regards,
Sarah Wilson
        `;
        
        await import('fs').then(fs => fs.promises.writeFile('./sample-feedback.txt', sampleFeedback));
        
        // Analyze the file content
        console.log('🔍 Analyzing file content...');
        const result = await resolver.analyze();
        
        console.log('✅ File analysis complete!');
        console.log(`📊 Results: ${result.emails} items processed, ${result.analysis.summary.relevantEmails} relevant`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function directInputExample() {
    console.log('\n💬 Example 3: Direct Text Input\n');
    
    try {
        const resolver = new FeedbackResolver({
            mode: 'file',
            config: {
                ai: {
                    provider: 'vertex'
                },
                notifications: {
                    file: { enabled: false },
                    slack: { enabled: false }
                }
            }
        });
        
        const feedback = `
        From: customer@company.com
        Subject: Integration Issues
        
        We're having trouble integrating your API with our system. 
        The webhook callbacks are not working as expected, and we're 
        getting timeout errors. Can you help us resolve this?
        `;
        
        console.log('🔍 Analyzing direct input...');
        const result = await resolver.analyze(feedback);
        
        console.log('✅ Direct input analysis complete!');
        console.log('📋 Analysis preview:');
        console.log(result.analysis.analysis.substring(0, 200) + '...');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function environmentConfigExample() {
    console.log('\n🌍 Example 4: Environment-based Configuration\n');
    
    try {
        // This reads configuration from environment variables
        const resolver = FeedbackResolver.fromEnv();
        
        console.log('📋 Configuration loaded from environment');
        console.log(`Mode: ${resolver.mode}`);
        console.log('Config loaded from environment variables');
        
        // Note: This requires environment variables to be set
        console.log('💡 To use this example, set the following environment variables:');
        console.log('  - FEEDBACK_RESOLVER_MODE=gmail');
        console.log('  - GOOGLE_CLIENT_ID=your-client-id');
        console.log('  - GOOGLE_CLIENT_SECRET=your-client-secret');
        console.log('  - NEUROLINK_DEFAULT_PROVIDER=vertex');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('💡 Make sure environment variables are set (see .env.example)');
    }
}

async function eventListenerExample() {
    console.log('\n🎧 Example 5: Event Listeners\n');
    
    try {
        const resolver = new FeedbackResolver({
            mode: 'file',
            config: {
                ai: { provider: 'vertex' }
            }
        });
        
        // Set up event listeners
        resolver.on('authenticationStarted', (data) => {
            console.log(`🔐 Authentication started for ${data.mode} mode`);
        });
        
        resolver.on('authenticationCompleted', (data) => {
            console.log(`✅ Authentication completed for ${data.mode} mode`);
        });
        
        resolver.on('analysisStarted', (data) => {
            console.log(`🔍 Analysis started for ${data.mode} mode`);
        });
        
        resolver.on('emailsProcessed', (data) => {
            console.log(`📧 Processed ${data.count} emails`);
        });
        
        resolver.on('analysisCompleted', (data) => {
            console.log(`✅ Analysis completed with ${data.analysis.summary.relevantEmails} relevant emails`);
        });
        
        resolver.on('processComplete', (data) => {
            console.log(`🎉 Process complete! Report generated at ${data.timestamp}`);
        });
        
        // Run a simple analysis to trigger events
        const sampleText = 'This is a sample feedback message for testing events.';
        await resolver.analyze(sampleText);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Main execution
async function runExamples() {
    console.log('🚀 FeedbackResolver Usage Examples\n');
    console.log('=' .repeat(50));
    
    try {
        // Check if environment variables are set for Gmail examples
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
            await basicGmailExample();
        } else {
            console.log('⚠️  Skipping Gmail example - set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to run');
        }
        
        await fileProcessingExample();
        await directInputExample();
        await environmentConfigExample();
        await eventListenerExample();
        
        console.log('\n🎯 Examples completed!');
        console.log('\n📚 For more information:');
        console.log('  - Check the documentation in the README');
        console.log('  - Run: feedback-resolver --help');
        console.log('  - Visit: https://github.com/NayniSinghal10/FeedBackResolver');
        
    } catch (error) {
        console.error('❌ Example failed:', error.message);
    } finally {
        // Cleanup sample files
        try {
            const fs = await import('fs');
            await fs.promises.unlink('./sample-feedback.txt').catch(() => {});
            await fs.promises.unlink('./example-report.md').catch(() => {});
            await fs.promises.unlink('./file-analysis-report.md').catch(() => {});
        } catch (error) {
            // Ignore cleanup errors
        }
    }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runExamples().catch(console.error);
}

export { 
    basicGmailExample, 
    fileProcessingExample, 
    directInputExample,
    environmentConfigExample,
    eventListenerExample 
};
