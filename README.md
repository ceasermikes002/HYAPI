# Hyperliquid Trade Ledger API

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Enabled-blue.svg)](https://www.docker.com/)
[![API](https://img.shields.io/badge/API-Swagger%2FOpenAPI-green.svg)](http://localhost:3000/api-docs)

A production-grade, dockerized microservice designed to provide reconstructed trade history, position lifecycles, and advanced PnL analytics for Hyperliquid users. 

Built for hackathons and builder competitions, this service features a unique "Builder-Only" mode to filter and analyze trading activity attributed to specific frontends, ensuring fair competition and accurate performance tracking.

## Key Features

*   **Advanced State Reconstruction**: Deterministically reconstructs position history (Net Size, Avg Entry Price) from raw trade fills.
*   **Smart PnL Analytics**: Calculates Realized PnL, Fees, Volume, and Return % with "Effective Capital" approximation.
*   **Builder-Only Filtering**: 
    *   Filters trades by `builder` address.
    *   Implements **Taint Analysis**: Flags position lifecycles as "tainted" if a user interacts with the position via a non-target interface (e.g., closing a builder-opened position on the main exchange).
*   **Leaderboard Engine**: Generates real-time rankings based on PnL, ROI, or Volume.
*   **Pluggable Architecture**: `IDataSource` abstraction allows seamless switching between public Hyperliquid API, Insilico-HL, or HyperServe.
*   **Swagger/OpenAPI Documentation**: Fully documented API endpoints.

## Architecture

The service follows a clean, layered architecture:

1.  **API Layer** (`src/api`): Express.js routes handling HTTP requests, input validation, and Swagger documentation.
2.  **Service Layer** (`src/services`): Contains the core business logic (State Machine for positions, Equity reconstruction for PnL).
3.  **Domain Layer** (`src/domain`): TypeScript interfaces defining the core entities (`Trade`, `PositionState`, `PnlMetrics`).
4.  **Data Access Layer** (`src/datasources`): Abstracted data fetching. Currently implements `HyperliquidDataSource` using the official SDK.

## Getting Started

### Prerequisites

*   Docker & Docker Compose
*   Node.js v18+ (for local dev)

### Quick Start (Docker)

1.  **Configure Environment**:
    (Optional) Create a `.env` file or export variables to enable Builder-Only mode.
    ```bash
    export TARGET_BUILDER=0xYourBuilderAddress
    ```

2.  **Run the Service**:
    ```bash
    docker-compose up --build
    ```

3.  **Access the API**:
    *   **Swagger UI**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
    *   **API Root**: `http://localhost:3000/v1`

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode (hot-reload)
npm run dev

# Build and run production
npm run build
npm start
```

## API Documentation

Complete API documentation is available via Swagger UI at `/api-docs`.

### Core Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/v1/trades` | Fetch normalized trade history. |
| `GET` | `/v1/positions/history` | Reconstruct position state over time. |
| `GET` | `/v1/pnl` | Calculate PnL, ROI, and Fees. |
| `GET` | `/v1/leaderboard` | Get user rankings. |
| `GET` | `/v1/deposits` | Track capital flows (Bonus). |

## Configuration

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `TARGET_BUILDER` | Builder address for attribution filtering | `undefined` |
| `COMPETITION_USERS` | Comma-separated list of default users | `[]` |

## Design Decisions & Trade-offs

### Effective Capital Approximation
To calculate Return % (`Realized PnL / Capital`), we need the denominator. Since we don't have direct access to the exchange's internal margin snapshots, we reconstruct the user's "Effective Capital" at the start of the window by replaying:
`Initial Deposits + Cumulative PnL + Funding - Fees`. 
*   **Trade-off**: This is computationally expensive (O(N) history replay) but necessary for accuracy without a database.

### Taint Analysis
In `builderOnly` mode, simply filtering trades is insufficient. If a user opens a long position on your builder but panics and market closes it on the main Hyperliquid site, your builder technically "caused" that PnL.
*   **Our Approach**: We track the entire lifecycle. If *any* trade in a position's lifecycle (Open -> Close) is non-builder, the position is marked `tainted`.
*   **Leaderboard**: Tainted positions can be excluded or penalized depending on competition rules.

## Contributing

Contributions are welcome! Please follow the existing architectural patterns and add JSDoc comments for any new logic.

## License

This project is licensed under the MIT License.
