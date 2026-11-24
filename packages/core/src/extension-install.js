import { checkoutSkill, checkSkillSource } from './extension-skills.js';
import { hasInstalledConfig, copyLocalPatchItem, credentialRefs, fillSlots, mcpNamespaceBindings, mergePatch, openCredentialStore, patchConflict } from './extension-patch.js';
import { digestFiles, expandTemplate, protectedTarget, readJson, readTree, relativePath, safePath, segment } from './extension-files.js';
import { validatedItems } from './extension-validate.js';

const has = (obj,key) => Object.hasOwn(obj ?? {},key);
const marker = ref => '$'+'{credential:'+ref+'}';

function resolvedScope(item, opts) {
  if (item.scope === 'home') return opts.manifest.type === 'dshhome' ? null : opts.profileName;
  if (!item.scope.startsWith('profile:')) throw new Error('无效的配置作用域');
  const name = segment(item.scope.slice(8));
  if (opts.manifest.type !== 'dshhome') return opts.profileName;
  if (!has(opts.manifest.profiles,name)) throw new Error('扩展条目引用未知 profile：'+name);
  return name;
}

function scopeRoot(host, opts, name, actual = false) {
  const home = actual ? (opts.credentialHome || opts.home) : opts.home;
  if (opts.manifest.type !== 'dshhome') return (actual && opts.credentialProfileDir) || opts.profileDir || host.joinPath(home,'profiles',segment(opts.profileName));
  return name == null ? home : host.joinPath(home,'profiles',name);
}

async function checkedBytes(host,entries,kind,file) {
  if (!file || !/^[a-f0-9]{64}$/.test(file.sha256) || file.entry !== 'extension-data/'+kind+'/'+file.sha256 ||
      !(entries[file.entry] instanceof Uint8Array) || await host.sha256(entries[file.entry]) !== file.sha256) {
    throw new Error('扩展文件缺失或摘要不符');
  }
  return entries[file.entry];
}

function dotenv(text,ref) {
  for (const line of (text ?? '').split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (match?.[1] === ref) {
      const value = match[2].trim();
      return ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) ? value.slice(1,-1) : value;
    }
  }
  return null;
}

async function existingSecret(host,home,profile,ref) {
  const env = host.env?.(ref);
  if (env) return env;
  const raw = await host.readTextFile(host.joinPath(home,'.credentials.yaml'));
  if (raw != null) {
    const v = openCredentialStore(raw).getIn(['refs',ref]);
    if (typeof v === 'string' && v) return v;
  }
  for (const dir of new Set([profile,home])) {
    const v = dotenv(await host.readTextFile(host.joinPath(dir,'.env')),ref);
    if (v) return v;
  }
  return null;
}

// 一个 profile 同时加载 HOME 和本档的补丁。不同 profile 的客户实例不共用工具注册表。
async function resolveMcpNamespaces(host,opts,actions) {
  const candidates = actions.filter(a=>a.mcp);
  if (!candidates.length) return;
  const whole = opts.manifest.type === 'dshhome';
  const home = opts.credentialHome || opts.home;
  const roots = new Map([[null,home]]);
  if (whole && candidates.some(a=>a.mcp.scope === null)) {
    const profiles = host.joinPath(home,'profiles');
    for (const entry of await host.readdir(profiles) || []) {
      if (entry.type === 'dir') roots.set(entry.name,entry.abs);
    }
    for (const name of Object.keys(opts.manifest.profiles)) roots.set(name,host.joinPath(profiles,name));
  }
  const existing = [];
  for (const [scope,root] of roots) {
    const patch = await host.readTextFile(host.joinPath(root,'cordis.patch.yml'));
    for (const entry of mcpNamespaceBindings(patch)) existing.push({...entry,scope});
  }
  const overlaps = (a,b) => a.server === b.server && a.owner !== b.owner &&
    a.scope !== b.scope && (a.scope === null || b.scope === null);
  // 显式选取的包内条目优先，然后按清单顺序保留能共存的条目。
  const priority = a => opts.decisions?.[a.item.key] === 'replace' ? 0 : 1;
  const chosen = [];
  for (const action of candidates.sort((a,b)=>priority(a)-priority(b))) {
    const {item,mcp} = action;
    if (existing.some(other=>overlaps(mcp,other))) {
      item.conflict = true;
      item.skipped = true;
      if (priority(action) === 0) throw new Error('MCP 名称已由另一作用域的本地条目占用，请先改名或跳过：'+mcp.server);
      continue;
    }
    if (item.skipped) continue;
    const other = chosen.find(a=>overlaps(mcp,a.mcp));
    if (other) {
      item.conflict = true;
      item.skipped = true;
      if (priority(action) === 0 && priority(other) === 0) throw new Error('所选 MCP 条目使用相同名称，请只选择可共存的条目：'+mcp.server);
    } else chosen.push(action);
  }
}

