/**
 * Processors Module Exports
 * 
 * This module exports all available processors for different input types
 */

export { GmailProcessor } from './gmail-processor.js';
export { FileProcessor } from './file-processor.js';

// Re-export for convenience
export default {
    GmailProcessor: () => import('./gmail-processor.js').then(m => m.GmailProcessor),
    FileProcessor: () => import('./file-processor.js').then(m => m.FileProcessor)
};
