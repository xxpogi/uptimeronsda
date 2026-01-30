# Uptime Monitor

A modern, real-time website uptime monitoring dashboard built with React and Node.js.

![Dark Theme](https://img.shields.io/badge/theme-dark-1a1a2e)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Real-time Monitoring** - Check website status at configurable intervals
- **Response Time Tracking** - Measure and visualize response times
- **Uptime Statistics** - 24h and 7d uptime percentages
- **Status Detection** - Online, Offline, Slow, Paused states
- **Retry Logic** - Automatic retries for failed checks
- **History & Charts** - Visual response time and uptime charts
- **CSV Export** - Download monitoring history
- **Bulk Import** - Import multiple sites at once
- **Tags & Groups** - Organize sites with tags
- **Console Alerts** - Get notified when sites go down

## Tech Stack

- **Frontend**: React 18, Tailwind CSS, Recharts
- **Backend**: Node.js, Express
- **Database**: In-memory (extendable to SQLite/PostgreSQL)
- **Build**: Vite

## Quick Start

```bash
# Install dependencies
npm install

# Run development servers
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sites` | List all sites |
| POST | `/api/sites` | Add new site |
| POST | `/api/sites/bulk` | Bulk import |
| PUT | `/api/sites/:id` | Update site |
| DELETE | `/api/sites/:id` | Delete site |
| POST | `/api/sites/:id/check` | Manual check |
| GET | `/api/history/:id` | Check history |
| GET | `/api/history/:id/chart` | Chart data |
| GET | `/api/history/:id/export` | Export CSV |

## Configuration

Create a `.env` file:

```env
PORT=3001
DEFAULT_CHECK_INTERVAL=5
DEFAULT_TIMEOUT=30000
MAX_RETRIES=3
```

## License

MIT
