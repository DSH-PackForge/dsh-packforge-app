import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildDspack, encodeText } from '@dsh-packforge/core';

const bin = fileURLToPath(new URL('../bin/dspack.js', import.meta.url));
const repository = 'https://skills.example.invalid/writing.git';
const remoteKey = 'skill:home:remote-notes';
const localText = '# 写作提纲\n\n记录段落主题。\n';
const sha256 = data => createHash('sha256').update(data).digest('hex');

async function createFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dspack-cli-resources-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const content = encodeText(localText);
  const hash = sha256(content);
  const entry = 'extension-data/skill/' + hash;
  const manifest = {
    manifestVersion: 6, type: 'profile', name: 'writing', profileName: 'writing',
    version: '1.0.0', bundles: [], dependencies: {}, files: [], patch: '[]\n',
  };
  const skills = [
    {
      key: remoteKey, id: 'remote-notes', name: '远程笔记', kind: 'skill', scope: 'home',
      mode: 'track', repository, ref: 'main', commit: 'a'.repeat(40), digest: 'b'.repeat(64),
    },
    {
      key: 'skill:home:outline', id: 'outline', name: '写作提纲', kind: 'skill', scope: 'home',
      mode: 'embedded', digest: sha256(JSON.stringify([['SKILL.md', hash]])),
      files: [{ path: 'SKILL.md', entry, sha256: hash }],
    },
  ];
  const archive = path.join(root, 'writing.dspack');
  await writeFile(archive, buildDspack({
    'manifest.json': encodeText(JSON.stringify(manifest)),
    'dspack.json': encodeText(JSON.stringify({ format: 'dspack', version: 4 })),
    'skill.json': encodeText(JSON.stringify({ items: skills })),
    [entry]: content,
  }));
  return { root, archive };
}

async function runImport(t, interactive) {
  const { root, archive } = await createFixture(t);
  const trace = path.join(root, 'git-trace.json');
  // 若意外调用 Git，重写到本机不存在的仓库，测试失败时也不会访问网络。
  const redirect = pathToFileURL(path.join(root, 'absent.git')).href;
  const env = {
    ...process.env, HOME: root, USERPROFILE: root, GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: path.join(root, 'gitconfig'), GIT_TRACE2_EVENT: trace,
    GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'url.' + redirect + '.insteadOf', GIT_CONFIG_VALUE_0: repository,
  };
  const args = [bin, 'install', archive, '--profiles-root', path.join(root, 'profiles'), '--no-install'];
  if (interactive) {
    // 让管道子进程走真实 readline 分支，并在每个提示出现后才发送选择。
    const terminal = 'process.stdin.isTTY = true; process.stderr.isTTY = true';
    args.unshift('--import', 'data:text/javascript,' + encodeURIComponent(terminal));
  } else {
    args.push('--skip-resource', remoteKey);
  }
  const child = spawn(process.execPath, args, { env, cwd: root, windowsHide: true, timeout: 15000 });
  let stdout = '', stderr = '', nextPrompt = 0;
  child.stdout.setEncoding('utf8').on('data', text => { stdout += text; });
  child.stderr.setEncoding('utf8').on('data', text => {
    stderr += text;
    if (interactive && stderr.split('跳过 [s]：').length - 1 > nextPrompt) {
      child.stdin.write(nextPrompt === 0 ? 's\n' : '\n');
      nextPrompt++;
    }
  });
  const status = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
    if (!interactive) child.stdin.end();
  });
  assert.equal(status, 0, stdout + stderr);
  if (interactive) assert.equal(nextPrompt, 2);
  assert.match(stdout, /已跳过：remote-notes/);
  assert.equal(await readFile(path.join(root, 'skills', 'outline', 'SKILL.md'), 'utf8'), localText);
  await assert.rejects(access(path.join(root, 'skills', 'remote-notes')), { code: 'ENOENT' });
  await assert.rejects(access(trace), { code: 'ENOENT' });
}

test('非交互 CLI 按 --skip-resource 跳过远程技能并安装内嵌技能', t => runImport(t, false));
test('交互 CLI 在准备远程技能前列出资源，按终端选择完成导入', t => runImport(t, true));
