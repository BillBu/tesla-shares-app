# Tesla Shares App

An Angular web application that tracks Tesla stock prices and converts the value to GB pounds using current exchange rates.

## Features

- Live Tesla stock price tracking
- Current USD to GBP exchange rate
- Calculate USD and GBP value of your Tesla shares
- View daily chart with 5-minute updates
- View historical chart with data for the last 2 years
- Time range selection for historical data (2 years, 1 year, 6 months, 1 month, 1 week)

## Technology Stack

- Angular 19
- Chart.js for data visualization
- Bootstrap 5 for responsive UI
- Alpha Vantage API for stock data
- ExchangeRatesAPI for currency exchange rates

## Demo

The app is deployed on GitHub Pages at: https://[username].github.io/tesla-shares-app/

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Angular CLI (v19 or higher)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/[username]/tesla-shares-app.git
   cd tesla-shares-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure API keys:

   - Sign up for an API key at [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
   - Sign up for an API key at [ExchangeRatesAPI](https://exchangeratesapi.io/pricing/)
   - Update the API keys in the respective service files

4. Run the development server:

   ```bash
   ng serve
   ```

5. Navigate to `http://localhost:4200/` in your browser.

## Deployment

The app automatically deploys to GitHub Pages when changes are pushed to the main branch.

## Notes

- The Alpha Vantage free tier API has a limit of 5 API calls per minute and 500 per day
- The ExchangeRatesAPI free tier does not support historical data, so the app uses mock data for demonstration purposes

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
