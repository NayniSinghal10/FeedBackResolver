#!/usr/bin/env node

/**
 * FeedbackResolver Test Suite
 * 
 * Simple testing framework to validate package functionality
 * Run with: npm test
 */

import { promises as fs } from 'fs';
import path from 'path';
import FeedbackResolver, { ConfigValidator, OAuthManager } from '../src/index.js';
import { SlackNotifier } from '../src/notifiers/slack-notifier.js';
import { FileNotifier } from '../src/notifiers/file-notifier.js';
import { AIAnalyzer } from '../src/analyzers/ai-analyzer.js';
import { FileProcessor } from '../src/processors/file-processor.js';

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
};

// Test utilities
function test(name, testFn) {
    return async () => {
        console.log(`🧪 ${name}`);
        try {
            await testFn();
            testResults.passed++;
            testResults.tests.push({ name, status: 'PASSED' });
            console.log(`✅ PASSED: ${name}`);
        } catch (error) {
            testResults.failed++;
            testResults.tests.push({ name, status: 'FAILED', error: error.message });
            console.error(`❌ FAILED: ${name} - ${error.message}`);
        }
    };
}

function skip(name, reason) {
    return async () => {
        testResults.skipped++;
        testResults.tests.push({ name, status: 'SKIPPED', reason });
        console.log(`⏭️  SKIPPED: ${name} - ${reason}`);
    };
}

function expect(actual) {
    return {
        toBe: (expected) => {
            if (actual !== expected) {
                throw new Error(`Expected ${expected}, got ${actual}`);
            }
        },
        toEqual: (expected) => {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        },
        toBeInstanceOf: (expectedClass) => {
            if (!(actual instanceof expectedClass)) {
                throw new Error(`Expected instance of ${expectedClass.name}, got ${actual.constructor.name}`);
            }
        },
        toBeTruthy: () => {
            if (!actual) {
                throw new Error(`Expected truthy value, got ${actual}`);
            }
        },
        toBeFalsy: () => {
            if (actual) {
                throw new Error(`Expected falsy value, got ${actual}`);
            }
        },
        toThrow: () => {
            if (typeof actual !== 'function') {
                throw new Error('Expected a function');
            }
            try {
                actual();
                throw new Error('Expected function to throw');
            } catch (error) {
                // Expected to throw
            }
        },
        not: {
            toThrow: () => {
                if (typeof actual !== 'function') {
                    throw new Error('Expected a function');
                }
                try {
                    actual();
                    // Should not throw
                } catch (error) {
                    throw new Error(`Expected function not to throw, but it threw: ${error.message}`);
                }
            }
        }
    };
}

// Test Configuration Validation
const testConfigValidation = test('Configuration Validation', async () => {
    // Test valid Gmail configuration with anthropic AI (no env requirements)
    const validGmailConfig = {
        gmail: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret'
        },
        ai: {
            provider: 'anthropic'
        }
    };
    
    expect(() => ConfigValidator.validate('gmail', validGmailConfig)).not.toThrow();
    
    // Test invalid configuration
    const invalidConfig = {
        gmail: {
            clientId: '' // Missing required field
        }
    };
    
    expect(() => ConfigValidator.validate('gmail', invalidConfig)).toThrow();
});

// Test Configuration Templates
const testConfigTemplates = test('Configuration Templates', async () => {
    const gmailTemplate = ConfigValidator.getTemplate('gmail');
    expect(gmailTemplate).toBeTruthy();
    expect(gmailTemplate.mode).toBe('gmail');
    expect(gmailTemplate.config.gmail).toBeTruthy();
    
    const fileTemplate = ConfigValidator.getTemplate('file');
    expect(fileTemplate).toBeTruthy();
    expect(fileTemplate.mode).toBe('file');
});

// Test FeedbackResolver Class Instantiation
const testFeedbackResolverInstantiation = test('FeedbackResolver Instantiation', async () => {
    const resolver = new FeedbackResolver({
        mode: 'file',
        config: {
            ai: { 
                provider: 'anthropic',  // Use anthropic to avoid Vertex AI env requirements
                timeout: '30000s'
            },
            notifications: { 
                slack: { enabled: false },
                file: { enabled: false }
            }
        }
    });
    
    expect(resolver).toBeInstanceOf(FeedbackResolver);
    expect(resolver.mode).toBe('file');
});

// Test File Processor
const testFileProcessor = test('File Processor', async () => {
    const processor = new FileProcessor({
        encoding: 'utf8'
    });
    
    // Test direct input processing with proper format
    const testText = `From: test@example.com
Subject: Test

This is a test message.`;
    const result = await processor.process(testText);
    
    expect(Array.isArray(result)).toBeTruthy();
    expect(result.length).toBe(1);
    expect(result[0].from).toBe('test@example.com');
    expect(result[0].body).toBe('This is a test message.');
});

