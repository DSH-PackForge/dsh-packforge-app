function node(tag, text) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
}

function labelOf(value) {
  if (typeof value === 'string') return value;
  return value?.[navigator.language] || value?.[navigator.language.split('-')[0]] || Object.values(value || {})[0] || '';
}

function field(parent, caption, value = '', type = 'text') {
  const label = node('label', caption + ' ');
  label.style.display = 'block';
  const input = node('input');
  input.type = type;
  input.value = value;
  if (type === 'password') input.autocomplete = 'new-password';
  label.append(input);
  parent.append(label);
  return input;
}

function openForm(title, build) {
  return new Promise((resolve) => {
    const dialog = node('dialog');
    dialog.className = 'pack-resource-dialog';
    const style = node('style');
    style.textContent = `
      .pack-resource-dialog {box-sizing:border-box;width:min(46rem,90vw);max-height:80vh;overflow:auto;padding:1.4rem 1.6rem;border:1px solid var(--dsw-border-l1,GrayText);border-radius:14px;color:var(--dsw-label-primary,CanvasText);background:var(--dsw-bg-layer-1,Canvas);box-shadow:0 18px 64px #0003}
      .pack-resource-dialog::backdrop {background:#151b2b60}
      .pack-resource-dialog h2 {margin:0 0 1rem;font-size:1.25rem}
      .pack-resource-dialog h3 {font-size:1rem;margin:.9rem 0 .4rem}
      .pack-resource-dialog details,.pack-resource-dialog .pack-resource-row {border:1px solid var(--dsw-border-l1,GrayText);border-radius:8px;padding:.65rem .85rem;margin:.5rem 0}
      .pack-resource-dialog summary {cursor:pointer;font-weight:600}
      .pack-resource-dialog label {margin:.35rem 0}
      .pack-resource-dialog input:not([type=checkbox]) {display:block;max-width:100%;width:100%;box-sizing:border-box}
      .pack-resource-dialog small {overflow-wrap:anywhere;color:var(--dsw-label-tertiary,GrayText)}
      .pack-resource-row>label {display:flex;align-items:center;justify-content:space-between;gap:1rem;font-weight:600}
      .pack-resource-row>label>select {width:auto}
      .pack-resource-row p {margin:.35rem 0;font-size:.9em}
      .pack-resource-actions {display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem}
    `;
    dialog.append(style);
    const form = node('form');
    form.append(node('h2', title));
    const read = build(form);
    const error = node('p');
    error.role = 'alert';
    const ok = node('button', '确认');
    const cancel = node('button', '取消');
    cancel.type = 'button';
    cancel.onclick = () => dialog.close();
    let result = null;
    const buttons = node('div');
    buttons.className = 'pack-resource-actions';
    cancel.className = 'ghost';
    ok.className = 'primary';
    buttons.append(cancel, ok);
    form.append(error, buttons);
    form.onsubmit = (event) => {
      event.preventDefault();
      try {
        result = read();
        dialog.close();
      } catch (cause) {
        error.textContent = cause.message;
      }
    };
    dialog.onclose = () => { dialog.remove(); resolve(result); };
    dialog.append(form);
    document.body.append(dialog);
    dialog.showModal();
  });
}

function textValue(input) {
  const value = input.value.trim();
  return value.startsWith('{') ? JSON.parse(value) : value;
}

function asInput(value) {
  return typeof value === 'object' && value ? JSON.stringify(value) : value || '';
}

