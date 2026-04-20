/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/electron/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  clearMocks: true,
};