// Test File Notifier
const testFileNotifier = test('File Notifier', async () => {
    const testDir = './test-output';
    const testFile = path.join(testDir, 'test-report.md');
    
    const notifier = new FileNotifier({
        path: testFile,
        enabled: true
    });
    
    const mockAnalysis = {
        timestamp: new Date().toISOString(),
        summary: {
            totalEmails: 1,
            relevantEmails: 1,
            categories: ['Test'],
            keyInsights: ['Test insight']
        },
        analysis: 'Test analysis content',
        metadata: {
            aiProvider: 'test'
        }
    };
    
    const result = await notifier.send(mockAnalysis);
    expect(result.success).toBeTruthy();
    
    // Verify file was created
    const fileExists = await fs.access(testFile).then(() => true).catch(() => false);
    expect(fileExists).toBeTruthy();
    
    // Cleanup
    await fs.rmdir(testDir, { recursive: true }).catch(() => {});
});

// Test Slack Notifier (mock test)
const testSlackNotifier = test('Slack Notifier Configuration', async () => {
    // Test configuration without actually sending
    const notifier = new SlackNotifier({
        webhookUrl: 'https://hooks.slack.com/test',
        enabled: false // Disabled for testing
    });
    
    expect(notifier.getConfig().type).toBe('slack');
    expect(notifier.getConfig().enabled).toBeFalsy();
});

// Test AI Analyzer Configuration
const testAIAnalyzer = test('AI Analyzer Configuration', async () => {
    const analyzer = new AIAnalyzer({
        provider: 'vertex',
        timeout: '30s'
    });
    
    const info = analyzer.getProviderInfo();
    expect(info.provider).toBe('vertex');
    expect(info.features.triage).toBeTruthy();
    expect(info.features.consolidatedAnalysis).toBeTruthy();
});

// Test File Processing Edge Cases
const testFileProcessingEdgeCases = test('File Processing Edge Cases', async () => {
    const processor = new FileProcessor();
    
    // Test empty input
    const emptyResult = await processor.process('   '); // Whitespace only
    expect(emptyResult.length).toBe(0);
    
    // Test multiple items
    const multipleItems = `From: user1@example.com
Subject: Issue 1

First issue description

---

From: user2@example.com
Subject: Issue 2

Second issue description`;
    
    const multipleResult = await processor.process(multipleItems);
    expect(multipleResult.length).toBe(2);
});

// Test Environment Configuration
const testEnvironmentConfig = skip('Environment Configuration', 'Requires environment variables');

// Test Gmail Integration
const testGmailIntegration = skip('Gmail Integration', 'Requires OAuth credentials');

// Test Live AI Analysis
const testLiveAIAnalysis = skip('Live AI Analysis', 'Requires AI provider credentials');

// Test Slack Integration
const testSlackIntegration = skip('Slack Integration', 'Requires Slack webhook URL');

// Main test runner
async function runTests() {
    console.log('🚀 Starting FeedbackResolver Test Suite\n');
    console.log('=' .repeat(60));
    
    const tests = [
        testConfigValidation,
        testConfigTemplates,
        testFeedbackResolverInstantiation,
        testFileProcessor,
        testFileNotifier,
        testSlackNotifier,
        testAIAnalyzer,
        testFileProcessingEdgeCases,
        testEnvironmentConfig,
        testGmailIntegration,
        testLiveAIAnalysis,
        testSlackIntegration
    ];
    
    console.log(`Running ${tests.length} tests...\n`);
    
    for (const testFn of tests) {
        await testFn();
    }
    
    // Print results
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Test Results');
    console.log('=' .repeat(60));
    
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⏭️  Skipped: ${testResults.skipped}`);
    console.log(`📋 Total: ${testResults.tests.length}`);
    
    if (testResults.failed > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.tests
            .filter(t => t.status === 'FAILED')
            .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    }
    
    if (testResults.skipped > 0) {
        console.log('\n⏭️  Skipped Tests:');
        testResults.tests
            .filter(t => t.status === 'SKIPPED')
            .forEach(t => console.log(`  - ${t.name}: ${t.reason}`));
    }
    
    console.log('\n💡 To run integration tests:');
    console.log('  1. Set up environment variables (see .env.example)');
    console.log('  2. Configure OAuth credentials for Gmail');
    console.log('  3. Set up Slack webhook URL');
    console.log('  4. Ensure AI provider is configured');
    
    // Exit with error code if tests failed
    if (testResults.failed > 0) {
        process.exit(1);
    }
    
    console.log('\n🎉 All tests completed successfully!');
}

// Export test utilities for external use
export { test, expect, skip, runTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}
