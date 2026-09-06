import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DspackController } from '../src/remote.js';

// 注：方法标记（remoteMethods）在 typert-protocol 各版本间机制不一致（WeakMap vs 字符串描述符），
// 手动标记针对 DSH 运行时（字符串描述符）版本；这里只断言版本无关的 Gateway 绑定。
test('DspackController：Typert Remote 绑定', () => {
  const ctrl = new DspackController({ reflect: { provide() {} } });
  assert.equal(ctrl.typertRemote.namespace, 'dspack');
  assert.equal(ctrl.typertRemote.serviceKey, 'dspackController');
  assert.equal(typeof ctrl.exportHome, 'function');
  assert.equal(typeof ctrl.market, 'function');
});
