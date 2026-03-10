

## Fix failing test: update to match refactored BracketCreationService

### Problem
Test `should throw error with proper message when participant insertion fails` expects `rejects.toThrow('Failed to insert participants:')`, but the manual participant insertion was removed in the previous fix. The service now lets `brackets-manager` create participants via `create.stage()`, so the old error path no longer exists.

### Change

**`tests/bracketManagerPhase0.test.ts` (lines 169-185)**

Update the test to verify that when `manager.create.stage()` throws, the error propagates with the correct message format (`Bracket creation failed: ...`). The mock for `create.stage` should reject, and the insert mock setup is no longer relevant for this test.

```typescript
it('should throw error with proper message when stage creation fails', async () => {
  const options = {
    bracketId: 'test-bracket-error',
    format: 'single_elimination' as const,
    teams: [{ id: 'team1', name: 'Team 1', seed: 1 }],
  };

  // Mock create.stage to throw
  const mockManager = (service as any).creationService.manager;
  mockManager.create.stage.mockRejectedValueOnce(new Error('Database connection failed'));

  await expect(service.createBracket(options)).rejects.toThrow(
    'Bracket creation failed:'
  );
});
```

Access the mock manager via `service` internals (or the module-level mock) and use `mockRejectedValueOnce` on `create.stage`. Update the expected error string from `'Failed to insert participants:'` to `'Bracket creation failed:'`.

