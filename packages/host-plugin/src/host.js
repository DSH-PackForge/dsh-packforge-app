// host 侧单例 Host（NodeHost：真实文件系统 + node:crypto/child_process）。
// 工具 execute 全部走它，与 CLI / GUI 使用同一份 @dsh-packforge/core，行为一致。
import { NodeHost } from '@dsh-packforge/host-node';

let host = null;

/** 取（惰性构造 + 可注入的）host。 */
export function getHost() {
  host ??= new NodeHost();
  return host;
}

/** 测试或宿主注入自定义 Host。 */
export function setHost(h) {
  host = h;
}