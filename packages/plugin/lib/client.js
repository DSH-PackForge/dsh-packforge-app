(() => {
  // packages/core/src/host.js
  var Host = class {
    /** 连接路径片段为绝对路径（Node: path.join）。 */
    joinPath(..._parts) {
      throw new Error("Host.joinPath \u672A\u5B9E\u73B0");
    }
    /** 解析路径为绝对路径（Node: path.resolve；相对片段基于 cwd）。 */
    resolvePath(..._parts) {
      throw new Error("Host.resolvePath \u672A\u5B9E\u73B0");
    }
    /** 进程当前工作目录。 */
    cwd() {
      throw new Error("Host.cwd \u672A\u5B9E\u73B0");
    }
    /** 用户主目录（如 '~'）。 */
    homedir() {
      throw new Error("Host.homedir \u672A\u5B9E\u73B0");
    }
    /** 读环境变量；未设置 → null。 */
    env(_name) {
      throw new Error("Host.env \u672A\u5B9E\u73B0");
    }
    /** 路径最后一段（Node: path.basename）。 */
    basename(_abs) {
      throw new Error("Host.basename \u672A\u5B9E\u73B0");
    }
    /** 读文本（UTF-8）；不存在/无权 → null。 */
    async readTextFile(_abs) {
      throw new Error("Host.readTextFile \u672A\u5B9E\u73B0");
    }
    /** 写文本（UTF-8，无 BOM）；自动建父目录。 */
    async writeTextFile(_abs, _text) {
      throw new Error("Host.writeTextFile \u672A\u5B9E\u73B0");
    }
    /** 读二进制；不存在/无权 → null。 */
    async readFile(_abs) {
      throw new Error("Host.readFile \u672A\u5B9E\u73B0");
    }
    /** 写二进制；自动建父目录。 */
    async writeFile(_abs, _data) {
      throw new Error("Host.writeFile \u672A\u5B9E\u73B0");
    }
    /** 单路径元信息；不存在/无权 → null。返回 { size, isFile, isDirectory, isSymbolicLink }。 */
    async stat(_abs) {
      throw new Error("Host.stat \u672A\u5B9E\u73B0");
    }
    /** 读目录条目；不存在/无权 → null。返回 [{ name, abs, type }]，type ∈ file|dir|symlink|other。 */
    async readdir(_abs) {
      throw new Error("Host.readdir \u672A\u5B9E\u73B0");
    }
    /** 递归创建目录。 */
    async mkdir(_abs) {
      throw new Error("Host.mkdir \u672A\u5B9E\u73B0");
    }
    /** 删除（opts: { recursive?, force? }）。 */
    async rm(_abs, _opts) {
      throw new Error("Host.rm \u672A\u5B9E\u73B0");
    }
    /** 建临时目录，返回其绝对路径。 */
    async mkdtemp(_prefix) {
      throw new Error("Host.mkdtemp \u672A\u5B9E\u73B0");
    }
    /** 对一段字节求 sha256，返回 64 位十六进制。 */
    async sha256(_data) {
      throw new Error("Host.sha256 \u672A\u5B9E\u73B0");
    }
    /** 对文件求 sha256（建议流式，避免大文件整读进内存）。 */
    async sha256File(_abs) {
      throw new Error("Host.sha256File \u672A\u5B9E\u73B0");
    }
    /** 执行外部命令，返回 { status, error? }（Node: spawnSync 继承 stdio；插件/浏览器宿主另议）。 */
    async exec(_cmd, _args, _opts) {
      throw new Error("Host.exec \u672A\u5B9E\u73B0");
    }
    /** 下载 http(s) URL 到本地文件。 */
    async download(_url, _destAbs) {
      throw new Error("Host.download \u672A\u5B9E\u73B0");
    }
    /** 移动/重命名文件（跨目录），自动建目标父目录。 */
    async move(_from, _to) {
      throw new Error("Host.move \u672A\u5B9E\u73B0");
    }
  };

  // packages/core/src/manifest.js
  function validateManifest(m) {
    const errors = [];
    if (!m || typeof m !== "object" || Array.isArray(m)) return ["manifest.json \u7F3A\u5931\u6216\u4E0D\u662F\u5BF9\u8C61"];
    if (m.manifestVersion !== 4) {
      if (m.manifestVersion === 3 || m.manifestVersion === 2) {
        errors.push(`manifestVersion \u4E3A ${m.manifestVersion}\uFF08\u65E7\u7248 .tgz \u683C\u5F0F\uFF09\uFF0C\u672C\u5DE5\u5177\u4EC5\u5B89\u88C5 v4(.dspack) \u6574\u5408\u5305`);
      } else {
        errors.push("manifestVersion \u5FC5\u987B\u4E3A 4");
      }
    }
    if (m.type !== void 0 && m.type !== "profile") {
      errors.push('type \u4EC5\u652F\u6301 "profile"\uFF08collection \u4E3A\u9884\u7559\u503C\uFF0C\u6682\u672A\u652F\u6301\uFF09');
    }
    if (typeof m.name !== "string" || !m.name.trim()) errors.push("manifest.name \u7F3A\u5931\u6216\u4E3A\u7A7A");
    if (typeof m.version !== "string" || !m.version.trim()) errors.push("manifest.version \u7F3A\u5931\u6216\u4E3A\u7A7A");
    if (!Array.isArray(m.bundles) || m.bundles.some((b) => typeof b !== "string")) {
      errors.push("manifest.bundles \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4");
    }
    if (typeof m.dependencies !== "object" || m.dependencies === null || Array.isArray(m.dependencies)) {
      errors.push("manifest.dependencies \u5FC5\u987B\u662F\u5BF9\u8C61");
    } else {
      for (const [k, v] of Object.entries(m.dependencies)) {
        if (typeof v !== "string" || !v) errors.push(`dependencies[${k}] \u5FC5\u987B\u662F\u300C\u5750\u6807 \u2192 \u56FA\u5B9A\u7248\u672C\u300D\u5B57\u7B26\u4E32`);
      }
    }
    if (m.patch !== void 0 && typeof m.patch !== "string") errors.push("manifest.patch \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
    if (m.dshVersion !== void 0 && typeof m.dshVersion !== "string") errors.push("manifest.dshVersion \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
    for (const f of ["displayName", "description"]) {
      if (m[f] !== void 0 && !isLocaleString(m[f])) errors.push(`manifest.${f} \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6216\u591A\u8BED\u8A00\u5BF9\u8C61`);
    }
    if (m.files !== void 0) {
      if (!Array.isArray(m.files)) {
        errors.push("manifest.files \u5FC5\u987B\u662F\u6570\u7EC4");
      } else {
        m.files.forEach((f, i) => {
          for (const e of validateFileEntry(f)) errors.push(`files[${i}] ${e}`);
        });
      }
    }
    return errors;
  }
  function validateFileEntry(f) {
    const errors = [];
    if (!f || typeof f !== "object" || Array.isArray(f)) return ["\u4E0D\u662F\u5BF9\u8C61"];
    if (typeof f.path !== "string" || !f.path || f.path.startsWith("/") || /^[a-zA-Z]:/.test(f.path)) {
      errors.push('path \u5FC5\u987B\u662F\u76F8\u5BF9\u8DEF\u5F84\uFF08"+"\u5206\u9694\uFF0C\u4E0D\u4EE5\u76D8\u7B26/\u659C\u6760\u5F00\u5934\uFF09');
    }
    if (typeof f.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(f.sha256)) {
      errors.push("sha256 \u5FC5\u987B\u662F 64 \u4F4D\u5341\u516D\u8FDB\u5236");
    }
    if (typeof f.size !== "number" || !Number.isInteger(f.size) || f.size <= 0) {
      errors.push("size \u5FC5\u987B\u662F\u6B63\u6574\u6570");
    }
    if (!Array.isArray(f.urls) || f.urls.length === 0 || f.urls.some((u) => typeof u !== "string" || !/^https?:\/\//i.test(u))) {
      errors.push("urls \u5FC5\u987B\u662F\u975E\u7A7A\u6570\u7EC4\uFF0C\u4E14\u6BCF\u9879\u662F http(s) \u5730\u5740");
    }
    return errors;
  }
  function isLocaleString(v) {
    if (typeof v === "string") return true;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const keys = Object.keys(v);
      return keys.length > 0 && keys.every((k) => typeof k === "string" && k !== "" && typeof v[k] === "string");
    }
    return false;
  }

  // node_modules/.pnpm/fflate@0.8.3/node_modules/fflate/esm/browser.js
  var u8 = Uint8Array;
  var u16 = Uint16Array;
  var i32 = Int32Array;
  var fleb = new u8([
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    2,
    2,
    2,
    2,
    3,
    3,
    3,
    3,
    4,
    4,
    4,
    4,
    5,
    5,
    5,
    5,
    0,
    /* unused */
    0,
    0,
    /* impossible */
    0
  ]);
  var fdeb = new u8([
    0,
    0,
    0,
    0,
    1,
    1,
    2,
    2,
    3,
    3,
    4,
    4,
    5,
    5,
    6,
    6,
    7,
    7,
    8,
    8,
    9,
    9,
    10,
    10,
    11,
    11,
    12,
    12,
    13,
    13,
    /* unused */
    0,
    0
  ]);
  var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  var freb = function(eb, start) {
    var b = new u16(31);
    for (var i = 0; i < 31; ++i) {
      b[i] = start += 1 << eb[i - 1];
    }
    var r = new i32(b[30]);
    for (var i = 1; i < 30; ++i) {
      for (var j = b[i]; j < b[i + 1]; ++j) {
        r[j] = j - b[i] << 5 | i;
      }
    }
    return { b, r };
  };
  var _a = freb(fleb, 2);
  var fl = _a.b;
  var revfl = _a.r;
  fl[28] = 258, revfl[258] = 28;
  var _b = freb(fdeb, 0);
  var fd = _b.b;
  var revfd = _b.r;
  var rev = new u16(32768);
  for (i = 0; i < 32768; ++i) {
    x = (i & 43690) >> 1 | (i & 21845) << 1;
    x = (x & 52428) >> 2 | (x & 13107) << 2;
    x = (x & 61680) >> 4 | (x & 3855) << 4;
    rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
  }
  var x;
  var i;
  var hMap = (function(cd, mb, r) {
    var s = cd.length;
    var i = 0;
    var l = new u16(mb);
    for (; i < s; ++i) {
      if (cd[i])
        ++l[cd[i] - 1];
    }
    var le = new u16(mb);
    for (i = 1; i < mb; ++i) {
      le[i] = le[i - 1] + l[i - 1] << 1;
    }
    var co;
    if (r) {
      co = new u16(1 << mb);
      var rvb = 15 - mb;
      for (i = 0; i < s; ++i) {
        if (cd[i]) {
          var sv = i << 4 | cd[i];
          var r_1 = mb - cd[i];
          var v = le[cd[i] - 1]++ << r_1;
          for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
            co[rev[v] >> rvb] = sv;
          }
        }
      }
    } else {
      co = new u16(s);
      for (i = 0; i < s; ++i) {
        if (cd[i]) {
          co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
        }
      }
    }
    return co;
  });
  var flt = new u8(288);
  for (i = 0; i < 144; ++i)
    flt[i] = 8;
  var i;
  for (i = 144; i < 256; ++i)
    flt[i] = 9;
  var i;
  for (i = 256; i < 280; ++i)
    flt[i] = 7;
  var i;
  for (i = 280; i < 288; ++i)
    flt[i] = 8;
  var i;
  var fdt = new u8(32);
  for (i = 0; i < 32; ++i)
    fdt[i] = 5;
  var i;
  var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
  var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
  var max = function(a) {
    var m = a[0];
    for (var i = 1; i < a.length; ++i) {
      if (a[i] > m)
        m = a[i];
    }
    return m;
  };
  var bits = function(d, p, m) {
    var o = p / 8 | 0;
    return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
  };
  var bits16 = function(d, p) {
    var o = p / 8 | 0;
    return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
  };
  var shft = function(p) {
    return (p + 7) / 8 | 0;
  };
  var slc = function(v, s, e) {
    if (s == null || s < 0)
      s = 0;
    if (e == null || e > v.length)
      e = v.length;
    return new u8(v.subarray(s, e));
  };
  var ec = [
    "unexpected EOF",
    "invalid block type",
    "invalid length/literal",
    "invalid distance",
    "stream finished",
    "no stream handler",
    ,
    // determined by compression function
    "no callback",
    "invalid UTF-8 data",
    "extra field too long",
    "date not in range 1980-2099",
    "filename too long",
    "stream finishing",
    "invalid zip data"
    // determined by unknown compression method
  ];
  var err = function(ind, msg, nt) {
    var e = new Error(msg || ec[ind]);
    e.code = ind;
    if (Error.captureStackTrace)
      Error.captureStackTrace(e, err);
    if (!nt)
      throw e;
    return e;
  };
  var inflt = function(dat, st, buf, dict) {
    var sl = dat.length, dl = dict ? dict.length : 0;
    if (!sl || st.f && !st.l)
      return buf || new u8(0);
    var noBuf = !buf;
    var resize = noBuf || st.i != 2;
    var noSt = st.i;
    if (noBuf)
      buf = new u8(sl * 3);
    var cbuf = function(l2) {
      var bl = buf.length;
      if (l2 > bl) {
        var nbuf = new u8(Math.max(bl * 2, l2));
        nbuf.set(buf);
        buf = nbuf;
      }
    };
    var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
    var tbts = sl * 8;
    do {
      if (!lm) {
        final = bits(dat, pos, 1);
        var type = bits(dat, pos + 1, 3);
        pos += 3;
        if (!type) {
          var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
          if (t > sl) {
            if (noSt)
              err(0);
            break;
          }
          if (resize)
            cbuf(bt + l);
          buf.set(dat.subarray(s, t), bt);
          st.b = bt += l, st.p = pos = t * 8, st.f = final;
          continue;
        } else if (type == 1)
          lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
        else if (type == 2) {
          var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
          var tl = hLit + bits(dat, pos + 5, 31) + 1;
          pos += 14;
          var ldt = new u8(tl);
          var clt = new u8(19);
          for (var i = 0; i < hcLen; ++i) {
            clt[clim[i]] = bits(dat, pos + i * 3, 7);
          }
          pos += hcLen * 3;
          var clb = max(clt), clbmsk = (1 << clb) - 1;
          var clm = hMap(clt, clb, 1);
          for (var i = 0; i < tl; ) {
            var r = clm[bits(dat, pos, clbmsk)];
            pos += r & 15;
            var s = r >> 4;
            if (s < 16) {
              ldt[i++] = s;
            } else {
              var c = 0, n = 0;
              if (s == 16)
                n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
              else if (s == 17)
                n = 3 + bits(dat, pos, 7), pos += 3;
              else if (s == 18)
                n = 11 + bits(dat, pos, 127), pos += 7;
              while (n--)
                ldt[i++] = c;
            }
          }
          var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
          lbt = max(lt);
          dbt = max(dt);
          lm = hMap(lt, lbt, 1);
          dm = hMap(dt, dbt, 1);
        } else
          err(1);
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
      }
      if (resize)
        cbuf(bt + 131072);
      var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
      var lpos = pos;
      for (; ; lpos = pos) {
        var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
        pos += c & 15;
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (!c)
          err(2);
        if (sym < 256)
          buf[bt++] = sym;
        else if (sym == 256) {
          lpos = pos, lm = null;
          break;
        } else {
          var add = sym - 254;
          if (sym > 264) {
            var i = sym - 257, b = fleb[i];
            add = bits(dat, pos, (1 << b) - 1) + fl[i];
            pos += b;
          }
          var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
          if (!d)
            err(3);
          pos += d & 15;
          var dt = fd[dsym];
          if (dsym > 3) {
            var b = fdeb[dsym];
            dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
          }
          if (pos > tbts) {
            if (noSt)
              err(0);
            break;
          }
          if (resize)
            cbuf(bt + 131072);
          var end = bt + add;
          if (bt < dt) {
            var shift = dl - dt, dend = Math.min(dt, end);
            if (shift + bt < 0)
              err(3);
            for (; bt < dend; ++bt)
              buf[bt] = dict[shift + bt];
          }
          for (; bt < end; ++bt)
            buf[bt] = buf[bt - dt];
        }
      }
      st.l = lm, st.p = lpos, st.b = bt, st.f = final;
      if (lm)
        final = 1, st.m = lbt, st.d = dm, st.n = dbt;
    } while (!final);
    return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
  };
  var et = /* @__PURE__ */ new u8(0);
  var b2 = function(d, b) {
    return d[b] | d[b + 1] << 8;
  };
  var b4 = function(d, b) {
    return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
  };
  var b8 = function(d, b) {
    return b4(d, b) + b4(d, b + 4) * 4294967296;
  };
  function inflateSync(data, opts) {
    return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
  }
  var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
  var tds = 0;
  try {
    td.decode(et, { stream: true });
    tds = 1;
  } catch (e) {
  }
  var dutf8 = function(d) {
    for (var r = "", i = 0; ; ) {
      var c = d[i++];
      var eb = (c > 127) + (c > 223) + (c > 239);
      if (i + eb > d.length)
        return { s: r, r: slc(d, i - 1) };
      if (!eb)
        r += String.fromCharCode(c);
      else if (eb == 3) {
        c = ((c & 15) << 18 | (d[i++] & 63) << 12 | (d[i++] & 63) << 6 | d[i++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
      } else if (eb & 1)
        r += String.fromCharCode((c & 31) << 6 | d[i++] & 63);
      else
        r += String.fromCharCode((c & 15) << 12 | (d[i++] & 63) << 6 | d[i++] & 63);
    }
  };
  function strFromU8(dat, latin1) {
    if (latin1) {
      var r = "";
      for (var i = 0; i < dat.length; i += 16384)
        r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384));
      return r;
    } else if (td) {
      return td.decode(dat);
    } else {
      var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
      if (r.length)
        err(8);
      return s;
    }
  }
  var slzh = function(d, b) {
    return b + 30 + b2(d, b + 26) + b2(d, b + 28);
  };
  var zh = function(d, b, z) {
    var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
    var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
    return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
  };
  var z64hs = function(d, b, l, z, sc, su, off) {
    var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
    var nf = nsc + nsu + noff;
    if (z && nf) {
      for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
        if (b2(d, b) == 1) {
          return [
            nsc ? b8(d, b + 4 + 8 * nsu) : sc,
            nsu ? b8(d, b + 4) : su,
            noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
            1
          ];
        }
      }
      if (z < 2)
        err(13);
    }
    return [sc, su, off, 0];
  };
  function unzipSync(data, opts) {
    var files = {};
    var e = data.length - 22;
    for (; b4(data, e) != 101010256; --e) {
      if (!e || data.length - e > 65558)
        err(13);
    }
    ;
    var c = b2(data, e + 8);
    if (!c)
      return {};
    var o = b4(data, e + 16);
    var z = b4(data, e - 20) == 117853008;
    if (z) {
      var ze = b4(data, e - 12);
      z = b4(data, ze) == 101075792;
      if (z) {
        c = b4(data, ze + 32);
        o = b4(data, ze + 48);
      }
    }
    var fltr = opts && opts.filter;
    for (var i = 0; i < c; ++i) {
      var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
      o = no;
      if (!fltr || fltr({
        name: fn,
        size: sc,
        originalSize: su,
        compression: c_2
      })) {
        if (!c_2)
          files[fn] = slc(data, b, b + sc);
        else if (c_2 == 8)
          files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
        else
          err(14, "unknown compression type " + c_2);
      }
    }
    return files;
  }

  // packages/core/src/dspack.js
  var DSPK_MAGIC = "DSPK";
  var DSPK_HEADER_SIZE = 8;
  var DSPK_CONTAINER_VERSION = 2;
  var encoder = new TextEncoder();
  var decoder = new TextDecoder();
  function decodeHeader(header) {
    if (!header || header.length < DSPK_HEADER_SIZE) return null;
    const b = header.subarray(0, DSPK_HEADER_SIZE);
    const magic = decoder.decode(b.subarray(0, 4));
    const version = new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(4, true);
    return { magic, version };
  }
  function parseDspack(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < DSPK_HEADER_SIZE) {
      throw new Error("\u4E0D\u662F\u6709\u6548\u7684 .dspack \u6587\u4EF6\uFF08\u957F\u5EA6\u4E0D\u8DB3\uFF09");
    }
    const info = decodeHeader(bytes);
    if (!info || info.magic !== DSPK_MAGIC) {
      throw new Error("\u4E0D\u662F .dspack \u6587\u4EF6\uFF08\u7F3A\u5C11 DSPK \u5934\uFF0C\u53EF\u80FD\u88AB\u6539\u540E\u7F00\u6216\u5DF2\u635F\u574F\uFF09");
    }
    if (info.version !== DSPK_CONTAINER_VERSION) {
      throw new Error(`\u4E0D\u652F\u6301\u8BE5 .dspack \u5BB9\u5668\u7248\u672C\uFF1A${info.version}\uFF08\u672C\u5DE5\u5177\u652F\u6301 ${DSPK_CONTAINER_VERSION}\uFF09`);
    }
    const entries = unzipSync(bytes.subarray(DSPK_HEADER_SIZE));
    return { entries, version: info.version };
  }
  function decodeText(u82) {
    return decoder.decode(u82);
  }

  // packages/core/src/inspect.js
  async function inspectPack(host, source) {
    const bytes = source instanceof Uint8Array ? source : await host.readFile(host.resolvePath(source));
    if (!bytes) throw new Error("\u65E0\u6CD5\u8BFB\u53D6\u6574\u5408\u5305\u6587\u4EF6");
    const { entries, version } = parseDspack(bytes);
    let manifest = null;
    let validation;
    if (entries["manifest.json"]) {
      manifest = parseJson(decodeText(entries["manifest.json"]));
      validation = manifest ? validateManifest(manifest) : ["manifest.json \u65E0\u6CD5\u89E3\u6790"];
    } else {
      validation = ["\u7F3A\u5C11 manifest.json"];
    }
    const machine = [];
    const overrides = [];
    const other = [];
    for (const [p, data] of Object.entries(entries)) {
      if (p === "manifest.json") continue;
      const size = data?.byteLength ?? data?.length ?? 0;
      const rec = { path: p, size };
      if (p === "package.json" || p === "pnpm-workspace.yaml" || p === "pnpm-lock.yaml") machine.push(rec);
      else if (p.startsWith("overrides/")) overrides.push(rec);
      else other.push(rec);
    }
    const byPath = (a, b) => a.path.localeCompare(b.path);
    machine.sort(byPath);
    overrides.sort(byPath);
    other.sort(byPath);
    return {
      sha256: await host.sha256(bytes),
      size: bytes.byteLength,
      containerVersion: version,
      valid: validation.length === 0,
      validation,
      manifest,
      machine,
      overrides,
      other,
      totalEntries: Object.keys(entries).length
    };
  }
  function parseJson(raw) {
    if (raw == null || raw === "") return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // packages/host-dsh-plugin/src/index.js
  function isDshBridgeSupported(bridge) {
    return !!(bridge && typeof bridge.join === "function" && typeof bridge.readFile === "function" && typeof bridge.writeFile === "function");
  }
  function createDshPluginHost(bridge) {
    return new DshPluginHost(bridge);
  }
  var DshPluginHost = class extends Host {
    constructor(bridge) {
      super();
      this.bridge = bridge ?? null;
    }
    get supported() {
      return isDshBridgeSupported(this.bridge);
    }
    requireBridge() {
      if (!this.supported) {
        throw new Error("DshPluginHost\uFF1A\u672A\u6CE8\u5165 DSH bridge\uFF08\u9700\u63D0\u4F9B join/readFile/writeFile/sha256 \u7B49\u80FD\u529B\uFF09");
      }
      return this.bridge;
    }
    joinPath(...parts) {
      return this.requireBridge().join(...parts);
    }
    resolvePath(...parts) {
      return this.requireBridge().resolve(...parts);
    }
    cwd() {
      const b = this.bridge;
      return b && typeof b.cwd === "function" && b.cwd() || b && typeof b.homedir === "function" && b.homedir() || "/";
    }
    homedir() {
      return this.requireBridge().homedir();
    }
    env(name2) {
      const b = this.bridge;
      return b && typeof b.env === "function" && b.env(name2) || null;
    }
    basename(abs) {
      return this.requireBridge().basename(abs);
    }
    async readTextFile(abs) {
      return this.requireBridge().readTextFile(abs);
    }
    async writeTextFile(abs, text) {
      await this.requireBridge().writeTextFile(abs, text);
    }
    async readFile(abs) {
      return this.requireBridge().readFile(abs);
    }
    async writeFile(abs, data) {
      await this.requireBridge().writeFile(abs, data);
    }
    async stat(abs) {
      return this.requireBridge().stat(abs);
    }
    async readdir(abs) {
      return this.requireBridge().readdir(abs);
    }
    async mkdir(abs) {
      await this.requireBridge().mkdir(abs);
    }
    async rm(abs, opts) {
      await this.requireBridge().rm(abs, opts);
    }
    async mkdtemp(prefix) {
      return this.requireBridge().mkdtemp(prefix);
    }
    async sha256(data) {
      const b = this.bridge;
      if (b && typeof b.sha256 === "function") return b.sha256(data);
      if (typeof globalThis.crypto?.subtle?.digest === "function") {
        const buf = await globalThis.crypto.subtle.digest("SHA-256", data);
        return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
      }
      throw new Error("DshPluginHost.sha256\uFF1Abridge \u4E0E WebCrypto \u5747\u4E0D\u53EF\u7528");
    }
    async sha256File(abs) {
      const b = this.bridge;
      if (b && typeof b.sha256File === "function") return b.sha256File(abs);
      const data = await this.readFile(abs);
      if (!data) return null;
      return this.sha256(data);
    }
    async exec(cmd, args, opts) {
      const b = this.bridge;
      if (!b || typeof b.exec !== "function") {
        return { status: null, error: "DSH \u73AF\u5883\u4E0D\u652F\u6301\u5916\u90E8\u547D\u4EE4\uFF08\u65E0 exec bridge\uFF09" };
      }
      return b.exec(cmd, args, opts);
    }
    async download(url, destAbs) {
      await this.requireBridge().download(url, destAbs);
    }
    async move(from, to) {
      await this.requireBridge().move(from, to);
    }
  };

  // packages/plugin/src/index.js
  var name = "dsh-packforge";
  var viewPackBytes = (bytes) => inspectPack({ readFile: async () => bytes, sha256: sha256Bytes }, bytes);
  var DSPACK_READ_CAP = 512 * 1024 * 1024;
  function dshBridgeFromContext(ctx) {
    const fs = firstDefined(ctx?.fs, ctx?.dsh?.fs);
    const shell = firstDefined(ctx?.shell, ctx?.dsh?.shell);
    if (!fs) return null;
    const bridge = {
      // —— 路径工具：FileSystem 是 target 型，不提供字符串 join/resolve，用 POSIX 纯字符串兜底 ——
      join: (...parts) => parts.filter(Boolean).map((x) => String(x).replace(/\\/g, "/")).join("/").replace(/\/+/g, "/"),
      resolve: (...parts) => "/" + parts.filter(Boolean).map((x) => String(x).replace(/\\/g, "/")).join("/").replace(/\/+/g, "/"),
      basename: (p) => String(p).replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? "",
      homedir: () => "~",
      env: () => null,
      // —— ctx.fs 能承载的能力 ——
      readTextFile: (p) => fs.resolve(p).then((t) => fs.readText(t)),
      readFile: (p) => fs.resolve(p).then((t) => fs.readBytes(t, void 0, DSPACK_READ_CAP)),
      readdir: async (p) => {
        const t = await fs.resolve(p);
        const entries = await fs.listDir(t);
        return entries.map((e) => ({
          name: e.name,
          abs: typeof fs.processPath === "function" ? fs.processPath(e.target) : e.target?.displayPath ?? e.name,
          type: e.type === "directory" ? "dir" : "file"
        }));
      },
      stat: async (p) => {
        let info = null;
        if (typeof fs.lstat === "function") info = await fs.lstat(p).catch(() => void 0);
        if (!info) {
          const t = await fs.resolve(p);
          info = await fs.stat(t).catch(() => void 0) ?? null;
        }
        if (!info) return null;
        return {
          size: info.size ?? 0,
          isFile: info.type === "file",
          isDirectory: info.type === "directory",
          isSymbolicLink: info.type === "symlink"
        };
      },
      writeTextFile: async (p, txt) => {
        await fs.writeText(await fs.resolve(p), txt);
      },
      // —— ctx.fs 明确不提供的能力：显式抛错，提示改走 ctx.shell ——
      writeFile: () => Promise.reject(new Error("ctx.fs \u65E0\u4E8C\u8FDB\u5236\u5199\uFF08byte/zip \u65E0\u6CD5\u843D\u76D8\uFF09\uFF1B\u5B8C\u6574\u5BFC\u51FA/\u5BFC\u5165\u8BF7\u7ECF ctx.shell \u8FD0\u884C dspack CLI")),
      mkdir: () => Promise.reject(new Error("ctx.fs \u65E0 mkdir\uFF1B\u8BF7\u7ECF ctx.shell \u8FD0\u884C dspack CLI")),
      rm: () => Promise.reject(new Error("ctx.fs \u65E0 rm\uFF1B\u8BF7\u7ECF ctx.shell \u8FD0\u884C dspack CLI")),
      move: () => Promise.reject(new Error("ctx.fs \u65E0 move\uFF1B\u8BF7\u7ECF ctx.shell \u8FD0\u884C dspack CLI")),
      mkdtemp: () => Promise.reject(new Error("ctx.fs \u65E0 mkdtemp\uFF1B\u8BF7\u7ECF ctx.shell \u8FD0\u884C dspack CLI")),
      download: () => Promise.reject(new Error("DSH \u5BA2\u6237\u7AEF\u65E0 download \u670D\u52A1\uFF1B\u8BF7\u7ECF ctx.shell \u8FD0\u884C dspack CLI")),
      // —— 摘要 / 执行 ——
      sha256: sha256Bytes,
      sha256File: async (p) => {
        const d = await bridge.readFile(p);
        return d ? bridge.sha256(d) : null;
      },
      exec: (cmd, args, opts) => execViaShell(shell, cmd, args, opts)
    };
    return bridge;
  }
  async function apply(ctx) {
    const bridge = dshBridgeFromContext(ctx);
    const shell = firstDefined(ctx?.shell, ctx?.dsh?.shell);
    if (!bridge) return;
    const host = isDshBridgeSupported(bridge) ? createDshPluginHost(bridge) : null;
    const capabilities = {
      readText: true,
      readBinary: true,
      writeText: true,
      stats: true,
      listDir: true,
      binaryWrite: false,
      // ctx.fs 无 writeBytes
      mkdir: false,
      rm: false,
      move: false,
      download: false,
      exec: !!shell
    };
    const api = {
      // 就地查看（浏览器内）：UI 拿到 .dspack 字节流后直接解析，无需落盘。
      viewBytes: viewPackBytes,
      // 完整导出/导入/市场/查看整合包：走 ctx.shell 委派 dspack CLI（真实文件系统 + pnpm + 下载全在 host 侧完成）。
      shell: (argv) => execViaShell(shell, "dspack", argv)
    };
    if (ctx && typeof ctx.provide === "function") {
      try {
        ctx.provide("dsh-packforge", { host, api, capabilities });
      } catch {
      }
    }
    return { host, api, capabilities };
  }
  function firstDefined(...vals) {
    return vals.find((v) => v !== void 0 && v !== null);
  }
  async function sha256Bytes(bytes) {
    const c = globalThis.crypto;
    if (c?.subtle?.digest) {
      const buf = await c.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
    }
    throw new Error("\u65E0 WebCrypto\uFF0C\u65E0\u6CD5\u8BA1\u7B97 sha256");
  }
  async function execViaShell(shell, cmd, args, opts = {}) {
    if (!shell) return { status: null, stdout: "", stderr: "\u65E0 ctx.shell \u670D\u52A1" };
    try {
      const command = [cmd, ...args ?? []].map(shellQuote).join(" ");
      const spec = await shell.resolve({ command, workdir: opts.cwd, env: opts.env, timeoutMs: opts.timeoutMs });
      const r = await shell.run(spec);
      return {
        status: r?.exitCode ?? r?.code ?? null,
        stdout: r?.stdout ?? r?.output ?? "",
        stderr: r?.stderr ?? r?.error ?? ""
      };
    } catch (e) {
      return { status: 1, stdout: "", stderr: String(e?.message ?? e) };
    }
  }
  function shellQuote(arg) {
    const s = String(arg);
    if (/^[A-Za-z0-9_./:=+@,\\-]+$/.test(s)) return s;
    return `'${s.replace(/'/g, `'\\''`)}'`;
  }

  // packages/plugin/src/client.js
  var PACKAGE_ID = "@dsh-packforge/plugin";
  var loader = globalThis.__ModuleLoader__;
  if (typeof loader?.load === "function") {
    loader.load({
      id: PACKAGE_ID,
      factory: () => ({ name, apply })
    });
  }
})();
