window.__ModuleLoader__.load({
  id: "@dsh-packforge/plugin",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/lrucache.js"(exports, module2) {
    "use strict";
    var LRUCache = class {
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module2.exports = LRUCache;
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/parse-options.js"(exports, module2) {
    "use strict";
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    };
    module2.exports = parseOptions;
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/constants.js"(exports, module2) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module2.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/debug.js"(exports, module2) {
    "use strict";
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module2.exports = debug;
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/re.js
var require_re = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/re.js"(exports, module2) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug = require_debug();
    exports = module2.exports = {};
    var re = exports.re = [];
    var safeRe = exports.safeRe = [];
    var src = exports.src = [];
    var safeSrc = exports.safeSrc = [];
    var t = exports.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = (value) => {
      for (const [token2, max2] of safeRegexReplacements) {
        value = value.split(`${token2}*`).join(`${token2}{0,${max2}}`).split(`${token2}+`).join(`${token2}{1,${max2}}`);
      }
      return value;
    };
    var createToken = (name2, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name2, index, value);
      t[name2] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/internal/identifiers.js"(exports, module2) {
    "use strict";
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      if (typeof a === "number" && typeof b === "number") {
        return a === b ? 0 : a < b ? -1 : 1;
      }
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module2.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/classes/semver.js"(exports, module2) {
    "use strict";
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var isPrereleaseIdentifier = (prerelease, identifier) => {
      const identifiers = identifier.split(".");
      if (identifiers.length > prerelease.length) {
        return false;
      }
      for (let i = 0; i < identifiers.length; i++) {
        if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) {
          return false;
        }
      }
      return true;
    };
    var SemVer = class _SemVer {
      constructor(version2, options) {
        options = parseOptions(options);
        if (version2 instanceof _SemVer) {
          if (version2.loose === !!options.loose && version2.includePrerelease === !!options.includePrerelease) {
            return version2;
          } else {
            version2 = version2.version;
          }
        } else if (typeof version2 !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version2}".`);
        }
        if (version2.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version2, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version2.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version2}`);
        }
        this.raw = version2;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.major < other.major) {
          return -1;
        }
        if (this.major > other.major) {
          return 1;
        }
        if (this.minor < other.minor) {
          return -1;
        }
        if (this.minor > other.minor) {
          return 1;
        }
        if (this.patch < other.patch) {
          return -1;
        }
        if (this.patch > other.patch) {
          return 1;
        }
        return 0;
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (isPrereleaseIdentifier(this.prerelease, identifier)) {
                const prereleaseBase = this.prerelease[identifier.split(".").length];
                if (isNaN(prereleaseBase)) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module2.exports = SemVer;
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/compare.js"(exports, module2) {
    "use strict";
    var SemVer = require_semver();
    var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module2.exports = compare;
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/eq.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var eq = (a, b, loose) => compare(a, b, loose) === 0;
    module2.exports = eq;
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/neq.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var neq = (a, b, loose) => compare(a, b, loose) !== 0;
    module2.exports = neq;
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/gt.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var gt = (a, b, loose) => compare(a, b, loose) > 0;
    module2.exports = gt;
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/gte.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var gte = (a, b, loose) => compare(a, b, loose) >= 0;
    module2.exports = gte;
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/lt.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var lt = (a, b, loose) => compare(a, b, loose) < 0;
    module2.exports = lt;
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/lte.js"(exports, module2) {
    "use strict";
    var compare = require_compare();
    var lte = (a, b, loose) => compare(a, b, loose) <= 0;
    module2.exports = lte;
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/cmp.js"(exports, module2) {
    "use strict";
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = (a, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a === b;
        case "!==":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module2.exports = cmp;
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/classes/comparator.js"(exports, module2) {
    "use strict";
    var ANY = Symbol("SemVer ANY");
    var Comparator = class _Comparator {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof _Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version2) {
        debug("Comparator.test", version2, this.options.loose);
        if (this.semver === ANY || version2 === ANY) {
          return true;
        }
        if (typeof version2 === "string") {
          try {
            version2 = new SemVer(version2, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version2, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof _Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module2.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/classes/range.js
var require_range = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/classes/range.js"(exports, module2) {
    "use strict";
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class _Range {
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof _Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new _Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
        this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i = 0; i < this.set.length; i++) {
            if (i > 0) {
              this.formatted += "||";
            }
            const comps = this.set[i];
            for (let k = 0; k < comps.length; k++) {
              if (k > 0) {
                this.formatted += " ";
              }
              this.formatted += comps[k].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        range = range.replace(BUILDSTRIPRE, "");
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug("hyphen replace", range);
        range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
        debug("comparator trim", range);
        range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
        debug("tilde trim", range);
        range = range.replace(re[t.CARETTRIM], caretTrimReplace);
        debug("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug("loose invalid filter", comp, this.options);
            return !!comp.match(re[t.COMPARATORLOOSE]);
          });
        }
        debug("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof _Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version2) {
        if (!version2) {
          return false;
        }
        if (typeof version2 === "string") {
          try {
            version2 = new SemVer(version2, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version2, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module2.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re,
      src,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
    var isNullSet = (c) => c.value === "<0.0.0-0";
    var isAny = (c) => c.value === "";
    var isSatisfiable = (comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    };
    var parseComparator = (comp, options) => {
      comp = comp.replace(re[t.BUILD], "");
      debug("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug("caret", comp);
      comp = replaceTildes(comp, options);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug("xrange", comp);
      comp = replaceStars(comp, options);
      debug("stars", comp);
      return comp;
    };
    var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
    var invalidXRangeOrder = (M, m, p) => isX(M) && !isX(m) || isX(m) && p && !isX(p);
    var replaceTildes = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
    };
    var replaceTilde = (comp, options) => {
      const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug("tilde return", ret);
        return ret;
      });
    };
    var replaceCarets = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
    };
    var replaceCaret = (comp, options) => {
      debug("caret", comp, options);
      const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === "0") {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug("caret return", ret);
        return ret;
      });
    };
    var replaceXRanges = (comp, options) => {
      debug("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
    };
    var replaceXRange = (comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        if (invalidXRangeOrder(M, m, p)) {
          return comp;
        }
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug("xRange return", ret);
        return ret;
      });
    };
    var replaceStars = (comp, options) => {
      debug("replaceStars", comp, options);
      return comp.trim().replace(re[t.STAR], "");
    };
    var replaceGTE0 = (comp, options) => {
      debug("replaceGTE0", comp, options);
      return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    };
    var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    };
    var testSet = (set2, version2, options) => {
      for (let i = 0; i < set2.length; i++) {
        if (!set2[i].test(version2)) {
          return false;
        }
      }
      if (version2.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set2.length; i++) {
          debug(set2[i].semver);
          if (set2[i].semver === Comparator.ANY) {
            continue;
          }
          if (set2[i].semver.prerelease.length > 0) {
            const allowed = set2[i].semver;
            if (allowed.major === version2.major && allowed.minor === version2.minor && allowed.patch === version2.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    };
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/valid.js
var require_valid = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/ranges/valid.js"(exports, module2) {
    "use strict";
    var Range = require_range();
    var validRange2 = (range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    };
    module2.exports = validRange2;
  }
});

// ../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "../../node_modules/.pnpm/semver@7.8.5/node_modules/semver/functions/satisfies.js"(exports, module2) {
    "use strict";
    var Range = require_range();
    var satisfies2 = (version2, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version2);
    };
    module2.exports = satisfies2;
  }
});

// src/client.js
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(client_exports);

// ../core/src/security.js
var DENY_EXACT = /* @__PURE__ */ new Set([
  // 依赖与构建产物
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".cache",
  ".turbo",
  ".pnpm-store",
  // 自动生成的 DSH 配置文件（安装时由 bundles + patch 重新合成）
  "cordis.yml",
  // 打包产物（防嵌套）
  "manifest.json",
  // 其他包管理器的锁文件（DSH 使用 pnpm）
  "package-lock.json",
  "yarn.lock",
  // 日志
  "npm-debug.log",
  "pnpm-debug.log",
  // 敏感文件（精确名）
  ".env",
  ".npmrc",
  ".netrc",
  ".yarnrc",
  ".yarnrc.yml",
  ".pypirc",
  ".npmignore",
  // DSH_HOME 级：凭据 / 运行时状态 / 全局设置（dshhome 快照默认排除）
  ".credentials.yaml",
  ".anonymous-user-id",
  "settings.yaml",
  // 导出工作区配置快照（本工具写入，不进包）
  ".dshpkcfg",
  ".dspack-sources",
  ".dsh-pack"
]);
var DENY_EXT = /* @__PURE__ */ new Set([".key", ".pem", ".p12", ".pfx", ".crt", ".der", ".asc"]);
var DENY_BASENAME = [
  /^\.env(\..+)?$/,
  // .env / .env.local / .env.production ...
  /(^|\.)credentials?\.ya?ml$/i,
  // credentials.yaml / .credentials.yml / my.credentials.yml
  /\.(credential|credentials)$/i,
  // *.credential / *.credentials
  /^id_(rsa|ed25519|ecdsa|ed448|dsa)(\.pub)?$/,
  // SSH 私钥
  /^secrets?\.(json|ya?ml)$/i,
  // secrets.json / secret.yml
  /^(api[-_]?key|apikey|token)s?([._-].*)?$/i
  // api_key.txt / token.json / api.key
];
var DENY_PATH = [/\.tgz$/, /\.tar\.gz$/, /\.zip$/, /\.dspack$/];
var DENY_PATH_PREFIX = [
  "attachments/",
  // 附件（运行时数据）
  "profiles/web/",
  // 安装基线 profile 模板（PROFILE_TEMPLATES）
  "profiles/headless/",
  "skills/.system/"
  // 安装内部系统技能（skipSystem）
];
function matchExt(name2) {
  const idx = name2.lastIndexOf(".");
  if (idx <= 0) return "";
  return name2.slice(idx).toLowerCase();
}
function isExcluded(relPath) {
  const rel = relPath.replace(/\\/g, "/").toLowerCase();
  const segments = rel.split("/");
  const name2 = segments[segments.length - 1];
  for (const seg of segments) {
    if (DENY_EXACT.has(seg)) return true;
  }
  if (DENY_EXT.has(matchExt(name2))) return true;
  for (const re of DENY_BASENAME) {
    if (re.test(name2)) return true;
  }
  for (const re of DENY_PATH) {
    if (re.test(rel)) return true;
  }
  for (const p of DENY_PATH_PREFIX) {
    if (rel.startsWith(p)) return true;
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

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/identity.js
var ALIAS = Symbol.for("yaml.alias");
var DOC = Symbol.for("yaml.document");
var MAP = Symbol.for("yaml.map");
var PAIR = Symbol.for("yaml.pair");
var SCALAR = Symbol.for("yaml.scalar");
var SEQ = Symbol.for("yaml.seq");
var NODE_TYPE = Symbol.for("yaml.node.type");
var isAlias = (node2) => !!node2 && typeof node2 === "object" && node2[NODE_TYPE] === ALIAS;
var isDocument = (node2) => !!node2 && typeof node2 === "object" && node2[NODE_TYPE] === DOC;
var isMap = (node2) => !!node2 && typeof node2 === "object" && node2[NODE_TYPE] === MAP;
var isPair = (node2) => !!node2 && typeof node2 === "object" && node2[NODE_TYPE] === PAIR;
var isScalar = (node2) => !!node2 && typeof node2 === "object" && node2[NODE_TYPE] === SCALAR;
var isSeq = (node2) => !!node2 && typeof node2 === "object" && node2[NODE_TYPE] === SEQ;
function isCollection(node2) {
  if (node2 && typeof node2 === "object")
    switch (node2[NODE_TYPE]) {
      case MAP:
      case SEQ:
        return true;
    }
  return false;
}
function isNode(node2) {
  if (node2 && typeof node2 === "object")
    switch (node2[NODE_TYPE]) {
      case ALIAS:
      case MAP:
      case SCALAR:
      case SEQ:
        return true;
    }
  return false;
}
var hasAnchor = (node2) => (isScalar(node2) || isCollection(node2)) && !!node2.anchor;

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/visit.js
var BREAK = Symbol("break visit");
var SKIP = Symbol("skip children");
var REMOVE = Symbol("remove node");
function visit(node2, visitor) {
  const visitor_ = initVisitor(visitor);
  if (isDocument(node2)) {
    const cd = visit_(null, node2.contents, visitor_, Object.freeze([node2]));
    if (cd === REMOVE)
      node2.contents = null;
  } else
    visit_(null, node2, visitor_, Object.freeze([]));
}
visit.BREAK = BREAK;
visit.SKIP = SKIP;
visit.REMOVE = REMOVE;
function visit_(key, node2, visitor, path) {
  const ctrl = callVisitor(key, node2, visitor, path);
  if (isNode(ctrl) || isPair(ctrl)) {
    replaceNode(key, path, ctrl);
    return visit_(key, ctrl, visitor, path);
  }
  if (typeof ctrl !== "symbol") {
    if (isCollection(node2)) {
      path = Object.freeze(path.concat(node2));
      for (let i = 0; i < node2.items.length; ++i) {
        const ci = visit_(i, node2.items[i], visitor, path);
        if (typeof ci === "number")
          i = ci - 1;
        else if (ci === BREAK)
          return BREAK;
        else if (ci === REMOVE) {
          node2.items.splice(i, 1);
          i -= 1;
        }
      }
    } else if (isPair(node2)) {
      path = Object.freeze(path.concat(node2));
      const ck = visit_("key", node2.key, visitor, path);
      if (ck === BREAK)
        return BREAK;
      else if (ck === REMOVE)
        node2.key = null;
      const cv = visit_("value", node2.value, visitor, path);
      if (cv === BREAK)
        return BREAK;
      else if (cv === REMOVE)
        node2.value = null;
    }
  }
  return ctrl;
}
async function visitAsync(node2, visitor) {
  const visitor_ = initVisitor(visitor);
  if (isDocument(node2)) {
    const cd = await visitAsync_(null, node2.contents, visitor_, Object.freeze([node2]));
    if (cd === REMOVE)
      node2.contents = null;
  } else
    await visitAsync_(null, node2, visitor_, Object.freeze([]));
}
visitAsync.BREAK = BREAK;
visitAsync.SKIP = SKIP;
visitAsync.REMOVE = REMOVE;
async function visitAsync_(key, node2, visitor, path) {
  const ctrl = await callVisitor(key, node2, visitor, path);
  if (isNode(ctrl) || isPair(ctrl)) {
    replaceNode(key, path, ctrl);
    return visitAsync_(key, ctrl, visitor, path);
  }
  if (typeof ctrl !== "symbol") {
    if (isCollection(node2)) {
      path = Object.freeze(path.concat(node2));
      for (let i = 0; i < node2.items.length; ++i) {
        const ci = await visitAsync_(i, node2.items[i], visitor, path);
        if (typeof ci === "number")
          i = ci - 1;
        else if (ci === BREAK)
          return BREAK;
        else if (ci === REMOVE) {
          node2.items.splice(i, 1);
          i -= 1;
        }
      }
    } else if (isPair(node2)) {
      path = Object.freeze(path.concat(node2));
      const ck = await visitAsync_("key", node2.key, visitor, path);
      if (ck === BREAK)
        return BREAK;
      else if (ck === REMOVE)
        node2.key = null;
      const cv = await visitAsync_("value", node2.value, visitor, path);
      if (cv === BREAK)
        return BREAK;
      else if (cv === REMOVE)
        node2.value = null;
    }
  }
  return ctrl;
}
function initVisitor(visitor) {
  if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
    return Object.assign({
      Alias: visitor.Node,
      Map: visitor.Node,
      Scalar: visitor.Node,
      Seq: visitor.Node
    }, visitor.Value && {
      Map: visitor.Value,
      Scalar: visitor.Value,
      Seq: visitor.Value
    }, visitor.Collection && {
      Map: visitor.Collection,
      Seq: visitor.Collection
    }, visitor);
  }
  return visitor;
}
function callVisitor(key, node2, visitor, path) {
  if (typeof visitor === "function")
    return visitor(key, node2, path);
  if (isMap(node2))
    return visitor.Map?.(key, node2, path);
  if (isSeq(node2))
    return visitor.Seq?.(key, node2, path);
  if (isPair(node2))
    return visitor.Pair?.(key, node2, path);
  if (isScalar(node2))
    return visitor.Scalar?.(key, node2, path);
  if (isAlias(node2))
    return visitor.Alias?.(key, node2, path);
  return void 0;
}
function replaceNode(key, path, node2) {
  const parent = path[path.length - 1];
  if (isCollection(parent)) {
    parent.items[key] = node2;
  } else if (isPair(parent)) {
    if (key === "key")
      parent.key = node2;
    else
      parent.value = node2;
  } else if (isDocument(parent)) {
    parent.contents = node2;
  } else {
    const pt = isAlias(parent) ? "alias" : "scalar";
    throw new Error(`Cannot replace node with ${pt} parent`);
  }
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/doc/directives.js
var escapeChars = {
  "!": "%21",
  ",": "%2C",
  "[": "%5B",
  "]": "%5D",
  "{": "%7B",
  "}": "%7D"
};
var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
var Directives = class _Directives {
  constructor(yaml, tags) {
    this.docStart = null;
    this.docEnd = false;
    this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
    this.tags = Object.assign({}, _Directives.defaultTags, tags);
  }
  clone() {
    const copy = new _Directives(this.yaml, this.tags);
    copy.docStart = this.docStart;
    return copy;
  }
  /**
   * During parsing, get a Directives instance for the current document and
   * update the stream state according to the current version's spec.
   */
  atDocument() {
    const res = new _Directives(this.yaml, this.tags);
    switch (this.yaml.version) {
      case "1.1":
        this.atNextDocument = true;
        break;
      case "1.2":
        this.atNextDocument = false;
        this.yaml = {
          explicit: _Directives.defaultYaml.explicit,
          version: "1.2"
        };
        this.tags = Object.assign({}, _Directives.defaultTags);
        break;
    }
    return res;
  }
  /**
   * @param onError - May be called even if the action was successful
   * @returns `true` on success
   */
  add(line, onError) {
    if (this.atNextDocument) {
      this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
      this.tags = Object.assign({}, _Directives.defaultTags);
      this.atNextDocument = false;
    }
    const parts = line.trim().split(/[ \t]+/);
    const name2 = parts.shift();
    switch (name2) {
      case "%TAG": {
        if (parts.length !== 2) {
          onError(0, "%TAG directive should contain exactly two parts");
          if (parts.length < 2)
            return false;
        }
        const [handle, prefix] = parts;
        this.tags[handle] = prefix;
        return true;
      }
      case "%YAML": {
        this.yaml.explicit = true;
        if (parts.length !== 1) {
          onError(0, "%YAML directive should contain exactly one part");
          return false;
        }
        const [version2] = parts;
        if (version2 === "1.1" || version2 === "1.2") {
          this.yaml.version = version2;
          return true;
        } else {
          const isValid = /^\d+\.\d+$/.test(version2);
          onError(6, `Unsupported YAML version ${version2}`, isValid);
          return false;
        }
      }
      default:
        onError(0, `Unknown directive ${name2}`, true);
        return false;
    }
  }
  /**
   * Resolves a tag, matching handles to those defined in %TAG directives.
   *
   * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
   *   `'!local'` tag, or `null` if unresolvable.
   */
  tagName(source, onError) {
    if (source === "!")
      return "!";
    if (source[0] !== "!") {
      onError(`Not a valid tag: ${source}`);
      return null;
    }
    if (source[1] === "<") {
      const verbatim = source.slice(2, -1);
      if (verbatim === "!" || verbatim === "!!") {
        onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
        return null;
      }
      if (source[source.length - 1] !== ">")
        onError("Verbatim tags must end with a >");
      return verbatim;
    }
    const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
    if (!suffix)
      onError(`The ${source} tag has no suffix`);
    const prefix = this.tags[handle];
    if (prefix) {
      try {
        return prefix + decodeURIComponent(suffix);
      } catch (error) {
        onError(String(error));
        return null;
      }
    }
    if (handle === "!")
      return source;
    onError(`Could not resolve tag: ${source}`);
    return null;
  }
  /**
   * Given a fully resolved tag, returns its printable string form,
   * taking into account current tag prefixes and defaults.
   */
  tagString(tag) {
    for (const [handle, prefix] of Object.entries(this.tags)) {
      if (tag.startsWith(prefix))
        return handle + escapeTagName(tag.substring(prefix.length));
    }
    return tag[0] === "!" ? tag : `!<${tag}>`;
  }
  toString(doc) {
    const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
    const tagEntries = Object.entries(this.tags);
    let tagNames;
    if (doc && tagEntries.length > 0 && isNode(doc.contents)) {
      const tags = {};
      visit(doc.contents, (_key, node2) => {
        if (isNode(node2) && node2.tag)
          tags[node2.tag] = true;
      });
      tagNames = Object.keys(tags);
    } else
      tagNames = [];
    for (const [handle, prefix] of tagEntries) {
      if (handle === "!!" && prefix === "tag:yaml.org,2002:")
        continue;
      if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
        lines.push(`%TAG ${handle} ${prefix}`);
    }
    return lines.join("\n");
  }
};
Directives.defaultYaml = { explicit: false, version: "1.2" };
Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/doc/anchors.js
function anchorIsValid(anchor) {
  if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
    const sa = JSON.stringify(anchor);
    const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
    throw new Error(msg);
  }
  return true;
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/doc/applyReviver.js
function applyReviver(reviver, obj, key, val) {
  if (val && typeof val === "object") {
    if (Array.isArray(val)) {
      for (let i = 0, len = val.length; i < len; ++i) {
        const v0 = val[i];
        const v1 = applyReviver(reviver, val, String(i), v0);
        if (v1 === void 0)
          delete val[i];
        else if (v1 !== v0)
          val[i] = v1;
      }
    } else if (val instanceof Map) {
      for (const k of Array.from(val.keys())) {
        const v0 = val.get(k);
        const v1 = applyReviver(reviver, val, k, v0);
        if (v1 === void 0)
          val.delete(k);
        else if (v1 !== v0)
          val.set(k, v1);
      }
    } else if (val instanceof Set) {
      for (const v0 of Array.from(val)) {
        const v1 = applyReviver(reviver, val, v0, v0);
        if (v1 === void 0)
          val.delete(v0);
        else if (v1 !== v0) {
          val.delete(v0);
          val.add(v1);
        }
      }
    } else {
      for (const [k, v0] of Object.entries(val)) {
        const v1 = applyReviver(reviver, val, k, v0);
        if (v1 === void 0)
          delete val[k];
        else if (v1 !== v0)
          val[k] = v1;
      }
    }
  }
  return reviver.call(obj, key, val);
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/toJS.js
function toJS(value, arg, ctx) {
  if (Array.isArray(value))
    return value.map((v, i) => toJS(v, String(i), ctx));
  if (value && typeof value.toJSON === "function") {
    if (!ctx || !hasAnchor(value))
      return value.toJSON(arg, ctx);
    const data = { aliasCount: 0, count: 1, res: void 0 };
    ctx.anchors.set(value, data);
    ctx.onCreate = (res2) => {
      data.res = res2;
      delete ctx.onCreate;
    };
    const res = value.toJSON(arg, ctx);
    if (ctx.onCreate)
      ctx.onCreate(res);
    return res;
  }
  if (typeof value === "bigint" && !ctx?.keep)
    return Number(value);
  return value;
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/Node.js
var NodeBase = class {
  constructor(type) {
    Object.defineProperty(this, NODE_TYPE, { value: type });
  }
  /** Create a copy of this node.  */
  clone() {
    const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    if (this.range)
      copy.range = this.range.slice();
    return copy;
  }
  /** A plain JavaScript representation of this node. */
  toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
    if (!isDocument(doc))
      throw new TypeError("A document argument is required");
    const ctx = {
      anchors: /* @__PURE__ */ new Map(),
      doc,
      keep: true,
      mapAsMap: mapAsMap === true,
      mapKeyWarned: false,
      maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
    };
    const res = toJS(this, "", ctx);
    if (typeof onAnchor === "function")
      for (const { count, res: res2 } of ctx.anchors.values())
        onAnchor(res2, count);
    return typeof reviver === "function" ? applyReviver(reviver, { "": res }, "", res) : res;
  }
};

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/Alias.js
var Alias = class extends NodeBase {
  constructor(source) {
    super(ALIAS);
    this.source = source;
    Object.defineProperty(this, "tag", {
      set() {
        throw new Error("Alias nodes cannot have tags");
      }
    });
  }
  /**
   * Resolve the value of this alias within `doc`, finding the last
   * instance of the `source` anchor before this node.
   */
  resolve(doc, ctx) {
    if (ctx?.maxAliasCount === 0)
      throw new ReferenceError("Alias resolution is disabled");
    let nodes;
    if (ctx?.aliasResolveCache) {
      nodes = ctx.aliasResolveCache;
    } else {
      nodes = [];
      visit(doc, {
        Node: (_key, node2) => {
          if (isAlias(node2) || hasAnchor(node2))
            nodes.push(node2);
        }
      });
      if (ctx)
        ctx.aliasResolveCache = nodes;
    }
    let found = void 0;
    for (const node2 of nodes) {
      if (node2 === this)
        break;
      if (node2.anchor === this.source)
        found = node2;
    }
    if (found && ctx) {
      const { anchors, doc: doc2, maxAliasCount } = ctx;
      let data = anchors.get(found);
      if (!data) {
        toJS(found, null, ctx);
        data = anchors.get(found);
      }
      if (data?.res === void 0) {
        const msg = "This should not happen: Alias anchor was not resolved?";
        throw new ReferenceError(msg);
      }
      if (maxAliasCount >= 0) {
        data.count += 1;
        if (data.aliasCount === 0)
          data.aliasCount = getAliasCount(doc2, found, anchors);
        if (data.count * data.aliasCount > maxAliasCount) {
          const msg = "Excessive alias count indicates a resource exhaustion attack";
          throw new ReferenceError(msg);
        }
      }
    }
    return found;
  }
  toJSON(_arg, ctx) {
    if (!ctx)
      return { source: this.source };
    const source = this.resolve(ctx.doc, ctx);
    if (!source) {
      const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
      throw new ReferenceError(msg);
    }
    return ctx.anchors.get(source).res;
  }
  toString(ctx, _onComment, _onChompKeep) {
    const src = `*${this.source}`;
    if (ctx) {
      anchorIsValid(this.source);
      if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
        const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new Error(msg);
      }
      if (ctx.implicitKey)
        return `${src} `;
    }
    return src;
  }
};
function getAliasCount(doc, node2, anchors) {
  if (isAlias(node2)) {
    const source = node2.resolve(doc);
    const anchor = anchors && source && anchors.get(source);
    return anchor ? anchor.count * anchor.aliasCount : 0;
  } else if (isCollection(node2)) {
    let count = 0;
    for (const item of node2.items) {
      const c = getAliasCount(doc, item, anchors);
      if (c > count)
        count = c;
    }
    return count;
  } else if (isPair(node2)) {
    const kc = getAliasCount(doc, node2.key, anchors);
    const vc = getAliasCount(doc, node2.value, anchors);
    return Math.max(kc, vc);
  }
  return 1;
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/Scalar.js
var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
var Scalar = class extends NodeBase {
  constructor(value) {
    super(SCALAR);
    this.value = value;
  }
  toJSON(arg, ctx) {
    return ctx?.keep ? this.value : toJS(this.value, arg, ctx);
  }
  toString() {
    return String(this.value);
  }
};
Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
Scalar.PLAIN = "PLAIN";
Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/doc/createNode.js
var defaultTagPrefix = "tag:yaml.org,2002:";
function findTagObject(value, tagName, tags) {
  if (tagName) {
    const match = tags.filter((t) => t.tag === tagName);
    const tagObj = match.find((t) => !t.format) ?? match[0];
    if (!tagObj)
      throw new Error(`Tag ${tagName} not found`);
    return tagObj;
  }
  return tags.find((t) => t.identify?.(value) && !t.format);
}
function createNode(value, tagName, ctx) {
  if (isDocument(value))
    value = value.contents;
  if (isNode(value))
    return value;
  if (isPair(value)) {
    const map2 = ctx.schema[MAP].createNode?.(ctx.schema, null, ctx);
    map2.items.push(value);
    return map2;
  }
  if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
    value = value.valueOf();
  }
  const { aliasDuplicateObjects, onAnchor, onTagObj, schema: schema4, sourceObjects } = ctx;
  let ref = void 0;
  if (aliasDuplicateObjects && value && typeof value === "object") {
    ref = sourceObjects.get(value);
    if (ref) {
      ref.anchor ?? (ref.anchor = onAnchor(value));
      return new Alias(ref.anchor);
    } else {
      ref = { anchor: null, node: null };
      sourceObjects.set(value, ref);
    }
  }
  if (tagName?.startsWith("!!"))
    tagName = defaultTagPrefix + tagName.slice(2);
  let tagObj = findTagObject(value, tagName, schema4.tags);
  if (!tagObj) {
    if (value && typeof value.toJSON === "function") {
      value = value.toJSON();
    }
    if (!value || typeof value !== "object") {
      const node3 = new Scalar(value);
      if (ref)
        ref.node = node3;
      return node3;
    }
    tagObj = value instanceof Map ? schema4[MAP] : Symbol.iterator in Object(value) ? schema4[SEQ] : schema4[MAP];
  }
  if (onTagObj) {
    onTagObj(tagObj);
    delete ctx.onTagObj;
  }
  const node2 = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar(value);
  if (tagName)
    node2.tag = tagName;
  else if (!tagObj.default)
    node2.tag = tagObj.tag;
  if (ref)
    ref.node = node2;
  return node2;
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/Collection.js
function collectionFromPath(schema4, path, value) {
  let v = value;
  for (let i = path.length - 1; i >= 0; --i) {
    const k = path[i];
    if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
      const a = [];
      a[k] = v;
      v = a;
    } else {
      v = /* @__PURE__ */ new Map([[k, v]]);
    }
  }
  return createNode(v, void 0, {
    aliasDuplicateObjects: false,
    keepUndefined: false,
    onAnchor: () => {
      throw new Error("This should not happen, please report a bug.");
    },
    schema: schema4,
    sourceObjects: /* @__PURE__ */ new Map()
  });
}
var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;
var Collection = class extends NodeBase {
  constructor(type, schema4) {
    super(type);
    Object.defineProperty(this, "schema", {
      value: schema4,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }
  /**
   * Create a copy of this collection.
   *
   * @param schema - If defined, overwrites the original's schema
   */
  clone(schema4) {
    const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    if (schema4)
      copy.schema = schema4;
    copy.items = copy.items.map((it) => isNode(it) || isPair(it) ? it.clone(schema4) : it);
    if (this.range)
      copy.range = this.range.slice();
    return copy;
  }
  /**
   * Adds a value to the collection. For `!!map` and `!!omap` the value must
   * be a Pair instance or a `{ key, value }` object, which may not have a key
   * that already exists in the map.
   */
  addIn(path, value) {
    if (isEmptyPath(path))
      this.add(value);
    else {
      const [key, ...rest] = path;
      const node2 = this.get(key, true);
      if (isCollection(node2))
        node2.addIn(rest, value);
      else if (node2 === void 0 && this.schema)
        this.set(key, collectionFromPath(this.schema, rest, value));
      else
        throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
  }
  /**
   * Removes a value from the collection.
   * @returns `true` if the item was found and removed.
   */
  deleteIn(path) {
    const [key, ...rest] = path;
    if (rest.length === 0)
      return this.delete(key);
    const node2 = this.get(key, true);
    if (isCollection(node2))
      return node2.deleteIn(rest);
    else
      throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
  }
  /**
   * Returns item at `key`, or `undefined` if not found. By default unwraps
   * scalar values from their surrounding node; to disable set `keepScalar` to
   * `true` (collections are always returned intact).
   */
  getIn(path, keepScalar) {
    const [key, ...rest] = path;
    const node2 = this.get(key, true);
    if (rest.length === 0)
      return !keepScalar && isScalar(node2) ? node2.value : node2;
    else
      return isCollection(node2) ? node2.getIn(rest, keepScalar) : void 0;
  }
  hasAllNullValues(allowScalar) {
    return this.items.every((node2) => {
      if (!isPair(node2))
        return false;
      const n = node2.value;
      return n == null || allowScalar && isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
    });
  }
  /**
   * Checks if the collection includes a value with the key `key`.
   */
  hasIn(path) {
    const [key, ...rest] = path;
    if (rest.length === 0)
      return this.has(key);
    const node2 = this.get(key, true);
    return isCollection(node2) ? node2.hasIn(rest) : false;
  }
  /**
   * Sets a value in this collection. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   */
  setIn(path, value) {
    const [key, ...rest] = path;
    if (rest.length === 0) {
      this.set(key, value);
    } else {
      const node2 = this.get(key, true);
      if (isCollection(node2))
        node2.setIn(rest, value);
      else if (node2 === void 0 && this.schema)
        this.set(key, collectionFromPath(this.schema, rest, value));
      else
        throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
  }
};

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/stringify/stringifyComment.js
var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
function indentComment(comment, indent) {
  if (/^\n+$/.test(comment))
    return comment.substring(1);
  return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
}
var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/stringify/foldFlowLines.js
var FOLD_FLOW = "flow";
var FOLD_BLOCK = "block";
var FOLD_QUOTED = "quoted";
function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
  if (!lineWidth || lineWidth < 0)
    return text;
  if (lineWidth < minContentWidth)
    minContentWidth = 0;
  const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
  if (text.length <= endStep)
    return text;
  const folds = [];
  const escapedFolds = {};
  let end = lineWidth - indent.length;
  if (typeof indentAtStart === "number") {
    if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
      folds.push(0);
    else
      end = lineWidth - indentAtStart;
  }
  let split = void 0;
  let prev = void 0;
  let overflow = false;
  let i = -1;
  let escStart = -1;
  let escEnd = -1;
  if (mode === FOLD_BLOCK) {
    i = consumeMoreIndentedLines(text, i, indent.length);
    if (i !== -1)
      end = i + endStep;
  }
  for (let ch; ch = text[i += 1]; ) {
    if (mode === FOLD_QUOTED && ch === "\\") {
      escStart = i;
      switch (text[i + 1]) {
        case "x":
          i += 3;
          break;
        case "u":
          i += 5;
          break;
        case "U":
          i += 9;
          break;
        default:
          i += 1;
      }
      escEnd = i;
    }
    if (ch === "\n") {
      if (mode === FOLD_BLOCK)
        i = consumeMoreIndentedLines(text, i, indent.length);
      end = i + indent.length + endStep;
      split = void 0;
    } else {
      if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
        const next = text[i + 1];
        if (next && next !== " " && next !== "\n" && next !== "	")
          split = i;
      }
      if (i >= end) {
        if (split) {
          folds.push(split);
          end = split + endStep;
          split = void 0;
        } else if (mode === FOLD_QUOTED) {
          while (prev === " " || prev === "	") {
            prev = ch;
            ch = text[i += 1];
            overflow = true;
          }
          const j = i > escEnd + 1 ? i - 2 : escStart - 1;
          if (escapedFolds[j])
            return text;
          folds.push(j);
          escapedFolds[j] = true;
          end = j + endStep;
          split = void 0;
        } else {
          overflow = true;
        }
      }
    }
    prev = ch;
  }
  if (overflow && onOverflow)
    onOverflow();
  if (folds.length === 0)
    return text;
  if (onFold)
    onFold();
  let res = text.slice(0, folds[0]);
  for (let i2 = 0; i2 < folds.length; ++i2) {
    const fold = folds[i2];
    const end2 = folds[i2 + 1] || text.length;
    if (fold === 0)
      res = `
${indent}${text.slice(0, end2)}`;
    else {
      if (mode === FOLD_QUOTED && escapedFolds[fold])
        res += `${text[fold]}\\`;
      res += `
${indent}${text.slice(fold + 1, end2)}`;
    }
  }
  return res;
}
function consumeMoreIndentedLines(text, i, indent) {
  let end = i;
  let start = i + 1;
  let ch = text[start];
  while (ch === " " || ch === "	") {
    if (i < start + indent) {
      ch = text[++i];
    } else {
      do {
        ch = text[++i];
      } while (ch && ch !== "\n");
      end = i;
      start = i + 1;
      ch = text[start];
    }
  }
  return end;
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/stringify/stringifyString.js
var getFoldOptions = (ctx, isBlock) => ({
  indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
  lineWidth: ctx.options.lineWidth,
  minContentWidth: ctx.options.minContentWidth
});
var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
function lineLengthOverLimit(str, lineWidth, indentLength) {
  if (!lineWidth || lineWidth < 0)
    return false;
  const limit = lineWidth - indentLength;
  const strLen = str.length;
  if (strLen <= limit)
    return false;
  for (let i = 0, start = 0; i < strLen; ++i) {
    if (str[i] === "\n") {
      if (i - start > limit)
        return true;
      start = i + 1;
      if (strLen - start <= limit)
        return false;
    }
  }
  return true;
}
function doubleQuotedString(value, ctx) {
  const json = JSON.stringify(value);
  if (ctx.options.doubleQuotedAsJSON)
    return json;
  const { implicitKey } = ctx;
  const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
  const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
  let str = "";
  let start = 0;
  for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
    if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
      str += json.slice(start, i) + "\\ ";
      i += 1;
      start = i;
      ch = "\\";
    }
    if (ch === "\\")
      switch (json[i + 1]) {
        case "u":
          {
            str += json.slice(start, i);
            const code = json.substr(i + 2, 4);
            switch (code) {
              case "0000":
                str += "\\0";
                break;
              case "0007":
                str += "\\a";
                break;
              case "000b":
                str += "\\v";
                break;
              case "001b":
                str += "\\e";
                break;
              case "0085":
                str += "\\N";
                break;
              case "00a0":
                str += "\\_";
                break;
              case "2028":
                str += "\\L";
                break;
              case "2029":
                str += "\\P";
                break;
              default:
                if (code.substr(0, 2) === "00")
                  str += "\\x" + code.substr(2);
                else
                  str += json.substr(i, 6);
            }
            i += 5;
            start = i + 1;
          }
          break;
        case "n":
          if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
            i += 1;
          } else {
            str += json.slice(start, i) + "\n\n";
            while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
              str += "\n";
              i += 2;
            }
            str += indent;
            if (json[i + 2] === " ")
              str += "\\";
            i += 1;
            start = i + 1;
          }
          break;
        default:
          i += 1;
      }
  }
  str = start ? str + json.slice(start) : json;
  return implicitKey ? str : foldFlowLines(str, indent, FOLD_QUOTED, getFoldOptions(ctx, false));
}
function singleQuotedString(value, ctx) {
  if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
    return doubleQuotedString(value, ctx);
  const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
  const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
  return ctx.implicitKey ? res : foldFlowLines(res, indent, FOLD_FLOW, getFoldOptions(ctx, false));
}
function quotedString(value, ctx) {
  const { singleQuote } = ctx.options;
  let qs;
  if (singleQuote === false)
    qs = doubleQuotedString;
  else {
    const hasDouble = value.includes('"');
    const hasSingle = value.includes("'");
    if (hasDouble && !hasSingle)
      qs = singleQuotedString;
    else if (hasSingle && !hasDouble)
      qs = doubleQuotedString;
    else
      qs = singleQuote ? singleQuotedString : doubleQuotedString;
  }
  return qs(value, ctx);
}
var blockEndNewlines;
try {
  blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
} catch {
  blockEndNewlines = /\n+(?!\n|$)/g;
}
function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
  const { blockQuote, commentString, lineWidth } = ctx.options;
  if (!blockQuote || /\n[\t ]+$/.test(value)) {
    return quotedString(value, ctx);
  }
  const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
  const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.BLOCK_FOLDED ? false : type === Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
  if (!value)
    return literal ? "|\n" : ">\n";
  let chomp;
  let endStart;
  for (endStart = value.length; endStart > 0; --endStart) {
    const ch = value[endStart - 1];
    if (ch !== "\n" && ch !== "	" && ch !== " ")
      break;
  }
  let end = value.substring(endStart);
  const endNlPos = end.indexOf("\n");
  if (endNlPos === -1) {
    chomp = "-";
  } else if (value === end || endNlPos !== end.length - 1) {
    chomp = "+";
    if (onChompKeep)
      onChompKeep();
  } else {
    chomp = "";
  }
  if (end) {
    value = value.slice(0, -end.length);
    if (end[end.length - 1] === "\n")
      end = end.slice(0, -1);
    end = end.replace(blockEndNewlines, `$&${indent}`);
  }
  let startWithSpace = false;
  let startEnd;
  let startNlPos = -1;
  for (startEnd = 0; startEnd < value.length; ++startEnd) {
    const ch = value[startEnd];
    if (ch === " ")
      startWithSpace = true;
    else if (ch === "\n")
      startNlPos = startEnd;
    else
      break;
  }
  let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
  if (start) {
    value = value.substring(start.length);
    start = start.replace(/\n+/g, `$&${indent}`);
  }
  const indentSize = indent ? "2" : "1";
  let header2 = (startWithSpace ? indentSize : "") + chomp;
  if (comment) {
    header2 += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
    if (onComment)
      onComment();
  }
  if (!literal) {
    const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
    let literalFallback = false;
    const foldOptions = getFoldOptions(ctx, true);
    if (blockQuote !== "folded" && type !== Scalar.BLOCK_FOLDED) {
      foldOptions.onOverflow = () => {
        literalFallback = true;
      };
    }
    const body = foldFlowLines(`${start}${foldedValue}${end}`, indent, FOLD_BLOCK, foldOptions);
    if (!literalFallback)
      return `>${header2}
${indent}${body}`;
  }
  value = value.replace(/\n+/g, `$&${indent}`);
  return `|${header2}
${indent}${start}${value}${end}`;
}
function plainString(item, ctx, onComment, onChompKeep) {
  const { type, value } = item;
  const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
  if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
    return quotedString(value, ctx);
  }
  if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
    return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
  }
  if (!implicitKey && !inFlow && type !== Scalar.PLAIN && value.includes("\n")) {
    return blockString(item, ctx, onComment, onChompKeep);
  }
  if (containsDocumentMarker(value)) {
    if (indent === "") {
      ctx.forceBlockIndent = true;
      return blockString(item, ctx, onComment, onChompKeep);
    } else if (implicitKey && indent === indentStep) {
      return quotedString(value, ctx);
    }
  }
  const str = value.replace(/\n+/g, `$&
${indent}`);
  if (actualString) {
    const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
    const { compat, tags } = ctx.doc.schema;
    if (tags.some(test) || compat?.some(test))
      return quotedString(value, ctx);
  }
  return implicitKey ? str : foldFlowLines(str, indent, FOLD_FLOW, getFoldOptions(ctx, false));
}
function stringifyString(item, ctx, onComment, onChompKeep) {
  const { implicitKey, inFlow } = ctx;
  const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
  let { type } = item;
  if (type !== Scalar.QUOTE_DOUBLE) {
    if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
      type = Scalar.QUOTE_DOUBLE;
  }
  const _stringify = (_type) => {
    switch (_type) {
      case Scalar.BLOCK_FOLDED:
      case Scalar.BLOCK_LITERAL:
        return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
      case Scalar.QUOTE_DOUBLE:
        return doubleQuotedString(ss.value, ctx);
      case Scalar.QUOTE_SINGLE:
        return singleQuotedString(ss.value, ctx);
      case Scalar.PLAIN:
        return plainString(ss, ctx, onComment, onChompKeep);
      default:
        return null;
    }
  };
  let res = _stringify(type);
  if (res === null) {
    const { defaultKeyType, defaultStringType } = ctx.options;
    const t = implicitKey && defaultKeyType || defaultStringType;
    res = _stringify(t);
    if (res === null)
      throw new Error(`Unsupported default string type ${t}`);
  }
  return res;
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/stringify/stringify.js
function createStringifyContext(doc, options) {
  const opt = Object.assign({
    blockQuote: true,
    commentString: stringifyComment,
    defaultKeyType: null,
    defaultStringType: "PLAIN",
    directives: null,
    doubleQuotedAsJSON: false,
    doubleQuotedMinMultiLineLength: 40,
    falseStr: "false",
    flowCollectionPadding: true,
    indentSeq: true,
    lineWidth: 80,
    minContentWidth: 20,
    nullStr: "null",
    simpleKeys: false,
    singleQuote: null,
    trailingComma: false,
    trueStr: "true",
    verifyAliasOrder: true
  }, doc.schema.toStringOptions, options);
  let inFlow;
  switch (opt.collectionStyle) {
    case "block":
      inFlow = false;
      break;
    case "flow":
      inFlow = true;
      break;
    default:
      inFlow = null;
  }
  return {
    anchors: /* @__PURE__ */ new Set(),
    doc,
    flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
    indent: "",
    indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
    inFlow,
    options: opt
  };
}
function getTagObject(tags, item) {
  if (item.tag) {
    const match = tags.filter((t) => t.tag === item.tag);
    if (match.length > 0)
      return match.find((t) => t.format === item.format) ?? match[0];
  }
  let tagObj = void 0;
  let obj;
  if (isScalar(item)) {
    obj = item.value;
    let match = tags.filter((t) => t.identify?.(obj));
    if (match.length > 1) {
      const testMatch = match.filter((t) => t.test);
      if (testMatch.length > 0)
        match = testMatch;
    }
    tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
  } else {
    obj = item;
    tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
  }
  if (!tagObj) {
    const name2 = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
    throw new Error(`Tag not resolved for ${name2} value`);
  }
  return tagObj;
}
function stringifyProps(node2, tagObj, { anchors, doc }) {
  if (!doc.directives)
    return "";
  const props = [];
  const anchor = (isScalar(node2) || isCollection(node2)) && node2.anchor;
  if (anchor && anchorIsValid(anchor)) {
    anchors.add(anchor);
    props.push(`&${anchor}`);
  }
  const tag = node2.tag ?? (tagObj.default ? null : tagObj.tag);
  if (tag)
    props.push(doc.directives.tagString(tag));
  return props.join(" ");
}
function stringify(item, ctx, onComment, onChompKeep) {
  if (isPair(item))
    return item.toString(ctx, onComment, onChompKeep);
  if (isAlias(item)) {
    if (ctx.doc.directives)
      return item.toString(ctx);
    if (ctx.resolvedAliases?.has(item)) {
      throw new TypeError(`Cannot stringify circular structure without alias nodes`);
    } else {
      if (ctx.resolvedAliases)
        ctx.resolvedAliases.add(item);
      else
        ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
      item = item.resolve(ctx.doc);
    }
  }
  let tagObj = void 0;
  const node2 = isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
  tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node2));
  const props = stringifyProps(node2, tagObj, ctx);
  if (props.length > 0)
    ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
  const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node2, ctx, onComment, onChompKeep) : isScalar(node2) ? stringifyString(node2, ctx, onComment, onChompKeep) : node2.toString(ctx, onComment, onChompKeep);
  if (!props)
    return str;
  return isScalar(node2) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/stringify/stringifyPair.js
function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
  const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
  let keyComment = isNode(key) && key.comment || null;
  if (simpleKeys) {
    if (keyComment) {
      throw new Error("With simple keys, key nodes cannot have comments");
    }
    if (isCollection(key) || !isNode(key) && typeof key === "object") {
      const msg = "With simple keys, collection cannot be used as a key value";
      throw new Error(msg);
    }
  }
  let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || isCollection(key) || (isScalar(key) ? key.type === Scalar.BLOCK_FOLDED || key.type === Scalar.BLOCK_LITERAL : typeof key === "object"));
  ctx = Object.assign({}, ctx, {
    allNullValues: false,
    implicitKey: !explicitKey && (simpleKeys || !allNullValues),
    indent: indent + indentStep
  });
  let keyCommentDone = false;
  let chompKeep = false;
  let str = stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
  if (!explicitKey && !ctx.inFlow && str.length > 1024) {
    if (simpleKeys)
      throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
    explicitKey = true;
  }
  if (ctx.inFlow) {
    if (allNullValues || value == null) {
      if (keyCommentDone && onComment)
        onComment();
      return str === "" ? "?" : explicitKey ? `? ${str}` : str;
    }
  } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
    str = `? ${str}`;
    if (keyComment && !keyCommentDone) {
      str += lineComment(str, ctx.indent, commentString(keyComment));
    } else if (chompKeep && onChompKeep)
      onChompKeep();
    return str;
  }
  if (keyCommentDone)
    keyComment = null;
  if (explicitKey) {
    if (keyComment)
      str += lineComment(str, ctx.indent, commentString(keyComment));
    str = `? ${str}
${indent}:`;
  } else {
    str = `${str}:`;
    if (keyComment)
      str += lineComment(str, ctx.indent, commentString(keyComment));
  }
  let vsb, vcb, valueComment;
  if (isNode(value)) {
    vsb = !!value.spaceBefore;
    vcb = value.commentBefore;
    valueComment = value.comment;
  } else {
    vsb = false;
    vcb = null;
    valueComment = null;
    if (value && typeof value === "object")
      value = doc.createNode(value);
  }
  ctx.implicitKey = false;
  if (!explicitKey && !keyComment && isScalar(value))
    ctx.indentAtStart = str.length + 1;
  chompKeep = false;
  if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && isSeq(value) && !value.flow && !value.tag && !value.anchor) {
    ctx.indent = ctx.indent.substring(2);
  }
  let valueCommentDone = false;
  const valueStr = stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
  let ws = " ";
  if (keyComment || vsb || vcb) {
    ws = vsb ? "\n" : "";
    if (vcb) {
      const cs = commentString(vcb);
      ws += `
${indentComment(cs, ctx.indent)}`;
    }
    if (valueStr === "" && !ctx.inFlow) {
      if (ws === "\n" && valueComment)
        ws = "\n\n";
    } else {
      ws += `
${ctx.indent}`;
    }
  } else if (!explicitKey && isCollection(value)) {
    const vs0 = valueStr[0];
    const nl0 = valueStr.indexOf("\n");
    const hasNewline = nl0 !== -1;
    const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
    if (hasNewline || !flow) {
      let hasPropsLine = false;
      if (hasNewline && (vs0 === "&" || vs0 === "!")) {
        let sp0 = valueStr.indexOf(" ");
        if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
          sp0 = valueStr.indexOf(" ", sp0 + 1);
        }
        if (sp0 === -1 || nl0 < sp0)
          hasPropsLine = true;
      }
      if (!hasPropsLine)
        ws = `
${ctx.indent}`;
    }
  } else if (valueStr === "" || valueStr[0] === "\n") {
    ws = "";
  }
  str += ws + valueStr;
  if (ctx.inFlow) {
    if (valueCommentDone && onComment)
      onComment();
  } else if (valueComment && !valueCommentDone) {
    str += lineComment(str, ctx.indent, commentString(valueComment));
  } else if (chompKeep && onChompKeep) {
    onChompKeep();
  }
  return str;
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/log.js
function warn(logLevel, warning) {
  if (logLevel === "debug" || logLevel === "warn") {
    console.warn(warning);
  }
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/yaml-1.1/merge.js
var MERGE_KEY = "<<";
var merge = {
  identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
  default: "key",
  tag: "tag:yaml.org,2002:merge",
  test: /^<<$/,
  resolve: () => Object.assign(new Scalar(Symbol(MERGE_KEY)), {
    addToJSMap: addMergeToJSMap
  }),
  stringify: () => MERGE_KEY
};
var isMergeKey = (ctx, key) => (merge.identify(key) || isScalar(key) && (!key.type || key.type === Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
function addMergeToJSMap(ctx, map2, value) {
  const source = resolveAliasValue(ctx, value);
  if (isSeq(source))
    for (const it of source.items)
      mergeValue(ctx, map2, it);
  else if (Array.isArray(source))
    for (const it of source)
      mergeValue(ctx, map2, it);
  else
    mergeValue(ctx, map2, source);
}
function mergeValue(ctx, map2, value) {
  const source = resolveAliasValue(ctx, value);
  if (!isMap(source))
    throw new Error("Merge sources must be maps or map aliases");
  const srcMap = source.toJSON(null, ctx, Map);
  for (const [key, value2] of srcMap) {
    if (map2 instanceof Map) {
      if (!map2.has(key))
        map2.set(key, value2);
    } else if (map2 instanceof Set) {
      map2.add(key);
    } else if (!Object.prototype.hasOwnProperty.call(map2, key)) {
      Object.defineProperty(map2, key, {
        value: value2,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  }
  return map2;
}
function resolveAliasValue(ctx, value) {
  return ctx && isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/addPairToJSMap.js
function addPairToJSMap(ctx, map2, { key, value }) {
  if (isNode(key) && key.addToJSMap)
    key.addToJSMap(ctx, map2, value);
  else if (isMergeKey(ctx, key))
    addMergeToJSMap(ctx, map2, value);
  else {
    const jsKey = toJS(key, "", ctx);
    if (map2 instanceof Map) {
      map2.set(jsKey, toJS(value, jsKey, ctx));
    } else if (map2 instanceof Set) {
      map2.add(jsKey);
    } else {
      const stringKey = stringifyKey(key, jsKey, ctx);
      const jsValue = toJS(value, stringKey, ctx);
      if (stringKey in map2)
        Object.defineProperty(map2, stringKey, {
          value: jsValue,
          writable: true,
          enumerable: true,
          configurable: true
        });
      else
        map2[stringKey] = jsValue;
    }
  }
  return map2;
}
function stringifyKey(key, jsKey, ctx) {
  if (jsKey === null)
    return "";
  if (typeof jsKey !== "object")
    return String(jsKey);
  if (isNode(key) && ctx?.doc) {
    const strCtx = createStringifyContext(ctx.doc, {});
    strCtx.anchors = /* @__PURE__ */ new Set();
    for (const node2 of ctx.anchors.keys())
      strCtx.anchors.add(node2.anchor);
    strCtx.inFlow = true;
    strCtx.inStringifyKey = true;
    const strKey = key.toString(strCtx);
    if (!ctx.mapKeyWarned) {
      let jsonStr = JSON.stringify(strKey);
      if (jsonStr.length > 40)
        jsonStr = jsonStr.substring(0, 36) + '..."';
      warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
      ctx.mapKeyWarned = true;
    }
    return strKey;
  }
  return JSON.stringify(jsKey);
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/Pair.js
function createPair(key, value, ctx) {
  const k = createNode(key, void 0, ctx);
  const v = createNode(value, void 0, ctx);
  return new Pair(k, v);
}
var Pair = class _Pair {
  constructor(key, value = null) {
    Object.defineProperty(this, NODE_TYPE, { value: PAIR });
    this.key = key;
    this.value = value;
  }
  clone(schema4) {
    let { key, value } = this;
    if (isNode(key))
      key = key.clone(schema4);
    if (isNode(value))
      value = value.clone(schema4);
    return new _Pair(key, value);
  }
  toJSON(_, ctx) {
    const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
    return addPairToJSMap(ctx, pair, this);
  }
  toString(ctx, onComment, onChompKeep) {
    return ctx?.doc ? stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
  }
};

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/stringify/stringifyCollection.js
function stringifyCollection(collection, ctx, options) {
  const flow = ctx.inFlow ?? collection.flow;
  const stringify4 = flow ? stringifyFlowCollection : stringifyBlockCollection;
  return stringify4(collection, ctx, options);
}
function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
  const { indent, options: { commentString } } = ctx;
  const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
  let chompKeep = false;
  const lines = [];
  for (let i = 0; i < items.length; ++i) {
    const item = items[i];
    let comment2 = null;
    if (isNode(item)) {
      if (!chompKeep && item.spaceBefore)
        lines.push("");
      addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
      if (item.comment)
        comment2 = item.comment;
    } else if (isPair(item)) {
      const ik = isNode(item.key) ? item.key : null;
      if (ik) {
        if (!chompKeep && ik.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
      }
    }
    chompKeep = false;
    let str2 = stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
    if (comment2)
      str2 += lineComment(str2, itemIndent, commentString(comment2));
    if (chompKeep && comment2)
      chompKeep = false;
    lines.push(blockItemPrefix + str2);
  }
  let str;
  if (lines.length === 0) {
    str = flowChars.start + flowChars.end;
  } else {
    str = lines[0];
    for (let i = 1; i < lines.length; ++i) {
      const line = lines[i];
      str += line ? `
${indent}${line}` : "\n";
    }
  }
  if (comment) {
    str += "\n" + indentComment(commentString(comment), indent);
    if (onComment)
      onComment();
  } else if (chompKeep && onChompKeep)
    onChompKeep();
  return str;
}
function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
  const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
  itemIndent += indentStep;
  const itemCtx = Object.assign({}, ctx, {
    indent: itemIndent,
    inFlow: true,
    type: null
  });
  let reqNewline = false;
  let linesAtValue = 0;
  const lines = [];
  for (let i = 0; i < items.length; ++i) {
    const item = items[i];
    let comment = null;
    if (isNode(item)) {
      if (item.spaceBefore)
        lines.push("");
      addCommentBefore(ctx, lines, item.commentBefore, false);
      if (item.comment)
        comment = item.comment;
    } else if (isPair(item)) {
      const ik = isNode(item.key) ? item.key : null;
      if (ik) {
        if (ik.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, ik.commentBefore, false);
        if (ik.comment)
          reqNewline = true;
      }
      const iv = isNode(item.value) ? item.value : null;
      if (iv) {
        if (iv.comment)
          comment = iv.comment;
        if (iv.commentBefore)
          reqNewline = true;
      } else if (item.value == null && ik?.comment) {
        comment = ik.comment;
      }
    }
    if (comment)
      reqNewline = true;
    let str = stringify(item, itemCtx, () => comment = null);
    reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
    if (i < items.length - 1) {
      str += ",";
    } else if (ctx.options.trailingComma) {
      if (ctx.options.lineWidth > 0) {
        reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
      }
      if (reqNewline) {
        str += ",";
      }
    }
    if (comment)
      str += lineComment(str, itemIndent, commentString(comment));
    lines.push(str);
    linesAtValue = lines.length;
  }
  const { start, end } = flowChars;
  if (lines.length === 0) {
    return start + end;
  } else {
    if (!reqNewline) {
      const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
      reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
    }
    if (reqNewline) {
      let str = start;
      for (const line of lines)
        str += line ? `
${indentStep}${indent}${line}` : "\n";
      return `${str}
${indent}${end}`;
    } else {
      return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
    }
  }
}
function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
  if (comment && chompKeep)
    comment = comment.replace(/^\n+/, "");
  if (comment) {
    const ic = indentComment(commentString(comment), indent);
    lines.push(ic.trimStart());
  }
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/YAMLMap.js
function findPair(items, key) {
  const k = isScalar(key) ? key.value : key;
  for (const it of items) {
    if (isPair(it)) {
      if (it.key === key || it.key === k)
        return it;
      if (isScalar(it.key) && it.key.value === k)
        return it;
    }
  }
  return void 0;
}
var YAMLMap = class extends Collection {
  static get tagName() {
    return "tag:yaml.org,2002:map";
  }
  constructor(schema4) {
    super(MAP, schema4);
    this.items = [];
  }
  /**
   * A generic collection parsing method that can be extended
   * to other node classes that inherit from YAMLMap
   */
  static from(schema4, obj, ctx) {
    const { keepUndefined, replacer } = ctx;
    const map2 = new this(schema4);
    const add = (key, value) => {
      if (typeof replacer === "function")
        value = replacer.call(obj, key, value);
      else if (Array.isArray(replacer) && !replacer.includes(key))
        return;
      if (value !== void 0 || keepUndefined)
        map2.items.push(createPair(key, value, ctx));
    };
    if (obj instanceof Map) {
      for (const [key, value] of obj)
        add(key, value);
    } else if (obj && typeof obj === "object") {
      for (const key of Object.keys(obj))
        add(key, obj[key]);
    }
    if (typeof schema4.sortMapEntries === "function") {
      map2.items.sort(schema4.sortMapEntries);
    }
    return map2;
  }
  /**
   * Adds a value to the collection.
   *
   * @param overwrite - If not set `true`, using a key that is already in the
   *   collection will throw. Otherwise, overwrites the previous value.
   */
  add(pair, overwrite) {
    let _pair;
    if (isPair(pair))
      _pair = pair;
    else if (!pair || typeof pair !== "object" || !("key" in pair)) {
      _pair = new Pair(pair, pair?.value);
    } else
      _pair = new Pair(pair.key, pair.value);
    const prev = findPair(this.items, _pair.key);
    const sortEntries = this.schema?.sortMapEntries;
    if (prev) {
      if (!overwrite)
        throw new Error(`Key ${_pair.key} already set`);
      if (isScalar(prev.value) && isScalarValue(_pair.value))
        prev.value.value = _pair.value;
      else
        prev.value = _pair.value;
    } else if (sortEntries) {
      const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
      if (i === -1)
        this.items.push(_pair);
      else
        this.items.splice(i, 0, _pair);
    } else {
      this.items.push(_pair);
    }
  }
  delete(key) {
    const it = findPair(this.items, key);
    if (!it)
      return false;
    const del = this.items.splice(this.items.indexOf(it), 1);
    return del.length > 0;
  }
  get(key, keepScalar) {
    const it = findPair(this.items, key);
    const node2 = it?.value;
    return (!keepScalar && isScalar(node2) ? node2.value : node2) ?? void 0;
  }
  has(key) {
    return !!findPair(this.items, key);
  }
  set(key, value) {
    this.add(new Pair(key, value), true);
  }
  /**
   * @param ctx - Conversion context, originally set in Document#toJS()
   * @param {Class} Type - If set, forces the returned collection type
   * @returns Instance of Type, Map, or Object
   */
  toJSON(_, ctx, Type) {
    const map2 = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
    if (ctx?.onCreate)
      ctx.onCreate(map2);
    for (const item of this.items)
      addPairToJSMap(ctx, map2, item);
    return map2;
  }
  toString(ctx, onComment, onChompKeep) {
    if (!ctx)
      return JSON.stringify(this);
    for (const item of this.items) {
      if (!isPair(item))
        throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
    }
    if (!ctx.allNullValues && this.hasAllNullValues(false))
      ctx = Object.assign({}, ctx, { allNullValues: true });
    return stringifyCollection(this, ctx, {
      blockItemPrefix: "",
      flowChars: { start: "{", end: "}" },
      itemIndent: ctx.indent || "",
      onChompKeep,
      onComment
    });
  }
};

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/common/map.js
var map = {
  collection: "map",
  default: true,
  nodeClass: YAMLMap,
  tag: "tag:yaml.org,2002:map",
  resolve(map2, onError) {
    if (!isMap(map2))
      onError("Expected a mapping for this tag");
    return map2;
  },
  createNode: (schema4, obj, ctx) => YAMLMap.from(schema4, obj, ctx)
};

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/nodes/YAMLSeq.js
var YAMLSeq = class extends Collection {
  static get tagName() {
    return "tag:yaml.org,2002:seq";
  }
  constructor(schema4) {
    super(SEQ, schema4);
    this.items = [];
  }
  add(value) {
    this.items.push(value);
  }
  /**
   * Removes a value from the collection.
   *
   * `key` must contain a representation of an integer for this to succeed.
   * It may be wrapped in a `Scalar`.
   *
   * @returns `true` if the item was found and removed.
   */
  delete(key) {
    const idx = asItemIndex(key);
    if (typeof idx !== "number")
      return false;
    const del = this.items.splice(idx, 1);
    return del.length > 0;
  }
  get(key, keepScalar) {
    const idx = asItemIndex(key);
    if (typeof idx !== "number")
      return void 0;
    const it = this.items[idx];
    return !keepScalar && isScalar(it) ? it.value : it;
  }
  /**
   * Checks if the collection includes a value with the key `key`.
   *
   * `key` must contain a representation of an integer for this to succeed.
   * It may be wrapped in a `Scalar`.
   */
  has(key) {
    const idx = asItemIndex(key);
    return typeof idx === "number" && idx < this.items.length;
  }
  /**
   * Sets a value in this collection. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   *
   * If `key` does not contain a representation of an integer, this will throw.
   * It may be wrapped in a `Scalar`.
   */
  set(key, value) {
    const idx = asItemIndex(key);
    if (typeof idx !== "number")
      throw new Error(`Expected a valid index, not ${key}.`);
    const prev = this.items[idx];
    if (isScalar(prev) && isScalarValue(value))
      prev.value = value;
    else
      this.items[idx] = value;
  }
  toJSON(_, ctx) {
    const seq2 = [];
    if (ctx?.onCreate)
      ctx.onCreate(seq2);
    let i = 0;
    for (const item of this.items)
      seq2.push(toJS(item, String(i++), ctx));
    return seq2;
  }
  toString(ctx, onComment, onChompKeep) {
    if (!ctx)
      return JSON.stringify(this);
    return stringifyCollection(this, ctx, {
      blockItemPrefix: "- ",
      flowChars: { start: "[", end: "]" },
      itemIndent: (ctx.indent || "") + "  ",
      onChompKeep,
      onComment
    });
  }
  static from(schema4, obj, ctx) {
    const { replacer } = ctx;
    const seq2 = new this(schema4);
    if (obj && Symbol.iterator in Object(obj)) {
      let i = 0;
      for (let it of obj) {
        if (typeof replacer === "function") {
          const key = obj instanceof Set ? it : String(i++);
          it = replacer.call(obj, key, it);
        }
        seq2.items.push(createNode(it, void 0, ctx));
      }
    }
    return seq2;
  }
};
function asItemIndex(key) {
  let idx = isScalar(key) ? key.value : key;
  if (idx && typeof idx === "string")
    idx = Number(idx);
  return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/common/seq.js
var seq = {
  collection: "seq",
  default: true,
  nodeClass: YAMLSeq,
  tag: "tag:yaml.org,2002:seq",
  resolve(seq2, onError) {
    if (!isSeq(seq2))
      onError("Expected a sequence for this tag");
    return seq2;
  },
  createNode: (schema4, obj, ctx) => YAMLSeq.from(schema4, obj, ctx)
};

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/json/schema.js
function intIdentify(value) {
  return typeof value === "bigint" || Number.isInteger(value);
}
var stringifyJSON = ({ value }) => JSON.stringify(value);
var jsonScalars = [
  {
    identify: (value) => typeof value === "string",
    default: true,
    tag: "tag:yaml.org,2002:str",
    resolve: (str) => str,
    stringify: stringifyJSON
  },
  {
    identify: (value) => value == null,
    createNode: () => new Scalar(null),
    default: true,
    tag: "tag:yaml.org,2002:null",
    test: /^null$/,
    resolve: () => null,
    stringify: stringifyJSON
  },
  {
    identify: (value) => typeof value === "boolean",
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^true$|^false$/,
    resolve: (str) => str === "true",
    stringify: stringifyJSON
  },
  {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^-?(?:0|[1-9][0-9]*)$/,
    resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
    stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
  },
  {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
    resolve: (str) => parseFloat(str),
    stringify: stringifyJSON
  }
];
var jsonError = {
  default: true,
  tag: "",
  test: /^/,
  resolve(str, onError) {
    onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
    return str;
  }
};
var schema = [map, seq].concat(jsonScalars, jsonError);

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/yaml-1.1/pairs.js
function createPairs(schema4, iterable, ctx) {
  const { replacer } = ctx;
  const pairs2 = new YAMLSeq(schema4);
  pairs2.tag = "tag:yaml.org,2002:pairs";
  let i = 0;
  if (iterable && Symbol.iterator in Object(iterable))
    for (let it of iterable) {
      if (typeof replacer === "function")
        it = replacer.call(iterable, String(i++), it);
      let key, value;
      if (Array.isArray(it)) {
        if (it.length === 2) {
          key = it[0];
          value = it[1];
        } else
          throw new TypeError(`Expected [key, value] tuple: ${it}`);
      } else if (it && it instanceof Object) {
        const keys = Object.keys(it);
        if (keys.length === 1) {
          key = keys[0];
          value = it[key];
        } else {
          throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
        }
      } else {
        key = it;
      }
      pairs2.items.push(createPair(key, value, ctx));
    }
  return pairs2;
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/yaml-1.1/omap.js
var YAMLOMap = class _YAMLOMap extends YAMLSeq {
  constructor() {
    super();
    this.add = YAMLMap.prototype.add.bind(this);
    this.delete = YAMLMap.prototype.delete.bind(this);
    this.get = YAMLMap.prototype.get.bind(this);
    this.has = YAMLMap.prototype.has.bind(this);
    this.set = YAMLMap.prototype.set.bind(this);
    this.tag = _YAMLOMap.tag;
  }
  /**
   * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
   * but TypeScript won't allow widening the signature of a child method.
   */
  toJSON(_, ctx) {
    if (!ctx)
      return super.toJSON(_);
    const map2 = /* @__PURE__ */ new Map();
    if (ctx?.onCreate)
      ctx.onCreate(map2);
    for (const pair of this.items) {
      let key, value;
      if (isPair(pair)) {
        key = toJS(pair.key, "", ctx);
        value = toJS(pair.value, key, ctx);
      } else {
        key = toJS(pair, "", ctx);
      }
      if (map2.has(key))
        throw new Error("Ordered maps must not include duplicate keys");
      map2.set(key, value);
    }
    return map2;
  }
  static from(schema4, iterable, ctx) {
    const pairs2 = createPairs(schema4, iterable, ctx);
    const omap2 = new this();
    omap2.items = pairs2.items;
    return omap2;
  }
};
YAMLOMap.tag = "tag:yaml.org,2002:omap";

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/yaml-1.1/set.js
var YAMLSet = class _YAMLSet extends YAMLMap {
  constructor(schema4) {
    super(schema4);
    this.tag = _YAMLSet.tag;
  }
  add(key) {
    let pair;
    if (isPair(key))
      pair = key;
    else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
      pair = new Pair(key.key, null);
    else
      pair = new Pair(key, null);
    const prev = findPair(this.items, pair.key);
    if (!prev)
      this.items.push(pair);
  }
  /**
   * If `keepPair` is `true`, returns the Pair matching `key`.
   * Otherwise, returns the value of that Pair's key.
   */
  get(key, keepPair) {
    const pair = findPair(this.items, key);
    return !keepPair && isPair(pair) ? isScalar(pair.key) ? pair.key.value : pair.key : pair;
  }
  set(key, value) {
    if (typeof value !== "boolean")
      throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
    const prev = findPair(this.items, key);
    if (prev && !value) {
      this.items.splice(this.items.indexOf(prev), 1);
    } else if (!prev && value) {
      this.items.push(new Pair(key));
    }
  }
  toJSON(_, ctx) {
    return super.toJSON(_, ctx, Set);
  }
  toString(ctx, onComment, onChompKeep) {
    if (!ctx)
      return JSON.stringify(this);
    if (this.hasAllNullValues(true))
      return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
    else
      throw new Error("Set items must all have null values");
  }
  static from(schema4, iterable, ctx) {
    const { replacer } = ctx;
    const set2 = new this(schema4);
    if (iterable && Symbol.iterator in Object(iterable))
      for (let value of iterable) {
        if (typeof replacer === "function")
          value = replacer.call(iterable, value, value);
        set2.items.push(createPair(value, null, ctx));
      }
    return set2;
  }
};
YAMLSet.tag = "tag:yaml.org,2002:set";

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/schema/yaml-1.1/timestamp.js
function parseSexagesimal(str, asBigInt) {
  const sign = str[0];
  const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
  const num = (n) => asBigInt ? BigInt(n) : Number(n);
  const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
  return sign === "-" ? num(-1) * res : res;
}
var timestamp = {
  identify: (value) => value instanceof Date,
  default: true,
  tag: "tag:yaml.org,2002:timestamp",
  // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
  // may be omitted altogether, resulting in a date format. In such a case, the time part is
  // assumed to be 00:00:00Z (start of day, UTC).
  test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
  resolve(str) {
    const match = str.match(timestamp.test);
    if (!match)
      throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
    const [, year, month, day, hour, minute, second] = match.map(Number);
    const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
    let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
    const tz = match[8];
    if (tz && tz !== "Z") {
      let d = parseSexagesimal(tz, false);
      if (Math.abs(d) < 30)
        d *= 60;
      date -= 6e4 * d;
    }
    return new Date(date);
  },
  stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
};

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/parse/cst-visit.js
var BREAK2 = Symbol("break visit");
var SKIP2 = Symbol("skip children");
var REMOVE2 = Symbol("remove item");
function visit2(cst, visitor) {
  if ("type" in cst && cst.type === "document")
    cst = { start: cst.start, value: cst.value };
  _visit(Object.freeze([]), cst, visitor);
}
visit2.BREAK = BREAK2;
visit2.SKIP = SKIP2;
visit2.REMOVE = REMOVE2;
visit2.itemAtPath = (cst, path) => {
  let item = cst;
  for (const [field2, index] of path) {
    const tok = item?.[field2];
    if (tok && "items" in tok) {
      item = tok.items[index];
    } else
      return void 0;
  }
  return item;
};
visit2.parentCollection = (cst, path) => {
  const parent = visit2.itemAtPath(cst, path.slice(0, -1));
  const field2 = path[path.length - 1][0];
  const coll = parent?.[field2];
  if (coll && "items" in coll)
    return coll;
  throw new Error("Parent collection not found");
};
function _visit(path, item, visitor) {
  let ctrl = visitor(item, path);
  if (typeof ctrl === "symbol")
    return ctrl;
  for (const field2 of ["key", "value"]) {
    const token2 = item[field2];
    if (token2 && "items" in token2) {
      for (let i = 0; i < token2.items.length; ++i) {
        const ci = _visit(Object.freeze(path.concat([[field2, i]])), token2.items[i], visitor);
        if (typeof ci === "number")
          i = ci - 1;
        else if (ci === BREAK2)
          return BREAK2;
        else if (ci === REMOVE2) {
          token2.items.splice(i, 1);
          i -= 1;
        }
      }
      if (typeof ctrl === "function" && field2 === "key")
        ctrl = ctrl(item, path);
    }
  }
  return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
}

// ../../node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/browser/dist/parse/lexer.js
var hexDigits = new Set("0123456789ABCDEFabcdef");
var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
var flowIndicatorChars = new Set(",[]{}");
var invalidAnchorChars = new Set(" ,[]{}\n\r	");

// ../core/src/registry.js
var import_valid = __toESM(require_valid(), 1);
var import_satisfies = __toESM(require_satisfies(), 1);
var npmName = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
var version = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:(?:0|[1-9]\d*|\d*[A-Za-z-][A-Za-z0-9-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][A-Za-z0-9-]*))*))?(?:\+[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*)?$/;
var decoder = new TextDecoder();
function exactNpm(id, value) {
  return typeof id === "string" && npmName.test(id) && typeof value === "string" && version.test(value);
}
function registryUrl(raw) {
  if (typeof raw !== "string" || !raw || raw !== raw.trim()) {
    throw new Error("registry \u5FC5\u987B\u662F HTTP(S) \u5730\u5740");
  }
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || raw.includes("?") || raw.includes("#") || /[\\\s]/.test(raw)) {
    throw new Error("registry \u5FC5\u987B\u662F\u65E0\u51ED\u636E\u3001\u67E5\u8BE2\u53C2\u6570\u6216\u7247\u6BB5\u7684 HTTP(S) \u5730\u5740");
  }
  return url.href.replace(/\/?$/, "/");
}

// ../core/src/plugin-metadata.js
var object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
var assetPrefix = "assets/plugins/";
var maxIconBytes = 256 * 1024;
var safeRelative = (s) => typeof s === "string" && s.length > 0 && s.split("/").every(
  (p) => p !== "" && p !== "." && p !== ".." && !/[\x00-\x1f\\:#?%<>|*"]|[. ]$/.test(p) && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)
);
function remoteIcon(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
function isPluginAsset(raw) {
  return safeRelative(raw) && raw.startsWith(assetPrefix) && /\.(svg|png|jpe?g|webp)$/i.test(raw);
}
function validatePluginMetadata(unit) {
  if (unit?.plugins === void 0) {
    return [];
  }
  if (!object(unit.plugins)) {
    return ["plugins \u5FC5\u987B\u662F\u5BF9\u8C61"];
  }
  const errors = [];
  for (const [id, item] of Object.entries(unit.plugins)) {
    const label = "plugins[" + id + "]";
    if (!id || !unit.bundles?.includes?.(id) && !Object.hasOwn(unit.dependencies || {}, id)) {
      errors.push(label + " \u5FC5\u987B\u5BF9\u5E94\u672C profile \u7684 bundle \u6216\u4F9D\u8D56");
    }
    if (!object(item)) {
      errors.push(label + " \u5FC5\u987B\u662F\u5BF9\u8C61");
      continue;
    }
    for (const field2 of ["name", "desc"]) {
      if (item[field2] !== void 0 && !isLocaleString(item[field2])) {
        errors.push(label + "." + field2 + " \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6216\u591A\u8BED\u8A00\u5BF9\u8C61");
      }
    }
    if (item.icon !== void 0 && (typeof item.icon !== "string" || !(isPluginAsset(item.icon) || remoteIcon(item.icon)))) {
      errors.push(label + ".icon \u5FC5\u987B\u4E3A HTTPS \u5730\u5740\u6216 assets/plugins/ \u4E0B\u7684\u56FE\u6807\u8DEF\u5F84");
    }
    if (item.source !== void 0) {
      try {
        if (!object(item.source) || item.source.type !== "npm" || !exactNpm(id, unit.dependencies?.[id])) {
          throw new Error("\u5FC5\u987B\u5173\u8054\u5F53\u524D profile \u7684\u7CBE\u786E npm \u7248\u672C");
        }
        if (Object.keys(item.source).some((key) => !["type", "registry"].includes(key))) {
          throw new Error("\u53EA\u5141\u8BB8 type \u548C registry");
        }
        registryUrl(item.source.registry);
      } catch (error) {
        errors.push(label + ".source " + error.message);
      }
    }
  }
  return errors;
}
function validatePluginAssets(manifest, entries) {
  const units = manifest.type === "dshhome" ? Object.values(manifest.profiles || {}) : [manifest];
  for (const unit of units) {
    for (const [id, item] of Object.entries(unit?.plugins || {})) {
      const icon = item?.icon;
      if (typeof icon === "string" && !remoteIcon(icon)) {
        if (!isPluginAsset(icon) || !Object.hasOwn(entries, icon) || !entries[icon]?.length || entries[icon].length > maxIconBytes) {
          throw new Error(id + " \u7684\u5F52\u6863\u56FE\u6807\u7F3A\u5931\u3001\u8DEF\u5F84\u65E0\u6548\u6216\u8D85\u8FC7 256 KiB");
        }
      }
    }
  }
  for (const id of Object.keys(manifest.vendored || {})) {
    const users = units.filter((unit) => Object.hasOwn(unit?.dependencies || {}, id));
    if (!users.some((unit) => unit.plugins?.[id]?.source)) {
      continue;
    }
    const pins = new Set(users.map((unit) => {
      const source = unit.plugins?.[id]?.source;
      return unit.dependencies[id] + " " + (source ? registryUrl(source.registry) : "");
    }));
    if (pins.size > 1) {
      throw new Error(id + " \u7684\u5171\u4EAB\u5185\u5D4C\u526F\u672C\u4E0E\u5404 profile \u7684\u6765\u6E90\u6216\u7248\u672C\u4E0D\u4E00\u81F4");
    }
  }
}

// ../core/src/manifest.js
function validateManifest(m) {
  const errors = [];
  if (!m || typeof m !== "object" || Array.isArray(m)) return ["manifest.json \u7F3A\u5931\u6216\u4E0D\u662F\u5BF9\u8C61"];
  if (![4, 5, 6].includes(m.manifestVersion)) {
    if (m.manifestVersion === 3 || m.manifestVersion === 2) {
      errors.push(`manifestVersion \u4E3A ${m.manifestVersion}\uFF08\u65E7\u7248 .tgz \u683C\u5F0F\uFF09\uFF0C\u672C\u5DE5\u5177\u4EC5\u5B89\u88C5 v4/v5/v6(.dspack) \u6574\u5408\u5305`);
    } else {
      errors.push("manifestVersion \u5FC5\u987B\u4E3A 4\u30015 \u6216 6");
    }
  }
  if (typeof m.name !== "string" || !m.name.trim()) errors.push("manifest.name \u7F3A\u5931\u6216\u4E3A\u7A7A");
  if (typeof m.version !== "string" || !m.version.trim()) errors.push("manifest.version \u7F3A\u5931\u6216\u4E3A\u7A7A");
  if (m.patch !== void 0 && typeof m.patch !== "string") errors.push("manifest.patch \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
  if (m.dshVersion !== void 0 && typeof m.dshVersion !== "string") errors.push("manifest.dshVersion \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
  for (const f of ["displayName", "description"]) {
    if (m[f] !== void 0 && !isLocaleString(m[f])) errors.push(`manifest.${f} \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6216\u591A\u8BED\u8A00\u5BF9\u8C61`);
  }
  if (m.manifestVersion === 6) {
    for (const key of ["name", "version"]) {
      if (typeof m[key] === "string" && (/[\\/:*?"<>|\x00-\x1f]|[. ]$/u.test(m[key]) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(m[key]))) {
        errors.push("manifest." + key + " \u5305\u542B\u4E0D\u80FD\u7528\u4E8E\u53D1\u5E03\u6587\u4EF6\u540D\u7684\u5B57\u7B26");
      }
    }
    if (m.type === "dshhome") {
      if (m.plugins !== void 0) {
        errors.push("dshhome \u7684 plugins \u5FC5\u987B\u4F4D\u4E8E\u5BF9\u5E94\u7684 profiles \u6761\u76EE\u5185");
      }
      for (const [id, unit] of Object.entries(m.profiles || {})) {
        for (const error of validatePluginMetadata(unit)) {
          errors.push("profiles[" + id + "]." + error);
        }
      }
    } else {
      errors.push(...validatePluginMetadata(m));
    }
  }
  if (m.manifestVersion === 5 || m.manifestVersion === 6) {
    if (m.type === "dshhome") errors.push(...validateDshHome(m));
    else if (m.manifestVersion === 5 && m.type === void 0 || m.type === "profile") errors.push(...validateProfile(m));
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
    for (const reserved2 of ["web", "headless"]) {
      if (names.includes(reserved2)) errors.push(`profiles \u4E0D\u5F97\u542B\u5B89\u88C5\u57FA\u7EBF\u6A21\u677F\u300C${reserved2}\u300D`);
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

// ../core/src/extension-files.js
var invalidSegment = /[\\:\x00-\x1f<>|?*"]|[. ]$/;
var reserved = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
var forbidden = /* @__PURE__ */ new Set([".git", ".dsh-pack", "node_modules", ".credentials.yaml", "settings.yaml"]);
function relativePath(path) {
  if (typeof path !== "string" || !path || path.length > 1024) throw new Error("\u6269\u5C55\u8D44\u6E90\u8DEF\u5F84\u65E0\u6548");
  for (const part of path.split("/")) {
    if (!part || part === "." || part === ".." || invalidSegment.test(part) || reserved.test(part) || forbidden.has(part.toLowerCase()) || isExcluded(part.toLowerCase())) {
      throw new Error("\u6269\u5C55\u8D44\u6E90\u5305\u542B\u7981\u6B62\u7684\u8DEF\u5F84\u7247\u6BB5");
    }
  }
  return path;
}
function segment(id) {
  if (relativePath(id).includes("/")) throw new Error("\u6269\u5C55\u8D44\u6E90\u6807\u8BC6\u4E0D\u80FD\u5305\u542B\u8DEF\u5F84\u5206\u9694\u7B26");
  return id;
}
function localized(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (!value || Array.isArray(value) || typeof value !== "object" || !Object.entries(value).every(
    ([key, text]) => /^[a-zA-Z0-9_-]+$/.test(key) && typeof text === "string"
  )) throw new Error("\u540D\u79F0\u548C\u63CF\u8FF0\u5FC5\u987B\u662F\u6587\u672C\u6216\u8BED\u8A00\u6620\u5C04");
  return value;
}
function expandTemplate(template, profile) {
  if (typeof template !== "string") throw new Error("paths \u9700\u8981\u5B57\u7B26\u4E32\u8DEF\u5F84");
  let path = template.replace(/^\.\//, "");
  if (path.startsWith("<profile>/")) path = "profiles/" + path;
  if (path.includes("<profile>")) {
    segment(profile);
    path = path.split("/").map((part) => part === "<profile>" ? profile : part).join("/");
  }
  return relativePath(path.replace(/\/$/, ""));
}
function protectedTarget(rel) {
  const lower = rel.toLowerCase();
  const parts = lower.split("/");
  const rootEntry = parts[0] === "profiles" ? parts[2] : parts[0];
  return ["cordis.patch.yml", "package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"].includes(rootEntry) || parts.includes(".dsh-skill.json") || parts[0] === "attachments" || parts[0] === "skills" || parts[0] === ".agent-presets" || ["provider.json", "mcp.json", "path.json", "skill.json", "plugins.json"].includes(lower);
}

// ../core/src/extension-skills.js
var sha = /^(?:[a-f\d]{40}|[a-f\d]{64})$/i;
function repository(value) {
  const raw = String(value ?? "");
  const [address, fragment = ""] = raw.split("#");
  let url;
  if (/^git@[A-Za-z0-9.-]+:[A-Za-z0-9._/-]+$/.test(address)) url = address;
  else {
    let parsed;
    try {
      parsed = new URL(address);
    } catch {
      throw new Error("\u6280\u80FD\u4ED3\u5E93\u5730\u5740\u65E0\u6548");
    }
    if (!["https:", "ssh:"].includes(parsed.protocol) || parsed.password || parsed.search || parsed.protocol === "https:" && parsed.username) throw new Error("\u6280\u80FD\u4ED3\u5E93\u987B\u4F7F\u7528\u65E0\u5185\u5D4C\u51ED\u636E\u7684 HTTPS \u6216 SSH \u5730\u5740");
    url = parsed.href;
  }
  const subdir = fragment.replace(/^\/|\/$/g, "");
  if (subdir) relativePath(subdir);
  return { repository: url, subdir };
}
function checkSkillSource(source) {
  const parsed = repository(source.repository);
  const subdir = source.subdir || parsed.subdir;
  if (subdir) relativePath(subdir);
  const ref = source.ref || (source.mode === "fixed" ? source.commit : "HEAD");
  if (source.mode === "fixed") {
    if (!sha.test(ref)) throw new Error("\u56FA\u5B9A\u6280\u80FD\u8981\u6C42\u5B8C\u6574\u7684 Git commit SHA");
  } else if (source.mode !== "track" || typeof ref !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(ref) || /(?:\.\.|\/\/|\/\.|\.lock$|[/.]$)/.test(ref)) {
    throw new Error("\u8DDF\u8E2A\u6280\u80FD\u9700\u8981\u6709\u6548\u7684\u5206\u652F\u540D\u6216\u6807\u7B7E");
  }
  return { mode: source.mode, repository: parsed.repository, subdir, ref };
}

// ../core/src/mcp-transport.js
var secretKey = /api[-_.]?key|secret|pass(?:word|wd)?|token|credential|auth(?:orization)?|cookie|signature|private[-_.]?key|^(?:sig|key|pwd|user|u)$/i;
var token = /(?:\b(?:Bearer|Basic)\s+|\bsk-[\w-]{8,}|\bgh[pousr]_|-----BEGIN .*PRIVATE KEY)/i;
var reference = /^\$\{credential:([A-Za-z_][A-Za-z_0-9]*)\}$/;
var flag = /^(--?[A-Za-z][\w.-]*=)([\s\S]*)$/;
var envAssignment = /^([A-Za-z_][\w]*=)([\s\S]*)$/;
var header = /^([A-Za-z][A-Za-z0-9-]*:[ \t]*)([\s\S]*)$/;
var headerFlag = /^(?:-H|--header|--headers)$/i;
var urlStart = /^[A-Za-z][\w+.-]*:\/\//;
var unsupported = () => {
  throw new Error("MCP \u4F20\u8F93\u5B57\u6BB5\u542B\u65E0\u6CD5\u5B89\u5168\u79FB\u690D\u7684\u811A\u672C\u3001\u53C2\u6570\u6216\u5730\u5740");
};
var optionName = (key) => key.replace(/^-+|=$/g, "");
function checkUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    unsupported();
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash || /\$\{|[\s\\]/.test(value)) unsupported();
  if ([...url.searchParams].some(([k, v]) => !(/^(?:v|version|page|limit|offset)$/i.test(k) && /^[\d.]{1,16}$/.test(v) || /^(?:lang|locale|format)$/i.test(k) && /^[a-z]{2,8}(?:[-_][a-z]{2,8})?$/i.test(v)))) unsupported();
  let path;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    unsupported();
  }
  if (token.test(path) || /\b(?:hooks?|webhooks?|services)\/.{12,}|[\w-]{28,}/i.test(path)) unsupported();
}
function shellSnippet(command, args) {
  const words = [command, ...args];
  for (let i = 0; i < words.length; i++) {
    if (typeof words[i] !== "string") continue;
    const executable = words[i].split(/[\\/]/).at(-1).toLowerCase().replace(/\.(?:exe|cmd|bat)$/, "");
    const rest = words.slice(i + 1).filter((s) => typeof s === "string");
    if (/^(?:sh|bash|dash|zsh|ksh|fish|ash|cmd|pwsh|powershell)$/.test(executable) && rest.some((s) => /^(?:-[a-z]*c[a-z]*|\/[ck]|-command(?:withargs)?|-e(?:nc(?:oded(?:command|arguments))?)?)$/i.test(s))) return true;
    if (/^(?:node|deno|bun|python[\d.]*|ruby|perl|php)$/.test(executable) && rest.some((s) => /^(?:-[cep]|--eval(?:=|$)|--print(?:=|$)|eval$)/i.test(s))) return true;
  }
  return false;
}
function readPrefix(prefix) {
  let rest = prefix;
  const assigned = flag.exec(rest) || envAssignment.exec(rest);
  if (assigned) {
    if (!secretKey.test(optionName(assigned[1])) && !headerFlag.test(assigned[1].slice(0, -1))) return false;
    rest = assigned[2];
  } else if (rest.startsWith("-H")) rest = rest.slice(2);
  const pair = header.exec(rest);
  if (pair) rest = pair[2];
  return rest === "" || /^(Bearer|Basic) $/i.test(rest);
}
function validMcpArgumentPrefix(prefix) {
  return typeof prefix === "string" && prefix.length <= 160 && !/[\r\n]/.test(prefix) && readPrefix(prefix);
}
function maskArg(arg, previous, ref, refs, archived) {
  if (archived && arg && typeof arg === "object" && !Array.isArray(arg) && arg.$credential) {
    if (arg.prefix !== void 0 && !validMcpArgumentPrefix(arg.prefix)) unsupported();
    return arg;
  }
  if (typeof arg !== "string" || /[\0\r\n]/.test(arg)) unsupported();
  const inline = flag.exec(arg) || envAssignment.exec(arg);
  const attachedHeader = !inline && /^-H[A-Za-z][A-Za-z0-9-]*:/.test(arg);
  let prefix = inline?.[1] || (attachedHeader ? "-H" : "");
  let value = inline?.[2] ?? (attachedHeader ? arg.slice(2) : arg);
  const takesSecret = (name2) => name2.startsWith("-") && !name2.includes("=") && secretKey.test(optionName(name2));
  const previousName = typeof previous === "string" ? previous : "";
  const isHeader = attachedHeader || headerFlag.test(inline ? inline[1].slice(0, -1) : previousName);
  const pair = header.exec(value);
  let hide = !!inline && secretKey.test(optionName(inline[1])) || !inline && takesSecret(previousName);
  if (isHeader || pair && secretKey.test(pair[1].split(":")[0])) {
    if (!pair) unsupported();
    prefix += pair[1];
    value = pair[2];
    hide = true;
  }
  if (urlStart.test(value)) checkUrl(value);
  if (/^(?:Bearer|Basic)\s/i.test(value)) {
    const scheme = /^(?:Bearer|Basic) /i.exec(value);
    if (!scheme) unsupported();
    prefix += scheme[0];
    value = value.slice(scheme[0].length);
    hide = true;
  }
  const native = reference.exec(value);
  if (hide || native || token.test(value)) {
    if (archived || !validMcpArgumentPrefix(prefix)) unsupported();
    const key = native?.[1] || ref;
    refs.add(key);
    return prefix ? { $credential: key, prefix } : { $credential: key };
  }
  if (/\$\{|[;&|]\s*(?:\w|\$)|(?:https?|ssh|postgres(?:ql)?):\/\//i.test(value) && !urlStart.test(value) || /(?:^|\s)--?[\w.-]*(?:key|pass|token|secret|auth|cookie)[\w.-]*(?:=|\s)/i.test(value)) unsupported();
  return arg;
}
function portableMcpTransport(config, id, refs, archived = false) {
  if (!config || Array.isArray(config) || typeof config !== "object") unsupported();
  const result = { ...config };
  if (config.oauth !== void 0 && (config.transport !== "streamable-http" || !/^mcp-client\/[a-z][a-z0-9-]*$/.test(config.oauth?.credentialKey))) unsupported();
  if (config.enabled !== void 0 && typeof config.enabled !== "boolean") unsupported();
  if (config.url !== void 0) {
    if (typeof config.url !== "string") unsupported();
    checkUrl(config.url);
  }
  if (config.command !== void 0 && (typeof config.command !== "string" || /[;&|\r\n]|\$\{|\s--?[\w-]+(?:\s|=|$)/.test(config.command))) unsupported();
  if (config.args !== void 0) {
    if (!Array.isArray(config.args) || shellSnippet(config.command || "", config.args)) unsupported();
    result.args = config.args.map((arg, index) => maskArg(arg, config.args[index - 1], id + "_ARG_" + index, refs, archived));
  }
  return result;
}

// ../core/src/extension-patch.js
var refPattern = /^[A-Za-z_][A-Za-z_0-9]*$/;
function malformedKey(key) {
  return ["__proto__", "constructor", "prototype"].includes(key);
}
function credentialRefs(item) {
  const refs = /* @__PURE__ */ new Set();
  function walk(value, path = []) {
    if (!value || typeof value !== "object") return;
    if (Object.hasOwn(value, "$credential")) {
      const arg = item.kind === "mcp" && path.length === 3 && path[0] === "config" && path[1] === "args";
      if (!refPattern.test(value.$credential) || Object.keys(value).some((k) => !["$credential", "prefix"].includes(k)) || value.prefix != null && !(arg ? validMcpArgumentPrefix(value.prefix) : /^(Bearer |Basic )$/i.test(value.prefix))) throw new Error("\u51ED\u636E\u5360\u4F4D\u683C\u5F0F\u65E0\u6548");
      refs.add(value.$credential);
    } else for (const [key, v] of Object.entries(value)) {
      if (malformedKey(key)) throw new Error("\u914D\u7F6E\u5305\u542B\u4FDD\u7559\u5B57\u6BB5");
      walk(v, [...path, key]);
    }
  }
  walk(item.value);
  if (item.kind === "provider" && item.value?.apiKeyEnv != null) {
    if (!refPattern.test(item.value?.apiKeyEnv)) throw new Error("Provider \u7F3A\u5C11\u6709\u6548\u51ED\u636E\u5F15\u7528");
    refs.add(item.value.apiKeyEnv);
  }
  return [...refs];
}

// ../core/src/extension-validate.js
var decoder2 = new TextDecoder("utf-8", { fatal: true });
var sha256 = /^[a-f0-9]{64}$/;
var sha2 = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
var fileKinds = { "path.json": "path", "provider.json": "provider", "mcp.json": "mcp", "skill.json": "skill" };
var own = (v, k) => Object.hasOwn(v ?? {}, k);
function validatedItems(manifest, entries) {
  const items = [], keys = /* @__PURE__ */ new Set(), blobs = /* @__PURE__ */ new Set(), targets = /* @__PURE__ */ new Set(), emptyDirectories = /* @__PURE__ */ new Set();
  const check = (ok, context) => {
    if (!ok) throw new Error("\u6269\u5C55\u8D44\u6E90\u683C\u5F0F\u65E0\u6548\uFF1A" + context);
  };
  function blob(file, kind) {
    check(sha256.test(file?.sha256) && file.entry === "extension-data/" + kind + "/" + file.sha256 && own(entries, file.entry) && entries[file.entry] instanceof Uint8Array, "\u6587\u4EF6\u5F15\u7528");
    blobs.add(file.entry);
  }
  function register(item, kind, plugin) {
    check(item?.kind === kind && typeof item.key === "string" && !keys.has(item.key), "\u8D44\u6E90\u7C7B\u578B\u6216\u91CD\u590D\u6807\u8BC6");
    check(typeof item.id === "string" && item.id.length > 0 && !["__proto__", "prototype", "constructor"].includes(item.id), "id");
    check(typeof item.scope === "string" && (item.scope === "home" || item.scope.startsWith("profile:")), "scope");
    const profile = item.scope === "home" ? manifest.profileName : segment(item.scope.slice(8));
    if (manifest.type === "dshhome" && item.scope !== "home") check(own(manifest.profiles, profile), "\u672A\u77E5 profile");
    check(item.name != null && localized(item.name) != null, "name");
    localized(item.desc, "");
    keys.add(item.key);
    if (kind === "path") {
      check(typeof plugin === "string" && /^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/i.test(plugin) && item.plugin === plugin && item.key === [kind, item.scope, plugin, item.id].join(":"), "plugin");
      check(Array.isArray(item.paths) && item.paths.length && Array.isArray(item.files), "paths/files");
      check(item.directories === void 0 || Array.isArray(item.directories), "directories");
      const roots = item.paths.map((p) => expandTemplate(p, profile));
      for (const root of roots) check(!protectedTarget(root), "\u8DEF\u5F84\u5360\u7528\u7CFB\u7EDF\u914D\u7F6E");
      const directories = item.directories ?? [];
      const fileTargets = new Set(item.files);
      for (const f of [...item.files, ...directories]) {
        check(Number.isInteger(f?.index) && own(roots, f.index) && typeof f.tail === "string", "\u8DEF\u5F84\u89C4\u5219\u7F16\u53F7");
        if (f.tail) relativePath(f.tail);
        const target = roots[f.index] + (f.tail ? "/" + f.tail : "");
        check(f.path === target && !protectedTarget(target) && !targets.has(target.toLowerCase()), "\u63D2\u4EF6\u6587\u4EF6\u76EE\u6807");
        targets.add(target.toLowerCase());
        if (fileTargets.has(f)) blob(f, "path");
        else {
          check(Object.keys(f).every((k) => ["index", "tail", "path"].includes(k)), "\u7A7A\u76EE\u5F55\u8BB0\u5F55");
          emptyDirectories.add(target.toLowerCase());
        }
      }
    } else {
      check(item.key === kind + ":" + item.scope + ":" + item.id, "key");
      if (kind === "skill") {
        segment(item.id);
        check((item.scope === "home" || manifest.type === "dshhome") && sha256.test(item.digest), "\u6280\u80FD\u4F5C\u7528\u57DF\u4E0E\u6458\u8981");
        if (item.mode === "embedded") {
          check(Array.isArray(item.files) && item.files.length, "\u6280\u80FD\u6587\u4EF6\u6E05\u5355");
          const paths = /* @__PURE__ */ new Set();
          for (const f of item.files) {
            const p = relativePath(f.path).toLowerCase();
            check(!paths.has(p) && p !== ".dsh-skill.json", "\u6280\u80FD\u6587\u4EF6\u91CD\u590D");
            paths.add(p);
            blob(f, "skill");
          }
          check(item.flat ? item.files.length === 1 && item.files[0].path === item.id : paths.has("skill.md"), "\u6280\u80FD\u5165\u53E3");
        } else {
          checkSkillSource(item);
          check(!item.flat && item.files == null && sha2.test(item.commit) && (item.mode !== "fixed" || item.commit === item.ref), "\u8FDC\u7A0B\u6280\u80FD\u6765\u6E90");
        }
      } else {
        check(item.value && typeof item.value === "object" && !Array.isArray(item.value), "\u914D\u7F6E\u5BF9\u8C61");
        if (kind === "mcp") {
          const config = item.value.config;
          check(item.value.name === "@deepseek-ai/dsh-mcp-client" && item.value.id === item.id && typeof config?.serverName === "string" && /^[a-z0-9_-]{1,32}$/i.test(config.serverName), "MCP \u6807\u8BC6");
          check(["stdio", "streamable-http"].includes(config.transport || "stdio"), "MCP transport");
          portableMcpTransport(config, "MCP", /* @__PURE__ */ new Set(), true);
          for (const map2 of [config.env, config.headers]) {
            if (map2 == null) continue;
            check(typeof map2 === "object" && !Array.isArray(map2), "MCP \u53D8\u91CF\u8868");
            for (const v of Object.values(map2)) check(v === "" || v?.$credential || typeof v === "string" && /^\$\{credential:[A-Za-z_][A-Za-z0-9_]*\}$/.test(v), "MCP \u5B57\u6BB5\u542B\u672A\u8131\u654F\u503C");
          }
        }
        const refs = credentialRefs(item);
        check(Array.isArray(item.credentialRefs) && refs.length === item.credentialRefs.length && refs.every((r) => item.credentialRefs.includes(r)), "\u51ED\u636E\u5F15\u7528\u6E05\u5355");
      }
    }
    items.push(item);
  }
  for (const [name2, kind] of Object.entries(fileKinds)) {
    if (!own(entries, name2)) continue;
    let data;
    try {
      data = JSON.parse(decoder2.decode(entries[name2]));
    } catch {
      throw new Error("\u6269\u5C55\u6E05\u5355\u65E0\u6CD5\u89E3\u7801\uFF1A" + name2);
    }
    if (kind === "path") {
      check(data?.plugins && typeof data.plugins === "object" && !Array.isArray(data.plugins), name2);
      for (const [plugin, rows] of Object.entries(data.plugins)) {
        check(Array.isArray(rows), name2);
        rows.forEach((item) => register(item, kind, plugin));
      }
    } else {
      check(Array.isArray(data?.items), name2);
      data.items.forEach((item) => register(item, kind));
    }
  }
  for (const path of targets) {
    let parent = path;
    while (parent.includes("/")) {
      parent = parent.slice(0, parent.lastIndexOf("/"));
      check(!targets.has(parent), "\u6587\u4EF6\u6216\u7A7A\u76EE\u5F55\u542B\u6709\u5176\u4ED6\u76EE\u6807");
    }
  }
  for (const path of Object.keys(entries)) {
    if (path.startsWith("extension-data/")) check(blobs.has(path), "\u672A\u88AB\u58F0\u660E\u7684\u6269\u5C55\u6587\u4EF6");
    if (!emptyDirectories.size || path.endsWith("/")) continue;
    let target;
    if (path.startsWith("home/") && manifest.type !== "dshhome") target = path.slice(5);
    if (path.startsWith("overrides/")) target = (manifest.type === "dshhome" ? "" : "profiles/" + manifest.profileName + "/") + path.slice(10);
    if (target) {
      const parts = target.toLowerCase().split("/");
      while (parts.length) {
        check(!emptyDirectories.has(parts.join("/")), "\u7A7A\u76EE\u5F55\u4E0E\u5FEB\u7167\u6587\u4EF6\u91CD\u590D");
        parts.pop();
      }
    }
  }
  return items;
}
function validateExtensions(manifest, entries) {
  validatedItems(manifest, entries);
}

// ../core/src/dspack.js
var encoder = new TextEncoder();
var decoder3 = new TextDecoder();
var DSPACK_FORMAT = "dspack";
var DSPACK_CONTAINER_VERSION = 4;
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
  const marker = parseMarker(entries);
  let manifest;
  if (entries["manifest.json"]) {
    try {
      manifest = JSON.parse(decodeText(entries["manifest.json"]));
    } catch {
      throw new Error("manifest.json \u4E0D\u662F\u6709\u6548 JSON");
    }
  }
  if (marker && (!Number.isInteger(marker.version) || marker.version < 1 || marker.version > DSPACK_CONTAINER_VERSION)) {
    throw new Error("\u4E0D\u652F\u6301\u7684 dspack.json \u5BB9\u5668\u7248\u672C");
  }
  if (manifest?.manifestVersion === 6 !== (marker?.version === 4)) {
    throw new Error("manifest v6 \u5FC5\u987B\u4E0E\u5BB9\u5668 v4 \u914D\u5957");
  }
  if (manifest?.manifestVersion === 6) {
    validatePluginAssets(manifest, entries);
    validateExtensions(manifest, entries);
  }
  return { entries, marker };
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
  return decoder3.decode(u82);
}

// ../core/src/extensions.js
var utf8 = new TextEncoder();

// ../core/src/inspect.js
async function inspectPack(host, source, { includeIcons = false } = {}) {
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
  if (manifest?.manifestVersion === 6) {
    for (const [path, data] of Object.entries(entries)) {
      if (path.startsWith("extension-data/") && await host.sha256(data) !== path.split("/").pop()) {
        validation.push("\u6269\u5C55\u6587\u4EF6 SHA-256 \u4E0D\u7B26\uFF1A" + path);
      }
    }
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
  const icons = /* @__PURE__ */ Object.create(null);
  if (includeIcons && !validation.length && manifest?.manifestVersion === 6) {
    const units = manifest.type === "dshhome" ? Object.values(manifest.profiles || {}) : [manifest];
    for (const unit of units) {
      for (const { icon } of Object.values(unit.plugins || {})) {
        if (icon?.startsWith("assets/plugins/") && entries[icon]) icons[icon] = entries[icon];
      }
    }
  }
  return {
    ...includeIcons ? { icons } : {},
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

// ../core/src/update-config.js
var missing = Symbol("\u7F3A\u5C11\u6210\u5458");
var encoder2 = new TextEncoder();

// ../core/src/update.js
var encoder3 = new TextEncoder();

// ../gui/renderer/v6-dialogs.js
function node(tag, text) {
  const element = document.createElement(tag);
  if (text !== void 0) element.textContent = text;
  return element;
}
function labelOf(value) {
  if (typeof value === "string") return value;
  return value?.[navigator.language] || value?.[navigator.language.split("-")[0]] || Object.values(value || {})[0] || "";
}
function field(parent, caption, value = "", type = "text") {
  const label = node("label", caption + " ");
  label.style.display = "block";
  const input = node("input");
  input.type = type;
  input.value = value;
  if (type === "password") input.autocomplete = "new-password";
  label.append(input);
  parent.append(label);
  return input;
}
function openForm(title, build) {
  return new Promise((resolve) => {
    const dialog = node("dialog");
    dialog.className = "pack-resource-dialog";
    const style = node("style");
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
    const form = node("form");
    form.append(node("h2", title));
    const read = build(form);
    const error = node("p");
    error.role = "alert";
    const ok = node("button", "\u786E\u8BA4");
    const cancel = node("button", "\u53D6\u6D88");
    cancel.type = "button";
    cancel.onclick = () => dialog.close();
    let result = null;
    const buttons = node("div");
    buttons.className = "pack-resource-actions";
    cancel.className = "ghost";
    ok.className = "primary";
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
    dialog.onclose = () => {
      dialog.remove();
      resolve(result);
    };
    dialog.append(form);
    document.body.append(dialog);
    dialog.showModal();
  });
}
function textValue(input) {
  const value = input.value.trim();
  return value.startsWith("{") ? JSON.parse(value) : value;
}
function asInput(value) {
  return typeof value === "object" && value ? JSON.stringify(value) : value || "";
}
function chooseExportResources(candidates, units, current = {}, whole = false) {
  return openForm("\u6574\u5408\u5305\u8D44\u6E90\u4E0E\u63D2\u4EF6", (form) => {
    const fields = [];
    const groups = { paths: "\u63D2\u4EF6\u989D\u5916\u8DEF\u5F84", providers: "\u6A21\u578B\u63D0\u4F9B\u5546", mcp: "MCP \u670D\u52A1\u5668", skills: "\u6280\u80FD" };
    for (const [group, title] of Object.entries(groups)) {
      const list = candidates[group] || [];
      if (!list.length) continue;
      form.append(node("h3", title));
      for (const item of list) {
        const saved = current.selection?.[group]?.find((entry) => (entry.key || entry) === item.key);
        const box = field(form, [labelOf(item.name) || item.id, item.scope].filter(Boolean).join(" \xB7 "), "", "checkbox");
        box.checked = Boolean(saved);
        if (item.desc) form.append(node("small", labelOf(item.desc)));
        let skill;
        if (group === "skills") skill = skillFields(form, { ...item.source, ...item, ...typeof saved === "object" ? saved : {} });
        let metadata;
        if (!skill) {
          const details = node("details");
          details.append(node("summary", "\u8D44\u6E90\u663E\u793A\u4FE1\u606F"));
          const name2 = field(details, "\u540D\u79F0\uFF08\u6587\u672C\u6216\u8BED\u8A00\u5BF9\u8C61\uFF09", asInput(saved?.name ?? item.name));
          const desc = field(details, "\u7B80\u4ECB\uFF08\u6587\u672C\u6216\u8BED\u8A00\u5BF9\u8C61\uFF09", asInput(saved?.desc ?? item.desc));
          form.append(details);
          metadata = () => {
            const values = { key: item.key };
            const nextName = textValue(name2), nextDesc = textValue(desc);
            if (nextName && JSON.stringify(nextName) !== JSON.stringify(item.name)) values.name = nextName;
            if (JSON.stringify(nextDesc) !== JSON.stringify(item.desc || "")) values.desc = nextDesc;
            return Object.keys(values).length > 1 ? values : item.key;
          };
        }
        fields.push({ group, item, box, skill, metadata });
      }
    }
    form.append(node("h3", "\u8FDC\u7A0B\u6280\u80FD"));
    const remote = [];
    const add = node("button", "\u6DFB\u52A0 Git \u4ED3\u5E93\u6280\u80FD");
    add.type = "button";
    const remoteList = node("div");
    form.append(remoteList, add);
    function appendRemote(item) {
      const row = node("fieldset");
      const id = field(row, "\u6280\u80FD\u76EE\u5F55\u540D", item.id);
      const scope = node("select");
      if (whole) {
        scope.setAttribute("aria-label", "\u6280\u80FD\u5B89\u88C5\u8303\u56F4");
        for (const value of ["home", ...Object.keys(units).map((name2) => "profile:" + name2)]) {
          const option = node("option", value);
          option.value = value;
          scope.append(option);
        }
        scope.value = item.scope || (item.key?.startsWith("skill:profile:") ? item.key.slice(6, item.key.lastIndexOf(":")) : "home");
        row.append(scope);
      }
      const readSkill = skillFields(row, { mode: "fixed", ...item }, false);
      const remove = node("button", "\u79FB\u9664");
      remove.type = "button";
      remove.onclick = () => row.remove();
      row.append(remove);
      remoteList.append(row);
      remote.push(() => row.isConnected ? {
        ...readSkill(),
        id: id.value.trim(),
        scope: whole ? scope.value : "home",
        key: "skill:" + (whole ? scope.value : "home") + ":" + id.value.trim()
      } : null);
    }
    for (const item of current.selection?.skills || []) {
      if (typeof item === "object" && !fields.some((f) => f.item.key === item.key)) appendRemote(item);
    }
    add.onclick = () => appendRemote({});
    const pluginRows = [];
    for (const [profile, unit] of Object.entries(units)) {
      const plugins = unit.plugins || {};
      const ids = /* @__PURE__ */ new Set([...Object.keys(plugins), ...unit.bundles || [], ...Object.keys(unit.dependencies || {})]);
      for (const id of ids) {
        const details = node("details");
        const version2 = unit.dependencies?.[id];
        details.append(node("summary", profile + " \xB7 " + id + (version2 ? "@" + version2 : "")));
        const before = (whole ? current.profilePlugins?.[profile] : current.plugins)?.[id] || {};
        const auto = plugins[id] || {};
        const name2 = field(details, "\u540D\u79F0\uFF08\u6587\u672C\u6216\u8BED\u8A00\u5BF9\u8C61\uFF09", asInput(before.name ?? auto.name));
        const desc = field(details, "\u7B80\u4ECB\uFF08\u6587\u672C\u6216\u8BED\u8A00\u5BF9\u8C61\uFF09", asInput(before.desc ?? auto.desc));
        const icon = field(details, "\u56FE\u6807\u5730\u5740", before.icon ?? auto.icon);
        const savedSource = version2 && before.version === version2 ? before.source : void 0;
        const registry = field(details, "\u6B64\u7248\u672C\u4E13\u7528 npm registry", savedSource?.registry ?? auto.source?.registry);
        registry.placeholder = "\u4F7F\u7528\u9ED8\u8BA4 registry";
        form.append(details);
        pluginRows.push(() => {
          const entry = {};
          const update = (key, value) => {
            if (value && (Object.hasOwn(before, key) || JSON.stringify(value) !== JSON.stringify(auto[key]))) entry[key] = value;
          };
          update("name", textValue(name2));
          update("desc", textValue(desc));
          update("icon", icon.value.trim());
          if (registry.value.trim()) {
            entry.source = { type: "npm", registry: registry.value.trim() };
            entry.version = unit.dependencies?.[id];
          } else if (auto.source?.registry || savedSource) {
            entry.source = { type: "npm" };
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
      const profilePlugins = /* @__PURE__ */ Object.create(null);
      for (const read of pluginRows) {
        const { profile, id, entry } = read();
        if (!Object.keys(entry).length) continue;
        (profilePlugins[profile] ?? (profilePlugins[profile] = /* @__PURE__ */ Object.create(null)))[id] = entry;
      }
      return whole ? { selection, profilePlugins } : { selection, plugins: Object.values(profilePlugins)[0] || {} };
    };
  });
}
function skillFields(parent, skill, embedded = true) {
  const details = node("details");
  details.append(node("summary", "\u6280\u80FD\u6765\u6E90\u4E0E\u663E\u793A\u4FE1\u606F"));
  const mode = node("select");
  for (const [id, title] of [["embedded", "\u968F\u5305\u643A\u5E26"], ["fixed", "\u56FA\u5B9A\u63D0\u4EA4"], ["track", "\u8DDF\u8E2A\u5206\u652F\u6216\u6807\u7B7E"]]) {
    if (!embedded && id === "embedded") continue;
    const option = node("option", title);
    option.value = id;
    mode.append(option);
  }
  mode.value = skill.mode || (embedded ? "embedded" : "fixed");
  details.append(mode);
  const repo = field(details, "Git \u4ED3\u5E93", skill.repository || skill.repo);
  const subdir = field(details, "\u4ED3\u5185\u76EE\u5F55", skill.subdir);
  const ref = field(details, "\u63D0\u4EA4\u3001\u5206\u652F\u6216\u6807\u7B7E", mode.value === "fixed" ? skill.commit || skill.ref : skill.ref || skill.commit);
  mode.onchange = () => {
    ref.value = mode.value === "fixed" ? skill.commit || "" : skill.ref || "";
  };
  const name2 = field(details, "\u540D\u79F0\uFF08\u6587\u672C\u6216\u8BED\u8A00\u5BF9\u8C61\uFF09", asInput(skill.name));
  const desc = field(details, "\u7B80\u4ECB\uFF08\u6587\u672C\u6216\u8BED\u8A00\u5BF9\u8C61\uFF09", asInput(skill.desc));
  parent.append(details);
  return () => ({ mode: mode.value, repository: repo.value.trim(), subdir: subdir.value.trim(), ref: ref.value.trim(), name: textValue(name2), desc: textValue(desc) });
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
  let resources = {};
  const ref = (key) => (el) => {
    fields[key] = el;
  };
  const fillForm = (cfg, refs = fields) => {
    for (const key of TEXT_FIELDS) if (refs[key]) refs[key].value = cfg[key] ?? "";
    resources = { selection: cfg.selection, plugins: cfg.plugins };
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
  const editResources = async () => {
    try {
      const result = await runCommand2("/dspack-resources " + JSON.stringify({ plugins: resources.plugins }));
      if (!result?.ok) return showResult(result);
      const { candidates, units } = JSON.parse(result.text);
      const selected = await chooseExportResources(candidates, units, resources);
      if (selected) resources = selected;
    } catch (error) {
      showResult({ ok: false, error: error.message });
    }
  };
  const doSaveConfig = async () => {
    if (!runCommand2) return;
    const config = { ...resources };
    for (const key of TEXT_FIELDS) config[key] = fields[key]?.value?.trim() ?? "";
    config.exportContent = {
      preset: fields.preset?.checked ?? true,
      instruction: fields.instruction?.checked ?? true,
      data: fields.data?.checked ?? true
    };
    showResult({ pending: true });
    showResult(await runCommand2("/dspack-save-config " + JSON.stringify(config)));
  };
  const doExport = async () => {
    if (!runCommand2) return;
    const overrides = { ...resources };
    for (const key of TEXT_FIELDS) {
      const v = fields[key]?.value?.trim();
      if (v) overrides[key] = v;
    }
    overrides.exportContent = {
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
  const field2 = (key) => {
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
    ...g.fields.map(field2)
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
      (0, import_react.createElement)("button", { type: "button", style: style.browseBtn, disabled: !runCommand2, onClick: editResources }, "\u63D2\u4EF6\u4E0E\u8D44\u6E90"),
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
