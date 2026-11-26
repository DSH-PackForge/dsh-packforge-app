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
  const interactive = Boolean(process.stdin.isTTY && process.stderr.isTTY && !options.dryRun);
  const prepare = () => install(host, { ...options, dryRun: true, recoverInterrupted: !options.dryRun });
  let plan = interactive || options.dryRun
    ? await install(host, { ...options, dryRun: true, listResourcesOnly: true, recoverInterrupted: interactive })
    : await prepare();
  const notices = new Map();
  const decisions = { ...options.decisions };
  const credentials = Object.create(null);
  const confirmedCredentials = Object.create(null);
  for (const item of plan.items || []) {
    console.error(item.key, item.destination || item.scope, (item.credentialRefs || []).join(', '));
    if (item.notice) {
      notices.set(item.key, item.notice);
      console.error(item.notice);
    }
    if (!interactive || decisions[item.key] === 'skip') continue;
    const allowed = item.conflict && item.canReplace !== false ? ['', 'k', 'r', 's'] : ['', 's'];
    const choices = { '': item.canReplace === false ? '保留现状 [Enter]' : item.conflict ? '合并 [Enter]' : '导入 [Enter]', k: '保留本地 [k]', r: '选用包内条目 [r]', s: '跳过 [s]' };
    let answer;
    do {
      answer = (await ask(allowed.map(key => choices[key]).join(' / ') + '：')).toLowerCase();
    } while (!allowed.includes(answer));
    if (answer) decisions[item.key] = { k: 'keep', r: 'replace', s: 'skip' }[answer];
    if (item.canReplace === false || answer === 's' || answer === 'k' || !item.credentialRefs?.length) continue;
    const reuse = item.availableCredentials?.length ? await ask('允许此目标使用已有凭据？[y/N] ') : '';
    if (/^y(es)?$/i.test(reuse)) confirmedCredentials[item.key] = true;
    for (const key of item.credentialRefs) {
      const value = await ask(key + '（隐藏输入，留空不设置）：', true);
      if (value) (credentials[item.key] ??= Object.create(null))[key] = value;
    }
  }
  options = { ...options, decisions, credentials, confirmedCredentials };
  if (plan.resourcesOnly) plan = await prepare();
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
  const result = await install(host, { ...options, resolutions, previewToken: plan.previewToken });
  for (const item of result.items || []) {
    if (item.notice && item.notice !== notices.get(item.key)) console.error(item.key, item.notice);
  }
  return result;
}
