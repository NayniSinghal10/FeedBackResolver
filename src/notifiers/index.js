/**
 * Notifiers Module Exports
 * 
 * This module exports all available notifiers for different output channels
 */

export { SlackNotifier } from './slack-notifier.js';
export { FileNotifier } from './file-notifier.js';

// Re-export for convenience
export default {
    SlackNotifier: () => import('./slack-notifier.js').then(m => m.SlackNotifier),
    FileNotifier: () => import('./file-notifier.js').then(m => m.FileNotifier)
};