/** 两个桌面入口共享导出选择；私有凭据只在导入对话框中出现。 */
export function chooseExportResources(candidates, units, current = {}, whole = false) {
  return openForm('整合包资源与插件', (form) => {
    const fields = [];
    const groups = { paths: '插件额外路径', providers: '模型提供商', mcp: 'MCP 服务器', skills: '技能' };
    for (const [group, title] of Object.entries(groups)) {
      const list = candidates[group] || [];
      if (!list.length) continue;
      form.append(node('h3', title));
      for (const item of list) {
        const saved = current.selection?.[group]?.find((entry) => (entry.key || entry) === item.key);
        const box = field(form, [labelOf(item.name) || item.id, item.scope].filter(Boolean).join(' · '), '', 'checkbox');
        box.checked = Boolean(saved);
        if (item.desc) form.append(node('small', labelOf(item.desc)));
        let skill;
        if (group === 'skills') skill = skillFields(form, { ...item.source, ...item, ...(typeof saved === 'object' ? saved : {}) });
        let metadata;
        if (!skill) {
          const details = node('details');
          details.append(node('summary','资源显示信息'));
          const name = field(details,'名称（文本或语言对象）',asInput(saved?.name ?? item.name));
          const desc = field(details,'简介（文本或语言对象）',asInput(saved?.desc ?? item.desc));
          form.append(details);
          metadata = () => {
            const values = {key:item.key};
            const nextName = textValue(name), nextDesc = textValue(desc);
            if (nextName && JSON.stringify(nextName) !== JSON.stringify(item.name)) values.name = nextName;
            if (JSON.stringify(nextDesc) !== JSON.stringify(item.desc || '')) values.desc = nextDesc;
            return Object.keys(values).length > 1 ? values : item.key;
          };
        }
        fields.push({ group, item, box, skill, metadata });
      }
    }
    form.append(node('h3', '远程技能'));
    const remote = [];
    const add = node('button', '添加 Git 仓库技能');
    add.type = 'button';
    const remoteList = node('div');
    form.append(remoteList, add);
    function appendRemote(item) {
      const row = node('fieldset');
      const id = field(row, '技能目录名', item.id);
      const scope = node('select');
      if (whole) {
        scope.setAttribute('aria-label','技能安装范围');
        for (const value of ['home',...Object.keys(units).map(name=>'profile:'+name)]) {
          const option = node('option',value);
          option.value = value;
          scope.append(option);
        }
        scope.value = item.scope || (item.key?.startsWith('skill:profile:') ? item.key.slice(6,item.key.lastIndexOf(':')) : 'home');
        row.append(scope);
      }
      const readSkill = skillFields(row, { mode: 'fixed', ...item }, false);
      const remove = node('button', '移除');
      remove.type = 'button';
      remove.onclick = () => row.remove();
      row.append(remove);
      remoteList.append(row);
      remote.push(() => row.isConnected ? { ...readSkill(), id:id.value.trim(), scope:whole ? scope.value : 'home',
        key:'skill:'+(whole ? scope.value : 'home')+':'+id.value.trim() } : null);
    }
    for (const item of current.selection?.skills || []) {
      if (typeof item === 'object' && !fields.some((f) => f.item.key === item.key)) appendRemote(item);
    }
    add.onclick = () => appendRemote({});
    const pluginRows = [];
    for (const [profile, unit] of Object.entries(units)) {
      const plugins = unit.plugins || {};
      const ids = new Set([...Object.keys(plugins), ...(unit.bundles || []), ...Object.keys(unit.dependencies || {})]);
      for (const id of ids) {
        const details = node('details');
        const version = unit.dependencies?.[id];
        details.append(node('summary', profile + ' · ' + id + (version ? '@' + version : '')));
        const before = (whole ? current.profilePlugins?.[profile] : current.plugins)?.[id] || {};
        const auto = plugins[id] || {};
        const name = field(details, '名称（文本或语言对象）', asInput(before.name ?? auto.name));
        const desc = field(details, '简介（文本或语言对象）', asInput(before.desc ?? auto.desc));
        const icon = field(details, '图标地址', before.icon ?? auto.icon);
        const savedSource = version && before.version === version ? before.source : undefined;
        const registry = field(details, '此版本专用 npm registry', savedSource?.registry ?? auto.source?.registry);
        registry.placeholder = '使用默认 registry';
        form.append(details);
        pluginRows.push(() => {
          const entry = {};
          const update = (key, value) => {
            if (value && (Object.hasOwn(before, key) || JSON.stringify(value) !== JSON.stringify(auto[key]))) entry[key] = value;
          };
          update('name', textValue(name));
          update('desc', textValue(desc));
          update('icon', icon.value.trim());
          if (registry.value.trim()) {
            entry.source = { type: 'npm', registry: registry.value.trim() };
            entry.version = unit.dependencies?.[id];
          } else if (auto.source?.registry || savedSource) {
            entry.source = { type: 'npm' };
            entry.version = unit.dependencies?.[id];
          }
          return { profile, id, entry };
        });
      }
    }
    return () => {
      const selection = { paths: [], providers: [], mcp: [], skills: [] };
      for (const { group, box, item, skill, metadata } of fields) {
        if (box.checked) selection[group].push(skill ? { key: item.key, id: item.id, ...skill() } : metadata());
      }
      selection.skills.push(...remote.map((row) => row()).filter(Boolean));
      const profilePlugins = Object.create(null);
      for (const read of pluginRows) {
        const { profile, id, entry } = read();
        if (!Object.keys(entry).length) continue;
        (profilePlugins[profile] ??= Object.create(null))[id] = entry;
      }
      return whole ? { selection, profilePlugins } : { selection, plugins: Object.values(profilePlugins)[0] || {} };
    };
  });
}

