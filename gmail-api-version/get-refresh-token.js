import { google } from 'googleapis';
import http from 'http';
import url from 'url';
import open from 'open';
import dotenv from 'dotenv';

dotenv.config();

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('\x1b[31m%s\x1b[0m', 'Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in your .env file.');
    console.log('Please create a .env file in the gmail-api-version directory and add your credentials.');
    process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
);

const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly'
];

const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent'
});

console.log('\x1b[36m%s\x1b[0m', 'Authorize this app by visiting this url:');
console.log(authUrl);
open(authUrl);

const server = http.createServer(async (req, res) => {
    try {
        if (req.url.indexOf('/oauth2callback') > -1) {
            const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
            const code = qs.get('code');
            
            res.end('Authentication successful! Please return to the console.');
            server.close();

            const { tokens } = await oAuth2Client.getToken(code);
            oAuth2Client.setCredentials(tokens);
            
            console.log('\n\x1b[32m%s\x1b[0m', 'Authentication successful!');
            console.log('\x1b[33m%s\x1b[0m', 'Copy the following line into your .env file:');
            console.log(`GMAIL_REFRESH_TOKEN="${tokens.refresh_token}"`);
        }
    } catch (e) {
        console.error(e);
        res.end('Authentication failed');
        server.close();
    }
}).listen(3000, () => {
    console.log('\nServer is listening on http://localhost:3000');
    console.log('Waiting for authorization...');
});
