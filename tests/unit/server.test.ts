import { LLVMMCPServer } from '../../src/server';

describe('LLVMMCPServer', () => {
  let server: LLVMMCPServer;

  beforeEach(() => {
    server = new LLVMMCPServer();
  });

  it('should create an instance', () => {
    expect(server).toBeInstanceOf(LLVMMCPServer);
  });

  // TODO: Add more comprehensive tests once the server is fully implemented
  it('should be defined', () => {
    expect(server).toBeDefined();
  });
});