export async function planExtensionInstall(host, opts) {
  const {entries,manifest,home} = opts;
  const realHome = opts.credentialHome || home;
  const actions = [];
  const targetFiles = new Set();
  const patchIds = new Set();
  const pending = [];
  const preservePaths = [];
  const directories = [];
  function homeRel(abs) {
    const prefix = host.resolvePath(home).replace(/\\/g,'/')+'/';
    const path = host.resolvePath(abs).replace(/\\/g,'/');
    return path.toLowerCase().startsWith(prefix.toLowerCase()) ? path.slice(prefix.length) : null;
  }
  const records = validatedItems(manifest,entries);
  const useCounts = new Map();
  for (const record of records) for (const ref of record.credentialRefs ?? []) useCounts.set(ref,(useCounts.get(ref) || 0)+1);
  for (const record of records) {
    const scope = resolvedScope(record,opts);
    const root = scopeRoot(host,opts,scope);
    const actualRoot = scopeRoot(host,opts,scope,true);
    const item = {key:record.key,id:record.id,kind:record.kind,scope:record.scope,name:record.name,desc:record.desc,
      destination:'',conflict:false,credentialRefs:[],missingCredentials:[],availableCredentials:[]};
    let run, preserve;
    let duplicate = false;
    if (record.kind === 'provider' || record.kind === 'mcp') {
      if (record.kind === 'mcp' && (record.value?.name !== '@deepseek-ai/dsh-mcp-client' ||
          record.value?.id !== record.id || !record.value.config?.serverName)) throw new Error('MCP 配置与行 ID 不符');
      const patch = host.joinPath(root,'cordis.patch.yml');
      const actualPatch = host.joinPath(actualRoot,'cordis.patch.yml');
      const current = await host.readTextFile(actualPatch);
      const config = record.kind === 'mcp' ? record.value.config : record.value;
      item.destination = [config.url,config.baseURL,config.baseUrl,config.command].find(v=>typeof v === 'string') || record.id;
      const ids = [actualPatch+'/'+record.kind+'/'+record.id];
      if (record.kind === 'mcp') ids.push(actualPatch+'/server/'+record.value.config.serverName);
      duplicate = ids.some(id=>patchIds.has(id));
      item.conflict = patchConflict(current,record) || duplicate;
      preserve = async () => {
        if (!opts.staging || !current) return;
        const staged = await host.readTextFile(patch);
        const kept = copyLocalPatchItem(current,staged,record);
        if (kept !== staged) await host.writeTextFile(patch,kept);
      };
      ids.forEach(id=>patchIds.add(id));
      const values = Object.create(null), activeRefs = Object.create(null);
      item.credentialRefs = credentialRefs(record);
      for (const ref of item.credentialRefs) {
        const scopedInput = opts.credentials?.[record.key];
        const explicit = opts.confirmedCredentials?.[record.key] === true;
        let supplied = scopedInput && typeof scopedInput === 'object' && has(scopedInput,ref) ? scopedInput[ref] : undefined;
        if (supplied === undefined && (useCounts.get(ref) === 1 || explicit) && has(opts.credentials,ref)) supplied = opts.credentials[ref];
        if (supplied && (typeof supplied !== 'string' || !/^[\x21-\x7e]+$/.test(supplied))) throw new Error('凭据含无效字符：'+ref);
        activeRefs[ref] = ref;
        const existing = await existingSecret(host,realHome,actualRoot,ref);
        if (existing) item.availableCredentials.push(ref);
        if (existing && explicit) values[ref] = existing;
        else if (supplied) {
          if ((existing && existing !== supplied) || useCounts.get(ref)>1) {
            // 共享引用不能让新输入的密钥被另一个用途直接消费。
            const hash = await host.sha256(new TextEncoder().encode(JSON.stringify([actualRoot,record.key,item.destination,ref])));
            activeRefs[ref] = 'DSPACK_'+hash.slice(0,16).toUpperCase()+'_'+ref;
            const old = await existingSecret(host,realHome,actualRoot,activeRefs[ref]);
            if (old && old !== supplied) throw new Error('此用途已有独立凭据，请先在 DSH 中更新：'+activeRefs[ref]);
          }
          values[activeRefs[ref]] = supplied;
        } else item.missingCredentials.push(ref);
      }
      run = async () => {
        const tokens = Object.fromEntries(item.credentialRefs.map(ref=>[ref,marker(activeRefs[ref])]));
        const value = fillSlots(record.value,tokens);
        if (record.kind === 'provider' && value.apiKeyEnv) value.apiKeyEnv = activeRefs[value.apiKeyEnv];
        if (record.kind === 'mcp' && record.binding !== 'manager' && item.credentialRefs.length) value.config.expandTemplates = true;
        await host.writeTextFile(patch,mergePatch(await host.readTextFile(patch),record,value));
        pending.push({record,values,expected:value,actualPatch,actualRoot});
      };
    } else if (record.kind === 'path') {
      if (!Array.isArray(record.paths) || !Array.isArray(record.files)) throw new Error('插件路径声明无效');
      const files = [], emptyDirs = [];
      const dirRecords = new Set(record.directories ?? []);
      for (const file of [...record.files,...dirRecords]) {
        if (!Number.isInteger(file.index) || !has(record.paths,file.index) || typeof file.tail !== 'string') throw new Error('插件文件不属于路径规则');
        if (file.tail) relativePath(file.tail);
        const suffix = file.tail ? '/'+file.tail : '';
        const sourceProfile = record.scope.startsWith('profile:') ? record.scope.slice(8) : manifest.profileName;
        const sourceRel = expandTemplate(record.paths[file.index],sourceProfile)+suffix;
        if (sourceRel !== file.path || protectedTarget(sourceRel)) throw new Error('插件载荷目标越出声明');
        const rel = expandTemplate(record.paths[file.index],scope)+suffix;
        const scoped = manifest.type !== 'dshhome' && scope && rel.startsWith('profiles/'+scope+'/');
        const tail = scoped ? rel.slice(('profiles/'+scope+'/').length) : rel;
        const dest = await safePath(host,scoped ? root : home,tail);
        const real = await safePath(host,scoped ? actualRoot : realHome,tail);
        if (targetFiles.has(real.toLowerCase())) throw new Error('插件载荷目标重复');
        targetFiles.add(real.toLowerCase());
        if (dirRecords.has(file)) {
          const existing = await host.packEntryType(real);
          if (existing && existing !== 'dir') item.conflict = true;
          emptyDirs.push(dest);
          continue;
        }
        const data = await checkedBytes(host,entries,'path',file);
        if (await host.stat(real) && await host.sha256File(real) !== file.sha256) item.conflict=true;
        files.push({dest,data});
      }
      item.destination = record.paths.join(', ');
      preserve = async () => {
        for (const f of files) { const rel = homeRel(f.dest); if (rel) preservePaths.push(rel); }
        for (const dest of emptyDirs) { const rel = homeRel(dest); if (rel) preservePaths.push(rel); }
      };
      run = async () => {
        for (const dest of emptyDirs) {
          await host.mkdir(dest);
          const rel = homeRel(dest);
          if (rel) directories.push(rel);
        }
        for (const f of files) await host.writeFile(f.dest,f.data);
      };
    } else {
      const id = segment(record.id);
      const scopedSlot = manifest.type === 'dshhome' && record.scope !== 'home';
      const skillRoot = scopedSlot ? host.joinPath(home,'.dsh-pack','skills',scope) : opts.skillRoot || host.joinPath(home,'skills');
      const dest = await safePath(host,skillRoot,id);
      const realSkillRoot = scopedSlot ? host.joinPath(realHome,'.dsh-pack','skills',scope)
        : opts.actualSkillRoot || (opts.credentialHome ? host.joinPath(realHome,'skills') : skillRoot);
      const actual = await safePath(host,realSkillRoot,id);
      item.destination = actual;
      preserve = async () => { const rel = homeRel(dest); if (rel) preservePaths.push(rel); };
      const stat = await host.stat(actual);
      let localDigest;
      if (stat?.isDirectory) localDigest = await digestFiles(host,await readTree(host,actual));
      if (stat?.isFile) localDigest = await digestFiles(host,new Map([[id,await host.readFile(actual)]]));
      let baseline = record.digest;
      if (record.mode !== 'embedded' && stat?.isDirectory) {
        const origin = await readJson(host,host.joinPath(actual,'.dsh-skill.json'));
        if (origin?.repo === record.repository+(record.subdir ? '#/'+record.subdir : '') && origin.digest) baseline = origin.digest;
      }
      item.conflict = !!stat && localDigest !== baseline;
      if (record.mode !== 'embedded') checkSkillSource(record);
      if (record.mode === 'embedded' && !Array.isArray(record.files)) throw new Error('内嵌技能缺少文件');
      const embedded = new Map();
      for (const f of record.files ?? []) {
        relativePath(f.path);
        if ([...embedded.keys()].some(k=>k.toLowerCase() === f.path.toLowerCase())) throw new Error('技能文件路径重复');
        embedded.set(f.path,await checkedBytes(host,entries,'skill',f));
      }
      if (record.mode === 'embedded' && (!embedded.size || await digestFiles(host,embedded) !== record.digest ||
        (record.flat ? !embedded.has(id) || embedded.size !== 1 : !embedded.has('SKILL.md')))) throw new Error('内嵌技能文件清单与摘要不符');
      run = async () => {
        const remote = record.mode === 'embedded' ? null : await checkoutSkill(host,record,id);
        if (record.mode === 'fixed' && remote.digest !== record.digest) throw new Error('固定提交的技能内容与归档摘要不符');
        const files = remote?.files || embedded;
        const nonce = await host.mkdtemp('dspack-skill-install-');
        const temp = host.joinPath(skillRoot,'.'+host.basename(nonce));
        await host.rm(nonce,{recursive:true,force:true});
        if (await host.stat(temp)) throw new Error('技能暂存目录已存在');
        await host.mkdir(temp);
        const staged = host.joinPath(temp,'new'), old = host.joinPath(temp,'old');
        try {
          if (record.flat) await host.writeFile(staged,files.get(id));
          else {
            for (const [path,data] of files) await host.writeFile(host.joinPath(staged,...path.split('/')),data);
            if (remote) {
              const origin = {repo:remote.repository+(remote.subdir ? '#/'+remote.subdir : ''),commit:remote.commit,ref:remote.ref,mode:remote.mode,digest:remote.digest};
              await host.writeTextFile(host.joinPath(staged,'.dsh-skill.json'),JSON.stringify(origin,null,2)+'\n');
              item.commit = remote.commit;
            }
          }
          const wasPresent = !!await host.stat(dest);
          if (wasPresent) await host.move(dest,old);
          try { await host.move(staged,dest); }
          catch (e) { if (wasPresent) await host.move(old,dest); throw e; }
        } finally { await host.rm(temp,{recursive:true,force:true}); }
      };
    }
    const decision = opts.decisions?.[item.key];
    item.skipped = decision === 'skip' || decision === 'keep' || item.missingCredentials.length > 0 ||
      ((duplicate || item.conflict && !opts.staging) && decision !== 'replace');
    const mcp = record.kind === 'mcp' ? {
      scope, server:record.value.config.serverName,
      owner:record.binding === 'manager' ? 'manager:'+(record.owner || 'mcp-manager') : 'client:'+record.id,
    } : undefined;
    actions.push({item,run,preserve,mcp});
  }
  await resolveMcpNamespaces(host,opts,actions);
  return {
    items:actions.map(a=>a.item), preservePaths, directories,
    async apply() {
      for (const {item,run,preserve} of actions) {
        if (item.skipped) { await preserve(); continue; }
        await run();
      }
    },
    async commitCredentials() {
      for (const {record,values,expected,actualPatch,actualRoot} of pending) {
        const raw = await host.readTextFile(actualPatch);
        if (!hasInstalledConfig(raw,record,expected)) continue;
        for (const ref of Object.keys(values)) {
          if (await existingSecret(host,realHome,actualRoot,ref)) continue;
          const value = values[ref];
          if (typeof value !== 'string' || !/^[\x21-\x7e]+$/.test(value)) throw new Error('凭据含无效字符：'+ref);
          const dest = host.joinPath(realHome,'.credentials.yaml');
          const store = openCredentialStore(await host.readTextFile(dest));
          store.setIn(['refs',ref],value);
          if (typeof host.writeCredentialStore !== 'function') throw new Error('宿主无法安全保存凭据');
          await host.writeCredentialStore(dest,store.toString());
        }
      }
    },
  };
}
