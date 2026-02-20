let accessTokenInMemory: string | null = null;

export function setInMemoryAccessToken(token: string | null): void {
  accessTokenInMemory = token;
}

export function getInMemoryAccessToken(): string | null {
  return accessTokenInMemory;
}

export function clearInMemoryAccessToken(): void {
  accessTokenInMemory = null;
}
