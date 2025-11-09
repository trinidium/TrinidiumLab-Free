# TrinidiumLab Backend

A production-ready backend for the TrinidiumLab Gmail automation application.

## Features

- Gmail OAuth2 authentication with user-uploaded credentials
- Email sending via Gmail API
- Lead management with CSV import
- Campaign management

- Rich text email templates
- Email scheduling and rate limiting
- Secure token storage
- Comprehensive logging and monitoring
- RESTful API

## Prerequisites

- Node.js 14+
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd TrinidiumLab/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` to configure your settings:
   ```env
   PORT=3001
   NODE_ENV=development
   DB_PATH=./database.sqlite
   JWT_SECRET=your_jwt_secret_here
   ENCRYPTION_KEY=your_encryption_key_here
   ```

## Database

The application uses SQLite for data storage. The database will be automatically created at the path specified in `DB_PATH`.

Tables:
- `credentials`: Gmail API credentials
- `leads`: Email leads
- `campaigns`: Email campaigns
- `email_templates`: Email templates
- `email_logs`: Email sending logs

## API Documentation

See [API_DOCS.md](API_DOCS.md) for detailed API documentation.

## Security

- All Gmail tokens are securely encrypted before storage
- Rate limiting prevents abuse
- Input validation protects against injection attacks
- Security headers protect against common web vulnerabilities
- HTTPS support (configure with reverse proxy in production)

## Development

1. Start the development server:
   ```bash
   npm run dev
   ```

2. The server will start on `http://localhost:3001`

## Production

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Monitoring

The application includes built-in monitoring:
- System health checks
- Memory and CPU usage tracking
- Request logging
- Error tracking

## Logging

Logs are stored in the `logs/` directory:
- `combined.log`: All application logs
- `error.log`: Error logs
- `audit.log`: Security audit logs

## Testing

Run tests with:
```bash
npm test
```

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on the GitHub repository.