import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerPackCommands } from '../src/commands.js';

test('registerPackCommands：注册 dspack-dsh-version / dspack-config / dspack-save-config / dspack-export / dspack-market 五个命令', () => {
  const registered = [];
  registerPackCommands({ commands: { register: (d) => registered.push(d) } });
  assert.equal(registered.length, 5);
  assert.deepEqual(registered.map((c) => c.name), ['dspack-config', 'dspack-dsh-version', 'dspack-save-config', 'dspack-export', 'dspack-market']);
  for (const c of registered) {
    assert.match(c.name, /^[a-z][a-z0-9_-]*$/);
    assert.equal(typeof c.description, 'string');
    assert.equal(typeof c.handler, 'function');
  }
});

test('registerPackCommands：经 ctx.get("commands") 也能拿到服务', () => {
  const registered = [];
  registerPackCommands({ get: (name) => (name === 'commands' ? { register: (d) => registered.push(d) } : undefined) });
  assert.equal(registered.length, 5);
});

test('registerPackCommands：无 commands 服务时静默跳过，不抛', () => {
  assert.doesNotThrow(() => registerPackCommands({}));
  assert.doesNotThrow(() => registerPackCommands({ get: () => undefined }));
  assert.doesNotThrow(() => registerPackCommands({ commands: {} }));
});
