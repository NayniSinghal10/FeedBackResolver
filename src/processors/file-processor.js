import { promises as fs } from 'fs';
import path from 'path';

/**
 * File-based Email/Feedback Processor
 * Handles processing feedback from files or direct text input
 */
export class FileProcessor {
    constructor(config = {}) {
        this.config = {
            encoding: config.encoding || 'utf8',
            path: config.path || null,
            ...config
        };
    }

    /**
     * Process feedback from file or direct input
     * @param {string|null} input - Direct text input or null to use file path
     */
    async process(input = null) {
        console.log('📄 Processing file-based feedback...');

        let content = '';
        
        if (input) {
            // Direct text input provided
            content = typeof input === 'string' ? input : JSON.stringify(input);
            console.log(`📝 Processing direct text input (${content.length} characters)`);
        } else if (this.config.path) {
            // Read from file path
            content = await this._readFromFile(this.config.path);
            console.log(`📁 Read content from file: ${this.config.path}`);
        } else {
            throw new Error('No input provided and no file path configured. Please provide either direct input or configure a file path.');
        }

        if (!content || content.trim().length === 0) {
            console.log('📭 No content found to process');
            return [];
        }

        // Parse content into email-like structures
        const emails = this._parseContent(content);
        
        console.log(`✅ Successfully processed ${emails.length} feedback item(s)`);
        return emails;
    }

