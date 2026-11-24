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
    dialog.style.cssText = 'width:min(46rem,90vw);max-height:80vh;overflow:auto;padding:1.5rem;color:CanvasText;background:Canvas';
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
    form.append(error, ok, cancel);
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
        details.append(node('summary', profile + ' · ' + id));
        const before = (whole ? current.profilePlugins?.[profile] : current.plugins)?.[id] || {};
        const auto = plugins[id] || {};
        const name = field(details, '名称（文本或语言对象）', asInput(before.name ?? auto.name));
        const desc = field(details, '简介（文本或语言对象）', asInput(before.desc ?? auto.desc));
        const icon = field(details, '图标地址', before.icon ?? auto.icon);
        const registry = field(details, '此版本专用 npm registry', before.source?.registry ?? auto.source?.registry);
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
          } else if (auto.source?.registry) {
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

export async function reviewInstall(preview, options) {
  let first = await preview({ ...options, dryRun: true, recoverInterrupted: !options.dryRun });
  if (options.dryRun) return first;
  if (first.exists && !options.update && !options.force && first.manifest?.manifestVersion === 6) {
    const confirmed = await openForm('更新已有整合包', (form) => {
      form.append(node('p', '保留本地数据并更新 ' + first.dir));
      return () => true;
    });
    if (!confirmed) return null;
    options = { ...options, update: true };
    first = await preview({ ...options, dryRun: true });
  }
  if (first.unknownBase) {
    const old = await openForm('首次更新：核对旧包', (form) => {
      const source = field(form, '可选的旧整合包路径或 URL');
      const sha = field(form, '原版本 SHA-256');
      return () => ({ previousSource: source.value.trim(), previousSha256: sha.value.trim() });
    });
    if (!old) return null;
    if (old.previousSource) {
      options = { ...options, ...old };
      first = await preview({ ...options, dryRun: true });
    }
  }
  const refs = (first.items || []).filter((item) => item.credentialRefs?.length);
  const choices = refs.length ? await openForm('凭据与使用目标', (form) => {
    const fields = refs.map((item) => {
      form.append(node('h3', labelOf(item.name) || item.id), node('p', item.destination));
      const confirmed = field(form, '允许此目标使用本机已有凭据', '', 'checkbox');
      const secrets = item.credentialRefs.map((key) => [key, field(form, key, '', 'password')]);
      return { item, confirmed, secrets };
    });
    return () => {
      const credentials = Object.create(null), confirmedCredentials = Object.create(null);
      for (const { item, confirmed, secrets } of fields) {
        if (confirmed.checked) confirmedCredentials[item.key] = true;
        for (const [key, input] of secrets) if (input.value) {
          (credentials[item.key] ??= Object.create(null))[key] = input.value;
        }
      }
      return { credentials, confirmedCredentials };
    };
  }) : {};
  if (!choices) return null;
  const plan = refs.length ? await preview({ ...options, ...choices, dryRun: true }) : first;
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
  return { ...options, ...choices, previewToken: plan.previewToken, resolutions };
}
