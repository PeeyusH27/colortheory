// Global Jest setup. Keep this file small: per-test mocks belong next to the tests that need them.
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
