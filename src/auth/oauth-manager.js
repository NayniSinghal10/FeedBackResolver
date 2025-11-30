import { google } from 'googleapis';
import express from 'express';
import open from 'open';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Automated OAuth Manager for Gmail API
 * Handles the complete OAuth flow without manual intervention
 */
export class OAuthManager {
    constructor(config) {
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.redirectUri = config.redirectUri || 'http://localhost:3000/oauth2callback';
        this.scopes = config.scopes || [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send'
        ];
        this.port = config.port || 3000;
        
        // Token storage
        this.tokenFile = config.tokenFile || path.join(process.cwd(), '.oauth-tokens.json');
        
        if (!this.clientId || !this.clientSecret) {
            throw new Error('Missing required OAuth credentials: clientId and clientSecret');
        }

        this.oAuth2Client = new google.auth.OAuth2(
            this.clientId,
            this.clientSecret,
            this.redirectUri
        );
    }

    /**
     * Main authentication method - handles full OAuth flow
     */
    async authenticate() {
        console.log('🔐 Starting automated OAuth authentication...');

        // Try to load existing tokens first
        const existingTokens = await this._loadTokens();
        if (existingTokens) {
            console.log('📄 Found existing tokens, validating...');
            try {
                this.oAuth2Client.setCredentials(existingTokens);
                await this._validateTokens();
                console.log('✅ Existing tokens are valid');
                return true;
            } catch (error) {
                console.log('⚠️  Existing tokens expired, refreshing...');
                try {
                    await this._refreshTokens();
                    return true;
                } catch (refreshError) {
                    console.log('❌ Token refresh failed, starting new OAuth flow...');
                    // Continue with new OAuth flow
                }
            }
        }

        // Start new OAuth flow
        return await this._performOAuthFlow();
    }

    /**
     * Get a valid access token (refreshing if necessary)
     */
    async getValidToken() {
        try {
            const { token } = await this.oAuth2Client.getAccessToken();
            return token;
        } catch (error) {
            console.log('🔄 Token expired, refreshing...');
            await this._refreshTokens();
            const { token } = await this.oAuth2Client.getAccessToken();
            return token;
        }
    }

    /**
     * Get the configured OAuth2 client
     */
    getClient() {
        return this.oAuth2Client;
    }

