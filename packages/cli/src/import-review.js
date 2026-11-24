import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

async function ask(question, hidden = false) {
  const sink = hidden ? new Writable({ write(_chunk, _encoding, done) { done(); } }) : process.stderr;
  const input = createInterface({ input: process.stdin, output: sink, terminal: true });
  try {
    if (hidden) process.stderr.write(question);
    return (await input.question(hidden ? '' : question)).trim();
  } finally {
    input.close();
    if (hidden) { sink.end(); process.stderr.write('\n'); }
  }
}

/** 凭据仅经本地终端读入，确认目标后再计算最终的文件差异。 */
export async function reviewImport(host, install, options) {
  let plan = await install(host, { ...options, dryRun: true, recoverInterrupted: !options.dryRun });
  const items = plan.items || [];
  const interactive = process.stdin.isTTY && process.stderr.isTTY;
  const credentials = Object.create(null);
  const confirmedCredentials = Object.create(null);
  for (const item of items) {
    if (!item.credentialRefs?.length) continue;
    console.error(item.id, item.destination || item.scope, item.credentialRefs.join(', '));
    if (!interactive || options.dryRun) continue;
    const reuse = item.availableCredentials?.length ? await ask('允许此目标使用已有凭据？[y/N] ') : '';
    if (/^y(es)?$/i.test(reuse)) confirmedCredentials[item.key] = true;
    for (const key of item.credentialRefs) {
      const value = await ask(key + '（隐藏输入，留空不设置）：', true);
      if (value) (credentials[item.key] ??= Object.create(null))[key] = value;
    }
  }
  if (Object.keys(credentials).length || Object.keys(confirmedCredentials).length) {
    plan = await install(host, { ...options, credentials, confirmedCredentials, dryRun: true });
  }
  const resolutions = Object.create(null);
  for (const change of plan.conflicts || []) {
    for (const field of change.fields?.length ? change.fields : [{key:change.path}]) {
      console.error('本地修改与新版冲突：' + [change.path, field.label].filter(Boolean).join(' / '));
      if (interactive && !options.dryRun && /^y(es)?$/i.test(await ask('采用新版？[y/N] '))) {
        resolutions[field.key] = 'upstream';
      }
    }
  }
  if (options.dryRun) {
    for (const change of plan.changes || []) console.log(change.action || change.kind || '', change.path);
    return plan;
  }
  return install(host, { ...options, credentials, confirmedCredentials, resolutions, previewToken: plan.previewToken });
}
