// 手写的 ToolDefinition 对象（对齐 @deepseek-ai/dsh-tools 的 ToolDefinition 形状，但零运行时依赖）。
// DSH host 的 ctx.tools.register(definition) 会把这些工具纳入模型的工具清单，AI 可自主调用。
// 参数校验由 execute 内部兜底（registry 不做强校验，工具自证）。
import {
  discoverProfiles,
  resolveProfileInput,
  packProfile,
  inspectPack,
  installPack,
  resolvePackSource,
} from '@dsh-packforge/core';
import { getHost } from './host.js';

/** 模型可见的文本结果（工具输出 → ContentBlock）。 */
const text = (t) => [{ type: 'text', text: String(t) }];

const card = (title) => (args) => ({ card: 'generic', title, kind: 'other', rawInput: args });

/* ------------------------------------------------------------------ */
/* dspack_list: 发现可用的 profile                                       */
/* ------------------------------------------------------------------ */
const dspackList = {
  name: 'dspack_list',
  description:
    '发现当前机器可用的 DSH profile 列表（经典 ~/.dsh/profiles 与 DSH 启动器实例）。' +
    '在导出整合包前用它让用户/模型知道有哪些 profile 可选。',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        profiles: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              dir: { type: 'string' },
              source: { type: 'string' },
              home: { type: 'string' },
            },
            required: ['name', 'dir', 'source'],
          },
        },
      },
      required: ['profiles'],
    },
    render: (_args, value) =>
      text(
        `发现 ${value.profiles.length} 个 profile：` +
          value.profiles.map((p) => `\n- ${p.name}（${p.dir}）`).join('') +
          (value.profiles.length ? '' : '（没有可用的 profile）'),
      ),
  },
  execute: async () => {
    const { profiles } = await discoverProfiles(getHost());
    return {
      profiles: profiles.map((p) => ({ name: p.name, dir: p.dir, source: p.source, home: p.home ?? '' })),
    };
  },
  presentCall: card('列出 profile'),
};

/* ------------------------------------------------------------------ */
/* dspack_export: 导出 profile → .dspack                                 */
/* ------------------------------------------------------------------ */
const dspackExport = {
  name: 'dspack_export',
  description:
    '把指定的 DSH profile 导出为 .dspack 整合包（标准 ZIP，可被压缩软件直接打开）。' +
    'profile 用名字或目录路径；out 为输出目录（缺省当前目录）。返回输出文件路径、sha256 与大小。',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      profile: { type: 'string', description: 'profile 名或目录路径' },
      out: { type: 'string', description: '输出目录，缺省为当前目录' },
      name: { type: 'string', description: '覆盖整合包 name（slug）' },
      version: { type: 'string', description: '覆盖版本号' },
      dshVersion: { type: 'string', description: '钉定 DSH 版本（缺省取已安装最新）' },
      force: { type: 'boolean', description: '输出文件已存在时覆盖' },
    },
    required: ['profile'],
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        output: { type: 'string' },
        sha256: { type: 'string' },
        size: { type: 'integer' },
        name: { type: 'string' },
        version: { type: 'string' },
      },
      required: ['output', 'sha256', 'size'],
    },
    render: (_args, v) => text(`已导出 ${v.output}（${v.size} 字节，sha256=${v.sha256}）`),
  },
  execute: async (args) => {
    const host = getHost();
    const profile = args.profile ? await resolveProfileInput(host, args.profile) : null;
    if (!profile) {
      const { profiles } = await discoverProfiles(host);
      const names = profiles.map((p) => p.name).join(', ');
      throw new Error(`找不到 profile「${args.profile ?? ''}」。可用：${names || '（无）'}`);
    }
    const r = await packProfile(host, profile, {
      out: args.out,
      name: args.name,
      version: args.version,
      dshVersion: args.dshVersion,
      force: args.force === true,
    });
    return {
      output: r.output,
      sha256: r.sha256,
      size: r.size,
      name: r.manifest.name,
      version: r.manifest.version,
    };
  },
  presentCall: card('导出整合包'),
};