function skillFields(parent, skill, embedded = true) {
  const details = node('details');
  details.append(node('summary', '技能来源与显示信息'));
  const mode = node('select');
  for (const [id, title] of [['embedded', '随包携带'], ['fixed', '固定提交'], ['track', '跟踪分支或标签']]) {
    if (!embedded && id === 'embedded') continue;
    const option = node('option', title);
    option.value = id;
    mode.append(option);
  }
  mode.value = skill.mode || (embedded ? 'embedded' : 'fixed');
  details.append(mode);
  const repo = field(details, 'Git 仓库', skill.repository || skill.repo);
  const subdir = field(details, '仓内目录', skill.subdir);
  const ref = field(details, '提交、分支或标签', mode.value === 'fixed' ? skill.commit || skill.ref : skill.ref || skill.commit);
  mode.onchange = () => { ref.value = mode.value === 'fixed' ? skill.commit || '' : skill.ref || ''; };
  const name = field(details, '名称（文本或语言对象）', asInput(skill.name));
  const desc = field(details, '简介（文本或语言对象）', asInput(skill.desc));
  parent.append(details);
  return () => ({ mode: mode.value, repository: repo.value.trim(), subdir: subdir.value.trim(), ref: ref.value.trim(), name: textValue(name), desc: textValue(desc) });
}

function selectResources(form, items) {
  const kinds = { path: '插件数据', provider: '模型服务商', mcp: 'MCP 服务', skill: '技能' };
  const rows = items.map(item => {
    const row = node('section');
    row.className = 'pack-resource-row';
    const title = labelOf(item.name) || item.id;
    const heading = node('label', title);
    const action = node('select');
    action.setAttribute('aria-label', title + '的导入方式');
    for (const [value, label] of [
      ['auto', item.canReplace === false ? '保留现状' : item.conflict ? '按更新规则合并' : '导入'],
      ...(item.conflict && item.canReplace !== false ? [['keep', '保留本地'], ['replace', '选用包内条目']] : []),
      ['skip', '跳过'],
    ]) {
      const option = node('option', label);
      option.value = value;
      action.append(option);
    }
    heading.append(action);
    row.append(heading, node('small', [kinds[item.kind], item.scope, item.destination].filter(Boolean).join(' · ')));
    if (item.desc) row.append(node('p', labelOf(item.desc)));
    if (item.notice) row.append(node('p', item.notice));
    const inputs = node('div');
    const reuse = item.availableCredentials?.length ? field(inputs, '允许此目标使用本机已有凭据', '', 'checkbox') : null;
    const secrets = (item.credentialRefs || []).map(key => [key, field(inputs, key, '', 'password')]);
    if (secrets.length && item.canReplace !== false) row.append(inputs);
    action.onchange = () => { inputs.hidden = action.value === 'skip' || action.value === 'keep'; };
    form.append(row);
    return { item, action, reuse, secrets };
  });
  return () => {
    const decisions = Object.create(null), credentials = Object.create(null), confirmedCredentials = Object.create(null);
    for (const { item, action, reuse, secrets } of rows) {
      if (action.value !== 'auto') decisions[item.key] = action.value;
      if (item.canReplace === false || action.value === 'skip' || action.value === 'keep') continue;
      if (reuse?.checked) confirmedCredentials[item.key] = true;
      for (const [key, input] of secrets) if (input.value) (credentials[item.key] ??= Object.create(null))[key] = input.value;
    }
    return { decisions, credentials, confirmedCredentials };
  };
}

export async function reviewInstall(preview, options) {
  if (options.dryRun) return preview({ ...options, dryRun: true });
  const listing = await preview({ ...options, dryRun: true, listResourcesOnly: true, recoverInterrupted: true });
  if (listing.exists && !options.update && !options.force && listing.manifest?.manifestVersion === 6) {
    const confirmed = await openForm('更新已有整合包', (form) => {
      form.append(node('p', '保留本地数据并更新 ' + listing.dir));
      return () => true;
    });
    if (!confirmed) return null;
    options = { ...options, update: true };
  }
  if (listing.items?.length) {
    const choices = await openForm('选择要导入的资源', form => selectResources(form, listing.items));
    if (!choices) return null;
    options = { ...options, ...choices };
  }
  const prepare = () => preview({ ...options, dryRun: true, recoverInterrupted: true });
  let plan = listing.resourcesOnly || options.update ? await prepare() : listing;
  if (plan.unknownBase) {
    const old = await openForm('首次更新：核对旧包', (form) => {
      const source = field(form, '可选的旧整合包路径或 URL');
      const sha = field(form, '原版本 SHA-256');
      return () => ({ previousSource: source.value.trim(), previousSha256: sha.value.trim() });
    });
    if (!old) return null;
    if (old.previousSource) {
      options = { ...options, ...old };
      plan = await prepare();
    }
  }
  const conflicts = plan.conflicts || [];
  let resolutions = {};
  if (conflicts.length) {
    resolutions = await openForm('更新冲突（默认保留本地）', (form) => {
      const rows = conflicts.flatMap((item) => (item.fields?.length ? item.fields : [{key:item.path}]).map((member) => [
        member.key, field(form, '采用新版 · ' + [item.path, member.label].filter(Boolean).join(' / '), '', 'checkbox'),
      ]));
      return () => Object.fromEntries(rows.filter(([, input]) => input.checked).map(([path]) => [path, 'upstream']));
    });
    if (!resolutions) return null;
  }
  return { ...options, previewToken: plan.previewToken, resolutions };
}
