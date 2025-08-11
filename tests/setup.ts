// Test setup file - runs before each test
// Add global test configuration here

// Increase timeout for Docker-based tests
jest.setTimeout(30000);

// Mock console during tests to reduce noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});