/* ------------------------------------------------------------------ */
/* dspack_view: 查看 .dspack（本地/URL）                                  */
/* ------------------------------------------------------------------ */
const dspackView = {
  name: 'dspack_view',
  description:
    '查看一个已存在的 .dspack 整合包（本地路径或 http(s) URL）：manifest 校验结果、sha256、大小与条目分类，不解压到磁盘。',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      source: { type: 'string', description: '.dspack 本地路径或 http(s) URL' },
    },
    required: ['source'],
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        valid: { type: 'boolean' },
        name: { type: 'string' },
        version: { type: 'string' },
        sha256: { type: 'string' },
        size: { type: 'integer' },
        totalEntries: { type: 'integer' },
        validation: { type: 'array', items: { type: 'string' } },
      },
      required: ['valid', 'sha256', 'size'],
    },
    render: (_args, v) =>
      text(
        v.valid
          ? `整合包 ${v.name}@${v.version} 合法（${v.size} 字节，sha256=${v.sha256}）`
          : `整合包不合法：${(v.validation ?? []).join('；') || '未知原因'}`,
      ),
  },
  execute: async (args) => {
    const host = getHost();
    const { path, tempDir } = await resolvePackSource(host, args.source);
    try {
      const r = await inspectPack(host, path);
      return {
        valid: r.valid,
        name: r.manifest?.name ?? '',
        version: r.manifest?.version ?? '',
        sha256: r.sha256,
        size: r.size,
        totalEntries: r.totalEntries,
        validation: r.validation ?? [],
      };
    } finally {
      if (tempDir) await host.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  },
  presentCall: card('查看整合包'),
};

/* ------------------------------------------------------------------ */
/* dspack_install: 安装 .dspack → 新 profile                              */
/* ------------------------------------------------------------------ */
const dspackInstall = {
  name: 'dspack_install',
  description:
    '把 .dspack 整合包安装为新的 DSH profile：解压、重建 package.json、pnpm install、files[] 下载校验、对账。' +
    'source 为本地路径或 URL；dryRun 只校验不落盘；失败会整体回滚。',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      source: { type: 'string', description: '.dspack 本地路径或 http(s) URL' },
      name: { type: 'string', description: '覆盖 profile 名' },
      profilesRoot: { type: 'string', description: 'profiles 根目录，缺省 ~/.dsh/profiles' },
      force: { type: 'boolean', description: '同名 profile 已存在时覆盖' },
      dryRun: { type: 'boolean', description: '只校验不落盘' },
      noInstall: { type: 'boolean', description: '跳过 pnpm install' },
    },
    required: ['source'],
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        profileName: { type: 'string' },
        dir: { type: 'string' },
        dryRun: { type: 'boolean' },
        installed: { type: 'boolean' },
        filesDownloaded: { type: 'integer' },
      },
      required: ['profileName'],
    },
    render: (_args, v) =>
      text(
        v.dryRun
          ? `校验通过，安装为 profile「${v.profileName}」（未落盘）`
          : `已安装 profile「${v.profileName}」→ ${v.dir}`,
      ),
  },
  execute: async (args) => {
    const host = getHost();
    const r = await installPack(host, {
      source: args.source,
      name: args.name,
      profilesRoot: args.profilesRoot,
      force: args.force === true,
      dryRun: args.dryRun === true,
      noInstall: args.noInstall === true,
    });
    return {
      profileName: r.profileName,
      dir: r.dir,
      dryRun: r.dryRun === true,
      installed: r.installed === true,
      filesDownloaded: r.filesDownloaded ?? 0,
    };
  },
  presentCall: card('安装整合包'),
};

/** 全部注册顺序：列表 → 导出 → 查看 → 安装。 */
export const dspackToolDefinitions = [dspackList, dspackExport, dspackView, dspackInstall];

export { dspackList, dspackExport, dspackView, dspackInstall };