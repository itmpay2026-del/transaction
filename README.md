# TWIKAFRIKA Dashboard
    
A full-featured transaction system built with Node.js, Express, and SQLite/MongoDB. It includes a digital wallet, dispute management, fraud scoring, webhooks, and live chat.

## Features

- **Wallet**: Check balance, send money, and view transaction history.
- **Disputes**: Open and manage transaction disputes.
- **Live Chat**: Real-time WebSocket-based chat for active dispute resolution.
- **Fraud Detection**: Analyze dispute factors to calculate a fraud risk score.
- **Webhooks**: Simulate payment updates and notification flows.
- **Authentication**: JWT-based authentication with automatic session invalidation on server restart.

## Prerequisites

- Node.js (v14 or higher recommended)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
   ```bash
   git clone <your-repository-url>
   cd transaction
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env` and configure as needed:
   ```bash
   cp .env.example .env
   ```
   *(Note: The server automatically generates a random JWT_SECRET on startup for security reasons, so the one in .env is not strictly required unless you change that behavior).*

## Running the Application

1. Start the server:
   ```bash
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Tech Stack

- **Backend**: Node.js, Express.js
- **Databases**: 
  - SQLite (Primary data store for users and wallets)
  - MongoDB Memory Server (Temporary data for dispute messages)
- **Real-Time**: Socket.IO
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Auth**: JWT & bcrypt

## License

MIT