    /**
     * Perform the complete OAuth flow with local server
     */
    async _performOAuthFlow() {
        return new Promise((resolve, reject) => {
            const app = express();
            let server;

            // Timeout for OAuth flow
            const timeout = setTimeout(() => {
                if (server) {
                    server.close();
                }
                reject(new Error('OAuth flow timed out after 5 minutes'));
            }, 5 * 60 * 1000);

            // Handle the OAuth callback
            app.get('/oauth2callback', async (req, res) => {
                const { code, error, state } = req.query;

                if (error) {
                    clearTimeout(timeout);
                    res.send(`
                        <html>
                            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                                <h1>❌ Authorization Failed</h1>
                                <p>Error: ${error}</p>
                                <p>You can close this window.</p>
                            </body>
                        </html>
                    `);
                    server.close();
                    reject(new Error(`OAuth error: ${error}`));
                    return;
                }

                if (!code) {
                    clearTimeout(timeout);
                    res.send(`
                        <html>
                            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                                <h1>❌ Authorization Failed</h1>
                                <p>No authorization code received.</p>
                                <p>You can close this window.</p>
                            </body>
                        </html>
                    `);
                    server.close();
                    reject(new Error('No authorization code received'));
                    return;
                }

                try {
                    // Exchange code for tokens
                    const { tokens } = await this.oAuth2Client.getToken(code);
                    this.oAuth2Client.setCredentials(tokens);
                    
                    // Save tokens for future use
                    await this._saveTokens(tokens);
                    
                    clearTimeout(timeout);
                    res.send(`
                        <html>
                            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                                <h1>✅ Authorization Successful!</h1>
                                <p>FeedbackResolver has been authorized to access your Gmail.</p>
                                <p>You can close this window and return to your terminal.</p>
                                <script>
                                    setTimeout(() => {
                                        window.close();
                                    }, 2000);
                                </script>
                            </body>
                        </html>
                    `);
                    
                    server.close();
                    console.log('✅ OAuth flow completed successfully');
                    resolve(true);

                } catch (tokenError) {
                    clearTimeout(timeout);
                    console.error('Token exchange error:', tokenError);
                    res.send(`
                        <html>
                            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                                <h1>❌ Token Exchange Failed</h1>
                                <p>Error exchanging authorization code for tokens.</p>
                                <p>You can close this window.</p>
                            </body>
                        </html>
                    `);
                    server.close();
                    reject(tokenError);
                }
            });

            // Start the server
            server = app.listen(this.port, (err) => {
                if (err) {
                    clearTimeout(timeout);
                    if (err.code === 'EADDRINUSE') {
                        reject(new Error(`Port ${this.port} is already in use. Please close any applications using this port and try again.`));
                    } else {
                        reject(err);
                    }
                    return;
                }

                console.log(`🌐 OAuth server started on port ${this.port}`);

                // Generate OAuth URL
                const authUrl = this.oAuth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: this.scopes,
                    prompt: 'consent', // Force consent screen to get refresh token
                    state: Math.random().toString(36).substring(7) // Random state for security
                });

                console.log('🔗 Opening browser for authentication...');
                console.log('📋 If browser doesn\'t open automatically, visit:', authUrl);

                // Open browser
                open(authUrl).catch((openError) => {
                    console.log('⚠️  Could not open browser automatically.');
                    console.log('📋 Please manually visit:', authUrl);
                });
            });
        });
    }

    /**
     * Load tokens from storage
     */
    async _loadTokens() {
        try {
            await fs.access(this.tokenFile);
            const tokenData = await fs.readFile(this.tokenFile, 'utf8');
            return JSON.parse(tokenData);
        } catch (error) {
            return null;
        }
    }

    /**
     * Save tokens to storage
     */
    async _saveTokens(tokens) {
        try {
            const tokenData = {
                ...tokens,
                saved_at: new Date().toISOString()
            };
            await fs.writeFile(this.tokenFile, JSON.stringify(tokenData, null, 2));
            console.log(`💾 Tokens saved to ${this.tokenFile}`);
        } catch (error) {
            console.error('❌ Failed to save tokens:', error.message);
            throw error;
        }
    }

    /**
     * Validate current tokens by making a test request
     */
    async _validateTokens() {
        const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });
        await gmail.users.getProfile({ userId: 'me' });
    }

    /**
     * Refresh access tokens using refresh token
     */
    async _refreshTokens() {
        try {
            const { credentials } = await this.oAuth2Client.refreshAccessToken();
            this.oAuth2Client.setCredentials(credentials);
            
            // Update saved tokens
            const existingTokens = await this._loadTokens();
            const updatedTokens = {
                ...existingTokens,
                ...credentials,
                updated_at: new Date().toISOString()
            };
            await this._saveTokens(updatedTokens);
            
            console.log('🔄 Tokens refreshed successfully');
        } catch (error) {
            console.error('❌ Token refresh failed:', error.message);
            throw error;
        }
    }

    /**
     * Revoke tokens and clear storage
     */
    async revokeTokens() {
        try {
            await this.oAuth2Client.revokeCredentials();
            await fs.unlink(this.tokenFile);
            console.log('🗑️  Tokens revoked and removed');
        } catch (error) {
            console.error('❌ Failed to revoke tokens:', error.message);
            throw error;
        }
    }

    /**
     * Check if we have valid credentials
     */
    async isAuthenticated() {
        try {
            if (!this.oAuth2Client.credentials.access_token) {
                return false;
            }
            await this._validateTokens();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get user info for verification
     */
    async getUserInfo() {
        try {
            const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });
            const profile = await gmail.users.getProfile({ userId: 'me' });
            return {
                email: profile.data.emailAddress,
                threadsTotal: profile.data.threadsTotal,
                messagesTotal: profile.data.messagesTotal
            };
        } catch (error) {
            throw new Error(`Failed to get user info: ${error.message}`);
        }
    }
}