    /**
     * Read content from file
     */
    async _readFromFile(filePath) {
        try {
            // Resolve relative paths
            const resolvedPath = path.resolve(filePath);
            
            // Check if file exists
            await fs.access(resolvedPath);
            
            // Read file content
            const content = await fs.readFile(resolvedPath, this.config.encoding);
            return content;
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`File not found: ${filePath}`);
            } else if (error.code === 'EACCES') {
                throw new Error(`Permission denied accessing file: ${filePath}`);
            } else {
                throw new Error(`Failed to read file ${filePath}: ${error.message}`);
            }
        }
    }

    /**
     * Parse content into email-like structures
     */
    _parseContent(content) {
        // Try to detect if content contains multiple feedback items
        const emails = this._splitIntoItems(content);
        
        return emails.map((item, index) => ({
            id: `file_${Date.now()}_${index}`,
            from: this._extractSender(item) || 'File Input',
            subject: this._extractSubject(item) || `Feedback Item ${index + 1}`,
            date: new Date().toISOString(),
            body: this._cleanContent(item),
            snippet: this._generateSnippet(item),
            threadId: `file_thread_${index}`
        }));
    }

    /**
     * Split content into individual feedback items
     */
    _splitIntoItems(content) {
        // Strategy 1: Look for multiple email-like blocks (separated by --- or multiple From: headers)
        const emailBlockSeparators = [
            /\n---+\n/g,
            /\n=+\n/g,
            /(?=\nFrom:\s*.+\n)/g  // Look ahead for From: but don't consume it
        ];

        for (const separator of emailBlockSeparators) {
            const parts = content.split(separator);
            if (parts.length > 1) {
                return parts.filter(part => part.trim().length > 20); // Keep parts with minimal content
            }
        }

        // Strategy 2: Look for double line breaks with substantial content
        const paragraphs = content.split(/\n\s*\n/);
        if (paragraphs.length > 1) {
            const substantialParagraphs = paragraphs.filter(p => p.trim().length > 100);
            if (substantialParagraphs.length > 1) {
                return substantialParagraphs;
            }
        }

        // Strategy 3: Look for bullet points or numbered lists
        const listItems = content.split(/(?:\n|^)(?:\*|\-|\d+\.)\s+/);
        if (listItems.length > 1) {
            return listItems.filter(item => item.trim().length > 30);
        }

        // Strategy 4: Single item (default) - always return the full content as one item
        return [content.trim()];
    }

    /**
     * Extract sender information from content
     */
    _extractSender(content) {
        // Look for common sender patterns
        const senderPatterns = [
            /From:\s*([^\n\r]+)/i,
            /Sender:\s*([^\n\r]+)/i,
            /Name:\s*([^\n\r]+)/i,
            /Email:\s*([^\s@]+@[^\s@]+\.[^\s@]+)/i
        ];

        for (const pattern of senderPatterns) {
            const match = content.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return null;
    }

    /**
     * Extract subject/title from content
     */
    _extractSubject(content) {
        // Look for common subject patterns
        const subjectPatterns = [
            /Subject:\s*([^\n\r]+)/i,
            /Title:\s*([^\n\r]+)/i,
            /Re:\s*([^\n\r]+)/i,
            /Topic:\s*([^\n\r]+)/i
        ];

        for (const pattern of subjectPatterns) {
            const match = content.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        // Fallback: use first line if it's short enough
        const lines = content.trim().split('\n');
        if (lines.length > 0 && lines[0].length < 100 && lines[0].length > 10) {
            return lines[0].trim();
        }

        return null;
    }

    /**
     * Clean and normalize content
     */
    _cleanContent(content) {
        // Remove common metadata patterns
        let cleaned = content
            .replace(/^From:\s*[^\n\r]+[\n\r]*/im, '')
            .replace(/^Subject:\s*[^\n\r]+[\n\r]*/im, '')
            .replace(/^Date:\s*[^\n\r]+[\n\r]*/im, '')
            .replace(/^To:\s*[^\n\r]+[\n\r]*/im, '')
            .replace(/^Sent:\s*[^\n\r]+[\n\r]*/im, '')
            .replace(/^Name:\s*[^\n\r]+[\n\r]*/im, '')
            .replace(/^Email:\s*[^\n\r]+[\n\r]*/im, '');

        // Clean up whitespace
        cleaned = cleaned
            .replace(/\r\n/g, '\n')  // Normalize line endings
            .replace(/\n{3,}/g, '\n\n')  // Collapse excessive line breaks
            .replace(/[ \t]+/g, ' ')  // Collapse excessive spaces
            .trim();

        return cleaned;
    }

    /**
     * Generate snippet for preview
     */
    _generateSnippet(content) {
        const cleaned = this._cleanContent(content);
        const maxLength = 150;
        
        if (cleaned.length <= maxLength) {
            return cleaned;
        }
        
        return cleaned.substring(0, maxLength - 3) + '...';
    }

    /**
     * Process multiple files
     */
    async processMultipleFiles(filePaths) {
        const allEmails = [];
        
        for (const filePath of filePaths) {
            try {
                console.log(`📁 Processing file: ${filePath}`);
                const processor = new FileProcessor({ ...this.config, path: filePath });
                const emails = await processor.process();
                allEmails.push(...emails);
            } catch (error) {
                console.error(`⚠️  Failed to process ${filePath}:`, error.message);
            }
        }
        
        return allEmails;
    }

    /**
     * Watch file for changes and process automatically
     */
    async watchFile(callback) {
        if (!this.config.path) {
            throw new Error('No file path configured for watching');
        }

        const { watch } = await import('fs');
        const resolvedPath = path.resolve(this.config.path);
        
        console.log(`👁️  Watching file for changes: ${resolvedPath}`);
        
        const watcher = watch(resolvedPath, async (eventType) => {
            if (eventType === 'change') {
                try {
                    console.log('📝 File changed, reprocessing...');
                    const emails = await this.process();
                    callback(emails);
                } catch (error) {
                    console.error('❌ Error processing file change:', error.message);
                    callback(null, error);
                }
            }
        });

        return watcher;
    }

    /**
     * Validate file access and format
     */
    async validateFile(filePath = null) {
        const targetPath = filePath || this.config.path;
        
        if (!targetPath) {
            return {
                valid: false,
                message: 'No file path provided'
            };
        }

        try {
            const resolvedPath = path.resolve(targetPath);
            
            // Check file access
            await fs.access(resolvedPath);
            
            // Get file stats
            const stats = await fs.stat(resolvedPath);
            
            if (!stats.isFile()) {
                return {
                    valid: false,
                    message: 'Path is not a file'
                };
            }

            // Check file size (warn if too large)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (stats.size > maxSize) {
                return {
                    valid: true,
                    message: `File is large (${Math.round(stats.size / 1024 / 1024)}MB), processing may be slow`,
                    warning: true
                };
            }

            return {
                valid: true,
                message: 'File is accessible and ready for processing',
                stats: {
                    size: stats.size,
                    modified: stats.mtime,
                    path: resolvedPath
                }
            };

        } catch (error) {
            return {
                valid: false,
                message: `File validation failed: ${error.message}`
            };
        }
    }

    /**
     * Get supported file formats info
     */
    static getSupportedFormats() {
        return {
            text: {
                extensions: ['.txt', '.md', '.csv'],
                description: 'Plain text files with feedback content'
            },
            structured: {
                extensions: ['.json'],
                description: 'JSON files with structured feedback data'
            },
            email: {
                extensions: ['.eml', '.msg'],
                description: 'Email files (basic support)'
            }
        };
    }
}
