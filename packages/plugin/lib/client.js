window.__ModuleLoader__.load({
  id: "@dsh-packforge/plugin",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.js
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(client_exports);

// ../core/src/manifest.js
function validateManifest(m) {
  const errors = [];
  if (!m || typeof m !== "object" || Array.isArray(m)) return ["manifest.json \u7F3A\u5931\u6216\u4E0D\u662F\u5BF9\u8C61"];
  if (m.manifestVersion !== 4 && m.manifestVersion !== 5) {
    if (m.manifestVersion === 3 || m.manifestVersion === 2) {
      errors.push(`manifestVersion \u4E3A ${m.manifestVersion}\uFF08\u65E7\u7248 .tgz \u683C\u5F0F\uFF09\uFF0C\u672C\u5DE5\u5177\u4EC5\u5B89\u88C5 v4/v5(.dspack) \u6574\u5408\u5305`);
    } else {
      errors.push("manifestVersion \u5FC5\u987B\u4E3A 4 \u6216 5");
    }
  }
  if (typeof m.name !== "string" || !m.name.trim()) errors.push("manifest.name \u7F3A\u5931\u6216\u4E3A\u7A7A");
  if (typeof m.version !== "string" || !m.version.trim()) errors.push("manifest.version \u7F3A\u5931\u6216\u4E3A\u7A7A");
  if (m.patch !== void 0 && typeof m.patch !== "string") errors.push("manifest.patch \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
  if (m.dshVersion !== void 0 && typeof m.dshVersion !== "string") errors.push("manifest.dshVersion \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
  for (const f of ["displayName", "description"]) {
    if (m[f] !== void 0 && !isLocaleString(m[f])) errors.push(`manifest.${f} \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6216\u591A\u8BED\u8A00\u5BF9\u8C61`);
  }
  if (m.manifestVersion === 5) {
    if (m.type === "dshhome") errors.push(...validateDshHome(m));
    else if (m.type === void 0 || m.type === "profile") errors.push(...validateProfile(m));
    else errors.push('type \u4EC5\u652F\u6301 "profile" \u6216 "dshhome"');
  } else {
    errors.push(...validateProfile(m));
  }
  return errors;
}
function validateProfile(m) {
  const errors = [];
  if (m.type !== void 0 && m.type !== "profile") {
    errors.push('type \u4EC5\u652F\u6301 "profile"\uFF08collection \u4E3A\u9884\u7559\u503C\uFF0C\u6682\u672A\u652F\u6301\uFF09');
  }
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
  if (m.files !== void 0) errors.push(...validateFiles(m.files));
  return errors;
}
function validateDshHome(m) {
  const errors = [];
  if (m.type !== void 0 && m.type !== "dshhome") {
    errors.push('type \u4EC5\u652F\u6301 "dshhome"\uFF08\u5355 profile \u8BF7\u7528 type:"profile"\uFF09');
  }
  if (typeof m.profiles !== "object" || m.profiles === null || Array.isArray(m.profiles)) {
    errors.push("manifest.profiles \u5FC5\u987B\u662F\u5BF9\u8C61\uFF08name \u2192 ProfileUnit\uFF09");
  } else {
    const names = Object.keys(m.profiles);
    if (names.length === 0) errors.push("manifest.profiles \u81F3\u5C11\u542B 1 \u4E2A profile");
    for (const reserved of ["web", "headless"]) {
      if (names.includes(reserved)) errors.push(`profiles \u4E0D\u5F97\u542B\u5B89\u88C5\u57FA\u7EBF\u6A21\u677F\u300C${reserved}\u300D`);
    }
    for (const [name2, u] of Object.entries(m.profiles)) {
      if (!u || typeof u !== "object" || Array.isArray(u)) {
        errors.push(`profiles[${name2}] \u5FC5\u987B\u662F\u5BF9\u8C61`);
        continue;
      }
      if (!Array.isArray(u.bundles) || u.bundles.some((b) => typeof b !== "string")) {
        errors.push(`profiles[${name2}].bundles \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4`);
      }
      if (typeof u.dependencies !== "object" || u.dependencies === null || Array.isArray(u.dependencies)) {
        errors.push(`profiles[${name2}].dependencies \u5FC5\u987B\u662F\u5BF9\u8C61`);
      } else {
        for (const [k, v] of Object.entries(u.dependencies)) {
          if (typeof v !== "string" || !v) errors.push(`profiles[${name2}].dependencies[${k}] \u5FC5\u987B\u662F\u300C\u5750\u6807 \u2192 \u56FA\u5B9A\u7248\u672C\u300D\u5B57\u7B26\u4E32`);
        }
      }
      if (u.patch !== void 0 && typeof u.patch !== "string") errors.push(`profiles[${name2}].patch \u5FC5\u987B\u662F\u5B57\u7B26\u4E32`);
    }
    if (typeof m.defaultProfile !== "string" || !m.defaultProfile) {
      errors.push("manifest.defaultProfile \u7F3A\u5931\u6216\u4E3A\u7A7A");
    } else if (!names.includes(m.defaultProfile)) {
      errors.push(`defaultProfile\u300C${m.defaultProfile}\u300D\u4E0D\u5728 profiles \u4E2D`);
    }
  }
  if (m.presets !== void 0) {
    if (typeof m.presets !== "object" || m.presets === null || Array.isArray(m.presets)) {
      errors.push("manifest.presets \u5FC5\u987B\u662F\u5BF9\u8C61\uFF08name \u2192 PresetUnit\uFF09");
    } else {
      for (const [name2, u] of Object.entries(m.presets)) {
        if (!u || typeof u !== "object" || Array.isArray(u) || typeof u.path !== "string" || !u.path) {
          errors.push(`presets[${name2}] \u5FC5\u987B\u662F\u542B path \u7684\u5BF9\u8C61`);
        }
      }
    }
  }
  if (m.skills !== void 0) {
    if (!Array.isArray(m.skills)) {
      errors.push("manifest.skills \u5FC5\u987B\u662F\u6570\u7EC4");
    } else {
      m.skills.forEach((s, i) => {
        if (!s || typeof s !== "object" || Array.isArray(s) || typeof s.path !== "string" || !s.path) {
          errors.push(`skills[${i}] \u5FC5\u987B\u662F\u542B path \u7684\u5BF9\u8C61`);
        }
      });
    }
  }
  if (m.instructions !== void 0 && (typeof m.instructions !== "string" || !m.instructions)) {
    errors.push("manifest.instructions \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32");
  }
  if (m.files !== void 0) errors.push(...validateFiles(m.files));
  return errors;
}
function validateFiles(files) {
  const errors = [];
  if (!Array.isArray(files)) {
    errors.push("manifest.files \u5FC5\u987B\u662F\u6570\u7EC4");
  } else {
    files.forEach((f, i) => {
      for (const e of validateFileEntry(f)) errors.push(`files[${i}] ${e}`);
    });
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

// ../../node_modules/.pnpm/fflate@0.8.3/node_modules/fflate/esm/browser.js
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
var inflt = function(dat, st, buf, dict2) {
  var sl = dat.length, dl = dict2 ? dict2.length : 0;
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
            buf[bt] = dict2[shift + bt];
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

// ../core/src/dspack.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var DSPACK_FORMAT = "dspack";
function parseDspack(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
    throw new Error("\u4E0D\u662F\u6709\u6548\u7684 .dspack \u6587\u4EF6\uFF08\u7A7A\u5185\u5BB9\uFF09");
  }
  let entries;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new Error("\u4E0D\u662F\u6709\u6548\u7684 .dspack \u6587\u4EF6\uFF08\u65E0\u6CD5\u6309 ZIP \u89E3\u538B\uFF09");
  }
  return { entries, marker: parseMarker(entries) };
}
function parseMarker(entries) {
  const raw = entries["dspack.json"];
  if (!raw) return null;
  let m;
  try {
    m = JSON.parse(decodeText(raw));
  } catch {
    throw new Error("dspack.json \u4E0D\u662F\u6709\u6548 JSON");
  }
  if (!m || typeof m !== "object" || Array.isArray(m) || m.format !== DSPACK_FORMAT) {
    throw new Error('dspack.json \u4E0D\u662F\u6709\u6548\u7684\u5BB9\u5668\u6807\u8BB0\uFF08format \u5FC5\u987B\u4E3A "dspack"\uFF09');
  }
  return m;
}
function decodeText(u82) {
  return decoder.decode(u82);
}

// ../core/src/inspect.js
async function inspectPack(host, source) {
  const bytes = source instanceof Uint8Array ? source : await host.readFile(host.resolvePath(source));
  if (!bytes) throw new Error("\u65E0\u6CD5\u8BFB\u53D6\u6574\u5408\u5305\u6587\u4EF6");
  const { entries, marker } = parseDspack(bytes);
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
  const home = [];
  const other = [];
  for (const [p, data] of Object.entries(entries)) {
    if (p === "manifest.json") continue;
    const size = data?.byteLength ?? data?.length ?? 0;
    const rec = { path: p, size };
    if (p === "dspack.json" || p === "package.json" || p === "pnpm-workspace.yaml" || p === "pnpm-lock.yaml") machine.push(rec);
    else if (p.startsWith("overrides/")) overrides.push(rec);
    else if (p.startsWith("home/")) home.push(rec);
    else other.push(rec);
  }
  const byPath = (a, b) => a.path.localeCompare(b.path);
  machine.sort(byPath);
  overrides.sort(byPath);
  home.sort(byPath);
  other.sort(byPath);
  return {
    sha256: await host.sha256(bytes),
    size: bytes.byteLength,
    containerVersion: marker?.version ?? null,
    valid: validation.length === 0,
    validation,
    manifest,
    machine,
    overrides,
    home,
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

// src/settings.js
var import_react = require("react");
var NS = "dspack";
var dict = {
  zh: {
    nav: "\u6574\u5408\u5305",
    title: "\u6574\u5408\u5305",
    intro: "\u628A\u5F53\u524D\u5B9E\u4F8B\u91CC\u6B63\u5728\u8FD0\u884C\u7684 profile \u5BFC\u51FA\u4E3A .dspack \u6574\u5408\u5305\uFF08skill/\u9884\u8BBE/\u6307\u4EE4/\u6570\u636E\u53EF\u4E00\u5E76\u5E26\u4E0A\uFF09\u3002",
    "action.read": "\u8BFB\u53D6\u914D\u7F6E",
    "action.save": "\u4FDD\u5B58\u914D\u7F6E",
    "action.export": "\u5BFC\u51FA",
    "action.market": "\u6D4F\u89C8\u5E02\u573A",
    "action.browse": "\u6D4F\u89C8\u2026",
    "action.detect": "\u81EA\u52A8\u8BC6\u522B",
    "group.meta": "\u57FA\u672C\u4FE1\u606F",
    "group.output": "\u8F93\u51FA",
    "group.content": "\u5BFC\u51FA\u5185\u5BB9",
    "field.name": "\u6574\u5408\u5305\u540D\uFF08\u7559\u7A7A\u7528 profile \u540D\uFF09",
    "field.version": "\u7248\u672C\uFF08\u7559\u7A7A\u7528\u9ED8\u8BA4\uFF09",
    "field.displayName": "\u5C55\u793A\u540D\uFF08\u7559\u7A7A\u7528 profile \u540D\uFF09",
    "field.description": "\u63CF\u8FF0",
    "field.author": "\u4F5C\u8005",
    "field.icon": "\u56FE\u6807 URL",
    "field.dshVersion": "DSH \u7248\u672C\uFF08\u7559\u7A7A\u53D6\u6700\u65B0\u5DF2\u88C5\uFF09",
    "field.out": "\u8F93\u51FA\u76EE\u5F55\uFF08\u7559\u7A7A\u7528\u5F53\u524D\u76EE\u5F55\uFF09",
    "export.skill": "skills/ \u6280\u80FD",
    "export.preset": ".agent-presets/ \u9884\u8BBE",
    "export.instruction": "AGENTS.md \u5168\u5C40\u6307\u4EE4",
    "export.data": "data/ \u6570\u636E",
    "result.pending": "\u5904\u7406\u4E2D\u2026",
    "result.readOk": "\u5DF2\u8BFB\u53D6\u914D\u7F6E",
    "result.readFail": "\u8BFB\u53D6\u914D\u7F6E\u5931\u8D25\uFF08\u65E0 .dshpkcfg \u6216\u547D\u4EE4\u4E0D\u53EF\u7528\uFF09",
    note: "\u5B8C\u6574\u5BFC\u51FA/\u5BFC\u5165\u4E5F\u53EF\u76F4\u63A5\u5BF9 AI \u8BF4\uFF08\u7531 dspack_export / dspack_install \u5DE5\u5177\u63A5\u7BA1\uFF09\u3002"
  },
  en: {
    nav: "Modpacks",
    title: "Modpacks",
    intro: "Export the running profile of this instance as a .dspack pack (skills / presets / instructions / data can ride along).",
    "action.read": "Read config",
    "action.save": "Save config",
    "action.export": "Export",
    "action.market": "Browse market",
    "action.browse": "Browse\u2026",
    "action.detect": "Auto detect",
    "group.meta": "Metadata",
    "group.output": "Output",
    "group.content": "Export content",
    "field.name": "Pack name (blank = profile name)",
    "field.version": "Version (blank = default)",
    "field.displayName": "Display name (blank = profile name)",
    "field.description": "Description",
    "field.author": "Author",
    "field.icon": "Icon URL",
    "field.dshVersion": "DSH version (blank = latest)",
    "field.out": "Output dir (blank = current)",
    "export.skill": "skills/ skills",
    "export.preset": ".agent-presets/ presets",
    "export.instruction": "AGENTS.md instruction",
    "export.data": "data/ data",
    "result.pending": "Working\u2026",
    "result.readOk": "Config loaded",
    "result.readFail": "Failed to read config (no .dshpkcfg or command unavailable)",
    note: "You can also ask the AI directly to export or install a pack."
  }
};
function registerSettingsSection(ctx, packforge = {}) {
  const slots = ctx?.slots;
  const locale = ctx?.locale;
  if (!slots || typeof slots.inject !== "function") return false;
  if (!locale || typeof locale.register !== "function" || typeof locale.bind !== "function") return false;
  const registerLocale = () => {
    locale.register(NS, dict);
  };
  if (typeof ctx.effect === "function") ctx.effect(registerLocale, "dspack: settings dict");
  else registerLocale();
  const t = locale.bind(NS);
  slots.inject(
    "settings.section",
    () => slots.register(
      {
        name: "settings.section",
        id: "dspack",
        order: 20,
        // 通用=0 / 模型=10 / 插件=15 → 放最后
        label: () => t("nav"),
        locale: NS,
        inject: () => ({ t, packforge })
      },
      DspackSection
    )
  );
  return true;
}
var TEXT_FIELDS = ["name", "version", "displayName", "description", "author", "icon", "dshVersion", "out"];
var GROUPS = [
  { title: "group.meta", fields: ["name", "version", "displayName", "description", "author", "icon"] },
  { title: "group.output", fields: ["dshVersion", "out"] }
];
function DspackSection({ t, packforge }) {
  const runCommand2 = packforge?.api?.runCommand;
  const readConfig2 = packforge?.api?.readConfig;
  const pickDirectory2 = packforge?.api?.pickDirectory;
  const detectDshVersion2 = packforge?.api?.detectDshVersion;
  const fields = {};
  let resultEl = null;
  const ref = (key) => (el) => {
    fields[key] = el;
  };
  const fillForm = (cfg, refs = fields) => {
    for (const key of TEXT_FIELDS) if (refs[key]) refs[key].value = cfg[key] ?? "";
    const ec2 = cfg.exportContent ?? {};
    for (const key of ["skill", "preset", "instruction", "data"]) {
      if (refs[key]) refs[key].checked = ec2[key] !== false;
    }
  };
  const showResult = (r) => {
    if (!resultEl) return;
    if (r?.pending) {
      resultEl.textContent = t("result.pending");
      return;
    }
    resultEl.textContent = r?.ok ? `\u2713 ${r.text}` : `\u2717 ${r.error}`;
  };
  const doReadConfig = async () => {
    if (!readConfig2) return;
    showResult({ pending: true });
    const refs = { ...fields };
    const cfg = await readConfig2();
    if (cfg && typeof cfg === "object") {
      fillForm(cfg, refs);
      showResult({ ok: true, text: t("result.readOk") });
    } else showResult({ ok: false, error: t("result.readFail") });
  };
  const doBrowse = async () => {
    if (!pickDirectory2) return;
    const outEl = fields.out;
    const r = await pickDirectory2();
    if (r?.ok && r.path && outEl) outEl.value = r.path;
    else if (r && !r.ok) showResult({ ok: false, error: r.error });
  };
  const doDetectVersion = async () => {
    if (!detectDshVersion2) return;
    const el = fields.dshVersion;
    const ver = await detectDshVersion2();
    if (ver && el) el.value = ver;
  };
  const doSaveConfig = async () => {
    if (!runCommand2) return;
    const config = {};
    for (const key of TEXT_FIELDS) config[key] = fields[key]?.value?.trim() ?? "";
    config.exportContent = {
      skill: fields.skill?.checked ?? true,
      preset: fields.preset?.checked ?? true,
      instruction: fields.instruction?.checked ?? true,
      data: fields.data?.checked ?? true
    };
    showResult({ pending: true });
    showResult(await runCommand2("/dspack-save-config " + JSON.stringify(config)));
  };
  const doExport = async () => {
    if (!runCommand2) return;
    const overrides = {};
    for (const key of TEXT_FIELDS) {
      const v = fields[key]?.value?.trim();
      if (v) overrides[key] = v;
    }
    overrides.exportContent = {
      skill: fields.skill?.checked ?? true,
      preset: fields.preset?.checked ?? true,
      instruction: fields.instruction?.checked ?? true,
      data: fields.data?.checked ?? true
    };
    showResult({ pending: true });
    showResult(await runCommand2("/dspack-export " + JSON.stringify(overrides)));
  };
  const doMarket = async () => {
    if (!runCommand2) return;
    showResult({ pending: true });
    showResult(await runCommand2("/dspack-market"));
  };
  const style = {
    section: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 720, padding: "8px 0" },
    title: { margin: 0, fontSize: 16, fontWeight: 500, lineHeight: "24px" },
    intro: { margin: 0, fontSize: 14, lineHeight: "22px", color: "var(--dsw-alias-label-tertiary)" },
    group: { display: "flex", flexDirection: "column", gap: 6 },
    groupTitle: { margin: "8px 0 0", fontSize: 13, fontWeight: 600, lineHeight: "20px", color: "var(--dsw-alias-label-primary)" },
    field: { display: "flex", flexDirection: "column", gap: 4 },
    fieldLabel: { fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-secondary)" },
    input: {
      height: 32,
      padding: "4px 10px",
      borderRadius: 8,
      border: "1px solid var(--dsw-alias-border-l2)",
      fontSize: 13,
      lineHeight: "20px",
      background: "var(--dsw-alias-bg-layer-1)",
      color: "var(--dsw-alias-label-primary)",
      font: "inherit",
      outline: "none",
      boxSizing: "border-box"
    },
    outRow: { display: "flex", gap: 8 },
    browseBtn: {
      height: 32,
      padding: "0 12px",
      borderRadius: 8,
      border: "1px solid var(--dsw-alias-border-l2)",
      cursor: "pointer",
      fontSize: 13,
      lineHeight: "20px",
      background: "var(--dsw-alias-bg-layer-1)",
      color: "var(--dsw-alias-label-primary)",
      font: "inherit"
    },
    check: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
    checkInput: { margin: 0 },
    checkLabel: { fontSize: 13, lineHeight: "20px", color: "var(--dsw-alias-label-primary)" },
    actions: { display: "flex", gap: 8, margin: "4px 0 0", padding: 0, listStyle: "none" },
    btn: {
      height: 36,
      padding: "0 14px",
      borderRadius: 18,
      border: "none",
      cursor: "pointer",
      fontSize: 14,
      lineHeight: "22px",
      background: "var(--dsw-alias-button-primary-fill)",
      color: "var(--dsw-alias-label-primary-foreground)",
      font: "inherit"
    },
    note: { margin: 0, fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-tertiary)" },
    result: { margin: 0, fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-all" }
  };
  const field = (key) => {
    if (key === "out") {
      return (0, import_react.createElement)(
        "label",
        { style: style.field },
        (0, import_react.createElement)("span", { style: style.fieldLabel }, t("field.out")),
        (0, import_react.createElement)(
          "div",
          { style: style.outRow },
          (0, import_react.createElement)("input", { style: { ...style.input, flex: 1 }, ref: ref("out") }),
          (0, import_react.createElement)("button", { type: "button", style: style.browseBtn, disabled: !pickDirectory2, onClick: doBrowse }, t("action.browse"))
        )
      );
    }
    if (key === "dshVersion") {
      return (0, import_react.createElement)(
        "label",
        { style: style.field },
        (0, import_react.createElement)("span", { style: style.fieldLabel }, t("field.dshVersion")),
        (0, import_react.createElement)(
          "div",
          { style: style.outRow },
          (0, import_react.createElement)("input", { style: { ...style.input, flex: 1 }, ref: ref("dshVersion") }),
          (0, import_react.createElement)("button", { type: "button", style: style.browseBtn, disabled: !detectDshVersion2, onClick: doDetectVersion }, t("action.detect"))
        )
      );
    }
    return (0, import_react.createElement)(
      "label",
      { style: style.field },
      (0, import_react.createElement)("span", { style: style.fieldLabel }, t("field." + key)),
      (0, import_react.createElement)("input", { style: style.input, ref: ref(key) })
    );
  };
  const checkbox = (key) => (0, import_react.createElement)(
    "label",
    { style: style.check },
    (0, import_react.createElement)("input", { type: "checkbox", style: style.checkInput, defaultChecked: true, ref: ref(key) }),
    (0, import_react.createElement)("span", { style: style.checkLabel }, t("export." + key))
  );
  const group = (g) => (0, import_react.createElement)(
    "div",
    { style: style.group },
    (0, import_react.createElement)("div", { style: style.groupTitle }, t(g.title)),
    ...g.fields.map(field)
  );
  return (0, import_react.createElement)(
    "div",
    { style: style.section },
    (0, import_react.createElement)("h2", { style: style.title }, t("title")),
    (0, import_react.createElement)("p", { style: style.intro }, t("intro")),
    ...GROUPS.map(group),
    (0, import_react.createElement)(
      "div",
      { style: style.group },
      (0, import_react.createElement)("div", { style: style.groupTitle }, t("group.content")),
      checkbox("skill"),
      checkbox("preset"),
      checkbox("instruction"),
      checkbox("data")
    ),
    (0, import_react.createElement)(
      "ul",
      { style: style.actions },
      (0, import_react.createElement)(
        "li",
        { key: "read" },
        (0, import_react.createElement)("button", { type: "button", style: style.btn, disabled: !readConfig2, onClick: doReadConfig }, t("action.read"))
      ),
      (0, import_react.createElement)(
        "li",
        { key: "save" },
        (0, import_react.createElement)("button", { type: "button", style: style.btn, disabled: !runCommand2, onClick: doSaveConfig }, t("action.save"))
      ),
      (0, import_react.createElement)(
        "li",
        { key: "export" },
        (0, import_react.createElement)("button", { type: "button", style: style.btn, disabled: !runCommand2, onClick: doExport }, t("action.export"))
      ),
      (0, import_react.createElement)(
        "li",
        { key: "market" },
        (0, import_react.createElement)("button", { type: "button", style: style.btn, disabled: !runCommand2, onClick: doMarket }, t("action.market"))
      )
    ),
    (0, import_react.createElement)("p", { style: style.result, ref: (el) => {
      resultEl = el;
    } }),
    (0, import_react.createElement)("p", { style: style.note }, t("note"))
  );
}

// src/client-plugin.js
var name = "dsh-packforge";
var inject = ["slots", "locale"];
var viewPackBytes = (bytes) => inspectPack({ readFile: async () => bytes, sha256: sha256Bytes }, bytes);
var DSPACK_READ_CAP = 512 * 1024 * 1024;
function apply(ctx) {
  const packforge = {
    api: {
      viewBytes: viewPackBytes,
      runCommand: (line) => runCommand(ctx, line),
      readConfig: () => readConfig(ctx),
      pickDirectory: () => pickDirectory(ctx),
      detectDshVersion: () => detectDshVersion(ctx)
    },
    capabilities: {}
  };
  registerSettingsSection(ctx, packforge);
  if (ctx && typeof ctx.provide === "function") {
    try {
      ctx.provide("dsh-packforge", packforge);
    } catch {
    }
  }
}
async function runCommand(ctx, line) {
  const remoteCommands = ctx?.get?.("remote.commands");
  if (!remoteCommands || typeof remoteCommands.execute !== "function") {
    return { ok: false, error: "\u672C\u7248\u672C client \u65E0 remote.commands\uFF1B\u5BFC\u51FA/\u5E02\u573A\u8BF7\u76F4\u63A5\u5BF9 AI \u8BF4\uFF08dspack_export \u5DE5\u5177\uFF09" };
  }
  const sessionId = currentSessionId(ctx);
  if (!sessionId) return { ok: false, error: "\u65E0\u5F53\u524D\u4F1A\u8BDD\uFF0C\u8BF7\u5148\u5728\u5BF9\u8BDD\u91CC\u6253\u5F00\u4E00\u4E2A\u4F1A\u8BDD" };
  try {
    const result = await remoteCommands.execute(sessionId, line, []);
    if (!result?.ok) return { ok: false, error: result?.error?.message ?? "\u547D\u4EE4\u6267\u884C\u5931\u8D25" };
    const value = result.value;
    if (value == null) return { ok: false, error: `\u547D\u4EE4 ${line} \u672A\u6CE8\u518C` };
    if (value.result?.kind === "error") return { ok: false, error: value.result.text };
    return { ok: true, text: value.result?.text ?? "\u5B8C\u6210" };
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}
function currentSessionId(ctx) {
  try {
    const sessions = ctx?.get?.("sessions");
    const snap = sessions?.list?.getSnapshot?.();
    const cur = snap?.current;
    if (typeof cur === "string") return cur;
    if (cur && typeof cur === "object") return cur.id ?? cur.sessionId ?? cur.key;
    return void 0;
  } catch {
    return void 0;
  }
}
async function readConfig(ctx) {
  const r = await runCommand(ctx, "/dspack-config");
  if (!r?.ok) return null;
  try {
    const v = JSON.parse(r.text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}
async function pickDirectory(ctx) {
  const dirPicker = ctx?.get?.("remote.directoryPicker");
  if (!dirPicker || typeof dirPicker.pick !== "function") {
    return { ok: false, error: "\u65E0 remote.directoryPicker \u670D\u52A1" };
  }
  try {
    const result = await dirPicker.pick();
    if (!result?.ok) return { ok: false, error: result?.error?.message ?? "\u76EE\u5F55\u9009\u62E9\u5931\u8D25" };
    if (typeof result.value === "string") return { ok: true, path: result.value };
    return { ok: false, error: "\u672A\u9009\u62E9\u76EE\u5F55\uFF08\u5DF2\u53D6\u6D88\uFF09" };
  } catch (e) {
    return { ok: false, error: `\u76EE\u5F55\u9009\u62E9\u5931\u8D25\uFF1A${e?.message ?? e}` };
  }
}
async function detectDshVersion(ctx) {
  const r = await runCommand(ctx, "/dspack-dsh-version");
  if (!r?.ok) return null;
  return r.text || null;
}
async function sha256Bytes(bytes) {
  const c = globalThis.crypto;
  if (c?.subtle?.digest) {
    const buf = await c.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("\u65E0 WebCrypto\uFF0C\u65E0\u6CD5\u8BA1\u7B97 sha256");
}
    return module.exports;
  },
});
