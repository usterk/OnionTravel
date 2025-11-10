# Frontend Development Guidelines

## Testing

### Quick Start

```bash
# From project root - run frontend tests
../test.sh frontend     # Unit tests (Vitest)
../test.sh e2e          # E2E tests (Playwright)

# From frontend directory - manual testing
npm run test            # Unit tests
npm run test:e2e        # E2E tests
npm run test:coverage   # With coverage
```

**Reports**:
- Unit tests: `../test-reports/frontend/YYYY-MM-DD_HH-MM-SS_vitest.log`
- E2E tests: `../test-reports/e2e/YYYY-MM-DD_HH-MM-SS_playwright/`
- View E2E report: `npm run test:e2e:report` (port 7002)

### Test Structure

- **Unit tests**: `src/**/__tests__/*.test.tsx`
- **E2E tests**: `e2e/*.spec.ts`
- **Test setup**: `test/setup.ts`

### Running Tests

```bash
npm run test              # Vitest unit tests
npm run test:ui           # Vitest with UI
npm run test:coverage     # With coverage report

npm run test:e2e          # Playwright E2E
npm run test:e2e:ui       # Playwright with UI
npm run test:e2e:headed   # Playwright headed mode
```

## Development

### Ports

- Frontend: http://localhost:7000
- Backend API: http://localhost:7001
- E2E Report Server: http://localhost:7002

### Key Technologies

- **React 19** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Zustand** - State management
- **React Query** - Server state
- **Vitest** - Unit testing
- **Playwright** - E2E testing
