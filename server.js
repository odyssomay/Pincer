#!/usr/bin/nodejs
var COMPILED = false;
var goog = goog || {};
goog.global = this;
goog.DEBUG = true;
goog.LOCALE = "en";
goog.evalWorksForGlobals_ = null;
goog.provide = function(name) {
  if(!COMPILED) {
    if(goog.getObjectByName(name) && !goog.implicitNamespaces_[name]) {
      throw Error('Namespace "' + name + '" already declared.');
    }
    var namespace = name;
    while(namespace = namespace.substring(0, namespace.lastIndexOf("."))) {
      goog.implicitNamespaces_[namespace] = true
    }
  }
  goog.exportPath_(name)
};
goog.setTestOnly = function(opt_message) {
  if(COMPILED && !goog.DEBUG) {
    opt_message = opt_message || "";
    throw Error("Importing test-only code into non-debug environment" + opt_message ? ": " + opt_message : ".");
  }
};
if(!COMPILED) {
  goog.implicitNamespaces_ = {}
}
goog.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split(".");
  var cur = opt_objectToExportTo || goog.global;
  if(!(parts[0] in cur) && cur.execScript) {
    cur.execScript("var " + parts[0])
  }
  for(var part;parts.length && (part = parts.shift());) {
    if(!parts.length && goog.isDef(opt_object)) {
      cur[part] = opt_object
    }else {
      if(cur[part]) {
        cur = cur[part]
      }else {
        cur = cur[part] = {}
      }
    }
  }
};
goog.getObjectByName = function(name, opt_obj) {
  var parts = name.split(".");
  var cur = opt_obj || goog.global;
  for(var part;part = parts.shift();) {
    if(goog.isDefAndNotNull(cur[part])) {
      cur = cur[part]
    }else {
      return null
    }
  }
  return cur
};
goog.globalize = function(obj, opt_global) {
  var global = opt_global || goog.global;
  for(var x in obj) {
    global[x] = obj[x]
  }
};
goog.addDependency = function(relPath, provides, requires) {
  if(!COMPILED) {
    var provide, require;
    var path = relPath.replace(/\\/g, "/");
    var deps = goog.dependencies_;
    for(var i = 0;provide = provides[i];i++) {
      deps.nameToPath[provide] = path;
      if(!(path in deps.pathToNames)) {
        deps.pathToNames[path] = {}
      }
      deps.pathToNames[path][provide] = true
    }
    for(var j = 0;require = requires[j];j++) {
      if(!(path in deps.requires)) {
        deps.requires[path] = {}
      }
      deps.requires[path][require] = true
    }
  }
};
goog.require = function(rule) {
  if(!COMPILED) {
    if(goog.getObjectByName(rule)) {
      return
    }
    var path = goog.getPathFromDeps_(rule);
    if(path) {
      goog.included_[path] = true;
      goog.writeScripts_()
    }else {
      var errorMessage = "goog.require could not find: " + rule;
      if(goog.global.console) {
        goog.global.console["error"](errorMessage)
      }
      throw Error(errorMessage);
    }
  }
};
goog.basePath = "";
goog.global.CLOSURE_BASE_PATH;
goog.global.CLOSURE_NO_DEPS;
goog.global.CLOSURE_IMPORT_SCRIPT;
goog.nullFunction = function() {
};
goog.identityFunction = function(var_args) {
  return arguments[0]
};
goog.abstractMethod = function() {
  throw Error("unimplemented abstract method");
};
goog.addSingletonGetter = function(ctor) {
  ctor.getInstance = function() {
    return ctor.instance_ || (ctor.instance_ = new ctor)
  }
};
if(!COMPILED) {
  goog.included_ = {};
  goog.dependencies_ = {pathToNames:{}, nameToPath:{}, requires:{}, visited:{}, written:{}};
  goog.inHtmlDocument_ = function() {
    var doc = goog.global.document;
    return typeof doc != "undefined" && "write" in doc
  };
  goog.findBasePath_ = function() {
    if(goog.global.CLOSURE_BASE_PATH) {
      goog.basePath = goog.global.CLOSURE_BASE_PATH;
      return
    }else {
      if(!goog.inHtmlDocument_()) {
        return
      }
    }
    var doc = goog.global.document;
    var scripts = doc.getElementsByTagName("script");
    for(var i = scripts.length - 1;i >= 0;--i) {
      var src = scripts[i].src;
      var qmark = src.lastIndexOf("?");
      var l = qmark == -1 ? src.length : qmark;
      if(src.substr(l - 7, 7) == "base.js") {
        goog.basePath = src.substr(0, l - 7);
        return
      }
    }
  };
  goog.importScript_ = function(src) {
    var importScript = goog.global.CLOSURE_IMPORT_SCRIPT || goog.writeScriptTag_;
    if(!goog.dependencies_.written[src] && importScript(src)) {
      goog.dependencies_.written[src] = true
    }
  };
  goog.writeScriptTag_ = function(src) {
    if(goog.inHtmlDocument_()) {
      var doc = goog.global.document;
      doc.write('<script type="text/javascript" src="' + src + '"></' + "script>");
      return true
    }else {
      return false
    }
  };
  goog.writeScripts_ = function() {
    var scripts = [];
    var seenScript = {};
    var deps = goog.dependencies_;
    function visitNode(path) {
      if(path in deps.written) {
        return
      }
      if(path in deps.visited) {
        if(!(path in seenScript)) {
          seenScript[path] = true;
          scripts.push(path)
        }
        return
      }
      deps.visited[path] = true;
      if(path in deps.requires) {
        for(var requireName in deps.requires[path]) {
          if(requireName in deps.nameToPath) {
            visitNode(deps.nameToPath[requireName])
          }else {
            if(!goog.getObjectByName(requireName)) {
              throw Error("Undefined nameToPath for " + requireName);
            }
          }
        }
      }
      if(!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path)
      }
    }
    for(var path in goog.included_) {
      if(!deps.written[path]) {
        visitNode(path)
      }
    }
    for(var i = 0;i < scripts.length;i++) {
      if(scripts[i]) {
        goog.importScript_(goog.basePath + scripts[i])
      }else {
        throw Error("Undefined script input");
      }
    }
  };
  goog.getPathFromDeps_ = function(rule) {
    if(rule in goog.dependencies_.nameToPath) {
      return goog.dependencies_.nameToPath[rule]
    }else {
      return null
    }
  };
  goog.findBasePath_();
  if(!goog.global.CLOSURE_NO_DEPS) {
    goog.importScript_(goog.basePath + "deps.js")
  }
}
goog.typeOf = function(value) {
  var s = typeof value;
  if(s == "object") {
    if(value) {
      if(value instanceof Array) {
        return"array"
      }else {
        if(value instanceof Object) {
          return s
        }
      }
      var className = Object.prototype.toString.call(value);
      if(className == "[object Window]") {
        return"object"
      }
      if(className == "[object Array]" || typeof value.length == "number" && typeof value.splice != "undefined" && typeof value.propertyIsEnumerable != "undefined" && !value.propertyIsEnumerable("splice")) {
        return"array"
      }
      if(className == "[object Function]" || typeof value.call != "undefined" && typeof value.propertyIsEnumerable != "undefined" && !value.propertyIsEnumerable("call")) {
        return"function"
      }
    }else {
      return"null"
    }
  }else {
    if(s == "function" && typeof value.call == "undefined") {
      return"object"
    }
  }
  return s
};
goog.propertyIsEnumerableCustom_ = function(object, propName) {
  if(propName in object) {
    for(var key in object) {
      if(key == propName && Object.prototype.hasOwnProperty.call(object, propName)) {
        return true
      }
    }
  }
  return false
};
goog.propertyIsEnumerable_ = function(object, propName) {
  if(object instanceof Object) {
    return Object.prototype.propertyIsEnumerable.call(object, propName)
  }else {
    return goog.propertyIsEnumerableCustom_(object, propName)
  }
};
goog.isDef = function(val) {
  return val !== undefined
};
goog.isNull = function(val) {
  return val === null
};
goog.isDefAndNotNull = function(val) {
  return val != null
};
goog.isArray = function(val) {
  return goog.typeOf(val) == "array"
};
goog.isArrayLike = function(val) {
  var type = goog.typeOf(val);
  return type == "array" || type == "object" && typeof val.length == "number"
};
goog.isDateLike = function(val) {
  return goog.isObject(val) && typeof val.getFullYear == "function"
};
goog.isString = function(val) {
  return typeof val == "string"
};
goog.isBoolean = function(val) {
  return typeof val == "boolean"
};
goog.isNumber = function(val) {
  return typeof val == "number"
};
goog.isFunction = function(val) {
  return goog.typeOf(val) == "function"
};
goog.isObject = function(val) {
  var type = goog.typeOf(val);
  return type == "object" || type == "array" || type == "function"
};
goog.getUid = function(obj) {
  return obj[goog.UID_PROPERTY_] || (obj[goog.UID_PROPERTY_] = ++goog.uidCounter_)
};
goog.removeUid = function(obj) {
  if("removeAttribute" in obj) {
    obj.removeAttribute(goog.UID_PROPERTY_)
  }
  try {
    delete obj[goog.UID_PROPERTY_]
  }catch(ex) {
  }
};
goog.UID_PROPERTY_ = "closure_uid_" + Math.floor(Math.random() * 2147483648).toString(36);
goog.uidCounter_ = 0;
goog.getHashCode = goog.getUid;
goog.removeHashCode = goog.removeUid;
goog.cloneObject = function(obj) {
  var type = goog.typeOf(obj);
  if(type == "object" || type == "array") {
    if(obj.clone) {
      return obj.clone()
    }
    var clone = type == "array" ? [] : {};
    for(var key in obj) {
      clone[key] = goog.cloneObject(obj[key])
    }
    return clone
  }
  return obj
};
Object.prototype.clone;
goog.bindNative_ = function(fn, selfObj, var_args) {
  return fn.call.apply(fn.bind, arguments)
};
goog.bindJs_ = function(fn, selfObj, var_args) {
  var context = selfObj || goog.global;
  if(arguments.length > 2) {
    var boundArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      var newArgs = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(newArgs, boundArgs);
      return fn.apply(context, newArgs)
    }
  }else {
    return function() {
      return fn.apply(context, arguments)
    }
  }
};
goog.bind = function(fn, selfObj, var_args) {
  if(Function.prototype.bind && Function.prototype.bind.toString().indexOf("native code") != -1) {
    goog.bind = goog.bindNative_
  }else {
    goog.bind = goog.bindJs_
  }
  return goog.bind.apply(null, arguments)
};
goog.partial = function(fn, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    var newArgs = Array.prototype.slice.call(arguments);
    newArgs.unshift.apply(newArgs, args);
    return fn.apply(this, newArgs)
  }
};
goog.mixin = function(target, source) {
  for(var x in source) {
    target[x] = source[x]
  }
};
goog.now = Date.now || function() {
  return+new Date
};
goog.globalEval = function(script) {
  if(goog.global.execScript) {
    goog.global.execScript(script, "JavaScript")
  }else {
    if(goog.global.eval) {
      if(goog.evalWorksForGlobals_ == null) {
        goog.global.eval("var _et_ = 1;");
        if(typeof goog.global["_et_"] != "undefined") {
          delete goog.global["_et_"];
          goog.evalWorksForGlobals_ = true
        }else {
          goog.evalWorksForGlobals_ = false
        }
      }
      if(goog.evalWorksForGlobals_) {
        goog.global.eval(script)
      }else {
        var doc = goog.global.document;
        var scriptElt = doc.createElement("script");
        scriptElt.type = "text/javascript";
        scriptElt.defer = false;
        scriptElt.appendChild(doc.createTextNode(script));
        doc.body.appendChild(scriptElt);
        doc.body.removeChild(scriptElt)
      }
    }else {
      throw Error("goog.globalEval not available");
    }
  }
};
goog.cssNameMapping_;
goog.cssNameMappingStyle_;
goog.getCssName = function(className, opt_modifier) {
  var getMapping = function(cssName) {
    return goog.cssNameMapping_[cssName] || cssName
  };
  var renameByParts = function(cssName) {
    var parts = cssName.split("-");
    var mapped = [];
    for(var i = 0;i < parts.length;i++) {
      mapped.push(getMapping(parts[i]))
    }
    return mapped.join("-")
  };
  var rename;
  if(goog.cssNameMapping_) {
    rename = goog.cssNameMappingStyle_ == "BY_WHOLE" ? getMapping : renameByParts
  }else {
    rename = function(a) {
      return a
    }
  }
  if(opt_modifier) {
    return className + "-" + rename(opt_modifier)
  }else {
    return rename(className)
  }
};
goog.setCssNameMapping = function(mapping, style) {
  goog.cssNameMapping_ = mapping;
  goog.cssNameMappingStyle_ = style
};
goog.getMsg = function(str, opt_values) {
  var values = opt_values || {};
  for(var key in values) {
    var value = ("" + values[key]).replace(/\$/g, "$$$$");
    str = str.replace(new RegExp("\\{\\$" + key + "\\}", "gi"), value)
  }
  return str
};
goog.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  goog.exportPath_(publicPath, object, opt_objectToExportTo)
};
goog.exportProperty = function(object, publicName, symbol) {
  object[publicName] = symbol
};
goog.inherits = function(childCtor, parentCtor) {
  function tempCtor() {
  }
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor;
  childCtor.prototype.constructor = childCtor
};
goog.base = function(me, opt_methodName, var_args) {
  var caller = arguments.callee.caller;
  if(caller.superClass_) {
    return caller.superClass_.constructor.apply(me, Array.prototype.slice.call(arguments, 1))
  }
  var args = Array.prototype.slice.call(arguments, 2);
  var foundCaller = false;
  for(var ctor = me.constructor;ctor;ctor = ctor.superClass_ && ctor.superClass_.constructor) {
    if(ctor.prototype[opt_methodName] === caller) {
      foundCaller = true
    }else {
      if(foundCaller) {
        return ctor.prototype[opt_methodName].apply(me, args)
      }
    }
  }
  if(me[opt_methodName] === caller) {
    return me.constructor.prototype[opt_methodName].apply(me, args)
  }else {
    throw Error("goog.base called from a method of one name " + "to a method of a different name");
  }
};
goog.scope = function(fn) {
  fn.call(goog.global)
};
goog.provide("goog.string");
goog.provide("goog.string.Unicode");
goog.string.Unicode = {NBSP:"\u00a0"};
goog.string.startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) == 0
};
goog.string.endsWith = function(str, suffix) {
  var l = str.length - suffix.length;
  return l >= 0 && str.indexOf(suffix, l) == l
};
goog.string.caseInsensitiveStartsWith = function(str, prefix) {
  return goog.string.caseInsensitiveCompare(prefix, str.substr(0, prefix.length)) == 0
};
goog.string.caseInsensitiveEndsWith = function(str, suffix) {
  return goog.string.caseInsensitiveCompare(suffix, str.substr(str.length - suffix.length, suffix.length)) == 0
};
goog.string.subs = function(str, var_args) {
  for(var i = 1;i < arguments.length;i++) {
    var replacement = String(arguments[i]).replace(/\$/g, "$$$$");
    str = str.replace(/\%s/, replacement)
  }
  return str
};
goog.string.collapseWhitespace = function(str) {
  return str.replace(/[\s\xa0]+/g, " ").replace(/^\s+|\s+$/g, "")
};
goog.string.isEmpty = function(str) {
  return/^[\s\xa0]*$/.test(str)
};
goog.string.isEmptySafe = function(str) {
  return goog.string.isEmpty(goog.string.makeSafe(str))
};
goog.string.isBreakingWhitespace = function(str) {
  return!/[^\t\n\r ]/.test(str)
};
goog.string.isAlpha = function(str) {
  return!/[^a-zA-Z]/.test(str)
};
goog.string.isNumeric = function(str) {
  return!/[^0-9]/.test(str)
};
goog.string.isAlphaNumeric = function(str) {
  return!/[^a-zA-Z0-9]/.test(str)
};
goog.string.isSpace = function(ch) {
  return ch == " "
};
goog.string.isUnicodeChar = function(ch) {
  return ch.length == 1 && ch >= " " && ch <= "~" || ch >= "\u0080" && ch <= "\ufffd"
};
goog.string.stripNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)+/g, " ")
};
goog.string.canonicalizeNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)/g, "\n")
};
goog.string.normalizeWhitespace = function(str) {
  return str.replace(/\xa0|\s/g, " ")
};
goog.string.normalizeSpaces = function(str) {
  return str.replace(/\xa0|[ \t]+/g, " ")
};
goog.string.trim = function(str) {
  return str.replace(/^[\s\xa0]+|[\s\xa0]+$/g, "")
};
goog.string.trimLeft = function(str) {
  return str.replace(/^[\s\xa0]+/, "")
};
goog.string.trimRight = function(str) {
  return str.replace(/[\s\xa0]+$/, "")
};
goog.string.caseInsensitiveCompare = function(str1, str2) {
  var test1 = String(str1).toLowerCase();
  var test2 = String(str2).toLowerCase();
  if(test1 < test2) {
    return-1
  }else {
    if(test1 == test2) {
      return 0
    }else {
      return 1
    }
  }
};
goog.string.numerateCompareRegExp_ = /(\.\d+)|(\d+)|(\D+)/g;
goog.string.numerateCompare = function(str1, str2) {
  if(str1 == str2) {
    return 0
  }
  if(!str1) {
    return-1
  }
  if(!str2) {
    return 1
  }
  var tokens1 = str1.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var tokens2 = str2.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var count = Math.min(tokens1.length, tokens2.length);
  for(var i = 0;i < count;i++) {
    var a = tokens1[i];
    var b = tokens2[i];
    if(a != b) {
      var num1 = parseInt(a, 10);
      if(!isNaN(num1)) {
        var num2 = parseInt(b, 10);
        if(!isNaN(num2) && num1 - num2) {
          return num1 - num2
        }
      }
      return a < b ? -1 : 1
    }
  }
  if(tokens1.length != tokens2.length) {
    return tokens1.length - tokens2.length
  }
  return str1 < str2 ? -1 : 1
};
goog.string.encodeUriRegExp_ = /^[a-zA-Z0-9\-_.!~*'()]*$/;
goog.string.urlEncode = function(str) {
  str = String(str);
  if(!goog.string.encodeUriRegExp_.test(str)) {
    return encodeURIComponent(str)
  }
  return str
};
goog.string.urlDecode = function(str) {
  return decodeURIComponent(str.replace(/\+/g, " "))
};
goog.string.newLineToBr = function(str, opt_xml) {
  return str.replace(/(\r\n|\r|\n)/g, opt_xml ? "<br />" : "<br>")
};
goog.string.htmlEscape = function(str, opt_isLikelyToContainHtmlChars) {
  if(opt_isLikelyToContainHtmlChars) {
    return str.replace(goog.string.amperRe_, "&amp;").replace(goog.string.ltRe_, "&lt;").replace(goog.string.gtRe_, "&gt;").replace(goog.string.quotRe_, "&quot;")
  }else {
    if(!goog.string.allRe_.test(str)) {
      return str
    }
    if(str.indexOf("&") != -1) {
      str = str.replace(goog.string.amperRe_, "&amp;")
    }
    if(str.indexOf("<") != -1) {
      str = str.replace(goog.string.ltRe_, "&lt;")
    }
    if(str.indexOf(">") != -1) {
      str = str.replace(goog.string.gtRe_, "&gt;")
    }
    if(str.indexOf('"') != -1) {
      str = str.replace(goog.string.quotRe_, "&quot;")
    }
    return str
  }
};
goog.string.amperRe_ = /&/g;
goog.string.ltRe_ = /</g;
goog.string.gtRe_ = />/g;
goog.string.quotRe_ = /\"/g;
goog.string.allRe_ = /[&<>\"]/;
goog.string.unescapeEntities = function(str) {
  if(goog.string.contains(str, "&")) {
    if("document" in goog.global && !goog.string.contains(str, "<")) {
      return goog.string.unescapeEntitiesUsingDom_(str)
    }else {
      return goog.string.unescapePureXmlEntities_(str)
    }
  }
  return str
};
goog.string.unescapeEntitiesUsingDom_ = function(str) {
  var el = goog.global["document"]["createElement"]("div");
  el["innerHTML"] = "<pre>x" + str + "</pre>";
  if(el["firstChild"][goog.string.NORMALIZE_FN_]) {
    el["firstChild"][goog.string.NORMALIZE_FN_]()
  }
  str = el["firstChild"]["firstChild"]["nodeValue"].slice(1);
  el["innerHTML"] = "";
  return goog.string.canonicalizeNewlines(str)
};
goog.string.unescapePureXmlEntities_ = function(str) {
  return str.replace(/&([^;]+);/g, function(s, entity) {
    switch(entity) {
      case "amp":
        return"&";
      case "lt":
        return"<";
      case "gt":
        return">";
      case "quot":
        return'"';
      default:
        if(entity.charAt(0) == "#") {
          var n = Number("0" + entity.substr(1));
          if(!isNaN(n)) {
            return String.fromCharCode(n)
          }
        }
        return s
    }
  })
};
goog.string.NORMALIZE_FN_ = "normalize";
goog.string.whitespaceEscape = function(str, opt_xml) {
  return goog.string.newLineToBr(str.replace(/  /g, " &#160;"), opt_xml)
};
goog.string.stripQuotes = function(str, quoteChars) {
  var length = quoteChars.length;
  for(var i = 0;i < length;i++) {
    var quoteChar = length == 1 ? quoteChars : quoteChars.charAt(i);
    if(str.charAt(0) == quoteChar && str.charAt(str.length - 1) == quoteChar) {
      return str.substring(1, str.length - 1)
    }
  }
  return str
};
goog.string.truncate = function(str, chars, opt_protectEscapedCharacters) {
  if(opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str)
  }
  if(str.length > chars) {
    str = str.substring(0, chars - 3) + "..."
  }
  if(opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str)
  }
  return str
};
goog.string.truncateMiddle = function(str, chars, opt_protectEscapedCharacters, opt_trailingChars) {
  if(opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str)
  }
  if(opt_trailingChars) {
    if(opt_trailingChars > chars) {
      opt_trailingChars = chars
    }
    var endPoint = str.length - opt_trailingChars;
    var startPoint = chars - opt_trailingChars;
    str = str.substring(0, startPoint) + "..." + str.substring(endPoint)
  }else {
    if(str.length > chars) {
      var half = Math.floor(chars / 2);
      var endPos = str.length - half;
      half += chars % 2;
      str = str.substring(0, half) + "..." + str.substring(endPos)
    }
  }
  if(opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str)
  }
  return str
};
goog.string.specialEscapeChars_ = {"\x00":"\\0", "\u0008":"\\b", "\u000c":"\\f", "\n":"\\n", "\r":"\\r", "\t":"\\t", "\x0B":"\\x0B", '"':'\\"', "\\":"\\\\"};
goog.string.jsEscapeCache_ = {"'":"\\'"};
goog.string.quote = function(s) {
  s = String(s);
  if(s.quote) {
    return s.quote()
  }else {
    var sb = ['"'];
    for(var i = 0;i < s.length;i++) {
      var ch = s.charAt(i);
      var cc = ch.charCodeAt(0);
      sb[i + 1] = goog.string.specialEscapeChars_[ch] || (cc > 31 && cc < 127 ? ch : goog.string.escapeChar(ch))
    }
    sb.push('"');
    return sb.join("")
  }
};
goog.string.escapeString = function(str) {
  var sb = [];
  for(var i = 0;i < str.length;i++) {
    sb[i] = goog.string.escapeChar(str.charAt(i))
  }
  return sb.join("")
};
goog.string.escapeChar = function(c) {
  if(c in goog.string.jsEscapeCache_) {
    return goog.string.jsEscapeCache_[c]
  }
  if(c in goog.string.specialEscapeChars_) {
    return goog.string.jsEscapeCache_[c] = goog.string.specialEscapeChars_[c]
  }
  var rv = c;
  var cc = c.charCodeAt(0);
  if(cc > 31 && cc < 127) {
    rv = c
  }else {
    if(cc < 256) {
      rv = "\\x";
      if(cc < 16 || cc > 256) {
        rv += "0"
      }
    }else {
      rv = "\\u";
      if(cc < 4096) {
        rv += "0"
      }
    }
    rv += cc.toString(16).toUpperCase()
  }
  return goog.string.jsEscapeCache_[c] = rv
};
goog.string.toMap = function(s) {
  var rv = {};
  for(var i = 0;i < s.length;i++) {
    rv[s.charAt(i)] = true
  }
  return rv
};
goog.string.contains = function(s, ss) {
  return s.indexOf(ss) != -1
};
goog.string.removeAt = function(s, index, stringLength) {
  var resultStr = s;
  if(index >= 0 && index < s.length && stringLength > 0) {
    resultStr = s.substr(0, index) + s.substr(index + stringLength, s.length - index - stringLength)
  }
  return resultStr
};
goog.string.remove = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), "");
  return s.replace(re, "")
};
goog.string.removeAll = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), "g");
  return s.replace(re, "")
};
goog.string.regExpEscape = function(s) {
  return String(s).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, "\\$1").replace(/\x08/g, "\\x08")
};
goog.string.repeat = function(string, length) {
  return(new Array(length + 1)).join(string)
};
goog.string.padNumber = function(num, length, opt_precision) {
  var s = goog.isDef(opt_precision) ? num.toFixed(opt_precision) : String(num);
  var index = s.indexOf(".");
  if(index == -1) {
    index = s.length
  }
  return goog.string.repeat("0", Math.max(0, length - index)) + s
};
goog.string.makeSafe = function(obj) {
  return obj == null ? "" : String(obj)
};
goog.string.buildString = function(var_args) {
  return Array.prototype.join.call(arguments, "")
};
goog.string.getRandomString = function() {
  var x = 2147483648;
  return Math.floor(Math.random() * x).toString(36) + Math.abs(Math.floor(Math.random() * x) ^ goog.now()).toString(36)
};
goog.string.compareVersions = function(version1, version2) {
  var order = 0;
  var v1Subs = goog.string.trim(String(version1)).split(".");
  var v2Subs = goog.string.trim(String(version2)).split(".");
  var subCount = Math.max(v1Subs.length, v2Subs.length);
  for(var subIdx = 0;order == 0 && subIdx < subCount;subIdx++) {
    var v1Sub = v1Subs[subIdx] || "";
    var v2Sub = v2Subs[subIdx] || "";
    var v1CompParser = new RegExp("(\\d*)(\\D*)", "g");
    var v2CompParser = new RegExp("(\\d*)(\\D*)", "g");
    do {
      var v1Comp = v1CompParser.exec(v1Sub) || ["", "", ""];
      var v2Comp = v2CompParser.exec(v2Sub) || ["", "", ""];
      if(v1Comp[0].length == 0 && v2Comp[0].length == 0) {
        break
      }
      var v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
      var v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);
      order = goog.string.compareElements_(v1CompNum, v2CompNum) || goog.string.compareElements_(v1Comp[2].length == 0, v2Comp[2].length == 0) || goog.string.compareElements_(v1Comp[2], v2Comp[2])
    }while(order == 0)
  }
  return order
};
goog.string.compareElements_ = function(left, right) {
  if(left < right) {
    return-1
  }else {
    if(left > right) {
      return 1
    }
  }
  return 0
};
goog.string.HASHCODE_MAX_ = 4294967296;
goog.string.hashCode = function(str) {
  var result = 0;
  for(var i = 0;i < str.length;++i) {
    result = 31 * result + str.charCodeAt(i);
    result %= goog.string.HASHCODE_MAX_
  }
  return result
};
goog.string.uniqueStringCounter_ = Math.random() * 2147483648 | 0;
goog.string.createUniqueString = function() {
  return"goog_" + goog.string.uniqueStringCounter_++
};
goog.string.toNumber = function(str) {
  var num = Number(str);
  if(num == 0 && goog.string.isEmpty(str)) {
    return NaN
  }
  return num
};
goog.string.toCamelCaseCache_ = {};
goog.string.toCamelCase = function(str) {
  return goog.string.toCamelCaseCache_[str] || (goog.string.toCamelCaseCache_[str] = String(str).replace(/\-([a-z])/g, function(all, match) {
    return match.toUpperCase()
  }))
};
goog.string.toSelectorCaseCache_ = {};
goog.string.toSelectorCase = function(str) {
  return goog.string.toSelectorCaseCache_[str] || (goog.string.toSelectorCaseCache_[str] = String(str).replace(/([A-Z])/g, "-$1").toLowerCase())
};
goog.provide("goog.userAgent.jscript");
goog.require("goog.string");
goog.userAgent.jscript.ASSUME_NO_JSCRIPT = false;
goog.userAgent.jscript.init_ = function() {
  var hasScriptEngine = "ScriptEngine" in goog.global;
  goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_ = hasScriptEngine && goog.global["ScriptEngine"]() == "JScript";
  goog.userAgent.jscript.DETECTED_VERSION_ = goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_ ? goog.global["ScriptEngineMajorVersion"]() + "." + goog.global["ScriptEngineMinorVersion"]() + "." + goog.global["ScriptEngineBuildVersion"]() : "0"
};
if(!goog.userAgent.jscript.ASSUME_NO_JSCRIPT) {
  goog.userAgent.jscript.init_()
}
goog.userAgent.jscript.HAS_JSCRIPT = goog.userAgent.jscript.ASSUME_NO_JSCRIPT ? false : goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_;
goog.userAgent.jscript.VERSION = goog.userAgent.jscript.ASSUME_NO_JSCRIPT ? "0" : goog.userAgent.jscript.DETECTED_VERSION_;
goog.userAgent.jscript.isVersion = function(version) {
  return goog.string.compareVersions(goog.userAgent.jscript.VERSION, version) >= 0
};
goog.provide("goog.string.StringBuffer");
goog.require("goog.userAgent.jscript");
goog.string.StringBuffer = function(opt_a1, var_args) {
  this.buffer_ = goog.userAgent.jscript.HAS_JSCRIPT ? [] : "";
  if(opt_a1 != null) {
    this.append.apply(this, arguments)
  }
};
goog.string.StringBuffer.prototype.set = function(s) {
  this.clear();
  this.append(s)
};
if(goog.userAgent.jscript.HAS_JSCRIPT) {
  goog.string.StringBuffer.prototype.bufferLength_ = 0;
  goog.string.StringBuffer.prototype.append = function(a1, opt_a2, var_args) {
    if(opt_a2 == null) {
      this.buffer_[this.bufferLength_++] = a1
    }else {
      this.buffer_.push.apply(this.buffer_, arguments);
      this.bufferLength_ = this.buffer_.length
    }
    return this
  }
}else {
  goog.string.StringBuffer.prototype.append = function(a1, opt_a2, var_args) {
    this.buffer_ += a1;
    if(opt_a2 != null) {
      for(var i = 1;i < arguments.length;i++) {
        this.buffer_ += arguments[i]
      }
    }
    return this
  }
}
goog.string.StringBuffer.prototype.clear = function() {
  if(goog.userAgent.jscript.HAS_JSCRIPT) {
    this.buffer_.length = 0;
    this.bufferLength_ = 0
  }else {
    this.buffer_ = ""
  }
};
goog.string.StringBuffer.prototype.getLength = function() {
  return this.toString().length
};
goog.string.StringBuffer.prototype.toString = function() {
  if(goog.userAgent.jscript.HAS_JSCRIPT) {
    var str = this.buffer_.join("");
    this.clear();
    if(str) {
      this.append(str)
    }
    return str
  }else {
    return this.buffer_
  }
};
goog.provide("goog.object");
goog.object.forEach = function(obj, f, opt_obj) {
  for(var key in obj) {
    f.call(opt_obj, obj[key], key, obj)
  }
};
goog.object.filter = function(obj, f, opt_obj) {
  var res = {};
  for(var key in obj) {
    if(f.call(opt_obj, obj[key], key, obj)) {
      res[key] = obj[key]
    }
  }
  return res
};
goog.object.map = function(obj, f, opt_obj) {
  var res = {};
  for(var key in obj) {
    res[key] = f.call(opt_obj, obj[key], key, obj)
  }
  return res
};
goog.object.some = function(obj, f, opt_obj) {
  for(var key in obj) {
    if(f.call(opt_obj, obj[key], key, obj)) {
      return true
    }
  }
  return false
};
goog.object.every = function(obj, f, opt_obj) {
  for(var key in obj) {
    if(!f.call(opt_obj, obj[key], key, obj)) {
      return false
    }
  }
  return true
};
goog.object.getCount = function(obj) {
  var rv = 0;
  for(var key in obj) {
    rv++
  }
  return rv
};
goog.object.getAnyKey = function(obj) {
  for(var key in obj) {
    return key
  }
};
goog.object.getAnyValue = function(obj) {
  for(var key in obj) {
    return obj[key]
  }
};
goog.object.contains = function(obj, val) {
  return goog.object.containsValue(obj, val)
};
goog.object.getValues = function(obj) {
  var res = [];
  var i = 0;
  for(var key in obj) {
    res[i++] = obj[key]
  }
  return res
};
goog.object.getKeys = function(obj) {
  var res = [];
  var i = 0;
  for(var key in obj) {
    res[i++] = key
  }
  return res
};
goog.object.getValueByKeys = function(obj, var_args) {
  var isArrayLike = goog.isArrayLike(var_args);
  var keys = isArrayLike ? var_args : arguments;
  for(var i = isArrayLike ? 0 : 1;i < keys.length;i++) {
    obj = obj[keys[i]];
    if(!goog.isDef(obj)) {
      break
    }
  }
  return obj
};
goog.object.containsKey = function(obj, key) {
  return key in obj
};
goog.object.containsValue = function(obj, val) {
  for(var key in obj) {
    if(obj[key] == val) {
      return true
    }
  }
  return false
};
goog.object.findKey = function(obj, f, opt_this) {
  for(var key in obj) {
    if(f.call(opt_this, obj[key], key, obj)) {
      return key
    }
  }
  return undefined
};
goog.object.findValue = function(obj, f, opt_this) {
  var key = goog.object.findKey(obj, f, opt_this);
  return key && obj[key]
};
goog.object.isEmpty = function(obj) {
  for(var key in obj) {
    return false
  }
  return true
};
goog.object.clear = function(obj) {
  for(var i in obj) {
    delete obj[i]
  }
};
goog.object.remove = function(obj, key) {
  var rv;
  if(rv = key in obj) {
    delete obj[key]
  }
  return rv
};
goog.object.add = function(obj, key, val) {
  if(key in obj) {
    throw Error('The object already contains the key "' + key + '"');
  }
  goog.object.set(obj, key, val)
};
goog.object.get = function(obj, key, opt_val) {
  if(key in obj) {
    return obj[key]
  }
  return opt_val
};
goog.object.set = function(obj, key, value) {
  obj[key] = value
};
goog.object.setIfUndefined = function(obj, key, value) {
  return key in obj ? obj[key] : obj[key] = value
};
goog.object.clone = function(obj) {
  var res = {};
  for(var key in obj) {
    res[key] = obj[key]
  }
  return res
};
goog.object.unsafeClone = function(obj) {
  var type = goog.typeOf(obj);
  if(type == "object" || type == "array") {
    if(obj.clone) {
      return obj.clone()
    }
    var clone = type == "array" ? [] : {};
    for(var key in obj) {
      clone[key] = goog.object.unsafeClone(obj[key])
    }
    return clone
  }
  return obj
};
goog.object.transpose = function(obj) {
  var transposed = {};
  for(var key in obj) {
    transposed[obj[key]] = key
  }
  return transposed
};
goog.object.PROTOTYPE_FIELDS_ = ["constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"];
goog.object.extend = function(target, var_args) {
  var key, source;
  for(var i = 1;i < arguments.length;i++) {
    source = arguments[i];
    for(key in source) {
      target[key] = source[key]
    }
    for(var j = 0;j < goog.object.PROTOTYPE_FIELDS_.length;j++) {
      key = goog.object.PROTOTYPE_FIELDS_[j];
      if(Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key]
      }
    }
  }
};
goog.object.create = function(var_args) {
  var argLength = arguments.length;
  if(argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.create.apply(null, arguments[0])
  }
  if(argLength % 2) {
    throw Error("Uneven number of arguments");
  }
  var rv = {};
  for(var i = 0;i < argLength;i += 2) {
    rv[arguments[i]] = arguments[i + 1]
  }
  return rv
};
goog.object.createSet = function(var_args) {
  var argLength = arguments.length;
  if(argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.createSet.apply(null, arguments[0])
  }
  var rv = {};
  for(var i = 0;i < argLength;i++) {
    rv[arguments[i]] = true
  }
  return rv
};
goog.provide("goog.debug.Error");
goog.debug.Error = function(opt_msg) {
  this.stack = (new Error).stack || "";
  if(opt_msg) {
    this.message = String(opt_msg)
  }
};
goog.inherits(goog.debug.Error, Error);
goog.debug.Error.prototype.name = "CustomError";
goog.provide("goog.asserts");
goog.provide("goog.asserts.AssertionError");
goog.require("goog.debug.Error");
goog.require("goog.string");
goog.asserts.ENABLE_ASSERTS = goog.DEBUG;
goog.asserts.AssertionError = function(messagePattern, messageArgs) {
  messageArgs.unshift(messagePattern);
  goog.debug.Error.call(this, goog.string.subs.apply(null, messageArgs));
  messageArgs.shift();
  this.messagePattern = messagePattern
};
goog.inherits(goog.asserts.AssertionError, goog.debug.Error);
goog.asserts.AssertionError.prototype.name = "AssertionError";
goog.asserts.doAssertFailure_ = function(defaultMessage, defaultArgs, givenMessage, givenArgs) {
  var message = "Assertion failed";
  if(givenMessage) {
    message += ": " + givenMessage;
    var args = givenArgs
  }else {
    if(defaultMessage) {
      message += ": " + defaultMessage;
      args = defaultArgs
    }
  }
  throw new goog.asserts.AssertionError("" + message, args || []);
};
goog.asserts.assert = function(condition, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !condition) {
    goog.asserts.doAssertFailure_("", null, opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return condition
};
goog.asserts.fail = function(opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS) {
    throw new goog.asserts.AssertionError("Failure" + (opt_message ? ": " + opt_message : ""), Array.prototype.slice.call(arguments, 1));
  }
};
goog.asserts.assertNumber = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isNumber(value)) {
    goog.asserts.doAssertFailure_("Expected number but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertString = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isString(value)) {
    goog.asserts.doAssertFailure_("Expected string but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertFunction = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isFunction(value)) {
    goog.asserts.doAssertFailure_("Expected function but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertObject = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isObject(value)) {
    goog.asserts.doAssertFailure_("Expected object but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertArray = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isArray(value)) {
    goog.asserts.doAssertFailure_("Expected array but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertBoolean = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isBoolean(value)) {
    goog.asserts.doAssertFailure_("Expected boolean but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertInstanceof = function(value, type, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !(value instanceof type)) {
    goog.asserts.doAssertFailure_("instanceof check failed.", null, opt_message, Array.prototype.slice.call(arguments, 3))
  }
};
goog.provide("goog.array");
goog.provide("goog.array.ArrayLike");
goog.require("goog.asserts");
goog.NATIVE_ARRAY_PROTOTYPES = true;
goog.array.ArrayLike;
goog.array.peek = function(array) {
  return array[array.length - 1]
};
goog.array.ARRAY_PROTOTYPE_ = Array.prototype;
goog.array.indexOf = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.indexOf ? function(arr, obj, opt_fromIndex) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.indexOf.call(arr, obj, opt_fromIndex)
} : function(arr, obj, opt_fromIndex) {
  var fromIndex = opt_fromIndex == null ? 0 : opt_fromIndex < 0 ? Math.max(0, arr.length + opt_fromIndex) : opt_fromIndex;
  if(goog.isString(arr)) {
    if(!goog.isString(obj) || obj.length != 1) {
      return-1
    }
    return arr.indexOf(obj, fromIndex)
  }
  for(var i = fromIndex;i < arr.length;i++) {
    if(i in arr && arr[i] === obj) {
      return i
    }
  }
  return-1
};
goog.array.lastIndexOf = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.lastIndexOf ? function(arr, obj, opt_fromIndex) {
  goog.asserts.assert(arr.length != null);
  var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
  return goog.array.ARRAY_PROTOTYPE_.lastIndexOf.call(arr, obj, fromIndex)
} : function(arr, obj, opt_fromIndex) {
  var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
  if(fromIndex < 0) {
    fromIndex = Math.max(0, arr.length + fromIndex)
  }
  if(goog.isString(arr)) {
    if(!goog.isString(obj) || obj.length != 1) {
      return-1
    }
    return arr.lastIndexOf(obj, fromIndex)
  }
  for(var i = fromIndex;i >= 0;i--) {
    if(i in arr && arr[i] === obj) {
      return i
    }
  }
  return-1
};
goog.array.forEach = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.forEach ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  goog.array.ARRAY_PROTOTYPE_.forEach.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2) {
      f.call(opt_obj, arr2[i], i, arr)
    }
  }
};
goog.array.forEachRight = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = l - 1;i >= 0;--i) {
    if(i in arr2) {
      f.call(opt_obj, arr2[i], i, arr)
    }
  }
};
goog.array.filter = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.filter ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.filter.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var res = [];
  var resLength = 0;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2) {
      var val = arr2[i];
      if(f.call(opt_obj, val, i, arr)) {
        res[resLength++] = val
      }
    }
  }
  return res
};
goog.array.map = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.map ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.map.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var res = new Array(l);
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2) {
      res[i] = f.call(opt_obj, arr2[i], i, arr)
    }
  }
  return res
};
goog.array.reduce = function(arr, f, val, opt_obj) {
  if(arr.reduce) {
    if(opt_obj) {
      return arr.reduce(goog.bind(f, opt_obj), val)
    }else {
      return arr.reduce(f, val)
    }
  }
  var rval = val;
  goog.array.forEach(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr)
  });
  return rval
};
goog.array.reduceRight = function(arr, f, val, opt_obj) {
  if(arr.reduceRight) {
    if(opt_obj) {
      return arr.reduceRight(goog.bind(f, opt_obj), val)
    }else {
      return arr.reduceRight(f, val)
    }
  }
  var rval = val;
  goog.array.forEachRight(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr)
  });
  return rval
};
goog.array.some = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.some ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.some.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return true
    }
  }
  return false
};
goog.array.every = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.every ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.every.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2 && !f.call(opt_obj, arr2[i], i, arr)) {
      return false
    }
  }
  return true
};
goog.array.find = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i]
};
goog.array.findIndex = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i
    }
  }
  return-1
};
goog.array.findRight = function(arr, f, opt_obj) {
  var i = goog.array.findIndexRight(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i]
};
goog.array.findIndexRight = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = l - 1;i >= 0;i--) {
    if(i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i
    }
  }
  return-1
};
goog.array.contains = function(arr, obj) {
  return goog.array.indexOf(arr, obj) >= 0
};
goog.array.isEmpty = function(arr) {
  return arr.length == 0
};
goog.array.clear = function(arr) {
  if(!goog.isArray(arr)) {
    for(var i = arr.length - 1;i >= 0;i--) {
      delete arr[i]
    }
  }
  arr.length = 0
};
goog.array.insert = function(arr, obj) {
  if(!goog.array.contains(arr, obj)) {
    arr.push(obj)
  }
};
goog.array.insertAt = function(arr, obj, opt_i) {
  goog.array.splice(arr, opt_i, 0, obj)
};
goog.array.insertArrayAt = function(arr, elementsToAdd, opt_i) {
  goog.partial(goog.array.splice, arr, opt_i, 0).apply(null, elementsToAdd)
};
goog.array.insertBefore = function(arr, obj, opt_obj2) {
  var i;
  if(arguments.length == 2 || (i = goog.array.indexOf(arr, opt_obj2)) < 0) {
    arr.push(obj)
  }else {
    goog.array.insertAt(arr, obj, i)
  }
};
goog.array.remove = function(arr, obj) {
  var i = goog.array.indexOf(arr, obj);
  var rv;
  if(rv = i >= 0) {
    goog.array.removeAt(arr, i)
  }
  return rv
};
goog.array.removeAt = function(arr, i) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.splice.call(arr, i, 1).length == 1
};
goog.array.removeIf = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  if(i >= 0) {
    goog.array.removeAt(arr, i);
    return true
  }
  return false
};
goog.array.concat = function(var_args) {
  return goog.array.ARRAY_PROTOTYPE_.concat.apply(goog.array.ARRAY_PROTOTYPE_, arguments)
};
goog.array.clone = function(arr) {
  if(goog.isArray(arr)) {
    return goog.array.concat(arr)
  }else {
    var rv = [];
    for(var i = 0, len = arr.length;i < len;i++) {
      rv[i] = arr[i]
    }
    return rv
  }
};
goog.array.toArray = function(object) {
  if(goog.isArray(object)) {
    return goog.array.concat(object)
  }
  return goog.array.clone(object)
};
goog.array.extend = function(arr1, var_args) {
  for(var i = 1;i < arguments.length;i++) {
    var arr2 = arguments[i];
    var isArrayLike;
    if(goog.isArray(arr2) || (isArrayLike = goog.isArrayLike(arr2)) && arr2.hasOwnProperty("callee")) {
      arr1.push.apply(arr1, arr2)
    }else {
      if(isArrayLike) {
        var len1 = arr1.length;
        var len2 = arr2.length;
        for(var j = 0;j < len2;j++) {
          arr1[len1 + j] = arr2[j]
        }
      }else {
        arr1.push(arr2)
      }
    }
  }
};
goog.array.splice = function(arr, index, howMany, var_args) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.splice.apply(arr, goog.array.slice(arguments, 1))
};
goog.array.slice = function(arr, start, opt_end) {
  goog.asserts.assert(arr.length != null);
  if(arguments.length <= 2) {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start)
  }else {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start, opt_end)
  }
};
goog.array.removeDuplicates = function(arr, opt_rv) {
  var returnArray = opt_rv || arr;
  var seen = {}, cursorInsert = 0, cursorRead = 0;
  while(cursorRead < arr.length) {
    var current = arr[cursorRead++];
    var key = goog.isObject(current) ? "o" + goog.getUid(current) : (typeof current).charAt(0) + current;
    if(!Object.prototype.hasOwnProperty.call(seen, key)) {
      seen[key] = true;
      returnArray[cursorInsert++] = current
    }
  }
  returnArray.length = cursorInsert
};
goog.array.binarySearch = function(arr, target, opt_compareFn) {
  return goog.array.binarySearch_(arr, opt_compareFn || goog.array.defaultCompare, false, target)
};
goog.array.binarySelect = function(arr, evaluator, opt_obj) {
  return goog.array.binarySearch_(arr, evaluator, true, undefined, opt_obj)
};
goog.array.binarySearch_ = function(arr, compareFn, isEvaluator, opt_target, opt_selfObj) {
  var left = 0;
  var right = arr.length;
  var found;
  while(left < right) {
    var middle = left + right >> 1;
    var compareResult;
    if(isEvaluator) {
      compareResult = compareFn.call(opt_selfObj, arr[middle], middle, arr)
    }else {
      compareResult = compareFn(opt_target, arr[middle])
    }
    if(compareResult > 0) {
      left = middle + 1
    }else {
      right = middle;
      found = !compareResult
    }
  }
  return found ? left : ~left
};
goog.array.sort = function(arr, opt_compareFn) {
  goog.asserts.assert(arr.length != null);
  goog.array.ARRAY_PROTOTYPE_.sort.call(arr, opt_compareFn || goog.array.defaultCompare)
};
goog.array.stableSort = function(arr, opt_compareFn) {
  for(var i = 0;i < arr.length;i++) {
    arr[i] = {index:i, value:arr[i]}
  }
  var valueCompareFn = opt_compareFn || goog.array.defaultCompare;
  function stableCompareFn(obj1, obj2) {
    return valueCompareFn(obj1.value, obj2.value) || obj1.index - obj2.index
  }
  goog.array.sort(arr, stableCompareFn);
  for(var i = 0;i < arr.length;i++) {
    arr[i] = arr[i].value
  }
};
goog.array.sortObjectsByKey = function(arr, key, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  goog.array.sort(arr, function(a, b) {
    return compare(a[key], b[key])
  })
};
goog.array.isSorted = function(arr, opt_compareFn, opt_strict) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  for(var i = 1;i < arr.length;i++) {
    var compareResult = compare(arr[i - 1], arr[i]);
    if(compareResult > 0 || compareResult == 0 && opt_strict) {
      return false
    }
  }
  return true
};
goog.array.equals = function(arr1, arr2, opt_equalsFn) {
  if(!goog.isArrayLike(arr1) || !goog.isArrayLike(arr2) || arr1.length != arr2.length) {
    return false
  }
  var l = arr1.length;
  var equalsFn = opt_equalsFn || goog.array.defaultCompareEquality;
  for(var i = 0;i < l;i++) {
    if(!equalsFn(arr1[i], arr2[i])) {
      return false
    }
  }
  return true
};
goog.array.compare = function(arr1, arr2, opt_equalsFn) {
  return goog.array.equals(arr1, arr2, opt_equalsFn)
};
goog.array.defaultCompare = function(a, b) {
  return a > b ? 1 : a < b ? -1 : 0
};
goog.array.defaultCompareEquality = function(a, b) {
  return a === b
};
goog.array.binaryInsert = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  if(index < 0) {
    goog.array.insertAt(array, value, -(index + 1));
    return true
  }
  return false
};
goog.array.binaryRemove = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  return index >= 0 ? goog.array.removeAt(array, index) : false
};
goog.array.bucket = function(array, sorter) {
  var buckets = {};
  for(var i = 0;i < array.length;i++) {
    var value = array[i];
    var key = sorter(value, i, array);
    if(goog.isDef(key)) {
      var bucket = buckets[key] || (buckets[key] = []);
      bucket.push(value)
    }
  }
  return buckets
};
goog.array.repeat = function(value, n) {
  var array = [];
  for(var i = 0;i < n;i++) {
    array[i] = value
  }
  return array
};
goog.array.flatten = function(var_args) {
  var result = [];
  for(var i = 0;i < arguments.length;i++) {
    var element = arguments[i];
    if(goog.isArray(element)) {
      result.push.apply(result, goog.array.flatten.apply(null, element))
    }else {
      result.push(element)
    }
  }
  return result
};
goog.array.rotate = function(array, n) {
  goog.asserts.assert(array.length != null);
  if(array.length) {
    n %= array.length;
    if(n > 0) {
      goog.array.ARRAY_PROTOTYPE_.unshift.apply(array, array.splice(-n, n))
    }else {
      if(n < 0) {
        goog.array.ARRAY_PROTOTYPE_.push.apply(array, array.splice(0, -n))
      }
    }
  }
  return array
};
goog.array.zip = function(var_args) {
  if(!arguments.length) {
    return[]
  }
  var result = [];
  for(var i = 0;true;i++) {
    var value = [];
    for(var j = 0;j < arguments.length;j++) {
      var arr = arguments[j];
      if(i >= arr.length) {
        return result
      }
      value.push(arr[i])
    }
    result.push(value)
  }
};
goog.array.shuffle = function(arr, opt_randFn) {
  var randFn = opt_randFn || Math.random;
  for(var i = arr.length - 1;i > 0;i--) {
    var j = Math.floor(randFn() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp
  }
};
goog.provide("cljs.core");
goog.require("goog.string");
goog.require("goog.string.StringBuffer");
goog.require("goog.object");
goog.require("goog.array");
cljs.core._STAR_unchecked_if_STAR_ = false;
cljs.core._STAR_print_fn_STAR_ = function _STAR_print_fn_STAR_(_) {
  throw new Error("No *print-fn* fn set for evaluation environment");
};
void 0;
void 0;
void 0;
cljs.core.truth_ = function truth_(x) {
  return x != null && x !== false
};
cljs.core.type_satisfies_ = function type_satisfies_(p, x) {
  var or__3548__auto____3526 = p[goog.typeOf.call(null, x)];
  if(cljs.core.truth_(or__3548__auto____3526)) {
    return or__3548__auto____3526
  }else {
    var or__3548__auto____3527 = p["_"];
    if(cljs.core.truth_(or__3548__auto____3527)) {
      return or__3548__auto____3527
    }else {
      return false
    }
  }
};
cljs.core.is_proto_ = function is_proto_(x) {
  return x.constructor.prototype === x
};
cljs.core._STAR_main_cli_fn_STAR_ = null;
cljs.core.missing_protocol = function missing_protocol(proto, obj) {
  return Error("No protocol method " + proto + " defined for type " + goog.typeOf.call(null, obj) + ": " + obj)
};
cljs.core.aclone = function aclone(array_like) {
  return Array.prototype.slice.call(array_like)
};
cljs.core.array = function array(var_args) {
  return Array.prototype.slice.call(arguments)
};
cljs.core.make_array = function() {
  var make_array = null;
  var make_array__1 = function(size) {
    return new Array(size)
  };
  var make_array__2 = function(type, size) {
    return make_array.call(null, size)
  };
  make_array = function(type, size) {
    switch(arguments.length) {
      case 1:
        return make_array__1.call(this, type);
      case 2:
        return make_array__2.call(this, type, size)
    }
    throw"Invalid arity: " + arguments.length;
  };
  make_array.cljs$lang$arity$1 = make_array__1;
  make_array.cljs$lang$arity$2 = make_array__2;
  return make_array
}();
void 0;
cljs.core.aget = function() {
  var aget = null;
  var aget__2 = function(array, i) {
    return array[i]
  };
  var aget__3 = function() {
    var G__3528__delegate = function(array, i, idxs) {
      return cljs.core.apply.call(null, aget, aget.call(null, array, i), idxs)
    };
    var G__3528 = function(array, i, var_args) {
      var idxs = null;
      if(goog.isDef(var_args)) {
        idxs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3528__delegate.call(this, array, i, idxs)
    };
    G__3528.cljs$lang$maxFixedArity = 2;
    G__3528.cljs$lang$applyTo = function(arglist__3529) {
      var array = cljs.core.first(arglist__3529);
      var i = cljs.core.first(cljs.core.next(arglist__3529));
      var idxs = cljs.core.rest(cljs.core.next(arglist__3529));
      return G__3528__delegate.call(this, array, i, idxs)
    };
    return G__3528
  }();
  aget = function(array, i, var_args) {
    var idxs = var_args;
    switch(arguments.length) {
      case 2:
        return aget__2.call(this, array, i);
      default:
        return aget__3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  aget.cljs$lang$maxFixedArity = 2;
  aget.cljs$lang$applyTo = aget__3.cljs$lang$applyTo;
  aget.cljs$lang$arity$2 = aget__2;
  aget.cljs$lang$arity$3 = aget__3;
  return aget
}();
cljs.core.aset = function aset(array, i, val) {
  return array[i] = val
};
cljs.core.alength = function alength(array) {
  return array.length
};
void 0;
cljs.core.into_array = function() {
  var into_array = null;
  var into_array__1 = function(aseq) {
    return into_array.call(null, null, aseq)
  };
  var into_array__2 = function(type, aseq) {
    return cljs.core.reduce.call(null, function(a, x) {
      a.push(x);
      return a
    }, [], aseq)
  };
  into_array = function(type, aseq) {
    switch(arguments.length) {
      case 1:
        return into_array__1.call(this, type);
      case 2:
        return into_array__2.call(this, type, aseq)
    }
    throw"Invalid arity: " + arguments.length;
  };
  into_array.cljs$lang$arity$1 = into_array__1;
  into_array.cljs$lang$arity$2 = into_array__2;
  return into_array
}();
void 0;
cljs.core.IFn = {};
cljs.core._invoke = function() {
  var _invoke = null;
  var _invoke__1 = function(this$) {
    if(function() {
      var and__3546__auto____3530 = this$;
      if(and__3546__auto____3530) {
        return this$.cljs$core$IFn$_invoke$arity$1
      }else {
        return and__3546__auto____3530
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$1(this$)
    }else {
      return function() {
        var or__3548__auto____3531 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3531) {
          return or__3548__auto____3531
        }else {
          var or__3548__auto____3532 = cljs.core._invoke["_"];
          if(or__3548__auto____3532) {
            return or__3548__auto____3532
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$)
    }
  };
  var _invoke__2 = function(this$, a) {
    if(function() {
      var and__3546__auto____3533 = this$;
      if(and__3546__auto____3533) {
        return this$.cljs$core$IFn$_invoke$arity$2
      }else {
        return and__3546__auto____3533
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$2(this$, a)
    }else {
      return function() {
        var or__3548__auto____3534 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3534) {
          return or__3548__auto____3534
        }else {
          var or__3548__auto____3535 = cljs.core._invoke["_"];
          if(or__3548__auto____3535) {
            return or__3548__auto____3535
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a)
    }
  };
  var _invoke__3 = function(this$, a, b) {
    if(function() {
      var and__3546__auto____3536 = this$;
      if(and__3546__auto____3536) {
        return this$.cljs$core$IFn$_invoke$arity$3
      }else {
        return and__3546__auto____3536
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$3(this$, a, b)
    }else {
      return function() {
        var or__3548__auto____3537 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3537) {
          return or__3548__auto____3537
        }else {
          var or__3548__auto____3538 = cljs.core._invoke["_"];
          if(or__3548__auto____3538) {
            return or__3548__auto____3538
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b)
    }
  };
  var _invoke__4 = function(this$, a, b, c) {
    if(function() {
      var and__3546__auto____3539 = this$;
      if(and__3546__auto____3539) {
        return this$.cljs$core$IFn$_invoke$arity$4
      }else {
        return and__3546__auto____3539
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$4(this$, a, b, c)
    }else {
      return function() {
        var or__3548__auto____3540 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3540) {
          return or__3548__auto____3540
        }else {
          var or__3548__auto____3541 = cljs.core._invoke["_"];
          if(or__3548__auto____3541) {
            return or__3548__auto____3541
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c)
    }
  };
  var _invoke__5 = function(this$, a, b, c, d) {
    if(function() {
      var and__3546__auto____3542 = this$;
      if(and__3546__auto____3542) {
        return this$.cljs$core$IFn$_invoke$arity$5
      }else {
        return and__3546__auto____3542
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$5(this$, a, b, c, d)
    }else {
      return function() {
        var or__3548__auto____3543 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3543) {
          return or__3548__auto____3543
        }else {
          var or__3548__auto____3544 = cljs.core._invoke["_"];
          if(or__3548__auto____3544) {
            return or__3548__auto____3544
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d)
    }
  };
  var _invoke__6 = function(this$, a, b, c, d, e) {
    if(function() {
      var and__3546__auto____3545 = this$;
      if(and__3546__auto____3545) {
        return this$.cljs$core$IFn$_invoke$arity$6
      }else {
        return and__3546__auto____3545
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$6(this$, a, b, c, d, e)
    }else {
      return function() {
        var or__3548__auto____3546 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3546) {
          return or__3548__auto____3546
        }else {
          var or__3548__auto____3547 = cljs.core._invoke["_"];
          if(or__3548__auto____3547) {
            return or__3548__auto____3547
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e)
    }
  };
  var _invoke__7 = function(this$, a, b, c, d, e, f) {
    if(function() {
      var and__3546__auto____3548 = this$;
      if(and__3546__auto____3548) {
        return this$.cljs$core$IFn$_invoke$arity$7
      }else {
        return and__3546__auto____3548
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$7(this$, a, b, c, d, e, f)
    }else {
      return function() {
        var or__3548__auto____3549 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3549) {
          return or__3548__auto____3549
        }else {
          var or__3548__auto____3550 = cljs.core._invoke["_"];
          if(or__3548__auto____3550) {
            return or__3548__auto____3550
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f)
    }
  };
  var _invoke__8 = function(this$, a, b, c, d, e, f, g) {
    if(function() {
      var and__3546__auto____3551 = this$;
      if(and__3546__auto____3551) {
        return this$.cljs$core$IFn$_invoke$arity$8
      }else {
        return and__3546__auto____3551
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$8(this$, a, b, c, d, e, f, g)
    }else {
      return function() {
        var or__3548__auto____3552 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3552) {
          return or__3548__auto____3552
        }else {
          var or__3548__auto____3553 = cljs.core._invoke["_"];
          if(or__3548__auto____3553) {
            return or__3548__auto____3553
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g)
    }
  };
  var _invoke__9 = function(this$, a, b, c, d, e, f, g, h) {
    if(function() {
      var and__3546__auto____3554 = this$;
      if(and__3546__auto____3554) {
        return this$.cljs$core$IFn$_invoke$arity$9
      }else {
        return and__3546__auto____3554
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$9(this$, a, b, c, d, e, f, g, h)
    }else {
      return function() {
        var or__3548__auto____3555 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3555) {
          return or__3548__auto____3555
        }else {
          var or__3548__auto____3556 = cljs.core._invoke["_"];
          if(or__3548__auto____3556) {
            return or__3548__auto____3556
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h)
    }
  };
  var _invoke__10 = function(this$, a, b, c, d, e, f, g, h, i) {
    if(function() {
      var and__3546__auto____3557 = this$;
      if(and__3546__auto____3557) {
        return this$.cljs$core$IFn$_invoke$arity$10
      }else {
        return and__3546__auto____3557
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$10(this$, a, b, c, d, e, f, g, h, i)
    }else {
      return function() {
        var or__3548__auto____3558 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3558) {
          return or__3548__auto____3558
        }else {
          var or__3548__auto____3559 = cljs.core._invoke["_"];
          if(or__3548__auto____3559) {
            return or__3548__auto____3559
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i)
    }
  };
  var _invoke__11 = function(this$, a, b, c, d, e, f, g, h, i, j) {
    if(function() {
      var and__3546__auto____3560 = this$;
      if(and__3546__auto____3560) {
        return this$.cljs$core$IFn$_invoke$arity$11
      }else {
        return and__3546__auto____3560
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$11(this$, a, b, c, d, e, f, g, h, i, j)
    }else {
      return function() {
        var or__3548__auto____3561 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3561) {
          return or__3548__auto____3561
        }else {
          var or__3548__auto____3562 = cljs.core._invoke["_"];
          if(or__3548__auto____3562) {
            return or__3548__auto____3562
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j)
    }
  };
  var _invoke__12 = function(this$, a, b, c, d, e, f, g, h, i, j, k) {
    if(function() {
      var and__3546__auto____3563 = this$;
      if(and__3546__auto____3563) {
        return this$.cljs$core$IFn$_invoke$arity$12
      }else {
        return and__3546__auto____3563
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$12(this$, a, b, c, d, e, f, g, h, i, j, k)
    }else {
      return function() {
        var or__3548__auto____3564 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3564) {
          return or__3548__auto____3564
        }else {
          var or__3548__auto____3565 = cljs.core._invoke["_"];
          if(or__3548__auto____3565) {
            return or__3548__auto____3565
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k)
    }
  };
  var _invoke__13 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l) {
    if(function() {
      var and__3546__auto____3566 = this$;
      if(and__3546__auto____3566) {
        return this$.cljs$core$IFn$_invoke$arity$13
      }else {
        return and__3546__auto____3566
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$13(this$, a, b, c, d, e, f, g, h, i, j, k, l)
    }else {
      return function() {
        var or__3548__auto____3567 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3567) {
          return or__3548__auto____3567
        }else {
          var or__3548__auto____3568 = cljs.core._invoke["_"];
          if(or__3548__auto____3568) {
            return or__3548__auto____3568
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l)
    }
  };
  var _invoke__14 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m) {
    if(function() {
      var and__3546__auto____3569 = this$;
      if(and__3546__auto____3569) {
        return this$.cljs$core$IFn$_invoke$arity$14
      }else {
        return and__3546__auto____3569
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$14(this$, a, b, c, d, e, f, g, h, i, j, k, l, m)
    }else {
      return function() {
        var or__3548__auto____3570 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3570) {
          return or__3548__auto____3570
        }else {
          var or__3548__auto____3571 = cljs.core._invoke["_"];
          if(or__3548__auto____3571) {
            return or__3548__auto____3571
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m)
    }
  };
  var _invoke__15 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n) {
    if(function() {
      var and__3546__auto____3572 = this$;
      if(and__3546__auto____3572) {
        return this$.cljs$core$IFn$_invoke$arity$15
      }else {
        return and__3546__auto____3572
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$15(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n)
    }else {
      return function() {
        var or__3548__auto____3573 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3573) {
          return or__3548__auto____3573
        }else {
          var or__3548__auto____3574 = cljs.core._invoke["_"];
          if(or__3548__auto____3574) {
            return or__3548__auto____3574
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n)
    }
  };
  var _invoke__16 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o) {
    if(function() {
      var and__3546__auto____3575 = this$;
      if(and__3546__auto____3575) {
        return this$.cljs$core$IFn$_invoke$arity$16
      }else {
        return and__3546__auto____3575
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$16(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o)
    }else {
      return function() {
        var or__3548__auto____3576 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3576) {
          return or__3548__auto____3576
        }else {
          var or__3548__auto____3577 = cljs.core._invoke["_"];
          if(or__3548__auto____3577) {
            return or__3548__auto____3577
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o)
    }
  };
  var _invoke__17 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p) {
    if(function() {
      var and__3546__auto____3578 = this$;
      if(and__3546__auto____3578) {
        return this$.cljs$core$IFn$_invoke$arity$17
      }else {
        return and__3546__auto____3578
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$17(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p)
    }else {
      return function() {
        var or__3548__auto____3579 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3579) {
          return or__3548__auto____3579
        }else {
          var or__3548__auto____3580 = cljs.core._invoke["_"];
          if(or__3548__auto____3580) {
            return or__3548__auto____3580
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p)
    }
  };
  var _invoke__18 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q) {
    if(function() {
      var and__3546__auto____3581 = this$;
      if(and__3546__auto____3581) {
        return this$.cljs$core$IFn$_invoke$arity$18
      }else {
        return and__3546__auto____3581
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$18(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q)
    }else {
      return function() {
        var or__3548__auto____3582 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3582) {
          return or__3548__auto____3582
        }else {
          var or__3548__auto____3583 = cljs.core._invoke["_"];
          if(or__3548__auto____3583) {
            return or__3548__auto____3583
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q)
    }
  };
  var _invoke__19 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s) {
    if(function() {
      var and__3546__auto____3584 = this$;
      if(and__3546__auto____3584) {
        return this$.cljs$core$IFn$_invoke$arity$19
      }else {
        return and__3546__auto____3584
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$19(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s)
    }else {
      return function() {
        var or__3548__auto____3585 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3585) {
          return or__3548__auto____3585
        }else {
          var or__3548__auto____3586 = cljs.core._invoke["_"];
          if(or__3548__auto____3586) {
            return or__3548__auto____3586
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s)
    }
  };
  var _invoke__20 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t) {
    if(function() {
      var and__3546__auto____3587 = this$;
      if(and__3546__auto____3587) {
        return this$.cljs$core$IFn$_invoke$arity$20
      }else {
        return and__3546__auto____3587
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$20(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t)
    }else {
      return function() {
        var or__3548__auto____3588 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3588) {
          return or__3548__auto____3588
        }else {
          var or__3548__auto____3589 = cljs.core._invoke["_"];
          if(or__3548__auto____3589) {
            return or__3548__auto____3589
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t)
    }
  };
  var _invoke__21 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest) {
    if(function() {
      var and__3546__auto____3590 = this$;
      if(and__3546__auto____3590) {
        return this$.cljs$core$IFn$_invoke$arity$21
      }else {
        return and__3546__auto____3590
      }
    }()) {
      return this$.cljs$core$IFn$_invoke$arity$21(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest)
    }else {
      return function() {
        var or__3548__auto____3591 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(or__3548__auto____3591) {
          return or__3548__auto____3591
        }else {
          var or__3548__auto____3592 = cljs.core._invoke["_"];
          if(or__3548__auto____3592) {
            return or__3548__auto____3592
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest)
    }
  };
  _invoke = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest) {
    switch(arguments.length) {
      case 1:
        return _invoke__1.call(this, this$);
      case 2:
        return _invoke__2.call(this, this$, a);
      case 3:
        return _invoke__3.call(this, this$, a, b);
      case 4:
        return _invoke__4.call(this, this$, a, b, c);
      case 5:
        return _invoke__5.call(this, this$, a, b, c, d);
      case 6:
        return _invoke__6.call(this, this$, a, b, c, d, e);
      case 7:
        return _invoke__7.call(this, this$, a, b, c, d, e, f);
      case 8:
        return _invoke__8.call(this, this$, a, b, c, d, e, f, g);
      case 9:
        return _invoke__9.call(this, this$, a, b, c, d, e, f, g, h);
      case 10:
        return _invoke__10.call(this, this$, a, b, c, d, e, f, g, h, i);
      case 11:
        return _invoke__11.call(this, this$, a, b, c, d, e, f, g, h, i, j);
      case 12:
        return _invoke__12.call(this, this$, a, b, c, d, e, f, g, h, i, j, k);
      case 13:
        return _invoke__13.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l);
      case 14:
        return _invoke__14.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m);
      case 15:
        return _invoke__15.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n);
      case 16:
        return _invoke__16.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o);
      case 17:
        return _invoke__17.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p);
      case 18:
        return _invoke__18.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q);
      case 19:
        return _invoke__19.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s);
      case 20:
        return _invoke__20.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t);
      case 21:
        return _invoke__21.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _invoke.cljs$lang$arity$1 = _invoke__1;
  _invoke.cljs$lang$arity$2 = _invoke__2;
  _invoke.cljs$lang$arity$3 = _invoke__3;
  _invoke.cljs$lang$arity$4 = _invoke__4;
  _invoke.cljs$lang$arity$5 = _invoke__5;
  _invoke.cljs$lang$arity$6 = _invoke__6;
  _invoke.cljs$lang$arity$7 = _invoke__7;
  _invoke.cljs$lang$arity$8 = _invoke__8;
  _invoke.cljs$lang$arity$9 = _invoke__9;
  _invoke.cljs$lang$arity$10 = _invoke__10;
  _invoke.cljs$lang$arity$11 = _invoke__11;
  _invoke.cljs$lang$arity$12 = _invoke__12;
  _invoke.cljs$lang$arity$13 = _invoke__13;
  _invoke.cljs$lang$arity$14 = _invoke__14;
  _invoke.cljs$lang$arity$15 = _invoke__15;
  _invoke.cljs$lang$arity$16 = _invoke__16;
  _invoke.cljs$lang$arity$17 = _invoke__17;
  _invoke.cljs$lang$arity$18 = _invoke__18;
  _invoke.cljs$lang$arity$19 = _invoke__19;
  _invoke.cljs$lang$arity$20 = _invoke__20;
  _invoke.cljs$lang$arity$21 = _invoke__21;
  return _invoke
}();
void 0;
void 0;
cljs.core.ICounted = {};
cljs.core._count = function _count(coll) {
  if(function() {
    var and__3546__auto____3593 = coll;
    if(and__3546__auto____3593) {
      return coll.cljs$core$ICounted$_count$arity$1
    }else {
      return and__3546__auto____3593
    }
  }()) {
    return coll.cljs$core$ICounted$_count$arity$1(coll)
  }else {
    return function() {
      var or__3548__auto____3594 = cljs.core._count[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3594) {
        return or__3548__auto____3594
      }else {
        var or__3548__auto____3595 = cljs.core._count["_"];
        if(or__3548__auto____3595) {
          return or__3548__auto____3595
        }else {
          throw cljs.core.missing_protocol.call(null, "ICounted.-count", coll);
        }
      }
    }().call(null, coll)
  }
};
void 0;
void 0;
cljs.core.IEmptyableCollection = {};
cljs.core._empty = function _empty(coll) {
  if(function() {
    var and__3546__auto____3596 = coll;
    if(and__3546__auto____3596) {
      return coll.cljs$core$IEmptyableCollection$_empty$arity$1
    }else {
      return and__3546__auto____3596
    }
  }()) {
    return coll.cljs$core$IEmptyableCollection$_empty$arity$1(coll)
  }else {
    return function() {
      var or__3548__auto____3597 = cljs.core._empty[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3597) {
        return or__3548__auto____3597
      }else {
        var or__3548__auto____3598 = cljs.core._empty["_"];
        if(or__3548__auto____3598) {
          return or__3548__auto____3598
        }else {
          throw cljs.core.missing_protocol.call(null, "IEmptyableCollection.-empty", coll);
        }
      }
    }().call(null, coll)
  }
};
void 0;
void 0;
cljs.core.ICollection = {};
cljs.core._conj = function _conj(coll, o) {
  if(function() {
    var and__3546__auto____3599 = coll;
    if(and__3546__auto____3599) {
      return coll.cljs$core$ICollection$_conj$arity$2
    }else {
      return and__3546__auto____3599
    }
  }()) {
    return coll.cljs$core$ICollection$_conj$arity$2(coll, o)
  }else {
    return function() {
      var or__3548__auto____3600 = cljs.core._conj[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3600) {
        return or__3548__auto____3600
      }else {
        var or__3548__auto____3601 = cljs.core._conj["_"];
        if(or__3548__auto____3601) {
          return or__3548__auto____3601
        }else {
          throw cljs.core.missing_protocol.call(null, "ICollection.-conj", coll);
        }
      }
    }().call(null, coll, o)
  }
};
void 0;
void 0;
cljs.core.IIndexed = {};
cljs.core._nth = function() {
  var _nth = null;
  var _nth__2 = function(coll, n) {
    if(function() {
      var and__3546__auto____3602 = coll;
      if(and__3546__auto____3602) {
        return coll.cljs$core$IIndexed$_nth$arity$2
      }else {
        return and__3546__auto____3602
      }
    }()) {
      return coll.cljs$core$IIndexed$_nth$arity$2(coll, n)
    }else {
      return function() {
        var or__3548__auto____3603 = cljs.core._nth[goog.typeOf.call(null, coll)];
        if(or__3548__auto____3603) {
          return or__3548__auto____3603
        }else {
          var or__3548__auto____3604 = cljs.core._nth["_"];
          if(or__3548__auto____3604) {
            return or__3548__auto____3604
          }else {
            throw cljs.core.missing_protocol.call(null, "IIndexed.-nth", coll);
          }
        }
      }().call(null, coll, n)
    }
  };
  var _nth__3 = function(coll, n, not_found) {
    if(function() {
      var and__3546__auto____3605 = coll;
      if(and__3546__auto____3605) {
        return coll.cljs$core$IIndexed$_nth$arity$3
      }else {
        return and__3546__auto____3605
      }
    }()) {
      return coll.cljs$core$IIndexed$_nth$arity$3(coll, n, not_found)
    }else {
      return function() {
        var or__3548__auto____3606 = cljs.core._nth[goog.typeOf.call(null, coll)];
        if(or__3548__auto____3606) {
          return or__3548__auto____3606
        }else {
          var or__3548__auto____3607 = cljs.core._nth["_"];
          if(or__3548__auto____3607) {
            return or__3548__auto____3607
          }else {
            throw cljs.core.missing_protocol.call(null, "IIndexed.-nth", coll);
          }
        }
      }().call(null, coll, n, not_found)
    }
  };
  _nth = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return _nth__2.call(this, coll, n);
      case 3:
        return _nth__3.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _nth.cljs$lang$arity$2 = _nth__2;
  _nth.cljs$lang$arity$3 = _nth__3;
  return _nth
}();
void 0;
void 0;
cljs.core.ISeq = {};
cljs.core._first = function _first(coll) {
  if(function() {
    var and__3546__auto____3608 = coll;
    if(and__3546__auto____3608) {
      return coll.cljs$core$ISeq$_first$arity$1
    }else {
      return and__3546__auto____3608
    }
  }()) {
    return coll.cljs$core$ISeq$_first$arity$1(coll)
  }else {
    return function() {
      var or__3548__auto____3609 = cljs.core._first[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3609) {
        return or__3548__auto____3609
      }else {
        var or__3548__auto____3610 = cljs.core._first["_"];
        if(or__3548__auto____3610) {
          return or__3548__auto____3610
        }else {
          throw cljs.core.missing_protocol.call(null, "ISeq.-first", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core._rest = function _rest(coll) {
  if(function() {
    var and__3546__auto____3611 = coll;
    if(and__3546__auto____3611) {
      return coll.cljs$core$ISeq$_rest$arity$1
    }else {
      return and__3546__auto____3611
    }
  }()) {
    return coll.cljs$core$ISeq$_rest$arity$1(coll)
  }else {
    return function() {
      var or__3548__auto____3612 = cljs.core._rest[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3612) {
        return or__3548__auto____3612
      }else {
        var or__3548__auto____3613 = cljs.core._rest["_"];
        if(or__3548__auto____3613) {
          return or__3548__auto____3613
        }else {
          throw cljs.core.missing_protocol.call(null, "ISeq.-rest", coll);
        }
      }
    }().call(null, coll)
  }
};
void 0;
void 0;
cljs.core.ILookup = {};
cljs.core._lookup = function() {
  var _lookup = null;
  var _lookup__2 = function(o, k) {
    if(function() {
      var and__3546__auto____3614 = o;
      if(and__3546__auto____3614) {
        return o.cljs$core$ILookup$_lookup$arity$2
      }else {
        return and__3546__auto____3614
      }
    }()) {
      return o.cljs$core$ILookup$_lookup$arity$2(o, k)
    }else {
      return function() {
        var or__3548__auto____3615 = cljs.core._lookup[goog.typeOf.call(null, o)];
        if(or__3548__auto____3615) {
          return or__3548__auto____3615
        }else {
          var or__3548__auto____3616 = cljs.core._lookup["_"];
          if(or__3548__auto____3616) {
            return or__3548__auto____3616
          }else {
            throw cljs.core.missing_protocol.call(null, "ILookup.-lookup", o);
          }
        }
      }().call(null, o, k)
    }
  };
  var _lookup__3 = function(o, k, not_found) {
    if(function() {
      var and__3546__auto____3617 = o;
      if(and__3546__auto____3617) {
        return o.cljs$core$ILookup$_lookup$arity$3
      }else {
        return and__3546__auto____3617
      }
    }()) {
      return o.cljs$core$ILookup$_lookup$arity$3(o, k, not_found)
    }else {
      return function() {
        var or__3548__auto____3618 = cljs.core._lookup[goog.typeOf.call(null, o)];
        if(or__3548__auto____3618) {
          return or__3548__auto____3618
        }else {
          var or__3548__auto____3619 = cljs.core._lookup["_"];
          if(or__3548__auto____3619) {
            return or__3548__auto____3619
          }else {
            throw cljs.core.missing_protocol.call(null, "ILookup.-lookup", o);
          }
        }
      }().call(null, o, k, not_found)
    }
  };
  _lookup = function(o, k, not_found) {
    switch(arguments.length) {
      case 2:
        return _lookup__2.call(this, o, k);
      case 3:
        return _lookup__3.call(this, o, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _lookup.cljs$lang$arity$2 = _lookup__2;
  _lookup.cljs$lang$arity$3 = _lookup__3;
  return _lookup
}();
void 0;
void 0;
cljs.core.IAssociative = {};
cljs.core._contains_key_QMARK_ = function _contains_key_QMARK_(coll, k) {
  if(function() {
    var and__3546__auto____3620 = coll;
    if(and__3546__auto____3620) {
      return coll.cljs$core$IAssociative$_contains_key_QMARK_$arity$2
    }else {
      return and__3546__auto____3620
    }
  }()) {
    return coll.cljs$core$IAssociative$_contains_key_QMARK_$arity$2(coll, k)
  }else {
    return function() {
      var or__3548__auto____3621 = cljs.core._contains_key_QMARK_[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3621) {
        return or__3548__auto____3621
      }else {
        var or__3548__auto____3622 = cljs.core._contains_key_QMARK_["_"];
        if(or__3548__auto____3622) {
          return or__3548__auto____3622
        }else {
          throw cljs.core.missing_protocol.call(null, "IAssociative.-contains-key?", coll);
        }
      }
    }().call(null, coll, k)
  }
};
cljs.core._assoc = function _assoc(coll, k, v) {
  if(function() {
    var and__3546__auto____3623 = coll;
    if(and__3546__auto____3623) {
      return coll.cljs$core$IAssociative$_assoc$arity$3
    }else {
      return and__3546__auto____3623
    }
  }()) {
    return coll.cljs$core$IAssociative$_assoc$arity$3(coll, k, v)
  }else {
    return function() {
      var or__3548__auto____3624 = cljs.core._assoc[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3624) {
        return or__3548__auto____3624
      }else {
        var or__3548__auto____3625 = cljs.core._assoc["_"];
        if(or__3548__auto____3625) {
          return or__3548__auto____3625
        }else {
          throw cljs.core.missing_protocol.call(null, "IAssociative.-assoc", coll);
        }
      }
    }().call(null, coll, k, v)
  }
};
void 0;
void 0;
cljs.core.IMap = {};
cljs.core._dissoc = function _dissoc(coll, k) {
  if(function() {
    var and__3546__auto____3626 = coll;
    if(and__3546__auto____3626) {
      return coll.cljs$core$IMap$_dissoc$arity$2
    }else {
      return and__3546__auto____3626
    }
  }()) {
    return coll.cljs$core$IMap$_dissoc$arity$2(coll, k)
  }else {
    return function() {
      var or__3548__auto____3627 = cljs.core._dissoc[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3627) {
        return or__3548__auto____3627
      }else {
        var or__3548__auto____3628 = cljs.core._dissoc["_"];
        if(or__3548__auto____3628) {
          return or__3548__auto____3628
        }else {
          throw cljs.core.missing_protocol.call(null, "IMap.-dissoc", coll);
        }
      }
    }().call(null, coll, k)
  }
};
void 0;
void 0;
cljs.core.IMapEntry = {};
cljs.core._key = function _key(coll) {
  if(function() {
    var and__3546__auto____3629 = coll;
    if(and__3546__auto____3629) {
      return coll.cljs$core$IMapEntry$_key$arity$1
    }else {
      return and__3546__auto____3629
    }
  }()) {
    return coll.cljs$core$IMapEntry$_key$arity$1(coll)
  }else {
    return function() {
      var or__3548__auto____3630 = cljs.core._key[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3630) {
        return or__3548__auto____3630
      }else {
        var or__3548__auto____3631 = cljs.core._key["_"];
        if(or__3548__auto____3631) {
          return or__3548__auto____3631
        }else {
          throw cljs.core.missing_protocol.call(null, "IMapEntry.-key", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core._val = function _val(coll) {
  if(function() {
    var and__3546__auto____3632 = coll;
    if(and__3546__auto____3632) {
      return coll.cljs$core$IMapEntry$_val$arity$1
    }else {
      return and__3546__auto____3632
    }
  }()) {
    return coll.cljs$core$IMapEntry$_val$arity$1(coll)
  }else {
    return function() {
      var or__3548__auto____3633 = cljs.core._val[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3633) {
        return or__3548__auto____3633
      }else {
        var or__3548__auto____3634 = cljs.core._val["_"];
        if(or__3548__auto____3634) {
          return or__3548__auto____3634
        }else {
          throw cljs.core.missing_protocol.call(null, "IMapEntry.-val", coll);
        }
      }
    }().call(null, coll)
  }
};
void 0;
void 0;
cljs.core.ISet = {};
cljs.core._disjoin = function _disjoin(coll, v) {
  if(function() {
    var and__3546__auto____3635 = coll;
    if(and__3546__auto____3635) {
      return coll.cljs$core$ISet$_disjoin$arity$2
    }else {
      return and__3546__auto____3635
    }
  }()) {
    return coll.cljs$core$ISet$_disjoin$arity$2(coll, v)
  }else {
    return function() {
      var or__3548__auto____3636 = cljs.core._disjoin[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3636) {
        return or__3548__auto____3636
      }else {
        var or__3548__auto____3637 = cljs.core._disjoin["_"];
        if(or__3548__auto____3637) {
          return or__3548__auto____3637
        }else {
          throw cljs.core.missing_protocol.call(null, "ISet.-disjoin", coll);
        }
      }
    }().call(null, coll, v)
  }
};
void 0;
void 0;
cljs.core.IStack = {};
cljs.core._peek = function _peek(coll) {
  if(function() {
    var and__3546__auto____3638 = coll;
    if(and__3546__auto____3638) {
      return coll.cljs$core$IStack$_peek$arity$1
    }else {
      return and__3546__auto____3638
    }
  }()) {
    return coll.cljs$core$IStack$_peek$arity$1(coll)
  }else {
    return function() {
      var or__3548__auto____3639 = cljs.core._peek[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3639) {
        return or__3548__auto____3639
      }else {
        var or__3548__auto____3640 = cljs.core._peek["_"];
        if(or__3548__auto____3640) {
          return or__3548__auto____3640
        }else {
          throw cljs.core.missing_protocol.call(null, "IStack.-peek", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core._pop = function _pop(coll) {
  if(function() {
    var and__3546__auto____3641 = coll;
    if(and__3546__auto____3641) {
      return coll.cljs$core$IStack$_pop$arity$1
    }else {
      return and__3546__auto____3641
    }
  }()) {
    return coll.cljs$core$IStack$_pop$arity$1(coll)
  }else {
    return function() {
      var or__3548__auto____3642 = cljs.core._pop[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3642) {
        return or__3548__auto____3642
      }else {
        var or__3548__auto____3643 = cljs.core._pop["_"];
        if(or__3548__auto____3643) {
          return or__3548__auto____3643
        }else {
          throw cljs.core.missing_protocol.call(null, "IStack.-pop", coll);
        }
      }
    }().call(null, coll)
  }
};
void 0;
void 0;
cljs.core.IVector = {};
cljs.core._assoc_n = function _assoc_n(coll, n, val) {
  if(function() {
    var and__3546__auto____3644 = coll;
    if(and__3546__auto____3644) {
      return coll.cljs$core$IVector$_assoc_n$arity$3
    }else {
      return and__3546__auto____3644
    }
  }()) {
    return coll.cljs$core$IVector$_assoc_n$arity$3(coll, n, val)
  }else {
    return function() {
      var or__3548__auto____3645 = cljs.core._assoc_n[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3645) {
        return or__3548__auto____3645
      }else {
        var or__3548__auto____3646 = cljs.core._assoc_n["_"];
        if(or__3548__auto____3646) {
          return or__3548__auto____3646
        }else {
          throw cljs.core.missing_protocol.call(null, "IVector.-assoc-n", coll);
        }
      }
    }().call(null, coll, n, val)
  }
};
void 0;
void 0;
cljs.core.IDeref = {};
cljs.core._deref = function _deref(o) {
  if(function() {
    var and__3546__auto____3647 = o;
    if(and__3546__auto____3647) {
      return o.cljs$core$IDeref$_deref$arity$1
    }else {
      return and__3546__auto____3647
    }
  }()) {
    return o.cljs$core$IDeref$_deref$arity$1(o)
  }else {
    return function() {
      var or__3548__auto____3648 = cljs.core._deref[goog.typeOf.call(null, o)];
      if(or__3548__auto____3648) {
        return or__3548__auto____3648
      }else {
        var or__3548__auto____3649 = cljs.core._deref["_"];
        if(or__3548__auto____3649) {
          return or__3548__auto____3649
        }else {
          throw cljs.core.missing_protocol.call(null, "IDeref.-deref", o);
        }
      }
    }().call(null, o)
  }
};
void 0;
void 0;
cljs.core.IDerefWithTimeout = {};
cljs.core._deref_with_timeout = function _deref_with_timeout(o, msec, timeout_val) {
  if(function() {
    var and__3546__auto____3650 = o;
    if(and__3546__auto____3650) {
      return o.cljs$core$IDerefWithTimeout$_deref_with_timeout$arity$3
    }else {
      return and__3546__auto____3650
    }
  }()) {
    return o.cljs$core$IDerefWithTimeout$_deref_with_timeout$arity$3(o, msec, timeout_val)
  }else {
    return function() {
      var or__3548__auto____3651 = cljs.core._deref_with_timeout[goog.typeOf.call(null, o)];
      if(or__3548__auto____3651) {
        return or__3548__auto____3651
      }else {
        var or__3548__auto____3652 = cljs.core._deref_with_timeout["_"];
        if(or__3548__auto____3652) {
          return or__3548__auto____3652
        }else {
          throw cljs.core.missing_protocol.call(null, "IDerefWithTimeout.-deref-with-timeout", o);
        }
      }
    }().call(null, o, msec, timeout_val)
  }
};
void 0;
void 0;
cljs.core.IMeta = {};
cljs.core._meta = function _meta(o) {
  if(function() {
    var and__3546__auto____3653 = o;
    if(and__3546__auto____3653) {
      return o.cljs$core$IMeta$_meta$arity$1
    }else {
      return and__3546__auto____3653
    }
  }()) {
    return o.cljs$core$IMeta$_meta$arity$1(o)
  }else {
    return function() {
      var or__3548__auto____3654 = cljs.core._meta[goog.typeOf.call(null, o)];
      if(or__3548__auto____3654) {
        return or__3548__auto____3654
      }else {
        var or__3548__auto____3655 = cljs.core._meta["_"];
        if(or__3548__auto____3655) {
          return or__3548__auto____3655
        }else {
          throw cljs.core.missing_protocol.call(null, "IMeta.-meta", o);
        }
      }
    }().call(null, o)
  }
};
void 0;
void 0;
cljs.core.IWithMeta = {};
cljs.core._with_meta = function _with_meta(o, meta) {
  if(function() {
    var and__3546__auto____3656 = o;
    if(and__3546__auto____3656) {
      return o.cljs$core$IWithMeta$_with_meta$arity$2
    }else {
      return and__3546__auto____3656
    }
  }()) {
    return o.cljs$core$IWithMeta$_with_meta$arity$2(o, meta)
  }else {
    return function() {
      var or__3548__auto____3657 = cljs.core._with_meta[goog.typeOf.call(null, o)];
      if(or__3548__auto____3657) {
        return or__3548__auto____3657
      }else {
        var or__3548__auto____3658 = cljs.core._with_meta["_"];
        if(or__3548__auto____3658) {
          return or__3548__auto____3658
        }else {
          throw cljs.core.missing_protocol.call(null, "IWithMeta.-with-meta", o);
        }
      }
    }().call(null, o, meta)
  }
};
void 0;
void 0;
cljs.core.IReduce = {};
cljs.core._reduce = function() {
  var _reduce = null;
  var _reduce__2 = function(coll, f) {
    if(function() {
      var and__3546__auto____3659 = coll;
      if(and__3546__auto____3659) {
        return coll.cljs$core$IReduce$_reduce$arity$2
      }else {
        return and__3546__auto____3659
      }
    }()) {
      return coll.cljs$core$IReduce$_reduce$arity$2(coll, f)
    }else {
      return function() {
        var or__3548__auto____3660 = cljs.core._reduce[goog.typeOf.call(null, coll)];
        if(or__3548__auto____3660) {
          return or__3548__auto____3660
        }else {
          var or__3548__auto____3661 = cljs.core._reduce["_"];
          if(or__3548__auto____3661) {
            return or__3548__auto____3661
          }else {
            throw cljs.core.missing_protocol.call(null, "IReduce.-reduce", coll);
          }
        }
      }().call(null, coll, f)
    }
  };
  var _reduce__3 = function(coll, f, start) {
    if(function() {
      var and__3546__auto____3662 = coll;
      if(and__3546__auto____3662) {
        return coll.cljs$core$IReduce$_reduce$arity$3
      }else {
        return and__3546__auto____3662
      }
    }()) {
      return coll.cljs$core$IReduce$_reduce$arity$3(coll, f, start)
    }else {
      return function() {
        var or__3548__auto____3663 = cljs.core._reduce[goog.typeOf.call(null, coll)];
        if(or__3548__auto____3663) {
          return or__3548__auto____3663
        }else {
          var or__3548__auto____3664 = cljs.core._reduce["_"];
          if(or__3548__auto____3664) {
            return or__3548__auto____3664
          }else {
            throw cljs.core.missing_protocol.call(null, "IReduce.-reduce", coll);
          }
        }
      }().call(null, coll, f, start)
    }
  };
  _reduce = function(coll, f, start) {
    switch(arguments.length) {
      case 2:
        return _reduce__2.call(this, coll, f);
      case 3:
        return _reduce__3.call(this, coll, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _reduce.cljs$lang$arity$2 = _reduce__2;
  _reduce.cljs$lang$arity$3 = _reduce__3;
  return _reduce
}();
void 0;
void 0;
cljs.core.IEquiv = {};
cljs.core._equiv = function _equiv(o, other) {
  if(function() {
    var and__3546__auto____3665 = o;
    if(and__3546__auto____3665) {
      return o.cljs$core$IEquiv$_equiv$arity$2
    }else {
      return and__3546__auto____3665
    }
  }()) {
    return o.cljs$core$IEquiv$_equiv$arity$2(o, other)
  }else {
    return function() {
      var or__3548__auto____3666 = cljs.core._equiv[goog.typeOf.call(null, o)];
      if(or__3548__auto____3666) {
        return or__3548__auto____3666
      }else {
        var or__3548__auto____3667 = cljs.core._equiv["_"];
        if(or__3548__auto____3667) {
          return or__3548__auto____3667
        }else {
          throw cljs.core.missing_protocol.call(null, "IEquiv.-equiv", o);
        }
      }
    }().call(null, o, other)
  }
};
void 0;
void 0;
cljs.core.IHash = {};
cljs.core._hash = function _hash(o) {
  if(function() {
    var and__3546__auto____3668 = o;
    if(and__3546__auto____3668) {
      return o.cljs$core$IHash$_hash$arity$1
    }else {
      return and__3546__auto____3668
    }
  }()) {
    return o.cljs$core$IHash$_hash$arity$1(o)
  }else {
    return function() {
      var or__3548__auto____3669 = cljs.core._hash[goog.typeOf.call(null, o)];
      if(or__3548__auto____3669) {
        return or__3548__auto____3669
      }else {
        var or__3548__auto____3670 = cljs.core._hash["_"];
        if(or__3548__auto____3670) {
          return or__3548__auto____3670
        }else {
          throw cljs.core.missing_protocol.call(null, "IHash.-hash", o);
        }
      }
    }().call(null, o)
  }
};
void 0;
void 0;
cljs.core.ISeqable = {};
cljs.core._seq = function _seq(o) {
  if(function() {
    var and__3546__auto____3671 = o;
    if(and__3546__auto____3671) {
      return o.cljs$core$ISeqable$_seq$arity$1
    }else {
      return and__3546__auto____3671
    }
  }()) {
    return o.cljs$core$ISeqable$_seq$arity$1(o)
  }else {
    return function() {
      var or__3548__auto____3672 = cljs.core._seq[goog.typeOf.call(null, o)];
      if(or__3548__auto____3672) {
        return or__3548__auto____3672
      }else {
        var or__3548__auto____3673 = cljs.core._seq["_"];
        if(or__3548__auto____3673) {
          return or__3548__auto____3673
        }else {
          throw cljs.core.missing_protocol.call(null, "ISeqable.-seq", o);
        }
      }
    }().call(null, o)
  }
};
void 0;
void 0;
cljs.core.ISequential = {};
void 0;
void 0;
cljs.core.IList = {};
void 0;
void 0;
cljs.core.IRecord = {};
void 0;
void 0;
cljs.core.IReversible = {};
cljs.core._rseq = function _rseq(coll) {
  if(function() {
    var and__3546__auto____3674 = coll;
    if(and__3546__auto____3674) {
      return coll.cljs$core$IReversible$_rseq$arity$1
    }else {
      return and__3546__auto____3674
    }
  }()) {
    return coll.cljs$core$IReversible$_rseq$arity$1(coll)
  }else {
    return function() {
      var or__3548__auto____3675 = cljs.core._rseq[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3675) {
        return or__3548__auto____3675
      }else {
        var or__3548__auto____3676 = cljs.core._rseq["_"];
        if(or__3548__auto____3676) {
          return or__3548__auto____3676
        }else {
          throw cljs.core.missing_protocol.call(null, "IReversible.-rseq", coll);
        }
      }
    }().call(null, coll)
  }
};
void 0;
void 0;
cljs.core.ISorted = {};
cljs.core._sorted_seq = function _sorted_seq(coll, ascending_QMARK_) {
  if(function() {
    var and__3546__auto____3677 = coll;
    if(and__3546__auto____3677) {
      return coll.cljs$core$ISorted$_sorted_seq$arity$2
    }else {
      return and__3546__auto____3677
    }
  }()) {
    return coll.cljs$core$ISorted$_sorted_seq$arity$2(coll, ascending_QMARK_)
  }else {
    return function() {
      var or__3548__auto____3678 = cljs.core._sorted_seq[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3678) {
        return or__3548__auto____3678
      }else {
        var or__3548__auto____3679 = cljs.core._sorted_seq["_"];
        if(or__3548__auto____3679) {
          return or__3548__auto____3679
        }else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-sorted-seq", coll);
        }
      }
    }().call(null, coll, ascending_QMARK_)
  }
};
cljs.core._sorted_seq_from = function _sorted_seq_from(coll, k, ascending_QMARK_) {
  if(function() {
    var and__3546__auto____3680 = coll;
    if(and__3546__auto____3680) {
      return coll.cljs$core$ISorted$_sorted_seq_from$arity$3
    }else {
      return and__3546__auto____3680
    }
  }()) {
    return coll.cljs$core$ISorted$_sorted_seq_from$arity$3(coll, k, ascending_QMARK_)
  }else {
    return function() {
      var or__3548__auto____3681 = cljs.core._sorted_seq_from[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3681) {
        return or__3548__auto____3681
      }else {
        var or__3548__auto____3682 = cljs.core._sorted_seq_from["_"];
        if(or__3548__auto____3682) {
          return or__3548__auto____3682
        }else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-sorted-seq-from", coll);
        }
      }
    }().call(null, coll, k, ascending_QMARK_)
  }
};
cljs.core._entry_key = function _entry_key(coll, entry) {
  if(function() {
    var and__3546__auto____3683 = coll;
    if(and__3546__auto____3683) {
      return coll.cljs$core$ISorted$_entry_key$arity$2
    }else {
      return and__3546__auto____3683
    }
  }()) {
    return coll.cljs$core$ISorted$_entry_key$arity$2(coll, entry)
  }else {
    return function() {
      var or__3548__auto____3684 = cljs.core._entry_key[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3684) {
        return or__3548__auto____3684
      }else {
        var or__3548__auto____3685 = cljs.core._entry_key["_"];
        if(or__3548__auto____3685) {
          return or__3548__auto____3685
        }else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-entry-key", coll);
        }
      }
    }().call(null, coll, entry)
  }
};
cljs.core._comparator = function _comparator(coll) {
  if(function() {
    var and__3546__auto____3686 = coll;
    if(and__3546__auto____3686) {
      return coll.cljs$core$ISorted$_comparator$arity$1
    }else {
      return and__3546__auto____3686
    }
  }()) {
    return coll.cljs$core$ISorted$_comparator$arity$1(coll)
  }else {
    return function() {
      var or__3548__auto____3687 = cljs.core._comparator[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3687) {
        return or__3548__auto____3687
      }else {
        var or__3548__auto____3688 = cljs.core._comparator["_"];
        if(or__3548__auto____3688) {
          return or__3548__auto____3688
        }else {
          throw cljs.core.missing_protocol.call(null, "ISorted.-comparator", coll);
        }
      }
    }().call(null, coll)
  }
};
void 0;
void 0;
cljs.core.IPrintable = {};
cljs.core._pr_seq = function _pr_seq(o, opts) {
  if(function() {
    var and__3546__auto____3689 = o;
    if(and__3546__auto____3689) {
      return o.cljs$core$IPrintable$_pr_seq$arity$2
    }else {
      return and__3546__auto____3689
    }
  }()) {
    return o.cljs$core$IPrintable$_pr_seq$arity$2(o, opts)
  }else {
    return function() {
      var or__3548__auto____3690 = cljs.core._pr_seq[goog.typeOf.call(null, o)];
      if(or__3548__auto____3690) {
        return or__3548__auto____3690
      }else {
        var or__3548__auto____3691 = cljs.core._pr_seq["_"];
        if(or__3548__auto____3691) {
          return or__3548__auto____3691
        }else {
          throw cljs.core.missing_protocol.call(null, "IPrintable.-pr-seq", o);
        }
      }
    }().call(null, o, opts)
  }
};
void 0;
void 0;
cljs.core.IPending = {};
cljs.core._realized_QMARK_ = function _realized_QMARK_(d) {
  if(function() {
    var and__3546__auto____3692 = d;
    if(and__3546__auto____3692) {
      return d.cljs$core$IPending$_realized_QMARK_$arity$1
    }else {
      return and__3546__auto____3692
    }
  }()) {
    return d.cljs$core$IPending$_realized_QMARK_$arity$1(d)
  }else {
    return function() {
      var or__3548__auto____3693 = cljs.core._realized_QMARK_[goog.typeOf.call(null, d)];
      if(or__3548__auto____3693) {
        return or__3548__auto____3693
      }else {
        var or__3548__auto____3694 = cljs.core._realized_QMARK_["_"];
        if(or__3548__auto____3694) {
          return or__3548__auto____3694
        }else {
          throw cljs.core.missing_protocol.call(null, "IPending.-realized?", d);
        }
      }
    }().call(null, d)
  }
};
void 0;
void 0;
cljs.core.IWatchable = {};
cljs.core._notify_watches = function _notify_watches(this$, oldval, newval) {
  if(function() {
    var and__3546__auto____3695 = this$;
    if(and__3546__auto____3695) {
      return this$.cljs$core$IWatchable$_notify_watches$arity$3
    }else {
      return and__3546__auto____3695
    }
  }()) {
    return this$.cljs$core$IWatchable$_notify_watches$arity$3(this$, oldval, newval)
  }else {
    return function() {
      var or__3548__auto____3696 = cljs.core._notify_watches[goog.typeOf.call(null, this$)];
      if(or__3548__auto____3696) {
        return or__3548__auto____3696
      }else {
        var or__3548__auto____3697 = cljs.core._notify_watches["_"];
        if(or__3548__auto____3697) {
          return or__3548__auto____3697
        }else {
          throw cljs.core.missing_protocol.call(null, "IWatchable.-notify-watches", this$);
        }
      }
    }().call(null, this$, oldval, newval)
  }
};
cljs.core._add_watch = function _add_watch(this$, key, f) {
  if(function() {
    var and__3546__auto____3698 = this$;
    if(and__3546__auto____3698) {
      return this$.cljs$core$IWatchable$_add_watch$arity$3
    }else {
      return and__3546__auto____3698
    }
  }()) {
    return this$.cljs$core$IWatchable$_add_watch$arity$3(this$, key, f)
  }else {
    return function() {
      var or__3548__auto____3699 = cljs.core._add_watch[goog.typeOf.call(null, this$)];
      if(or__3548__auto____3699) {
        return or__3548__auto____3699
      }else {
        var or__3548__auto____3700 = cljs.core._add_watch["_"];
        if(or__3548__auto____3700) {
          return or__3548__auto____3700
        }else {
          throw cljs.core.missing_protocol.call(null, "IWatchable.-add-watch", this$);
        }
      }
    }().call(null, this$, key, f)
  }
};
cljs.core._remove_watch = function _remove_watch(this$, key) {
  if(function() {
    var and__3546__auto____3701 = this$;
    if(and__3546__auto____3701) {
      return this$.cljs$core$IWatchable$_remove_watch$arity$2
    }else {
      return and__3546__auto____3701
    }
  }()) {
    return this$.cljs$core$IWatchable$_remove_watch$arity$2(this$, key)
  }else {
    return function() {
      var or__3548__auto____3702 = cljs.core._remove_watch[goog.typeOf.call(null, this$)];
      if(or__3548__auto____3702) {
        return or__3548__auto____3702
      }else {
        var or__3548__auto____3703 = cljs.core._remove_watch["_"];
        if(or__3548__auto____3703) {
          return or__3548__auto____3703
        }else {
          throw cljs.core.missing_protocol.call(null, "IWatchable.-remove-watch", this$);
        }
      }
    }().call(null, this$, key)
  }
};
void 0;
void 0;
cljs.core.IEditableCollection = {};
cljs.core._as_transient = function _as_transient(coll) {
  if(function() {
    var and__3546__auto____3704 = coll;
    if(and__3546__auto____3704) {
      return coll.cljs$core$IEditableCollection$_as_transient$arity$1
    }else {
      return and__3546__auto____3704
    }
  }()) {
    return coll.cljs$core$IEditableCollection$_as_transient$arity$1(coll)
  }else {
    return function() {
      var or__3548__auto____3705 = cljs.core._as_transient[goog.typeOf.call(null, coll)];
      if(or__3548__auto____3705) {
        return or__3548__auto____3705
      }else {
        var or__3548__auto____3706 = cljs.core._as_transient["_"];
        if(or__3548__auto____3706) {
          return or__3548__auto____3706
        }else {
          throw cljs.core.missing_protocol.call(null, "IEditableCollection.-as-transient", coll);
        }
      }
    }().call(null, coll)
  }
};
void 0;
void 0;
cljs.core.ITransientCollection = {};
cljs.core._conj_BANG_ = function _conj_BANG_(tcoll, val) {
  if(function() {
    var and__3546__auto____3707 = tcoll;
    if(and__3546__auto____3707) {
      return tcoll.cljs$core$ITransientCollection$_conj_BANG_$arity$2
    }else {
      return and__3546__auto____3707
    }
  }()) {
    return tcoll.cljs$core$ITransientCollection$_conj_BANG_$arity$2(tcoll, val)
  }else {
    return function() {
      var or__3548__auto____3708 = cljs.core._conj_BANG_[goog.typeOf.call(null, tcoll)];
      if(or__3548__auto____3708) {
        return or__3548__auto____3708
      }else {
        var or__3548__auto____3709 = cljs.core._conj_BANG_["_"];
        if(or__3548__auto____3709) {
          return or__3548__auto____3709
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientCollection.-conj!", tcoll);
        }
      }
    }().call(null, tcoll, val)
  }
};
cljs.core._persistent_BANG_ = function _persistent_BANG_(tcoll) {
  if(function() {
    var and__3546__auto____3710 = tcoll;
    if(and__3546__auto____3710) {
      return tcoll.cljs$core$ITransientCollection$_persistent_BANG_$arity$1
    }else {
      return and__3546__auto____3710
    }
  }()) {
    return tcoll.cljs$core$ITransientCollection$_persistent_BANG_$arity$1(tcoll)
  }else {
    return function() {
      var or__3548__auto____3711 = cljs.core._persistent_BANG_[goog.typeOf.call(null, tcoll)];
      if(or__3548__auto____3711) {
        return or__3548__auto____3711
      }else {
        var or__3548__auto____3712 = cljs.core._persistent_BANG_["_"];
        if(or__3548__auto____3712) {
          return or__3548__auto____3712
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientCollection.-persistent!", tcoll);
        }
      }
    }().call(null, tcoll)
  }
};
void 0;
void 0;
cljs.core.ITransientAssociative = {};
cljs.core._assoc_BANG_ = function _assoc_BANG_(tcoll, key, val) {
  if(function() {
    var and__3546__auto____3713 = tcoll;
    if(and__3546__auto____3713) {
      return tcoll.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3
    }else {
      return and__3546__auto____3713
    }
  }()) {
    return tcoll.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3(tcoll, key, val)
  }else {
    return function() {
      var or__3548__auto____3714 = cljs.core._assoc_BANG_[goog.typeOf.call(null, tcoll)];
      if(or__3548__auto____3714) {
        return or__3548__auto____3714
      }else {
        var or__3548__auto____3715 = cljs.core._assoc_BANG_["_"];
        if(or__3548__auto____3715) {
          return or__3548__auto____3715
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientAssociative.-assoc!", tcoll);
        }
      }
    }().call(null, tcoll, key, val)
  }
};
cljs.core._dissoc_BANG_ = function _dissoc_BANG_(tcoll, key) {
  if(function() {
    var and__3546__auto____3716 = tcoll;
    if(and__3546__auto____3716) {
      return tcoll.cljs$core$ITransientAssociative$_dissoc_BANG_$arity$2
    }else {
      return and__3546__auto____3716
    }
  }()) {
    return tcoll.cljs$core$ITransientAssociative$_dissoc_BANG_$arity$2(tcoll, key)
  }else {
    return function() {
      var or__3548__auto____3717 = cljs.core._dissoc_BANG_[goog.typeOf.call(null, tcoll)];
      if(or__3548__auto____3717) {
        return or__3548__auto____3717
      }else {
        var or__3548__auto____3718 = cljs.core._dissoc_BANG_["_"];
        if(or__3548__auto____3718) {
          return or__3548__auto____3718
        }else {
          throw cljs.core.missing_protocol.call(null, "ITransientAssociative.-dissoc!", tcoll);
        }
      }
    }().call(null, tcoll, key)
  }
};
void 0;
cljs.core.identical_QMARK_ = function identical_QMARK_(x, y) {
  return x === y
};
void 0;
void 0;
cljs.core._EQ_ = function() {
  var _EQ_ = null;
  var _EQ___1 = function(x) {
    return true
  };
  var _EQ___2 = function(x, y) {
    var or__3548__auto____3719 = x === y;
    if(or__3548__auto____3719) {
      return or__3548__auto____3719
    }else {
      return cljs.core._equiv.call(null, x, y)
    }
  };
  var _EQ___3 = function() {
    var G__3720__delegate = function(x, y, more) {
      while(true) {
        if(cljs.core.truth_(_EQ_.call(null, x, y))) {
          if(cljs.core.truth_(cljs.core.next.call(null, more))) {
            var G__3721 = y;
            var G__3722 = cljs.core.first.call(null, more);
            var G__3723 = cljs.core.next.call(null, more);
            x = G__3721;
            y = G__3722;
            more = G__3723;
            continue
          }else {
            return _EQ_.call(null, y, cljs.core.first.call(null, more))
          }
        }else {
          return false
        }
        break
      }
    };
    var G__3720 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3720__delegate.call(this, x, y, more)
    };
    G__3720.cljs$lang$maxFixedArity = 2;
    G__3720.cljs$lang$applyTo = function(arglist__3724) {
      var x = cljs.core.first(arglist__3724);
      var y = cljs.core.first(cljs.core.next(arglist__3724));
      var more = cljs.core.rest(cljs.core.next(arglist__3724));
      return G__3720__delegate.call(this, x, y, more)
    };
    return G__3720
  }();
  _EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _EQ___1.call(this, x);
      case 2:
        return _EQ___2.call(this, x, y);
      default:
        return _EQ___3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _EQ_.cljs$lang$maxFixedArity = 2;
  _EQ_.cljs$lang$applyTo = _EQ___3.cljs$lang$applyTo;
  _EQ_.cljs$lang$arity$1 = _EQ___1;
  _EQ_.cljs$lang$arity$2 = _EQ___2;
  _EQ_.cljs$lang$arity$3 = _EQ___3;
  return _EQ_
}();
cljs.core.nil_QMARK_ = function nil_QMARK_(x) {
  return x === null
};
cljs.core.type = function type(x) {
  if(function() {
    var or__3548__auto____3725 = x === null;
    if(or__3548__auto____3725) {
      return or__3548__auto____3725
    }else {
      return void 0 === x
    }
  }()) {
    return null
  }else {
    return x.constructor
  }
};
void 0;
void 0;
void 0;
cljs.core.IHash["null"] = true;
cljs.core._hash["null"] = function(o) {
  return 0
};
cljs.core.ILookup["null"] = true;
cljs.core._lookup["null"] = function() {
  var G__3726 = null;
  var G__3726__2 = function(o, k) {
    return null
  };
  var G__3726__3 = function(o, k, not_found) {
    return not_found
  };
  G__3726 = function(o, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3726__2.call(this, o, k);
      case 3:
        return G__3726__3.call(this, o, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3726
}();
cljs.core.IAssociative["null"] = true;
cljs.core._assoc["null"] = function(_, k, v) {
  return cljs.core.hash_map.call(null, k, v)
};
cljs.core.ICollection["null"] = true;
cljs.core._conj["null"] = function(_, o) {
  return cljs.core.list.call(null, o)
};
cljs.core.IReduce["null"] = true;
cljs.core._reduce["null"] = function() {
  var G__3727 = null;
  var G__3727__2 = function(_, f) {
    return f.call(null)
  };
  var G__3727__3 = function(_, f, start) {
    return start
  };
  G__3727 = function(_, f, start) {
    switch(arguments.length) {
      case 2:
        return G__3727__2.call(this, _, f);
      case 3:
        return G__3727__3.call(this, _, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3727
}();
cljs.core.IPrintable["null"] = true;
cljs.core._pr_seq["null"] = function(o) {
  return cljs.core.list.call(null, "nil")
};
cljs.core.ISet["null"] = true;
cljs.core._disjoin["null"] = function(_, v) {
  return null
};
cljs.core.ICounted["null"] = true;
cljs.core._count["null"] = function(_) {
  return 0
};
cljs.core.IStack["null"] = true;
cljs.core._peek["null"] = function(_) {
  return null
};
cljs.core._pop["null"] = function(_) {
  return null
};
cljs.core.ISeq["null"] = true;
cljs.core._first["null"] = function(_) {
  return null
};
cljs.core._rest["null"] = function(_) {
  return cljs.core.list.call(null)
};
cljs.core.IEquiv["null"] = true;
cljs.core._equiv["null"] = function(_, o) {
  return o === null
};
cljs.core.IWithMeta["null"] = true;
cljs.core._with_meta["null"] = function(_, meta) {
  return null
};
cljs.core.IMeta["null"] = true;
cljs.core._meta["null"] = function(_) {
  return null
};
cljs.core.IIndexed["null"] = true;
cljs.core._nth["null"] = function() {
  var G__3728 = null;
  var G__3728__2 = function(_, n) {
    return null
  };
  var G__3728__3 = function(_, n, not_found) {
    return not_found
  };
  G__3728 = function(_, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3728__2.call(this, _, n);
      case 3:
        return G__3728__3.call(this, _, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3728
}();
cljs.core.IEmptyableCollection["null"] = true;
cljs.core._empty["null"] = function(_) {
  return null
};
cljs.core.IMap["null"] = true;
cljs.core._dissoc["null"] = function(_, k) {
  return null
};
Date.prototype.cljs$core$IEquiv$ = true;
Date.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(o, other) {
  return o.toString() === other.toString()
};
cljs.core.IHash["number"] = true;
cljs.core._hash["number"] = function(o) {
  return o
};
cljs.core.IEquiv["number"] = true;
cljs.core._equiv["number"] = function(x, o) {
  return x === o
};
cljs.core.IHash["boolean"] = true;
cljs.core._hash["boolean"] = function(o) {
  return o === true ? 1 : 0
};
cljs.core.IHash["function"] = true;
cljs.core._hash["function"] = function(o) {
  return goog.getUid.call(null, o)
};
cljs.core.inc = function inc(x) {
  return x + 1
};
cljs.core.ci_reduce = function() {
  var ci_reduce = null;
  var ci_reduce__2 = function(cicoll, f) {
    if(cljs.core._EQ_.call(null, 0, cljs.core._count.call(null, cicoll))) {
      return f.call(null)
    }else {
      var val__3729 = cljs.core._nth.call(null, cicoll, 0);
      var n__3730 = 1;
      while(true) {
        if(n__3730 < cljs.core._count.call(null, cicoll)) {
          var G__3735 = f.call(null, val__3729, cljs.core._nth.call(null, cicoll, n__3730));
          var G__3736 = n__3730 + 1;
          val__3729 = G__3735;
          n__3730 = G__3736;
          continue
        }else {
          return val__3729
        }
        break
      }
    }
  };
  var ci_reduce__3 = function(cicoll, f, val) {
    var val__3731 = val;
    var n__3732 = 0;
    while(true) {
      if(n__3732 < cljs.core._count.call(null, cicoll)) {
        var G__3737 = f.call(null, val__3731, cljs.core._nth.call(null, cicoll, n__3732));
        var G__3738 = n__3732 + 1;
        val__3731 = G__3737;
        n__3732 = G__3738;
        continue
      }else {
        return val__3731
      }
      break
    }
  };
  var ci_reduce__4 = function(cicoll, f, val, idx) {
    var val__3733 = val;
    var n__3734 = idx;
    while(true) {
      if(n__3734 < cljs.core._count.call(null, cicoll)) {
        var G__3739 = f.call(null, val__3733, cljs.core._nth.call(null, cicoll, n__3734));
        var G__3740 = n__3734 + 1;
        val__3733 = G__3739;
        n__3734 = G__3740;
        continue
      }else {
        return val__3733
      }
      break
    }
  };
  ci_reduce = function(cicoll, f, val, idx) {
    switch(arguments.length) {
      case 2:
        return ci_reduce__2.call(this, cicoll, f);
      case 3:
        return ci_reduce__3.call(this, cicoll, f, val);
      case 4:
        return ci_reduce__4.call(this, cicoll, f, val, idx)
    }
    throw"Invalid arity: " + arguments.length;
  };
  ci_reduce.cljs$lang$arity$2 = ci_reduce__2;
  ci_reduce.cljs$lang$arity$3 = ci_reduce__3;
  ci_reduce.cljs$lang$arity$4 = ci_reduce__4;
  return ci_reduce
}();
void 0;
void 0;
void 0;
cljs.core.IndexedSeq = function(a, i) {
  this.a = a;
  this.i = i
};
cljs.core.IndexedSeq.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.IndexedSeq")
};
cljs.core.IndexedSeq.prototype.cljs$core$IHash$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__3741 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.IndexedSeq.prototype.cljs$core$ISequential$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$ICollection$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__3742 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.IndexedSeq.prototype.toString = function() {
  var this__3743 = this;
  var this$__3744 = this;
  return cljs.core.pr_str.call(null, this$__3744)
};
cljs.core.IndexedSeq.prototype.cljs$core$IReduce$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$IReduce$_reduce$arity$2 = function(_, f) {
  var this__3745 = this;
  return cljs.core.ci_reduce.call(null, this__3745.a, f, this__3745.a[this__3745.i], this__3745.i + 1)
};
cljs.core.IndexedSeq.prototype.cljs$core$IReduce$_reduce$arity$3 = function(_, f, start) {
  var this__3746 = this;
  return cljs.core.ci_reduce.call(null, this__3746.a, f, start, this__3746.i)
};
cljs.core.IndexedSeq.prototype.cljs$core$ISeqable$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var this__3747 = this;
  return this$
};
cljs.core.IndexedSeq.prototype.cljs$core$ICounted$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$ICounted$_count$arity$1 = function(_) {
  var this__3748 = this;
  return this__3748.a.length - this__3748.i
};
cljs.core.IndexedSeq.prototype.cljs$core$ISeq$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(_) {
  var this__3749 = this;
  return this__3749.a[this__3749.i]
};
cljs.core.IndexedSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(_) {
  var this__3750 = this;
  if(this__3750.i + 1 < this__3750.a.length) {
    return new cljs.core.IndexedSeq(this__3750.a, this__3750.i + 1)
  }else {
    return cljs.core.list.call(null)
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$IEquiv$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__3751 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.IndexedSeq.prototype.cljs$core$IIndexed$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var this__3752 = this;
  var i__3753 = n + this__3752.i;
  if(i__3753 < this__3752.a.length) {
    return this__3752.a[i__3753]
  }else {
    return null
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var this__3754 = this;
  var i__3755 = n + this__3754.i;
  if(i__3755 < this__3754.a.length) {
    return this__3754.a[i__3755]
  }else {
    return not_found
  }
};
cljs.core.IndexedSeq;
cljs.core.prim_seq = function prim_seq(prim, i) {
  if(cljs.core._EQ_.call(null, 0, prim.length)) {
    return null
  }else {
    return new cljs.core.IndexedSeq(prim, i)
  }
};
cljs.core.array_seq = function array_seq(array, i) {
  return cljs.core.prim_seq.call(null, array, i)
};
cljs.core.IReduce["array"] = true;
cljs.core._reduce["array"] = function() {
  var G__3756 = null;
  var G__3756__2 = function(array, f) {
    return cljs.core.ci_reduce.call(null, array, f)
  };
  var G__3756__3 = function(array, f, start) {
    return cljs.core.ci_reduce.call(null, array, f, start)
  };
  G__3756 = function(array, f, start) {
    switch(arguments.length) {
      case 2:
        return G__3756__2.call(this, array, f);
      case 3:
        return G__3756__3.call(this, array, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3756
}();
cljs.core.ILookup["array"] = true;
cljs.core._lookup["array"] = function() {
  var G__3757 = null;
  var G__3757__2 = function(array, k) {
    return array[k]
  };
  var G__3757__3 = function(array, k, not_found) {
    return cljs.core._nth.call(null, array, k, not_found)
  };
  G__3757 = function(array, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3757__2.call(this, array, k);
      case 3:
        return G__3757__3.call(this, array, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3757
}();
cljs.core.IIndexed["array"] = true;
cljs.core._nth["array"] = function() {
  var G__3758 = null;
  var G__3758__2 = function(array, n) {
    if(n < array.length) {
      return array[n]
    }else {
      return null
    }
  };
  var G__3758__3 = function(array, n, not_found) {
    if(n < array.length) {
      return array[n]
    }else {
      return not_found
    }
  };
  G__3758 = function(array, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3758__2.call(this, array, n);
      case 3:
        return G__3758__3.call(this, array, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3758
}();
cljs.core.ICounted["array"] = true;
cljs.core._count["array"] = function(a) {
  return a.length
};
cljs.core.ISeqable["array"] = true;
cljs.core._seq["array"] = function(array) {
  return cljs.core.array_seq.call(null, array, 0)
};
cljs.core.seq = function seq(coll) {
  if(cljs.core.truth_(coll)) {
    return cljs.core._seq.call(null, coll)
  }else {
    return null
  }
};
cljs.core.first = function first(coll) {
  var temp__3698__auto____3759 = cljs.core.seq.call(null, coll);
  if(cljs.core.truth_(temp__3698__auto____3759)) {
    var s__3760 = temp__3698__auto____3759;
    return cljs.core._first.call(null, s__3760)
  }else {
    return null
  }
};
cljs.core.rest = function rest(coll) {
  return cljs.core._rest.call(null, cljs.core.seq.call(null, coll))
};
cljs.core.next = function next(coll) {
  if(cljs.core.truth_(coll)) {
    return cljs.core.seq.call(null, cljs.core.rest.call(null, coll))
  }else {
    return null
  }
};
cljs.core.second = function second(coll) {
  return cljs.core.first.call(null, cljs.core.next.call(null, coll))
};
cljs.core.ffirst = function ffirst(coll) {
  return cljs.core.first.call(null, cljs.core.first.call(null, coll))
};
cljs.core.nfirst = function nfirst(coll) {
  return cljs.core.next.call(null, cljs.core.first.call(null, coll))
};
cljs.core.fnext = function fnext(coll) {
  return cljs.core.first.call(null, cljs.core.next.call(null, coll))
};
cljs.core.nnext = function nnext(coll) {
  return cljs.core.next.call(null, cljs.core.next.call(null, coll))
};
cljs.core.last = function last(s) {
  while(true) {
    if(cljs.core.truth_(cljs.core.next.call(null, s))) {
      var G__3761 = cljs.core.next.call(null, s);
      s = G__3761;
      continue
    }else {
      return cljs.core.first.call(null, s)
    }
    break
  }
};
cljs.core.ICounted["_"] = true;
cljs.core._count["_"] = function(x) {
  var s__3762 = cljs.core.seq.call(null, x);
  var n__3763 = 0;
  while(true) {
    if(cljs.core.truth_(s__3762)) {
      var G__3764 = cljs.core.next.call(null, s__3762);
      var G__3765 = n__3763 + 1;
      s__3762 = G__3764;
      n__3763 = G__3765;
      continue
    }else {
      return n__3763
    }
    break
  }
};
cljs.core.IEquiv["_"] = true;
cljs.core._equiv["_"] = function(x, o) {
  return x === o
};
cljs.core.not = function not(x) {
  if(cljs.core.truth_(x)) {
    return false
  }else {
    return true
  }
};
cljs.core.conj = function() {
  var conj = null;
  var conj__2 = function(coll, x) {
    return cljs.core._conj.call(null, coll, x)
  };
  var conj__3 = function() {
    var G__3766__delegate = function(coll, x, xs) {
      while(true) {
        if(cljs.core.truth_(xs)) {
          var G__3767 = conj.call(null, coll, x);
          var G__3768 = cljs.core.first.call(null, xs);
          var G__3769 = cljs.core.next.call(null, xs);
          coll = G__3767;
          x = G__3768;
          xs = G__3769;
          continue
        }else {
          return conj.call(null, coll, x)
        }
        break
      }
    };
    var G__3766 = function(coll, x, var_args) {
      var xs = null;
      if(goog.isDef(var_args)) {
        xs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3766__delegate.call(this, coll, x, xs)
    };
    G__3766.cljs$lang$maxFixedArity = 2;
    G__3766.cljs$lang$applyTo = function(arglist__3770) {
      var coll = cljs.core.first(arglist__3770);
      var x = cljs.core.first(cljs.core.next(arglist__3770));
      var xs = cljs.core.rest(cljs.core.next(arglist__3770));
      return G__3766__delegate.call(this, coll, x, xs)
    };
    return G__3766
  }();
  conj = function(coll, x, var_args) {
    var xs = var_args;
    switch(arguments.length) {
      case 2:
        return conj__2.call(this, coll, x);
      default:
        return conj__3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  conj.cljs$lang$maxFixedArity = 2;
  conj.cljs$lang$applyTo = conj__3.cljs$lang$applyTo;
  conj.cljs$lang$arity$2 = conj__2;
  conj.cljs$lang$arity$3 = conj__3;
  return conj
}();
cljs.core.empty = function empty(coll) {
  return cljs.core._empty.call(null, coll)
};
cljs.core.count = function count(coll) {
  return cljs.core._count.call(null, coll)
};
cljs.core.nth = function() {
  var nth = null;
  var nth__2 = function(coll, n) {
    return cljs.core._nth.call(null, coll, Math.floor(n))
  };
  var nth__3 = function(coll, n, not_found) {
    return cljs.core._nth.call(null, coll, Math.floor(n), not_found)
  };
  nth = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return nth__2.call(this, coll, n);
      case 3:
        return nth__3.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  nth.cljs$lang$arity$2 = nth__2;
  nth.cljs$lang$arity$3 = nth__3;
  return nth
}();
cljs.core.get = function() {
  var get = null;
  var get__2 = function(o, k) {
    return cljs.core._lookup.call(null, o, k)
  };
  var get__3 = function(o, k, not_found) {
    return cljs.core._lookup.call(null, o, k, not_found)
  };
  get = function(o, k, not_found) {
    switch(arguments.length) {
      case 2:
        return get__2.call(this, o, k);
      case 3:
        return get__3.call(this, o, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  get.cljs$lang$arity$2 = get__2;
  get.cljs$lang$arity$3 = get__3;
  return get
}();
cljs.core.assoc = function() {
  var assoc = null;
  var assoc__3 = function(coll, k, v) {
    return cljs.core._assoc.call(null, coll, k, v)
  };
  var assoc__4 = function() {
    var G__3772__delegate = function(coll, k, v, kvs) {
      while(true) {
        var ret__3771 = assoc.call(null, coll, k, v);
        if(cljs.core.truth_(kvs)) {
          var G__3773 = ret__3771;
          var G__3774 = cljs.core.first.call(null, kvs);
          var G__3775 = cljs.core.second.call(null, kvs);
          var G__3776 = cljs.core.nnext.call(null, kvs);
          coll = G__3773;
          k = G__3774;
          v = G__3775;
          kvs = G__3776;
          continue
        }else {
          return ret__3771
        }
        break
      }
    };
    var G__3772 = function(coll, k, v, var_args) {
      var kvs = null;
      if(goog.isDef(var_args)) {
        kvs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__3772__delegate.call(this, coll, k, v, kvs)
    };
    G__3772.cljs$lang$maxFixedArity = 3;
    G__3772.cljs$lang$applyTo = function(arglist__3777) {
      var coll = cljs.core.first(arglist__3777);
      var k = cljs.core.first(cljs.core.next(arglist__3777));
      var v = cljs.core.first(cljs.core.next(cljs.core.next(arglist__3777)));
      var kvs = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__3777)));
      return G__3772__delegate.call(this, coll, k, v, kvs)
    };
    return G__3772
  }();
  assoc = function(coll, k, v, var_args) {
    var kvs = var_args;
    switch(arguments.length) {
      case 3:
        return assoc__3.call(this, coll, k, v);
      default:
        return assoc__4.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  assoc.cljs$lang$maxFixedArity = 3;
  assoc.cljs$lang$applyTo = assoc__4.cljs$lang$applyTo;
  assoc.cljs$lang$arity$3 = assoc__3;
  assoc.cljs$lang$arity$4 = assoc__4;
  return assoc
}();
cljs.core.dissoc = function() {
  var dissoc = null;
  var dissoc__1 = function(coll) {
    return coll
  };
  var dissoc__2 = function(coll, k) {
    return cljs.core._dissoc.call(null, coll, k)
  };
  var dissoc__3 = function() {
    var G__3779__delegate = function(coll, k, ks) {
      while(true) {
        var ret__3778 = dissoc.call(null, coll, k);
        if(cljs.core.truth_(ks)) {
          var G__3780 = ret__3778;
          var G__3781 = cljs.core.first.call(null, ks);
          var G__3782 = cljs.core.next.call(null, ks);
          coll = G__3780;
          k = G__3781;
          ks = G__3782;
          continue
        }else {
          return ret__3778
        }
        break
      }
    };
    var G__3779 = function(coll, k, var_args) {
      var ks = null;
      if(goog.isDef(var_args)) {
        ks = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3779__delegate.call(this, coll, k, ks)
    };
    G__3779.cljs$lang$maxFixedArity = 2;
    G__3779.cljs$lang$applyTo = function(arglist__3783) {
      var coll = cljs.core.first(arglist__3783);
      var k = cljs.core.first(cljs.core.next(arglist__3783));
      var ks = cljs.core.rest(cljs.core.next(arglist__3783));
      return G__3779__delegate.call(this, coll, k, ks)
    };
    return G__3779
  }();
  dissoc = function(coll, k, var_args) {
    var ks = var_args;
    switch(arguments.length) {
      case 1:
        return dissoc__1.call(this, coll);
      case 2:
        return dissoc__2.call(this, coll, k);
      default:
        return dissoc__3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  dissoc.cljs$lang$maxFixedArity = 2;
  dissoc.cljs$lang$applyTo = dissoc__3.cljs$lang$applyTo;
  dissoc.cljs$lang$arity$1 = dissoc__1;
  dissoc.cljs$lang$arity$2 = dissoc__2;
  dissoc.cljs$lang$arity$3 = dissoc__3;
  return dissoc
}();
cljs.core.with_meta = function with_meta(o, meta) {
  return cljs.core._with_meta.call(null, o, meta)
};
cljs.core.meta = function meta(o) {
  if(cljs.core.truth_(function() {
    var x__384__auto____3784 = o;
    if(cljs.core.truth_(function() {
      var and__3546__auto____3785 = x__384__auto____3784;
      if(cljs.core.truth_(and__3546__auto____3785)) {
        var and__3546__auto____3786 = x__384__auto____3784.cljs$core$IMeta$;
        if(cljs.core.truth_(and__3546__auto____3786)) {
          return cljs.core.not.call(null, x__384__auto____3784.hasOwnProperty("cljs$core$IMeta$"))
        }else {
          return and__3546__auto____3786
        }
      }else {
        return and__3546__auto____3785
      }
    }())) {
      return true
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.IMeta, x__384__auto____3784)
    }
  }())) {
    return cljs.core._meta.call(null, o)
  }else {
    return null
  }
};
cljs.core.peek = function peek(coll) {
  return cljs.core._peek.call(null, coll)
};
cljs.core.pop = function pop(coll) {
  return cljs.core._pop.call(null, coll)
};
cljs.core.disj = function() {
  var disj = null;
  var disj__1 = function(coll) {
    return coll
  };
  var disj__2 = function(coll, k) {
    return cljs.core._disjoin.call(null, coll, k)
  };
  var disj__3 = function() {
    var G__3788__delegate = function(coll, k, ks) {
      while(true) {
        var ret__3787 = disj.call(null, coll, k);
        if(cljs.core.truth_(ks)) {
          var G__3789 = ret__3787;
          var G__3790 = cljs.core.first.call(null, ks);
          var G__3791 = cljs.core.next.call(null, ks);
          coll = G__3789;
          k = G__3790;
          ks = G__3791;
          continue
        }else {
          return ret__3787
        }
        break
      }
    };
    var G__3788 = function(coll, k, var_args) {
      var ks = null;
      if(goog.isDef(var_args)) {
        ks = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3788__delegate.call(this, coll, k, ks)
    };
    G__3788.cljs$lang$maxFixedArity = 2;
    G__3788.cljs$lang$applyTo = function(arglist__3792) {
      var coll = cljs.core.first(arglist__3792);
      var k = cljs.core.first(cljs.core.next(arglist__3792));
      var ks = cljs.core.rest(cljs.core.next(arglist__3792));
      return G__3788__delegate.call(this, coll, k, ks)
    };
    return G__3788
  }();
  disj = function(coll, k, var_args) {
    var ks = var_args;
    switch(arguments.length) {
      case 1:
        return disj__1.call(this, coll);
      case 2:
        return disj__2.call(this, coll, k);
      default:
        return disj__3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  disj.cljs$lang$maxFixedArity = 2;
  disj.cljs$lang$applyTo = disj__3.cljs$lang$applyTo;
  disj.cljs$lang$arity$1 = disj__1;
  disj.cljs$lang$arity$2 = disj__2;
  disj.cljs$lang$arity$3 = disj__3;
  return disj
}();
cljs.core.hash = function hash(o) {
  return cljs.core._hash.call(null, o)
};
cljs.core.empty_QMARK_ = function empty_QMARK_(coll) {
  return cljs.core.not.call(null, cljs.core.seq.call(null, coll))
};
cljs.core.coll_QMARK_ = function coll_QMARK_(x) {
  if(x === null) {
    return false
  }else {
    var x__384__auto____3793 = x;
    if(cljs.core.truth_(function() {
      var and__3546__auto____3794 = x__384__auto____3793;
      if(cljs.core.truth_(and__3546__auto____3794)) {
        var and__3546__auto____3795 = x__384__auto____3793.cljs$core$ICollection$;
        if(cljs.core.truth_(and__3546__auto____3795)) {
          return cljs.core.not.call(null, x__384__auto____3793.hasOwnProperty("cljs$core$ICollection$"))
        }else {
          return and__3546__auto____3795
        }
      }else {
        return and__3546__auto____3794
      }
    }())) {
      return true
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.ICollection, x__384__auto____3793)
    }
  }
};
cljs.core.set_QMARK_ = function set_QMARK_(x) {
  if(x === null) {
    return false
  }else {
    var x__384__auto____3796 = x;
    if(cljs.core.truth_(function() {
      var and__3546__auto____3797 = x__384__auto____3796;
      if(cljs.core.truth_(and__3546__auto____3797)) {
        var and__3546__auto____3798 = x__384__auto____3796.cljs$core$ISet$;
        if(cljs.core.truth_(and__3546__auto____3798)) {
          return cljs.core.not.call(null, x__384__auto____3796.hasOwnProperty("cljs$core$ISet$"))
        }else {
          return and__3546__auto____3798
        }
      }else {
        return and__3546__auto____3797
      }
    }())) {
      return true
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.ISet, x__384__auto____3796)
    }
  }
};
cljs.core.associative_QMARK_ = function associative_QMARK_(x) {
  var x__384__auto____3799 = x;
  if(cljs.core.truth_(function() {
    var and__3546__auto____3800 = x__384__auto____3799;
    if(cljs.core.truth_(and__3546__auto____3800)) {
      var and__3546__auto____3801 = x__384__auto____3799.cljs$core$IAssociative$;
      if(cljs.core.truth_(and__3546__auto____3801)) {
        return cljs.core.not.call(null, x__384__auto____3799.hasOwnProperty("cljs$core$IAssociative$"))
      }else {
        return and__3546__auto____3801
      }
    }else {
      return and__3546__auto____3800
    }
  }())) {
    return true
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IAssociative, x__384__auto____3799)
  }
};
cljs.core.sequential_QMARK_ = function sequential_QMARK_(x) {
  var x__384__auto____3802 = x;
  if(cljs.core.truth_(function() {
    var and__3546__auto____3803 = x__384__auto____3802;
    if(cljs.core.truth_(and__3546__auto____3803)) {
      var and__3546__auto____3804 = x__384__auto____3802.cljs$core$ISequential$;
      if(cljs.core.truth_(and__3546__auto____3804)) {
        return cljs.core.not.call(null, x__384__auto____3802.hasOwnProperty("cljs$core$ISequential$"))
      }else {
        return and__3546__auto____3804
      }
    }else {
      return and__3546__auto____3803
    }
  }())) {
    return true
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.ISequential, x__384__auto____3802)
  }
};
cljs.core.counted_QMARK_ = function counted_QMARK_(x) {
  var x__384__auto____3805 = x;
  if(cljs.core.truth_(function() {
    var and__3546__auto____3806 = x__384__auto____3805;
    if(cljs.core.truth_(and__3546__auto____3806)) {
      var and__3546__auto____3807 = x__384__auto____3805.cljs$core$ICounted$;
      if(cljs.core.truth_(and__3546__auto____3807)) {
        return cljs.core.not.call(null, x__384__auto____3805.hasOwnProperty("cljs$core$ICounted$"))
      }else {
        return and__3546__auto____3807
      }
    }else {
      return and__3546__auto____3806
    }
  }())) {
    return true
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.ICounted, x__384__auto____3805)
  }
};
cljs.core.map_QMARK_ = function map_QMARK_(x) {
  if(x === null) {
    return false
  }else {
    var x__384__auto____3808 = x;
    if(cljs.core.truth_(function() {
      var and__3546__auto____3809 = x__384__auto____3808;
      if(cljs.core.truth_(and__3546__auto____3809)) {
        var and__3546__auto____3810 = x__384__auto____3808.cljs$core$IMap$;
        if(cljs.core.truth_(and__3546__auto____3810)) {
          return cljs.core.not.call(null, x__384__auto____3808.hasOwnProperty("cljs$core$IMap$"))
        }else {
          return and__3546__auto____3810
        }
      }else {
        return and__3546__auto____3809
      }
    }())) {
      return true
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.IMap, x__384__auto____3808)
    }
  }
};
cljs.core.vector_QMARK_ = function vector_QMARK_(x) {
  var x__384__auto____3811 = x;
  if(cljs.core.truth_(function() {
    var and__3546__auto____3812 = x__384__auto____3811;
    if(cljs.core.truth_(and__3546__auto____3812)) {
      var and__3546__auto____3813 = x__384__auto____3811.cljs$core$IVector$;
      if(cljs.core.truth_(and__3546__auto____3813)) {
        return cljs.core.not.call(null, x__384__auto____3811.hasOwnProperty("cljs$core$IVector$"))
      }else {
        return and__3546__auto____3813
      }
    }else {
      return and__3546__auto____3812
    }
  }())) {
    return true
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IVector, x__384__auto____3811)
  }
};
cljs.core.js_obj = function() {
  var js_obj = null;
  var js_obj__0 = function() {
    return{}
  };
  var js_obj__2 = function(k1, v1) {
    return{k1:v1}
  };
  var js_obj__4 = function(k1, v1, k2, v2) {
    return{k1:v1, k2:v2}
  };
  var js_obj__6 = function(k1, v1, k2, v2, k3, v3) {
    return{k1:v1, k2:v2, k3:v3}
  };
  var js_obj__7 = function() {
    var G__3814__delegate = function(k1, v1, k2, v2, k3, v3, more) {
      return cljs.core.apply.call(null, goog.object.create, k1, v1, k2, v2, k3, v3, more)
    };
    var G__3814 = function(k1, v1, k2, v2, k3, v3, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 6), 0)
      }
      return G__3814__delegate.call(this, k1, v1, k2, v2, k3, v3, more)
    };
    G__3814.cljs$lang$maxFixedArity = 6;
    G__3814.cljs$lang$applyTo = function(arglist__3815) {
      var k1 = cljs.core.first(arglist__3815);
      var v1 = cljs.core.first(cljs.core.next(arglist__3815));
      var k2 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__3815)));
      var v2 = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__3815))));
      var k3 = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__3815)))));
      var v3 = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__3815))))));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__3815))))));
      return G__3814__delegate.call(this, k1, v1, k2, v2, k3, v3, more)
    };
    return G__3814
  }();
  js_obj = function(k1, v1, k2, v2, k3, v3, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 0:
        return js_obj__0.call(this);
      case 2:
        return js_obj__2.call(this, k1, v1);
      case 4:
        return js_obj__4.call(this, k1, v1, k2, v2);
      case 6:
        return js_obj__6.call(this, k1, v1, k2, v2, k3, v3);
      default:
        return js_obj__7.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  js_obj.cljs$lang$maxFixedArity = 6;
  js_obj.cljs$lang$applyTo = js_obj__7.cljs$lang$applyTo;
  js_obj.cljs$lang$arity$0 = js_obj__0;
  js_obj.cljs$lang$arity$2 = js_obj__2;
  js_obj.cljs$lang$arity$4 = js_obj__4;
  js_obj.cljs$lang$arity$6 = js_obj__6;
  js_obj.cljs$lang$arity$7 = js_obj__7;
  return js_obj
}();
cljs.core.js_keys = function js_keys(obj) {
  var keys__3816 = [];
  goog.object.forEach.call(null, obj, function(val, key, obj) {
    return keys__3816.push(key)
  });
  return keys__3816
};
cljs.core.js_delete = function js_delete(obj, key) {
  return delete obj[key]
};
cljs.core.lookup_sentinel = {};
cljs.core.false_QMARK_ = function false_QMARK_(x) {
  return x === false
};
cljs.core.true_QMARK_ = function true_QMARK_(x) {
  return x === true
};
cljs.core.undefined_QMARK_ = function undefined_QMARK_(x) {
  return void 0 === x
};
cljs.core.instance_QMARK_ = function instance_QMARK_(t, o) {
  return o != null && (o instanceof t || o.constructor === t || t === Object)
};
cljs.core.seq_QMARK_ = function seq_QMARK_(s) {
  if(s === null) {
    return false
  }else {
    var x__384__auto____3817 = s;
    if(cljs.core.truth_(function() {
      var and__3546__auto____3818 = x__384__auto____3817;
      if(cljs.core.truth_(and__3546__auto____3818)) {
        var and__3546__auto____3819 = x__384__auto____3817.cljs$core$ISeq$;
        if(cljs.core.truth_(and__3546__auto____3819)) {
          return cljs.core.not.call(null, x__384__auto____3817.hasOwnProperty("cljs$core$ISeq$"))
        }else {
          return and__3546__auto____3819
        }
      }else {
        return and__3546__auto____3818
      }
    }())) {
      return true
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, x__384__auto____3817)
    }
  }
};
cljs.core.seqable_QMARK_ = function seqable_QMARK_(s) {
  if(s === null) {
    return false
  }else {
    var x__384__auto____3820 = s;
    if(cljs.core.truth_(function() {
      var and__3546__auto____3821 = x__384__auto____3820;
      if(cljs.core.truth_(and__3546__auto____3821)) {
        var and__3546__auto____3822 = x__384__auto____3820.cljs$core$ISeqable$;
        if(cljs.core.truth_(and__3546__auto____3822)) {
          return cljs.core.not.call(null, x__384__auto____3820.hasOwnProperty("cljs$core$ISeqable$"))
        }else {
          return and__3546__auto____3822
        }
      }else {
        return and__3546__auto____3821
      }
    }())) {
      return true
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.ISeqable, x__384__auto____3820)
    }
  }
};
cljs.core.boolean$ = function boolean$(x) {
  if(cljs.core.truth_(x)) {
    return true
  }else {
    return false
  }
};
cljs.core.string_QMARK_ = function string_QMARK_(x) {
  var and__3546__auto____3823 = goog.isString.call(null, x);
  if(cljs.core.truth_(and__3546__auto____3823)) {
    return cljs.core.not.call(null, function() {
      var or__3548__auto____3824 = cljs.core._EQ_.call(null, x.charAt(0), "\ufdd0");
      if(or__3548__auto____3824) {
        return or__3548__auto____3824
      }else {
        return cljs.core._EQ_.call(null, x.charAt(0), "\ufdd1")
      }
    }())
  }else {
    return and__3546__auto____3823
  }
};
cljs.core.keyword_QMARK_ = function keyword_QMARK_(x) {
  var and__3546__auto____3825 = goog.isString.call(null, x);
  if(cljs.core.truth_(and__3546__auto____3825)) {
    return cljs.core._EQ_.call(null, x.charAt(0), "\ufdd0")
  }else {
    return and__3546__auto____3825
  }
};
cljs.core.symbol_QMARK_ = function symbol_QMARK_(x) {
  var and__3546__auto____3826 = goog.isString.call(null, x);
  if(cljs.core.truth_(and__3546__auto____3826)) {
    return cljs.core._EQ_.call(null, x.charAt(0), "\ufdd1")
  }else {
    return and__3546__auto____3826
  }
};
cljs.core.number_QMARK_ = function number_QMARK_(n) {
  return goog.isNumber.call(null, n)
};
cljs.core.fn_QMARK_ = function fn_QMARK_(f) {
  return goog.isFunction.call(null, f)
};
cljs.core.ifn_QMARK_ = function ifn_QMARK_(f) {
  var or__3548__auto____3827 = cljs.core.fn_QMARK_.call(null, f);
  if(or__3548__auto____3827) {
    return or__3548__auto____3827
  }else {
    var x__384__auto____3828 = f;
    if(cljs.core.truth_(function() {
      var and__3546__auto____3829 = x__384__auto____3828;
      if(cljs.core.truth_(and__3546__auto____3829)) {
        var and__3546__auto____3830 = x__384__auto____3828.cljs$core$IFn$;
        if(cljs.core.truth_(and__3546__auto____3830)) {
          return cljs.core.not.call(null, x__384__auto____3828.hasOwnProperty("cljs$core$IFn$"))
        }else {
          return and__3546__auto____3830
        }
      }else {
        return and__3546__auto____3829
      }
    }())) {
      return true
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.IFn, x__384__auto____3828)
    }
  }
};
cljs.core.integer_QMARK_ = function integer_QMARK_(n) {
  var and__3546__auto____3831 = cljs.core.number_QMARK_.call(null, n);
  if(and__3546__auto____3831) {
    return n == n.toFixed()
  }else {
    return and__3546__auto____3831
  }
};
cljs.core.contains_QMARK_ = function contains_QMARK_(coll, v) {
  if(cljs.core._lookup.call(null, coll, v, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel) {
    return false
  }else {
    return true
  }
};
cljs.core.find = function find(coll, k) {
  if(cljs.core.truth_(function() {
    var and__3546__auto____3832 = coll;
    if(cljs.core.truth_(and__3546__auto____3832)) {
      var and__3546__auto____3833 = cljs.core.associative_QMARK_.call(null, coll);
      if(and__3546__auto____3833) {
        return cljs.core.contains_QMARK_.call(null, coll, k)
      }else {
        return and__3546__auto____3833
      }
    }else {
      return and__3546__auto____3832
    }
  }())) {
    return cljs.core.PersistentVector.fromArray([k, cljs.core._lookup.call(null, coll, k)])
  }else {
    return null
  }
};
cljs.core.distinct_QMARK_ = function() {
  var distinct_QMARK_ = null;
  var distinct_QMARK___1 = function(x) {
    return true
  };
  var distinct_QMARK___2 = function(x, y) {
    return cljs.core.not.call(null, cljs.core._EQ_.call(null, x, y))
  };
  var distinct_QMARK___3 = function() {
    var G__3838__delegate = function(x, y, more) {
      if(cljs.core.not.call(null, cljs.core._EQ_.call(null, x, y))) {
        var s__3834 = cljs.core.set([y, x]);
        var xs__3835 = more;
        while(true) {
          var x__3836 = cljs.core.first.call(null, xs__3835);
          var etc__3837 = cljs.core.next.call(null, xs__3835);
          if(cljs.core.truth_(xs__3835)) {
            if(cljs.core.contains_QMARK_.call(null, s__3834, x__3836)) {
              return false
            }else {
              var G__3839 = cljs.core.conj.call(null, s__3834, x__3836);
              var G__3840 = etc__3837;
              s__3834 = G__3839;
              xs__3835 = G__3840;
              continue
            }
          }else {
            return true
          }
          break
        }
      }else {
        return false
      }
    };
    var G__3838 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3838__delegate.call(this, x, y, more)
    };
    G__3838.cljs$lang$maxFixedArity = 2;
    G__3838.cljs$lang$applyTo = function(arglist__3841) {
      var x = cljs.core.first(arglist__3841);
      var y = cljs.core.first(cljs.core.next(arglist__3841));
      var more = cljs.core.rest(cljs.core.next(arglist__3841));
      return G__3838__delegate.call(this, x, y, more)
    };
    return G__3838
  }();
  distinct_QMARK_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return distinct_QMARK___1.call(this, x);
      case 2:
        return distinct_QMARK___2.call(this, x, y);
      default:
        return distinct_QMARK___3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  distinct_QMARK_.cljs$lang$maxFixedArity = 2;
  distinct_QMARK_.cljs$lang$applyTo = distinct_QMARK___3.cljs$lang$applyTo;
  distinct_QMARK_.cljs$lang$arity$1 = distinct_QMARK___1;
  distinct_QMARK_.cljs$lang$arity$2 = distinct_QMARK___2;
  distinct_QMARK_.cljs$lang$arity$3 = distinct_QMARK___3;
  return distinct_QMARK_
}();
cljs.core.compare = function compare(x, y) {
  if(cljs.core.type.call(null, x) === cljs.core.type.call(null, y)) {
    return goog.array.defaultCompare.call(null, x, y)
  }else {
    if(x === null) {
      return-1
    }else {
      if(y === null) {
        return 1
      }else {
        if("\ufdd0'else") {
          throw new Error("compare on non-nil objects of different types");
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.fn__GT_comparator = function fn__GT_comparator(f) {
  if(cljs.core._EQ_.call(null, f, cljs.core.compare)) {
    return cljs.core.compare
  }else {
    return function(x, y) {
      var r__3842 = f.call(null, x, y);
      if(cljs.core.number_QMARK_.call(null, r__3842)) {
        return r__3842
      }else {
        if(cljs.core.truth_(r__3842)) {
          return-1
        }else {
          if(cljs.core.truth_(f.call(null, y, x))) {
            return 1
          }else {
            return 0
          }
        }
      }
    }
  }
};
void 0;
cljs.core.sort = function() {
  var sort = null;
  var sort__1 = function(coll) {
    return sort.call(null, cljs.core.compare, coll)
  };
  var sort__2 = function(comp, coll) {
    if(cljs.core.truth_(cljs.core.seq.call(null, coll))) {
      var a__3843 = cljs.core.to_array.call(null, coll);
      goog.array.stableSort.call(null, a__3843, cljs.core.fn__GT_comparator.call(null, comp));
      return cljs.core.seq.call(null, a__3843)
    }else {
      return cljs.core.List.EMPTY
    }
  };
  sort = function(comp, coll) {
    switch(arguments.length) {
      case 1:
        return sort__1.call(this, comp);
      case 2:
        return sort__2.call(this, comp, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  sort.cljs$lang$arity$1 = sort__1;
  sort.cljs$lang$arity$2 = sort__2;
  return sort
}();
cljs.core.sort_by = function() {
  var sort_by = null;
  var sort_by__2 = function(keyfn, coll) {
    return sort_by.call(null, keyfn, cljs.core.compare, coll)
  };
  var sort_by__3 = function(keyfn, comp, coll) {
    return cljs.core.sort.call(null, function(x, y) {
      return cljs.core.fn__GT_comparator.call(null, comp).call(null, keyfn.call(null, x), keyfn.call(null, y))
    }, coll)
  };
  sort_by = function(keyfn, comp, coll) {
    switch(arguments.length) {
      case 2:
        return sort_by__2.call(this, keyfn, comp);
      case 3:
        return sort_by__3.call(this, keyfn, comp, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  sort_by.cljs$lang$arity$2 = sort_by__2;
  sort_by.cljs$lang$arity$3 = sort_by__3;
  return sort_by
}();
cljs.core.reduce = function() {
  var reduce = null;
  var reduce__2 = function(f, coll) {
    return cljs.core._reduce.call(null, coll, f)
  };
  var reduce__3 = function(f, val, coll) {
    return cljs.core._reduce.call(null, coll, f, val)
  };
  reduce = function(f, val, coll) {
    switch(arguments.length) {
      case 2:
        return reduce__2.call(this, f, val);
      case 3:
        return reduce__3.call(this, f, val, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  reduce.cljs$lang$arity$2 = reduce__2;
  reduce.cljs$lang$arity$3 = reduce__3;
  return reduce
}();
cljs.core.seq_reduce = function() {
  var seq_reduce = null;
  var seq_reduce__2 = function(f, coll) {
    var temp__3695__auto____3844 = cljs.core.seq.call(null, coll);
    if(cljs.core.truth_(temp__3695__auto____3844)) {
      var s__3845 = temp__3695__auto____3844;
      return cljs.core.reduce.call(null, f, cljs.core.first.call(null, s__3845), cljs.core.next.call(null, s__3845))
    }else {
      return f.call(null)
    }
  };
  var seq_reduce__3 = function(f, val, coll) {
    var val__3846 = val;
    var coll__3847 = cljs.core.seq.call(null, coll);
    while(true) {
      if(cljs.core.truth_(coll__3847)) {
        var G__3848 = f.call(null, val__3846, cljs.core.first.call(null, coll__3847));
        var G__3849 = cljs.core.next.call(null, coll__3847);
        val__3846 = G__3848;
        coll__3847 = G__3849;
        continue
      }else {
        return val__3846
      }
      break
    }
  };
  seq_reduce = function(f, val, coll) {
    switch(arguments.length) {
      case 2:
        return seq_reduce__2.call(this, f, val);
      case 3:
        return seq_reduce__3.call(this, f, val, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  seq_reduce.cljs$lang$arity$2 = seq_reduce__2;
  seq_reduce.cljs$lang$arity$3 = seq_reduce__3;
  return seq_reduce
}();
cljs.core.IReduce["_"] = true;
cljs.core._reduce["_"] = function() {
  var G__3850 = null;
  var G__3850__2 = function(coll, f) {
    return cljs.core.seq_reduce.call(null, f, coll)
  };
  var G__3850__3 = function(coll, f, start) {
    return cljs.core.seq_reduce.call(null, f, start, coll)
  };
  G__3850 = function(coll, f, start) {
    switch(arguments.length) {
      case 2:
        return G__3850__2.call(this, coll, f);
      case 3:
        return G__3850__3.call(this, coll, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3850
}();
cljs.core._PLUS_ = function() {
  var _PLUS_ = null;
  var _PLUS___0 = function() {
    return 0
  };
  var _PLUS___1 = function(x) {
    return x
  };
  var _PLUS___2 = function(x, y) {
    return x + y
  };
  var _PLUS___3 = function() {
    var G__3851__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _PLUS_, x + y, more)
    };
    var G__3851 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3851__delegate.call(this, x, y, more)
    };
    G__3851.cljs$lang$maxFixedArity = 2;
    G__3851.cljs$lang$applyTo = function(arglist__3852) {
      var x = cljs.core.first(arglist__3852);
      var y = cljs.core.first(cljs.core.next(arglist__3852));
      var more = cljs.core.rest(cljs.core.next(arglist__3852));
      return G__3851__delegate.call(this, x, y, more)
    };
    return G__3851
  }();
  _PLUS_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 0:
        return _PLUS___0.call(this);
      case 1:
        return _PLUS___1.call(this, x);
      case 2:
        return _PLUS___2.call(this, x, y);
      default:
        return _PLUS___3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _PLUS_.cljs$lang$maxFixedArity = 2;
  _PLUS_.cljs$lang$applyTo = _PLUS___3.cljs$lang$applyTo;
  _PLUS_.cljs$lang$arity$0 = _PLUS___0;
  _PLUS_.cljs$lang$arity$1 = _PLUS___1;
  _PLUS_.cljs$lang$arity$2 = _PLUS___2;
  _PLUS_.cljs$lang$arity$3 = _PLUS___3;
  return _PLUS_
}();
cljs.core._ = function() {
  var _ = null;
  var ___1 = function(x) {
    return-x
  };
  var ___2 = function(x, y) {
    return x - y
  };
  var ___3 = function() {
    var G__3853__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _, x - y, more)
    };
    var G__3853 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3853__delegate.call(this, x, y, more)
    };
    G__3853.cljs$lang$maxFixedArity = 2;
    G__3853.cljs$lang$applyTo = function(arglist__3854) {
      var x = cljs.core.first(arglist__3854);
      var y = cljs.core.first(cljs.core.next(arglist__3854));
      var more = cljs.core.rest(cljs.core.next(arglist__3854));
      return G__3853__delegate.call(this, x, y, more)
    };
    return G__3853
  }();
  _ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return ___1.call(this, x);
      case 2:
        return ___2.call(this, x, y);
      default:
        return ___3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _.cljs$lang$maxFixedArity = 2;
  _.cljs$lang$applyTo = ___3.cljs$lang$applyTo;
  _.cljs$lang$arity$1 = ___1;
  _.cljs$lang$arity$2 = ___2;
  _.cljs$lang$arity$3 = ___3;
  return _
}();
cljs.core._STAR_ = function() {
  var _STAR_ = null;
  var _STAR___0 = function() {
    return 1
  };
  var _STAR___1 = function(x) {
    return x
  };
  var _STAR___2 = function(x, y) {
    return x * y
  };
  var _STAR___3 = function() {
    var G__3855__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _STAR_, x * y, more)
    };
    var G__3855 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3855__delegate.call(this, x, y, more)
    };
    G__3855.cljs$lang$maxFixedArity = 2;
    G__3855.cljs$lang$applyTo = function(arglist__3856) {
      var x = cljs.core.first(arglist__3856);
      var y = cljs.core.first(cljs.core.next(arglist__3856));
      var more = cljs.core.rest(cljs.core.next(arglist__3856));
      return G__3855__delegate.call(this, x, y, more)
    };
    return G__3855
  }();
  _STAR_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 0:
        return _STAR___0.call(this);
      case 1:
        return _STAR___1.call(this, x);
      case 2:
        return _STAR___2.call(this, x, y);
      default:
        return _STAR___3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _STAR_.cljs$lang$maxFixedArity = 2;
  _STAR_.cljs$lang$applyTo = _STAR___3.cljs$lang$applyTo;
  _STAR_.cljs$lang$arity$0 = _STAR___0;
  _STAR_.cljs$lang$arity$1 = _STAR___1;
  _STAR_.cljs$lang$arity$2 = _STAR___2;
  _STAR_.cljs$lang$arity$3 = _STAR___3;
  return _STAR_
}();
cljs.core._SLASH_ = function() {
  var _SLASH_ = null;
  var _SLASH___1 = function(x) {
    return _SLASH_.call(null, 1, x)
  };
  var _SLASH___2 = function(x, y) {
    return x / y
  };
  var _SLASH___3 = function() {
    var G__3857__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _SLASH_, _SLASH_.call(null, x, y), more)
    };
    var G__3857 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3857__delegate.call(this, x, y, more)
    };
    G__3857.cljs$lang$maxFixedArity = 2;
    G__3857.cljs$lang$applyTo = function(arglist__3858) {
      var x = cljs.core.first(arglist__3858);
      var y = cljs.core.first(cljs.core.next(arglist__3858));
      var more = cljs.core.rest(cljs.core.next(arglist__3858));
      return G__3857__delegate.call(this, x, y, more)
    };
    return G__3857
  }();
  _SLASH_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _SLASH___1.call(this, x);
      case 2:
        return _SLASH___2.call(this, x, y);
      default:
        return _SLASH___3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _SLASH_.cljs$lang$maxFixedArity = 2;
  _SLASH_.cljs$lang$applyTo = _SLASH___3.cljs$lang$applyTo;
  _SLASH_.cljs$lang$arity$1 = _SLASH___1;
  _SLASH_.cljs$lang$arity$2 = _SLASH___2;
  _SLASH_.cljs$lang$arity$3 = _SLASH___3;
  return _SLASH_
}();
cljs.core._LT_ = function() {
  var _LT_ = null;
  var _LT___1 = function(x) {
    return true
  };
  var _LT___2 = function(x, y) {
    return x < y
  };
  var _LT___3 = function() {
    var G__3859__delegate = function(x, y, more) {
      while(true) {
        if(x < y) {
          if(cljs.core.truth_(cljs.core.next.call(null, more))) {
            var G__3860 = y;
            var G__3861 = cljs.core.first.call(null, more);
            var G__3862 = cljs.core.next.call(null, more);
            x = G__3860;
            y = G__3861;
            more = G__3862;
            continue
          }else {
            return y < cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__3859 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3859__delegate.call(this, x, y, more)
    };
    G__3859.cljs$lang$maxFixedArity = 2;
    G__3859.cljs$lang$applyTo = function(arglist__3863) {
      var x = cljs.core.first(arglist__3863);
      var y = cljs.core.first(cljs.core.next(arglist__3863));
      var more = cljs.core.rest(cljs.core.next(arglist__3863));
      return G__3859__delegate.call(this, x, y, more)
    };
    return G__3859
  }();
  _LT_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _LT___1.call(this, x);
      case 2:
        return _LT___2.call(this, x, y);
      default:
        return _LT___3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _LT_.cljs$lang$maxFixedArity = 2;
  _LT_.cljs$lang$applyTo = _LT___3.cljs$lang$applyTo;
  _LT_.cljs$lang$arity$1 = _LT___1;
  _LT_.cljs$lang$arity$2 = _LT___2;
  _LT_.cljs$lang$arity$3 = _LT___3;
  return _LT_
}();
cljs.core._LT__EQ_ = function() {
  var _LT__EQ_ = null;
  var _LT__EQ___1 = function(x) {
    return true
  };
  var _LT__EQ___2 = function(x, y) {
    return x <= y
  };
  var _LT__EQ___3 = function() {
    var G__3864__delegate = function(x, y, more) {
      while(true) {
        if(x <= y) {
          if(cljs.core.truth_(cljs.core.next.call(null, more))) {
            var G__3865 = y;
            var G__3866 = cljs.core.first.call(null, more);
            var G__3867 = cljs.core.next.call(null, more);
            x = G__3865;
            y = G__3866;
            more = G__3867;
            continue
          }else {
            return y <= cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__3864 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3864__delegate.call(this, x, y, more)
    };
    G__3864.cljs$lang$maxFixedArity = 2;
    G__3864.cljs$lang$applyTo = function(arglist__3868) {
      var x = cljs.core.first(arglist__3868);
      var y = cljs.core.first(cljs.core.next(arglist__3868));
      var more = cljs.core.rest(cljs.core.next(arglist__3868));
      return G__3864__delegate.call(this, x, y, more)
    };
    return G__3864
  }();
  _LT__EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _LT__EQ___1.call(this, x);
      case 2:
        return _LT__EQ___2.call(this, x, y);
      default:
        return _LT__EQ___3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _LT__EQ_.cljs$lang$maxFixedArity = 2;
  _LT__EQ_.cljs$lang$applyTo = _LT__EQ___3.cljs$lang$applyTo;
  _LT__EQ_.cljs$lang$arity$1 = _LT__EQ___1;
  _LT__EQ_.cljs$lang$arity$2 = _LT__EQ___2;
  _LT__EQ_.cljs$lang$arity$3 = _LT__EQ___3;
  return _LT__EQ_
}();
cljs.core._GT_ = function() {
  var _GT_ = null;
  var _GT___1 = function(x) {
    return true
  };
  var _GT___2 = function(x, y) {
    return x > y
  };
  var _GT___3 = function() {
    var G__3869__delegate = function(x, y, more) {
      while(true) {
        if(x > y) {
          if(cljs.core.truth_(cljs.core.next.call(null, more))) {
            var G__3870 = y;
            var G__3871 = cljs.core.first.call(null, more);
            var G__3872 = cljs.core.next.call(null, more);
            x = G__3870;
            y = G__3871;
            more = G__3872;
            continue
          }else {
            return y > cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__3869 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3869__delegate.call(this, x, y, more)
    };
    G__3869.cljs$lang$maxFixedArity = 2;
    G__3869.cljs$lang$applyTo = function(arglist__3873) {
      var x = cljs.core.first(arglist__3873);
      var y = cljs.core.first(cljs.core.next(arglist__3873));
      var more = cljs.core.rest(cljs.core.next(arglist__3873));
      return G__3869__delegate.call(this, x, y, more)
    };
    return G__3869
  }();
  _GT_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _GT___1.call(this, x);
      case 2:
        return _GT___2.call(this, x, y);
      default:
        return _GT___3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _GT_.cljs$lang$maxFixedArity = 2;
  _GT_.cljs$lang$applyTo = _GT___3.cljs$lang$applyTo;
  _GT_.cljs$lang$arity$1 = _GT___1;
  _GT_.cljs$lang$arity$2 = _GT___2;
  _GT_.cljs$lang$arity$3 = _GT___3;
  return _GT_
}();
cljs.core._GT__EQ_ = function() {
  var _GT__EQ_ = null;
  var _GT__EQ___1 = function(x) {
    return true
  };
  var _GT__EQ___2 = function(x, y) {
    return x >= y
  };
  var _GT__EQ___3 = function() {
    var G__3874__delegate = function(x, y, more) {
      while(true) {
        if(x >= y) {
          if(cljs.core.truth_(cljs.core.next.call(null, more))) {
            var G__3875 = y;
            var G__3876 = cljs.core.first.call(null, more);
            var G__3877 = cljs.core.next.call(null, more);
            x = G__3875;
            y = G__3876;
            more = G__3877;
            continue
          }else {
            return y >= cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__3874 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3874__delegate.call(this, x, y, more)
    };
    G__3874.cljs$lang$maxFixedArity = 2;
    G__3874.cljs$lang$applyTo = function(arglist__3878) {
      var x = cljs.core.first(arglist__3878);
      var y = cljs.core.first(cljs.core.next(arglist__3878));
      var more = cljs.core.rest(cljs.core.next(arglist__3878));
      return G__3874__delegate.call(this, x, y, more)
    };
    return G__3874
  }();
  _GT__EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _GT__EQ___1.call(this, x);
      case 2:
        return _GT__EQ___2.call(this, x, y);
      default:
        return _GT__EQ___3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _GT__EQ_.cljs$lang$maxFixedArity = 2;
  _GT__EQ_.cljs$lang$applyTo = _GT__EQ___3.cljs$lang$applyTo;
  _GT__EQ_.cljs$lang$arity$1 = _GT__EQ___1;
  _GT__EQ_.cljs$lang$arity$2 = _GT__EQ___2;
  _GT__EQ_.cljs$lang$arity$3 = _GT__EQ___3;
  return _GT__EQ_
}();
cljs.core.dec = function dec(x) {
  return x - 1
};
cljs.core.max = function() {
  var max = null;
  var max__1 = function(x) {
    return x
  };
  var max__2 = function(x, y) {
    return x > y ? x : y
  };
  var max__3 = function() {
    var G__3879__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, max, x > y ? x : y, more)
    };
    var G__3879 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3879__delegate.call(this, x, y, more)
    };
    G__3879.cljs$lang$maxFixedArity = 2;
    G__3879.cljs$lang$applyTo = function(arglist__3880) {
      var x = cljs.core.first(arglist__3880);
      var y = cljs.core.first(cljs.core.next(arglist__3880));
      var more = cljs.core.rest(cljs.core.next(arglist__3880));
      return G__3879__delegate.call(this, x, y, more)
    };
    return G__3879
  }();
  max = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return max__1.call(this, x);
      case 2:
        return max__2.call(this, x, y);
      default:
        return max__3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  max.cljs$lang$maxFixedArity = 2;
  max.cljs$lang$applyTo = max__3.cljs$lang$applyTo;
  max.cljs$lang$arity$1 = max__1;
  max.cljs$lang$arity$2 = max__2;
  max.cljs$lang$arity$3 = max__3;
  return max
}();
cljs.core.min = function() {
  var min = null;
  var min__1 = function(x) {
    return x
  };
  var min__2 = function(x, y) {
    return x < y ? x : y
  };
  var min__3 = function() {
    var G__3881__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, min, x < y ? x : y, more)
    };
    var G__3881 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3881__delegate.call(this, x, y, more)
    };
    G__3881.cljs$lang$maxFixedArity = 2;
    G__3881.cljs$lang$applyTo = function(arglist__3882) {
      var x = cljs.core.first(arglist__3882);
      var y = cljs.core.first(cljs.core.next(arglist__3882));
      var more = cljs.core.rest(cljs.core.next(arglist__3882));
      return G__3881__delegate.call(this, x, y, more)
    };
    return G__3881
  }();
  min = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return min__1.call(this, x);
      case 2:
        return min__2.call(this, x, y);
      default:
        return min__3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  min.cljs$lang$maxFixedArity = 2;
  min.cljs$lang$applyTo = min__3.cljs$lang$applyTo;
  min.cljs$lang$arity$1 = min__1;
  min.cljs$lang$arity$2 = min__2;
  min.cljs$lang$arity$3 = min__3;
  return min
}();
cljs.core.fix = function fix(q) {
  if(q >= 0) {
    return Math.floor.call(null, q)
  }else {
    return Math.ceil.call(null, q)
  }
};
cljs.core.int$ = function int$(x) {
  return cljs.core.fix.call(null, x)
};
cljs.core.long$ = function long$(x) {
  return cljs.core.fix.call(null, x)
};
cljs.core.mod = function mod(n, d) {
  return n % d
};
cljs.core.quot = function quot(n, d) {
  var rem__3883 = n % d;
  return cljs.core.fix.call(null, (n - rem__3883) / d)
};
cljs.core.rem = function rem(n, d) {
  var q__3884 = cljs.core.quot.call(null, n, d);
  return n - d * q__3884
};
cljs.core.rand = function() {
  var rand = null;
  var rand__0 = function() {
    return Math.random.call(null)
  };
  var rand__1 = function(n) {
    return n * rand.call(null)
  };
  rand = function(n) {
    switch(arguments.length) {
      case 0:
        return rand__0.call(this);
      case 1:
        return rand__1.call(this, n)
    }
    throw"Invalid arity: " + arguments.length;
  };
  rand.cljs$lang$arity$0 = rand__0;
  rand.cljs$lang$arity$1 = rand__1;
  return rand
}();
cljs.core.rand_int = function rand_int(n) {
  return cljs.core.fix.call(null, cljs.core.rand.call(null, n))
};
cljs.core.bit_xor = function bit_xor(x, y) {
  return x ^ y
};
cljs.core.bit_and = function bit_and(x, y) {
  return x & y
};
cljs.core.bit_or = function bit_or(x, y) {
  return x | y
};
cljs.core.bit_and_not = function bit_and_not(x, y) {
  return x & ~y
};
cljs.core.bit_clear = function bit_clear(x, n) {
  return x & ~(1 << n)
};
cljs.core.bit_flip = function bit_flip(x, n) {
  return x ^ 1 << n
};
cljs.core.bit_not = function bit_not(x) {
  return~x
};
cljs.core.bit_set = function bit_set(x, n) {
  return x | 1 << n
};
cljs.core.bit_test = function bit_test(x, n) {
  return(x & 1 << n) != 0
};
cljs.core.bit_shift_left = function bit_shift_left(x, n) {
  return x << n
};
cljs.core.bit_shift_right = function bit_shift_right(x, n) {
  return x >> n
};
cljs.core.bit_shift_right_zero_fill = function bit_shift_right_zero_fill(x, n) {
  return x >>> n
};
cljs.core.bit_count = function bit_count(n) {
  var c__3885 = 0;
  var n__3886 = n;
  while(true) {
    if(n__3886 === 0) {
      return c__3885
    }else {
      var G__3887 = c__3885 + 1;
      var G__3888 = n__3886 & n__3886 - 1;
      c__3885 = G__3887;
      n__3886 = G__3888;
      continue
    }
    break
  }
};
cljs.core._EQ__EQ_ = function() {
  var _EQ__EQ_ = null;
  var _EQ__EQ___1 = function(x) {
    return true
  };
  var _EQ__EQ___2 = function(x, y) {
    return cljs.core._equiv.call(null, x, y)
  };
  var _EQ__EQ___3 = function() {
    var G__3889__delegate = function(x, y, more) {
      while(true) {
        if(cljs.core.truth_(_EQ__EQ_.call(null, x, y))) {
          if(cljs.core.truth_(cljs.core.next.call(null, more))) {
            var G__3890 = y;
            var G__3891 = cljs.core.first.call(null, more);
            var G__3892 = cljs.core.next.call(null, more);
            x = G__3890;
            y = G__3891;
            more = G__3892;
            continue
          }else {
            return _EQ__EQ_.call(null, y, cljs.core.first.call(null, more))
          }
        }else {
          return false
        }
        break
      }
    };
    var G__3889 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3889__delegate.call(this, x, y, more)
    };
    G__3889.cljs$lang$maxFixedArity = 2;
    G__3889.cljs$lang$applyTo = function(arglist__3893) {
      var x = cljs.core.first(arglist__3893);
      var y = cljs.core.first(cljs.core.next(arglist__3893));
      var more = cljs.core.rest(cljs.core.next(arglist__3893));
      return G__3889__delegate.call(this, x, y, more)
    };
    return G__3889
  }();
  _EQ__EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _EQ__EQ___1.call(this, x);
      case 2:
        return _EQ__EQ___2.call(this, x, y);
      default:
        return _EQ__EQ___3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _EQ__EQ_.cljs$lang$maxFixedArity = 2;
  _EQ__EQ_.cljs$lang$applyTo = _EQ__EQ___3.cljs$lang$applyTo;
  _EQ__EQ_.cljs$lang$arity$1 = _EQ__EQ___1;
  _EQ__EQ_.cljs$lang$arity$2 = _EQ__EQ___2;
  _EQ__EQ_.cljs$lang$arity$3 = _EQ__EQ___3;
  return _EQ__EQ_
}();
cljs.core.pos_QMARK_ = function pos_QMARK_(n) {
  return n > 0
};
cljs.core.zero_QMARK_ = function zero_QMARK_(n) {
  return n === 0
};
cljs.core.neg_QMARK_ = function neg_QMARK_(x) {
  return x < 0
};
cljs.core.nthnext = function nthnext(coll, n) {
  var n__3894 = n;
  var xs__3895 = cljs.core.seq.call(null, coll);
  while(true) {
    if(cljs.core.truth_(function() {
      var and__3546__auto____3896 = xs__3895;
      if(cljs.core.truth_(and__3546__auto____3896)) {
        return n__3894 > 0
      }else {
        return and__3546__auto____3896
      }
    }())) {
      var G__3897 = n__3894 - 1;
      var G__3898 = cljs.core.next.call(null, xs__3895);
      n__3894 = G__3897;
      xs__3895 = G__3898;
      continue
    }else {
      return xs__3895
    }
    break
  }
};
cljs.core.IIndexed["_"] = true;
cljs.core._nth["_"] = function() {
  var G__3903 = null;
  var G__3903__2 = function(coll, n) {
    var temp__3695__auto____3899 = cljs.core.nthnext.call(null, coll, n);
    if(cljs.core.truth_(temp__3695__auto____3899)) {
      var xs__3900 = temp__3695__auto____3899;
      return cljs.core.first.call(null, xs__3900)
    }else {
      throw new Error("Index out of bounds");
    }
  };
  var G__3903__3 = function(coll, n, not_found) {
    var temp__3695__auto____3901 = cljs.core.nthnext.call(null, coll, n);
    if(cljs.core.truth_(temp__3695__auto____3901)) {
      var xs__3902 = temp__3695__auto____3901;
      return cljs.core.first.call(null, xs__3902)
    }else {
      return not_found
    }
  };
  G__3903 = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3903__2.call(this, coll, n);
      case 3:
        return G__3903__3.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3903
}();
cljs.core.str_STAR_ = function() {
  var str_STAR_ = null;
  var str_STAR___0 = function() {
    return""
  };
  var str_STAR___1 = function(x) {
    if(x === null) {
      return""
    }else {
      if("\ufdd0'else") {
        return x.toString()
      }else {
        return null
      }
    }
  };
  var str_STAR___2 = function() {
    var G__3904__delegate = function(x, ys) {
      return function(sb, more) {
        while(true) {
          if(cljs.core.truth_(more)) {
            var G__3905 = sb.append(str_STAR_.call(null, cljs.core.first.call(null, more)));
            var G__3906 = cljs.core.next.call(null, more);
            sb = G__3905;
            more = G__3906;
            continue
          }else {
            return str_STAR_.call(null, sb)
          }
          break
        }
      }.call(null, new goog.string.StringBuffer(str_STAR_.call(null, x)), ys)
    };
    var G__3904 = function(x, var_args) {
      var ys = null;
      if(goog.isDef(var_args)) {
        ys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__3904__delegate.call(this, x, ys)
    };
    G__3904.cljs$lang$maxFixedArity = 1;
    G__3904.cljs$lang$applyTo = function(arglist__3907) {
      var x = cljs.core.first(arglist__3907);
      var ys = cljs.core.rest(arglist__3907);
      return G__3904__delegate.call(this, x, ys)
    };
    return G__3904
  }();
  str_STAR_ = function(x, var_args) {
    var ys = var_args;
    switch(arguments.length) {
      case 0:
        return str_STAR___0.call(this);
      case 1:
        return str_STAR___1.call(this, x);
      default:
        return str_STAR___2.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  str_STAR_.cljs$lang$maxFixedArity = 1;
  str_STAR_.cljs$lang$applyTo = str_STAR___2.cljs$lang$applyTo;
  str_STAR_.cljs$lang$arity$0 = str_STAR___0;
  str_STAR_.cljs$lang$arity$1 = str_STAR___1;
  str_STAR_.cljs$lang$arity$2 = str_STAR___2;
  return str_STAR_
}();
cljs.core.str = function() {
  var str = null;
  var str__0 = function() {
    return""
  };
  var str__1 = function(x) {
    if(cljs.core.symbol_QMARK_.call(null, x)) {
      return x.substring(2, x.length)
    }else {
      if(cljs.core.keyword_QMARK_.call(null, x)) {
        return cljs.core.str_STAR_.call(null, ":", x.substring(2, x.length))
      }else {
        if(x === null) {
          return""
        }else {
          if("\ufdd0'else") {
            return x.toString()
          }else {
            return null
          }
        }
      }
    }
  };
  var str__2 = function() {
    var G__3908__delegate = function(x, ys) {
      return function(sb, more) {
        while(true) {
          if(cljs.core.truth_(more)) {
            var G__3909 = sb.append(str.call(null, cljs.core.first.call(null, more)));
            var G__3910 = cljs.core.next.call(null, more);
            sb = G__3909;
            more = G__3910;
            continue
          }else {
            return cljs.core.str_STAR_.call(null, sb)
          }
          break
        }
      }.call(null, new goog.string.StringBuffer(str.call(null, x)), ys)
    };
    var G__3908 = function(x, var_args) {
      var ys = null;
      if(goog.isDef(var_args)) {
        ys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__3908__delegate.call(this, x, ys)
    };
    G__3908.cljs$lang$maxFixedArity = 1;
    G__3908.cljs$lang$applyTo = function(arglist__3911) {
      var x = cljs.core.first(arglist__3911);
      var ys = cljs.core.rest(arglist__3911);
      return G__3908__delegate.call(this, x, ys)
    };
    return G__3908
  }();
  str = function(x, var_args) {
    var ys = var_args;
    switch(arguments.length) {
      case 0:
        return str__0.call(this);
      case 1:
        return str__1.call(this, x);
      default:
        return str__2.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  str.cljs$lang$maxFixedArity = 1;
  str.cljs$lang$applyTo = str__2.cljs$lang$applyTo;
  str.cljs$lang$arity$0 = str__0;
  str.cljs$lang$arity$1 = str__1;
  str.cljs$lang$arity$2 = str__2;
  return str
}();
cljs.core.subs = function() {
  var subs = null;
  var subs__2 = function(s, start) {
    return s.substring(start)
  };
  var subs__3 = function(s, start, end) {
    return s.substring(start, end)
  };
  subs = function(s, start, end) {
    switch(arguments.length) {
      case 2:
        return subs__2.call(this, s, start);
      case 3:
        return subs__3.call(this, s, start, end)
    }
    throw"Invalid arity: " + arguments.length;
  };
  subs.cljs$lang$arity$2 = subs__2;
  subs.cljs$lang$arity$3 = subs__3;
  return subs
}();
cljs.core.symbol = function() {
  var symbol = null;
  var symbol__1 = function(name) {
    if(cljs.core.symbol_QMARK_.call(null, name)) {
      name
    }else {
      if(cljs.core.keyword_QMARK_.call(null, name)) {
        cljs.core.str_STAR_.call(null, "\ufdd1", "'", cljs.core.subs.call(null, name, 2))
      }else {
      }
    }
    return cljs.core.str_STAR_.call(null, "\ufdd1", "'", name)
  };
  var symbol__2 = function(ns, name) {
    return symbol.call(null, cljs.core.str_STAR_.call(null, ns, "/", name))
  };
  symbol = function(ns, name) {
    switch(arguments.length) {
      case 1:
        return symbol__1.call(this, ns);
      case 2:
        return symbol__2.call(this, ns, name)
    }
    throw"Invalid arity: " + arguments.length;
  };
  symbol.cljs$lang$arity$1 = symbol__1;
  symbol.cljs$lang$arity$2 = symbol__2;
  return symbol
}();
cljs.core.keyword = function() {
  var keyword = null;
  var keyword__1 = function(name) {
    if(cljs.core.keyword_QMARK_.call(null, name)) {
      return name
    }else {
      if(cljs.core.symbol_QMARK_.call(null, name)) {
        return cljs.core.str_STAR_.call(null, "\ufdd0", "'", cljs.core.subs.call(null, name, 2))
      }else {
        if("\ufdd0'else") {
          return cljs.core.str_STAR_.call(null, "\ufdd0", "'", name)
        }else {
          return null
        }
      }
    }
  };
  var keyword__2 = function(ns, name) {
    return keyword.call(null, cljs.core.str_STAR_.call(null, ns, "/", name))
  };
  keyword = function(ns, name) {
    switch(arguments.length) {
      case 1:
        return keyword__1.call(this, ns);
      case 2:
        return keyword__2.call(this, ns, name)
    }
    throw"Invalid arity: " + arguments.length;
  };
  keyword.cljs$lang$arity$1 = keyword__1;
  keyword.cljs$lang$arity$2 = keyword__2;
  return keyword
}();
cljs.core.equiv_sequential = function equiv_sequential(x, y) {
  return cljs.core.boolean$.call(null, cljs.core.sequential_QMARK_.call(null, y) ? function() {
    var xs__3912 = cljs.core.seq.call(null, x);
    var ys__3913 = cljs.core.seq.call(null, y);
    while(true) {
      if(xs__3912 === null) {
        return ys__3913 === null
      }else {
        if(ys__3913 === null) {
          return false
        }else {
          if(cljs.core._EQ_.call(null, cljs.core.first.call(null, xs__3912), cljs.core.first.call(null, ys__3913))) {
            var G__3914 = cljs.core.next.call(null, xs__3912);
            var G__3915 = cljs.core.next.call(null, ys__3913);
            xs__3912 = G__3914;
            ys__3913 = G__3915;
            continue
          }else {
            if("\ufdd0'else") {
              return false
            }else {
              return null
            }
          }
        }
      }
      break
    }
  }() : null)
};
cljs.core.hash_combine = function hash_combine(seed, hash) {
  return seed ^ hash + 2654435769 + (seed << 6) + (seed >> 2)
};
cljs.core.hash_coll = function hash_coll(coll) {
  return cljs.core.reduce.call(null, function(p1__3916_SHARP_, p2__3917_SHARP_) {
    return cljs.core.hash_combine.call(null, p1__3916_SHARP_, cljs.core.hash.call(null, p2__3917_SHARP_))
  }, cljs.core.hash.call(null, cljs.core.first.call(null, coll)), cljs.core.next.call(null, coll))
};
void 0;
void 0;
cljs.core.hash_imap = function hash_imap(m) {
  var h__3918 = 0;
  var s__3919 = cljs.core.seq.call(null, m);
  while(true) {
    if(cljs.core.truth_(s__3919)) {
      var e__3920 = cljs.core.first.call(null, s__3919);
      var G__3921 = (h__3918 + (cljs.core.hash.call(null, cljs.core.key.call(null, e__3920)) ^ cljs.core.hash.call(null, cljs.core.val.call(null, e__3920)))) % 4503599627370496;
      var G__3922 = cljs.core.next.call(null, s__3919);
      h__3918 = G__3921;
      s__3919 = G__3922;
      continue
    }else {
      return h__3918
    }
    break
  }
};
cljs.core.hash_iset = function hash_iset(s) {
  var h__3923 = 0;
  var s__3924 = cljs.core.seq.call(null, s);
  while(true) {
    if(cljs.core.truth_(s__3924)) {
      var e__3925 = cljs.core.first.call(null, s__3924);
      var G__3926 = (h__3923 + cljs.core.hash.call(null, e__3925)) % 4503599627370496;
      var G__3927 = cljs.core.next.call(null, s__3924);
      h__3923 = G__3926;
      s__3924 = G__3927;
      continue
    }else {
      return h__3923
    }
    break
  }
};
void 0;
cljs.core.extend_object_BANG_ = function extend_object_BANG_(obj, fn_map) {
  var G__3928__3929 = cljs.core.seq.call(null, fn_map);
  if(cljs.core.truth_(G__3928__3929)) {
    var G__3931__3933 = cljs.core.first.call(null, G__3928__3929);
    var vec__3932__3934 = G__3931__3933;
    var key_name__3935 = cljs.core.nth.call(null, vec__3932__3934, 0, null);
    var f__3936 = cljs.core.nth.call(null, vec__3932__3934, 1, null);
    var G__3928__3937 = G__3928__3929;
    var G__3931__3938 = G__3931__3933;
    var G__3928__3939 = G__3928__3937;
    while(true) {
      var vec__3940__3941 = G__3931__3938;
      var key_name__3942 = cljs.core.nth.call(null, vec__3940__3941, 0, null);
      var f__3943 = cljs.core.nth.call(null, vec__3940__3941, 1, null);
      var G__3928__3944 = G__3928__3939;
      var str_name__3945 = cljs.core.name.call(null, key_name__3942);
      obj[str_name__3945] = f__3943;
      var temp__3698__auto____3946 = cljs.core.next.call(null, G__3928__3944);
      if(cljs.core.truth_(temp__3698__auto____3946)) {
        var G__3928__3947 = temp__3698__auto____3946;
        var G__3948 = cljs.core.first.call(null, G__3928__3947);
        var G__3949 = G__3928__3947;
        G__3931__3938 = G__3948;
        G__3928__3939 = G__3949;
        continue
      }else {
      }
      break
    }
  }else {
  }
  return obj
};
cljs.core.List = function(meta, first, rest, count) {
  this.meta = meta;
  this.first = first;
  this.rest = rest;
  this.count = count
};
cljs.core.List.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.List")
};
cljs.core.List.prototype.cljs$core$IHash$ = true;
cljs.core.List.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__3950 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.List.prototype.cljs$core$ISequential$ = true;
cljs.core.List.prototype.cljs$core$ICollection$ = true;
cljs.core.List.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__3951 = this;
  return new cljs.core.List(this__3951.meta, o, coll, this__3951.count + 1)
};
cljs.core.List.prototype.toString = function() {
  var this__3952 = this;
  var this$__3953 = this;
  return cljs.core.pr_str.call(null, this$__3953)
};
cljs.core.List.prototype.cljs$core$ISeqable$ = true;
cljs.core.List.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__3954 = this;
  return coll
};
cljs.core.List.prototype.cljs$core$ICounted$ = true;
cljs.core.List.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__3955 = this;
  return this__3955.count
};
cljs.core.List.prototype.cljs$core$IStack$ = true;
cljs.core.List.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__3956 = this;
  return this__3956.first
};
cljs.core.List.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__3957 = this;
  return cljs.core._rest.call(null, coll)
};
cljs.core.List.prototype.cljs$core$ISeq$ = true;
cljs.core.List.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__3958 = this;
  return this__3958.first
};
cljs.core.List.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__3959 = this;
  return this__3959.rest
};
cljs.core.List.prototype.cljs$core$IEquiv$ = true;
cljs.core.List.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__3960 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.List.prototype.cljs$core$IWithMeta$ = true;
cljs.core.List.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__3961 = this;
  return new cljs.core.List(meta, this__3961.first, this__3961.rest, this__3961.count)
};
cljs.core.List.prototype.cljs$core$IMeta$ = true;
cljs.core.List.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__3962 = this;
  return this__3962.meta
};
cljs.core.List.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.List.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__3963 = this;
  return cljs.core.List.EMPTY
};
cljs.core.List.prototype.cljs$core$IList$ = true;
cljs.core.List;
cljs.core.EmptyList = function(meta) {
  this.meta = meta
};
cljs.core.EmptyList.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.EmptyList")
};
cljs.core.EmptyList.prototype.cljs$core$IHash$ = true;
cljs.core.EmptyList.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__3964 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.EmptyList.prototype.cljs$core$ISequential$ = true;
cljs.core.EmptyList.prototype.cljs$core$ICollection$ = true;
cljs.core.EmptyList.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__3965 = this;
  return new cljs.core.List(this__3965.meta, o, null, 1)
};
cljs.core.EmptyList.prototype.toString = function() {
  var this__3966 = this;
  var this$__3967 = this;
  return cljs.core.pr_str.call(null, this$__3967)
};
cljs.core.EmptyList.prototype.cljs$core$ISeqable$ = true;
cljs.core.EmptyList.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__3968 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$ICounted$ = true;
cljs.core.EmptyList.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__3969 = this;
  return 0
};
cljs.core.EmptyList.prototype.cljs$core$IStack$ = true;
cljs.core.EmptyList.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__3970 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__3971 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$ISeq$ = true;
cljs.core.EmptyList.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__3972 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__3973 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$IEquiv$ = true;
cljs.core.EmptyList.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__3974 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.EmptyList.prototype.cljs$core$IWithMeta$ = true;
cljs.core.EmptyList.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__3975 = this;
  return new cljs.core.EmptyList(meta)
};
cljs.core.EmptyList.prototype.cljs$core$IMeta$ = true;
cljs.core.EmptyList.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__3976 = this;
  return this__3976.meta
};
cljs.core.EmptyList.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.EmptyList.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__3977 = this;
  return coll
};
cljs.core.EmptyList.prototype.cljs$core$IList$ = true;
cljs.core.EmptyList;
cljs.core.List.EMPTY = new cljs.core.EmptyList(null);
cljs.core.reversible_QMARK_ = function reversible_QMARK_(coll) {
  var x__384__auto____3978 = coll;
  if(cljs.core.truth_(function() {
    var and__3546__auto____3979 = x__384__auto____3978;
    if(cljs.core.truth_(and__3546__auto____3979)) {
      var and__3546__auto____3980 = x__384__auto____3978.cljs$core$IReversible$;
      if(cljs.core.truth_(and__3546__auto____3980)) {
        return cljs.core.not.call(null, x__384__auto____3978.hasOwnProperty("cljs$core$IReversible$"))
      }else {
        return and__3546__auto____3980
      }
    }else {
      return and__3546__auto____3979
    }
  }())) {
    return true
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IReversible, x__384__auto____3978)
  }
};
cljs.core.rseq = function rseq(coll) {
  return cljs.core._rseq.call(null, coll)
};
cljs.core.reverse = function reverse(coll) {
  return cljs.core.reduce.call(null, cljs.core.conj, cljs.core.List.EMPTY, coll)
};
cljs.core.list = function() {
  var list__delegate = function(items) {
    return cljs.core.reduce.call(null, cljs.core.conj, cljs.core.List.EMPTY, cljs.core.reverse.call(null, items))
  };
  var list = function(var_args) {
    var items = null;
    if(goog.isDef(var_args)) {
      items = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return list__delegate.call(this, items)
  };
  list.cljs$lang$maxFixedArity = 0;
  list.cljs$lang$applyTo = function(arglist__3981) {
    var items = cljs.core.seq(arglist__3981);
    return list__delegate.call(this, items)
  };
  return list
}();
cljs.core.Cons = function(meta, first, rest) {
  this.meta = meta;
  this.first = first;
  this.rest = rest
};
cljs.core.Cons.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.Cons")
};
cljs.core.Cons.prototype.cljs$core$IHash$ = true;
cljs.core.Cons.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__3982 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.Cons.prototype.cljs$core$ISequential$ = true;
cljs.core.Cons.prototype.cljs$core$ICollection$ = true;
cljs.core.Cons.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__3983 = this;
  return new cljs.core.Cons(null, o, coll)
};
cljs.core.Cons.prototype.toString = function() {
  var this__3984 = this;
  var this$__3985 = this;
  return cljs.core.pr_str.call(null, this$__3985)
};
cljs.core.Cons.prototype.cljs$core$ISeqable$ = true;
cljs.core.Cons.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__3986 = this;
  return coll
};
cljs.core.Cons.prototype.cljs$core$ISeq$ = true;
cljs.core.Cons.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__3987 = this;
  return this__3987.first
};
cljs.core.Cons.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__3988 = this;
  if(this__3988.rest === null) {
    return cljs.core.List.EMPTY
  }else {
    return this__3988.rest
  }
};
cljs.core.Cons.prototype.cljs$core$IEquiv$ = true;
cljs.core.Cons.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__3989 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.Cons.prototype.cljs$core$IWithMeta$ = true;
cljs.core.Cons.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__3990 = this;
  return new cljs.core.Cons(meta, this__3990.first, this__3990.rest)
};
cljs.core.Cons.prototype.cljs$core$IMeta$ = true;
cljs.core.Cons.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__3991 = this;
  return this__3991.meta
};
cljs.core.Cons.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.Cons.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__3992 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__3992.meta)
};
cljs.core.Cons.prototype.cljs$core$IList$ = true;
cljs.core.Cons;
cljs.core.cons = function cons(x, seq) {
  return new cljs.core.Cons(null, x, seq)
};
cljs.core.list_QMARK_ = function list_QMARK_(x) {
  var x__384__auto____3993 = x;
  if(cljs.core.truth_(function() {
    var and__3546__auto____3994 = x__384__auto____3993;
    if(cljs.core.truth_(and__3546__auto____3994)) {
      var and__3546__auto____3995 = x__384__auto____3993.cljs$core$IList$;
      if(cljs.core.truth_(and__3546__auto____3995)) {
        return cljs.core.not.call(null, x__384__auto____3993.hasOwnProperty("cljs$core$IList$"))
      }else {
        return and__3546__auto____3995
      }
    }else {
      return and__3546__auto____3994
    }
  }())) {
    return true
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IList, x__384__auto____3993)
  }
};
cljs.core.IReduce["string"] = true;
cljs.core._reduce["string"] = function() {
  var G__3996 = null;
  var G__3996__2 = function(string, f) {
    return cljs.core.ci_reduce.call(null, string, f)
  };
  var G__3996__3 = function(string, f, start) {
    return cljs.core.ci_reduce.call(null, string, f, start)
  };
  G__3996 = function(string, f, start) {
    switch(arguments.length) {
      case 2:
        return G__3996__2.call(this, string, f);
      case 3:
        return G__3996__3.call(this, string, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3996
}();
cljs.core.ILookup["string"] = true;
cljs.core._lookup["string"] = function() {
  var G__3997 = null;
  var G__3997__2 = function(string, k) {
    return cljs.core._nth.call(null, string, k)
  };
  var G__3997__3 = function(string, k, not_found) {
    return cljs.core._nth.call(null, string, k, not_found)
  };
  G__3997 = function(string, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3997__2.call(this, string, k);
      case 3:
        return G__3997__3.call(this, string, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3997
}();
cljs.core.IIndexed["string"] = true;
cljs.core._nth["string"] = function() {
  var G__3998 = null;
  var G__3998__2 = function(string, n) {
    if(n < cljs.core._count.call(null, string)) {
      return string.charAt(n)
    }else {
      return null
    }
  };
  var G__3998__3 = function(string, n, not_found) {
    if(n < cljs.core._count.call(null, string)) {
      return string.charAt(n)
    }else {
      return not_found
    }
  };
  G__3998 = function(string, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3998__2.call(this, string, n);
      case 3:
        return G__3998__3.call(this, string, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3998
}();
cljs.core.ICounted["string"] = true;
cljs.core._count["string"] = function(s) {
  return s.length
};
cljs.core.ISeqable["string"] = true;
cljs.core._seq["string"] = function(string) {
  return cljs.core.prim_seq.call(null, string, 0)
};
cljs.core.IHash["string"] = true;
cljs.core._hash["string"] = function(o) {
  return goog.string.hashCode.call(null, o)
};
String.prototype.cljs$core$IFn$ = true;
String.prototype.call = function() {
  var G__4005 = null;
  var G__4005__2 = function(tsym3999, coll) {
    var tsym3999__4001 = this;
    var this$__4002 = tsym3999__4001;
    return cljs.core.get.call(null, coll, this$__4002.toString())
  };
  var G__4005__3 = function(tsym4000, coll, not_found) {
    var tsym4000__4003 = this;
    var this$__4004 = tsym4000__4003;
    return cljs.core.get.call(null, coll, this$__4004.toString(), not_found)
  };
  G__4005 = function(tsym4000, coll, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4005__2.call(this, tsym4000, coll);
      case 3:
        return G__4005__3.call(this, tsym4000, coll, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4005
}();
String["prototype"]["apply"] = function(s, args) {
  if(cljs.core.count.call(null, args) < 2) {
    return cljs.core.get.call(null, args[0], s)
  }else {
    return cljs.core.get.call(null, args[0], s, args[1])
  }
};
cljs.core.lazy_seq_value = function lazy_seq_value(lazy_seq) {
  var x__4006 = lazy_seq.x;
  if(cljs.core.truth_(lazy_seq.realized)) {
    return x__4006
  }else {
    lazy_seq.x = x__4006.call(null);
    lazy_seq.realized = true;
    return lazy_seq.x
  }
};
cljs.core.LazySeq = function(meta, realized, x) {
  this.meta = meta;
  this.realized = realized;
  this.x = x
};
cljs.core.LazySeq.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.LazySeq")
};
cljs.core.LazySeq.prototype.cljs$core$IHash$ = true;
cljs.core.LazySeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__4007 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.LazySeq.prototype.cljs$core$ISequential$ = true;
cljs.core.LazySeq.prototype.cljs$core$ICollection$ = true;
cljs.core.LazySeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__4008 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.LazySeq.prototype.toString = function() {
  var this__4009 = this;
  var this$__4010 = this;
  return cljs.core.pr_str.call(null, this$__4010)
};
cljs.core.LazySeq.prototype.cljs$core$ISeqable$ = true;
cljs.core.LazySeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__4011 = this;
  return cljs.core.seq.call(null, cljs.core.lazy_seq_value.call(null, coll))
};
cljs.core.LazySeq.prototype.cljs$core$ISeq$ = true;
cljs.core.LazySeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__4012 = this;
  return cljs.core.first.call(null, cljs.core.lazy_seq_value.call(null, coll))
};
cljs.core.LazySeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__4013 = this;
  return cljs.core.rest.call(null, cljs.core.lazy_seq_value.call(null, coll))
};
cljs.core.LazySeq.prototype.cljs$core$IEquiv$ = true;
cljs.core.LazySeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__4014 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.LazySeq.prototype.cljs$core$IWithMeta$ = true;
cljs.core.LazySeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__4015 = this;
  return new cljs.core.LazySeq(meta, this__4015.realized, this__4015.x)
};
cljs.core.LazySeq.prototype.cljs$core$IMeta$ = true;
cljs.core.LazySeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__4016 = this;
  return this__4016.meta
};
cljs.core.LazySeq.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.LazySeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__4017 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__4017.meta)
};
cljs.core.LazySeq;
cljs.core.to_array = function to_array(s) {
  var ary__4018 = [];
  var s__4019 = s;
  while(true) {
    if(cljs.core.truth_(cljs.core.seq.call(null, s__4019))) {
      ary__4018.push(cljs.core.first.call(null, s__4019));
      var G__4020 = cljs.core.next.call(null, s__4019);
      s__4019 = G__4020;
      continue
    }else {
      return ary__4018
    }
    break
  }
};
cljs.core.to_array_2d = function to_array_2d(coll) {
  var ret__4021 = cljs.core.make_array.call(null, cljs.core.count.call(null, coll));
  var i__4022 = 0;
  var xs__4023 = cljs.core.seq.call(null, coll);
  while(true) {
    if(cljs.core.truth_(xs__4023)) {
      ret__4021[i__4022] = cljs.core.to_array.call(null, cljs.core.first.call(null, xs__4023));
      var G__4024 = i__4022 + 1;
      var G__4025 = cljs.core.next.call(null, xs__4023);
      i__4022 = G__4024;
      xs__4023 = G__4025;
      continue
    }else {
    }
    break
  }
  return ret__4021
};
cljs.core.long_array = function() {
  var long_array = null;
  var long_array__1 = function(size_or_seq) {
    if(cljs.core.number_QMARK_.call(null, size_or_seq)) {
      return long_array.call(null, size_or_seq, null)
    }else {
      if(cljs.core.seq_QMARK_.call(null, size_or_seq)) {
        return cljs.core.into_array.call(null, size_or_seq)
      }else {
        if("\ufdd0'else") {
          throw new Error("long-array called with something other than size or ISeq");
        }else {
          return null
        }
      }
    }
  };
  var long_array__2 = function(size, init_val_or_seq) {
    var a__4026 = cljs.core.make_array.call(null, size);
    if(cljs.core.seq_QMARK_.call(null, init_val_or_seq)) {
      var s__4027 = cljs.core.seq.call(null, init_val_or_seq);
      var i__4028 = 0;
      var s__4029 = s__4027;
      while(true) {
        if(cljs.core.truth_(function() {
          var and__3546__auto____4030 = s__4029;
          if(cljs.core.truth_(and__3546__auto____4030)) {
            return i__4028 < size
          }else {
            return and__3546__auto____4030
          }
        }())) {
          a__4026[i__4028] = cljs.core.first.call(null, s__4029);
          var G__4033 = i__4028 + 1;
          var G__4034 = cljs.core.next.call(null, s__4029);
          i__4028 = G__4033;
          s__4029 = G__4034;
          continue
        }else {
          return a__4026
        }
        break
      }
    }else {
      var n__518__auto____4031 = size;
      var i__4032 = 0;
      while(true) {
        if(i__4032 < n__518__auto____4031) {
          a__4026[i__4032] = init_val_or_seq;
          var G__4035 = i__4032 + 1;
          i__4032 = G__4035;
          continue
        }else {
        }
        break
      }
      return a__4026
    }
  };
  long_array = function(size, init_val_or_seq) {
    switch(arguments.length) {
      case 1:
        return long_array__1.call(this, size);
      case 2:
        return long_array__2.call(this, size, init_val_or_seq)
    }
    throw"Invalid arity: " + arguments.length;
  };
  long_array.cljs$lang$arity$1 = long_array__1;
  long_array.cljs$lang$arity$2 = long_array__2;
  return long_array
}();
cljs.core.double_array = function() {
  var double_array = null;
  var double_array__1 = function(size_or_seq) {
    if(cljs.core.number_QMARK_.call(null, size_or_seq)) {
      return double_array.call(null, size_or_seq, null)
    }else {
      if(cljs.core.seq_QMARK_.call(null, size_or_seq)) {
        return cljs.core.into_array.call(null, size_or_seq)
      }else {
        if("\ufdd0'else") {
          throw new Error("double-array called with something other than size or ISeq");
        }else {
          return null
        }
      }
    }
  };
  var double_array__2 = function(size, init_val_or_seq) {
    var a__4036 = cljs.core.make_array.call(null, size);
    if(cljs.core.seq_QMARK_.call(null, init_val_or_seq)) {
      var s__4037 = cljs.core.seq.call(null, init_val_or_seq);
      var i__4038 = 0;
      var s__4039 = s__4037;
      while(true) {
        if(cljs.core.truth_(function() {
          var and__3546__auto____4040 = s__4039;
          if(cljs.core.truth_(and__3546__auto____4040)) {
            return i__4038 < size
          }else {
            return and__3546__auto____4040
          }
        }())) {
          a__4036[i__4038] = cljs.core.first.call(null, s__4039);
          var G__4043 = i__4038 + 1;
          var G__4044 = cljs.core.next.call(null, s__4039);
          i__4038 = G__4043;
          s__4039 = G__4044;
          continue
        }else {
          return a__4036
        }
        break
      }
    }else {
      var n__518__auto____4041 = size;
      var i__4042 = 0;
      while(true) {
        if(i__4042 < n__518__auto____4041) {
          a__4036[i__4042] = init_val_or_seq;
          var G__4045 = i__4042 + 1;
          i__4042 = G__4045;
          continue
        }else {
        }
        break
      }
      return a__4036
    }
  };
  double_array = function(size, init_val_or_seq) {
    switch(arguments.length) {
      case 1:
        return double_array__1.call(this, size);
      case 2:
        return double_array__2.call(this, size, init_val_or_seq)
    }
    throw"Invalid arity: " + arguments.length;
  };
  double_array.cljs$lang$arity$1 = double_array__1;
  double_array.cljs$lang$arity$2 = double_array__2;
  return double_array
}();
cljs.core.object_array = function() {
  var object_array = null;
  var object_array__1 = function(size_or_seq) {
    if(cljs.core.number_QMARK_.call(null, size_or_seq)) {
      return object_array.call(null, size_or_seq, null)
    }else {
      if(cljs.core.seq_QMARK_.call(null, size_or_seq)) {
        return cljs.core.into_array.call(null, size_or_seq)
      }else {
        if("\ufdd0'else") {
          throw new Error("object-array called with something other than size or ISeq");
        }else {
          return null
        }
      }
    }
  };
  var object_array__2 = function(size, init_val_or_seq) {
    var a__4046 = cljs.core.make_array.call(null, size);
    if(cljs.core.seq_QMARK_.call(null, init_val_or_seq)) {
      var s__4047 = cljs.core.seq.call(null, init_val_or_seq);
      var i__4048 = 0;
      var s__4049 = s__4047;
      while(true) {
        if(cljs.core.truth_(function() {
          var and__3546__auto____4050 = s__4049;
          if(cljs.core.truth_(and__3546__auto____4050)) {
            return i__4048 < size
          }else {
            return and__3546__auto____4050
          }
        }())) {
          a__4046[i__4048] = cljs.core.first.call(null, s__4049);
          var G__4053 = i__4048 + 1;
          var G__4054 = cljs.core.next.call(null, s__4049);
          i__4048 = G__4053;
          s__4049 = G__4054;
          continue
        }else {
          return a__4046
        }
        break
      }
    }else {
      var n__518__auto____4051 = size;
      var i__4052 = 0;
      while(true) {
        if(i__4052 < n__518__auto____4051) {
          a__4046[i__4052] = init_val_or_seq;
          var G__4055 = i__4052 + 1;
          i__4052 = G__4055;
          continue
        }else {
        }
        break
      }
      return a__4046
    }
  };
  object_array = function(size, init_val_or_seq) {
    switch(arguments.length) {
      case 1:
        return object_array__1.call(this, size);
      case 2:
        return object_array__2.call(this, size, init_val_or_seq)
    }
    throw"Invalid arity: " + arguments.length;
  };
  object_array.cljs$lang$arity$1 = object_array__1;
  object_array.cljs$lang$arity$2 = object_array__2;
  return object_array
}();
cljs.core.bounded_count = function bounded_count(s, n) {
  var s__4056 = s;
  var i__4057 = n;
  var sum__4058 = 0;
  while(true) {
    if(cljs.core.truth_(function() {
      var and__3546__auto____4059 = i__4057 > 0;
      if(and__3546__auto____4059) {
        return cljs.core.seq.call(null, s__4056)
      }else {
        return and__3546__auto____4059
      }
    }())) {
      var G__4060 = cljs.core.next.call(null, s__4056);
      var G__4061 = i__4057 - 1;
      var G__4062 = sum__4058 + 1;
      s__4056 = G__4060;
      i__4057 = G__4061;
      sum__4058 = G__4062;
      continue
    }else {
      return sum__4058
    }
    break
  }
};
cljs.core.spread = function spread(arglist) {
  if(arglist === null) {
    return null
  }else {
    if(cljs.core.next.call(null, arglist) === null) {
      return cljs.core.seq.call(null, cljs.core.first.call(null, arglist))
    }else {
      if("\ufdd0'else") {
        return cljs.core.cons.call(null, cljs.core.first.call(null, arglist), spread.call(null, cljs.core.next.call(null, arglist)))
      }else {
        return null
      }
    }
  }
};
cljs.core.concat = function() {
  var concat = null;
  var concat__0 = function() {
    return new cljs.core.LazySeq(null, false, function() {
      return null
    })
  };
  var concat__1 = function(x) {
    return new cljs.core.LazySeq(null, false, function() {
      return x
    })
  };
  var concat__2 = function(x, y) {
    return new cljs.core.LazySeq(null, false, function() {
      var s__4063 = cljs.core.seq.call(null, x);
      if(cljs.core.truth_(s__4063)) {
        return cljs.core.cons.call(null, cljs.core.first.call(null, s__4063), concat.call(null, cljs.core.rest.call(null, s__4063), y))
      }else {
        return y
      }
    })
  };
  var concat__3 = function() {
    var G__4066__delegate = function(x, y, zs) {
      var cat__4065 = function cat(xys, zs) {
        return new cljs.core.LazySeq(null, false, function() {
          var xys__4064 = cljs.core.seq.call(null, xys);
          if(cljs.core.truth_(xys__4064)) {
            return cljs.core.cons.call(null, cljs.core.first.call(null, xys__4064), cat.call(null, cljs.core.rest.call(null, xys__4064), zs))
          }else {
            if(cljs.core.truth_(zs)) {
              return cat.call(null, cljs.core.first.call(null, zs), cljs.core.next.call(null, zs))
            }else {
              return null
            }
          }
        })
      };
      return cat__4065.call(null, concat.call(null, x, y), zs)
    };
    var G__4066 = function(x, y, var_args) {
      var zs = null;
      if(goog.isDef(var_args)) {
        zs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__4066__delegate.call(this, x, y, zs)
    };
    G__4066.cljs$lang$maxFixedArity = 2;
    G__4066.cljs$lang$applyTo = function(arglist__4067) {
      var x = cljs.core.first(arglist__4067);
      var y = cljs.core.first(cljs.core.next(arglist__4067));
      var zs = cljs.core.rest(cljs.core.next(arglist__4067));
      return G__4066__delegate.call(this, x, y, zs)
    };
    return G__4066
  }();
  concat = function(x, y, var_args) {
    var zs = var_args;
    switch(arguments.length) {
      case 0:
        return concat__0.call(this);
      case 1:
        return concat__1.call(this, x);
      case 2:
        return concat__2.call(this, x, y);
      default:
        return concat__3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  concat.cljs$lang$maxFixedArity = 2;
  concat.cljs$lang$applyTo = concat__3.cljs$lang$applyTo;
  concat.cljs$lang$arity$0 = concat__0;
  concat.cljs$lang$arity$1 = concat__1;
  concat.cljs$lang$arity$2 = concat__2;
  concat.cljs$lang$arity$3 = concat__3;
  return concat
}();
cljs.core.list_STAR_ = function() {
  var list_STAR_ = null;
  var list_STAR___1 = function(args) {
    return cljs.core.seq.call(null, args)
  };
  var list_STAR___2 = function(a, args) {
    return cljs.core.cons.call(null, a, args)
  };
  var list_STAR___3 = function(a, b, args) {
    return cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, args))
  };
  var list_STAR___4 = function(a, b, c, args) {
    return cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, cljs.core.cons.call(null, c, args)))
  };
  var list_STAR___5 = function() {
    var G__4068__delegate = function(a, b, c, d, more) {
      return cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, cljs.core.cons.call(null, c, cljs.core.cons.call(null, d, cljs.core.spread.call(null, more)))))
    };
    var G__4068 = function(a, b, c, d, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0)
      }
      return G__4068__delegate.call(this, a, b, c, d, more)
    };
    G__4068.cljs$lang$maxFixedArity = 4;
    G__4068.cljs$lang$applyTo = function(arglist__4069) {
      var a = cljs.core.first(arglist__4069);
      var b = cljs.core.first(cljs.core.next(arglist__4069));
      var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4069)));
      var d = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__4069))));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(arglist__4069))));
      return G__4068__delegate.call(this, a, b, c, d, more)
    };
    return G__4068
  }();
  list_STAR_ = function(a, b, c, d, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return list_STAR___1.call(this, a);
      case 2:
        return list_STAR___2.call(this, a, b);
      case 3:
        return list_STAR___3.call(this, a, b, c);
      case 4:
        return list_STAR___4.call(this, a, b, c, d);
      default:
        return list_STAR___5.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  list_STAR_.cljs$lang$maxFixedArity = 4;
  list_STAR_.cljs$lang$applyTo = list_STAR___5.cljs$lang$applyTo;
  list_STAR_.cljs$lang$arity$1 = list_STAR___1;
  list_STAR_.cljs$lang$arity$2 = list_STAR___2;
  list_STAR_.cljs$lang$arity$3 = list_STAR___3;
  list_STAR_.cljs$lang$arity$4 = list_STAR___4;
  list_STAR_.cljs$lang$arity$5 = list_STAR___5;
  return list_STAR_
}();
cljs.core.apply = function() {
  var apply = null;
  var apply__2 = function(f, args) {
    var fixed_arity__4070 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      if(cljs.core.bounded_count.call(null, args, fixed_arity__4070 + 1) <= fixed_arity__4070) {
        return f.apply(f, cljs.core.to_array.call(null, args))
      }else {
        return f.cljs$lang$applyTo(args)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, args))
    }
  };
  var apply__3 = function(f, x, args) {
    var arglist__4071 = cljs.core.list_STAR_.call(null, x, args);
    var fixed_arity__4072 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      if(cljs.core.bounded_count.call(null, arglist__4071, fixed_arity__4072) <= fixed_arity__4072) {
        return f.apply(f, cljs.core.to_array.call(null, arglist__4071))
      }else {
        return f.cljs$lang$applyTo(arglist__4071)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, arglist__4071))
    }
  };
  var apply__4 = function(f, x, y, args) {
    var arglist__4073 = cljs.core.list_STAR_.call(null, x, y, args);
    var fixed_arity__4074 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      if(cljs.core.bounded_count.call(null, arglist__4073, fixed_arity__4074) <= fixed_arity__4074) {
        return f.apply(f, cljs.core.to_array.call(null, arglist__4073))
      }else {
        return f.cljs$lang$applyTo(arglist__4073)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, arglist__4073))
    }
  };
  var apply__5 = function(f, x, y, z, args) {
    var arglist__4075 = cljs.core.list_STAR_.call(null, x, y, z, args);
    var fixed_arity__4076 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      if(cljs.core.bounded_count.call(null, arglist__4075, fixed_arity__4076) <= fixed_arity__4076) {
        return f.apply(f, cljs.core.to_array.call(null, arglist__4075))
      }else {
        return f.cljs$lang$applyTo(arglist__4075)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, arglist__4075))
    }
  };
  var apply__6 = function() {
    var G__4079__delegate = function(f, a, b, c, d, args) {
      var arglist__4077 = cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, cljs.core.cons.call(null, c, cljs.core.cons.call(null, d, cljs.core.spread.call(null, args)))));
      var fixed_arity__4078 = f.cljs$lang$maxFixedArity;
      if(cljs.core.truth_(f.cljs$lang$applyTo)) {
        if(cljs.core.bounded_count.call(null, arglist__4077, fixed_arity__4078) <= fixed_arity__4078) {
          return f.apply(f, cljs.core.to_array.call(null, arglist__4077))
        }else {
          return f.cljs$lang$applyTo(arglist__4077)
        }
      }else {
        return f.apply(f, cljs.core.to_array.call(null, arglist__4077))
      }
    };
    var G__4079 = function(f, a, b, c, d, var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 5), 0)
      }
      return G__4079__delegate.call(this, f, a, b, c, d, args)
    };
    G__4079.cljs$lang$maxFixedArity = 5;
    G__4079.cljs$lang$applyTo = function(arglist__4080) {
      var f = cljs.core.first(arglist__4080);
      var a = cljs.core.first(cljs.core.next(arglist__4080));
      var b = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4080)));
      var c = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__4080))));
      var d = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__4080)))));
      var args = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__4080)))));
      return G__4079__delegate.call(this, f, a, b, c, d, args)
    };
    return G__4079
  }();
  apply = function(f, a, b, c, d, var_args) {
    var args = var_args;
    switch(arguments.length) {
      case 2:
        return apply__2.call(this, f, a);
      case 3:
        return apply__3.call(this, f, a, b);
      case 4:
        return apply__4.call(this, f, a, b, c);
      case 5:
        return apply__5.call(this, f, a, b, c, d);
      default:
        return apply__6.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  apply.cljs$lang$maxFixedArity = 5;
  apply.cljs$lang$applyTo = apply__6.cljs$lang$applyTo;
  apply.cljs$lang$arity$2 = apply__2;
  apply.cljs$lang$arity$3 = apply__3;
  apply.cljs$lang$arity$4 = apply__4;
  apply.cljs$lang$arity$5 = apply__5;
  apply.cljs$lang$arity$6 = apply__6;
  return apply
}();
cljs.core.vary_meta = function() {
  var vary_meta__delegate = function(obj, f, args) {
    return cljs.core.with_meta.call(null, obj, cljs.core.apply.call(null, f, cljs.core.meta.call(null, obj), args))
  };
  var vary_meta = function(obj, f, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
    }
    return vary_meta__delegate.call(this, obj, f, args)
  };
  vary_meta.cljs$lang$maxFixedArity = 2;
  vary_meta.cljs$lang$applyTo = function(arglist__4081) {
    var obj = cljs.core.first(arglist__4081);
    var f = cljs.core.first(cljs.core.next(arglist__4081));
    var args = cljs.core.rest(cljs.core.next(arglist__4081));
    return vary_meta__delegate.call(this, obj, f, args)
  };
  return vary_meta
}();
cljs.core.not_EQ_ = function() {
  var not_EQ_ = null;
  var not_EQ___1 = function(x) {
    return false
  };
  var not_EQ___2 = function(x, y) {
    return cljs.core.not.call(null, cljs.core._EQ_.call(null, x, y))
  };
  var not_EQ___3 = function() {
    var G__4082__delegate = function(x, y, more) {
      return cljs.core.not.call(null, cljs.core.apply.call(null, cljs.core._EQ_, x, y, more))
    };
    var G__4082 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__4082__delegate.call(this, x, y, more)
    };
    G__4082.cljs$lang$maxFixedArity = 2;
    G__4082.cljs$lang$applyTo = function(arglist__4083) {
      var x = cljs.core.first(arglist__4083);
      var y = cljs.core.first(cljs.core.next(arglist__4083));
      var more = cljs.core.rest(cljs.core.next(arglist__4083));
      return G__4082__delegate.call(this, x, y, more)
    };
    return G__4082
  }();
  not_EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return not_EQ___1.call(this, x);
      case 2:
        return not_EQ___2.call(this, x, y);
      default:
        return not_EQ___3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  not_EQ_.cljs$lang$maxFixedArity = 2;
  not_EQ_.cljs$lang$applyTo = not_EQ___3.cljs$lang$applyTo;
  not_EQ_.cljs$lang$arity$1 = not_EQ___1;
  not_EQ_.cljs$lang$arity$2 = not_EQ___2;
  not_EQ_.cljs$lang$arity$3 = not_EQ___3;
  return not_EQ_
}();
cljs.core.not_empty = function not_empty(coll) {
  if(cljs.core.truth_(cljs.core.seq.call(null, coll))) {
    return coll
  }else {
    return null
  }
};
cljs.core.every_QMARK_ = function every_QMARK_(pred, coll) {
  while(true) {
    if(cljs.core.seq.call(null, coll) === null) {
      return true
    }else {
      if(cljs.core.truth_(pred.call(null, cljs.core.first.call(null, coll)))) {
        var G__4084 = pred;
        var G__4085 = cljs.core.next.call(null, coll);
        pred = G__4084;
        coll = G__4085;
        continue
      }else {
        if("\ufdd0'else") {
          return false
        }else {
          return null
        }
      }
    }
    break
  }
};
cljs.core.not_every_QMARK_ = function not_every_QMARK_(pred, coll) {
  return cljs.core.not.call(null, cljs.core.every_QMARK_.call(null, pred, coll))
};
cljs.core.some = function some(pred, coll) {
  while(true) {
    if(cljs.core.truth_(cljs.core.seq.call(null, coll))) {
      var or__3548__auto____4086 = pred.call(null, cljs.core.first.call(null, coll));
      if(cljs.core.truth_(or__3548__auto____4086)) {
        return or__3548__auto____4086
      }else {
        var G__4087 = pred;
        var G__4088 = cljs.core.next.call(null, coll);
        pred = G__4087;
        coll = G__4088;
        continue
      }
    }else {
      return null
    }
    break
  }
};
cljs.core.not_any_QMARK_ = function not_any_QMARK_(pred, coll) {
  return cljs.core.not.call(null, cljs.core.some.call(null, pred, coll))
};
cljs.core.even_QMARK_ = function even_QMARK_(n) {
  if(cljs.core.integer_QMARK_.call(null, n)) {
    return(n & 1) === 0
  }else {
    throw new Error(cljs.core.str.call(null, "Argument must be an integer: ", n));
  }
};
cljs.core.odd_QMARK_ = function odd_QMARK_(n) {
  return cljs.core.not.call(null, cljs.core.even_QMARK_.call(null, n))
};
cljs.core.identity = function identity(x) {
  return x
};
cljs.core.complement = function complement(f) {
  return function() {
    var G__4089 = null;
    var G__4089__0 = function() {
      return cljs.core.not.call(null, f.call(null))
    };
    var G__4089__1 = function(x) {
      return cljs.core.not.call(null, f.call(null, x))
    };
    var G__4089__2 = function(x, y) {
      return cljs.core.not.call(null, f.call(null, x, y))
    };
    var G__4089__3 = function() {
      var G__4090__delegate = function(x, y, zs) {
        return cljs.core.not.call(null, cljs.core.apply.call(null, f, x, y, zs))
      };
      var G__4090 = function(x, y, var_args) {
        var zs = null;
        if(goog.isDef(var_args)) {
          zs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
        }
        return G__4090__delegate.call(this, x, y, zs)
      };
      G__4090.cljs$lang$maxFixedArity = 2;
      G__4090.cljs$lang$applyTo = function(arglist__4091) {
        var x = cljs.core.first(arglist__4091);
        var y = cljs.core.first(cljs.core.next(arglist__4091));
        var zs = cljs.core.rest(cljs.core.next(arglist__4091));
        return G__4090__delegate.call(this, x, y, zs)
      };
      return G__4090
    }();
    G__4089 = function(x, y, var_args) {
      var zs = var_args;
      switch(arguments.length) {
        case 0:
          return G__4089__0.call(this);
        case 1:
          return G__4089__1.call(this, x);
        case 2:
          return G__4089__2.call(this, x, y);
        default:
          return G__4089__3.apply(this, arguments)
      }
      throw"Invalid arity: " + arguments.length;
    };
    G__4089.cljs$lang$maxFixedArity = 2;
    G__4089.cljs$lang$applyTo = G__4089__3.cljs$lang$applyTo;
    return G__4089
  }()
};
cljs.core.constantly = function constantly(x) {
  return function() {
    var G__4092__delegate = function(args) {
      return x
    };
    var G__4092 = function(var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
      }
      return G__4092__delegate.call(this, args)
    };
    G__4092.cljs$lang$maxFixedArity = 0;
    G__4092.cljs$lang$applyTo = function(arglist__4093) {
      var args = cljs.core.seq(arglist__4093);
      return G__4092__delegate.call(this, args)
    };
    return G__4092
  }()
};
cljs.core.comp = function() {
  var comp = null;
  var comp__0 = function() {
    return cljs.core.identity
  };
  var comp__1 = function(f) {
    return f
  };
  var comp__2 = function(f, g) {
    return function() {
      var G__4097 = null;
      var G__4097__0 = function() {
        return f.call(null, g.call(null))
      };
      var G__4097__1 = function(x) {
        return f.call(null, g.call(null, x))
      };
      var G__4097__2 = function(x, y) {
        return f.call(null, g.call(null, x, y))
      };
      var G__4097__3 = function(x, y, z) {
        return f.call(null, g.call(null, x, y, z))
      };
      var G__4097__4 = function() {
        var G__4098__delegate = function(x, y, z, args) {
          return f.call(null, cljs.core.apply.call(null, g, x, y, z, args))
        };
        var G__4098 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4098__delegate.call(this, x, y, z, args)
        };
        G__4098.cljs$lang$maxFixedArity = 3;
        G__4098.cljs$lang$applyTo = function(arglist__4099) {
          var x = cljs.core.first(arglist__4099);
          var y = cljs.core.first(cljs.core.next(arglist__4099));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4099)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4099)));
          return G__4098__delegate.call(this, x, y, z, args)
        };
        return G__4098
      }();
      G__4097 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__4097__0.call(this);
          case 1:
            return G__4097__1.call(this, x);
          case 2:
            return G__4097__2.call(this, x, y);
          case 3:
            return G__4097__3.call(this, x, y, z);
          default:
            return G__4097__4.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__4097.cljs$lang$maxFixedArity = 3;
      G__4097.cljs$lang$applyTo = G__4097__4.cljs$lang$applyTo;
      return G__4097
    }()
  };
  var comp__3 = function(f, g, h) {
    return function() {
      var G__4100 = null;
      var G__4100__0 = function() {
        return f.call(null, g.call(null, h.call(null)))
      };
      var G__4100__1 = function(x) {
        return f.call(null, g.call(null, h.call(null, x)))
      };
      var G__4100__2 = function(x, y) {
        return f.call(null, g.call(null, h.call(null, x, y)))
      };
      var G__4100__3 = function(x, y, z) {
        return f.call(null, g.call(null, h.call(null, x, y, z)))
      };
      var G__4100__4 = function() {
        var G__4101__delegate = function(x, y, z, args) {
          return f.call(null, g.call(null, cljs.core.apply.call(null, h, x, y, z, args)))
        };
        var G__4101 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4101__delegate.call(this, x, y, z, args)
        };
        G__4101.cljs$lang$maxFixedArity = 3;
        G__4101.cljs$lang$applyTo = function(arglist__4102) {
          var x = cljs.core.first(arglist__4102);
          var y = cljs.core.first(cljs.core.next(arglist__4102));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4102)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4102)));
          return G__4101__delegate.call(this, x, y, z, args)
        };
        return G__4101
      }();
      G__4100 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__4100__0.call(this);
          case 1:
            return G__4100__1.call(this, x);
          case 2:
            return G__4100__2.call(this, x, y);
          case 3:
            return G__4100__3.call(this, x, y, z);
          default:
            return G__4100__4.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__4100.cljs$lang$maxFixedArity = 3;
      G__4100.cljs$lang$applyTo = G__4100__4.cljs$lang$applyTo;
      return G__4100
    }()
  };
  var comp__4 = function() {
    var G__4103__delegate = function(f1, f2, f3, fs) {
      var fs__4094 = cljs.core.reverse.call(null, cljs.core.list_STAR_.call(null, f1, f2, f3, fs));
      return function() {
        var G__4104__delegate = function(args) {
          var ret__4095 = cljs.core.apply.call(null, cljs.core.first.call(null, fs__4094), args);
          var fs__4096 = cljs.core.next.call(null, fs__4094);
          while(true) {
            if(cljs.core.truth_(fs__4096)) {
              var G__4105 = cljs.core.first.call(null, fs__4096).call(null, ret__4095);
              var G__4106 = cljs.core.next.call(null, fs__4096);
              ret__4095 = G__4105;
              fs__4096 = G__4106;
              continue
            }else {
              return ret__4095
            }
            break
          }
        };
        var G__4104 = function(var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
          }
          return G__4104__delegate.call(this, args)
        };
        G__4104.cljs$lang$maxFixedArity = 0;
        G__4104.cljs$lang$applyTo = function(arglist__4107) {
          var args = cljs.core.seq(arglist__4107);
          return G__4104__delegate.call(this, args)
        };
        return G__4104
      }()
    };
    var G__4103 = function(f1, f2, f3, var_args) {
      var fs = null;
      if(goog.isDef(var_args)) {
        fs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__4103__delegate.call(this, f1, f2, f3, fs)
    };
    G__4103.cljs$lang$maxFixedArity = 3;
    G__4103.cljs$lang$applyTo = function(arglist__4108) {
      var f1 = cljs.core.first(arglist__4108);
      var f2 = cljs.core.first(cljs.core.next(arglist__4108));
      var f3 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4108)));
      var fs = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4108)));
      return G__4103__delegate.call(this, f1, f2, f3, fs)
    };
    return G__4103
  }();
  comp = function(f1, f2, f3, var_args) {
    var fs = var_args;
    switch(arguments.length) {
      case 0:
        return comp__0.call(this);
      case 1:
        return comp__1.call(this, f1);
      case 2:
        return comp__2.call(this, f1, f2);
      case 3:
        return comp__3.call(this, f1, f2, f3);
      default:
        return comp__4.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  comp.cljs$lang$maxFixedArity = 3;
  comp.cljs$lang$applyTo = comp__4.cljs$lang$applyTo;
  comp.cljs$lang$arity$0 = comp__0;
  comp.cljs$lang$arity$1 = comp__1;
  comp.cljs$lang$arity$2 = comp__2;
  comp.cljs$lang$arity$3 = comp__3;
  comp.cljs$lang$arity$4 = comp__4;
  return comp
}();
cljs.core.partial = function() {
  var partial = null;
  var partial__2 = function(f, arg1) {
    return function() {
      var G__4109__delegate = function(args) {
        return cljs.core.apply.call(null, f, arg1, args)
      };
      var G__4109 = function(var_args) {
        var args = null;
        if(goog.isDef(var_args)) {
          args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
        }
        return G__4109__delegate.call(this, args)
      };
      G__4109.cljs$lang$maxFixedArity = 0;
      G__4109.cljs$lang$applyTo = function(arglist__4110) {
        var args = cljs.core.seq(arglist__4110);
        return G__4109__delegate.call(this, args)
      };
      return G__4109
    }()
  };
  var partial__3 = function(f, arg1, arg2) {
    return function() {
      var G__4111__delegate = function(args) {
        return cljs.core.apply.call(null, f, arg1, arg2, args)
      };
      var G__4111 = function(var_args) {
        var args = null;
        if(goog.isDef(var_args)) {
          args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
        }
        return G__4111__delegate.call(this, args)
      };
      G__4111.cljs$lang$maxFixedArity = 0;
      G__4111.cljs$lang$applyTo = function(arglist__4112) {
        var args = cljs.core.seq(arglist__4112);
        return G__4111__delegate.call(this, args)
      };
      return G__4111
    }()
  };
  var partial__4 = function(f, arg1, arg2, arg3) {
    return function() {
      var G__4113__delegate = function(args) {
        return cljs.core.apply.call(null, f, arg1, arg2, arg3, args)
      };
      var G__4113 = function(var_args) {
        var args = null;
        if(goog.isDef(var_args)) {
          args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
        }
        return G__4113__delegate.call(this, args)
      };
      G__4113.cljs$lang$maxFixedArity = 0;
      G__4113.cljs$lang$applyTo = function(arglist__4114) {
        var args = cljs.core.seq(arglist__4114);
        return G__4113__delegate.call(this, args)
      };
      return G__4113
    }()
  };
  var partial__5 = function() {
    var G__4115__delegate = function(f, arg1, arg2, arg3, more) {
      return function() {
        var G__4116__delegate = function(args) {
          return cljs.core.apply.call(null, f, arg1, arg2, arg3, cljs.core.concat.call(null, more, args))
        };
        var G__4116 = function(var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
          }
          return G__4116__delegate.call(this, args)
        };
        G__4116.cljs$lang$maxFixedArity = 0;
        G__4116.cljs$lang$applyTo = function(arglist__4117) {
          var args = cljs.core.seq(arglist__4117);
          return G__4116__delegate.call(this, args)
        };
        return G__4116
      }()
    };
    var G__4115 = function(f, arg1, arg2, arg3, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0)
      }
      return G__4115__delegate.call(this, f, arg1, arg2, arg3, more)
    };
    G__4115.cljs$lang$maxFixedArity = 4;
    G__4115.cljs$lang$applyTo = function(arglist__4118) {
      var f = cljs.core.first(arglist__4118);
      var arg1 = cljs.core.first(cljs.core.next(arglist__4118));
      var arg2 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4118)));
      var arg3 = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__4118))));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(arglist__4118))));
      return G__4115__delegate.call(this, f, arg1, arg2, arg3, more)
    };
    return G__4115
  }();
  partial = function(f, arg1, arg2, arg3, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return partial__2.call(this, f, arg1);
      case 3:
        return partial__3.call(this, f, arg1, arg2);
      case 4:
        return partial__4.call(this, f, arg1, arg2, arg3);
      default:
        return partial__5.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  partial.cljs$lang$maxFixedArity = 4;
  partial.cljs$lang$applyTo = partial__5.cljs$lang$applyTo;
  partial.cljs$lang$arity$2 = partial__2;
  partial.cljs$lang$arity$3 = partial__3;
  partial.cljs$lang$arity$4 = partial__4;
  partial.cljs$lang$arity$5 = partial__5;
  return partial
}();
cljs.core.fnil = function() {
  var fnil = null;
  var fnil__2 = function(f, x) {
    return function() {
      var G__4119 = null;
      var G__4119__1 = function(a) {
        return f.call(null, a === null ? x : a)
      };
      var G__4119__2 = function(a, b) {
        return f.call(null, a === null ? x : a, b)
      };
      var G__4119__3 = function(a, b, c) {
        return f.call(null, a === null ? x : a, b, c)
      };
      var G__4119__4 = function() {
        var G__4120__delegate = function(a, b, c, ds) {
          return cljs.core.apply.call(null, f, a === null ? x : a, b, c, ds)
        };
        var G__4120 = function(a, b, c, var_args) {
          var ds = null;
          if(goog.isDef(var_args)) {
            ds = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4120__delegate.call(this, a, b, c, ds)
        };
        G__4120.cljs$lang$maxFixedArity = 3;
        G__4120.cljs$lang$applyTo = function(arglist__4121) {
          var a = cljs.core.first(arglist__4121);
          var b = cljs.core.first(cljs.core.next(arglist__4121));
          var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4121)));
          var ds = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4121)));
          return G__4120__delegate.call(this, a, b, c, ds)
        };
        return G__4120
      }();
      G__4119 = function(a, b, c, var_args) {
        var ds = var_args;
        switch(arguments.length) {
          case 1:
            return G__4119__1.call(this, a);
          case 2:
            return G__4119__2.call(this, a, b);
          case 3:
            return G__4119__3.call(this, a, b, c);
          default:
            return G__4119__4.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__4119.cljs$lang$maxFixedArity = 3;
      G__4119.cljs$lang$applyTo = G__4119__4.cljs$lang$applyTo;
      return G__4119
    }()
  };
  var fnil__3 = function(f, x, y) {
    return function() {
      var G__4122 = null;
      var G__4122__2 = function(a, b) {
        return f.call(null, a === null ? x : a, b === null ? y : b)
      };
      var G__4122__3 = function(a, b, c) {
        return f.call(null, a === null ? x : a, b === null ? y : b, c)
      };
      var G__4122__4 = function() {
        var G__4123__delegate = function(a, b, c, ds) {
          return cljs.core.apply.call(null, f, a === null ? x : a, b === null ? y : b, c, ds)
        };
        var G__4123 = function(a, b, c, var_args) {
          var ds = null;
          if(goog.isDef(var_args)) {
            ds = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4123__delegate.call(this, a, b, c, ds)
        };
        G__4123.cljs$lang$maxFixedArity = 3;
        G__4123.cljs$lang$applyTo = function(arglist__4124) {
          var a = cljs.core.first(arglist__4124);
          var b = cljs.core.first(cljs.core.next(arglist__4124));
          var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4124)));
          var ds = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4124)));
          return G__4123__delegate.call(this, a, b, c, ds)
        };
        return G__4123
      }();
      G__4122 = function(a, b, c, var_args) {
        var ds = var_args;
        switch(arguments.length) {
          case 2:
            return G__4122__2.call(this, a, b);
          case 3:
            return G__4122__3.call(this, a, b, c);
          default:
            return G__4122__4.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__4122.cljs$lang$maxFixedArity = 3;
      G__4122.cljs$lang$applyTo = G__4122__4.cljs$lang$applyTo;
      return G__4122
    }()
  };
  var fnil__4 = function(f, x, y, z) {
    return function() {
      var G__4125 = null;
      var G__4125__2 = function(a, b) {
        return f.call(null, a === null ? x : a, b === null ? y : b)
      };
      var G__4125__3 = function(a, b, c) {
        return f.call(null, a === null ? x : a, b === null ? y : b, c === null ? z : c)
      };
      var G__4125__4 = function() {
        var G__4126__delegate = function(a, b, c, ds) {
          return cljs.core.apply.call(null, f, a === null ? x : a, b === null ? y : b, c === null ? z : c, ds)
        };
        var G__4126 = function(a, b, c, var_args) {
          var ds = null;
          if(goog.isDef(var_args)) {
            ds = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4126__delegate.call(this, a, b, c, ds)
        };
        G__4126.cljs$lang$maxFixedArity = 3;
        G__4126.cljs$lang$applyTo = function(arglist__4127) {
          var a = cljs.core.first(arglist__4127);
          var b = cljs.core.first(cljs.core.next(arglist__4127));
          var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4127)));
          var ds = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4127)));
          return G__4126__delegate.call(this, a, b, c, ds)
        };
        return G__4126
      }();
      G__4125 = function(a, b, c, var_args) {
        var ds = var_args;
        switch(arguments.length) {
          case 2:
            return G__4125__2.call(this, a, b);
          case 3:
            return G__4125__3.call(this, a, b, c);
          default:
            return G__4125__4.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__4125.cljs$lang$maxFixedArity = 3;
      G__4125.cljs$lang$applyTo = G__4125__4.cljs$lang$applyTo;
      return G__4125
    }()
  };
  fnil = function(f, x, y, z) {
    switch(arguments.length) {
      case 2:
        return fnil__2.call(this, f, x);
      case 3:
        return fnil__3.call(this, f, x, y);
      case 4:
        return fnil__4.call(this, f, x, y, z)
    }
    throw"Invalid arity: " + arguments.length;
  };
  fnil.cljs$lang$arity$2 = fnil__2;
  fnil.cljs$lang$arity$3 = fnil__3;
  fnil.cljs$lang$arity$4 = fnil__4;
  return fnil
}();
cljs.core.map_indexed = function map_indexed(f, coll) {
  var mapi__4130 = function mpi(idx, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3698__auto____4128 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3698__auto____4128)) {
        var s__4129 = temp__3698__auto____4128;
        return cljs.core.cons.call(null, f.call(null, idx, cljs.core.first.call(null, s__4129)), mpi.call(null, idx + 1, cljs.core.rest.call(null, s__4129)))
      }else {
        return null
      }
    })
  };
  return mapi__4130.call(null, 0, coll)
};
cljs.core.keep = function keep(f, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3698__auto____4131 = cljs.core.seq.call(null, coll);
    if(cljs.core.truth_(temp__3698__auto____4131)) {
      var s__4132 = temp__3698__auto____4131;
      var x__4133 = f.call(null, cljs.core.first.call(null, s__4132));
      if(x__4133 === null) {
        return keep.call(null, f, cljs.core.rest.call(null, s__4132))
      }else {
        return cljs.core.cons.call(null, x__4133, keep.call(null, f, cljs.core.rest.call(null, s__4132)))
      }
    }else {
      return null
    }
  })
};
cljs.core.keep_indexed = function keep_indexed(f, coll) {
  var keepi__4143 = function kpi(idx, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3698__auto____4140 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3698__auto____4140)) {
        var s__4141 = temp__3698__auto____4140;
        var x__4142 = f.call(null, idx, cljs.core.first.call(null, s__4141));
        if(x__4142 === null) {
          return kpi.call(null, idx + 1, cljs.core.rest.call(null, s__4141))
        }else {
          return cljs.core.cons.call(null, x__4142, kpi.call(null, idx + 1, cljs.core.rest.call(null, s__4141)))
        }
      }else {
        return null
      }
    })
  };
  return keepi__4143.call(null, 0, coll)
};
cljs.core.every_pred = function() {
  var every_pred = null;
  var every_pred__1 = function(p) {
    return function() {
      var ep1 = null;
      var ep1__0 = function() {
        return true
      };
      var ep1__1 = function(x) {
        return cljs.core.boolean$.call(null, p.call(null, x))
      };
      var ep1__2 = function(x, y) {
        return cljs.core.boolean$.call(null, function() {
          var and__3546__auto____4150 = p.call(null, x);
          if(cljs.core.truth_(and__3546__auto____4150)) {
            return p.call(null, y)
          }else {
            return and__3546__auto____4150
          }
        }())
      };
      var ep1__3 = function(x, y, z) {
        return cljs.core.boolean$.call(null, function() {
          var and__3546__auto____4151 = p.call(null, x);
          if(cljs.core.truth_(and__3546__auto____4151)) {
            var and__3546__auto____4152 = p.call(null, y);
            if(cljs.core.truth_(and__3546__auto____4152)) {
              return p.call(null, z)
            }else {
              return and__3546__auto____4152
            }
          }else {
            return and__3546__auto____4151
          }
        }())
      };
      var ep1__4 = function() {
        var G__4188__delegate = function(x, y, z, args) {
          return cljs.core.boolean$.call(null, function() {
            var and__3546__auto____4153 = ep1.call(null, x, y, z);
            if(cljs.core.truth_(and__3546__auto____4153)) {
              return cljs.core.every_QMARK_.call(null, p, args)
            }else {
              return and__3546__auto____4153
            }
          }())
        };
        var G__4188 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4188__delegate.call(this, x, y, z, args)
        };
        G__4188.cljs$lang$maxFixedArity = 3;
        G__4188.cljs$lang$applyTo = function(arglist__4189) {
          var x = cljs.core.first(arglist__4189);
          var y = cljs.core.first(cljs.core.next(arglist__4189));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4189)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4189)));
          return G__4188__delegate.call(this, x, y, z, args)
        };
        return G__4188
      }();
      ep1 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return ep1__0.call(this);
          case 1:
            return ep1__1.call(this, x);
          case 2:
            return ep1__2.call(this, x, y);
          case 3:
            return ep1__3.call(this, x, y, z);
          default:
            return ep1__4.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      ep1.cljs$lang$maxFixedArity = 3;
      ep1.cljs$lang$applyTo = ep1__4.cljs$lang$applyTo;
      ep1.cljs$lang$arity$0 = ep1__0;
      ep1.cljs$lang$arity$1 = ep1__1;
      ep1.cljs$lang$arity$2 = ep1__2;
      ep1.cljs$lang$arity$3 = ep1__3;
      ep1.cljs$lang$arity$4 = ep1__4;
      return ep1
    }()
  };
  var every_pred__2 = function(p1, p2) {
    return function() {
      var ep2 = null;
      var ep2__0 = function() {
        return true
      };
      var ep2__1 = function(x) {
        return cljs.core.boolean$.call(null, function() {
          var and__3546__auto____4154 = p1.call(null, x);
          if(cljs.core.truth_(and__3546__auto____4154)) {
            return p2.call(null, x)
          }else {
            return and__3546__auto____4154
          }
        }())
      };
      var ep2__2 = function(x, y) {
        return cljs.core.boolean$.call(null, function() {
          var and__3546__auto____4155 = p1.call(null, x);
          if(cljs.core.truth_(and__3546__auto____4155)) {
            var and__3546__auto____4156 = p1.call(null, y);
            if(cljs.core.truth_(and__3546__auto____4156)) {
              var and__3546__auto____4157 = p2.call(null, x);
              if(cljs.core.truth_(and__3546__auto____4157)) {
                return p2.call(null, y)
              }else {
                return and__3546__auto____4157
              }
            }else {
              return and__3546__auto____4156
            }
          }else {
            return and__3546__auto____4155
          }
        }())
      };
      var ep2__3 = function(x, y, z) {
        return cljs.core.boolean$.call(null, function() {
          var and__3546__auto____4158 = p1.call(null, x);
          if(cljs.core.truth_(and__3546__auto____4158)) {
            var and__3546__auto____4159 = p1.call(null, y);
            if(cljs.core.truth_(and__3546__auto____4159)) {
              var and__3546__auto____4160 = p1.call(null, z);
              if(cljs.core.truth_(and__3546__auto____4160)) {
                var and__3546__auto____4161 = p2.call(null, x);
                if(cljs.core.truth_(and__3546__auto____4161)) {
                  var and__3546__auto____4162 = p2.call(null, y);
                  if(cljs.core.truth_(and__3546__auto____4162)) {
                    return p2.call(null, z)
                  }else {
                    return and__3546__auto____4162
                  }
                }else {
                  return and__3546__auto____4161
                }
              }else {
                return and__3546__auto____4160
              }
            }else {
              return and__3546__auto____4159
            }
          }else {
            return and__3546__auto____4158
          }
        }())
      };
      var ep2__4 = function() {
        var G__4190__delegate = function(x, y, z, args) {
          return cljs.core.boolean$.call(null, function() {
            var and__3546__auto____4163 = ep2.call(null, x, y, z);
            if(cljs.core.truth_(and__3546__auto____4163)) {
              return cljs.core.every_QMARK_.call(null, function(p1__4134_SHARP_) {
                var and__3546__auto____4164 = p1.call(null, p1__4134_SHARP_);
                if(cljs.core.truth_(and__3546__auto____4164)) {
                  return p2.call(null, p1__4134_SHARP_)
                }else {
                  return and__3546__auto____4164
                }
              }, args)
            }else {
              return and__3546__auto____4163
            }
          }())
        };
        var G__4190 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4190__delegate.call(this, x, y, z, args)
        };
        G__4190.cljs$lang$maxFixedArity = 3;
        G__4190.cljs$lang$applyTo = function(arglist__4191) {
          var x = cljs.core.first(arglist__4191);
          var y = cljs.core.first(cljs.core.next(arglist__4191));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4191)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4191)));
          return G__4190__delegate.call(this, x, y, z, args)
        };
        return G__4190
      }();
      ep2 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return ep2__0.call(this);
          case 1:
            return ep2__1.call(this, x);
          case 2:
            return ep2__2.call(this, x, y);
          case 3:
            return ep2__3.call(this, x, y, z);
          default:
            return ep2__4.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      ep2.cljs$lang$maxFixedArity = 3;
      ep2.cljs$lang$applyTo = ep2__4.cljs$lang$applyTo;
      ep2.cljs$lang$arity$0 = ep2__0;
      ep2.cljs$lang$arity$1 = ep2__1;
      ep2.cljs$lang$arity$2 = ep2__2;
      ep2.cljs$lang$arity$3 = ep2__3;
      ep2.cljs$lang$arity$4 = ep2__4;
      return ep2
    }()
  };
  var every_pred__3 = function(p1, p2, p3) {
    return function() {
      var ep3 = null;
      var ep3__0 = function() {
        return true
      };
      var ep3__1 = function(x) {
        return cljs.core.boolean$.call(null, function() {
          var and__3546__auto____4165 = p1.call(null, x);
          if(cljs.core.truth_(and__3546__auto____4165)) {
            var and__3546__auto____4166 = p2.call(null, x);
            if(cljs.core.truth_(and__3546__auto____4166)) {
              return p3.call(null, x)
            }else {
              return and__3546__auto____4166
            }
          }else {
            return and__3546__auto____4165
          }
        }())
      };
      var ep3__2 = function(x, y) {
        return cljs.core.boolean$.call(null, function() {
          var and__3546__auto____4167 = p1.call(null, x);
          if(cljs.core.truth_(and__3546__auto____4167)) {
            var and__3546__auto____4168 = p2.call(null, x);
            if(cljs.core.truth_(and__3546__auto____4168)) {
              var and__3546__auto____4169 = p3.call(null, x);
              if(cljs.core.truth_(and__3546__auto____4169)) {
                var and__3546__auto____4170 = p1.call(null, y);
                if(cljs.core.truth_(and__3546__auto____4170)) {
                  var and__3546__auto____4171 = p2.call(null, y);
                  if(cljs.core.truth_(and__3546__auto____4171)) {
                    return p3.call(null, y)
                  }else {
                    return and__3546__auto____4171
                  }
                }else {
                  return and__3546__auto____4170
                }
              }else {
                return and__3546__auto____4169
              }
            }else {
              return and__3546__auto____4168
            }
          }else {
            return and__3546__auto____4167
          }
        }())
      };
      var ep3__3 = function(x, y, z) {
        return cljs.core.boolean$.call(null, function() {
          var and__3546__auto____4172 = p1.call(null, x);
          if(cljs.core.truth_(and__3546__auto____4172)) {
            var and__3546__auto____4173 = p2.call(null, x);
            if(cljs.core.truth_(and__3546__auto____4173)) {
              var and__3546__auto____4174 = p3.call(null, x);
              if(cljs.core.truth_(and__3546__auto____4174)) {
                var and__3546__auto____4175 = p1.call(null, y);
                if(cljs.core.truth_(and__3546__auto____4175)) {
                  var and__3546__auto____4176 = p2.call(null, y);
                  if(cljs.core.truth_(and__3546__auto____4176)) {
                    var and__3546__auto____4177 = p3.call(null, y);
                    if(cljs.core.truth_(and__3546__auto____4177)) {
                      var and__3546__auto____4178 = p1.call(null, z);
                      if(cljs.core.truth_(and__3546__auto____4178)) {
                        var and__3546__auto____4179 = p2.call(null, z);
                        if(cljs.core.truth_(and__3546__auto____4179)) {
                          return p3.call(null, z)
                        }else {
                          return and__3546__auto____4179
                        }
                      }else {
                        return and__3546__auto____4178
                      }
                    }else {
                      return and__3546__auto____4177
                    }
                  }else {
                    return and__3546__auto____4176
                  }
                }else {
                  return and__3546__auto____4175
                }
              }else {
                return and__3546__auto____4174
              }
            }else {
              return and__3546__auto____4173
            }
          }else {
            return and__3546__auto____4172
          }
        }())
      };
      var ep3__4 = function() {
        var G__4192__delegate = function(x, y, z, args) {
          return cljs.core.boolean$.call(null, function() {
            var and__3546__auto____4180 = ep3.call(null, x, y, z);
            if(cljs.core.truth_(and__3546__auto____4180)) {
              return cljs.core.every_QMARK_.call(null, function(p1__4135_SHARP_) {
                var and__3546__auto____4181 = p1.call(null, p1__4135_SHARP_);
                if(cljs.core.truth_(and__3546__auto____4181)) {
                  var and__3546__auto____4182 = p2.call(null, p1__4135_SHARP_);
                  if(cljs.core.truth_(and__3546__auto____4182)) {
                    return p3.call(null, p1__4135_SHARP_)
                  }else {
                    return and__3546__auto____4182
                  }
                }else {
                  return and__3546__auto____4181
                }
              }, args)
            }else {
              return and__3546__auto____4180
            }
          }())
        };
        var G__4192 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4192__delegate.call(this, x, y, z, args)
        };
        G__4192.cljs$lang$maxFixedArity = 3;
        G__4192.cljs$lang$applyTo = function(arglist__4193) {
          var x = cljs.core.first(arglist__4193);
          var y = cljs.core.first(cljs.core.next(arglist__4193));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4193)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4193)));
          return G__4192__delegate.call(this, x, y, z, args)
        };
        return G__4192
      }();
      ep3 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return ep3__0.call(this);
          case 1:
            return ep3__1.call(this, x);
          case 2:
            return ep3__2.call(this, x, y);
          case 3:
            return ep3__3.call(this, x, y, z);
          default:
            return ep3__4.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      ep3.cljs$lang$maxFixedArity = 3;
      ep3.cljs$lang$applyTo = ep3__4.cljs$lang$applyTo;
      ep3.cljs$lang$arity$0 = ep3__0;
      ep3.cljs$lang$arity$1 = ep3__1;
      ep3.cljs$lang$arity$2 = ep3__2;
      ep3.cljs$lang$arity$3 = ep3__3;
      ep3.cljs$lang$arity$4 = ep3__4;
      return ep3
    }()
  };
  var every_pred__4 = function() {
    var G__4194__delegate = function(p1, p2, p3, ps) {
      var ps__4183 = cljs.core.list_STAR_.call(null, p1, p2, p3, ps);
      return function() {
        var epn = null;
        var epn__0 = function() {
          return true
        };
        var epn__1 = function(x) {
          return cljs.core.every_QMARK_.call(null, function(p1__4136_SHARP_) {
            return p1__4136_SHARP_.call(null, x)
          }, ps__4183)
        };
        var epn__2 = function(x, y) {
          return cljs.core.every_QMARK_.call(null, function(p1__4137_SHARP_) {
            var and__3546__auto____4184 = p1__4137_SHARP_.call(null, x);
            if(cljs.core.truth_(and__3546__auto____4184)) {
              return p1__4137_SHARP_.call(null, y)
            }else {
              return and__3546__auto____4184
            }
          }, ps__4183)
        };
        var epn__3 = function(x, y, z) {
          return cljs.core.every_QMARK_.call(null, function(p1__4138_SHARP_) {
            var and__3546__auto____4185 = p1__4138_SHARP_.call(null, x);
            if(cljs.core.truth_(and__3546__auto____4185)) {
              var and__3546__auto____4186 = p1__4138_SHARP_.call(null, y);
              if(cljs.core.truth_(and__3546__auto____4186)) {
                return p1__4138_SHARP_.call(null, z)
              }else {
                return and__3546__auto____4186
              }
            }else {
              return and__3546__auto____4185
            }
          }, ps__4183)
        };
        var epn__4 = function() {
          var G__4195__delegate = function(x, y, z, args) {
            return cljs.core.boolean$.call(null, function() {
              var and__3546__auto____4187 = epn.call(null, x, y, z);
              if(cljs.core.truth_(and__3546__auto____4187)) {
                return cljs.core.every_QMARK_.call(null, function(p1__4139_SHARP_) {
                  return cljs.core.every_QMARK_.call(null, p1__4139_SHARP_, args)
                }, ps__4183)
              }else {
                return and__3546__auto____4187
              }
            }())
          };
          var G__4195 = function(x, y, z, var_args) {
            var args = null;
            if(goog.isDef(var_args)) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
            }
            return G__4195__delegate.call(this, x, y, z, args)
          };
          G__4195.cljs$lang$maxFixedArity = 3;
          G__4195.cljs$lang$applyTo = function(arglist__4196) {
            var x = cljs.core.first(arglist__4196);
            var y = cljs.core.first(cljs.core.next(arglist__4196));
            var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4196)));
            var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4196)));
            return G__4195__delegate.call(this, x, y, z, args)
          };
          return G__4195
        }();
        epn = function(x, y, z, var_args) {
          var args = var_args;
          switch(arguments.length) {
            case 0:
              return epn__0.call(this);
            case 1:
              return epn__1.call(this, x);
            case 2:
              return epn__2.call(this, x, y);
            case 3:
              return epn__3.call(this, x, y, z);
            default:
              return epn__4.apply(this, arguments)
          }
          throw"Invalid arity: " + arguments.length;
        };
        epn.cljs$lang$maxFixedArity = 3;
        epn.cljs$lang$applyTo = epn__4.cljs$lang$applyTo;
        epn.cljs$lang$arity$0 = epn__0;
        epn.cljs$lang$arity$1 = epn__1;
        epn.cljs$lang$arity$2 = epn__2;
        epn.cljs$lang$arity$3 = epn__3;
        epn.cljs$lang$arity$4 = epn__4;
        return epn
      }()
    };
    var G__4194 = function(p1, p2, p3, var_args) {
      var ps = null;
      if(goog.isDef(var_args)) {
        ps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__4194__delegate.call(this, p1, p2, p3, ps)
    };
    G__4194.cljs$lang$maxFixedArity = 3;
    G__4194.cljs$lang$applyTo = function(arglist__4197) {
      var p1 = cljs.core.first(arglist__4197);
      var p2 = cljs.core.first(cljs.core.next(arglist__4197));
      var p3 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4197)));
      var ps = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4197)));
      return G__4194__delegate.call(this, p1, p2, p3, ps)
    };
    return G__4194
  }();
  every_pred = function(p1, p2, p3, var_args) {
    var ps = var_args;
    switch(arguments.length) {
      case 1:
        return every_pred__1.call(this, p1);
      case 2:
        return every_pred__2.call(this, p1, p2);
      case 3:
        return every_pred__3.call(this, p1, p2, p3);
      default:
        return every_pred__4.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  every_pred.cljs$lang$maxFixedArity = 3;
  every_pred.cljs$lang$applyTo = every_pred__4.cljs$lang$applyTo;
  every_pred.cljs$lang$arity$1 = every_pred__1;
  every_pred.cljs$lang$arity$2 = every_pred__2;
  every_pred.cljs$lang$arity$3 = every_pred__3;
  every_pred.cljs$lang$arity$4 = every_pred__4;
  return every_pred
}();
cljs.core.some_fn = function() {
  var some_fn = null;
  var some_fn__1 = function(p) {
    return function() {
      var sp1 = null;
      var sp1__0 = function() {
        return null
      };
      var sp1__1 = function(x) {
        return p.call(null, x)
      };
      var sp1__2 = function(x, y) {
        var or__3548__auto____4199 = p.call(null, x);
        if(cljs.core.truth_(or__3548__auto____4199)) {
          return or__3548__auto____4199
        }else {
          return p.call(null, y)
        }
      };
      var sp1__3 = function(x, y, z) {
        var or__3548__auto____4200 = p.call(null, x);
        if(cljs.core.truth_(or__3548__auto____4200)) {
          return or__3548__auto____4200
        }else {
          var or__3548__auto____4201 = p.call(null, y);
          if(cljs.core.truth_(or__3548__auto____4201)) {
            return or__3548__auto____4201
          }else {
            return p.call(null, z)
          }
        }
      };
      var sp1__4 = function() {
        var G__4237__delegate = function(x, y, z, args) {
          var or__3548__auto____4202 = sp1.call(null, x, y, z);
          if(cljs.core.truth_(or__3548__auto____4202)) {
            return or__3548__auto____4202
          }else {
            return cljs.core.some.call(null, p, args)
          }
        };
        var G__4237 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4237__delegate.call(this, x, y, z, args)
        };
        G__4237.cljs$lang$maxFixedArity = 3;
        G__4237.cljs$lang$applyTo = function(arglist__4238) {
          var x = cljs.core.first(arglist__4238);
          var y = cljs.core.first(cljs.core.next(arglist__4238));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4238)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4238)));
          return G__4237__delegate.call(this, x, y, z, args)
        };
        return G__4237
      }();
      sp1 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return sp1__0.call(this);
          case 1:
            return sp1__1.call(this, x);
          case 2:
            return sp1__2.call(this, x, y);
          case 3:
            return sp1__3.call(this, x, y, z);
          default:
            return sp1__4.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      sp1.cljs$lang$maxFixedArity = 3;
      sp1.cljs$lang$applyTo = sp1__4.cljs$lang$applyTo;
      sp1.cljs$lang$arity$0 = sp1__0;
      sp1.cljs$lang$arity$1 = sp1__1;
      sp1.cljs$lang$arity$2 = sp1__2;
      sp1.cljs$lang$arity$3 = sp1__3;
      sp1.cljs$lang$arity$4 = sp1__4;
      return sp1
    }()
  };
  var some_fn__2 = function(p1, p2) {
    return function() {
      var sp2 = null;
      var sp2__0 = function() {
        return null
      };
      var sp2__1 = function(x) {
        var or__3548__auto____4203 = p1.call(null, x);
        if(cljs.core.truth_(or__3548__auto____4203)) {
          return or__3548__auto____4203
        }else {
          return p2.call(null, x)
        }
      };
      var sp2__2 = function(x, y) {
        var or__3548__auto____4204 = p1.call(null, x);
        if(cljs.core.truth_(or__3548__auto____4204)) {
          return or__3548__auto____4204
        }else {
          var or__3548__auto____4205 = p1.call(null, y);
          if(cljs.core.truth_(or__3548__auto____4205)) {
            return or__3548__auto____4205
          }else {
            var or__3548__auto____4206 = p2.call(null, x);
            if(cljs.core.truth_(or__3548__auto____4206)) {
              return or__3548__auto____4206
            }else {
              return p2.call(null, y)
            }
          }
        }
      };
      var sp2__3 = function(x, y, z) {
        var or__3548__auto____4207 = p1.call(null, x);
        if(cljs.core.truth_(or__3548__auto____4207)) {
          return or__3548__auto____4207
        }else {
          var or__3548__auto____4208 = p1.call(null, y);
          if(cljs.core.truth_(or__3548__auto____4208)) {
            return or__3548__auto____4208
          }else {
            var or__3548__auto____4209 = p1.call(null, z);
            if(cljs.core.truth_(or__3548__auto____4209)) {
              return or__3548__auto____4209
            }else {
              var or__3548__auto____4210 = p2.call(null, x);
              if(cljs.core.truth_(or__3548__auto____4210)) {
                return or__3548__auto____4210
              }else {
                var or__3548__auto____4211 = p2.call(null, y);
                if(cljs.core.truth_(or__3548__auto____4211)) {
                  return or__3548__auto____4211
                }else {
                  return p2.call(null, z)
                }
              }
            }
          }
        }
      };
      var sp2__4 = function() {
        var G__4239__delegate = function(x, y, z, args) {
          var or__3548__auto____4212 = sp2.call(null, x, y, z);
          if(cljs.core.truth_(or__3548__auto____4212)) {
            return or__3548__auto____4212
          }else {
            return cljs.core.some.call(null, function(p1__4144_SHARP_) {
              var or__3548__auto____4213 = p1.call(null, p1__4144_SHARP_);
              if(cljs.core.truth_(or__3548__auto____4213)) {
                return or__3548__auto____4213
              }else {
                return p2.call(null, p1__4144_SHARP_)
              }
            }, args)
          }
        };
        var G__4239 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4239__delegate.call(this, x, y, z, args)
        };
        G__4239.cljs$lang$maxFixedArity = 3;
        G__4239.cljs$lang$applyTo = function(arglist__4240) {
          var x = cljs.core.first(arglist__4240);
          var y = cljs.core.first(cljs.core.next(arglist__4240));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4240)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4240)));
          return G__4239__delegate.call(this, x, y, z, args)
        };
        return G__4239
      }();
      sp2 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return sp2__0.call(this);
          case 1:
            return sp2__1.call(this, x);
          case 2:
            return sp2__2.call(this, x, y);
          case 3:
            return sp2__3.call(this, x, y, z);
          default:
            return sp2__4.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      sp2.cljs$lang$maxFixedArity = 3;
      sp2.cljs$lang$applyTo = sp2__4.cljs$lang$applyTo;
      sp2.cljs$lang$arity$0 = sp2__0;
      sp2.cljs$lang$arity$1 = sp2__1;
      sp2.cljs$lang$arity$2 = sp2__2;
      sp2.cljs$lang$arity$3 = sp2__3;
      sp2.cljs$lang$arity$4 = sp2__4;
      return sp2
    }()
  };
  var some_fn__3 = function(p1, p2, p3) {
    return function() {
      var sp3 = null;
      var sp3__0 = function() {
        return null
      };
      var sp3__1 = function(x) {
        var or__3548__auto____4214 = p1.call(null, x);
        if(cljs.core.truth_(or__3548__auto____4214)) {
          return or__3548__auto____4214
        }else {
          var or__3548__auto____4215 = p2.call(null, x);
          if(cljs.core.truth_(or__3548__auto____4215)) {
            return or__3548__auto____4215
          }else {
            return p3.call(null, x)
          }
        }
      };
      var sp3__2 = function(x, y) {
        var or__3548__auto____4216 = p1.call(null, x);
        if(cljs.core.truth_(or__3548__auto____4216)) {
          return or__3548__auto____4216
        }else {
          var or__3548__auto____4217 = p2.call(null, x);
          if(cljs.core.truth_(or__3548__auto____4217)) {
            return or__3548__auto____4217
          }else {
            var or__3548__auto____4218 = p3.call(null, x);
            if(cljs.core.truth_(or__3548__auto____4218)) {
              return or__3548__auto____4218
            }else {
              var or__3548__auto____4219 = p1.call(null, y);
              if(cljs.core.truth_(or__3548__auto____4219)) {
                return or__3548__auto____4219
              }else {
                var or__3548__auto____4220 = p2.call(null, y);
                if(cljs.core.truth_(or__3548__auto____4220)) {
                  return or__3548__auto____4220
                }else {
                  return p3.call(null, y)
                }
              }
            }
          }
        }
      };
      var sp3__3 = function(x, y, z) {
        var or__3548__auto____4221 = p1.call(null, x);
        if(cljs.core.truth_(or__3548__auto____4221)) {
          return or__3548__auto____4221
        }else {
          var or__3548__auto____4222 = p2.call(null, x);
          if(cljs.core.truth_(or__3548__auto____4222)) {
            return or__3548__auto____4222
          }else {
            var or__3548__auto____4223 = p3.call(null, x);
            if(cljs.core.truth_(or__3548__auto____4223)) {
              return or__3548__auto____4223
            }else {
              var or__3548__auto____4224 = p1.call(null, y);
              if(cljs.core.truth_(or__3548__auto____4224)) {
                return or__3548__auto____4224
              }else {
                var or__3548__auto____4225 = p2.call(null, y);
                if(cljs.core.truth_(or__3548__auto____4225)) {
                  return or__3548__auto____4225
                }else {
                  var or__3548__auto____4226 = p3.call(null, y);
                  if(cljs.core.truth_(or__3548__auto____4226)) {
                    return or__3548__auto____4226
                  }else {
                    var or__3548__auto____4227 = p1.call(null, z);
                    if(cljs.core.truth_(or__3548__auto____4227)) {
                      return or__3548__auto____4227
                    }else {
                      var or__3548__auto____4228 = p2.call(null, z);
                      if(cljs.core.truth_(or__3548__auto____4228)) {
                        return or__3548__auto____4228
                      }else {
                        return p3.call(null, z)
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };
      var sp3__4 = function() {
        var G__4241__delegate = function(x, y, z, args) {
          var or__3548__auto____4229 = sp3.call(null, x, y, z);
          if(cljs.core.truth_(or__3548__auto____4229)) {
            return or__3548__auto____4229
          }else {
            return cljs.core.some.call(null, function(p1__4145_SHARP_) {
              var or__3548__auto____4230 = p1.call(null, p1__4145_SHARP_);
              if(cljs.core.truth_(or__3548__auto____4230)) {
                return or__3548__auto____4230
              }else {
                var or__3548__auto____4231 = p2.call(null, p1__4145_SHARP_);
                if(cljs.core.truth_(or__3548__auto____4231)) {
                  return or__3548__auto____4231
                }else {
                  return p3.call(null, p1__4145_SHARP_)
                }
              }
            }, args)
          }
        };
        var G__4241 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4241__delegate.call(this, x, y, z, args)
        };
        G__4241.cljs$lang$maxFixedArity = 3;
        G__4241.cljs$lang$applyTo = function(arglist__4242) {
          var x = cljs.core.first(arglist__4242);
          var y = cljs.core.first(cljs.core.next(arglist__4242));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4242)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4242)));
          return G__4241__delegate.call(this, x, y, z, args)
        };
        return G__4241
      }();
      sp3 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return sp3__0.call(this);
          case 1:
            return sp3__1.call(this, x);
          case 2:
            return sp3__2.call(this, x, y);
          case 3:
            return sp3__3.call(this, x, y, z);
          default:
            return sp3__4.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      sp3.cljs$lang$maxFixedArity = 3;
      sp3.cljs$lang$applyTo = sp3__4.cljs$lang$applyTo;
      sp3.cljs$lang$arity$0 = sp3__0;
      sp3.cljs$lang$arity$1 = sp3__1;
      sp3.cljs$lang$arity$2 = sp3__2;
      sp3.cljs$lang$arity$3 = sp3__3;
      sp3.cljs$lang$arity$4 = sp3__4;
      return sp3
    }()
  };
  var some_fn__4 = function() {
    var G__4243__delegate = function(p1, p2, p3, ps) {
      var ps__4232 = cljs.core.list_STAR_.call(null, p1, p2, p3, ps);
      return function() {
        var spn = null;
        var spn__0 = function() {
          return null
        };
        var spn__1 = function(x) {
          return cljs.core.some.call(null, function(p1__4146_SHARP_) {
            return p1__4146_SHARP_.call(null, x)
          }, ps__4232)
        };
        var spn__2 = function(x, y) {
          return cljs.core.some.call(null, function(p1__4147_SHARP_) {
            var or__3548__auto____4233 = p1__4147_SHARP_.call(null, x);
            if(cljs.core.truth_(or__3548__auto____4233)) {
              return or__3548__auto____4233
            }else {
              return p1__4147_SHARP_.call(null, y)
            }
          }, ps__4232)
        };
        var spn__3 = function(x, y, z) {
          return cljs.core.some.call(null, function(p1__4148_SHARP_) {
            var or__3548__auto____4234 = p1__4148_SHARP_.call(null, x);
            if(cljs.core.truth_(or__3548__auto____4234)) {
              return or__3548__auto____4234
            }else {
              var or__3548__auto____4235 = p1__4148_SHARP_.call(null, y);
              if(cljs.core.truth_(or__3548__auto____4235)) {
                return or__3548__auto____4235
              }else {
                return p1__4148_SHARP_.call(null, z)
              }
            }
          }, ps__4232)
        };
        var spn__4 = function() {
          var G__4244__delegate = function(x, y, z, args) {
            var or__3548__auto____4236 = spn.call(null, x, y, z);
            if(cljs.core.truth_(or__3548__auto____4236)) {
              return or__3548__auto____4236
            }else {
              return cljs.core.some.call(null, function(p1__4149_SHARP_) {
                return cljs.core.some.call(null, p1__4149_SHARP_, args)
              }, ps__4232)
            }
          };
          var G__4244 = function(x, y, z, var_args) {
            var args = null;
            if(goog.isDef(var_args)) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
            }
            return G__4244__delegate.call(this, x, y, z, args)
          };
          G__4244.cljs$lang$maxFixedArity = 3;
          G__4244.cljs$lang$applyTo = function(arglist__4245) {
            var x = cljs.core.first(arglist__4245);
            var y = cljs.core.first(cljs.core.next(arglist__4245));
            var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4245)));
            var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4245)));
            return G__4244__delegate.call(this, x, y, z, args)
          };
          return G__4244
        }();
        spn = function(x, y, z, var_args) {
          var args = var_args;
          switch(arguments.length) {
            case 0:
              return spn__0.call(this);
            case 1:
              return spn__1.call(this, x);
            case 2:
              return spn__2.call(this, x, y);
            case 3:
              return spn__3.call(this, x, y, z);
            default:
              return spn__4.apply(this, arguments)
          }
          throw"Invalid arity: " + arguments.length;
        };
        spn.cljs$lang$maxFixedArity = 3;
        spn.cljs$lang$applyTo = spn__4.cljs$lang$applyTo;
        spn.cljs$lang$arity$0 = spn__0;
        spn.cljs$lang$arity$1 = spn__1;
        spn.cljs$lang$arity$2 = spn__2;
        spn.cljs$lang$arity$3 = spn__3;
        spn.cljs$lang$arity$4 = spn__4;
        return spn
      }()
    };
    var G__4243 = function(p1, p2, p3, var_args) {
      var ps = null;
      if(goog.isDef(var_args)) {
        ps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__4243__delegate.call(this, p1, p2, p3, ps)
    };
    G__4243.cljs$lang$maxFixedArity = 3;
    G__4243.cljs$lang$applyTo = function(arglist__4246) {
      var p1 = cljs.core.first(arglist__4246);
      var p2 = cljs.core.first(cljs.core.next(arglist__4246));
      var p3 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4246)));
      var ps = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4246)));
      return G__4243__delegate.call(this, p1, p2, p3, ps)
    };
    return G__4243
  }();
  some_fn = function(p1, p2, p3, var_args) {
    var ps = var_args;
    switch(arguments.length) {
      case 1:
        return some_fn__1.call(this, p1);
      case 2:
        return some_fn__2.call(this, p1, p2);
      case 3:
        return some_fn__3.call(this, p1, p2, p3);
      default:
        return some_fn__4.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  some_fn.cljs$lang$maxFixedArity = 3;
  some_fn.cljs$lang$applyTo = some_fn__4.cljs$lang$applyTo;
  some_fn.cljs$lang$arity$1 = some_fn__1;
  some_fn.cljs$lang$arity$2 = some_fn__2;
  some_fn.cljs$lang$arity$3 = some_fn__3;
  some_fn.cljs$lang$arity$4 = some_fn__4;
  return some_fn
}();
cljs.core.map = function() {
  var map = null;
  var map__2 = function(f, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3698__auto____4247 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3698__auto____4247)) {
        var s__4248 = temp__3698__auto____4247;
        return cljs.core.cons.call(null, f.call(null, cljs.core.first.call(null, s__4248)), map.call(null, f, cljs.core.rest.call(null, s__4248)))
      }else {
        return null
      }
    })
  };
  var map__3 = function(f, c1, c2) {
    return new cljs.core.LazySeq(null, false, function() {
      var s1__4249 = cljs.core.seq.call(null, c1);
      var s2__4250 = cljs.core.seq.call(null, c2);
      if(cljs.core.truth_(function() {
        var and__3546__auto____4251 = s1__4249;
        if(cljs.core.truth_(and__3546__auto____4251)) {
          return s2__4250
        }else {
          return and__3546__auto____4251
        }
      }())) {
        return cljs.core.cons.call(null, f.call(null, cljs.core.first.call(null, s1__4249), cljs.core.first.call(null, s2__4250)), map.call(null, f, cljs.core.rest.call(null, s1__4249), cljs.core.rest.call(null, s2__4250)))
      }else {
        return null
      }
    })
  };
  var map__4 = function(f, c1, c2, c3) {
    return new cljs.core.LazySeq(null, false, function() {
      var s1__4252 = cljs.core.seq.call(null, c1);
      var s2__4253 = cljs.core.seq.call(null, c2);
      var s3__4254 = cljs.core.seq.call(null, c3);
      if(cljs.core.truth_(function() {
        var and__3546__auto____4255 = s1__4252;
        if(cljs.core.truth_(and__3546__auto____4255)) {
          var and__3546__auto____4256 = s2__4253;
          if(cljs.core.truth_(and__3546__auto____4256)) {
            return s3__4254
          }else {
            return and__3546__auto____4256
          }
        }else {
          return and__3546__auto____4255
        }
      }())) {
        return cljs.core.cons.call(null, f.call(null, cljs.core.first.call(null, s1__4252), cljs.core.first.call(null, s2__4253), cljs.core.first.call(null, s3__4254)), map.call(null, f, cljs.core.rest.call(null, s1__4252), cljs.core.rest.call(null, s2__4253), cljs.core.rest.call(null, s3__4254)))
      }else {
        return null
      }
    })
  };
  var map__5 = function() {
    var G__4259__delegate = function(f, c1, c2, c3, colls) {
      var step__4258 = function step(cs) {
        return new cljs.core.LazySeq(null, false, function() {
          var ss__4257 = map.call(null, cljs.core.seq, cs);
          if(cljs.core.every_QMARK_.call(null, cljs.core.identity, ss__4257)) {
            return cljs.core.cons.call(null, map.call(null, cljs.core.first, ss__4257), step.call(null, map.call(null, cljs.core.rest, ss__4257)))
          }else {
            return null
          }
        })
      };
      return map.call(null, function(p1__4198_SHARP_) {
        return cljs.core.apply.call(null, f, p1__4198_SHARP_)
      }, step__4258.call(null, cljs.core.conj.call(null, colls, c3, c2, c1)))
    };
    var G__4259 = function(f, c1, c2, c3, var_args) {
      var colls = null;
      if(goog.isDef(var_args)) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0)
      }
      return G__4259__delegate.call(this, f, c1, c2, c3, colls)
    };
    G__4259.cljs$lang$maxFixedArity = 4;
    G__4259.cljs$lang$applyTo = function(arglist__4260) {
      var f = cljs.core.first(arglist__4260);
      var c1 = cljs.core.first(cljs.core.next(arglist__4260));
      var c2 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4260)));
      var c3 = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__4260))));
      var colls = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(arglist__4260))));
      return G__4259__delegate.call(this, f, c1, c2, c3, colls)
    };
    return G__4259
  }();
  map = function(f, c1, c2, c3, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return map__2.call(this, f, c1);
      case 3:
        return map__3.call(this, f, c1, c2);
      case 4:
        return map__4.call(this, f, c1, c2, c3);
      default:
        return map__5.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  map.cljs$lang$maxFixedArity = 4;
  map.cljs$lang$applyTo = map__5.cljs$lang$applyTo;
  map.cljs$lang$arity$2 = map__2;
  map.cljs$lang$arity$3 = map__3;
  map.cljs$lang$arity$4 = map__4;
  map.cljs$lang$arity$5 = map__5;
  return map
}();
cljs.core.take = function take(n, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    if(n > 0) {
      var temp__3698__auto____4261 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3698__auto____4261)) {
        var s__4262 = temp__3698__auto____4261;
        return cljs.core.cons.call(null, cljs.core.first.call(null, s__4262), take.call(null, n - 1, cljs.core.rest.call(null, s__4262)))
      }else {
        return null
      }
    }else {
      return null
    }
  })
};
cljs.core.drop = function drop(n, coll) {
  var step__4265 = function(n, coll) {
    while(true) {
      var s__4263 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(function() {
        var and__3546__auto____4264 = n > 0;
        if(and__3546__auto____4264) {
          return s__4263
        }else {
          return and__3546__auto____4264
        }
      }())) {
        var G__4266 = n - 1;
        var G__4267 = cljs.core.rest.call(null, s__4263);
        n = G__4266;
        coll = G__4267;
        continue
      }else {
        return s__4263
      }
      break
    }
  };
  return new cljs.core.LazySeq(null, false, function() {
    return step__4265.call(null, n, coll)
  })
};
cljs.core.drop_last = function() {
  var drop_last = null;
  var drop_last__1 = function(s) {
    return drop_last.call(null, 1, s)
  };
  var drop_last__2 = function(n, s) {
    return cljs.core.map.call(null, function(x, _) {
      return x
    }, s, cljs.core.drop.call(null, n, s))
  };
  drop_last = function(n, s) {
    switch(arguments.length) {
      case 1:
        return drop_last__1.call(this, n);
      case 2:
        return drop_last__2.call(this, n, s)
    }
    throw"Invalid arity: " + arguments.length;
  };
  drop_last.cljs$lang$arity$1 = drop_last__1;
  drop_last.cljs$lang$arity$2 = drop_last__2;
  return drop_last
}();
cljs.core.take_last = function take_last(n, coll) {
  var s__4268 = cljs.core.seq.call(null, coll);
  var lead__4269 = cljs.core.seq.call(null, cljs.core.drop.call(null, n, coll));
  while(true) {
    if(cljs.core.truth_(lead__4269)) {
      var G__4270 = cljs.core.next.call(null, s__4268);
      var G__4271 = cljs.core.next.call(null, lead__4269);
      s__4268 = G__4270;
      lead__4269 = G__4271;
      continue
    }else {
      return s__4268
    }
    break
  }
};
cljs.core.drop_while = function drop_while(pred, coll) {
  var step__4274 = function(pred, coll) {
    while(true) {
      var s__4272 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(function() {
        var and__3546__auto____4273 = s__4272;
        if(cljs.core.truth_(and__3546__auto____4273)) {
          return pred.call(null, cljs.core.first.call(null, s__4272))
        }else {
          return and__3546__auto____4273
        }
      }())) {
        var G__4275 = pred;
        var G__4276 = cljs.core.rest.call(null, s__4272);
        pred = G__4275;
        coll = G__4276;
        continue
      }else {
        return s__4272
      }
      break
    }
  };
  return new cljs.core.LazySeq(null, false, function() {
    return step__4274.call(null, pred, coll)
  })
};
cljs.core.cycle = function cycle(coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3698__auto____4277 = cljs.core.seq.call(null, coll);
    if(cljs.core.truth_(temp__3698__auto____4277)) {
      var s__4278 = temp__3698__auto____4277;
      return cljs.core.concat.call(null, s__4278, cycle.call(null, s__4278))
    }else {
      return null
    }
  })
};
cljs.core.split_at = function split_at(n, coll) {
  return cljs.core.PersistentVector.fromArray([cljs.core.take.call(null, n, coll), cljs.core.drop.call(null, n, coll)])
};
cljs.core.repeat = function() {
  var repeat = null;
  var repeat__1 = function(x) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, x, repeat.call(null, x))
    })
  };
  var repeat__2 = function(n, x) {
    return cljs.core.take.call(null, n, repeat.call(null, x))
  };
  repeat = function(n, x) {
    switch(arguments.length) {
      case 1:
        return repeat__1.call(this, n);
      case 2:
        return repeat__2.call(this, n, x)
    }
    throw"Invalid arity: " + arguments.length;
  };
  repeat.cljs$lang$arity$1 = repeat__1;
  repeat.cljs$lang$arity$2 = repeat__2;
  return repeat
}();
cljs.core.replicate = function replicate(n, x) {
  return cljs.core.take.call(null, n, cljs.core.repeat.call(null, x))
};
cljs.core.repeatedly = function() {
  var repeatedly = null;
  var repeatedly__1 = function(f) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, f.call(null), repeatedly.call(null, f))
    })
  };
  var repeatedly__2 = function(n, f) {
    return cljs.core.take.call(null, n, repeatedly.call(null, f))
  };
  repeatedly = function(n, f) {
    switch(arguments.length) {
      case 1:
        return repeatedly__1.call(this, n);
      case 2:
        return repeatedly__2.call(this, n, f)
    }
    throw"Invalid arity: " + arguments.length;
  };
  repeatedly.cljs$lang$arity$1 = repeatedly__1;
  repeatedly.cljs$lang$arity$2 = repeatedly__2;
  return repeatedly
}();
cljs.core.iterate = function iterate(f, x) {
  return cljs.core.cons.call(null, x, new cljs.core.LazySeq(null, false, function() {
    return iterate.call(null, f, f.call(null, x))
  }))
};
cljs.core.interleave = function() {
  var interleave = null;
  var interleave__2 = function(c1, c2) {
    return new cljs.core.LazySeq(null, false, function() {
      var s1__4279 = cljs.core.seq.call(null, c1);
      var s2__4280 = cljs.core.seq.call(null, c2);
      if(cljs.core.truth_(function() {
        var and__3546__auto____4281 = s1__4279;
        if(cljs.core.truth_(and__3546__auto____4281)) {
          return s2__4280
        }else {
          return and__3546__auto____4281
        }
      }())) {
        return cljs.core.cons.call(null, cljs.core.first.call(null, s1__4279), cljs.core.cons.call(null, cljs.core.first.call(null, s2__4280), interleave.call(null, cljs.core.rest.call(null, s1__4279), cljs.core.rest.call(null, s2__4280))))
      }else {
        return null
      }
    })
  };
  var interleave__3 = function() {
    var G__4283__delegate = function(c1, c2, colls) {
      return new cljs.core.LazySeq(null, false, function() {
        var ss__4282 = cljs.core.map.call(null, cljs.core.seq, cljs.core.conj.call(null, colls, c2, c1));
        if(cljs.core.every_QMARK_.call(null, cljs.core.identity, ss__4282)) {
          return cljs.core.concat.call(null, cljs.core.map.call(null, cljs.core.first, ss__4282), cljs.core.apply.call(null, interleave, cljs.core.map.call(null, cljs.core.rest, ss__4282)))
        }else {
          return null
        }
      })
    };
    var G__4283 = function(c1, c2, var_args) {
      var colls = null;
      if(goog.isDef(var_args)) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__4283__delegate.call(this, c1, c2, colls)
    };
    G__4283.cljs$lang$maxFixedArity = 2;
    G__4283.cljs$lang$applyTo = function(arglist__4284) {
      var c1 = cljs.core.first(arglist__4284);
      var c2 = cljs.core.first(cljs.core.next(arglist__4284));
      var colls = cljs.core.rest(cljs.core.next(arglist__4284));
      return G__4283__delegate.call(this, c1, c2, colls)
    };
    return G__4283
  }();
  interleave = function(c1, c2, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return interleave__2.call(this, c1, c2);
      default:
        return interleave__3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  interleave.cljs$lang$maxFixedArity = 2;
  interleave.cljs$lang$applyTo = interleave__3.cljs$lang$applyTo;
  interleave.cljs$lang$arity$2 = interleave__2;
  interleave.cljs$lang$arity$3 = interleave__3;
  return interleave
}();
cljs.core.interpose = function interpose(sep, coll) {
  return cljs.core.drop.call(null, 1, cljs.core.interleave.call(null, cljs.core.repeat.call(null, sep), coll))
};
cljs.core.flatten1 = function flatten1(colls) {
  var cat__4287 = function cat(coll, colls) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3695__auto____4285 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3695__auto____4285)) {
        var coll__4286 = temp__3695__auto____4285;
        return cljs.core.cons.call(null, cljs.core.first.call(null, coll__4286), cat.call(null, cljs.core.rest.call(null, coll__4286), colls))
      }else {
        if(cljs.core.truth_(cljs.core.seq.call(null, colls))) {
          return cat.call(null, cljs.core.first.call(null, colls), cljs.core.rest.call(null, colls))
        }else {
          return null
        }
      }
    })
  };
  return cat__4287.call(null, null, colls)
};
cljs.core.mapcat = function() {
  var mapcat = null;
  var mapcat__2 = function(f, coll) {
    return cljs.core.flatten1.call(null, cljs.core.map.call(null, f, coll))
  };
  var mapcat__3 = function() {
    var G__4288__delegate = function(f, coll, colls) {
      return cljs.core.flatten1.call(null, cljs.core.apply.call(null, cljs.core.map, f, coll, colls))
    };
    var G__4288 = function(f, coll, var_args) {
      var colls = null;
      if(goog.isDef(var_args)) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__4288__delegate.call(this, f, coll, colls)
    };
    G__4288.cljs$lang$maxFixedArity = 2;
    G__4288.cljs$lang$applyTo = function(arglist__4289) {
      var f = cljs.core.first(arglist__4289);
      var coll = cljs.core.first(cljs.core.next(arglist__4289));
      var colls = cljs.core.rest(cljs.core.next(arglist__4289));
      return G__4288__delegate.call(this, f, coll, colls)
    };
    return G__4288
  }();
  mapcat = function(f, coll, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return mapcat__2.call(this, f, coll);
      default:
        return mapcat__3.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  mapcat.cljs$lang$maxFixedArity = 2;
  mapcat.cljs$lang$applyTo = mapcat__3.cljs$lang$applyTo;
  mapcat.cljs$lang$arity$2 = mapcat__2;
  mapcat.cljs$lang$arity$3 = mapcat__3;
  return mapcat
}();
cljs.core.filter = function filter(pred, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3698__auto____4290 = cljs.core.seq.call(null, coll);
    if(cljs.core.truth_(temp__3698__auto____4290)) {
      var s__4291 = temp__3698__auto____4290;
      var f__4292 = cljs.core.first.call(null, s__4291);
      var r__4293 = cljs.core.rest.call(null, s__4291);
      if(cljs.core.truth_(pred.call(null, f__4292))) {
        return cljs.core.cons.call(null, f__4292, filter.call(null, pred, r__4293))
      }else {
        return filter.call(null, pred, r__4293)
      }
    }else {
      return null
    }
  })
};
cljs.core.remove = function remove(pred, coll) {
  return cljs.core.filter.call(null, cljs.core.complement.call(null, pred), coll)
};
cljs.core.tree_seq = function tree_seq(branch_QMARK_, children, root) {
  var walk__4295 = function walk(node) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, node, cljs.core.truth_(branch_QMARK_.call(null, node)) ? cljs.core.mapcat.call(null, walk, children.call(null, node)) : null)
    })
  };
  return walk__4295.call(null, root)
};
cljs.core.flatten = function flatten(x) {
  return cljs.core.filter.call(null, function(p1__4294_SHARP_) {
    return cljs.core.not.call(null, cljs.core.sequential_QMARK_.call(null, p1__4294_SHARP_))
  }, cljs.core.rest.call(null, cljs.core.tree_seq.call(null, cljs.core.sequential_QMARK_, cljs.core.seq, x)))
};
cljs.core.into = function into(to, from) {
  return cljs.core.reduce.call(null, cljs.core._conj, to, from)
};
cljs.core.partition = function() {
  var partition = null;
  var partition__2 = function(n, coll) {
    return partition.call(null, n, n, coll)
  };
  var partition__3 = function(n, step, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3698__auto____4296 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3698__auto____4296)) {
        var s__4297 = temp__3698__auto____4296;
        var p__4298 = cljs.core.take.call(null, n, s__4297);
        if(cljs.core._EQ_.call(null, n, cljs.core.count.call(null, p__4298))) {
          return cljs.core.cons.call(null, p__4298, partition.call(null, n, step, cljs.core.drop.call(null, step, s__4297)))
        }else {
          return null
        }
      }else {
        return null
      }
    })
  };
  var partition__4 = function(n, step, pad, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3698__auto____4299 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3698__auto____4299)) {
        var s__4300 = temp__3698__auto____4299;
        var p__4301 = cljs.core.take.call(null, n, s__4300);
        if(cljs.core._EQ_.call(null, n, cljs.core.count.call(null, p__4301))) {
          return cljs.core.cons.call(null, p__4301, partition.call(null, n, step, pad, cljs.core.drop.call(null, step, s__4300)))
        }else {
          return cljs.core.list.call(null, cljs.core.take.call(null, n, cljs.core.concat.call(null, p__4301, pad)))
        }
      }else {
        return null
      }
    })
  };
  partition = function(n, step, pad, coll) {
    switch(arguments.length) {
      case 2:
        return partition__2.call(this, n, step);
      case 3:
        return partition__3.call(this, n, step, pad);
      case 4:
        return partition__4.call(this, n, step, pad, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  partition.cljs$lang$arity$2 = partition__2;
  partition.cljs$lang$arity$3 = partition__3;
  partition.cljs$lang$arity$4 = partition__4;
  return partition
}();
cljs.core.get_in = function() {
  var get_in = null;
  var get_in__2 = function(m, ks) {
    return cljs.core.reduce.call(null, cljs.core.get, m, ks)
  };
  var get_in__3 = function(m, ks, not_found) {
    var sentinel__4302 = cljs.core.lookup_sentinel;
    var m__4303 = m;
    var ks__4304 = cljs.core.seq.call(null, ks);
    while(true) {
      if(cljs.core.truth_(ks__4304)) {
        var m__4305 = cljs.core.get.call(null, m__4303, cljs.core.first.call(null, ks__4304), sentinel__4302);
        if(sentinel__4302 === m__4305) {
          return not_found
        }else {
          var G__4306 = sentinel__4302;
          var G__4307 = m__4305;
          var G__4308 = cljs.core.next.call(null, ks__4304);
          sentinel__4302 = G__4306;
          m__4303 = G__4307;
          ks__4304 = G__4308;
          continue
        }
      }else {
        return m__4303
      }
      break
    }
  };
  get_in = function(m, ks, not_found) {
    switch(arguments.length) {
      case 2:
        return get_in__2.call(this, m, ks);
      case 3:
        return get_in__3.call(this, m, ks, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  get_in.cljs$lang$arity$2 = get_in__2;
  get_in.cljs$lang$arity$3 = get_in__3;
  return get_in
}();
cljs.core.assoc_in = function assoc_in(m, p__4309, v) {
  var vec__4310__4311 = p__4309;
  var k__4312 = cljs.core.nth.call(null, vec__4310__4311, 0, null);
  var ks__4313 = cljs.core.nthnext.call(null, vec__4310__4311, 1);
  if(cljs.core.truth_(ks__4313)) {
    return cljs.core.assoc.call(null, m, k__4312, assoc_in.call(null, cljs.core.get.call(null, m, k__4312), ks__4313, v))
  }else {
    return cljs.core.assoc.call(null, m, k__4312, v)
  }
};
cljs.core.update_in = function() {
  var update_in__delegate = function(m, p__4314, f, args) {
    var vec__4315__4316 = p__4314;
    var k__4317 = cljs.core.nth.call(null, vec__4315__4316, 0, null);
    var ks__4318 = cljs.core.nthnext.call(null, vec__4315__4316, 1);
    if(cljs.core.truth_(ks__4318)) {
      return cljs.core.assoc.call(null, m, k__4317, cljs.core.apply.call(null, update_in, cljs.core.get.call(null, m, k__4317), ks__4318, f, args))
    }else {
      return cljs.core.assoc.call(null, m, k__4317, cljs.core.apply.call(null, f, cljs.core.get.call(null, m, k__4317), args))
    }
  };
  var update_in = function(m, p__4314, f, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
    }
    return update_in__delegate.call(this, m, p__4314, f, args)
  };
  update_in.cljs$lang$maxFixedArity = 3;
  update_in.cljs$lang$applyTo = function(arglist__4319) {
    var m = cljs.core.first(arglist__4319);
    var p__4314 = cljs.core.first(cljs.core.next(arglist__4319));
    var f = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4319)));
    var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4319)));
    return update_in__delegate.call(this, m, p__4314, f, args)
  };
  return update_in
}();
cljs.core.Vector = function(meta, array) {
  this.meta = meta;
  this.array = array
};
cljs.core.Vector.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.Vector")
};
cljs.core.Vector.prototype.cljs$core$IHash$ = true;
cljs.core.Vector.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__4320 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.Vector.prototype.cljs$core$ILookup$ = true;
cljs.core.Vector.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__4321 = this;
  return cljs.core._nth.call(null, coll, k, null)
};
cljs.core.Vector.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__4322 = this;
  return cljs.core._nth.call(null, coll, k, not_found)
};
cljs.core.Vector.prototype.cljs$core$IAssociative$ = true;
cljs.core.Vector.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__4323 = this;
  var new_array__4324 = cljs.core.aclone.call(null, this__4323.array);
  new_array__4324[k] = v;
  return new cljs.core.Vector(this__4323.meta, new_array__4324)
};
cljs.core.Vector.prototype.cljs$core$IFn$ = true;
cljs.core.Vector.prototype.call = function() {
  var G__4355 = null;
  var G__4355__2 = function(tsym4325, k) {
    var this__4327 = this;
    var tsym4325__4328 = this;
    var coll__4329 = tsym4325__4328;
    return cljs.core._lookup.call(null, coll__4329, k)
  };
  var G__4355__3 = function(tsym4326, k, not_found) {
    var this__4330 = this;
    var tsym4326__4331 = this;
    var coll__4332 = tsym4326__4331;
    return cljs.core._lookup.call(null, coll__4332, k, not_found)
  };
  G__4355 = function(tsym4326, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4355__2.call(this, tsym4326, k);
      case 3:
        return G__4355__3.call(this, tsym4326, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4355
}();
cljs.core.Vector.prototype.cljs$core$ISequential$ = true;
cljs.core.Vector.prototype.cljs$core$ICollection$ = true;
cljs.core.Vector.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__4333 = this;
  var new_array__4334 = cljs.core.aclone.call(null, this__4333.array);
  new_array__4334.push(o);
  return new cljs.core.Vector(this__4333.meta, new_array__4334)
};
cljs.core.Vector.prototype.toString = function() {
  var this__4335 = this;
  var this$__4336 = this;
  return cljs.core.pr_str.call(null, this$__4336)
};
cljs.core.Vector.prototype.cljs$core$IReduce$ = true;
cljs.core.Vector.prototype.cljs$core$IReduce$_reduce$arity$2 = function(v, f) {
  var this__4337 = this;
  return cljs.core.ci_reduce.call(null, this__4337.array, f)
};
cljs.core.Vector.prototype.cljs$core$IReduce$_reduce$arity$3 = function(v, f, start) {
  var this__4338 = this;
  return cljs.core.ci_reduce.call(null, this__4338.array, f, start)
};
cljs.core.Vector.prototype.cljs$core$ISeqable$ = true;
cljs.core.Vector.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__4339 = this;
  if(this__4339.array.length > 0) {
    var vector_seq__4340 = function vector_seq(i) {
      return new cljs.core.LazySeq(null, false, function() {
        if(i < this__4339.array.length) {
          return cljs.core.cons.call(null, this__4339.array[i], vector_seq.call(null, i + 1))
        }else {
          return null
        }
      })
    };
    return vector_seq__4340.call(null, 0)
  }else {
    return null
  }
};
cljs.core.Vector.prototype.cljs$core$ICounted$ = true;
cljs.core.Vector.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__4341 = this;
  return this__4341.array.length
};
cljs.core.Vector.prototype.cljs$core$IStack$ = true;
cljs.core.Vector.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__4342 = this;
  var count__4343 = this__4342.array.length;
  if(count__4343 > 0) {
    return this__4342.array[count__4343 - 1]
  }else {
    return null
  }
};
cljs.core.Vector.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__4344 = this;
  if(this__4344.array.length > 0) {
    var new_array__4345 = cljs.core.aclone.call(null, this__4344.array);
    new_array__4345.pop();
    return new cljs.core.Vector(this__4344.meta, new_array__4345)
  }else {
    throw new Error("Can't pop empty vector");
  }
};
cljs.core.Vector.prototype.cljs$core$IVector$ = true;
cljs.core.Vector.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(coll, n, val) {
  var this__4346 = this;
  return cljs.core._assoc.call(null, coll, n, val)
};
cljs.core.Vector.prototype.cljs$core$IEquiv$ = true;
cljs.core.Vector.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__4347 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.Vector.prototype.cljs$core$IWithMeta$ = true;
cljs.core.Vector.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__4348 = this;
  return new cljs.core.Vector(meta, this__4348.array)
};
cljs.core.Vector.prototype.cljs$core$IMeta$ = true;
cljs.core.Vector.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__4349 = this;
  return this__4349.meta
};
cljs.core.Vector.prototype.cljs$core$IIndexed$ = true;
cljs.core.Vector.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var this__4351 = this;
  if(function() {
    var and__3546__auto____4352 = 0 <= n;
    if(and__3546__auto____4352) {
      return n < this__4351.array.length
    }else {
      return and__3546__auto____4352
    }
  }()) {
    return this__4351.array[n]
  }else {
    return null
  }
};
cljs.core.Vector.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var this__4353 = this;
  if(function() {
    var and__3546__auto____4354 = 0 <= n;
    if(and__3546__auto____4354) {
      return n < this__4353.array.length
    }else {
      return and__3546__auto____4354
    }
  }()) {
    return this__4353.array[n]
  }else {
    return not_found
  }
};
cljs.core.Vector.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.Vector.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__4350 = this;
  return cljs.core.with_meta.call(null, cljs.core.Vector.EMPTY, this__4350.meta)
};
cljs.core.Vector;
cljs.core.Vector.EMPTY = new cljs.core.Vector(null, []);
cljs.core.Vector.fromArray = function(xs) {
  return new cljs.core.Vector(null, xs)
};
cljs.core.tail_off = function tail_off(pv) {
  var cnt__4356 = pv.cnt;
  if(cnt__4356 < 32) {
    return 0
  }else {
    return cnt__4356 - 1 >> 5 << 5
  }
};
cljs.core.new_path = function new_path(level, node) {
  var ll__4357 = level;
  var ret__4358 = node;
  while(true) {
    if(ll__4357 === 0) {
      return ret__4358
    }else {
      var embed__4359 = ret__4358;
      var r__4360 = cljs.core.aclone.call(null, cljs.core.PersistentVector.EMPTY_NODE);
      var ___4361 = r__4360[0] = embed__4359;
      var G__4362 = ll__4357 - 5;
      var G__4363 = r__4360;
      ll__4357 = G__4362;
      ret__4358 = G__4363;
      continue
    }
    break
  }
};
cljs.core.push_tail = function push_tail(pv, level, parent, tailnode) {
  var ret__4364 = cljs.core.aclone.call(null, parent);
  var subidx__4365 = pv.cnt - 1 >> level & 31;
  if(5 === level) {
    ret__4364[subidx__4365] = tailnode;
    return ret__4364
  }else {
    var temp__3695__auto____4366 = parent[subidx__4365];
    if(cljs.core.truth_(temp__3695__auto____4366)) {
      var child__4367 = temp__3695__auto____4366;
      var node_to_insert__4368 = push_tail.call(null, pv, level - 5, child__4367, tailnode);
      var ___4369 = ret__4364[subidx__4365] = node_to_insert__4368;
      return ret__4364
    }else {
      var node_to_insert__4370 = cljs.core.new_path.call(null, level - 5, tailnode);
      var ___4371 = ret__4364[subidx__4365] = node_to_insert__4370;
      return ret__4364
    }
  }
};
cljs.core.array_for = function array_for(pv, i) {
  if(function() {
    var and__3546__auto____4372 = 0 <= i;
    if(and__3546__auto____4372) {
      return i < pv.cnt
    }else {
      return and__3546__auto____4372
    }
  }()) {
    if(i >= cljs.core.tail_off.call(null, pv)) {
      return pv.tail
    }else {
      var node__4373 = pv.root;
      var level__4374 = pv.shift;
      while(true) {
        if(level__4374 > 0) {
          var G__4375 = node__4373[i >> level__4374 & 31];
          var G__4376 = level__4374 - 5;
          node__4373 = G__4375;
          level__4374 = G__4376;
          continue
        }else {
          return node__4373
        }
        break
      }
    }
  }else {
    throw new Error(cljs.core.str.call(null, "No item ", i, " in vector of length ", pv.cnt));
  }
};
cljs.core.do_assoc = function do_assoc(pv, level, node, i, val) {
  var ret__4377 = cljs.core.aclone.call(null, node);
  if(level === 0) {
    ret__4377[i & 31] = val;
    return ret__4377
  }else {
    var subidx__4378 = i >> level & 31;
    var ___4379 = ret__4377[subidx__4378] = do_assoc.call(null, pv, level - 5, node[subidx__4378], i, val);
    return ret__4377
  }
};
cljs.core.pop_tail = function pop_tail(pv, level, node) {
  var subidx__4380 = pv.cnt - 2 >> level & 31;
  if(level > 5) {
    var new_child__4381 = pop_tail.call(null, pv, level - 5, node[subidx__4380]);
    if(function() {
      var and__3546__auto____4382 = new_child__4381 === null;
      if(and__3546__auto____4382) {
        return subidx__4380 === 0
      }else {
        return and__3546__auto____4382
      }
    }()) {
      return null
    }else {
      var ret__4383 = cljs.core.aclone.call(null, node);
      var ___4384 = ret__4383[subidx__4380] = new_child__4381;
      return ret__4383
    }
  }else {
    if(subidx__4380 === 0) {
      return null
    }else {
      if("\ufdd0'else") {
        var ret__4385 = cljs.core.aclone.call(null, node);
        var ___4386 = ret__4385[subidx__4380] = null;
        return ret__4385
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentVector = function(meta, cnt, shift, root, tail) {
  this.meta = meta;
  this.cnt = cnt;
  this.shift = shift;
  this.root = root;
  this.tail = tail
};
cljs.core.PersistentVector.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.PersistentVector")
};
cljs.core.PersistentVector.prototype.cljs$core$IHash$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__4387 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.PersistentVector.prototype.cljs$core$ILookup$ = true;
cljs.core.PersistentVector.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__4388 = this;
  return cljs.core._nth.call(null, coll, k, null)
};
cljs.core.PersistentVector.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__4389 = this;
  return cljs.core._nth.call(null, coll, k, not_found)
};
cljs.core.PersistentVector.prototype.cljs$core$IAssociative$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__4390 = this;
  if(function() {
    var and__3546__auto____4391 = 0 <= k;
    if(and__3546__auto____4391) {
      return k < this__4390.cnt
    }else {
      return and__3546__auto____4391
    }
  }()) {
    if(cljs.core.tail_off.call(null, coll) <= k) {
      var new_tail__4392 = cljs.core.aclone.call(null, this__4390.tail);
      new_tail__4392[k & 31] = v;
      return new cljs.core.PersistentVector(this__4390.meta, this__4390.cnt, this__4390.shift, this__4390.root, new_tail__4392)
    }else {
      return new cljs.core.PersistentVector(this__4390.meta, this__4390.cnt, this__4390.shift, cljs.core.do_assoc.call(null, coll, this__4390.shift, this__4390.root, k, v), this__4390.tail)
    }
  }else {
    if(k === this__4390.cnt) {
      return cljs.core._conj.call(null, coll, v)
    }else {
      if("\ufdd0'else") {
        throw new Error(cljs.core.str.call(null, "Index ", k, " out of bounds  [0,", this__4390.cnt, "]"));
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IFn$ = true;
cljs.core.PersistentVector.prototype.call = function() {
  var G__4431 = null;
  var G__4431__2 = function(tsym4393, k) {
    var this__4395 = this;
    var tsym4393__4396 = this;
    var coll__4397 = tsym4393__4396;
    return cljs.core._lookup.call(null, coll__4397, k)
  };
  var G__4431__3 = function(tsym4394, k, not_found) {
    var this__4398 = this;
    var tsym4394__4399 = this;
    var coll__4400 = tsym4394__4399;
    return cljs.core._lookup.call(null, coll__4400, k, not_found)
  };
  G__4431 = function(tsym4394, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4431__2.call(this, tsym4394, k);
      case 3:
        return G__4431__3.call(this, tsym4394, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4431
}();
cljs.core.PersistentVector.prototype.cljs$core$ISequential$ = true;
cljs.core.PersistentVector.prototype.cljs$core$ICollection$ = true;
cljs.core.PersistentVector.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__4401 = this;
  if(this__4401.cnt - cljs.core.tail_off.call(null, coll) < 32) {
    var new_tail__4402 = cljs.core.aclone.call(null, this__4401.tail);
    new_tail__4402.push(o);
    return new cljs.core.PersistentVector(this__4401.meta, this__4401.cnt + 1, this__4401.shift, this__4401.root, new_tail__4402)
  }else {
    var root_overflow_QMARK___4403 = this__4401.cnt >> 5 > 1 << this__4401.shift;
    var new_shift__4404 = root_overflow_QMARK___4403 ? this__4401.shift + 5 : this__4401.shift;
    var new_root__4406 = root_overflow_QMARK___4403 ? function() {
      var n_r__4405 = cljs.core.aclone.call(null, cljs.core.PersistentVector.EMPTY_NODE);
      n_r__4405[0] = this__4401.root;
      n_r__4405[1] = cljs.core.new_path.call(null, this__4401.shift, this__4401.tail);
      return n_r__4405
    }() : cljs.core.push_tail.call(null, coll, this__4401.shift, this__4401.root, this__4401.tail);
    return new cljs.core.PersistentVector(this__4401.meta, this__4401.cnt + 1, new_shift__4404, new_root__4406, [o])
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IMapEntry$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IMapEntry$_key$arity$1 = function(coll) {
  var this__4407 = this;
  return cljs.core._nth.call(null, coll, 0)
};
cljs.core.PersistentVector.prototype.cljs$core$IMapEntry$_val$arity$1 = function(coll) {
  var this__4408 = this;
  return cljs.core._nth.call(null, coll, 1)
};
cljs.core.PersistentVector.prototype.toString = function() {
  var this__4409 = this;
  var this$__4410 = this;
  return cljs.core.pr_str.call(null, this$__4410)
};
cljs.core.PersistentVector.prototype.cljs$core$IReduce$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IReduce$_reduce$arity$2 = function(v, f) {
  var this__4411 = this;
  return cljs.core.ci_reduce.call(null, v, f)
};
cljs.core.PersistentVector.prototype.cljs$core$IReduce$_reduce$arity$3 = function(v, f, start) {
  var this__4412 = this;
  return cljs.core.ci_reduce.call(null, v, f, start)
};
cljs.core.PersistentVector.prototype.cljs$core$ISeqable$ = true;
cljs.core.PersistentVector.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__4413 = this;
  if(this__4413.cnt > 0) {
    var vector_seq__4414 = function vector_seq(i) {
      return new cljs.core.LazySeq(null, false, function() {
        if(i < this__4413.cnt) {
          return cljs.core.cons.call(null, cljs.core._nth.call(null, coll, i), vector_seq.call(null, i + 1))
        }else {
          return null
        }
      })
    };
    return vector_seq__4414.call(null, 0)
  }else {
    return null
  }
};
cljs.core.PersistentVector.prototype.cljs$core$ICounted$ = true;
cljs.core.PersistentVector.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__4415 = this;
  return this__4415.cnt
};
cljs.core.PersistentVector.prototype.cljs$core$IStack$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__4416 = this;
  if(this__4416.cnt > 0) {
    return cljs.core._nth.call(null, coll, this__4416.cnt - 1)
  }else {
    return null
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__4417 = this;
  if(this__4417.cnt === 0) {
    throw new Error("Can't pop empty vector");
  }else {
    if(1 === this__4417.cnt) {
      return cljs.core._with_meta.call(null, cljs.core.PersistentVector.EMPTY, this__4417.meta)
    }else {
      if(1 < this__4417.cnt - cljs.core.tail_off.call(null, coll)) {
        return new cljs.core.PersistentVector(this__4417.meta, this__4417.cnt - 1, this__4417.shift, this__4417.root, this__4417.tail.slice(0, -1))
      }else {
        if("\ufdd0'else") {
          var new_tail__4418 = cljs.core.array_for.call(null, coll, this__4417.cnt - 2);
          var nr__4419 = cljs.core.pop_tail.call(null, coll, this__4417.shift, this__4417.root);
          var new_root__4420 = nr__4419 === null ? cljs.core.PersistentVector.EMPTY_NODE : nr__4419;
          var cnt_1__4421 = this__4417.cnt - 1;
          if(function() {
            var and__3546__auto____4422 = 5 < this__4417.shift;
            if(and__3546__auto____4422) {
              return new_root__4420[1] === null
            }else {
              return and__3546__auto____4422
            }
          }()) {
            return new cljs.core.PersistentVector(this__4417.meta, cnt_1__4421, this__4417.shift - 5, new_root__4420[0], new_tail__4418)
          }else {
            return new cljs.core.PersistentVector(this__4417.meta, cnt_1__4421, this__4417.shift, new_root__4420, new_tail__4418)
          }
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IVector$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(coll, n, val) {
  var this__4423 = this;
  return cljs.core._assoc.call(null, coll, n, val)
};
cljs.core.PersistentVector.prototype.cljs$core$IEquiv$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__4424 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.PersistentVector.prototype.cljs$core$IWithMeta$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__4425 = this;
  return new cljs.core.PersistentVector(meta, this__4425.cnt, this__4425.shift, this__4425.root, this__4425.tail)
};
cljs.core.PersistentVector.prototype.cljs$core$IMeta$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__4427 = this;
  return this__4427.meta
};
cljs.core.PersistentVector.prototype.cljs$core$IIndexed$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var this__4428 = this;
  return cljs.core.array_for.call(null, coll, n)[n & 31]
};
cljs.core.PersistentVector.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var this__4429 = this;
  if(function() {
    var and__3546__auto____4430 = 0 <= n;
    if(and__3546__auto____4430) {
      return n < this__4429.cnt
    }else {
      return and__3546__auto____4430
    }
  }()) {
    return cljs.core._nth.call(null, coll, n)
  }else {
    return not_found
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__4426 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentVector.EMPTY, this__4426.meta)
};
cljs.core.PersistentVector;
cljs.core.PersistentVector.EMPTY_NODE = cljs.core.make_array.call(null, 32);
cljs.core.PersistentVector.EMPTY = new cljs.core.PersistentVector(null, 0, 5, cljs.core.PersistentVector.EMPTY_NODE, []);
cljs.core.PersistentVector.fromArray = function(xs) {
  return cljs.core.into.call(null, cljs.core.PersistentVector.EMPTY, xs)
};
cljs.core.vec = function vec(coll) {
  return cljs.core.reduce.call(null, cljs.core.conj, cljs.core.PersistentVector.EMPTY, coll)
};
cljs.core.vector = function() {
  var vector__delegate = function(args) {
    return cljs.core.vec.call(null, args)
  };
  var vector = function(var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return vector__delegate.call(this, args)
  };
  vector.cljs$lang$maxFixedArity = 0;
  vector.cljs$lang$applyTo = function(arglist__4432) {
    var args = cljs.core.seq(arglist__4432);
    return vector__delegate.call(this, args)
  };
  return vector
}();
cljs.core.Subvec = function(meta, v, start, end) {
  this.meta = meta;
  this.v = v;
  this.start = start;
  this.end = end
};
cljs.core.Subvec.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.Subvec")
};
cljs.core.Subvec.prototype.cljs$core$IHash$ = true;
cljs.core.Subvec.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__4433 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.Subvec.prototype.cljs$core$ILookup$ = true;
cljs.core.Subvec.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__4434 = this;
  return cljs.core._nth.call(null, coll, k, null)
};
cljs.core.Subvec.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__4435 = this;
  return cljs.core._nth.call(null, coll, k, not_found)
};
cljs.core.Subvec.prototype.cljs$core$IAssociative$ = true;
cljs.core.Subvec.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, key, val) {
  var this__4436 = this;
  var v_pos__4437 = this__4436.start + key;
  return new cljs.core.Subvec(this__4436.meta, cljs.core._assoc.call(null, this__4436.v, v_pos__4437, val), this__4436.start, this__4436.end > v_pos__4437 + 1 ? this__4436.end : v_pos__4437 + 1)
};
cljs.core.Subvec.prototype.cljs$core$IFn$ = true;
cljs.core.Subvec.prototype.call = function() {
  var G__4463 = null;
  var G__4463__2 = function(tsym4438, k) {
    var this__4440 = this;
    var tsym4438__4441 = this;
    var coll__4442 = tsym4438__4441;
    return cljs.core._lookup.call(null, coll__4442, k)
  };
  var G__4463__3 = function(tsym4439, k, not_found) {
    var this__4443 = this;
    var tsym4439__4444 = this;
    var coll__4445 = tsym4439__4444;
    return cljs.core._lookup.call(null, coll__4445, k, not_found)
  };
  G__4463 = function(tsym4439, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4463__2.call(this, tsym4439, k);
      case 3:
        return G__4463__3.call(this, tsym4439, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4463
}();
cljs.core.Subvec.prototype.cljs$core$ISequential$ = true;
cljs.core.Subvec.prototype.cljs$core$ICollection$ = true;
cljs.core.Subvec.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__4446 = this;
  return new cljs.core.Subvec(this__4446.meta, cljs.core._assoc_n.call(null, this__4446.v, this__4446.end, o), this__4446.start, this__4446.end + 1)
};
cljs.core.Subvec.prototype.toString = function() {
  var this__4447 = this;
  var this$__4448 = this;
  return cljs.core.pr_str.call(null, this$__4448)
};
cljs.core.Subvec.prototype.cljs$core$IReduce$ = true;
cljs.core.Subvec.prototype.cljs$core$IReduce$_reduce$arity$2 = function(coll, f) {
  var this__4449 = this;
  return cljs.core.ci_reduce.call(null, coll, f)
};
cljs.core.Subvec.prototype.cljs$core$IReduce$_reduce$arity$3 = function(coll, f, start) {
  var this__4450 = this;
  return cljs.core.ci_reduce.call(null, coll, f, start)
};
cljs.core.Subvec.prototype.cljs$core$ISeqable$ = true;
cljs.core.Subvec.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__4451 = this;
  var subvec_seq__4452 = function subvec_seq(i) {
    if(cljs.core._EQ_.call(null, i, this__4451.end)) {
      return null
    }else {
      return cljs.core.cons.call(null, cljs.core._nth.call(null, this__4451.v, i), new cljs.core.LazySeq(null, false, function() {
        return subvec_seq.call(null, i + 1)
      }))
    }
  };
  return subvec_seq__4452.call(null, this__4451.start)
};
cljs.core.Subvec.prototype.cljs$core$ICounted$ = true;
cljs.core.Subvec.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__4453 = this;
  return this__4453.end - this__4453.start
};
cljs.core.Subvec.prototype.cljs$core$IStack$ = true;
cljs.core.Subvec.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__4454 = this;
  return cljs.core._nth.call(null, this__4454.v, this__4454.end - 1)
};
cljs.core.Subvec.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__4455 = this;
  if(cljs.core._EQ_.call(null, this__4455.start, this__4455.end)) {
    throw new Error("Can't pop empty vector");
  }else {
    return new cljs.core.Subvec(this__4455.meta, this__4455.v, this__4455.start, this__4455.end - 1)
  }
};
cljs.core.Subvec.prototype.cljs$core$IVector$ = true;
cljs.core.Subvec.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(coll, n, val) {
  var this__4456 = this;
  return cljs.core._assoc.call(null, coll, n, val)
};
cljs.core.Subvec.prototype.cljs$core$IEquiv$ = true;
cljs.core.Subvec.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__4457 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.Subvec.prototype.cljs$core$IWithMeta$ = true;
cljs.core.Subvec.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__4458 = this;
  return new cljs.core.Subvec(meta, this__4458.v, this__4458.start, this__4458.end)
};
cljs.core.Subvec.prototype.cljs$core$IMeta$ = true;
cljs.core.Subvec.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__4459 = this;
  return this__4459.meta
};
cljs.core.Subvec.prototype.cljs$core$IIndexed$ = true;
cljs.core.Subvec.prototype.cljs$core$IIndexed$_nth$arity$2 = function(coll, n) {
  var this__4461 = this;
  return cljs.core._nth.call(null, this__4461.v, this__4461.start + n)
};
cljs.core.Subvec.prototype.cljs$core$IIndexed$_nth$arity$3 = function(coll, n, not_found) {
  var this__4462 = this;
  return cljs.core._nth.call(null, this__4462.v, this__4462.start + n, not_found)
};
cljs.core.Subvec.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.Subvec.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__4460 = this;
  return cljs.core.with_meta.call(null, cljs.core.Vector.EMPTY, this__4460.meta)
};
cljs.core.Subvec;
cljs.core.subvec = function() {
  var subvec = null;
  var subvec__2 = function(v, start) {
    return subvec.call(null, v, start, cljs.core.count.call(null, v))
  };
  var subvec__3 = function(v, start, end) {
    return new cljs.core.Subvec(null, v, start, end)
  };
  subvec = function(v, start, end) {
    switch(arguments.length) {
      case 2:
        return subvec__2.call(this, v, start);
      case 3:
        return subvec__3.call(this, v, start, end)
    }
    throw"Invalid arity: " + arguments.length;
  };
  subvec.cljs$lang$arity$2 = subvec__2;
  subvec.cljs$lang$arity$3 = subvec__3;
  return subvec
}();
cljs.core.PersistentQueueSeq = function(meta, front, rear) {
  this.meta = meta;
  this.front = front;
  this.rear = rear
};
cljs.core.PersistentQueueSeq.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.PersistentQueueSeq")
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IHash$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__4464 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISequential$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$ICollection$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__4465 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.PersistentQueueSeq.prototype.toString = function() {
  var this__4466 = this;
  var this$__4467 = this;
  return cljs.core.pr_str.call(null, this$__4467)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeqable$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__4468 = this;
  return coll
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeq$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__4469 = this;
  return cljs.core._first.call(null, this__4469.front)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__4470 = this;
  var temp__3695__auto____4471 = cljs.core.next.call(null, this__4470.front);
  if(cljs.core.truth_(temp__3695__auto____4471)) {
    var f1__4472 = temp__3695__auto____4471;
    return new cljs.core.PersistentQueueSeq(this__4470.meta, f1__4472, this__4470.rear)
  }else {
    if(this__4470.rear === null) {
      return cljs.core._empty.call(null, coll)
    }else {
      return new cljs.core.PersistentQueueSeq(this__4470.meta, this__4470.rear, null)
    }
  }
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IEquiv$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__4473 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IWithMeta$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__4474 = this;
  return new cljs.core.PersistentQueueSeq(meta, this__4474.front, this__4474.rear)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IMeta$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__4475 = this;
  return this__4475.meta
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__4476 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__4476.meta)
};
cljs.core.PersistentQueueSeq;
cljs.core.PersistentQueue = function(meta, count, front, rear) {
  this.meta = meta;
  this.count = count;
  this.front = front;
  this.rear = rear
};
cljs.core.PersistentQueue.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.PersistentQueue")
};
cljs.core.PersistentQueue.prototype.cljs$core$IHash$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__4477 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.PersistentQueue.prototype.cljs$core$ISequential$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$ICollection$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__4478 = this;
  if(cljs.core.truth_(this__4478.front)) {
    return new cljs.core.PersistentQueue(this__4478.meta, this__4478.count + 1, this__4478.front, cljs.core.conj.call(null, function() {
      var or__3548__auto____4479 = this__4478.rear;
      if(cljs.core.truth_(or__3548__auto____4479)) {
        return or__3548__auto____4479
      }else {
        return cljs.core.PersistentVector.fromArray([])
      }
    }(), o))
  }else {
    return new cljs.core.PersistentQueue(this__4478.meta, this__4478.count + 1, cljs.core.conj.call(null, this__4478.front, o), cljs.core.PersistentVector.fromArray([]))
  }
};
cljs.core.PersistentQueue.prototype.toString = function() {
  var this__4480 = this;
  var this$__4481 = this;
  return cljs.core.pr_str.call(null, this$__4481)
};
cljs.core.PersistentQueue.prototype.cljs$core$ISeqable$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__4482 = this;
  var rear__4483 = cljs.core.seq.call(null, this__4482.rear);
  if(cljs.core.truth_(function() {
    var or__3548__auto____4484 = this__4482.front;
    if(cljs.core.truth_(or__3548__auto____4484)) {
      return or__3548__auto____4484
    }else {
      return rear__4483
    }
  }())) {
    return new cljs.core.PersistentQueueSeq(null, this__4482.front, cljs.core.seq.call(null, rear__4483))
  }else {
    return cljs.core.List.EMPTY
  }
};
cljs.core.PersistentQueue.prototype.cljs$core$ICounted$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__4485 = this;
  return this__4485.count
};
cljs.core.PersistentQueue.prototype.cljs$core$IStack$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$IStack$_peek$arity$1 = function(coll) {
  var this__4486 = this;
  return cljs.core._first.call(null, this__4486.front)
};
cljs.core.PersistentQueue.prototype.cljs$core$IStack$_pop$arity$1 = function(coll) {
  var this__4487 = this;
  if(cljs.core.truth_(this__4487.front)) {
    var temp__3695__auto____4488 = cljs.core.next.call(null, this__4487.front);
    if(cljs.core.truth_(temp__3695__auto____4488)) {
      var f1__4489 = temp__3695__auto____4488;
      return new cljs.core.PersistentQueue(this__4487.meta, this__4487.count - 1, f1__4489, this__4487.rear)
    }else {
      return new cljs.core.PersistentQueue(this__4487.meta, this__4487.count - 1, cljs.core.seq.call(null, this__4487.rear), cljs.core.PersistentVector.fromArray([]))
    }
  }else {
    return coll
  }
};
cljs.core.PersistentQueue.prototype.cljs$core$ISeq$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__4490 = this;
  return cljs.core.first.call(null, this__4490.front)
};
cljs.core.PersistentQueue.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__4491 = this;
  return cljs.core.rest.call(null, cljs.core.seq.call(null, coll))
};
cljs.core.PersistentQueue.prototype.cljs$core$IEquiv$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__4492 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.PersistentQueue.prototype.cljs$core$IWithMeta$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__4493 = this;
  return new cljs.core.PersistentQueue(meta, this__4493.count, this__4493.front, this__4493.rear)
};
cljs.core.PersistentQueue.prototype.cljs$core$IMeta$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__4494 = this;
  return this__4494.meta
};
cljs.core.PersistentQueue.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__4495 = this;
  return cljs.core.PersistentQueue.EMPTY
};
cljs.core.PersistentQueue;
cljs.core.PersistentQueue.EMPTY = new cljs.core.PersistentQueue(null, 0, null, cljs.core.PersistentVector.fromArray([]));
cljs.core.NeverEquiv = function() {
};
cljs.core.NeverEquiv.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.NeverEquiv")
};
cljs.core.NeverEquiv.prototype.cljs$core$IEquiv$ = true;
cljs.core.NeverEquiv.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(o, other) {
  var this__4496 = this;
  return false
};
cljs.core.NeverEquiv;
cljs.core.never_equiv = new cljs.core.NeverEquiv;
cljs.core.equiv_map = function equiv_map(x, y) {
  return cljs.core.boolean$.call(null, cljs.core.map_QMARK_.call(null, y) ? cljs.core._EQ_.call(null, cljs.core.count.call(null, x), cljs.core.count.call(null, y)) ? cljs.core.every_QMARK_.call(null, cljs.core.identity, cljs.core.map.call(null, function(xkv) {
    return cljs.core._EQ_.call(null, cljs.core.get.call(null, y, cljs.core.first.call(null, xkv), cljs.core.never_equiv), cljs.core.second.call(null, xkv))
  }, x)) : null : null)
};
cljs.core.scan_array = function scan_array(incr, k, array) {
  var len__4497 = array.length;
  var i__4498 = 0;
  while(true) {
    if(i__4498 < len__4497) {
      if(cljs.core._EQ_.call(null, k, array[i__4498])) {
        return i__4498
      }else {
        var G__4499 = i__4498 + incr;
        i__4498 = G__4499;
        continue
      }
    }else {
      return null
    }
    break
  }
};
cljs.core.obj_map_contains_key_QMARK_ = function() {
  var obj_map_contains_key_QMARK_ = null;
  var obj_map_contains_key_QMARK___2 = function(k, strobj) {
    return obj_map_contains_key_QMARK_.call(null, k, strobj, true, false)
  };
  var obj_map_contains_key_QMARK___4 = function(k, strobj, true_val, false_val) {
    if(cljs.core.truth_(function() {
      var and__3546__auto____4500 = goog.isString.call(null, k);
      if(cljs.core.truth_(and__3546__auto____4500)) {
        return strobj.hasOwnProperty(k)
      }else {
        return and__3546__auto____4500
      }
    }())) {
      return true_val
    }else {
      return false_val
    }
  };
  obj_map_contains_key_QMARK_ = function(k, strobj, true_val, false_val) {
    switch(arguments.length) {
      case 2:
        return obj_map_contains_key_QMARK___2.call(this, k, strobj);
      case 4:
        return obj_map_contains_key_QMARK___4.call(this, k, strobj, true_val, false_val)
    }
    throw"Invalid arity: " + arguments.length;
  };
  obj_map_contains_key_QMARK_.cljs$lang$arity$2 = obj_map_contains_key_QMARK___2;
  obj_map_contains_key_QMARK_.cljs$lang$arity$4 = obj_map_contains_key_QMARK___4;
  return obj_map_contains_key_QMARK_
}();
cljs.core.obj_map_compare_keys = function obj_map_compare_keys(a, b) {
  var a__4502 = cljs.core.hash.call(null, a);
  var b__4503 = cljs.core.hash.call(null, b);
  if(a__4502 < b__4503) {
    return-1
  }else {
    if(a__4502 > b__4503) {
      return 1
    }else {
      if("\ufdd0'else") {
        return 0
      }else {
        return null
      }
    }
  }
};
cljs.core.ObjMap = function(meta, keys, strobj) {
  this.meta = meta;
  this.keys = keys;
  this.strobj = strobj
};
cljs.core.ObjMap.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.ObjMap")
};
cljs.core.ObjMap.prototype.cljs$core$IHash$ = true;
cljs.core.ObjMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__4504 = this;
  return cljs.core.hash_imap.call(null, coll)
};
cljs.core.ObjMap.prototype.cljs$core$ILookup$ = true;
cljs.core.ObjMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__4505 = this;
  return cljs.core._lookup.call(null, coll, k, null)
};
cljs.core.ObjMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__4506 = this;
  return cljs.core.obj_map_contains_key_QMARK_.call(null, k, this__4506.strobj, this__4506.strobj[k], not_found)
};
cljs.core.ObjMap.prototype.cljs$core$IAssociative$ = true;
cljs.core.ObjMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__4507 = this;
  if(cljs.core.truth_(goog.isString.call(null, k))) {
    var new_strobj__4508 = goog.object.clone.call(null, this__4507.strobj);
    var overwrite_QMARK___4509 = new_strobj__4508.hasOwnProperty(k);
    new_strobj__4508[k] = v;
    if(cljs.core.truth_(overwrite_QMARK___4509)) {
      return new cljs.core.ObjMap(this__4507.meta, this__4507.keys, new_strobj__4508)
    }else {
      var new_keys__4510 = cljs.core.aclone.call(null, this__4507.keys);
      new_keys__4510.push(k);
      return new cljs.core.ObjMap(this__4507.meta, new_keys__4510, new_strobj__4508)
    }
  }else {
    return cljs.core.with_meta.call(null, cljs.core.into.call(null, cljs.core.hash_map.call(null, k, v), cljs.core.seq.call(null, coll)), this__4507.meta)
  }
};
cljs.core.ObjMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var this__4511 = this;
  return cljs.core.obj_map_contains_key_QMARK_.call(null, k, this__4511.strobj)
};
cljs.core.ObjMap.prototype.cljs$core$IFn$ = true;
cljs.core.ObjMap.prototype.call = function() {
  var G__4533 = null;
  var G__4533__2 = function(tsym4512, k) {
    var this__4514 = this;
    var tsym4512__4515 = this;
    var coll__4516 = tsym4512__4515;
    return cljs.core._lookup.call(null, coll__4516, k)
  };
  var G__4533__3 = function(tsym4513, k, not_found) {
    var this__4517 = this;
    var tsym4513__4518 = this;
    var coll__4519 = tsym4513__4518;
    return cljs.core._lookup.call(null, coll__4519, k, not_found)
  };
  G__4533 = function(tsym4513, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4533__2.call(this, tsym4513, k);
      case 3:
        return G__4533__3.call(this, tsym4513, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4533
}();
cljs.core.ObjMap.prototype.cljs$core$ICollection$ = true;
cljs.core.ObjMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var this__4520 = this;
  if(cljs.core.vector_QMARK_.call(null, entry)) {
    return cljs.core._assoc.call(null, coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.ObjMap.prototype.toString = function() {
  var this__4521 = this;
  var this$__4522 = this;
  return cljs.core.pr_str.call(null, this$__4522)
};
cljs.core.ObjMap.prototype.cljs$core$ISeqable$ = true;
cljs.core.ObjMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__4523 = this;
  if(this__4523.keys.length > 0) {
    return cljs.core.map.call(null, function(p1__4501_SHARP_) {
      return cljs.core.vector.call(null, p1__4501_SHARP_, this__4523.strobj[p1__4501_SHARP_])
    }, this__4523.keys.sort(cljs.core.obj_map_compare_keys))
  }else {
    return null
  }
};
cljs.core.ObjMap.prototype.cljs$core$ICounted$ = true;
cljs.core.ObjMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__4524 = this;
  return this__4524.keys.length
};
cljs.core.ObjMap.prototype.cljs$core$IEquiv$ = true;
cljs.core.ObjMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__4525 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.ObjMap.prototype.cljs$core$IWithMeta$ = true;
cljs.core.ObjMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__4526 = this;
  return new cljs.core.ObjMap(meta, this__4526.keys, this__4526.strobj)
};
cljs.core.ObjMap.prototype.cljs$core$IMeta$ = true;
cljs.core.ObjMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__4527 = this;
  return this__4527.meta
};
cljs.core.ObjMap.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.ObjMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__4528 = this;
  return cljs.core.with_meta.call(null, cljs.core.ObjMap.EMPTY, this__4528.meta)
};
cljs.core.ObjMap.prototype.cljs$core$IMap$ = true;
cljs.core.ObjMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var this__4529 = this;
  if(cljs.core.truth_(function() {
    var and__3546__auto____4530 = goog.isString.call(null, k);
    if(cljs.core.truth_(and__3546__auto____4530)) {
      return this__4529.strobj.hasOwnProperty(k)
    }else {
      return and__3546__auto____4530
    }
  }())) {
    var new_keys__4531 = cljs.core.aclone.call(null, this__4529.keys);
    var new_strobj__4532 = goog.object.clone.call(null, this__4529.strobj);
    new_keys__4531.splice(cljs.core.scan_array.call(null, 1, k, new_keys__4531), 1);
    cljs.core.js_delete.call(null, new_strobj__4532, k);
    return new cljs.core.ObjMap(this__4529.meta, new_keys__4531, new_strobj__4532)
  }else {
    return coll
  }
};
cljs.core.ObjMap;
cljs.core.ObjMap.EMPTY = new cljs.core.ObjMap(null, [], {});
cljs.core.ObjMap.fromObject = function(ks, obj) {
  return new cljs.core.ObjMap(null, ks, obj)
};
cljs.core.HashMap = function(meta, count, hashobj) {
  this.meta = meta;
  this.count = count;
  this.hashobj = hashobj
};
cljs.core.HashMap.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.HashMap")
};
cljs.core.HashMap.prototype.cljs$core$IHash$ = true;
cljs.core.HashMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__4535 = this;
  return cljs.core.hash_imap.call(null, coll)
};
cljs.core.HashMap.prototype.cljs$core$ILookup$ = true;
cljs.core.HashMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__4536 = this;
  return cljs.core._lookup.call(null, coll, k, null)
};
cljs.core.HashMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__4537 = this;
  var bucket__4538 = this__4537.hashobj[cljs.core.hash.call(null, k)];
  var i__4539 = cljs.core.truth_(bucket__4538) ? cljs.core.scan_array.call(null, 2, k, bucket__4538) : null;
  if(cljs.core.truth_(i__4539)) {
    return bucket__4538[i__4539 + 1]
  }else {
    return not_found
  }
};
cljs.core.HashMap.prototype.cljs$core$IAssociative$ = true;
cljs.core.HashMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__4540 = this;
  var h__4541 = cljs.core.hash.call(null, k);
  var bucket__4542 = this__4540.hashobj[h__4541];
  if(cljs.core.truth_(bucket__4542)) {
    var new_bucket__4543 = cljs.core.aclone.call(null, bucket__4542);
    var new_hashobj__4544 = goog.object.clone.call(null, this__4540.hashobj);
    new_hashobj__4544[h__4541] = new_bucket__4543;
    var temp__3695__auto____4545 = cljs.core.scan_array.call(null, 2, k, new_bucket__4543);
    if(cljs.core.truth_(temp__3695__auto____4545)) {
      var i__4546 = temp__3695__auto____4545;
      new_bucket__4543[i__4546 + 1] = v;
      return new cljs.core.HashMap(this__4540.meta, this__4540.count, new_hashobj__4544)
    }else {
      new_bucket__4543.push(k, v);
      return new cljs.core.HashMap(this__4540.meta, this__4540.count + 1, new_hashobj__4544)
    }
  }else {
    var new_hashobj__4547 = goog.object.clone.call(null, this__4540.hashobj);
    new_hashobj__4547[h__4541] = [k, v];
    return new cljs.core.HashMap(this__4540.meta, this__4540.count + 1, new_hashobj__4547)
  }
};
cljs.core.HashMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var this__4548 = this;
  var bucket__4549 = this__4548.hashobj[cljs.core.hash.call(null, k)];
  var i__4550 = cljs.core.truth_(bucket__4549) ? cljs.core.scan_array.call(null, 2, k, bucket__4549) : null;
  if(cljs.core.truth_(i__4550)) {
    return true
  }else {
    return false
  }
};
cljs.core.HashMap.prototype.cljs$core$IFn$ = true;
cljs.core.HashMap.prototype.call = function() {
  var G__4575 = null;
  var G__4575__2 = function(tsym4551, k) {
    var this__4553 = this;
    var tsym4551__4554 = this;
    var coll__4555 = tsym4551__4554;
    return cljs.core._lookup.call(null, coll__4555, k)
  };
  var G__4575__3 = function(tsym4552, k, not_found) {
    var this__4556 = this;
    var tsym4552__4557 = this;
    var coll__4558 = tsym4552__4557;
    return cljs.core._lookup.call(null, coll__4558, k, not_found)
  };
  G__4575 = function(tsym4552, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4575__2.call(this, tsym4552, k);
      case 3:
        return G__4575__3.call(this, tsym4552, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4575
}();
cljs.core.HashMap.prototype.cljs$core$ICollection$ = true;
cljs.core.HashMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var this__4559 = this;
  if(cljs.core.vector_QMARK_.call(null, entry)) {
    return cljs.core._assoc.call(null, coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.HashMap.prototype.toString = function() {
  var this__4560 = this;
  var this$__4561 = this;
  return cljs.core.pr_str.call(null, this$__4561)
};
cljs.core.HashMap.prototype.cljs$core$ISeqable$ = true;
cljs.core.HashMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__4562 = this;
  if(this__4562.count > 0) {
    var hashes__4563 = cljs.core.js_keys.call(null, this__4562.hashobj).sort();
    return cljs.core.mapcat.call(null, function(p1__4534_SHARP_) {
      return cljs.core.map.call(null, cljs.core.vec, cljs.core.partition.call(null, 2, this__4562.hashobj[p1__4534_SHARP_]))
    }, hashes__4563)
  }else {
    return null
  }
};
cljs.core.HashMap.prototype.cljs$core$ICounted$ = true;
cljs.core.HashMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__4564 = this;
  return this__4564.count
};
cljs.core.HashMap.prototype.cljs$core$IEquiv$ = true;
cljs.core.HashMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__4565 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.HashMap.prototype.cljs$core$IWithMeta$ = true;
cljs.core.HashMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__4566 = this;
  return new cljs.core.HashMap(meta, this__4566.count, this__4566.hashobj)
};
cljs.core.HashMap.prototype.cljs$core$IMeta$ = true;
cljs.core.HashMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__4567 = this;
  return this__4567.meta
};
cljs.core.HashMap.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.HashMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__4568 = this;
  return cljs.core.with_meta.call(null, cljs.core.HashMap.EMPTY, this__4568.meta)
};
cljs.core.HashMap.prototype.cljs$core$IMap$ = true;
cljs.core.HashMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var this__4569 = this;
  var h__4570 = cljs.core.hash.call(null, k);
  var bucket__4571 = this__4569.hashobj[h__4570];
  var i__4572 = cljs.core.truth_(bucket__4571) ? cljs.core.scan_array.call(null, 2, k, bucket__4571) : null;
  if(cljs.core.not.call(null, i__4572)) {
    return coll
  }else {
    var new_hashobj__4573 = goog.object.clone.call(null, this__4569.hashobj);
    if(3 > bucket__4571.length) {
      cljs.core.js_delete.call(null, new_hashobj__4573, h__4570)
    }else {
      var new_bucket__4574 = cljs.core.aclone.call(null, bucket__4571);
      new_bucket__4574.splice(i__4572, 2);
      new_hashobj__4573[h__4570] = new_bucket__4574
    }
    return new cljs.core.HashMap(this__4569.meta, this__4569.count - 1, new_hashobj__4573)
  }
};
cljs.core.HashMap;
cljs.core.HashMap.EMPTY = new cljs.core.HashMap(null, 0, {});
cljs.core.HashMap.fromArrays = function(ks, vs) {
  var len__4576 = ks.length;
  var i__4577 = 0;
  var out__4578 = cljs.core.HashMap.EMPTY;
  while(true) {
    if(i__4577 < len__4576) {
      var G__4579 = i__4577 + 1;
      var G__4580 = cljs.core.assoc.call(null, out__4578, ks[i__4577], vs[i__4577]);
      i__4577 = G__4579;
      out__4578 = G__4580;
      continue
    }else {
      return out__4578
    }
    break
  }
};
cljs.core.transient$ = function transient$(coll) {
  return cljs.core._as_transient.call(null, coll)
};
cljs.core.persistent_BANG_ = function persistent_BANG_(tcoll) {
  return cljs.core._persistent_BANG_.call(null, tcoll)
};
cljs.core.conj_BANG_ = function conj_BANG_(tcoll, val) {
  return cljs.core._conj_BANG_.call(null, tcoll, val)
};
cljs.core.assoc_BANG_ = function assoc_BANG_(tcoll, key, val) {
  return cljs.core._assoc_BANG_.call(null, tcoll, key, val)
};
cljs.core.dissoc_BANG_ = function dissoc_BANG_(tcoll, key) {
  return cljs.core._dissoc_BANG_.call(null, tcoll, key)
};
void 0;
void 0;
void 0;
void 0;
void 0;
void 0;
cljs.core.mask = function mask(hash, shift) {
  return hash >>> shift & 31
};
cljs.core.clone_and_set = function() {
  var clone_and_set = null;
  var clone_and_set__3 = function(arr, i, a) {
    var G__4581__4582 = cljs.core.aclone.call(null, arr);
    G__4581__4582[i] = a;
    return G__4581__4582
  };
  var clone_and_set__5 = function(arr, i, a, j, b) {
    var G__4583__4584 = cljs.core.aclone.call(null, arr);
    G__4583__4584[i] = a;
    G__4583__4584[j] = b;
    return G__4583__4584
  };
  clone_and_set = function(arr, i, a, j, b) {
    switch(arguments.length) {
      case 3:
        return clone_and_set__3.call(this, arr, i, a);
      case 5:
        return clone_and_set__5.call(this, arr, i, a, j, b)
    }
    throw"Invalid arity: " + arguments.length;
  };
  clone_and_set.cljs$lang$arity$3 = clone_and_set__3;
  clone_and_set.cljs$lang$arity$5 = clone_and_set__5;
  return clone_and_set
}();
cljs.core.array_copy = function array_copy(from, i, to, j, len) {
  var i__4585 = i;
  var j__4586 = j;
  var len__4587 = len;
  while(true) {
    if(len__4587 === 0) {
      return to
    }else {
      to[j__4586] = from[i__4585];
      var G__4588 = i__4585 + 1;
      var G__4589 = j__4586 + 1;
      var G__4590 = len__4587 - 1;
      i__4585 = G__4588;
      j__4586 = G__4589;
      len__4587 = G__4590;
      continue
    }
    break
  }
};
cljs.core.array_copy_downward = function array_copy_downward(from, i, to, j, len) {
  var i__4591 = i + (len - 1);
  var j__4592 = j + (len - 1);
  var len__4593 = len;
  while(true) {
    if(len__4593 === 0) {
      return to
    }else {
      to[j__4592] = from[i__4591];
      var G__4594 = i__4591 - 1;
      var G__4595 = j__4592 - 1;
      var G__4596 = len__4593 - 1;
      i__4591 = G__4594;
      j__4592 = G__4595;
      len__4593 = G__4596;
      continue
    }
    break
  }
};
cljs.core.remove_pair = function remove_pair(arr, i) {
  var new_arr__4597 = cljs.core.make_array.call(null, arr.length - 2);
  cljs.core.array_copy.call(null, arr, 0, new_arr__4597, 0, 2 * i);
  cljs.core.array_copy.call(null, arr, 2 * (i + 1), new_arr__4597, 2 * i, new_arr__4597.length - 2 * i);
  return new_arr__4597
};
cljs.core.bitmap_indexed_node_index = function bitmap_indexed_node_index(bitmap, bit) {
  return cljs.core.bit_count.call(null, bitmap & bit - 1)
};
cljs.core.bitpos = function bitpos(hash, shift) {
  return 1 << (hash >>> shift & 31)
};
cljs.core.edit_and_set = function() {
  var edit_and_set = null;
  var edit_and_set__4 = function(inode, edit, i, a) {
    var editable__4598 = inode.ensure_editable(edit);
    editable__4598.arr[i] = a;
    return editable__4598
  };
  var edit_and_set__6 = function(inode, edit, i, a, j, b) {
    var editable__4599 = inode.ensure_editable(edit);
    editable__4599.arr[i] = a;
    editable__4599.arr[j] = b;
    return editable__4599
  };
  edit_and_set = function(inode, edit, i, a, j, b) {
    switch(arguments.length) {
      case 4:
        return edit_and_set__4.call(this, inode, edit, i, a);
      case 6:
        return edit_and_set__6.call(this, inode, edit, i, a, j, b)
    }
    throw"Invalid arity: " + arguments.length;
  };
  edit_and_set.cljs$lang$arity$4 = edit_and_set__4;
  edit_and_set.cljs$lang$arity$6 = edit_and_set__6;
  return edit_and_set
}();
void 0;
cljs.core.BitmapIndexedNode = function(edit, bitmap, arr) {
  this.edit = edit;
  this.bitmap = bitmap;
  this.arr = arr
};
cljs.core.BitmapIndexedNode.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.BitmapIndexedNode")
};
cljs.core.BitmapIndexedNode.prototype.inode_assoc = function(shift, hash, key, val, added_leaf_QMARK_) {
  var this__4600 = this;
  var inode__4601 = this;
  var bit__4602 = 1 << (hash >>> shift & 31);
  var idx__4603 = cljs.core.bitmap_indexed_node_index.call(null, this__4600.bitmap, bit__4602);
  if((this__4600.bitmap & bit__4602) === 0) {
    var n__4604 = cljs.core.bit_count.call(null, this__4600.bitmap);
    if(n__4604 >= 16) {
      var nodes__4605 = cljs.core.make_array.call(null, 32);
      var jdx__4606 = hash >>> shift & 31;
      nodes__4605[jdx__4606] = cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_);
      var i__4607 = 0;
      var j__4608 = 0;
      while(true) {
        if(i__4607 < 32) {
          if((this__4600.bitmap >>> i__4607 & 1) === 0) {
            var G__4666 = i__4607 + 1;
            var G__4667 = j__4608;
            i__4607 = G__4666;
            j__4608 = G__4667;
            continue
          }else {
            nodes__4605[i__4607] = null != this__4600.arr[j__4608] ? cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift + 5, cljs.core.hash.call(null, this__4600.arr[j__4608]), this__4600.arr[j__4608], this__4600.arr[j__4608 + 1], added_leaf_QMARK_) : this__4600.arr[j__4608 + 1];
            var G__4668 = i__4607 + 1;
            var G__4669 = j__4608 + 2;
            i__4607 = G__4668;
            j__4608 = G__4669;
            continue
          }
        }else {
        }
        break
      }
      return new cljs.core.ArrayNode(null, n__4604 + 1, nodes__4605)
    }else {
      var new_arr__4609 = cljs.core.make_array.call(null, 2 * (n__4604 + 1));
      cljs.core.array_copy.call(null, this__4600.arr, 0, new_arr__4609, 0, 2 * idx__4603);
      new_arr__4609[2 * idx__4603] = key;
      added_leaf_QMARK_[0] = true;
      new_arr__4609[2 * idx__4603 + 1] = val;
      cljs.core.array_copy.call(null, this__4600.arr, 2 * idx__4603, new_arr__4609, 2 * (idx__4603 + 1), 2 * (n__4604 - idx__4603));
      return new cljs.core.BitmapIndexedNode(null, this__4600.bitmap | bit__4602, new_arr__4609)
    }
  }else {
    var key_or_nil__4610 = this__4600.arr[2 * idx__4603];
    var val_or_node__4611 = this__4600.arr[2 * idx__4603 + 1];
    if(null == key_or_nil__4610) {
      var n__4612 = val_or_node__4611.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_);
      if(n__4612 === val_or_node__4611) {
        return inode__4601
      }else {
        return new cljs.core.BitmapIndexedNode(null, this__4600.bitmap, cljs.core.clone_and_set.call(null, this__4600.arr, 2 * idx__4603 + 1, n__4612))
      }
    }else {
      if(cljs.core._EQ_.call(null, key, key_or_nil__4610)) {
        if(val === val_or_node__4611) {
          return inode__4601
        }else {
          return new cljs.core.BitmapIndexedNode(null, this__4600.bitmap, cljs.core.clone_and_set.call(null, this__4600.arr, 2 * idx__4603 + 1, val))
        }
      }else {
        if("\ufdd0'else") {
          added_leaf_QMARK_[0] = true;
          return new cljs.core.BitmapIndexedNode(null, this__4600.bitmap, cljs.core.clone_and_set.call(null, this__4600.arr, 2 * idx__4603, null, 2 * idx__4603 + 1, cljs.core.create_node.call(null, shift + 5, key_or_nil__4610, val_or_node__4611, hash, key, val)))
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_without = function(shift, hash, key) {
  var this__4613 = this;
  var inode__4614 = this;
  var bit__4615 = 1 << (hash >>> shift & 31);
  if((this__4613.bitmap & bit__4615) === 0) {
    return inode__4614
  }else {
    var idx__4616 = cljs.core.bitmap_indexed_node_index.call(null, this__4613.bitmap, bit__4615);
    var key_or_nil__4617 = this__4613.arr[2 * idx__4616];
    var val_or_node__4618 = this__4613.arr[2 * idx__4616 + 1];
    if(null == key_or_nil__4617) {
      var n__4619 = val_or_node__4618.inode_without(shift + 5, hash, key);
      if(n__4619 === val_or_node__4618) {
        return inode__4614
      }else {
        if(null != n__4619) {
          return new cljs.core.BitmapIndexedNode(null, this__4613.bitmap, cljs.core.clone_and_set.call(null, this__4613.arr, 2 * idx__4616 + 1, n__4619))
        }else {
          if(this__4613.bitmap === bit__4615) {
            return null
          }else {
            if("\ufdd0'else") {
              return new cljs.core.BitmapIndexedNode(null, this__4613.bitmap ^ bit__4615, cljs.core.remove_pair.call(null, this__4613.arr, idx__4616))
            }else {
              return null
            }
          }
        }
      }
    }else {
      if(cljs.core._EQ_.call(null, key, key_or_nil__4617)) {
        return new cljs.core.BitmapIndexedNode(null, this__4613.bitmap ^ bit__4615, cljs.core.remove_pair.call(null, this__4613.arr, idx__4616))
      }else {
        if("\ufdd0'else") {
          return inode__4614
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_find = function() {
  var G__4670 = null;
  var G__4670__3 = function(shift, hash, key) {
    var this__4620 = this;
    var inode__4621 = this;
    var bit__4622 = 1 << (hash >>> shift & 31);
    if((this__4620.bitmap & bit__4622) === 0) {
      return null
    }else {
      var idx__4623 = cljs.core.bitmap_indexed_node_index.call(null, this__4620.bitmap, bit__4622);
      var key_or_nil__4624 = this__4620.arr[2 * idx__4623];
      var val_or_node__4625 = this__4620.arr[2 * idx__4623 + 1];
      if(null == key_or_nil__4624) {
        return val_or_node__4625.inode_find(shift + 5, hash, key)
      }else {
        if(cljs.core._EQ_.call(null, key, key_or_nil__4624)) {
          return cljs.core.PersistentVector.fromArray([key_or_nil__4624, val_or_node__4625])
        }else {
          if("\ufdd0'else") {
            return null
          }else {
            return null
          }
        }
      }
    }
  };
  var G__4670__4 = function(shift, hash, key, not_found) {
    var this__4626 = this;
    var inode__4627 = this;
    var bit__4628 = 1 << (hash >>> shift & 31);
    if((this__4626.bitmap & bit__4628) === 0) {
      return not_found
    }else {
      var idx__4629 = cljs.core.bitmap_indexed_node_index.call(null, this__4626.bitmap, bit__4628);
      var key_or_nil__4630 = this__4626.arr[2 * idx__4629];
      var val_or_node__4631 = this__4626.arr[2 * idx__4629 + 1];
      if(null == key_or_nil__4630) {
        return val_or_node__4631.inode_find(shift + 5, hash, key, not_found)
      }else {
        if(cljs.core._EQ_.call(null, key, key_or_nil__4630)) {
          return cljs.core.PersistentVector.fromArray([key_or_nil__4630, val_or_node__4631])
        }else {
          if("\ufdd0'else") {
            return not_found
          }else {
            return null
          }
        }
      }
    }
  };
  G__4670 = function(shift, hash, key, not_found) {
    switch(arguments.length) {
      case 3:
        return G__4670__3.call(this, shift, hash, key);
      case 4:
        return G__4670__4.call(this, shift, hash, key, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4670
}();
cljs.core.BitmapIndexedNode.prototype.inode_seq = function() {
  var this__4632 = this;
  var inode__4633 = this;
  return cljs.core.create_inode_seq.call(null, this__4632.arr)
};
cljs.core.BitmapIndexedNode.prototype.ensure_editable = function(e) {
  var this__4634 = this;
  var inode__4635 = this;
  if(e === this__4634.edit) {
    return inode__4635
  }else {
    var n__4636 = cljs.core.bit_count.call(null, this__4634.bitmap);
    var new_arr__4637 = cljs.core.make_array.call(null, n__4636 < 0 ? 4 : 2 * (n__4636 + 1));
    cljs.core.array_copy.call(null, this__4634.arr, 0, new_arr__4637, 0, 2 * n__4636);
    return new cljs.core.BitmapIndexedNode(e, this__4634.bitmap, new_arr__4637)
  }
};
cljs.core.BitmapIndexedNode.prototype.edit_and_remove_pair = function(e, bit, i) {
  var this__4638 = this;
  var inode__4639 = this;
  if(this__4638.bitmap === bit) {
    return null
  }else {
    var editable__4640 = inode__4639.ensure_editable(e);
    var earr__4641 = editable__4640.arr;
    var len__4642 = earr__4641.length;
    editable__4640.bitmap = bit ^ editable__4640.bitmap;
    cljs.core.array_copy.call(null, earr__4641, 2 * (i + 1), earr__4641, 2 * i, len__4642 - 2 * (i + 1));
    earr__4641[len__4642 - 2] = null;
    earr__4641[len__4642 - 1] = null;
    return editable__4640
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_assoc_BANG_ = function(edit, shift, hash, key, val, added_leaf_QMARK_) {
  var this__4643 = this;
  var inode__4644 = this;
  var bit__4645 = 1 << (hash >>> shift & 31);
  var idx__4646 = cljs.core.bitmap_indexed_node_index.call(null, this__4643.bitmap, bit__4645);
  if((this__4643.bitmap & bit__4645) === 0) {
    var n__4647 = cljs.core.bit_count.call(null, this__4643.bitmap);
    if(2 * n__4647 < this__4643.arr.length) {
      var editable__4648 = inode__4644.ensure_editable(edit);
      var earr__4649 = editable__4648.arr;
      added_leaf_QMARK_[0] = true;
      cljs.core.array_copy_downward.call(null, earr__4649, 2 * idx__4646, earr__4649, 2 * (idx__4646 + 1), 2 * (n__4647 - idx__4646));
      earr__4649[2 * idx__4646] = key;
      earr__4649[2 * idx__4646 + 1] = val;
      editable__4648.bitmap = editable__4648.bitmap | bit__4645;
      return editable__4648
    }else {
      if(n__4647 >= 16) {
        var nodes__4650 = cljs.core.make_array.call(null, 32);
        var jdx__4651 = hash >>> shift & 31;
        nodes__4650[jdx__4651] = cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit, shift + 5, hash, key, val, added_leaf_QMARK_);
        var i__4652 = 0;
        var j__4653 = 0;
        while(true) {
          if(i__4652 < 32) {
            if((this__4643.bitmap >>> i__4652 & 1) === 0) {
              var G__4671 = i__4652 + 1;
              var G__4672 = j__4653;
              i__4652 = G__4671;
              j__4653 = G__4672;
              continue
            }else {
              nodes__4650[i__4652] = null != this__4643.arr[j__4653] ? cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit, shift + 5, cljs.core.hash.call(null, this__4643.arr[j__4653]), this__4643.arr[j__4653], this__4643.arr[j__4653 + 1], added_leaf_QMARK_) : this__4643.arr[j__4653 + 1];
              var G__4673 = i__4652 + 1;
              var G__4674 = j__4653 + 2;
              i__4652 = G__4673;
              j__4653 = G__4674;
              continue
            }
          }else {
          }
          break
        }
        return new cljs.core.ArrayNode(edit, n__4647 + 1, nodes__4650)
      }else {
        if("\ufdd0'else") {
          var new_arr__4654 = cljs.core.make_array.call(null, 2 * (n__4647 + 4));
          cljs.core.array_copy.call(null, this__4643.arr, 0, new_arr__4654, 0, 2 * idx__4646);
          new_arr__4654[2 * idx__4646] = key;
          added_leaf_QMARK_[0] = true;
          new_arr__4654[2 * idx__4646 + 1] = val;
          cljs.core.array_copy.call(null, this__4643.arr, 2 * idx__4646, new_arr__4654, 2 * (idx__4646 + 1), 2 * (n__4647 - idx__4646));
          var editable__4655 = inode__4644.ensure_editable(edit);
          editable__4655.arr = new_arr__4654;
          editable__4655.bitmap = editable__4655.bitmap | bit__4645;
          return editable__4655
        }else {
          return null
        }
      }
    }
  }else {
    var key_or_nil__4656 = this__4643.arr[2 * idx__4646];
    var val_or_node__4657 = this__4643.arr[2 * idx__4646 + 1];
    if(null == key_or_nil__4656) {
      var n__4658 = val_or_node__4657.inode_assoc_BANG_(edit, shift + 5, hash, key, val, added_leaf_QMARK_);
      if(n__4658 === val_or_node__4657) {
        return inode__4644
      }else {
        return cljs.core.edit_and_set.call(null, inode__4644, edit, 2 * idx__4646 + 1, n__4658)
      }
    }else {
      if(cljs.core._EQ_.call(null, key, key_or_nil__4656)) {
        if(val === val_or_node__4657) {
          return inode__4644
        }else {
          return cljs.core.edit_and_set.call(null, inode__4644, edit, 2 * idx__4646 + 1, val)
        }
      }else {
        if("\ufdd0'else") {
          added_leaf_QMARK_[0] = true;
          return cljs.core.edit_and_set.call(null, inode__4644, edit, 2 * idx__4646, null, 2 * idx__4646 + 1, cljs.core.create_node.call(null, edit, shift + 5, key_or_nil__4656, val_or_node__4657, hash, key, val))
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode.prototype.inode_without_BANG_ = function(edit, shift, hash, key, removed_leaf_QMARK_) {
  var this__4659 = this;
  var inode__4660 = this;
  var bit__4661 = 1 << (hash >>> shift & 31);
  if((this__4659.bitmap & bit__4661) === 0) {
    return inode__4660
  }else {
    var idx__4662 = cljs.core.bitmap_indexed_node_index.call(null, this__4659.bitmap, bit__4661);
    var key_or_nil__4663 = this__4659.arr[2 * idx__4662];
    var val_or_node__4664 = this__4659.arr[2 * idx__4662 + 1];
    if(null == key_or_nil__4663) {
      var n__4665 = val_or_node__4664.inode_without_BANG_(edit, shift + 5, hash, key, removed_leaf_QMARK_);
      if(n__4665 === val_or_node__4664) {
        return inode__4660
      }else {
        if(null != n__4665) {
          return cljs.core.edit_and_set.call(null, inode__4660, edit, 2 * idx__4662 + 1, n__4665)
        }else {
          if(this__4659.bitmap === bit__4661) {
            return null
          }else {
            if("\ufdd0'else") {
              return inode__4660.edit_and_remove_pair(edit, bit__4661, idx__4662)
            }else {
              return null
            }
          }
        }
      }
    }else {
      if(cljs.core._EQ_.call(null, key, key_or_nil__4663)) {
        removed_leaf_QMARK_[0] = true;
        return inode__4660.edit_and_remove_pair(edit, bit__4661, idx__4662)
      }else {
        if("\ufdd0'else") {
          return inode__4660
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BitmapIndexedNode;
cljs.core.BitmapIndexedNode.EMPTY = new cljs.core.BitmapIndexedNode(null, 0, cljs.core.make_array.call(null, 0));
cljs.core.pack_array_node = function pack_array_node(array_node, edit, idx) {
  var arr__4675 = array_node.arr;
  var len__4676 = 2 * (array_node.cnt - 1);
  var new_arr__4677 = cljs.core.make_array.call(null, len__4676);
  var i__4678 = 0;
  var j__4679 = 1;
  var bitmap__4680 = 0;
  while(true) {
    if(i__4678 < len__4676) {
      if(function() {
        var and__3546__auto____4681 = i__4678 != idx;
        if(and__3546__auto____4681) {
          return null != arr__4675[i__4678]
        }else {
          return and__3546__auto____4681
        }
      }()) {
        new_arr__4677[j__4679] = arr__4675[i__4678];
        var G__4682 = i__4678 + 1;
        var G__4683 = j__4679 + 2;
        var G__4684 = bitmap__4680 | 1 << i__4678;
        i__4678 = G__4682;
        j__4679 = G__4683;
        bitmap__4680 = G__4684;
        continue
      }else {
        var G__4685 = i__4678 + 1;
        var G__4686 = j__4679;
        var G__4687 = bitmap__4680;
        i__4678 = G__4685;
        j__4679 = G__4686;
        bitmap__4680 = G__4687;
        continue
      }
    }else {
      return new cljs.core.BitmapIndexedNode(edit, bitmap__4680, new_arr__4677)
    }
    break
  }
};
cljs.core.ArrayNode = function(edit, cnt, arr) {
  this.edit = edit;
  this.cnt = cnt;
  this.arr = arr
};
cljs.core.ArrayNode.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.ArrayNode")
};
cljs.core.ArrayNode.prototype.inode_assoc = function(shift, hash, key, val, added_leaf_QMARK_) {
  var this__4688 = this;
  var inode__4689 = this;
  var idx__4690 = hash >>> shift & 31;
  var node__4691 = this__4688.arr[idx__4690];
  if(null == node__4691) {
    return new cljs.core.ArrayNode(null, this__4688.cnt + 1, cljs.core.clone_and_set.call(null, this__4688.arr, idx__4690, cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_)))
  }else {
    var n__4692 = node__4691.inode_assoc(shift + 5, hash, key, val, added_leaf_QMARK_);
    if(n__4692 === node__4691) {
      return inode__4689
    }else {
      return new cljs.core.ArrayNode(null, this__4688.cnt, cljs.core.clone_and_set.call(null, this__4688.arr, idx__4690, n__4692))
    }
  }
};
cljs.core.ArrayNode.prototype.inode_without = function(shift, hash, key) {
  var this__4693 = this;
  var inode__4694 = this;
  var idx__4695 = hash >>> shift & 31;
  var node__4696 = this__4693.arr[idx__4695];
  if(null != node__4696) {
    var n__4697 = node__4696.inode_without(shift + 5, hash, key);
    if(n__4697 === node__4696) {
      return inode__4694
    }else {
      if(n__4697 === null) {
        if(this__4693.cnt <= 8) {
          return cljs.core.pack_array_node.call(null, inode__4694, null, idx__4695)
        }else {
          return new cljs.core.ArrayNode(null, this__4693.cnt - 1, cljs.core.clone_and_set.call(null, this__4693.arr, idx__4695, n__4697))
        }
      }else {
        if("\ufdd0'else") {
          return new cljs.core.ArrayNode(null, this__4693.cnt, cljs.core.clone_and_set.call(null, this__4693.arr, idx__4695, n__4697))
        }else {
          return null
        }
      }
    }
  }else {
    return inode__4694
  }
};
cljs.core.ArrayNode.prototype.inode_find = function() {
  var G__4722 = null;
  var G__4722__3 = function(shift, hash, key) {
    var this__4698 = this;
    var inode__4699 = this;
    var idx__4700 = hash >>> shift & 31;
    var node__4701 = this__4698.arr[idx__4700];
    if(null != node__4701) {
      return node__4701.inode_find(shift + 5, hash, key)
    }else {
      return null
    }
  };
  var G__4722__4 = function(shift, hash, key, not_found) {
    var this__4702 = this;
    var inode__4703 = this;
    var idx__4704 = hash >>> shift & 31;
    var node__4705 = this__4702.arr[idx__4704];
    if(null != node__4705) {
      return node__4705.inode_find(shift + 5, hash, key, not_found)
    }else {
      return not_found
    }
  };
  G__4722 = function(shift, hash, key, not_found) {
    switch(arguments.length) {
      case 3:
        return G__4722__3.call(this, shift, hash, key);
      case 4:
        return G__4722__4.call(this, shift, hash, key, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4722
}();
cljs.core.ArrayNode.prototype.inode_seq = function() {
  var this__4706 = this;
  var inode__4707 = this;
  return cljs.core.create_array_node_seq.call(null, this__4706.arr)
};
cljs.core.ArrayNode.prototype.ensure_editable = function(e) {
  var this__4708 = this;
  var inode__4709 = this;
  if(e === this__4708.edit) {
    return inode__4709
  }else {
    return new cljs.core.ArrayNode(e, this__4708.cnt, cljs.core.aclone.call(null, this__4708.arr))
  }
};
cljs.core.ArrayNode.prototype.inode_assoc_BANG_ = function(edit, shift, hash, key, val, added_leaf_QMARK_) {
  var this__4710 = this;
  var inode__4711 = this;
  var idx__4712 = hash >>> shift & 31;
  var node__4713 = this__4710.arr[idx__4712];
  if(null == node__4713) {
    var editable__4714 = cljs.core.edit_and_set.call(null, inode__4711, edit, idx__4712, cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit, shift + 5, hash, key, val, added_leaf_QMARK_));
    editable__4714.cnt = editable__4714.cnt + 1;
    return editable__4714
  }else {
    var n__4715 = node__4713.inode_assoc_BANG_(edit, shift + 5, hash, key, val, added_leaf_QMARK_);
    if(n__4715 === node__4713) {
      return inode__4711
    }else {
      return cljs.core.edit_and_set.call(null, inode__4711, edit, idx__4712, n__4715)
    }
  }
};
cljs.core.ArrayNode.prototype.inode_without_BANG_ = function(edit, shift, hash, key, removed_leaf_QMARK_) {
  var this__4716 = this;
  var inode__4717 = this;
  var idx__4718 = hash >>> shift & 31;
  var node__4719 = this__4716.arr[idx__4718];
  if(null == node__4719) {
    return inode__4717
  }else {
    var n__4720 = node__4719.inode_without_BANG_(edit, shift + 5, hash, key, removed_leaf_QMARK_);
    if(n__4720 === node__4719) {
      return inode__4717
    }else {
      if(null == n__4720) {
        if(this__4716.cnt <= 8) {
          return cljs.core.pack_array_node.call(null, inode__4717, edit, idx__4718)
        }else {
          var editable__4721 = cljs.core.edit_and_set.call(null, inode__4717, edit, idx__4718, n__4720);
          editable__4721.cnt = editable__4721.cnt - 1;
          return editable__4721
        }
      }else {
        if("\ufdd0'else") {
          return cljs.core.edit_and_set.call(null, inode__4717, edit, idx__4718, n__4720)
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.ArrayNode;
cljs.core.hash_collision_node_find_index = function hash_collision_node_find_index(arr, cnt, key) {
  var lim__4723 = 2 * cnt;
  var i__4724 = 0;
  while(true) {
    if(i__4724 < lim__4723) {
      if(cljs.core._EQ_.call(null, key, arr[i__4724])) {
        return i__4724
      }else {
        var G__4725 = i__4724 + 2;
        i__4724 = G__4725;
        continue
      }
    }else {
      return-1
    }
    break
  }
};
cljs.core.HashCollisionNode = function(edit, __hash, cnt, arr) {
  this.edit = edit;
  this.__hash = __hash;
  this.cnt = cnt;
  this.arr = arr
};
cljs.core.HashCollisionNode.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.HashCollisionNode")
};
cljs.core.HashCollisionNode.prototype.inode_assoc = function(shift, hash, key, val, added_leaf_QMARK_) {
  var this__4726 = this;
  var inode__4727 = this;
  if(hash === this__4726.__hash) {
    var idx__4728 = cljs.core.hash_collision_node_find_index.call(null, this__4726.arr, this__4726.cnt, key);
    if(idx__4728 === -1) {
      var len__4729 = this__4726.arr.length;
      var new_arr__4730 = cljs.core.make_array.call(null, len__4729 + 2);
      cljs.core.array_copy.call(null, this__4726.arr, 0, new_arr__4730, 0, len__4729);
      new_arr__4730[len__4729] = key;
      new_arr__4730[len__4729 + 1] = val;
      added_leaf_QMARK_[0] = true;
      return new cljs.core.HashCollisionNode(null, this__4726.__hash, this__4726.cnt + 1, new_arr__4730)
    }else {
      if(cljs.core._EQ_.call(null, this__4726.arr[idx__4728], val)) {
        return inode__4727
      }else {
        return new cljs.core.HashCollisionNode(null, this__4726.__hash, this__4726.cnt, cljs.core.clone_and_set.call(null, this__4726.arr, idx__4728 + 1, val))
      }
    }
  }else {
    return(new cljs.core.BitmapIndexedNode(null, 1 << (this__4726.__hash >>> shift & 31), [null, inode__4727])).inode_assoc(shift, hash, key, val, added_leaf_QMARK_)
  }
};
cljs.core.HashCollisionNode.prototype.inode_without = function(shift, hash, key) {
  var this__4731 = this;
  var inode__4732 = this;
  var idx__4733 = cljs.core.hash_collision_node_find_index.call(null, this__4731.arr, this__4731.cnt, key);
  if(idx__4733 === -1) {
    return inode__4732
  }else {
    if(this__4731.cnt === 1) {
      return null
    }else {
      if("\ufdd0'else") {
        return new cljs.core.HashCollisionNode(null, this__4731.__hash, this__4731.cnt - 1, cljs.core.remove_pair.call(null, this__4731.arr, cljs.core.quot.call(null, idx__4733, 2)))
      }else {
        return null
      }
    }
  }
};
cljs.core.HashCollisionNode.prototype.inode_find = function() {
  var G__4758 = null;
  var G__4758__3 = function(shift, hash, key) {
    var this__4734 = this;
    var inode__4735 = this;
    var idx__4736 = cljs.core.hash_collision_node_find_index.call(null, this__4734.arr, this__4734.cnt, key);
    if(idx__4736 < 0) {
      return null
    }else {
      if(cljs.core._EQ_.call(null, key, this__4734.arr[idx__4736])) {
        return cljs.core.PersistentVector.fromArray([this__4734.arr[idx__4736], this__4734.arr[idx__4736 + 1]])
      }else {
        if("\ufdd0'else") {
          return null
        }else {
          return null
        }
      }
    }
  };
  var G__4758__4 = function(shift, hash, key, not_found) {
    var this__4737 = this;
    var inode__4738 = this;
    var idx__4739 = cljs.core.hash_collision_node_find_index.call(null, this__4737.arr, this__4737.cnt, key);
    if(idx__4739 < 0) {
      return not_found
    }else {
      if(cljs.core._EQ_.call(null, key, this__4737.arr[idx__4739])) {
        return cljs.core.PersistentVector.fromArray([this__4737.arr[idx__4739], this__4737.arr[idx__4739 + 1]])
      }else {
        if("\ufdd0'else") {
          return not_found
        }else {
          return null
        }
      }
    }
  };
  G__4758 = function(shift, hash, key, not_found) {
    switch(arguments.length) {
      case 3:
        return G__4758__3.call(this, shift, hash, key);
      case 4:
        return G__4758__4.call(this, shift, hash, key, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4758
}();
cljs.core.HashCollisionNode.prototype.inode_seq = function() {
  var this__4740 = this;
  var inode__4741 = this;
  return cljs.core.create_inode_seq.call(null, this__4740.arr)
};
cljs.core.HashCollisionNode.prototype.ensure_editable = function() {
  var G__4759 = null;
  var G__4759__1 = function(e) {
    var this__4742 = this;
    var inode__4743 = this;
    if(e === this__4742.edit) {
      return inode__4743
    }else {
      var new_arr__4744 = cljs.core.make_array.call(null, 2 * (this__4742.cnt + 1));
      cljs.core.array_copy.call(null, this__4742.arr, 0, new_arr__4744, 0, 2 * this__4742.cnt);
      return new cljs.core.HashCollisionNode(e, this__4742.__hash, this__4742.cnt, new_arr__4744)
    }
  };
  var G__4759__3 = function(e, count, array) {
    var this__4745 = this;
    var inode__4746 = this;
    if(e === this__4745.edit) {
      this__4745.arr = array;
      this__4745.cnt = count;
      return inode__4746
    }else {
      return new cljs.core.HashCollisionNode(this__4745.edit, this__4745.__hash, count, array)
    }
  };
  G__4759 = function(e, count, array) {
    switch(arguments.length) {
      case 1:
        return G__4759__1.call(this, e);
      case 3:
        return G__4759__3.call(this, e, count, array)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4759
}();
cljs.core.HashCollisionNode.prototype.inode_assoc_BANG_ = function(edit, shift, hash, key, val, added_leaf_QMARK_) {
  var this__4747 = this;
  var inode__4748 = this;
  if(hash === this__4747.__hash) {
    var idx__4749 = cljs.core.hash_collision_node_find_index.call(null, this__4747.arr, this__4747.cnt, key);
    if(idx__4749 === -1) {
      if(this__4747.arr.length > 2 * this__4747.cnt) {
        var editable__4750 = cljs.core.edit_and_set.call(null, inode__4748, edit, 2 * this__4747.cnt, key, 2 * this__4747.cnt + 1, val);
        added_leaf_QMARK_[0] = true;
        editable__4750.cnt = editable__4750.cnt + 1;
        return editable__4750
      }else {
        var len__4751 = this__4747.arr.length;
        var new_arr__4752 = cljs.core.make_array.call(null, len__4751 + 2);
        cljs.core.array_copy.call(null, this__4747.arr, 0, new_arr__4752, 0, len__4751);
        new_arr__4752[len__4751] = key;
        new_arr__4752[len__4751 + 1] = val;
        added_leaf_QMARK_[0] = true;
        return inode__4748.ensure_editable(edit, this__4747.cnt + 1, new_arr__4752)
      }
    }else {
      if(this__4747.arr[idx__4749 + 1] === val) {
        return inode__4748
      }else {
        return cljs.core.edit_and_set.call(null, inode__4748, edit, idx__4749 + 1, val)
      }
    }
  }else {
    return(new cljs.core.BitmapIndexedNode(edit, 1 << (this__4747.__hash >>> shift & 31), [null, inode__4748, null, null])).inode_assoc_BANG_(edit, shift, hash, key, val, added_leaf_QMARK_)
  }
};
cljs.core.HashCollisionNode.prototype.inode_without_BANG_ = function(edit, shift, hash, key, removed_leaf_QMARK_) {
  var this__4753 = this;
  var inode__4754 = this;
  var idx__4755 = cljs.core.hash_collision_node_find_index.call(null, this__4753.arr, this__4753.cnt, key);
  if(idx__4755 === -1) {
    return inode__4754
  }else {
    removed_leaf_QMARK_[0] = true;
    if(this__4753.cnt === 1) {
      return null
    }else {
      var editable__4756 = inode__4754.ensure_editable(edit);
      var earr__4757 = editable__4756.arr;
      earr__4757[idx__4755] = earr__4757[2 * this__4753.cnt - 2];
      earr__4757[idx__4755 + 1] = earr__4757[2 * this__4753.cnt - 1];
      earr__4757[2 * this__4753.cnt - 1] = null;
      earr__4757[2 * this__4753.cnt - 2] = null;
      editable__4756.cnt = editable__4756.cnt - 1;
      return editable__4756
    }
  }
};
cljs.core.HashCollisionNode;
cljs.core.create_node = function() {
  var create_node = null;
  var create_node__6 = function(shift, key1, val1, key2hash, key2, val2) {
    var key1hash__4760 = cljs.core.hash.call(null, key1);
    if(key1hash__4760 === key2hash) {
      return new cljs.core.HashCollisionNode(null, key1hash__4760, 2, [key1, val1, key2, val2])
    }else {
      var added_leaf_QMARK___4761 = [false];
      return cljs.core.BitmapIndexedNode.EMPTY.inode_assoc(shift, key1hash__4760, key1, val1, added_leaf_QMARK___4761).inode_assoc(shift, key2hash, key2, val2, added_leaf_QMARK___4761)
    }
  };
  var create_node__7 = function(edit, shift, key1, val1, key2hash, key2, val2) {
    var key1hash__4762 = cljs.core.hash.call(null, key1);
    if(key1hash__4762 === key2hash) {
      return new cljs.core.HashCollisionNode(null, key1hash__4762, 2, [key1, val1, key2, val2])
    }else {
      var added_leaf_QMARK___4763 = [false];
      return cljs.core.BitmapIndexedNode.EMPTY.inode_assoc_BANG_(edit, shift, key1hash__4762, key1, val1, added_leaf_QMARK___4763).inode_assoc_BANG_(edit, shift, key2hash, key2, val2, added_leaf_QMARK___4763)
    }
  };
  create_node = function(edit, shift, key1, val1, key2hash, key2, val2) {
    switch(arguments.length) {
      case 6:
        return create_node__6.call(this, edit, shift, key1, val1, key2hash, key2);
      case 7:
        return create_node__7.call(this, edit, shift, key1, val1, key2hash, key2, val2)
    }
    throw"Invalid arity: " + arguments.length;
  };
  create_node.cljs$lang$arity$6 = create_node__6;
  create_node.cljs$lang$arity$7 = create_node__7;
  return create_node
}();
cljs.core.NodeSeq = function(meta, nodes, i, s) {
  this.meta = meta;
  this.nodes = nodes;
  this.i = i;
  this.s = s
};
cljs.core.NodeSeq.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.NodeSeq")
};
cljs.core.NodeSeq.prototype.cljs$core$IEquiv$ = true;
cljs.core.NodeSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__4764 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.NodeSeq.prototype.cljs$core$ISeqable$ = true;
cljs.core.NodeSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var this__4765 = this;
  return this$
};
cljs.core.NodeSeq.prototype.cljs$core$ISeq$ = true;
cljs.core.NodeSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__4766 = this;
  if(this__4766.s === null) {
    return cljs.core.PersistentVector.fromArray([this__4766.nodes[this__4766.i], this__4766.nodes[this__4766.i + 1]])
  }else {
    return cljs.core.first.call(null, this__4766.s)
  }
};
cljs.core.NodeSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__4767 = this;
  if(this__4767.s === null) {
    return cljs.core.create_inode_seq.call(null, this__4767.nodes, this__4767.i + 2, null)
  }else {
    return cljs.core.create_inode_seq.call(null, this__4767.nodes, this__4767.i, cljs.core.next.call(null, this__4767.s))
  }
};
cljs.core.NodeSeq.prototype.cljs$core$ISequential$ = true;
cljs.core.NodeSeq.prototype.cljs$core$IWithMeta$ = true;
cljs.core.NodeSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__4768 = this;
  return new cljs.core.NodeSeq(meta, this__4768.nodes, this__4768.i, this__4768.s)
};
cljs.core.NodeSeq.prototype.cljs$core$IMeta$ = true;
cljs.core.NodeSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__4769 = this;
  return this__4769.meta
};
cljs.core.NodeSeq;
cljs.core.create_inode_seq = function() {
  var create_inode_seq = null;
  var create_inode_seq__1 = function(nodes) {
    return create_inode_seq.call(null, nodes, 0, null)
  };
  var create_inode_seq__3 = function(nodes, i, s) {
    if(s === null) {
      var len__4770 = nodes.length;
      var j__4771 = i;
      while(true) {
        if(j__4771 < len__4770) {
          if(null != nodes[j__4771]) {
            return new cljs.core.NodeSeq(null, nodes, j__4771, null)
          }else {
            var temp__3695__auto____4772 = nodes[j__4771 + 1];
            if(cljs.core.truth_(temp__3695__auto____4772)) {
              var node__4773 = temp__3695__auto____4772;
              var temp__3695__auto____4774 = node__4773.inode_seq();
              if(cljs.core.truth_(temp__3695__auto____4774)) {
                var node_seq__4775 = temp__3695__auto____4774;
                return new cljs.core.NodeSeq(null, nodes, j__4771 + 2, node_seq__4775)
              }else {
                var G__4776 = j__4771 + 2;
                j__4771 = G__4776;
                continue
              }
            }else {
              var G__4777 = j__4771 + 2;
              j__4771 = G__4777;
              continue
            }
          }
        }else {
          return null
        }
        break
      }
    }else {
      return new cljs.core.NodeSeq(null, nodes, i, s)
    }
  };
  create_inode_seq = function(nodes, i, s) {
    switch(arguments.length) {
      case 1:
        return create_inode_seq__1.call(this, nodes);
      case 3:
        return create_inode_seq__3.call(this, nodes, i, s)
    }
    throw"Invalid arity: " + arguments.length;
  };
  create_inode_seq.cljs$lang$arity$1 = create_inode_seq__1;
  create_inode_seq.cljs$lang$arity$3 = create_inode_seq__3;
  return create_inode_seq
}();
cljs.core.ArrayNodeSeq = function(meta, nodes, i, s) {
  this.meta = meta;
  this.nodes = nodes;
  this.i = i;
  this.s = s
};
cljs.core.ArrayNodeSeq.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.ArrayNodeSeq")
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IEquiv$ = true;
cljs.core.ArrayNodeSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__4778 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ISeqable$ = true;
cljs.core.ArrayNodeSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var this__4779 = this;
  return this$
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ISeq$ = true;
cljs.core.ArrayNodeSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(coll) {
  var this__4780 = this;
  return cljs.core.first.call(null, this__4780.s)
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(coll) {
  var this__4781 = this;
  return cljs.core.create_array_node_seq.call(null, null, this__4781.nodes, this__4781.i, cljs.core.next.call(null, this__4781.s))
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$ISequential$ = true;
cljs.core.ArrayNodeSeq.prototype.cljs$core$IWithMeta$ = true;
cljs.core.ArrayNodeSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__4782 = this;
  return new cljs.core.ArrayNodeSeq(meta, this__4782.nodes, this__4782.i, this__4782.s)
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IMeta$ = true;
cljs.core.ArrayNodeSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__4783 = this;
  return this__4783.meta
};
cljs.core.ArrayNodeSeq;
cljs.core.create_array_node_seq = function() {
  var create_array_node_seq = null;
  var create_array_node_seq__1 = function(nodes) {
    return create_array_node_seq.call(null, null, nodes, 0, null)
  };
  var create_array_node_seq__4 = function(meta, nodes, i, s) {
    if(s === null) {
      var len__4784 = nodes.length;
      var j__4785 = i;
      while(true) {
        if(j__4785 < len__4784) {
          var temp__3695__auto____4786 = nodes[j__4785];
          if(cljs.core.truth_(temp__3695__auto____4786)) {
            var nj__4787 = temp__3695__auto____4786;
            var temp__3695__auto____4788 = nj__4787.inode_seq();
            if(cljs.core.truth_(temp__3695__auto____4788)) {
              var ns__4789 = temp__3695__auto____4788;
              return new cljs.core.ArrayNodeSeq(meta, nodes, j__4785 + 1, ns__4789)
            }else {
              var G__4790 = j__4785 + 1;
              j__4785 = G__4790;
              continue
            }
          }else {
            var G__4791 = j__4785 + 1;
            j__4785 = G__4791;
            continue
          }
        }else {
          return null
        }
        break
      }
    }else {
      return new cljs.core.ArrayNodeSeq(meta, nodes, i, s)
    }
  };
  create_array_node_seq = function(meta, nodes, i, s) {
    switch(arguments.length) {
      case 1:
        return create_array_node_seq__1.call(this, meta);
      case 4:
        return create_array_node_seq__4.call(this, meta, nodes, i, s)
    }
    throw"Invalid arity: " + arguments.length;
  };
  create_array_node_seq.cljs$lang$arity$1 = create_array_node_seq__1;
  create_array_node_seq.cljs$lang$arity$4 = create_array_node_seq__4;
  return create_array_node_seq
}();
void 0;
cljs.core.PersistentHashMap = function(meta, cnt, root, has_nil_QMARK_, nil_val) {
  this.meta = meta;
  this.cnt = cnt;
  this.root = root;
  this.has_nil_QMARK_ = has_nil_QMARK_;
  this.nil_val = nil_val
};
cljs.core.PersistentHashMap.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.PersistentHashMap")
};
cljs.core.PersistentHashMap.prototype.cljs$core$IEditableCollection$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$IEditableCollection$_as_transient$arity$1 = function(coll) {
  var this__4792 = this;
  return new cljs.core.TransientHashMap({}, this__4792.root, this__4792.cnt, this__4792.has_nil_QMARK_, this__4792.nil_val)
};
cljs.core.PersistentHashMap.prototype.cljs$core$IHash$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__4793 = this;
  return cljs.core.hash_imap.call(null, coll)
};
cljs.core.PersistentHashMap.prototype.cljs$core$ILookup$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__4794 = this;
  return cljs.core._lookup.call(null, coll, k, null)
};
cljs.core.PersistentHashMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__4795 = this;
  if(k === null) {
    if(cljs.core.truth_(this__4795.has_nil_QMARK_)) {
      return this__4795.nil_val
    }else {
      return not_found
    }
  }else {
    if(this__4795.root === null) {
      return not_found
    }else {
      if("\ufdd0'else") {
        return cljs.core.nth.call(null, this__4795.root.inode_find(0, cljs.core.hash.call(null, k), k, [null, not_found]), 1)
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$IAssociative$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__4796 = this;
  if(k === null) {
    if(cljs.core.truth_(function() {
      var and__3546__auto____4797 = this__4796.has_nil_QMARK_;
      if(cljs.core.truth_(and__3546__auto____4797)) {
        return v === this__4796.nil_val
      }else {
        return and__3546__auto____4797
      }
    }())) {
      return coll
    }else {
      return new cljs.core.PersistentHashMap(this__4796.meta, cljs.core.truth_(this__4796.has_nil_QMARK_) ? this__4796.cnt : this__4796.cnt + 1, this__4796.root, true, v)
    }
  }else {
    var added_leaf_QMARK___4798 = [false];
    var new_root__4799 = (this__4796.root === null ? cljs.core.BitmapIndexedNode.EMPTY : this__4796.root).inode_assoc(0, cljs.core.hash.call(null, k), k, v, added_leaf_QMARK___4798);
    if(new_root__4799 === this__4796.root) {
      return coll
    }else {
      return new cljs.core.PersistentHashMap(this__4796.meta, cljs.core.truth_(added_leaf_QMARK___4798[0]) ? this__4796.cnt + 1 : this__4796.cnt, new_root__4799, this__4796.has_nil_QMARK_, this__4796.nil_val)
    }
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var this__4800 = this;
  if(k === null) {
    return this__4800.has_nil_QMARK_
  }else {
    if(this__4800.root === null) {
      return false
    }else {
      if("\ufdd0'else") {
        return cljs.core.not.call(null, this__4800.root.inode_find(0, cljs.core.hash.call(null, k), k, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel)
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$IFn$ = true;
cljs.core.PersistentHashMap.prototype.call = function() {
  var G__4821 = null;
  var G__4821__2 = function(tsym4801, k) {
    var this__4803 = this;
    var tsym4801__4804 = this;
    var coll__4805 = tsym4801__4804;
    return cljs.core._lookup.call(null, coll__4805, k)
  };
  var G__4821__3 = function(tsym4802, k, not_found) {
    var this__4806 = this;
    var tsym4802__4807 = this;
    var coll__4808 = tsym4802__4807;
    return cljs.core._lookup.call(null, coll__4808, k, not_found)
  };
  G__4821 = function(tsym4802, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4821__2.call(this, tsym4802, k);
      case 3:
        return G__4821__3.call(this, tsym4802, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4821
}();
cljs.core.PersistentHashMap.prototype.cljs$core$ICollection$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var this__4809 = this;
  if(cljs.core.vector_QMARK_.call(null, entry)) {
    return cljs.core._assoc.call(null, coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.PersistentHashMap.prototype.toString = function() {
  var this__4810 = this;
  var this$__4811 = this;
  return cljs.core.pr_str.call(null, this$__4811)
};
cljs.core.PersistentHashMap.prototype.cljs$core$ISeqable$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__4812 = this;
  if(this__4812.cnt > 0) {
    var s__4813 = null != this__4812.root ? this__4812.root.inode_seq() : null;
    if(cljs.core.truth_(this__4812.has_nil_QMARK_)) {
      return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([null, this__4812.nil_val]), s__4813)
    }else {
      return s__4813
    }
  }else {
    return null
  }
};
cljs.core.PersistentHashMap.prototype.cljs$core$ICounted$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__4814 = this;
  return this__4814.cnt
};
cljs.core.PersistentHashMap.prototype.cljs$core$IEquiv$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__4815 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.PersistentHashMap.prototype.cljs$core$IWithMeta$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__4816 = this;
  return new cljs.core.PersistentHashMap(meta, this__4816.cnt, this__4816.root, this__4816.has_nil_QMARK_, this__4816.nil_val)
};
cljs.core.PersistentHashMap.prototype.cljs$core$IMeta$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__4817 = this;
  return this__4817.meta
};
cljs.core.PersistentHashMap.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__4818 = this;
  return cljs.core._with_meta.call(null, cljs.core.PersistentHashMap.EMPTY, this__4818.meta)
};
cljs.core.PersistentHashMap.prototype.cljs$core$IMap$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var this__4819 = this;
  if(k === null) {
    if(cljs.core.truth_(this__4819.has_nil_QMARK_)) {
      return new cljs.core.PersistentHashMap(this__4819.meta, this__4819.cnt - 1, this__4819.root, false, null)
    }else {
      return coll
    }
  }else {
    if(this__4819.root === null) {
      return coll
    }else {
      if("\ufdd0'else") {
        var new_root__4820 = this__4819.root.inode_without(0, cljs.core.hash.call(null, k), k);
        if(new_root__4820 === this__4819.root) {
          return coll
        }else {
          return new cljs.core.PersistentHashMap(this__4819.meta, this__4819.cnt - 1, new_root__4820, this__4819.has_nil_QMARK_, this__4819.nil_val)
        }
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentHashMap;
cljs.core.PersistentHashMap.EMPTY = new cljs.core.PersistentHashMap(null, 0, null, false, null);
cljs.core.PersistentHashMap.fromArrays = function(ks, vs) {
  var len__4822 = ks.length;
  var i__4823 = 0;
  var out__4824 = cljs.core.transient$.call(null, cljs.core.PersistentHashMap.EMPTY);
  while(true) {
    if(i__4823 < len__4822) {
      var G__4825 = i__4823 + 1;
      var G__4826 = cljs.core.assoc_BANG_.call(null, out__4824, ks[i__4823], vs[i__4823]);
      i__4823 = G__4825;
      out__4824 = G__4826;
      continue
    }else {
      return cljs.core.persistent_BANG_.call(null, out__4824)
    }
    break
  }
};
cljs.core.TransientHashMap = function(edit, root, count, has_nil_QMARK_, nil_val) {
  this.edit = edit;
  this.root = root;
  this.count = count;
  this.has_nil_QMARK_ = has_nil_QMARK_;
  this.nil_val = nil_val
};
cljs.core.TransientHashMap.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.TransientHashMap")
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientAssociative$ = true;
cljs.core.TransientHashMap.prototype.cljs$core$ITransientAssociative$_assoc_BANG_$arity$3 = function(tcoll, key, val) {
  var this__4827 = this;
  return tcoll.assoc_BANG_(key, val)
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientAssociative$_dissoc_BANG_$arity$2 = function(tcoll, key) {
  var this__4828 = this;
  return tcoll.without_BANG_(key)
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientCollection$ = true;
cljs.core.TransientHashMap.prototype.cljs$core$ITransientCollection$_conj_BANG_$arity$2 = function(tcoll, val) {
  var this__4829 = this;
  return tcoll.conj_BANG_(val)
};
cljs.core.TransientHashMap.prototype.cljs$core$ITransientCollection$_persistent_BANG_$arity$1 = function(tcoll) {
  var this__4830 = this;
  return tcoll.persistent_BANG_()
};
cljs.core.TransientHashMap.prototype.cljs$core$ILookup$ = true;
cljs.core.TransientHashMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(tcoll, k) {
  var this__4831 = this;
  if(k === null) {
    if(cljs.core.truth_(this__4831.has_nil_QMARK_)) {
      return this__4831.nil_val
    }else {
      return null
    }
  }else {
    if(this__4831.root === null) {
      return null
    }else {
      return cljs.core.nth.call(null, this__4831.root.inode_find(0, cljs.core.hash.call(null, k), k), 1)
    }
  }
};
cljs.core.TransientHashMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(tcoll, k, not_found) {
  var this__4832 = this;
  if(k === null) {
    if(cljs.core.truth_(this__4832.has_nil_QMARK_)) {
      return this__4832.nil_val
    }else {
      return not_found
    }
  }else {
    if(this__4832.root === null) {
      return not_found
    }else {
      return cljs.core.nth.call(null, this__4832.root.inode_find(0, cljs.core.hash.call(null, k), k, not_found), 1)
    }
  }
};
cljs.core.TransientHashMap.prototype.cljs$core$ICounted$ = true;
cljs.core.TransientHashMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__4833 = this;
  if(cljs.core.truth_(this__4833.edit)) {
    return this__4833.count
  }else {
    throw new Error("count after persistent!");
  }
};
cljs.core.TransientHashMap.prototype.conj_BANG_ = function(o) {
  var this__4834 = this;
  var tcoll__4835 = this;
  if(cljs.core.truth_(this__4834.edit)) {
    if(cljs.core.truth_(function() {
      var x__384__auto____4836 = o;
      if(cljs.core.truth_(function() {
        var and__3546__auto____4837 = x__384__auto____4836;
        if(cljs.core.truth_(and__3546__auto____4837)) {
          var and__3546__auto____4838 = x__384__auto____4836.cljs$core$IMapEntry$;
          if(cljs.core.truth_(and__3546__auto____4838)) {
            return cljs.core.not.call(null, x__384__auto____4836.hasOwnProperty("cljs$core$IMapEntry$"))
          }else {
            return and__3546__auto____4838
          }
        }else {
          return and__3546__auto____4837
        }
      }())) {
        return true
      }else {
        return cljs.core.type_satisfies_.call(null, cljs.core.IMapEntry, x__384__auto____4836)
      }
    }())) {
      return tcoll__4835.assoc_BANG_(cljs.core.key.call(null, o), cljs.core.val.call(null, o))
    }else {
      var es__4839 = cljs.core.seq.call(null, o);
      var tcoll__4840 = tcoll__4835;
      while(true) {
        var temp__3695__auto____4841 = cljs.core.first.call(null, es__4839);
        if(cljs.core.truth_(temp__3695__auto____4841)) {
          var e__4842 = temp__3695__auto____4841;
          var G__4853 = cljs.core.next.call(null, es__4839);
          var G__4854 = tcoll__4840.assoc_BANG_(cljs.core.key.call(null, e__4842), cljs.core.val.call(null, e__4842));
          es__4839 = G__4853;
          tcoll__4840 = G__4854;
          continue
        }else {
          return tcoll__4840
        }
        break
      }
    }
  }else {
    throw new Error("conj! after persistent");
  }
};
cljs.core.TransientHashMap.prototype.assoc_BANG_ = function(k, v) {
  var this__4843 = this;
  var tcoll__4844 = this;
  if(cljs.core.truth_(this__4843.edit)) {
    if(k === null) {
      if(this__4843.nil_val === v) {
      }else {
        this__4843.nil_val = v
      }
      if(cljs.core.truth_(this__4843.has_nil_QMARK_)) {
      }else {
        this__4843.count = this__4843.count + 1;
        this__4843.has_nil_QMARK_ = true
      }
      return tcoll__4844
    }else {
      var added_leaf_QMARK___4845 = [false];
      var node__4846 = (this__4843.root === null ? cljs.core.BitmapIndexedNode.EMPTY : this__4843.root).inode_assoc_BANG_(this__4843.edit, 0, cljs.core.hash.call(null, k), k, v, added_leaf_QMARK___4845);
      if(node__4846 === this__4843.root) {
      }else {
        this__4843.root = node__4846
      }
      if(cljs.core.truth_(added_leaf_QMARK___4845[0])) {
        this__4843.count = this__4843.count + 1
      }else {
      }
      return tcoll__4844
    }
  }else {
    throw new Error("assoc! after persistent!");
  }
};
cljs.core.TransientHashMap.prototype.without_BANG_ = function(k) {
  var this__4847 = this;
  var tcoll__4848 = this;
  if(cljs.core.truth_(this__4847.edit)) {
    if(k === null) {
      if(cljs.core.truth_(this__4847.has_nil_QMARK_)) {
        this__4847.has_nil_QMARK_ = false;
        this__4847.nil_val = null;
        this__4847.count = this__4847.count - 1;
        return tcoll__4848
      }else {
        return tcoll__4848
      }
    }else {
      if(this__4847.root === null) {
        return tcoll__4848
      }else {
        var removed_leaf_QMARK___4849 = [false];
        var node__4850 = this__4847.root.inode_without_BANG_(this__4847.edit, 0, cljs.core.hash.call(null, k), k, removed_leaf_QMARK___4849);
        if(node__4850 === this__4847.root) {
        }else {
          this__4847.root = node__4850
        }
        if(cljs.core.truth_(removed_leaf_QMARK___4849[0])) {
          this__4847.count = this__4847.count - 1
        }else {
        }
        return tcoll__4848
      }
    }
  }else {
    throw new Error("dissoc! after persistent!");
  }
};
cljs.core.TransientHashMap.prototype.persistent_BANG_ = function() {
  var this__4851 = this;
  var tcoll__4852 = this;
  if(cljs.core.truth_(this__4851.edit)) {
    this__4851.edit = null;
    return new cljs.core.PersistentHashMap(null, this__4851.count, this__4851.root, this__4851.has_nil_QMARK_, this__4851.nil_val)
  }else {
    throw new Error("persistent! called twice");
  }
};
cljs.core.TransientHashMap;
cljs.core.tree_map_seq_push = function tree_map_seq_push(node, stack, ascending_QMARK_) {
  var t__4855 = node;
  var stack__4856 = stack;
  while(true) {
    if(t__4855 != null) {
      var G__4857 = cljs.core.truth_(ascending_QMARK_) ? t__4855.left : t__4855.right;
      var G__4858 = cljs.core.conj.call(null, stack__4856, t__4855);
      t__4855 = G__4857;
      stack__4856 = G__4858;
      continue
    }else {
      return stack__4856
    }
    break
  }
};
cljs.core.PersistentTreeMapSeq = function(meta, stack, ascending_QMARK_, cnt) {
  this.meta = meta;
  this.stack = stack;
  this.ascending_QMARK_ = ascending_QMARK_;
  this.cnt = cnt
};
cljs.core.PersistentTreeMapSeq.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.PersistentTreeMapSeq")
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IHash$ = true;
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__4859 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ISequential$ = true;
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ICollection$ = true;
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__4860 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.PersistentTreeMapSeq.prototype.toString = function() {
  var this__4861 = this;
  var this$__4862 = this;
  return cljs.core.pr_str.call(null, this$__4862)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ISeqable$ = true;
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ISeqable$_seq$arity$1 = function(this$) {
  var this__4863 = this;
  return this$
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ICounted$ = true;
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__4864 = this;
  if(this__4864.cnt < 0) {
    return cljs.core.count.call(null, cljs.core.next.call(null, coll)) + 1
  }else {
    return this__4864.cnt
  }
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ISeq$ = true;
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ISeq$_first$arity$1 = function(this$) {
  var this__4865 = this;
  return cljs.core.peek.call(null, this__4865.stack)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$ISeq$_rest$arity$1 = function(this$) {
  var this__4866 = this;
  var t__4867 = cljs.core.peek.call(null, this__4866.stack);
  var next_stack__4868 = cljs.core.tree_map_seq_push.call(null, cljs.core.truth_(this__4866.ascending_QMARK_) ? t__4867.right : t__4867.left, cljs.core.pop.call(null, this__4866.stack), this__4866.ascending_QMARK_);
  if(next_stack__4868 != null) {
    return new cljs.core.PersistentTreeMapSeq(null, next_stack__4868, this__4866.ascending_QMARK_, this__4866.cnt - 1)
  }else {
    return null
  }
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IEquiv$ = true;
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__4869 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IWithMeta$ = true;
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__4870 = this;
  return new cljs.core.PersistentTreeMapSeq(meta, this__4870.stack, this__4870.ascending_QMARK_, this__4870.cnt)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IMeta$ = true;
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__4871 = this;
  return this__4871.meta
};
cljs.core.PersistentTreeMapSeq;
cljs.core.create_tree_map_seq = function create_tree_map_seq(tree, ascending_QMARK_, cnt) {
  return new cljs.core.PersistentTreeMapSeq(null, cljs.core.tree_map_seq_push.call(null, tree, null, ascending_QMARK_), ascending_QMARK_, cnt)
};
void 0;
void 0;
cljs.core.balance_left = function balance_left(key, val, ins, right) {
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins)) {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins.left)) {
      return new cljs.core.RedNode(ins.key, ins.val, ins.left.blacken(), new cljs.core.BlackNode(key, val, ins.right, right))
    }else {
      if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins.right)) {
        return new cljs.core.RedNode(ins.right.key, ins.right.val, new cljs.core.BlackNode(ins.key, ins.val, ins.left, ins.right.left), new cljs.core.BlackNode(key, val, ins.right.right, right))
      }else {
        if("\ufdd0'else") {
          return new cljs.core.BlackNode(key, val, ins, right)
        }else {
          return null
        }
      }
    }
  }else {
    return new cljs.core.BlackNode(key, val, ins, right)
  }
};
cljs.core.balance_right = function balance_right(key, val, left, ins) {
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins)) {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins.right)) {
      return new cljs.core.RedNode(ins.key, ins.val, new cljs.core.BlackNode(key, val, left, ins.left), ins.right.blacken())
    }else {
      if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, ins.left)) {
        return new cljs.core.RedNode(ins.left.key, ins.left.val, new cljs.core.BlackNode(key, val, left, ins.left.left), new cljs.core.BlackNode(ins.key, ins.val, ins.left.right, ins.right))
      }else {
        if("\ufdd0'else") {
          return new cljs.core.BlackNode(key, val, left, ins)
        }else {
          return null
        }
      }
    }
  }else {
    return new cljs.core.BlackNode(key, val, left, ins)
  }
};
cljs.core.balance_left_del = function balance_left_del(key, val, del, right) {
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, del)) {
    return new cljs.core.RedNode(key, val, del.blacken(), right)
  }else {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, right)) {
      return cljs.core.balance_right.call(null, key, val, del, right.redden())
    }else {
      if(function() {
        var and__3546__auto____4872 = cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, right);
        if(and__3546__auto____4872) {
          return cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, right.left)
        }else {
          return and__3546__auto____4872
        }
      }()) {
        return new cljs.core.RedNode(right.left.key, right.left.val, new cljs.core.BlackNode(key, val, del, right.left.left), cljs.core.balance_right.call(null, right.key, right.val, right.left.right, right.right.redden()))
      }else {
        if("\ufdd0'else") {
          throw new Error("red-black tree invariant violation");
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.balance_right_del = function balance_right_del(key, val, left, del) {
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, del)) {
    return new cljs.core.RedNode(key, val, left, del.blacken())
  }else {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, left)) {
      return cljs.core.balance_left.call(null, key, val, left.redden(), del)
    }else {
      if(function() {
        var and__3546__auto____4873 = cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, left);
        if(and__3546__auto____4873) {
          return cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, left.right)
        }else {
          return and__3546__auto____4873
        }
      }()) {
        return new cljs.core.RedNode(left.right.key, left.right.val, cljs.core.balance_left.call(null, left.key, left.val, left.left.redden(), left.right.left), new cljs.core.BlackNode(key, val, left.right.right, del))
      }else {
        if("\ufdd0'else") {
          throw new Error("red-black tree invariant violation");
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.BlackNode = function(key, val, left, right) {
  this.key = key;
  this.val = val;
  this.left = left;
  this.right = right
};
cljs.core.BlackNode.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.BlackNode")
};
cljs.core.BlackNode.prototype.cljs$core$IHash$ = true;
cljs.core.BlackNode.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__4874 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.BlackNode.prototype.cljs$core$ILookup$ = true;
cljs.core.BlackNode.prototype.cljs$core$ILookup$_lookup$arity$2 = function(node, k) {
  var this__4875 = this;
  return cljs.core._nth.call(null, node, k, null)
};
cljs.core.BlackNode.prototype.cljs$core$ILookup$_lookup$arity$3 = function(node, k, not_found) {
  var this__4876 = this;
  return cljs.core._nth.call(null, node, k, not_found)
};
cljs.core.BlackNode.prototype.cljs$core$IAssociative$ = true;
cljs.core.BlackNode.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(node, k, v) {
  var this__4877 = this;
  return cljs.core.assoc.call(null, cljs.core.PersistentVector.fromArray([this__4877.key, this__4877.val]), k, v)
};
cljs.core.BlackNode.prototype.cljs$core$IFn$ = true;
cljs.core.BlackNode.prototype.call = function() {
  var G__4920 = null;
  var G__4920__2 = function(tsym4878, k) {
    var this__4880 = this;
    var tsym4878__4881 = this;
    var node__4882 = tsym4878__4881;
    return cljs.core._lookup.call(null, node__4882, k)
  };
  var G__4920__3 = function(tsym4879, k, not_found) {
    var this__4883 = this;
    var tsym4879__4884 = this;
    var node__4885 = tsym4879__4884;
    return cljs.core._lookup.call(null, node__4885, k, not_found)
  };
  G__4920 = function(tsym4879, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4920__2.call(this, tsym4879, k);
      case 3:
        return G__4920__3.call(this, tsym4879, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4920
}();
cljs.core.BlackNode.prototype.cljs$core$ISequential$ = true;
cljs.core.BlackNode.prototype.cljs$core$ICollection$ = true;
cljs.core.BlackNode.prototype.cljs$core$ICollection$_conj$arity$2 = function(node, o) {
  var this__4886 = this;
  return cljs.core.PersistentVector.fromArray([this__4886.key, this__4886.val, o])
};
cljs.core.BlackNode.prototype.cljs$core$IMapEntry$ = true;
cljs.core.BlackNode.prototype.cljs$core$IMapEntry$_key$arity$1 = function(node) {
  var this__4887 = this;
  return this__4887.key
};
cljs.core.BlackNode.prototype.cljs$core$IMapEntry$_val$arity$1 = function(node) {
  var this__4888 = this;
  return this__4888.val
};
cljs.core.BlackNode.prototype.add_right = function(ins) {
  var this__4889 = this;
  var node__4890 = this;
  return ins.balance_right(node__4890)
};
cljs.core.BlackNode.prototype.redden = function() {
  var this__4891 = this;
  var node__4892 = this;
  return new cljs.core.RedNode(this__4891.key, this__4891.val, this__4891.left, this__4891.right)
};
cljs.core.BlackNode.prototype.remove_right = function(del) {
  var this__4893 = this;
  var node__4894 = this;
  return cljs.core.balance_right_del.call(null, this__4893.key, this__4893.val, this__4893.left, del)
};
cljs.core.BlackNode.prototype.replace = function(key, val, left, right) {
  var this__4895 = this;
  var node__4896 = this;
  return new cljs.core.BlackNode(key, val, left, right)
};
cljs.core.BlackNode.prototype.remove_left = function(del) {
  var this__4897 = this;
  var node__4898 = this;
  return cljs.core.balance_left_del.call(null, this__4897.key, this__4897.val, del, this__4897.right)
};
cljs.core.BlackNode.prototype.add_left = function(ins) {
  var this__4899 = this;
  var node__4900 = this;
  return ins.balance_left(node__4900)
};
cljs.core.BlackNode.prototype.balance_left = function(parent) {
  var this__4901 = this;
  var node__4902 = this;
  return new cljs.core.BlackNode(parent.key, parent.val, node__4902, parent.right)
};
cljs.core.BlackNode.prototype.balance_right = function(parent) {
  var this__4903 = this;
  var node__4904 = this;
  return new cljs.core.BlackNode(parent.key, parent.val, parent.left, node__4904)
};
cljs.core.BlackNode.prototype.blacken = function() {
  var this__4905 = this;
  var node__4906 = this;
  return node__4906
};
cljs.core.BlackNode.prototype.cljs$core$IReduce$ = true;
cljs.core.BlackNode.prototype.cljs$core$IReduce$_reduce$arity$2 = function(node, f) {
  var this__4907 = this;
  return f.call(null, this__4907.key, this__4907.val)
};
cljs.core.BlackNode.prototype.cljs$core$IReduce$_reduce$arity$3 = function(node, f, start) {
  var this__4908 = this;
  return f.call(null, f.call(null, start, this__4908.key))
};
cljs.core.BlackNode.prototype.cljs$core$ISeqable$ = true;
cljs.core.BlackNode.prototype.cljs$core$ISeqable$_seq$arity$1 = function(node) {
  var this__4909 = this;
  return cljs.core.list.call(null, this__4909.key, this__4909.val)
};
cljs.core.BlackNode.prototype.cljs$core$ICounted$ = true;
cljs.core.BlackNode.prototype.cljs$core$ICounted$_count$arity$1 = function(node) {
  var this__4910 = this;
  return 2
};
cljs.core.BlackNode.prototype.cljs$core$IStack$ = true;
cljs.core.BlackNode.prototype.cljs$core$IStack$_peek$arity$1 = function(node) {
  var this__4912 = this;
  return this__4912.val
};
cljs.core.BlackNode.prototype.cljs$core$IStack$_pop$arity$1 = function(node) {
  var this__4913 = this;
  return cljs.core.PersistentVector.fromArray([this__4913.key])
};
cljs.core.BlackNode.prototype.cljs$core$IVector$ = true;
cljs.core.BlackNode.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(node, n, v) {
  var this__4914 = this;
  return cljs.core._assoc_n.call(null, cljs.core.PersistentVector.fromArray([this__4914.key, this__4914.val]), n, v)
};
cljs.core.BlackNode.prototype.cljs$core$IEquiv$ = true;
cljs.core.BlackNode.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__4915 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.BlackNode.prototype.cljs$core$IWithMeta$ = true;
cljs.core.BlackNode.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(node, meta) {
  var this__4916 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentVector.fromArray([this__4916.key, this__4916.val]), meta)
};
cljs.core.BlackNode.prototype.cljs$core$IMeta$ = true;
cljs.core.BlackNode.prototype.cljs$core$IMeta$_meta$arity$1 = function(node) {
  var this__4917 = this;
  return null
};
cljs.core.BlackNode.prototype.cljs$core$IIndexed$ = true;
cljs.core.BlackNode.prototype.cljs$core$IIndexed$_nth$arity$2 = function(node, n) {
  var this__4918 = this;
  if(n === 0) {
    return this__4918.key
  }else {
    if(n === 1) {
      return this__4918.val
    }else {
      if("\ufdd0'else") {
        return null
      }else {
        return null
      }
    }
  }
};
cljs.core.BlackNode.prototype.cljs$core$IIndexed$_nth$arity$3 = function(node, n, not_found) {
  var this__4919 = this;
  if(n === 0) {
    return this__4919.key
  }else {
    if(n === 1) {
      return this__4919.val
    }else {
      if("\ufdd0'else") {
        return not_found
      }else {
        return null
      }
    }
  }
};
cljs.core.BlackNode.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.BlackNode.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(node) {
  var this__4911 = this;
  return cljs.core.PersistentVector.fromArray([])
};
cljs.core.BlackNode;
cljs.core.RedNode = function(key, val, left, right) {
  this.key = key;
  this.val = val;
  this.left = left;
  this.right = right
};
cljs.core.RedNode.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.RedNode")
};
cljs.core.RedNode.prototype.cljs$core$IHash$ = true;
cljs.core.RedNode.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__4921 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.RedNode.prototype.cljs$core$ILookup$ = true;
cljs.core.RedNode.prototype.cljs$core$ILookup$_lookup$arity$2 = function(node, k) {
  var this__4922 = this;
  return cljs.core._nth.call(null, node, k, null)
};
cljs.core.RedNode.prototype.cljs$core$ILookup$_lookup$arity$3 = function(node, k, not_found) {
  var this__4923 = this;
  return cljs.core._nth.call(null, node, k, not_found)
};
cljs.core.RedNode.prototype.cljs$core$IAssociative$ = true;
cljs.core.RedNode.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(node, k, v) {
  var this__4924 = this;
  return cljs.core.assoc.call(null, cljs.core.PersistentVector.fromArray([this__4924.key, this__4924.val]), k, v)
};
cljs.core.RedNode.prototype.cljs$core$IFn$ = true;
cljs.core.RedNode.prototype.call = function() {
  var G__4967 = null;
  var G__4967__2 = function(tsym4925, k) {
    var this__4927 = this;
    var tsym4925__4928 = this;
    var node__4929 = tsym4925__4928;
    return cljs.core._lookup.call(null, node__4929, k)
  };
  var G__4967__3 = function(tsym4926, k, not_found) {
    var this__4930 = this;
    var tsym4926__4931 = this;
    var node__4932 = tsym4926__4931;
    return cljs.core._lookup.call(null, node__4932, k, not_found)
  };
  G__4967 = function(tsym4926, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4967__2.call(this, tsym4926, k);
      case 3:
        return G__4967__3.call(this, tsym4926, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4967
}();
cljs.core.RedNode.prototype.cljs$core$ISequential$ = true;
cljs.core.RedNode.prototype.cljs$core$ICollection$ = true;
cljs.core.RedNode.prototype.cljs$core$ICollection$_conj$arity$2 = function(node, o) {
  var this__4933 = this;
  return cljs.core.PersistentVector.fromArray([this__4933.key, this__4933.val, o])
};
cljs.core.RedNode.prototype.cljs$core$IMapEntry$ = true;
cljs.core.RedNode.prototype.cljs$core$IMapEntry$_key$arity$1 = function(node) {
  var this__4934 = this;
  return this__4934.key
};
cljs.core.RedNode.prototype.cljs$core$IMapEntry$_val$arity$1 = function(node) {
  var this__4935 = this;
  return this__4935.val
};
cljs.core.RedNode.prototype.add_right = function(ins) {
  var this__4936 = this;
  var node__4937 = this;
  return new cljs.core.RedNode(this__4936.key, this__4936.val, this__4936.left, ins)
};
cljs.core.RedNode.prototype.redden = function() {
  var this__4938 = this;
  var node__4939 = this;
  throw new Error("red-black tree invariant violation");
};
cljs.core.RedNode.prototype.remove_right = function(del) {
  var this__4940 = this;
  var node__4941 = this;
  return new cljs.core.RedNode(this__4940.key, this__4940.val, this__4940.left, del)
};
cljs.core.RedNode.prototype.replace = function(key, val, left, right) {
  var this__4942 = this;
  var node__4943 = this;
  return new cljs.core.RedNode(key, val, left, right)
};
cljs.core.RedNode.prototype.remove_left = function(del) {
  var this__4944 = this;
  var node__4945 = this;
  return new cljs.core.RedNode(this__4944.key, this__4944.val, del, this__4944.right)
};
cljs.core.RedNode.prototype.add_left = function(ins) {
  var this__4946 = this;
  var node__4947 = this;
  return new cljs.core.RedNode(this__4946.key, this__4946.val, ins, this__4946.right)
};
cljs.core.RedNode.prototype.balance_left = function(parent) {
  var this__4948 = this;
  var node__4949 = this;
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, this__4948.left)) {
    return new cljs.core.RedNode(this__4948.key, this__4948.val, this__4948.left.blacken(), new cljs.core.BlackNode(parent.key, parent.val, this__4948.right, parent.right))
  }else {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, this__4948.right)) {
      return new cljs.core.RedNode(this__4948.right.key, this__4948.right.val, new cljs.core.BlackNode(this__4948.key, this__4948.val, this__4948.left, this__4948.right.left), new cljs.core.BlackNode(parent.key, parent.val, this__4948.right.right, parent.right))
    }else {
      if("\ufdd0'else") {
        return new cljs.core.BlackNode(parent.key, parent.val, node__4949, parent.right)
      }else {
        return null
      }
    }
  }
};
cljs.core.RedNode.prototype.balance_right = function(parent) {
  var this__4950 = this;
  var node__4951 = this;
  if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, this__4950.right)) {
    return new cljs.core.RedNode(this__4950.key, this__4950.val, new cljs.core.BlackNode(parent.key, parent.val, parent.left, this__4950.left), this__4950.right.blacken())
  }else {
    if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, this__4950.left)) {
      return new cljs.core.RedNode(this__4950.left.key, this__4950.left.val, new cljs.core.BlackNode(parent.key, parent.val, parent.left, this__4950.left.left), new cljs.core.BlackNode(this__4950.key, this__4950.val, this__4950.left.right, this__4950.right))
    }else {
      if("\ufdd0'else") {
        return new cljs.core.BlackNode(parent.key, parent.val, parent.left, node__4951)
      }else {
        return null
      }
    }
  }
};
cljs.core.RedNode.prototype.blacken = function() {
  var this__4952 = this;
  var node__4953 = this;
  return new cljs.core.BlackNode(this__4952.key, this__4952.val, this__4952.left, this__4952.right)
};
cljs.core.RedNode.prototype.cljs$core$IReduce$ = true;
cljs.core.RedNode.prototype.cljs$core$IReduce$_reduce$arity$2 = function(node, f) {
  var this__4954 = this;
  return f.call(null, this__4954.key, this__4954.val)
};
cljs.core.RedNode.prototype.cljs$core$IReduce$_reduce$arity$3 = function(node, f, start) {
  var this__4955 = this;
  return f.call(null, f.call(null, start, this__4955.key))
};
cljs.core.RedNode.prototype.cljs$core$ISeqable$ = true;
cljs.core.RedNode.prototype.cljs$core$ISeqable$_seq$arity$1 = function(node) {
  var this__4956 = this;
  return cljs.core.list.call(null, this__4956.key, this__4956.val)
};
cljs.core.RedNode.prototype.cljs$core$ICounted$ = true;
cljs.core.RedNode.prototype.cljs$core$ICounted$_count$arity$1 = function(node) {
  var this__4957 = this;
  return 2
};
cljs.core.RedNode.prototype.cljs$core$IStack$ = true;
cljs.core.RedNode.prototype.cljs$core$IStack$_peek$arity$1 = function(node) {
  var this__4959 = this;
  return this__4959.val
};
cljs.core.RedNode.prototype.cljs$core$IStack$_pop$arity$1 = function(node) {
  var this__4960 = this;
  return cljs.core.PersistentVector.fromArray([this__4960.key])
};
cljs.core.RedNode.prototype.cljs$core$IVector$ = true;
cljs.core.RedNode.prototype.cljs$core$IVector$_assoc_n$arity$3 = function(node, n, v) {
  var this__4961 = this;
  return cljs.core._assoc_n.call(null, cljs.core.PersistentVector.fromArray([this__4961.key, this__4961.val]), n, v)
};
cljs.core.RedNode.prototype.cljs$core$IEquiv$ = true;
cljs.core.RedNode.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__4962 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.RedNode.prototype.cljs$core$IWithMeta$ = true;
cljs.core.RedNode.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(node, meta) {
  var this__4963 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentVector.fromArray([this__4963.key, this__4963.val]), meta)
};
cljs.core.RedNode.prototype.cljs$core$IMeta$ = true;
cljs.core.RedNode.prototype.cljs$core$IMeta$_meta$arity$1 = function(node) {
  var this__4964 = this;
  return null
};
cljs.core.RedNode.prototype.cljs$core$IIndexed$ = true;
cljs.core.RedNode.prototype.cljs$core$IIndexed$_nth$arity$2 = function(node, n) {
  var this__4965 = this;
  if(n === 0) {
    return this__4965.key
  }else {
    if(n === 1) {
      return this__4965.val
    }else {
      if("\ufdd0'else") {
        return null
      }else {
        return null
      }
    }
  }
};
cljs.core.RedNode.prototype.cljs$core$IIndexed$_nth$arity$3 = function(node, n, not_found) {
  var this__4966 = this;
  if(n === 0) {
    return this__4966.key
  }else {
    if(n === 1) {
      return this__4966.val
    }else {
      if("\ufdd0'else") {
        return not_found
      }else {
        return null
      }
    }
  }
};
cljs.core.RedNode.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.RedNode.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(node) {
  var this__4958 = this;
  return cljs.core.PersistentVector.fromArray([])
};
cljs.core.RedNode;
cljs.core.tree_map_add = function tree_map_add(comp, tree, k, v, found) {
  if(tree == null) {
    return new cljs.core.RedNode(k, v, null, null)
  }else {
    var c__4968 = comp.call(null, k, tree.key);
    if(c__4968 === 0) {
      found[0] = tree;
      return null
    }else {
      if(c__4968 < 0) {
        var ins__4969 = tree_map_add.call(null, comp, tree.left, k, v, found);
        if(ins__4969 != null) {
          return tree.add_left(ins__4969)
        }else {
          return null
        }
      }else {
        if("\ufdd0'else") {
          var ins__4970 = tree_map_add.call(null, comp, tree.right, k, v, found);
          if(ins__4970 != null) {
            return tree.add_right(ins__4970)
          }else {
            return null
          }
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.tree_map_append = function tree_map_append(left, right) {
  if(left == null) {
    return right
  }else {
    if(right == null) {
      return left
    }else {
      if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, left)) {
        if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, right)) {
          var app__4971 = tree_map_append.call(null, left.right, right.left);
          if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, app__4971)) {
            return new cljs.core.RedNode(app__4971.key, app__4971.val, new cljs.core.RedNode(left.key, left.val, left.left, app__4971.left), new cljs.core.RedNode(right.key, right.val, app__4971.right, right.right))
          }else {
            return new cljs.core.RedNode(left.key, left.val, new cljs.core.RedNode(right.key, right.val, app__4971, right.right))
          }
        }else {
          return new cljs.core.RedNode(left.key, left.val, left.left, tree_map_append.call(null, left.right, right))
        }
      }else {
        if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, right)) {
          return new cljs.core.RedNode(right.key, right.val, tree_map_append.call(null, left, right.left), right.right)
        }else {
          if("\ufdd0'else") {
            var app__4972 = tree_map_append.call(null, left.right, right.left);
            if(cljs.core.instance_QMARK_.call(null, cljs.core.RedNode, app__4972)) {
              return new cljs.core.RedNode(app__4972.key, app__4972.val, new cljs.core.BlackNode(left.key, left.val, left.left, app__4972.left), new cljs.core.BlackNode(right.key, right.val, app__4972.right, right.right))
            }else {
              return cljs.core.balance_left_del.call(null, left.key, left.val, left.left, new cljs.core.BlackNode(right.key, right.val, app__4972, right.right))
            }
          }else {
            return null
          }
        }
      }
    }
  }
};
cljs.core.tree_map_remove = function tree_map_remove(comp, tree, k, found) {
  if(tree != null) {
    var c__4973 = comp.call(null, k, tree.key);
    if(c__4973 === 0) {
      found[0] = tree;
      return cljs.core.tree_map_append.call(null, tree.left, tree.right)
    }else {
      if(c__4973 < 0) {
        var del__4974 = tree_map_remove.call(null, comp, tree.left, k, found);
        if(function() {
          var or__3548__auto____4975 = del__4974 != null;
          if(or__3548__auto____4975) {
            return or__3548__auto____4975
          }else {
            return found[0] != null
          }
        }()) {
          if(cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, tree.left)) {
            return cljs.core.balance_left_del.call(null, tree.key, tree.val, del__4974, tree.right)
          }else {
            return new cljs.core.RedNode(tree.key, tree.val, del__4974, tree.right)
          }
        }else {
          return null
        }
      }else {
        if("\ufdd0'else") {
          var del__4976 = tree_map_remove.call(null, comp, tree.right, k, found);
          if(function() {
            var or__3548__auto____4977 = del__4976 != null;
            if(or__3548__auto____4977) {
              return or__3548__auto____4977
            }else {
              return found[0] != null
            }
          }()) {
            if(cljs.core.instance_QMARK_.call(null, cljs.core.BlackNode, tree.right)) {
              return cljs.core.balance_right_del.call(null, tree.key, tree.val, tree.left, del__4976)
            }else {
              return new cljs.core.RedNode(tree.key, tree.val, tree.left, del__4976)
            }
          }else {
            return null
          }
        }else {
          return null
        }
      }
    }
  }else {
    return null
  }
};
cljs.core.tree_map_replace = function tree_map_replace(comp, tree, k, v) {
  var tk__4978 = tree.key;
  var c__4979 = comp.call(null, k, tk__4978);
  if(c__4979 === 0) {
    return tree.replace(tk__4978, v, tree.left, tree.right)
  }else {
    if(c__4979 < 0) {
      return tree.replace(tk__4978, tree.val, tree_map_replace.call(null, comp, tree.left, k, v), tree.right)
    }else {
      if("\ufdd0'else") {
        return tree.replace(tk__4978, tree.val, tree.left, tree_map_replace.call(null, comp, tree.right, k, v))
      }else {
        return null
      }
    }
  }
};
void 0;
cljs.core.PersistentTreeMap = function(comp, tree, cnt, meta) {
  this.comp = comp;
  this.tree = tree;
  this.cnt = cnt;
  this.meta = meta
};
cljs.core.PersistentTreeMap.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.PersistentTreeMap")
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IHash$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__4980 = this;
  return cljs.core.hash_imap.call(null, coll)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ILookup$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, k) {
  var this__4981 = this;
  return cljs.core._lookup.call(null, coll, k, null)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, k, not_found) {
  var this__4982 = this;
  var n__4983 = coll.entry_at(k);
  if(n__4983 != null) {
    return n__4983.val
  }else {
    return not_found
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IAssociative$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$IAssociative$_assoc$arity$3 = function(coll, k, v) {
  var this__4984 = this;
  var found__4985 = [null];
  var t__4986 = cljs.core.tree_map_add.call(null, this__4984.comp, this__4984.tree, k, v, found__4985);
  if(t__4986 == null) {
    var found_node__4987 = cljs.core.nth.call(null, found__4985, 0);
    if(cljs.core._EQ_.call(null, v, found_node__4987.val)) {
      return coll
    }else {
      return new cljs.core.PersistentTreeMap(this__4984.comp, cljs.core.tree_map_replace.call(null, this__4984.comp, this__4984.tree, k, v), this__4984.cnt, this__4984.meta)
    }
  }else {
    return new cljs.core.PersistentTreeMap(this__4984.comp, t__4986.blacken(), this__4984.cnt + 1, this__4984.meta)
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_$arity$2 = function(coll, k) {
  var this__4988 = this;
  return coll.entry_at(k) != null
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IFn$ = true;
cljs.core.PersistentTreeMap.prototype.call = function() {
  var G__5021 = null;
  var G__5021__2 = function(tsym4989, k) {
    var this__4991 = this;
    var tsym4989__4992 = this;
    var coll__4993 = tsym4989__4992;
    return cljs.core._lookup.call(null, coll__4993, k)
  };
  var G__5021__3 = function(tsym4990, k, not_found) {
    var this__4994 = this;
    var tsym4990__4995 = this;
    var coll__4996 = tsym4990__4995;
    return cljs.core._lookup.call(null, coll__4996, k, not_found)
  };
  G__5021 = function(tsym4990, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__5021__2.call(this, tsym4990, k);
      case 3:
        return G__5021__3.call(this, tsym4990, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__5021
}();
cljs.core.PersistentTreeMap.prototype.cljs$core$ICollection$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, entry) {
  var this__4997 = this;
  if(cljs.core.vector_QMARK_.call(null, entry)) {
    return cljs.core._assoc.call(null, coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IReversible$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$IReversible$_rseq$arity$1 = function(coll) {
  var this__4998 = this;
  if(this__4998.cnt > 0) {
    return cljs.core.create_tree_map_seq.call(null, this__4998.tree, false, this__4998.cnt)
  }else {
    return null
  }
};
cljs.core.PersistentTreeMap.prototype.toString = function() {
  var this__4999 = this;
  var this$__5000 = this;
  return cljs.core.pr_str.call(null, this$__5000)
};
cljs.core.PersistentTreeMap.prototype.entry_at = function(k) {
  var this__5001 = this;
  var coll__5002 = this;
  var t__5003 = this__5001.tree;
  while(true) {
    if(t__5003 != null) {
      var c__5004 = this__5001.comp.call(null, k, t__5003.key);
      if(c__5004 === 0) {
        return t__5003
      }else {
        if(c__5004 < 0) {
          var G__5022 = t__5003.left;
          t__5003 = G__5022;
          continue
        }else {
          if("\ufdd0'else") {
            var G__5023 = t__5003.right;
            t__5003 = G__5023;
            continue
          }else {
            return null
          }
        }
      }
    }else {
      return null
    }
    break
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_sorted_seq$arity$2 = function(coll, ascending_QMARK_) {
  var this__5005 = this;
  if(this__5005.cnt > 0) {
    return cljs.core.create_tree_map_seq.call(null, this__5005.tree, ascending_QMARK_, this__5005.cnt)
  }else {
    return null
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_sorted_seq_from$arity$3 = function(coll, k, ascending_QMARK_) {
  var this__5006 = this;
  if(this__5006.cnt > 0) {
    var stack__5007 = null;
    var t__5008 = this__5006.tree;
    while(true) {
      if(t__5008 != null) {
        var c__5009 = this__5006.comp.call(null, k, t__5008.key);
        if(c__5009 === 0) {
          return new cljs.core.PersistentTreeMapSeq(null, cljs.core.conj.call(null, stack__5007, t__5008), ascending_QMARK_, -1)
        }else {
          if(cljs.core.truth_(ascending_QMARK_)) {
            if(c__5009 < 0) {
              var G__5024 = cljs.core.conj.call(null, stack__5007, t__5008);
              var G__5025 = t__5008.left;
              stack__5007 = G__5024;
              t__5008 = G__5025;
              continue
            }else {
              var G__5026 = stack__5007;
              var G__5027 = t__5008.right;
              stack__5007 = G__5026;
              t__5008 = G__5027;
              continue
            }
          }else {
            if("\ufdd0'else") {
              if(c__5009 > 0) {
                var G__5028 = cljs.core.conj.call(null, stack__5007, t__5008);
                var G__5029 = t__5008.right;
                stack__5007 = G__5028;
                t__5008 = G__5029;
                continue
              }else {
                var G__5030 = stack__5007;
                var G__5031 = t__5008.left;
                stack__5007 = G__5030;
                t__5008 = G__5031;
                continue
              }
            }else {
              return null
            }
          }
        }
      }else {
        if(stack__5007 == null) {
          return new cljs.core.PersistentTreeMapSeq(null, stack__5007, ascending_QMARK_, -1)
        }else {
          return null
        }
      }
      break
    }
  }else {
    return null
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_entry_key$arity$2 = function(coll, entry) {
  var this__5010 = this;
  return cljs.core.key.call(null, entry)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISorted$_comparator$arity$1 = function(coll) {
  var this__5011 = this;
  return this__5011.comp
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ISeqable$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__5012 = this;
  if(this__5012.cnt > 0) {
    return cljs.core.create_tree_map_seq.call(null, this__5012.tree, true, this__5012.cnt)
  }else {
    return null
  }
};
cljs.core.PersistentTreeMap.prototype.cljs$core$ICounted$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__5013 = this;
  return this__5013.cnt
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IEquiv$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__5014 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IWithMeta$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__5015 = this;
  return new cljs.core.PersistentTreeMap(this__5015.comp, this__5015.tree, this__5015.cnt, meta)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IMeta$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__5016 = this;
  return this__5016.meta
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__5020 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentTreeMap.EMPTY, this__5020.meta)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IMap$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$IMap$_dissoc$arity$2 = function(coll, k) {
  var this__5017 = this;
  var found__5018 = [null];
  var t__5019 = cljs.core.tree_map_remove.call(null, this__5017.comp, this__5017.tree, k, found__5018);
  if(t__5019 == null) {
    if(cljs.core.nth.call(null, found__5018, 0) == null) {
      return coll
    }else {
      return new cljs.core.PersistentTreeMap(this__5017.comp, null, 0, this__5017.meta)
    }
  }else {
    return new cljs.core.PersistentTreeMap(this__5017.comp, t__5019.blacken(), this__5017.cnt - 1, this__5017.meta)
  }
};
cljs.core.PersistentTreeMap;
cljs.core.PersistentTreeMap.EMPTY = new cljs.core.PersistentTreeMap(cljs.core.compare, null, 0, null);
cljs.core.hash_map = function() {
  var hash_map__delegate = function(keyvals) {
    var in$__5032 = cljs.core.seq.call(null, keyvals);
    var out__5033 = cljs.core.PersistentHashMap.EMPTY;
    while(true) {
      if(cljs.core.truth_(in$__5032)) {
        var G__5034 = cljs.core.nnext.call(null, in$__5032);
        var G__5035 = cljs.core.assoc.call(null, out__5033, cljs.core.first.call(null, in$__5032), cljs.core.second.call(null, in$__5032));
        in$__5032 = G__5034;
        out__5033 = G__5035;
        continue
      }else {
        return out__5033
      }
      break
    }
  };
  var hash_map = function(var_args) {
    var keyvals = null;
    if(goog.isDef(var_args)) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return hash_map__delegate.call(this, keyvals)
  };
  hash_map.cljs$lang$maxFixedArity = 0;
  hash_map.cljs$lang$applyTo = function(arglist__5036) {
    var keyvals = cljs.core.seq(arglist__5036);
    return hash_map__delegate.call(this, keyvals)
  };
  return hash_map
}();
cljs.core.sorted_map = function() {
  var sorted_map__delegate = function(keyvals) {
    var in$__5037 = cljs.core.seq.call(null, keyvals);
    var out__5038 = cljs.core.PersistentTreeMap.EMPTY;
    while(true) {
      if(cljs.core.truth_(in$__5037)) {
        var G__5039 = cljs.core.nnext.call(null, in$__5037);
        var G__5040 = cljs.core.assoc.call(null, out__5038, cljs.core.first.call(null, in$__5037), cljs.core.second.call(null, in$__5037));
        in$__5037 = G__5039;
        out__5038 = G__5040;
        continue
      }else {
        return out__5038
      }
      break
    }
  };
  var sorted_map = function(var_args) {
    var keyvals = null;
    if(goog.isDef(var_args)) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return sorted_map__delegate.call(this, keyvals)
  };
  sorted_map.cljs$lang$maxFixedArity = 0;
  sorted_map.cljs$lang$applyTo = function(arglist__5041) {
    var keyvals = cljs.core.seq(arglist__5041);
    return sorted_map__delegate.call(this, keyvals)
  };
  return sorted_map
}();
cljs.core.sorted_map_by = function() {
  var sorted_map_by__delegate = function(comparator, keyvals) {
    var in$__5042 = cljs.core.seq.call(null, keyvals);
    var out__5043 = new cljs.core.PersistentTreeMap(comparator, null, 0, null);
    while(true) {
      if(cljs.core.truth_(in$__5042)) {
        var G__5044 = cljs.core.nnext.call(null, in$__5042);
        var G__5045 = cljs.core.assoc.call(null, out__5043, cljs.core.first.call(null, in$__5042), cljs.core.second.call(null, in$__5042));
        in$__5042 = G__5044;
        out__5043 = G__5045;
        continue
      }else {
        return out__5043
      }
      break
    }
  };
  var sorted_map_by = function(comparator, var_args) {
    var keyvals = null;
    if(goog.isDef(var_args)) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return sorted_map_by__delegate.call(this, comparator, keyvals)
  };
  sorted_map_by.cljs$lang$maxFixedArity = 1;
  sorted_map_by.cljs$lang$applyTo = function(arglist__5046) {
    var comparator = cljs.core.first(arglist__5046);
    var keyvals = cljs.core.rest(arglist__5046);
    return sorted_map_by__delegate.call(this, comparator, keyvals)
  };
  return sorted_map_by
}();
cljs.core.keys = function keys(hash_map) {
  return cljs.core.seq.call(null, cljs.core.map.call(null, cljs.core.first, hash_map))
};
cljs.core.key = function key(map_entry) {
  return cljs.core._key.call(null, map_entry)
};
cljs.core.vals = function vals(hash_map) {
  return cljs.core.seq.call(null, cljs.core.map.call(null, cljs.core.second, hash_map))
};
cljs.core.val = function val(map_entry) {
  return cljs.core._val.call(null, map_entry)
};
cljs.core.merge = function() {
  var merge__delegate = function(maps) {
    if(cljs.core.truth_(cljs.core.some.call(null, cljs.core.identity, maps))) {
      return cljs.core.reduce.call(null, function(p1__5047_SHARP_, p2__5048_SHARP_) {
        return cljs.core.conj.call(null, function() {
          var or__3548__auto____5049 = p1__5047_SHARP_;
          if(cljs.core.truth_(or__3548__auto____5049)) {
            return or__3548__auto____5049
          }else {
            return cljs.core.PersistentHashMap.fromArrays([], [])
          }
        }(), p2__5048_SHARP_)
      }, maps)
    }else {
      return null
    }
  };
  var merge = function(var_args) {
    var maps = null;
    if(goog.isDef(var_args)) {
      maps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return merge__delegate.call(this, maps)
  };
  merge.cljs$lang$maxFixedArity = 0;
  merge.cljs$lang$applyTo = function(arglist__5050) {
    var maps = cljs.core.seq(arglist__5050);
    return merge__delegate.call(this, maps)
  };
  return merge
}();
cljs.core.merge_with = function() {
  var merge_with__delegate = function(f, maps) {
    if(cljs.core.truth_(cljs.core.some.call(null, cljs.core.identity, maps))) {
      var merge_entry__5053 = function(m, e) {
        var k__5051 = cljs.core.first.call(null, e);
        var v__5052 = cljs.core.second.call(null, e);
        if(cljs.core.contains_QMARK_.call(null, m, k__5051)) {
          return cljs.core.assoc.call(null, m, k__5051, f.call(null, cljs.core.get.call(null, m, k__5051), v__5052))
        }else {
          return cljs.core.assoc.call(null, m, k__5051, v__5052)
        }
      };
      var merge2__5055 = function(m1, m2) {
        return cljs.core.reduce.call(null, merge_entry__5053, function() {
          var or__3548__auto____5054 = m1;
          if(cljs.core.truth_(or__3548__auto____5054)) {
            return or__3548__auto____5054
          }else {
            return cljs.core.PersistentHashMap.fromArrays([], [])
          }
        }(), cljs.core.seq.call(null, m2))
      };
      return cljs.core.reduce.call(null, merge2__5055, maps)
    }else {
      return null
    }
  };
  var merge_with = function(f, var_args) {
    var maps = null;
    if(goog.isDef(var_args)) {
      maps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return merge_with__delegate.call(this, f, maps)
  };
  merge_with.cljs$lang$maxFixedArity = 1;
  merge_with.cljs$lang$applyTo = function(arglist__5056) {
    var f = cljs.core.first(arglist__5056);
    var maps = cljs.core.rest(arglist__5056);
    return merge_with__delegate.call(this, f, maps)
  };
  return merge_with
}();
cljs.core.select_keys = function select_keys(map, keyseq) {
  var ret__5058 = cljs.core.PersistentHashMap.fromArrays([], []);
  var keys__5059 = cljs.core.seq.call(null, keyseq);
  while(true) {
    if(cljs.core.truth_(keys__5059)) {
      var key__5060 = cljs.core.first.call(null, keys__5059);
      var entry__5061 = cljs.core.get.call(null, map, key__5060, "\ufdd0'user/not-found");
      var G__5062 = cljs.core.not_EQ_.call(null, entry__5061, "\ufdd0'user/not-found") ? cljs.core.assoc.call(null, ret__5058, key__5060, entry__5061) : ret__5058;
      var G__5063 = cljs.core.next.call(null, keys__5059);
      ret__5058 = G__5062;
      keys__5059 = G__5063;
      continue
    }else {
      return ret__5058
    }
    break
  }
};
cljs.core.Set = function(meta, hash_map) {
  this.meta = meta;
  this.hash_map = hash_map
};
cljs.core.Set.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.Set")
};
cljs.core.Set.prototype.cljs$core$IHash$ = true;
cljs.core.Set.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__5064 = this;
  return cljs.core.hash_iset.call(null, coll)
};
cljs.core.Set.prototype.cljs$core$ILookup$ = true;
cljs.core.Set.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, v) {
  var this__5065 = this;
  return cljs.core._lookup.call(null, coll, v, null)
};
cljs.core.Set.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, v, not_found) {
  var this__5066 = this;
  if(cljs.core.truth_(cljs.core._contains_key_QMARK_.call(null, this__5066.hash_map, v))) {
    return v
  }else {
    return not_found
  }
};
cljs.core.Set.prototype.cljs$core$IFn$ = true;
cljs.core.Set.prototype.call = function() {
  var G__5087 = null;
  var G__5087__2 = function(tsym5067, k) {
    var this__5069 = this;
    var tsym5067__5070 = this;
    var coll__5071 = tsym5067__5070;
    return cljs.core._lookup.call(null, coll__5071, k)
  };
  var G__5087__3 = function(tsym5068, k, not_found) {
    var this__5072 = this;
    var tsym5068__5073 = this;
    var coll__5074 = tsym5068__5073;
    return cljs.core._lookup.call(null, coll__5074, k, not_found)
  };
  G__5087 = function(tsym5068, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__5087__2.call(this, tsym5068, k);
      case 3:
        return G__5087__3.call(this, tsym5068, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__5087
}();
cljs.core.Set.prototype.cljs$core$ICollection$ = true;
cljs.core.Set.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__5075 = this;
  return new cljs.core.Set(this__5075.meta, cljs.core.assoc.call(null, this__5075.hash_map, o, null))
};
cljs.core.Set.prototype.toString = function() {
  var this__5076 = this;
  var this$__5077 = this;
  return cljs.core.pr_str.call(null, this$__5077)
};
cljs.core.Set.prototype.cljs$core$ISeqable$ = true;
cljs.core.Set.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__5078 = this;
  return cljs.core.keys.call(null, this__5078.hash_map)
};
cljs.core.Set.prototype.cljs$core$ISet$ = true;
cljs.core.Set.prototype.cljs$core$ISet$_disjoin$arity$2 = function(coll, v) {
  var this__5079 = this;
  return new cljs.core.Set(this__5079.meta, cljs.core.dissoc.call(null, this__5079.hash_map, v))
};
cljs.core.Set.prototype.cljs$core$ICounted$ = true;
cljs.core.Set.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__5080 = this;
  return cljs.core.count.call(null, cljs.core.seq.call(null, coll))
};
cljs.core.Set.prototype.cljs$core$IEquiv$ = true;
cljs.core.Set.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__5081 = this;
  var and__3546__auto____5082 = cljs.core.set_QMARK_.call(null, other);
  if(and__3546__auto____5082) {
    var and__3546__auto____5083 = cljs.core._EQ_.call(null, cljs.core.count.call(null, coll), cljs.core.count.call(null, other));
    if(and__3546__auto____5083) {
      return cljs.core.every_QMARK_.call(null, function(p1__5057_SHARP_) {
        return cljs.core.contains_QMARK_.call(null, coll, p1__5057_SHARP_)
      }, other)
    }else {
      return and__3546__auto____5083
    }
  }else {
    return and__3546__auto____5082
  }
};
cljs.core.Set.prototype.cljs$core$IWithMeta$ = true;
cljs.core.Set.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__5084 = this;
  return new cljs.core.Set(meta, this__5084.hash_map)
};
cljs.core.Set.prototype.cljs$core$IMeta$ = true;
cljs.core.Set.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__5085 = this;
  return this__5085.meta
};
cljs.core.Set.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.Set.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__5086 = this;
  return cljs.core.with_meta.call(null, cljs.core.Set.EMPTY, this__5086.meta)
};
cljs.core.Set;
cljs.core.Set.EMPTY = new cljs.core.Set(null, cljs.core.hash_map.call(null));
cljs.core.PersistentTreeSet = function(meta, tree_map) {
  this.meta = meta;
  this.tree_map = tree_map
};
cljs.core.PersistentTreeSet.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.PersistentTreeSet")
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IHash$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$IHash$_hash$arity$1 = function(coll) {
  var this__5089 = this;
  return cljs.core.hash_iset.call(null, coll)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ILookup$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$ILookup$_lookup$arity$2 = function(coll, v) {
  var this__5090 = this;
  return cljs.core._lookup.call(null, coll, v, null)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ILookup$_lookup$arity$3 = function(coll, v, not_found) {
  var this__5091 = this;
  if(cljs.core.truth_(cljs.core._contains_key_QMARK_.call(null, this__5091.tree_map, v))) {
    return v
  }else {
    return not_found
  }
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IFn$ = true;
cljs.core.PersistentTreeSet.prototype.call = function() {
  var G__5117 = null;
  var G__5117__2 = function(tsym5092, k) {
    var this__5094 = this;
    var tsym5092__5095 = this;
    var coll__5096 = tsym5092__5095;
    return cljs.core._lookup.call(null, coll__5096, k)
  };
  var G__5117__3 = function(tsym5093, k, not_found) {
    var this__5097 = this;
    var tsym5093__5098 = this;
    var coll__5099 = tsym5093__5098;
    return cljs.core._lookup.call(null, coll__5099, k, not_found)
  };
  G__5117 = function(tsym5093, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__5117__2.call(this, tsym5093, k);
      case 3:
        return G__5117__3.call(this, tsym5093, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__5117
}();
cljs.core.PersistentTreeSet.prototype.cljs$core$ICollection$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$ICollection$_conj$arity$2 = function(coll, o) {
  var this__5100 = this;
  return new cljs.core.PersistentTreeSet(this__5100.meta, cljs.core.assoc.call(null, this__5100.tree_map, o, null))
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IReversible$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$IReversible$_rseq$arity$1 = function(coll) {
  var this__5101 = this;
  return cljs.core.map.call(null, cljs.core.key, cljs.core.rseq.call(null, this__5101.tree_map))
};
cljs.core.PersistentTreeSet.prototype.toString = function() {
  var this__5102 = this;
  var this$__5103 = this;
  return cljs.core.pr_str.call(null, this$__5103)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_sorted_seq$arity$2 = function(coll, ascending_QMARK_) {
  var this__5104 = this;
  return cljs.core.map.call(null, cljs.core.key, cljs.core._sorted_seq.call(null, this__5104.tree_map, ascending_QMARK_))
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_sorted_seq_from$arity$3 = function(coll, k, ascending_QMARK_) {
  var this__5105 = this;
  return cljs.core.map.call(null, cljs.core.key, cljs.core._sorted_seq_from.call(null, this__5105.tree_map, k, ascending_QMARK_))
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_entry_key$arity$2 = function(coll, entry) {
  var this__5106 = this;
  return entry
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISorted$_comparator$arity$1 = function(coll) {
  var this__5107 = this;
  return cljs.core._comparator.call(null, this__5107.tree_map)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISeqable$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$ISeqable$_seq$arity$1 = function(coll) {
  var this__5108 = this;
  return cljs.core.keys.call(null, this__5108.tree_map)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ISet$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$ISet$_disjoin$arity$2 = function(coll, v) {
  var this__5109 = this;
  return new cljs.core.PersistentTreeSet(this__5109.meta, cljs.core.dissoc.call(null, this__5109.tree_map, v))
};
cljs.core.PersistentTreeSet.prototype.cljs$core$ICounted$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$ICounted$_count$arity$1 = function(coll) {
  var this__5110 = this;
  return cljs.core.count.call(null, this__5110.tree_map)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IEquiv$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(coll, other) {
  var this__5111 = this;
  var and__3546__auto____5112 = cljs.core.set_QMARK_.call(null, other);
  if(and__3546__auto____5112) {
    var and__3546__auto____5113 = cljs.core._EQ_.call(null, cljs.core.count.call(null, coll), cljs.core.count.call(null, other));
    if(and__3546__auto____5113) {
      return cljs.core.every_QMARK_.call(null, function(p1__5088_SHARP_) {
        return cljs.core.contains_QMARK_.call(null, coll, p1__5088_SHARP_)
      }, other)
    }else {
      return and__3546__auto____5113
    }
  }else {
    return and__3546__auto____5112
  }
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IWithMeta$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(coll, meta) {
  var this__5114 = this;
  return new cljs.core.PersistentTreeSet(meta, this__5114.tree_map)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IMeta$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$IMeta$_meta$arity$1 = function(coll) {
  var this__5115 = this;
  return this__5115.meta
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(coll) {
  var this__5116 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentTreeSet.EMPTY, this__5116.meta)
};
cljs.core.PersistentTreeSet;
cljs.core.PersistentTreeSet.EMPTY = new cljs.core.PersistentTreeSet(null, cljs.core.sorted_map.call(null));
cljs.core.set = function set(coll) {
  var in$__5118 = cljs.core.seq.call(null, coll);
  var out__5119 = cljs.core.Set.EMPTY;
  while(true) {
    if(cljs.core.not.call(null, cljs.core.empty_QMARK_.call(null, in$__5118))) {
      var G__5120 = cljs.core.rest.call(null, in$__5118);
      var G__5121 = cljs.core.conj.call(null, out__5119, cljs.core.first.call(null, in$__5118));
      in$__5118 = G__5120;
      out__5119 = G__5121;
      continue
    }else {
      return out__5119
    }
    break
  }
};
cljs.core.sorted_set = function() {
  var sorted_set__delegate = function(keys) {
    return cljs.core.reduce.call(null, cljs.core._conj, cljs.core.PersistentTreeSet.EMPTY, keys)
  };
  var sorted_set = function(var_args) {
    var keys = null;
    if(goog.isDef(var_args)) {
      keys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return sorted_set__delegate.call(this, keys)
  };
  sorted_set.cljs$lang$maxFixedArity = 0;
  sorted_set.cljs$lang$applyTo = function(arglist__5122) {
    var keys = cljs.core.seq(arglist__5122);
    return sorted_set__delegate.call(this, keys)
  };
  return sorted_set
}();
cljs.core.sorted_set_by = function() {
  var sorted_set_by__delegate = function(comparator, keys) {
    return cljs.core.reduce.call(null, cljs.core._conj, new cljs.core.PersistentTreeSet(null, cljs.core.sorted_map_by.call(null, comparator)), keys)
  };
  var sorted_set_by = function(comparator, var_args) {
    var keys = null;
    if(goog.isDef(var_args)) {
      keys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return sorted_set_by__delegate.call(this, comparator, keys)
  };
  sorted_set_by.cljs$lang$maxFixedArity = 1;
  sorted_set_by.cljs$lang$applyTo = function(arglist__5124) {
    var comparator = cljs.core.first(arglist__5124);
    var keys = cljs.core.rest(arglist__5124);
    return sorted_set_by__delegate.call(this, comparator, keys)
  };
  return sorted_set_by
}();
cljs.core.replace = function replace(smap, coll) {
  if(cljs.core.vector_QMARK_.call(null, coll)) {
    var n__5125 = cljs.core.count.call(null, coll);
    return cljs.core.reduce.call(null, function(v, i) {
      var temp__3695__auto____5126 = cljs.core.find.call(null, smap, cljs.core.nth.call(null, v, i));
      if(cljs.core.truth_(temp__3695__auto____5126)) {
        var e__5127 = temp__3695__auto____5126;
        return cljs.core.assoc.call(null, v, i, cljs.core.second.call(null, e__5127))
      }else {
        return v
      }
    }, coll, cljs.core.take.call(null, n__5125, cljs.core.iterate.call(null, cljs.core.inc, 0)))
  }else {
    return cljs.core.map.call(null, function(p1__5123_SHARP_) {
      var temp__3695__auto____5128 = cljs.core.find.call(null, smap, p1__5123_SHARP_);
      if(cljs.core.truth_(temp__3695__auto____5128)) {
        var e__5129 = temp__3695__auto____5128;
        return cljs.core.second.call(null, e__5129)
      }else {
        return p1__5123_SHARP_
      }
    }, coll)
  }
};
cljs.core.distinct = function distinct(coll) {
  var step__5137 = function step(xs, seen) {
    return new cljs.core.LazySeq(null, false, function() {
      return function(p__5130, seen) {
        while(true) {
          var vec__5131__5132 = p__5130;
          var f__5133 = cljs.core.nth.call(null, vec__5131__5132, 0, null);
          var xs__5134 = vec__5131__5132;
          var temp__3698__auto____5135 = cljs.core.seq.call(null, xs__5134);
          if(cljs.core.truth_(temp__3698__auto____5135)) {
            var s__5136 = temp__3698__auto____5135;
            if(cljs.core.contains_QMARK_.call(null, seen, f__5133)) {
              var G__5138 = cljs.core.rest.call(null, s__5136);
              var G__5139 = seen;
              p__5130 = G__5138;
              seen = G__5139;
              continue
            }else {
              return cljs.core.cons.call(null, f__5133, step.call(null, cljs.core.rest.call(null, s__5136), cljs.core.conj.call(null, seen, f__5133)))
            }
          }else {
            return null
          }
          break
        }
      }.call(null, xs, seen)
    })
  };
  return step__5137.call(null, coll, cljs.core.set([]))
};
cljs.core.butlast = function butlast(s) {
  var ret__5140 = cljs.core.PersistentVector.fromArray([]);
  var s__5141 = s;
  while(true) {
    if(cljs.core.truth_(cljs.core.next.call(null, s__5141))) {
      var G__5142 = cljs.core.conj.call(null, ret__5140, cljs.core.first.call(null, s__5141));
      var G__5143 = cljs.core.next.call(null, s__5141);
      ret__5140 = G__5142;
      s__5141 = G__5143;
      continue
    }else {
      return cljs.core.seq.call(null, ret__5140)
    }
    break
  }
};
cljs.core.name = function name(x) {
  if(cljs.core.string_QMARK_.call(null, x)) {
    return x
  }else {
    if(function() {
      var or__3548__auto____5144 = cljs.core.keyword_QMARK_.call(null, x);
      if(or__3548__auto____5144) {
        return or__3548__auto____5144
      }else {
        return cljs.core.symbol_QMARK_.call(null, x)
      }
    }()) {
      var i__5145 = x.lastIndexOf("/");
      if(i__5145 < 0) {
        return cljs.core.subs.call(null, x, 2)
      }else {
        return cljs.core.subs.call(null, x, i__5145 + 1)
      }
    }else {
      if("\ufdd0'else") {
        throw new Error(cljs.core.str.call(null, "Doesn't support name: ", x));
      }else {
        return null
      }
    }
  }
};
cljs.core.namespace = function namespace(x) {
  if(function() {
    var or__3548__auto____5146 = cljs.core.keyword_QMARK_.call(null, x);
    if(or__3548__auto____5146) {
      return or__3548__auto____5146
    }else {
      return cljs.core.symbol_QMARK_.call(null, x)
    }
  }()) {
    var i__5147 = x.lastIndexOf("/");
    if(i__5147 > -1) {
      return cljs.core.subs.call(null, x, 2, i__5147)
    }else {
      return null
    }
  }else {
    throw new Error(cljs.core.str.call(null, "Doesn't support namespace: ", x));
  }
};
cljs.core.zipmap = function zipmap(keys, vals) {
  var map__5150 = cljs.core.PersistentHashMap.fromArrays([], []);
  var ks__5151 = cljs.core.seq.call(null, keys);
  var vs__5152 = cljs.core.seq.call(null, vals);
  while(true) {
    if(cljs.core.truth_(function() {
      var and__3546__auto____5153 = ks__5151;
      if(cljs.core.truth_(and__3546__auto____5153)) {
        return vs__5152
      }else {
        return and__3546__auto____5153
      }
    }())) {
      var G__5154 = cljs.core.assoc.call(null, map__5150, cljs.core.first.call(null, ks__5151), cljs.core.first.call(null, vs__5152));
      var G__5155 = cljs.core.next.call(null, ks__5151);
      var G__5156 = cljs.core.next.call(null, vs__5152);
      map__5150 = G__5154;
      ks__5151 = G__5155;
      vs__5152 = G__5156;
      continue
    }else {
      return map__5150
    }
    break
  }
};
cljs.core.max_key = function() {
  var max_key = null;
  var max_key__2 = function(k, x) {
    return x
  };
  var max_key__3 = function(k, x, y) {
    if(k.call(null, x) > k.call(null, y)) {
      return x
    }else {
      return y
    }
  };
  var max_key__4 = function() {
    var G__5159__delegate = function(k, x, y, more) {
      return cljs.core.reduce.call(null, function(p1__5148_SHARP_, p2__5149_SHARP_) {
        return max_key.call(null, k, p1__5148_SHARP_, p2__5149_SHARP_)
      }, max_key.call(null, k, x, y), more)
    };
    var G__5159 = function(k, x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__5159__delegate.call(this, k, x, y, more)
    };
    G__5159.cljs$lang$maxFixedArity = 3;
    G__5159.cljs$lang$applyTo = function(arglist__5160) {
      var k = cljs.core.first(arglist__5160);
      var x = cljs.core.first(cljs.core.next(arglist__5160));
      var y = cljs.core.first(cljs.core.next(cljs.core.next(arglist__5160)));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__5160)));
      return G__5159__delegate.call(this, k, x, y, more)
    };
    return G__5159
  }();
  max_key = function(k, x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return max_key__2.call(this, k, x);
      case 3:
        return max_key__3.call(this, k, x, y);
      default:
        return max_key__4.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  max_key.cljs$lang$maxFixedArity = 3;
  max_key.cljs$lang$applyTo = max_key__4.cljs$lang$applyTo;
  max_key.cljs$lang$arity$2 = max_key__2;
  max_key.cljs$lang$arity$3 = max_key__3;
  max_key.cljs$lang$arity$4 = max_key__4;
  return max_key
}();
cljs.core.min_key = function() {
  var min_key = null;
  var min_key__2 = function(k, x) {
    return x
  };
  var min_key__3 = function(k, x, y) {
    if(k.call(null, x) < k.call(null, y)) {
      return x
    }else {
      return y
    }
  };
  var min_key__4 = function() {
    var G__5161__delegate = function(k, x, y, more) {
      return cljs.core.reduce.call(null, function(p1__5157_SHARP_, p2__5158_SHARP_) {
        return min_key.call(null, k, p1__5157_SHARP_, p2__5158_SHARP_)
      }, min_key.call(null, k, x, y), more)
    };
    var G__5161 = function(k, x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__5161__delegate.call(this, k, x, y, more)
    };
    G__5161.cljs$lang$maxFixedArity = 3;
    G__5161.cljs$lang$applyTo = function(arglist__5162) {
      var k = cljs.core.first(arglist__5162);
      var x = cljs.core.first(cljs.core.next(arglist__5162));
      var y = cljs.core.first(cljs.core.next(cljs.core.next(arglist__5162)));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__5162)));
      return G__5161__delegate.call(this, k, x, y, more)
    };
    return G__5161
  }();
  min_key = function(k, x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return min_key__2.call(this, k, x);
      case 3:
        return min_key__3.call(this, k, x, y);
      default:
        return min_key__4.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  min_key.cljs$lang$maxFixedArity = 3;
  min_key.cljs$lang$applyTo = min_key__4.cljs$lang$applyTo;
  min_key.cljs$lang$arity$2 = min_key__2;
  min_key.cljs$lang$arity$3 = min_key__3;
  min_key.cljs$lang$arity$4 = min_key__4;
  return min_key
}();
cljs.core.partition_all = function() {
  var partition_all = null;
  var partition_all__2 = function(n, coll) {
    return partition_all.call(null, n, n, coll)
  };
  var partition_all__3 = function(n, step, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3698__auto____5163 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3698__auto____5163)) {
        var s__5164 = temp__3698__auto____5163;
        return cljs.core.cons.call(null, cljs.core.take.call(null, n, s__5164), partition_all.call(null, n, step, cljs.core.drop.call(null, step, s__5164)))
      }else {
        return null
      }
    })
  };
  partition_all = function(n, step, coll) {
    switch(arguments.length) {
      case 2:
        return partition_all__2.call(this, n, step);
      case 3:
        return partition_all__3.call(this, n, step, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  partition_all.cljs$lang$arity$2 = partition_all__2;
  partition_all.cljs$lang$arity$3 = partition_all__3;
  return partition_all
}();
cljs.core.take_while = function take_while(pred, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3698__auto____5165 = cljs.core.seq.call(null, coll);
    if(cljs.core.truth_(temp__3698__auto____5165)) {
      var s__5166 = temp__3698__auto____5165;
      if(cljs.core.truth_(pred.call(null, cljs.core.first.call(null, s__5166)))) {
        return cljs.core.cons.call(null, cljs.core.first.call(null, s__5166), take_while.call(null, pred, cljs.core.rest.call(null, s__5166)))
      }else {
        return null
      }
    }else {
      return null
    }
  })
};
cljs.core.mk_bound_fn = function mk_bound_fn(sc, test, key) {
  return function(e) {
    var comp__5167 = cljs.core._comparator.call(null, sc);
    return test.call(null, comp__5167.call(null, cljs.core._entry_key.call(null, sc, e), key), 0)
  }
};
cljs.core.subseq = function() {
  var subseq = null;
  var subseq__3 = function(sc, test, key) {
    var include__5168 = cljs.core.mk_bound_fn.call(null, sc, test, key);
    if(cljs.core.truth_(cljs.core.set([cljs.core._GT_, cljs.core._GT__EQ_]).call(null, test))) {
      var temp__3698__auto____5169 = cljs.core._sorted_seq_from.call(null, sc, key, true);
      if(cljs.core.truth_(temp__3698__auto____5169)) {
        var vec__5170__5171 = temp__3698__auto____5169;
        var e__5172 = cljs.core.nth.call(null, vec__5170__5171, 0, null);
        var s__5173 = vec__5170__5171;
        if(cljs.core.truth_(include__5168.call(null, e__5172))) {
          return s__5173
        }else {
          return cljs.core.next.call(null, s__5173)
        }
      }else {
        return null
      }
    }else {
      return cljs.core.take_while.call(null, include__5168, cljs.core._sorted_seq.call(null, sc, true))
    }
  };
  var subseq__5 = function(sc, start_test, start_key, end_test, end_key) {
    var temp__3698__auto____5174 = cljs.core._sorted_seq_from.call(null, sc, start_key, true);
    if(cljs.core.truth_(temp__3698__auto____5174)) {
      var vec__5175__5176 = temp__3698__auto____5174;
      var e__5177 = cljs.core.nth.call(null, vec__5175__5176, 0, null);
      var s__5178 = vec__5175__5176;
      return cljs.core.take_while.call(null, cljs.core.mk_bound_fn.call(null, sc, end_test, end_key), cljs.core.truth_(cljs.core.mk_bound_fn.call(null, sc, start_test, start_key).call(null, e__5177)) ? s__5178 : cljs.core.next.call(null, s__5178))
    }else {
      return null
    }
  };
  subseq = function(sc, start_test, start_key, end_test, end_key) {
    switch(arguments.length) {
      case 3:
        return subseq__3.call(this, sc, start_test, start_key);
      case 5:
        return subseq__5.call(this, sc, start_test, start_key, end_test, end_key)
    }
    throw"Invalid arity: " + arguments.length;
  };
  subseq.cljs$lang$arity$3 = subseq__3;
  subseq.cljs$lang$arity$5 = subseq__5;
  return subseq
}();
cljs.core.Range = function(meta, start, end, step) {
  this.meta = meta;
  this.start = start;
  this.end = end;
  this.step = step
};
cljs.core.Range.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.Range")
};
cljs.core.Range.prototype.cljs$core$IHash$ = true;
cljs.core.Range.prototype.cljs$core$IHash$_hash$arity$1 = function(rng) {
  var this__5179 = this;
  return cljs.core.hash_coll.call(null, rng)
};
cljs.core.Range.prototype.cljs$core$ISequential$ = true;
cljs.core.Range.prototype.cljs$core$ICollection$ = true;
cljs.core.Range.prototype.cljs$core$ICollection$_conj$arity$2 = function(rng, o) {
  var this__5180 = this;
  return cljs.core.cons.call(null, o, rng)
};
cljs.core.Range.prototype.toString = function() {
  var this__5181 = this;
  var this$__5182 = this;
  return cljs.core.pr_str.call(null, this$__5182)
};
cljs.core.Range.prototype.cljs$core$IReduce$ = true;
cljs.core.Range.prototype.cljs$core$IReduce$_reduce$arity$2 = function(rng, f) {
  var this__5183 = this;
  return cljs.core.ci_reduce.call(null, rng, f)
};
cljs.core.Range.prototype.cljs$core$IReduce$_reduce$arity$3 = function(rng, f, s) {
  var this__5184 = this;
  return cljs.core.ci_reduce.call(null, rng, f, s)
};
cljs.core.Range.prototype.cljs$core$ISeqable$ = true;
cljs.core.Range.prototype.cljs$core$ISeqable$_seq$arity$1 = function(rng) {
  var this__5185 = this;
  var comp__5186 = this__5185.step > 0 ? cljs.core._LT_ : cljs.core._GT_;
  if(cljs.core.truth_(comp__5186.call(null, this__5185.start, this__5185.end))) {
    return rng
  }else {
    return null
  }
};
cljs.core.Range.prototype.cljs$core$ICounted$ = true;
cljs.core.Range.prototype.cljs$core$ICounted$_count$arity$1 = function(rng) {
  var this__5187 = this;
  if(cljs.core.not.call(null, cljs.core._seq.call(null, rng))) {
    return 0
  }else {
    return Math["ceil"]((this__5187.end - this__5187.start) / this__5187.step)
  }
};
cljs.core.Range.prototype.cljs$core$ISeq$ = true;
cljs.core.Range.prototype.cljs$core$ISeq$_first$arity$1 = function(rng) {
  var this__5188 = this;
  return this__5188.start
};
cljs.core.Range.prototype.cljs$core$ISeq$_rest$arity$1 = function(rng) {
  var this__5189 = this;
  if(cljs.core.truth_(cljs.core._seq.call(null, rng))) {
    return new cljs.core.Range(this__5189.meta, this__5189.start + this__5189.step, this__5189.end, this__5189.step)
  }else {
    return cljs.core.list.call(null)
  }
};
cljs.core.Range.prototype.cljs$core$IEquiv$ = true;
cljs.core.Range.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(rng, other) {
  var this__5190 = this;
  return cljs.core.equiv_sequential.call(null, rng, other)
};
cljs.core.Range.prototype.cljs$core$IWithMeta$ = true;
cljs.core.Range.prototype.cljs$core$IWithMeta$_with_meta$arity$2 = function(rng, meta) {
  var this__5191 = this;
  return new cljs.core.Range(meta, this__5191.start, this__5191.end, this__5191.step)
};
cljs.core.Range.prototype.cljs$core$IMeta$ = true;
cljs.core.Range.prototype.cljs$core$IMeta$_meta$arity$1 = function(rng) {
  var this__5192 = this;
  return this__5192.meta
};
cljs.core.Range.prototype.cljs$core$IIndexed$ = true;
cljs.core.Range.prototype.cljs$core$IIndexed$_nth$arity$2 = function(rng, n) {
  var this__5193 = this;
  if(n < cljs.core._count.call(null, rng)) {
    return this__5193.start + n * this__5193.step
  }else {
    if(function() {
      var and__3546__auto____5194 = this__5193.start > this__5193.end;
      if(and__3546__auto____5194) {
        return cljs.core._EQ_.call(null, this__5193.step, 0)
      }else {
        return and__3546__auto____5194
      }
    }()) {
      return this__5193.start
    }else {
      throw new Error("Index out of bounds");
    }
  }
};
cljs.core.Range.prototype.cljs$core$IIndexed$_nth$arity$3 = function(rng, n, not_found) {
  var this__5195 = this;
  if(n < cljs.core._count.call(null, rng)) {
    return this__5195.start + n * this__5195.step
  }else {
    if(function() {
      var and__3546__auto____5196 = this__5195.start > this__5195.end;
      if(and__3546__auto____5196) {
        return cljs.core._EQ_.call(null, this__5195.step, 0)
      }else {
        return and__3546__auto____5196
      }
    }()) {
      return this__5195.start
    }else {
      return not_found
    }
  }
};
cljs.core.Range.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.Range.prototype.cljs$core$IEmptyableCollection$_empty$arity$1 = function(rng) {
  var this__5197 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__5197.meta)
};
cljs.core.Range;
cljs.core.range = function() {
  var range = null;
  var range__0 = function() {
    return range.call(null, 0, Number["MAX_VALUE"], 1)
  };
  var range__1 = function(end) {
    return range.call(null, 0, end, 1)
  };
  var range__2 = function(start, end) {
    return range.call(null, start, end, 1)
  };
  var range__3 = function(start, end, step) {
    return new cljs.core.Range(null, start, end, step)
  };
  range = function(start, end, step) {
    switch(arguments.length) {
      case 0:
        return range__0.call(this);
      case 1:
        return range__1.call(this, start);
      case 2:
        return range__2.call(this, start, end);
      case 3:
        return range__3.call(this, start, end, step)
    }
    throw"Invalid arity: " + arguments.length;
  };
  range.cljs$lang$arity$0 = range__0;
  range.cljs$lang$arity$1 = range__1;
  range.cljs$lang$arity$2 = range__2;
  range.cljs$lang$arity$3 = range__3;
  return range
}();
cljs.core.take_nth = function take_nth(n, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3698__auto____5198 = cljs.core.seq.call(null, coll);
    if(cljs.core.truth_(temp__3698__auto____5198)) {
      var s__5199 = temp__3698__auto____5198;
      return cljs.core.cons.call(null, cljs.core.first.call(null, s__5199), take_nth.call(null, n, cljs.core.drop.call(null, n, s__5199)))
    }else {
      return null
    }
  })
};
cljs.core.split_with = function split_with(pred, coll) {
  return cljs.core.PersistentVector.fromArray([cljs.core.take_while.call(null, pred, coll), cljs.core.drop_while.call(null, pred, coll)])
};
cljs.core.partition_by = function partition_by(f, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3698__auto____5201 = cljs.core.seq.call(null, coll);
    if(cljs.core.truth_(temp__3698__auto____5201)) {
      var s__5202 = temp__3698__auto____5201;
      var fst__5203 = cljs.core.first.call(null, s__5202);
      var fv__5204 = f.call(null, fst__5203);
      var run__5205 = cljs.core.cons.call(null, fst__5203, cljs.core.take_while.call(null, function(p1__5200_SHARP_) {
        return cljs.core._EQ_.call(null, fv__5204, f.call(null, p1__5200_SHARP_))
      }, cljs.core.next.call(null, s__5202)));
      return cljs.core.cons.call(null, run__5205, partition_by.call(null, f, cljs.core.seq.call(null, cljs.core.drop.call(null, cljs.core.count.call(null, run__5205), s__5202))))
    }else {
      return null
    }
  })
};
cljs.core.frequencies = function frequencies(coll) {
  return cljs.core.reduce.call(null, function(counts, x) {
    return cljs.core.assoc.call(null, counts, x, cljs.core.get.call(null, counts, x, 0) + 1)
  }, cljs.core.PersistentHashMap.fromArrays([], []), coll)
};
cljs.core.reductions = function() {
  var reductions = null;
  var reductions__2 = function(f, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3695__auto____5216 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3695__auto____5216)) {
        var s__5217 = temp__3695__auto____5216;
        return reductions.call(null, f, cljs.core.first.call(null, s__5217), cljs.core.rest.call(null, s__5217))
      }else {
        return cljs.core.list.call(null, f.call(null))
      }
    })
  };
  var reductions__3 = function(f, init, coll) {
    return cljs.core.cons.call(null, init, new cljs.core.LazySeq(null, false, function() {
      var temp__3698__auto____5218 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3698__auto____5218)) {
        var s__5219 = temp__3698__auto____5218;
        return reductions.call(null, f, f.call(null, init, cljs.core.first.call(null, s__5219)), cljs.core.rest.call(null, s__5219))
      }else {
        return null
      }
    }))
  };
  reductions = function(f, init, coll) {
    switch(arguments.length) {
      case 2:
        return reductions__2.call(this, f, init);
      case 3:
        return reductions__3.call(this, f, init, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  reductions.cljs$lang$arity$2 = reductions__2;
  reductions.cljs$lang$arity$3 = reductions__3;
  return reductions
}();
cljs.core.juxt = function() {
  var juxt = null;
  var juxt__1 = function(f) {
    return function() {
      var G__5221 = null;
      var G__5221__0 = function() {
        return cljs.core.vector.call(null, f.call(null))
      };
      var G__5221__1 = function(x) {
        return cljs.core.vector.call(null, f.call(null, x))
      };
      var G__5221__2 = function(x, y) {
        return cljs.core.vector.call(null, f.call(null, x, y))
      };
      var G__5221__3 = function(x, y, z) {
        return cljs.core.vector.call(null, f.call(null, x, y, z))
      };
      var G__5221__4 = function() {
        var G__5222__delegate = function(x, y, z, args) {
          return cljs.core.vector.call(null, cljs.core.apply.call(null, f, x, y, z, args))
        };
        var G__5222 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__5222__delegate.call(this, x, y, z, args)
        };
        G__5222.cljs$lang$maxFixedArity = 3;
        G__5222.cljs$lang$applyTo = function(arglist__5223) {
          var x = cljs.core.first(arglist__5223);
          var y = cljs.core.first(cljs.core.next(arglist__5223));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__5223)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__5223)));
          return G__5222__delegate.call(this, x, y, z, args)
        };
        return G__5222
      }();
      G__5221 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__5221__0.call(this);
          case 1:
            return G__5221__1.call(this, x);
          case 2:
            return G__5221__2.call(this, x, y);
          case 3:
            return G__5221__3.call(this, x, y, z);
          default:
            return G__5221__4.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__5221.cljs$lang$maxFixedArity = 3;
      G__5221.cljs$lang$applyTo = G__5221__4.cljs$lang$applyTo;
      return G__5221
    }()
  };
  var juxt__2 = function(f, g) {
    return function() {
      var G__5224 = null;
      var G__5224__0 = function() {
        return cljs.core.vector.call(null, f.call(null), g.call(null))
      };
      var G__5224__1 = function(x) {
        return cljs.core.vector.call(null, f.call(null, x), g.call(null, x))
      };
      var G__5224__2 = function(x, y) {
        return cljs.core.vector.call(null, f.call(null, x, y), g.call(null, x, y))
      };
      var G__5224__3 = function(x, y, z) {
        return cljs.core.vector.call(null, f.call(null, x, y, z), g.call(null, x, y, z))
      };
      var G__5224__4 = function() {
        var G__5225__delegate = function(x, y, z, args) {
          return cljs.core.vector.call(null, cljs.core.apply.call(null, f, x, y, z, args), cljs.core.apply.call(null, g, x, y, z, args))
        };
        var G__5225 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__5225__delegate.call(this, x, y, z, args)
        };
        G__5225.cljs$lang$maxFixedArity = 3;
        G__5225.cljs$lang$applyTo = function(arglist__5226) {
          var x = cljs.core.first(arglist__5226);
          var y = cljs.core.first(cljs.core.next(arglist__5226));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__5226)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__5226)));
          return G__5225__delegate.call(this, x, y, z, args)
        };
        return G__5225
      }();
      G__5224 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__5224__0.call(this);
          case 1:
            return G__5224__1.call(this, x);
          case 2:
            return G__5224__2.call(this, x, y);
          case 3:
            return G__5224__3.call(this, x, y, z);
          default:
            return G__5224__4.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__5224.cljs$lang$maxFixedArity = 3;
      G__5224.cljs$lang$applyTo = G__5224__4.cljs$lang$applyTo;
      return G__5224
    }()
  };
  var juxt__3 = function(f, g, h) {
    return function() {
      var G__5227 = null;
      var G__5227__0 = function() {
        return cljs.core.vector.call(null, f.call(null), g.call(null), h.call(null))
      };
      var G__5227__1 = function(x) {
        return cljs.core.vector.call(null, f.call(null, x), g.call(null, x), h.call(null, x))
      };
      var G__5227__2 = function(x, y) {
        return cljs.core.vector.call(null, f.call(null, x, y), g.call(null, x, y), h.call(null, x, y))
      };
      var G__5227__3 = function(x, y, z) {
        return cljs.core.vector.call(null, f.call(null, x, y, z), g.call(null, x, y, z), h.call(null, x, y, z))
      };
      var G__5227__4 = function() {
        var G__5228__delegate = function(x, y, z, args) {
          return cljs.core.vector.call(null, cljs.core.apply.call(null, f, x, y, z, args), cljs.core.apply.call(null, g, x, y, z, args), cljs.core.apply.call(null, h, x, y, z, args))
        };
        var G__5228 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__5228__delegate.call(this, x, y, z, args)
        };
        G__5228.cljs$lang$maxFixedArity = 3;
        G__5228.cljs$lang$applyTo = function(arglist__5229) {
          var x = cljs.core.first(arglist__5229);
          var y = cljs.core.first(cljs.core.next(arglist__5229));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__5229)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__5229)));
          return G__5228__delegate.call(this, x, y, z, args)
        };
        return G__5228
      }();
      G__5227 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__5227__0.call(this);
          case 1:
            return G__5227__1.call(this, x);
          case 2:
            return G__5227__2.call(this, x, y);
          case 3:
            return G__5227__3.call(this, x, y, z);
          default:
            return G__5227__4.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__5227.cljs$lang$maxFixedArity = 3;
      G__5227.cljs$lang$applyTo = G__5227__4.cljs$lang$applyTo;
      return G__5227
    }()
  };
  var juxt__4 = function() {
    var G__5230__delegate = function(f, g, h, fs) {
      var fs__5220 = cljs.core.list_STAR_.call(null, f, g, h, fs);
      return function() {
        var G__5231 = null;
        var G__5231__0 = function() {
          return cljs.core.reduce.call(null, function(p1__5206_SHARP_, p2__5207_SHARP_) {
            return cljs.core.conj.call(null, p1__5206_SHARP_, p2__5207_SHARP_.call(null))
          }, cljs.core.PersistentVector.fromArray([]), fs__5220)
        };
        var G__5231__1 = function(x) {
          return cljs.core.reduce.call(null, function(p1__5208_SHARP_, p2__5209_SHARP_) {
            return cljs.core.conj.call(null, p1__5208_SHARP_, p2__5209_SHARP_.call(null, x))
          }, cljs.core.PersistentVector.fromArray([]), fs__5220)
        };
        var G__5231__2 = function(x, y) {
          return cljs.core.reduce.call(null, function(p1__5210_SHARP_, p2__5211_SHARP_) {
            return cljs.core.conj.call(null, p1__5210_SHARP_, p2__5211_SHARP_.call(null, x, y))
          }, cljs.core.PersistentVector.fromArray([]), fs__5220)
        };
        var G__5231__3 = function(x, y, z) {
          return cljs.core.reduce.call(null, function(p1__5212_SHARP_, p2__5213_SHARP_) {
            return cljs.core.conj.call(null, p1__5212_SHARP_, p2__5213_SHARP_.call(null, x, y, z))
          }, cljs.core.PersistentVector.fromArray([]), fs__5220)
        };
        var G__5231__4 = function() {
          var G__5232__delegate = function(x, y, z, args) {
            return cljs.core.reduce.call(null, function(p1__5214_SHARP_, p2__5215_SHARP_) {
              return cljs.core.conj.call(null, p1__5214_SHARP_, cljs.core.apply.call(null, p2__5215_SHARP_, x, y, z, args))
            }, cljs.core.PersistentVector.fromArray([]), fs__5220)
          };
          var G__5232 = function(x, y, z, var_args) {
            var args = null;
            if(goog.isDef(var_args)) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
            }
            return G__5232__delegate.call(this, x, y, z, args)
          };
          G__5232.cljs$lang$maxFixedArity = 3;
          G__5232.cljs$lang$applyTo = function(arglist__5233) {
            var x = cljs.core.first(arglist__5233);
            var y = cljs.core.first(cljs.core.next(arglist__5233));
            var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__5233)));
            var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__5233)));
            return G__5232__delegate.call(this, x, y, z, args)
          };
          return G__5232
        }();
        G__5231 = function(x, y, z, var_args) {
          var args = var_args;
          switch(arguments.length) {
            case 0:
              return G__5231__0.call(this);
            case 1:
              return G__5231__1.call(this, x);
            case 2:
              return G__5231__2.call(this, x, y);
            case 3:
              return G__5231__3.call(this, x, y, z);
            default:
              return G__5231__4.apply(this, arguments)
          }
          throw"Invalid arity: " + arguments.length;
        };
        G__5231.cljs$lang$maxFixedArity = 3;
        G__5231.cljs$lang$applyTo = G__5231__4.cljs$lang$applyTo;
        return G__5231
      }()
    };
    var G__5230 = function(f, g, h, var_args) {
      var fs = null;
      if(goog.isDef(var_args)) {
        fs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__5230__delegate.call(this, f, g, h, fs)
    };
    G__5230.cljs$lang$maxFixedArity = 3;
    G__5230.cljs$lang$applyTo = function(arglist__5234) {
      var f = cljs.core.first(arglist__5234);
      var g = cljs.core.first(cljs.core.next(arglist__5234));
      var h = cljs.core.first(cljs.core.next(cljs.core.next(arglist__5234)));
      var fs = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__5234)));
      return G__5230__delegate.call(this, f, g, h, fs)
    };
    return G__5230
  }();
  juxt = function(f, g, h, var_args) {
    var fs = var_args;
    switch(arguments.length) {
      case 1:
        return juxt__1.call(this, f);
      case 2:
        return juxt__2.call(this, f, g);
      case 3:
        return juxt__3.call(this, f, g, h);
      default:
        return juxt__4.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  juxt.cljs$lang$maxFixedArity = 3;
  juxt.cljs$lang$applyTo = juxt__4.cljs$lang$applyTo;
  juxt.cljs$lang$arity$1 = juxt__1;
  juxt.cljs$lang$arity$2 = juxt__2;
  juxt.cljs$lang$arity$3 = juxt__3;
  juxt.cljs$lang$arity$4 = juxt__4;
  return juxt
}();
cljs.core.dorun = function() {
  var dorun = null;
  var dorun__1 = function(coll) {
    while(true) {
      if(cljs.core.truth_(cljs.core.seq.call(null, coll))) {
        var G__5236 = cljs.core.next.call(null, coll);
        coll = G__5236;
        continue
      }else {
        return null
      }
      break
    }
  };
  var dorun__2 = function(n, coll) {
    while(true) {
      if(cljs.core.truth_(function() {
        var and__3546__auto____5235 = cljs.core.seq.call(null, coll);
        if(cljs.core.truth_(and__3546__auto____5235)) {
          return n > 0
        }else {
          return and__3546__auto____5235
        }
      }())) {
        var G__5237 = n - 1;
        var G__5238 = cljs.core.next.call(null, coll);
        n = G__5237;
        coll = G__5238;
        continue
      }else {
        return null
      }
      break
    }
  };
  dorun = function(n, coll) {
    switch(arguments.length) {
      case 1:
        return dorun__1.call(this, n);
      case 2:
        return dorun__2.call(this, n, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  dorun.cljs$lang$arity$1 = dorun__1;
  dorun.cljs$lang$arity$2 = dorun__2;
  return dorun
}();
cljs.core.doall = function() {
  var doall = null;
  var doall__1 = function(coll) {
    cljs.core.dorun.call(null, coll);
    return coll
  };
  var doall__2 = function(n, coll) {
    cljs.core.dorun.call(null, n, coll);
    return coll
  };
  doall = function(n, coll) {
    switch(arguments.length) {
      case 1:
        return doall__1.call(this, n);
      case 2:
        return doall__2.call(this, n, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  doall.cljs$lang$arity$1 = doall__1;
  doall.cljs$lang$arity$2 = doall__2;
  return doall
}();
cljs.core.re_matches = function re_matches(re, s) {
  var matches__5239 = re.exec(s);
  if(cljs.core._EQ_.call(null, cljs.core.first.call(null, matches__5239), s)) {
    if(cljs.core._EQ_.call(null, cljs.core.count.call(null, matches__5239), 1)) {
      return cljs.core.first.call(null, matches__5239)
    }else {
      return cljs.core.vec.call(null, matches__5239)
    }
  }else {
    return null
  }
};
cljs.core.re_find = function re_find(re, s) {
  var matches__5240 = re.exec(s);
  if(matches__5240 === null) {
    return null
  }else {
    if(cljs.core._EQ_.call(null, cljs.core.count.call(null, matches__5240), 1)) {
      return cljs.core.first.call(null, matches__5240)
    }else {
      return cljs.core.vec.call(null, matches__5240)
    }
  }
};
cljs.core.re_seq = function re_seq(re, s) {
  var match_data__5241 = cljs.core.re_find.call(null, re, s);
  var match_idx__5242 = s.search(re);
  var match_str__5243 = cljs.core.coll_QMARK_.call(null, match_data__5241) ? cljs.core.first.call(null, match_data__5241) : match_data__5241;
  var post_match__5244 = cljs.core.subs.call(null, s, match_idx__5242 + cljs.core.count.call(null, match_str__5243));
  if(cljs.core.truth_(match_data__5241)) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, match_data__5241, re_seq.call(null, re, post_match__5244))
    })
  }else {
    return null
  }
};
cljs.core.re_pattern = function re_pattern(s) {
  var vec__5246__5247 = cljs.core.re_find.call(null, /^(?:\(\?([idmsux]*)\))?(.*)/, s);
  var ___5248 = cljs.core.nth.call(null, vec__5246__5247, 0, null);
  var flags__5249 = cljs.core.nth.call(null, vec__5246__5247, 1, null);
  var pattern__5250 = cljs.core.nth.call(null, vec__5246__5247, 2, null);
  return new RegExp(pattern__5250, flags__5249)
};
cljs.core.pr_sequential = function pr_sequential(print_one, begin, sep, end, opts, coll) {
  return cljs.core.concat.call(null, cljs.core.PersistentVector.fromArray([begin]), cljs.core.flatten1.call(null, cljs.core.interpose.call(null, cljs.core.PersistentVector.fromArray([sep]), cljs.core.map.call(null, function(p1__5245_SHARP_) {
    return print_one.call(null, p1__5245_SHARP_, opts)
  }, coll))), cljs.core.PersistentVector.fromArray([end]))
};
cljs.core.string_print = function string_print(x) {
  cljs.core._STAR_print_fn_STAR_.call(null, x);
  return null
};
cljs.core.flush = function flush() {
  return null
};
cljs.core.pr_seq = function pr_seq(obj, opts) {
  if(obj === null) {
    return cljs.core.list.call(null, "nil")
  }else {
    if(void 0 === obj) {
      return cljs.core.list.call(null, "#<undefined>")
    }else {
      if("\ufdd0'else") {
        return cljs.core.concat.call(null, cljs.core.truth_(function() {
          var and__3546__auto____5251 = cljs.core.get.call(null, opts, "\ufdd0'meta");
          if(cljs.core.truth_(and__3546__auto____5251)) {
            var and__3546__auto____5255 = function() {
              var x__384__auto____5252 = obj;
              if(cljs.core.truth_(function() {
                var and__3546__auto____5253 = x__384__auto____5252;
                if(cljs.core.truth_(and__3546__auto____5253)) {
                  var and__3546__auto____5254 = x__384__auto____5252.cljs$core$IMeta$;
                  if(cljs.core.truth_(and__3546__auto____5254)) {
                    return cljs.core.not.call(null, x__384__auto____5252.hasOwnProperty("cljs$core$IMeta$"))
                  }else {
                    return and__3546__auto____5254
                  }
                }else {
                  return and__3546__auto____5253
                }
              }())) {
                return true
              }else {
                return cljs.core.type_satisfies_.call(null, cljs.core.IMeta, x__384__auto____5252)
              }
            }();
            if(cljs.core.truth_(and__3546__auto____5255)) {
              return cljs.core.meta.call(null, obj)
            }else {
              return and__3546__auto____5255
            }
          }else {
            return and__3546__auto____5251
          }
        }()) ? cljs.core.concat.call(null, cljs.core.PersistentVector.fromArray(["^"]), pr_seq.call(null, cljs.core.meta.call(null, obj), opts), cljs.core.PersistentVector.fromArray([" "])) : null, cljs.core.truth_(function() {
          var x__384__auto____5256 = obj;
          if(cljs.core.truth_(function() {
            var and__3546__auto____5257 = x__384__auto____5256;
            if(cljs.core.truth_(and__3546__auto____5257)) {
              var and__3546__auto____5258 = x__384__auto____5256.cljs$core$IPrintable$;
              if(cljs.core.truth_(and__3546__auto____5258)) {
                return cljs.core.not.call(null, x__384__auto____5256.hasOwnProperty("cljs$core$IPrintable$"))
              }else {
                return and__3546__auto____5258
              }
            }else {
              return and__3546__auto____5257
            }
          }())) {
            return true
          }else {
            return cljs.core.type_satisfies_.call(null, cljs.core.IPrintable, x__384__auto____5256)
          }
        }()) ? cljs.core._pr_seq.call(null, obj, opts) : cljs.core.list.call(null, "#<", cljs.core.str.call(null, obj), ">"))
      }else {
        return null
      }
    }
  }
};
cljs.core.pr_sb = function pr_sb(objs, opts) {
  var first_obj__5259 = cljs.core.first.call(null, objs);
  var sb__5260 = new goog.string.StringBuffer;
  var G__5261__5262 = cljs.core.seq.call(null, objs);
  if(cljs.core.truth_(G__5261__5262)) {
    var obj__5263 = cljs.core.first.call(null, G__5261__5262);
    var G__5261__5264 = G__5261__5262;
    while(true) {
      if(obj__5263 === first_obj__5259) {
      }else {
        sb__5260.append(" ")
      }
      var G__5265__5266 = cljs.core.seq.call(null, cljs.core.pr_seq.call(null, obj__5263, opts));
      if(cljs.core.truth_(G__5265__5266)) {
        var string__5267 = cljs.core.first.call(null, G__5265__5266);
        var G__5265__5268 = G__5265__5266;
        while(true) {
          sb__5260.append(string__5267);
          var temp__3698__auto____5269 = cljs.core.next.call(null, G__5265__5268);
          if(cljs.core.truth_(temp__3698__auto____5269)) {
            var G__5265__5270 = temp__3698__auto____5269;
            var G__5273 = cljs.core.first.call(null, G__5265__5270);
            var G__5274 = G__5265__5270;
            string__5267 = G__5273;
            G__5265__5268 = G__5274;
            continue
          }else {
          }
          break
        }
      }else {
      }
      var temp__3698__auto____5271 = cljs.core.next.call(null, G__5261__5264);
      if(cljs.core.truth_(temp__3698__auto____5271)) {
        var G__5261__5272 = temp__3698__auto____5271;
        var G__5275 = cljs.core.first.call(null, G__5261__5272);
        var G__5276 = G__5261__5272;
        obj__5263 = G__5275;
        G__5261__5264 = G__5276;
        continue
      }else {
      }
      break
    }
  }else {
  }
  return sb__5260
};
cljs.core.pr_str_with_opts = function pr_str_with_opts(objs, opts) {
  return cljs.core.str.call(null, cljs.core.pr_sb.call(null, objs, opts))
};
cljs.core.prn_str_with_opts = function prn_str_with_opts(objs, opts) {
  var sb__5277 = cljs.core.pr_sb.call(null, objs, opts);
  sb__5277.append("\n");
  return cljs.core.str.call(null, sb__5277)
};
cljs.core.pr_with_opts = function pr_with_opts(objs, opts) {
  var first_obj__5278 = cljs.core.first.call(null, objs);
  var G__5279__5280 = cljs.core.seq.call(null, objs);
  if(cljs.core.truth_(G__5279__5280)) {
    var obj__5281 = cljs.core.first.call(null, G__5279__5280);
    var G__5279__5282 = G__5279__5280;
    while(true) {
      if(obj__5281 === first_obj__5278) {
      }else {
        cljs.core.string_print.call(null, " ")
      }
      var G__5283__5284 = cljs.core.seq.call(null, cljs.core.pr_seq.call(null, obj__5281, opts));
      if(cljs.core.truth_(G__5283__5284)) {
        var string__5285 = cljs.core.first.call(null, G__5283__5284);
        var G__5283__5286 = G__5283__5284;
        while(true) {
          cljs.core.string_print.call(null, string__5285);
          var temp__3698__auto____5287 = cljs.core.next.call(null, G__5283__5286);
          if(cljs.core.truth_(temp__3698__auto____5287)) {
            var G__5283__5288 = temp__3698__auto____5287;
            var G__5291 = cljs.core.first.call(null, G__5283__5288);
            var G__5292 = G__5283__5288;
            string__5285 = G__5291;
            G__5283__5286 = G__5292;
            continue
          }else {
          }
          break
        }
      }else {
      }
      var temp__3698__auto____5289 = cljs.core.next.call(null, G__5279__5282);
      if(cljs.core.truth_(temp__3698__auto____5289)) {
        var G__5279__5290 = temp__3698__auto____5289;
        var G__5293 = cljs.core.first.call(null, G__5279__5290);
        var G__5294 = G__5279__5290;
        obj__5281 = G__5293;
        G__5279__5282 = G__5294;
        continue
      }else {
        return null
      }
      break
    }
  }else {
    return null
  }
};
cljs.core.newline = function newline(opts) {
  cljs.core.string_print.call(null, "\n");
  if(cljs.core.truth_(cljs.core.get.call(null, opts, "\ufdd0'flush-on-newline"))) {
    return cljs.core.flush.call(null)
  }else {
    return null
  }
};
cljs.core._STAR_flush_on_newline_STAR_ = true;
cljs.core._STAR_print_readably_STAR_ = true;
cljs.core._STAR_print_meta_STAR_ = false;
cljs.core._STAR_print_dup_STAR_ = false;
cljs.core.pr_opts = function pr_opts() {
  return cljs.core.PersistentHashMap.fromArrays(["\ufdd0'flush-on-newline", "\ufdd0'readably", "\ufdd0'meta", "\ufdd0'dup"], [cljs.core._STAR_flush_on_newline_STAR_, cljs.core._STAR_print_readably_STAR_, cljs.core._STAR_print_meta_STAR_, cljs.core._STAR_print_dup_STAR_])
};
cljs.core.pr_str = function() {
  var pr_str__delegate = function(objs) {
    return cljs.core.pr_str_with_opts.call(null, objs, cljs.core.pr_opts.call(null))
  };
  var pr_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return pr_str__delegate.call(this, objs)
  };
  pr_str.cljs$lang$maxFixedArity = 0;
  pr_str.cljs$lang$applyTo = function(arglist__5295) {
    var objs = cljs.core.seq(arglist__5295);
    return pr_str__delegate.call(this, objs)
  };
  return pr_str
}();
cljs.core.prn_str = function() {
  var prn_str__delegate = function(objs) {
    return cljs.core.prn_str_with_opts.call(null, objs, cljs.core.pr_opts.call(null))
  };
  var prn_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return prn_str__delegate.call(this, objs)
  };
  prn_str.cljs$lang$maxFixedArity = 0;
  prn_str.cljs$lang$applyTo = function(arglist__5296) {
    var objs = cljs.core.seq(arglist__5296);
    return prn_str__delegate.call(this, objs)
  };
  return prn_str
}();
cljs.core.pr = function() {
  var pr__delegate = function(objs) {
    return cljs.core.pr_with_opts.call(null, objs, cljs.core.pr_opts.call(null))
  };
  var pr = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return pr__delegate.call(this, objs)
  };
  pr.cljs$lang$maxFixedArity = 0;
  pr.cljs$lang$applyTo = function(arglist__5297) {
    var objs = cljs.core.seq(arglist__5297);
    return pr__delegate.call(this, objs)
  };
  return pr
}();
cljs.core.print = function() {
  var cljs_core_print__delegate = function(objs) {
    return cljs.core.pr_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false))
  };
  var cljs_core_print = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return cljs_core_print__delegate.call(this, objs)
  };
  cljs_core_print.cljs$lang$maxFixedArity = 0;
  cljs_core_print.cljs$lang$applyTo = function(arglist__5298) {
    var objs = cljs.core.seq(arglist__5298);
    return cljs_core_print__delegate.call(this, objs)
  };
  return cljs_core_print
}();
cljs.core.print_str = function() {
  var print_str__delegate = function(objs) {
    return cljs.core.pr_str_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false))
  };
  var print_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return print_str__delegate.call(this, objs)
  };
  print_str.cljs$lang$maxFixedArity = 0;
  print_str.cljs$lang$applyTo = function(arglist__5299) {
    var objs = cljs.core.seq(arglist__5299);
    return print_str__delegate.call(this, objs)
  };
  return print_str
}();
cljs.core.println = function() {
  var println__delegate = function(objs) {
    cljs.core.pr_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false));
    return cljs.core.newline.call(null, cljs.core.pr_opts.call(null))
  };
  var println = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return println__delegate.call(this, objs)
  };
  println.cljs$lang$maxFixedArity = 0;
  println.cljs$lang$applyTo = function(arglist__5300) {
    var objs = cljs.core.seq(arglist__5300);
    return println__delegate.call(this, objs)
  };
  return println
}();
cljs.core.println_str = function() {
  var println_str__delegate = function(objs) {
    return cljs.core.prn_str_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false))
  };
  var println_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return println_str__delegate.call(this, objs)
  };
  println_str.cljs$lang$maxFixedArity = 0;
  println_str.cljs$lang$applyTo = function(arglist__5301) {
    var objs = cljs.core.seq(arglist__5301);
    return println_str__delegate.call(this, objs)
  };
  return println_str
}();
cljs.core.prn = function() {
  var prn__delegate = function(objs) {
    cljs.core.pr_with_opts.call(null, objs, cljs.core.pr_opts.call(null));
    return cljs.core.newline.call(null, cljs.core.pr_opts.call(null))
  };
  var prn = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return prn__delegate.call(this, objs)
  };
  prn.cljs$lang$maxFixedArity = 0;
  prn.cljs$lang$applyTo = function(arglist__5302) {
    var objs = cljs.core.seq(arglist__5302);
    return prn__delegate.call(this, objs)
  };
  return prn
}();
cljs.core.HashMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.HashMap.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  var pr_pair__5303 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__5303, "{", ", ", "}", opts, coll)
};
cljs.core.IPrintable["number"] = true;
cljs.core._pr_seq["number"] = function(n, opts) {
  return cljs.core.list.call(null, cljs.core.str.call(null, n))
};
cljs.core.IndexedSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.Subvec.prototype.cljs$core$IPrintable$ = true;
cljs.core.Subvec.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.PersistentTreeMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentTreeMap.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  var pr_pair__5304 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__5304, "{", ", ", "}", opts, coll)
};
cljs.core.LazySeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.LazySeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.PersistentTreeSet.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentTreeSet.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "#{", " ", "}", opts, coll)
};
cljs.core.IPrintable["boolean"] = true;
cljs.core._pr_seq["boolean"] = function(bool, opts) {
  return cljs.core.list.call(null, cljs.core.str.call(null, bool))
};
cljs.core.Set.prototype.cljs$core$IPrintable$ = true;
cljs.core.Set.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "#{", " ", "}", opts, coll)
};
cljs.core.IPrintable["string"] = true;
cljs.core._pr_seq["string"] = function(obj, opts) {
  if(cljs.core.keyword_QMARK_.call(null, obj)) {
    return cljs.core.list.call(null, cljs.core.str.call(null, ":", function() {
      var temp__3698__auto____5305 = cljs.core.namespace.call(null, obj);
      if(cljs.core.truth_(temp__3698__auto____5305)) {
        var nspc__5306 = temp__3698__auto____5305;
        return cljs.core.str.call(null, nspc__5306, "/")
      }else {
        return null
      }
    }(), cljs.core.name.call(null, obj)))
  }else {
    if(cljs.core.symbol_QMARK_.call(null, obj)) {
      return cljs.core.list.call(null, cljs.core.str.call(null, function() {
        var temp__3698__auto____5307 = cljs.core.namespace.call(null, obj);
        if(cljs.core.truth_(temp__3698__auto____5307)) {
          var nspc__5308 = temp__3698__auto____5307;
          return cljs.core.str.call(null, nspc__5308, "/")
        }else {
          return null
        }
      }(), cljs.core.name.call(null, obj)))
    }else {
      if("\ufdd0'else") {
        return cljs.core.list.call(null, cljs.core.truth_("\ufdd0'readably".call(null, opts)) ? goog.string.quote.call(null, obj) : obj)
      }else {
        return null
      }
    }
  }
};
cljs.core.NodeSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.NodeSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.RedNode.prototype.cljs$core$IPrintable$ = true;
cljs.core.RedNode.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.PersistentHashMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentHashMap.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  var pr_pair__5309 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__5309, "{", ", ", "}", opts, coll)
};
cljs.core.Vector.prototype.cljs$core$IPrintable$ = true;
cljs.core.Vector.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.PersistentVector.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.List.prototype.cljs$core$IPrintable$ = true;
cljs.core.List.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.IPrintable["array"] = true;
cljs.core._pr_seq["array"] = function(a, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "#<Array [", ", ", "]>", opts, a)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.IPrintable["function"] = true;
cljs.core._pr_seq["function"] = function(this$) {
  return cljs.core.list.call(null, "#<", cljs.core.str.call(null, this$), ">")
};
cljs.core.EmptyList.prototype.cljs$core$IPrintable$ = true;
cljs.core.EmptyList.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.list.call(null, "()")
};
cljs.core.BlackNode.prototype.cljs$core$IPrintable$ = true;
cljs.core.BlackNode.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.Cons.prototype.cljs$core$IPrintable$ = true;
cljs.core.Cons.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.Range.prototype.cljs$core$IPrintable$ = true;
cljs.core.Range.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.ArrayNodeSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.ArrayNodeSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.ObjMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.ObjMap.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  var pr_pair__5310 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__5310, "{", ", ", "}", opts, coll)
};
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentTreeMapSeq.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.Atom = function(state, meta, validator, watches) {
  this.state = state;
  this.meta = meta;
  this.validator = validator;
  this.watches = watches
};
cljs.core.Atom.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.Atom")
};
cljs.core.Atom.prototype.cljs$core$IHash$ = true;
cljs.core.Atom.prototype.cljs$core$IHash$_hash$arity$1 = function(this$) {
  var this__5311 = this;
  return goog.getUid.call(null, this$)
};
cljs.core.Atom.prototype.cljs$core$IWatchable$ = true;
cljs.core.Atom.prototype.cljs$core$IWatchable$_notify_watches$arity$3 = function(this$, oldval, newval) {
  var this__5312 = this;
  var G__5313__5314 = cljs.core.seq.call(null, this__5312.watches);
  if(cljs.core.truth_(G__5313__5314)) {
    var G__5316__5318 = cljs.core.first.call(null, G__5313__5314);
    var vec__5317__5319 = G__5316__5318;
    var key__5320 = cljs.core.nth.call(null, vec__5317__5319, 0, null);
    var f__5321 = cljs.core.nth.call(null, vec__5317__5319, 1, null);
    var G__5313__5322 = G__5313__5314;
    var G__5316__5323 = G__5316__5318;
    var G__5313__5324 = G__5313__5322;
    while(true) {
      var vec__5325__5326 = G__5316__5323;
      var key__5327 = cljs.core.nth.call(null, vec__5325__5326, 0, null);
      var f__5328 = cljs.core.nth.call(null, vec__5325__5326, 1, null);
      var G__5313__5329 = G__5313__5324;
      f__5328.call(null, key__5327, this$, oldval, newval);
      var temp__3698__auto____5330 = cljs.core.next.call(null, G__5313__5329);
      if(cljs.core.truth_(temp__3698__auto____5330)) {
        var G__5313__5331 = temp__3698__auto____5330;
        var G__5338 = cljs.core.first.call(null, G__5313__5331);
        var G__5339 = G__5313__5331;
        G__5316__5323 = G__5338;
        G__5313__5324 = G__5339;
        continue
      }else {
        return null
      }
      break
    }
  }else {
    return null
  }
};
cljs.core.Atom.prototype.cljs$core$IWatchable$_add_watch$arity$3 = function(this$, key, f) {
  var this__5332 = this;
  return this$.watches = cljs.core.assoc.call(null, this__5332.watches, key, f)
};
cljs.core.Atom.prototype.cljs$core$IWatchable$_remove_watch$arity$2 = function(this$, key) {
  var this__5333 = this;
  return this$.watches = cljs.core.dissoc.call(null, this__5333.watches, key)
};
cljs.core.Atom.prototype.cljs$core$IPrintable$ = true;
cljs.core.Atom.prototype.cljs$core$IPrintable$_pr_seq$arity$2 = function(a, opts) {
  var this__5334 = this;
  return cljs.core.concat.call(null, cljs.core.PersistentVector.fromArray(["#<Atom: "]), cljs.core._pr_seq.call(null, this__5334.state, opts), ">")
};
cljs.core.Atom.prototype.cljs$core$IMeta$ = true;
cljs.core.Atom.prototype.cljs$core$IMeta$_meta$arity$1 = function(_) {
  var this__5335 = this;
  return this__5335.meta
};
cljs.core.Atom.prototype.cljs$core$IDeref$ = true;
cljs.core.Atom.prototype.cljs$core$IDeref$_deref$arity$1 = function(_) {
  var this__5336 = this;
  return this__5336.state
};
cljs.core.Atom.prototype.cljs$core$IEquiv$ = true;
cljs.core.Atom.prototype.cljs$core$IEquiv$_equiv$arity$2 = function(o, other) {
  var this__5337 = this;
  return o === other
};
cljs.core.Atom;
cljs.core.atom = function() {
  var atom = null;
  var atom__1 = function(x) {
    return new cljs.core.Atom(x, null, null, null)
  };
  var atom__2 = function() {
    var G__5346__delegate = function(x, p__5340) {
      var map__5341__5342 = p__5340;
      var map__5341__5343 = cljs.core.seq_QMARK_.call(null, map__5341__5342) ? cljs.core.apply.call(null, cljs.core.hash_map, map__5341__5342) : map__5341__5342;
      var validator__5344 = cljs.core.get.call(null, map__5341__5343, "\ufdd0'validator");
      var meta__5345 = cljs.core.get.call(null, map__5341__5343, "\ufdd0'meta");
      return new cljs.core.Atom(x, meta__5345, validator__5344, null)
    };
    var G__5346 = function(x, var_args) {
      var p__5340 = null;
      if(goog.isDef(var_args)) {
        p__5340 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__5346__delegate.call(this, x, p__5340)
    };
    G__5346.cljs$lang$maxFixedArity = 1;
    G__5346.cljs$lang$applyTo = function(arglist__5347) {
      var x = cljs.core.first(arglist__5347);
      var p__5340 = cljs.core.rest(arglist__5347);
      return G__5346__delegate.call(this, x, p__5340)
    };
    return G__5346
  }();
  atom = function(x, var_args) {
    var p__5340 = var_args;
    switch(arguments.length) {
      case 1:
        return atom__1.call(this, x);
      default:
        return atom__2.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  atom.cljs$lang$maxFixedArity = 1;
  atom.cljs$lang$applyTo = atom__2.cljs$lang$applyTo;
  atom.cljs$lang$arity$1 = atom__1;
  atom.cljs$lang$arity$2 = atom__2;
  return atom
}();
cljs.core.reset_BANG_ = function reset_BANG_(a, new_value) {
  var temp__3698__auto____5348 = a.validator;
  if(cljs.core.truth_(temp__3698__auto____5348)) {
    var validate__5349 = temp__3698__auto____5348;
    if(cljs.core.truth_(validate__5349.call(null, new_value))) {
    }else {
      throw new Error(cljs.core.str.call(null, "Assert failed: ", "Validator rejected reference state", "\n", cljs.core.pr_str.call(null, cljs.core.with_meta(cljs.core.list("\ufdd1'validate", "\ufdd1'new-value"), cljs.core.hash_map("\ufdd0'line", 5066)))));
    }
  }else {
  }
  var old_value__5350 = a.state;
  a.state = new_value;
  cljs.core._notify_watches.call(null, a, old_value__5350, new_value);
  return new_value
};
cljs.core.swap_BANG_ = function() {
  var swap_BANG_ = null;
  var swap_BANG___2 = function(a, f) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state))
  };
  var swap_BANG___3 = function(a, f, x) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state, x))
  };
  var swap_BANG___4 = function(a, f, x, y) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state, x, y))
  };
  var swap_BANG___5 = function(a, f, x, y, z) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state, x, y, z))
  };
  var swap_BANG___6 = function() {
    var G__5351__delegate = function(a, f, x, y, z, more) {
      return cljs.core.reset_BANG_.call(null, a, cljs.core.apply.call(null, f, a.state, x, y, z, more))
    };
    var G__5351 = function(a, f, x, y, z, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 5), 0)
      }
      return G__5351__delegate.call(this, a, f, x, y, z, more)
    };
    G__5351.cljs$lang$maxFixedArity = 5;
    G__5351.cljs$lang$applyTo = function(arglist__5352) {
      var a = cljs.core.first(arglist__5352);
      var f = cljs.core.first(cljs.core.next(arglist__5352));
      var x = cljs.core.first(cljs.core.next(cljs.core.next(arglist__5352)));
      var y = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__5352))));
      var z = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__5352)))));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__5352)))));
      return G__5351__delegate.call(this, a, f, x, y, z, more)
    };
    return G__5351
  }();
  swap_BANG_ = function(a, f, x, y, z, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return swap_BANG___2.call(this, a, f);
      case 3:
        return swap_BANG___3.call(this, a, f, x);
      case 4:
        return swap_BANG___4.call(this, a, f, x, y);
      case 5:
        return swap_BANG___5.call(this, a, f, x, y, z);
      default:
        return swap_BANG___6.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  swap_BANG_.cljs$lang$maxFixedArity = 5;
  swap_BANG_.cljs$lang$applyTo = swap_BANG___6.cljs$lang$applyTo;
  swap_BANG_.cljs$lang$arity$2 = swap_BANG___2;
  swap_BANG_.cljs$lang$arity$3 = swap_BANG___3;
  swap_BANG_.cljs$lang$arity$4 = swap_BANG___4;
  swap_BANG_.cljs$lang$arity$5 = swap_BANG___5;
  swap_BANG_.cljs$lang$arity$6 = swap_BANG___6;
  return swap_BANG_
}();
cljs.core.compare_and_set_BANG_ = function compare_and_set_BANG_(a, oldval, newval) {
  if(cljs.core._EQ_.call(null, a.state, oldval)) {
    cljs.core.reset_BANG_.call(null, a, newval);
    return true
  }else {
    return false
  }
};
cljs.core.deref = function deref(o) {
  return cljs.core._deref.call(null, o)
};
cljs.core.set_validator_BANG_ = function set_validator_BANG_(iref, val) {
  return iref.validator = val
};
cljs.core.get_validator = function get_validator(iref) {
  return iref.validator
};
cljs.core.alter_meta_BANG_ = function() {
  var alter_meta_BANG___delegate = function(iref, f, args) {
    return iref.meta = cljs.core.apply.call(null, f, iref.meta, args)
  };
  var alter_meta_BANG_ = function(iref, f, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
    }
    return alter_meta_BANG___delegate.call(this, iref, f, args)
  };
  alter_meta_BANG_.cljs$lang$maxFixedArity = 2;
  alter_meta_BANG_.cljs$lang$applyTo = function(arglist__5353) {
    var iref = cljs.core.first(arglist__5353);
    var f = cljs.core.first(cljs.core.next(arglist__5353));
    var args = cljs.core.rest(cljs.core.next(arglist__5353));
    return alter_meta_BANG___delegate.call(this, iref, f, args)
  };
  return alter_meta_BANG_
}();
cljs.core.reset_meta_BANG_ = function reset_meta_BANG_(iref, m) {
  return iref.meta = m
};
cljs.core.add_watch = function add_watch(iref, key, f) {
  return cljs.core._add_watch.call(null, iref, key, f)
};
cljs.core.remove_watch = function remove_watch(iref, key) {
  return cljs.core._remove_watch.call(null, iref, key)
};
cljs.core.gensym_counter = null;
cljs.core.gensym = function() {
  var gensym = null;
  var gensym__0 = function() {
    return gensym.call(null, "G__")
  };
  var gensym__1 = function(prefix_string) {
    if(cljs.core.gensym_counter === null) {
      cljs.core.gensym_counter = cljs.core.atom.call(null, 0)
    }else {
    }
    return cljs.core.symbol.call(null, cljs.core.str.call(null, prefix_string, cljs.core.swap_BANG_.call(null, cljs.core.gensym_counter, cljs.core.inc)))
  };
  gensym = function(prefix_string) {
    switch(arguments.length) {
      case 0:
        return gensym__0.call(this);
      case 1:
        return gensym__1.call(this, prefix_string)
    }
    throw"Invalid arity: " + arguments.length;
  };
  gensym.cljs$lang$arity$0 = gensym__0;
  gensym.cljs$lang$arity$1 = gensym__1;
  return gensym
}();
cljs.core.fixture1 = 1;
cljs.core.fixture2 = 2;
cljs.core.Delay = function(state, f) {
  this.state = state;
  this.f = f
};
cljs.core.Delay.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.Delay")
};
cljs.core.Delay.prototype.cljs$core$IPending$ = true;
cljs.core.Delay.prototype.cljs$core$IPending$_realized_QMARK_$arity$1 = function(d) {
  var this__5354 = this;
  return"\ufdd0'done".call(null, cljs.core.deref.call(null, this__5354.state))
};
cljs.core.Delay.prototype.cljs$core$IDeref$ = true;
cljs.core.Delay.prototype.cljs$core$IDeref$_deref$arity$1 = function(_) {
  var this__5355 = this;
  return"\ufdd0'value".call(null, cljs.core.swap_BANG_.call(null, this__5355.state, function(p__5356) {
    var curr_state__5357 = p__5356;
    var curr_state__5358 = cljs.core.seq_QMARK_.call(null, curr_state__5357) ? cljs.core.apply.call(null, cljs.core.hash_map, curr_state__5357) : curr_state__5357;
    var done__5359 = cljs.core.get.call(null, curr_state__5358, "\ufdd0'done");
    if(cljs.core.truth_(done__5359)) {
      return curr_state__5358
    }else {
      return cljs.core.PersistentHashMap.fromArrays(["\ufdd0'done", "\ufdd0'value"], [true, this__5355.f.call(null)])
    }
  }))
};
cljs.core.Delay;
cljs.core.delay_QMARK_ = function delay_QMARK_(x) {
  return cljs.core.instance_QMARK_.call(null, cljs.core.Delay, x)
};
cljs.core.force = function force(x) {
  if(cljs.core.delay_QMARK_.call(null, x)) {
    return cljs.core.deref.call(null, x)
  }else {
    return x
  }
};
cljs.core.realized_QMARK_ = function realized_QMARK_(d) {
  return cljs.core._realized_QMARK_.call(null, d)
};
cljs.core.js__GT_clj = function() {
  var js__GT_clj__delegate = function(x, options) {
    var map__5360__5361 = options;
    var map__5360__5362 = cljs.core.seq_QMARK_.call(null, map__5360__5361) ? cljs.core.apply.call(null, cljs.core.hash_map, map__5360__5361) : map__5360__5361;
    var keywordize_keys__5363 = cljs.core.get.call(null, map__5360__5362, "\ufdd0'keywordize-keys");
    var keyfn__5364 = cljs.core.truth_(keywordize_keys__5363) ? cljs.core.keyword : cljs.core.str;
    var f__5370 = function thisfn(x) {
      if(cljs.core.seq_QMARK_.call(null, x)) {
        return cljs.core.doall.call(null, cljs.core.map.call(null, thisfn, x))
      }else {
        if(cljs.core.coll_QMARK_.call(null, x)) {
          return cljs.core.into.call(null, cljs.core.empty.call(null, x), cljs.core.map.call(null, thisfn, x))
        }else {
          if(cljs.core.truth_(goog.isArray.call(null, x))) {
            return cljs.core.vec.call(null, cljs.core.map.call(null, thisfn, x))
          }else {
            if(cljs.core.type.call(null, x) === Object) {
              return cljs.core.into.call(null, cljs.core.PersistentHashMap.fromArrays([], []), function() {
                var iter__458__auto____5369 = function iter__5365(s__5366) {
                  return new cljs.core.LazySeq(null, false, function() {
                    var s__5366__5367 = s__5366;
                    while(true) {
                      if(cljs.core.truth_(cljs.core.seq.call(null, s__5366__5367))) {
                        var k__5368 = cljs.core.first.call(null, s__5366__5367);
                        return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([keyfn__5364.call(null, k__5368), thisfn.call(null, x[k__5368])]), iter__5365.call(null, cljs.core.rest.call(null, s__5366__5367)))
                      }else {
                        return null
                      }
                      break
                    }
                  })
                };
                return iter__458__auto____5369.call(null, cljs.core.js_keys.call(null, x))
              }())
            }else {
              if("\ufdd0'else") {
                return x
              }else {
                return null
              }
            }
          }
        }
      }
    };
    return f__5370.call(null, x)
  };
  var js__GT_clj = function(x, var_args) {
    var options = null;
    if(goog.isDef(var_args)) {
      options = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return js__GT_clj__delegate.call(this, x, options)
  };
  js__GT_clj.cljs$lang$maxFixedArity = 1;
  js__GT_clj.cljs$lang$applyTo = function(arglist__5371) {
    var x = cljs.core.first(arglist__5371);
    var options = cljs.core.rest(arglist__5371);
    return js__GT_clj__delegate.call(this, x, options)
  };
  return js__GT_clj
}();
cljs.core.memoize = function memoize(f) {
  var mem__5372 = cljs.core.atom.call(null, cljs.core.PersistentHashMap.fromArrays([], []));
  return function() {
    var G__5376__delegate = function(args) {
      var temp__3695__auto____5373 = cljs.core.get.call(null, cljs.core.deref.call(null, mem__5372), args);
      if(cljs.core.truth_(temp__3695__auto____5373)) {
        var v__5374 = temp__3695__auto____5373;
        return v__5374
      }else {
        var ret__5375 = cljs.core.apply.call(null, f, args);
        cljs.core.swap_BANG_.call(null, mem__5372, cljs.core.assoc, args, ret__5375);
        return ret__5375
      }
    };
    var G__5376 = function(var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
      }
      return G__5376__delegate.call(this, args)
    };
    G__5376.cljs$lang$maxFixedArity = 0;
    G__5376.cljs$lang$applyTo = function(arglist__5377) {
      var args = cljs.core.seq(arglist__5377);
      return G__5376__delegate.call(this, args)
    };
    return G__5376
  }()
};
cljs.core.trampoline = function() {
  var trampoline = null;
  var trampoline__1 = function(f) {
    while(true) {
      var ret__5378 = f.call(null);
      if(cljs.core.fn_QMARK_.call(null, ret__5378)) {
        var G__5379 = ret__5378;
        f = G__5379;
        continue
      }else {
        return ret__5378
      }
      break
    }
  };
  var trampoline__2 = function() {
    var G__5380__delegate = function(f, args) {
      return trampoline.call(null, function() {
        return cljs.core.apply.call(null, f, args)
      })
    };
    var G__5380 = function(f, var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__5380__delegate.call(this, f, args)
    };
    G__5380.cljs$lang$maxFixedArity = 1;
    G__5380.cljs$lang$applyTo = function(arglist__5381) {
      var f = cljs.core.first(arglist__5381);
      var args = cljs.core.rest(arglist__5381);
      return G__5380__delegate.call(this, f, args)
    };
    return G__5380
  }();
  trampoline = function(f, var_args) {
    var args = var_args;
    switch(arguments.length) {
      case 1:
        return trampoline__1.call(this, f);
      default:
        return trampoline__2.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  trampoline.cljs$lang$maxFixedArity = 1;
  trampoline.cljs$lang$applyTo = trampoline__2.cljs$lang$applyTo;
  trampoline.cljs$lang$arity$1 = trampoline__1;
  trampoline.cljs$lang$arity$2 = trampoline__2;
  return trampoline
}();
cljs.core.rand = function() {
  var rand = null;
  var rand__0 = function() {
    return rand.call(null, 1)
  };
  var rand__1 = function(n) {
    return Math.random() * n
  };
  rand = function(n) {
    switch(arguments.length) {
      case 0:
        return rand__0.call(this);
      case 1:
        return rand__1.call(this, n)
    }
    throw"Invalid arity: " + arguments.length;
  };
  rand.cljs$lang$arity$0 = rand__0;
  rand.cljs$lang$arity$1 = rand__1;
  return rand
}();
cljs.core.rand_int = function rand_int(n) {
  return Math.floor(Math.random() * n)
};
cljs.core.rand_nth = function rand_nth(coll) {
  return cljs.core.nth.call(null, coll, cljs.core.rand_int.call(null, cljs.core.count.call(null, coll)))
};
cljs.core.group_by = function group_by(f, coll) {
  return cljs.core.reduce.call(null, function(ret, x) {
    var k__5382 = f.call(null, x);
    return cljs.core.assoc.call(null, ret, k__5382, cljs.core.conj.call(null, cljs.core.get.call(null, ret, k__5382, cljs.core.PersistentVector.fromArray([])), x))
  }, cljs.core.PersistentHashMap.fromArrays([], []), coll)
};
cljs.core.make_hierarchy = function make_hierarchy() {
  return cljs.core.PersistentHashMap.fromArrays(["\ufdd0'parents", "\ufdd0'descendants", "\ufdd0'ancestors"], [cljs.core.PersistentHashMap.fromArrays([], []), cljs.core.PersistentHashMap.fromArrays([], []), cljs.core.PersistentHashMap.fromArrays([], [])])
};
cljs.core.global_hierarchy = cljs.core.atom.call(null, cljs.core.make_hierarchy.call(null));
cljs.core.isa_QMARK_ = function() {
  var isa_QMARK_ = null;
  var isa_QMARK___2 = function(child, parent) {
    return isa_QMARK_.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), child, parent)
  };
  var isa_QMARK___3 = function(h, child, parent) {
    var or__3548__auto____5383 = cljs.core._EQ_.call(null, child, parent);
    if(or__3548__auto____5383) {
      return or__3548__auto____5383
    }else {
      var or__3548__auto____5384 = cljs.core.contains_QMARK_.call(null, "\ufdd0'ancestors".call(null, h).call(null, child), parent);
      if(or__3548__auto____5384) {
        return or__3548__auto____5384
      }else {
        var and__3546__auto____5385 = cljs.core.vector_QMARK_.call(null, parent);
        if(and__3546__auto____5385) {
          var and__3546__auto____5386 = cljs.core.vector_QMARK_.call(null, child);
          if(and__3546__auto____5386) {
            var and__3546__auto____5387 = cljs.core._EQ_.call(null, cljs.core.count.call(null, parent), cljs.core.count.call(null, child));
            if(and__3546__auto____5387) {
              var ret__5388 = true;
              var i__5389 = 0;
              while(true) {
                if(function() {
                  var or__3548__auto____5390 = cljs.core.not.call(null, ret__5388);
                  if(or__3548__auto____5390) {
                    return or__3548__auto____5390
                  }else {
                    return cljs.core._EQ_.call(null, i__5389, cljs.core.count.call(null, parent))
                  }
                }()) {
                  return ret__5388
                }else {
                  var G__5391 = isa_QMARK_.call(null, h, child.call(null, i__5389), parent.call(null, i__5389));
                  var G__5392 = i__5389 + 1;
                  ret__5388 = G__5391;
                  i__5389 = G__5392;
                  continue
                }
                break
              }
            }else {
              return and__3546__auto____5387
            }
          }else {
            return and__3546__auto____5386
          }
        }else {
          return and__3546__auto____5385
        }
      }
    }
  };
  isa_QMARK_ = function(h, child, parent) {
    switch(arguments.length) {
      case 2:
        return isa_QMARK___2.call(this, h, child);
      case 3:
        return isa_QMARK___3.call(this, h, child, parent)
    }
    throw"Invalid arity: " + arguments.length;
  };
  isa_QMARK_.cljs$lang$arity$2 = isa_QMARK___2;
  isa_QMARK_.cljs$lang$arity$3 = isa_QMARK___3;
  return isa_QMARK_
}();
cljs.core.parents = function() {
  var parents = null;
  var parents__1 = function(tag) {
    return parents.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), tag)
  };
  var parents__2 = function(h, tag) {
    return cljs.core.not_empty.call(null, cljs.core.get.call(null, "\ufdd0'parents".call(null, h), tag))
  };
  parents = function(h, tag) {
    switch(arguments.length) {
      case 1:
        return parents__1.call(this, h);
      case 2:
        return parents__2.call(this, h, tag)
    }
    throw"Invalid arity: " + arguments.length;
  };
  parents.cljs$lang$arity$1 = parents__1;
  parents.cljs$lang$arity$2 = parents__2;
  return parents
}();
cljs.core.ancestors = function() {
  var ancestors = null;
  var ancestors__1 = function(tag) {
    return ancestors.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), tag)
  };
  var ancestors__2 = function(h, tag) {
    return cljs.core.not_empty.call(null, cljs.core.get.call(null, "\ufdd0'ancestors".call(null, h), tag))
  };
  ancestors = function(h, tag) {
    switch(arguments.length) {
      case 1:
        return ancestors__1.call(this, h);
      case 2:
        return ancestors__2.call(this, h, tag)
    }
    throw"Invalid arity: " + arguments.length;
  };
  ancestors.cljs$lang$arity$1 = ancestors__1;
  ancestors.cljs$lang$arity$2 = ancestors__2;
  return ancestors
}();
cljs.core.descendants = function() {
  var descendants = null;
  var descendants__1 = function(tag) {
    return descendants.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), tag)
  };
  var descendants__2 = function(h, tag) {
    return cljs.core.not_empty.call(null, cljs.core.get.call(null, "\ufdd0'descendants".call(null, h), tag))
  };
  descendants = function(h, tag) {
    switch(arguments.length) {
      case 1:
        return descendants__1.call(this, h);
      case 2:
        return descendants__2.call(this, h, tag)
    }
    throw"Invalid arity: " + arguments.length;
  };
  descendants.cljs$lang$arity$1 = descendants__1;
  descendants.cljs$lang$arity$2 = descendants__2;
  return descendants
}();
cljs.core.derive = function() {
  var derive = null;
  var derive__2 = function(tag, parent) {
    if(cljs.core.truth_(cljs.core.namespace.call(null, parent))) {
    }else {
      throw new Error(cljs.core.str.call(null, "Assert failed: ", cljs.core.pr_str.call(null, cljs.core.with_meta(cljs.core.list("\ufdd1'namespace", "\ufdd1'parent"), cljs.core.hash_map("\ufdd0'line", 5350)))));
    }
    cljs.core.swap_BANG_.call(null, cljs.core.global_hierarchy, derive, tag, parent);
    return null
  };
  var derive__3 = function(h, tag, parent) {
    if(cljs.core.not_EQ_.call(null, tag, parent)) {
    }else {
      throw new Error(cljs.core.str.call(null, "Assert failed: ", cljs.core.pr_str.call(null, cljs.core.with_meta(cljs.core.list("\ufdd1'not=", "\ufdd1'tag", "\ufdd1'parent"), cljs.core.hash_map("\ufdd0'line", 5354)))));
    }
    var tp__5396 = "\ufdd0'parents".call(null, h);
    var td__5397 = "\ufdd0'descendants".call(null, h);
    var ta__5398 = "\ufdd0'ancestors".call(null, h);
    var tf__5399 = function(m, source, sources, target, targets) {
      return cljs.core.reduce.call(null, function(ret, k) {
        return cljs.core.assoc.call(null, ret, k, cljs.core.reduce.call(null, cljs.core.conj, cljs.core.get.call(null, targets, k, cljs.core.set([])), cljs.core.cons.call(null, target, targets.call(null, target))))
      }, m, cljs.core.cons.call(null, source, sources.call(null, source)))
    };
    var or__3548__auto____5400 = cljs.core.contains_QMARK_.call(null, tp__5396.call(null, tag), parent) ? null : function() {
      if(cljs.core.contains_QMARK_.call(null, ta__5398.call(null, tag), parent)) {
        throw new Error(cljs.core.str.call(null, tag, "already has", parent, "as ancestor"));
      }else {
      }
      if(cljs.core.contains_QMARK_.call(null, ta__5398.call(null, parent), tag)) {
        throw new Error(cljs.core.str.call(null, "Cyclic derivation:", parent, "has", tag, "as ancestor"));
      }else {
      }
      return cljs.core.PersistentHashMap.fromArrays(["\ufdd0'parents", "\ufdd0'ancestors", "\ufdd0'descendants"], [cljs.core.assoc.call(null, "\ufdd0'parents".call(null, h), tag, cljs.core.conj.call(null, cljs.core.get.call(null, tp__5396, tag, cljs.core.set([])), parent)), tf__5399.call(null, "\ufdd0'ancestors".call(null, h), tag, td__5397, parent, ta__5398), tf__5399.call(null, "\ufdd0'descendants".call(null, h), parent, ta__5398, tag, td__5397)])
    }();
    if(cljs.core.truth_(or__3548__auto____5400)) {
      return or__3548__auto____5400
    }else {
      return h
    }
  };
  derive = function(h, tag, parent) {
    switch(arguments.length) {
      case 2:
        return derive__2.call(this, h, tag);
      case 3:
        return derive__3.call(this, h, tag, parent)
    }
    throw"Invalid arity: " + arguments.length;
  };
  derive.cljs$lang$arity$2 = derive__2;
  derive.cljs$lang$arity$3 = derive__3;
  return derive
}();
cljs.core.underive = function() {
  var underive = null;
  var underive__2 = function(tag, parent) {
    cljs.core.swap_BANG_.call(null, cljs.core.global_hierarchy, underive, tag, parent);
    return null
  };
  var underive__3 = function(h, tag, parent) {
    var parentMap__5401 = "\ufdd0'parents".call(null, h);
    var childsParents__5402 = cljs.core.truth_(parentMap__5401.call(null, tag)) ? cljs.core.disj.call(null, parentMap__5401.call(null, tag), parent) : cljs.core.set([]);
    var newParents__5403 = cljs.core.truth_(cljs.core.not_empty.call(null, childsParents__5402)) ? cljs.core.assoc.call(null, parentMap__5401, tag, childsParents__5402) : cljs.core.dissoc.call(null, parentMap__5401, tag);
    var deriv_seq__5404 = cljs.core.flatten.call(null, cljs.core.map.call(null, function(p1__5393_SHARP_) {
      return cljs.core.cons.call(null, cljs.core.first.call(null, p1__5393_SHARP_), cljs.core.interpose.call(null, cljs.core.first.call(null, p1__5393_SHARP_), cljs.core.second.call(null, p1__5393_SHARP_)))
    }, cljs.core.seq.call(null, newParents__5403)));
    if(cljs.core.contains_QMARK_.call(null, parentMap__5401.call(null, tag), parent)) {
      return cljs.core.reduce.call(null, function(p1__5394_SHARP_, p2__5395_SHARP_) {
        return cljs.core.apply.call(null, cljs.core.derive, p1__5394_SHARP_, p2__5395_SHARP_)
      }, cljs.core.make_hierarchy.call(null), cljs.core.partition.call(null, 2, deriv_seq__5404))
    }else {
      return h
    }
  };
  underive = function(h, tag, parent) {
    switch(arguments.length) {
      case 2:
        return underive__2.call(this, h, tag);
      case 3:
        return underive__3.call(this, h, tag, parent)
    }
    throw"Invalid arity: " + arguments.length;
  };
  underive.cljs$lang$arity$2 = underive__2;
  underive.cljs$lang$arity$3 = underive__3;
  return underive
}();
cljs.core.reset_cache = function reset_cache(method_cache, method_table, cached_hierarchy, hierarchy) {
  cljs.core.swap_BANG_.call(null, method_cache, function(_) {
    return cljs.core.deref.call(null, method_table)
  });
  return cljs.core.swap_BANG_.call(null, cached_hierarchy, function(_) {
    return cljs.core.deref.call(null, hierarchy)
  })
};
cljs.core.prefers_STAR_ = function prefers_STAR_(x, y, prefer_table) {
  var xprefs__5405 = cljs.core.deref.call(null, prefer_table).call(null, x);
  var or__3548__auto____5407 = cljs.core.truth_(function() {
    var and__3546__auto____5406 = xprefs__5405;
    if(cljs.core.truth_(and__3546__auto____5406)) {
      return xprefs__5405.call(null, y)
    }else {
      return and__3546__auto____5406
    }
  }()) ? true : null;
  if(cljs.core.truth_(or__3548__auto____5407)) {
    return or__3548__auto____5407
  }else {
    var or__3548__auto____5409 = function() {
      var ps__5408 = cljs.core.parents.call(null, y);
      while(true) {
        if(cljs.core.count.call(null, ps__5408) > 0) {
          if(cljs.core.truth_(prefers_STAR_.call(null, x, cljs.core.first.call(null, ps__5408), prefer_table))) {
          }else {
          }
          var G__5412 = cljs.core.rest.call(null, ps__5408);
          ps__5408 = G__5412;
          continue
        }else {
          return null
        }
        break
      }
    }();
    if(cljs.core.truth_(or__3548__auto____5409)) {
      return or__3548__auto____5409
    }else {
      var or__3548__auto____5411 = function() {
        var ps__5410 = cljs.core.parents.call(null, x);
        while(true) {
          if(cljs.core.count.call(null, ps__5410) > 0) {
            if(cljs.core.truth_(prefers_STAR_.call(null, cljs.core.first.call(null, ps__5410), y, prefer_table))) {
            }else {
            }
            var G__5413 = cljs.core.rest.call(null, ps__5410);
            ps__5410 = G__5413;
            continue
          }else {
            return null
          }
          break
        }
      }();
      if(cljs.core.truth_(or__3548__auto____5411)) {
        return or__3548__auto____5411
      }else {
        return false
      }
    }
  }
};
cljs.core.dominates = function dominates(x, y, prefer_table) {
  var or__3548__auto____5414 = cljs.core.prefers_STAR_.call(null, x, y, prefer_table);
  if(cljs.core.truth_(or__3548__auto____5414)) {
    return or__3548__auto____5414
  }else {
    return cljs.core.isa_QMARK_.call(null, x, y)
  }
};
cljs.core.find_and_cache_best_method = function find_and_cache_best_method(name, dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy) {
  var best_entry__5423 = cljs.core.reduce.call(null, function(be, p__5415) {
    var vec__5416__5417 = p__5415;
    var k__5418 = cljs.core.nth.call(null, vec__5416__5417, 0, null);
    var ___5419 = cljs.core.nth.call(null, vec__5416__5417, 1, null);
    var e__5420 = vec__5416__5417;
    if(cljs.core.isa_QMARK_.call(null, dispatch_val, k__5418)) {
      var be2__5422 = cljs.core.truth_(function() {
        var or__3548__auto____5421 = be === null;
        if(or__3548__auto____5421) {
          return or__3548__auto____5421
        }else {
          return cljs.core.dominates.call(null, k__5418, cljs.core.first.call(null, be), prefer_table)
        }
      }()) ? e__5420 : be;
      if(cljs.core.truth_(cljs.core.dominates.call(null, cljs.core.first.call(null, be2__5422), k__5418, prefer_table))) {
      }else {
        throw new Error(cljs.core.str.call(null, "Multiple methods in multimethod '", name, "' match dispatch value: ", dispatch_val, " -> ", k__5418, " and ", cljs.core.first.call(null, be2__5422), ", and neither is preferred"));
      }
      return be2__5422
    }else {
      return be
    }
  }, null, cljs.core.deref.call(null, method_table));
  if(cljs.core.truth_(best_entry__5423)) {
    if(cljs.core._EQ_.call(null, cljs.core.deref.call(null, cached_hierarchy), cljs.core.deref.call(null, hierarchy))) {
      cljs.core.swap_BANG_.call(null, method_cache, cljs.core.assoc, dispatch_val, cljs.core.second.call(null, best_entry__5423));
      return cljs.core.second.call(null, best_entry__5423)
    }else {
      cljs.core.reset_cache.call(null, method_cache, method_table, cached_hierarchy, hierarchy);
      return find_and_cache_best_method.call(null, name, dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy)
    }
  }else {
    return null
  }
};
void 0;
cljs.core.IMultiFn = {};
cljs.core._reset = function _reset(mf) {
  if(function() {
    var and__3546__auto____5424 = mf;
    if(and__3546__auto____5424) {
      return mf.cljs$core$IMultiFn$_reset$arity$1
    }else {
      return and__3546__auto____5424
    }
  }()) {
    return mf.cljs$core$IMultiFn$_reset$arity$1(mf)
  }else {
    return function() {
      var or__3548__auto____5425 = cljs.core._reset[goog.typeOf.call(null, mf)];
      if(or__3548__auto____5425) {
        return or__3548__auto____5425
      }else {
        var or__3548__auto____5426 = cljs.core._reset["_"];
        if(or__3548__auto____5426) {
          return or__3548__auto____5426
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-reset", mf);
        }
      }
    }().call(null, mf)
  }
};
cljs.core._add_method = function _add_method(mf, dispatch_val, method) {
  if(function() {
    var and__3546__auto____5427 = mf;
    if(and__3546__auto____5427) {
      return mf.cljs$core$IMultiFn$_add_method$arity$3
    }else {
      return and__3546__auto____5427
    }
  }()) {
    return mf.cljs$core$IMultiFn$_add_method$arity$3(mf, dispatch_val, method)
  }else {
    return function() {
      var or__3548__auto____5428 = cljs.core._add_method[goog.typeOf.call(null, mf)];
      if(or__3548__auto____5428) {
        return or__3548__auto____5428
      }else {
        var or__3548__auto____5429 = cljs.core._add_method["_"];
        if(or__3548__auto____5429) {
          return or__3548__auto____5429
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-add-method", mf);
        }
      }
    }().call(null, mf, dispatch_val, method)
  }
};
cljs.core._remove_method = function _remove_method(mf, dispatch_val) {
  if(function() {
    var and__3546__auto____5430 = mf;
    if(and__3546__auto____5430) {
      return mf.cljs$core$IMultiFn$_remove_method$arity$2
    }else {
      return and__3546__auto____5430
    }
  }()) {
    return mf.cljs$core$IMultiFn$_remove_method$arity$2(mf, dispatch_val)
  }else {
    return function() {
      var or__3548__auto____5431 = cljs.core._remove_method[goog.typeOf.call(null, mf)];
      if(or__3548__auto____5431) {
        return or__3548__auto____5431
      }else {
        var or__3548__auto____5432 = cljs.core._remove_method["_"];
        if(or__3548__auto____5432) {
          return or__3548__auto____5432
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-remove-method", mf);
        }
      }
    }().call(null, mf, dispatch_val)
  }
};
cljs.core._prefer_method = function _prefer_method(mf, dispatch_val, dispatch_val_y) {
  if(function() {
    var and__3546__auto____5433 = mf;
    if(and__3546__auto____5433) {
      return mf.cljs$core$IMultiFn$_prefer_method$arity$3
    }else {
      return and__3546__auto____5433
    }
  }()) {
    return mf.cljs$core$IMultiFn$_prefer_method$arity$3(mf, dispatch_val, dispatch_val_y)
  }else {
    return function() {
      var or__3548__auto____5434 = cljs.core._prefer_method[goog.typeOf.call(null, mf)];
      if(or__3548__auto____5434) {
        return or__3548__auto____5434
      }else {
        var or__3548__auto____5435 = cljs.core._prefer_method["_"];
        if(or__3548__auto____5435) {
          return or__3548__auto____5435
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-prefer-method", mf);
        }
      }
    }().call(null, mf, dispatch_val, dispatch_val_y)
  }
};
cljs.core._get_method = function _get_method(mf, dispatch_val) {
  if(function() {
    var and__3546__auto____5436 = mf;
    if(and__3546__auto____5436) {
      return mf.cljs$core$IMultiFn$_get_method$arity$2
    }else {
      return and__3546__auto____5436
    }
  }()) {
    return mf.cljs$core$IMultiFn$_get_method$arity$2(mf, dispatch_val)
  }else {
    return function() {
      var or__3548__auto____5437 = cljs.core._get_method[goog.typeOf.call(null, mf)];
      if(or__3548__auto____5437) {
        return or__3548__auto____5437
      }else {
        var or__3548__auto____5438 = cljs.core._get_method["_"];
        if(or__3548__auto____5438) {
          return or__3548__auto____5438
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-get-method", mf);
        }
      }
    }().call(null, mf, dispatch_val)
  }
};
cljs.core._methods = function _methods(mf) {
  if(function() {
    var and__3546__auto____5439 = mf;
    if(and__3546__auto____5439) {
      return mf.cljs$core$IMultiFn$_methods$arity$1
    }else {
      return and__3546__auto____5439
    }
  }()) {
    return mf.cljs$core$IMultiFn$_methods$arity$1(mf)
  }else {
    return function() {
      var or__3548__auto____5440 = cljs.core._methods[goog.typeOf.call(null, mf)];
      if(or__3548__auto____5440) {
        return or__3548__auto____5440
      }else {
        var or__3548__auto____5441 = cljs.core._methods["_"];
        if(or__3548__auto____5441) {
          return or__3548__auto____5441
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-methods", mf);
        }
      }
    }().call(null, mf)
  }
};
cljs.core._prefers = function _prefers(mf) {
  if(function() {
    var and__3546__auto____5442 = mf;
    if(and__3546__auto____5442) {
      return mf.cljs$core$IMultiFn$_prefers$arity$1
    }else {
      return and__3546__auto____5442
    }
  }()) {
    return mf.cljs$core$IMultiFn$_prefers$arity$1(mf)
  }else {
    return function() {
      var or__3548__auto____5443 = cljs.core._prefers[goog.typeOf.call(null, mf)];
      if(or__3548__auto____5443) {
        return or__3548__auto____5443
      }else {
        var or__3548__auto____5444 = cljs.core._prefers["_"];
        if(or__3548__auto____5444) {
          return or__3548__auto____5444
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-prefers", mf);
        }
      }
    }().call(null, mf)
  }
};
cljs.core._dispatch = function _dispatch(mf, args) {
  if(function() {
    var and__3546__auto____5445 = mf;
    if(and__3546__auto____5445) {
      return mf.cljs$core$IMultiFn$_dispatch$arity$2
    }else {
      return and__3546__auto____5445
    }
  }()) {
    return mf.cljs$core$IMultiFn$_dispatch$arity$2(mf, args)
  }else {
    return function() {
      var or__3548__auto____5446 = cljs.core._dispatch[goog.typeOf.call(null, mf)];
      if(or__3548__auto____5446) {
        return or__3548__auto____5446
      }else {
        var or__3548__auto____5447 = cljs.core._dispatch["_"];
        if(or__3548__auto____5447) {
          return or__3548__auto____5447
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-dispatch", mf);
        }
      }
    }().call(null, mf, args)
  }
};
void 0;
cljs.core.do_dispatch = function do_dispatch(mf, dispatch_fn, args) {
  var dispatch_val__5448 = cljs.core.apply.call(null, dispatch_fn, args);
  var target_fn__5449 = cljs.core._get_method.call(null, mf, dispatch_val__5448);
  if(cljs.core.truth_(target_fn__5449)) {
  }else {
    throw new Error(cljs.core.str.call(null, "No method in multimethod '", cljs.core.name, "' for dispatch value: ", dispatch_val__5448));
  }
  return cljs.core.apply.call(null, target_fn__5449, args)
};
cljs.core.MultiFn = function(name, dispatch_fn, default_dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy) {
  this.name = name;
  this.dispatch_fn = dispatch_fn;
  this.default_dispatch_val = default_dispatch_val;
  this.hierarchy = hierarchy;
  this.method_table = method_table;
  this.prefer_table = prefer_table;
  this.method_cache = method_cache;
  this.cached_hierarchy = cached_hierarchy
};
cljs.core.MultiFn.cljs$core$IPrintable$_pr_seq = function(this__301__auto__) {
  return cljs.core.list.call(null, "cljs.core.MultiFn")
};
cljs.core.MultiFn.prototype.cljs$core$IHash$ = true;
cljs.core.MultiFn.prototype.cljs$core$IHash$_hash$arity$1 = function(this$) {
  var this__5450 = this;
  return goog.getUid.call(null, this$)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$ = true;
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_reset$arity$1 = function(mf) {
  var this__5451 = this;
  cljs.core.swap_BANG_.call(null, this__5451.method_table, function(mf) {
    return cljs.core.PersistentHashMap.fromArrays([], [])
  });
  cljs.core.swap_BANG_.call(null, this__5451.method_cache, function(mf) {
    return cljs.core.PersistentHashMap.fromArrays([], [])
  });
  cljs.core.swap_BANG_.call(null, this__5451.prefer_table, function(mf) {
    return cljs.core.PersistentHashMap.fromArrays([], [])
  });
  cljs.core.swap_BANG_.call(null, this__5451.cached_hierarchy, function(mf) {
    return null
  });
  return mf
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_add_method$arity$3 = function(mf, dispatch_val, method) {
  var this__5452 = this;
  cljs.core.swap_BANG_.call(null, this__5452.method_table, cljs.core.assoc, dispatch_val, method);
  cljs.core.reset_cache.call(null, this__5452.method_cache, this__5452.method_table, this__5452.cached_hierarchy, this__5452.hierarchy);
  return mf
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_remove_method$arity$2 = function(mf, dispatch_val) {
  var this__5453 = this;
  cljs.core.swap_BANG_.call(null, this__5453.method_table, cljs.core.dissoc, dispatch_val);
  cljs.core.reset_cache.call(null, this__5453.method_cache, this__5453.method_table, this__5453.cached_hierarchy, this__5453.hierarchy);
  return mf
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_get_method$arity$2 = function(mf, dispatch_val) {
  var this__5454 = this;
  if(cljs.core._EQ_.call(null, cljs.core.deref.call(null, this__5454.cached_hierarchy), cljs.core.deref.call(null, this__5454.hierarchy))) {
  }else {
    cljs.core.reset_cache.call(null, this__5454.method_cache, this__5454.method_table, this__5454.cached_hierarchy, this__5454.hierarchy)
  }
  var temp__3695__auto____5455 = cljs.core.deref.call(null, this__5454.method_cache).call(null, dispatch_val);
  if(cljs.core.truth_(temp__3695__auto____5455)) {
    var target_fn__5456 = temp__3695__auto____5455;
    return target_fn__5456
  }else {
    var temp__3695__auto____5457 = cljs.core.find_and_cache_best_method.call(null, this__5454.name, dispatch_val, this__5454.hierarchy, this__5454.method_table, this__5454.prefer_table, this__5454.method_cache, this__5454.cached_hierarchy);
    if(cljs.core.truth_(temp__3695__auto____5457)) {
      var target_fn__5458 = temp__3695__auto____5457;
      return target_fn__5458
    }else {
      return cljs.core.deref.call(null, this__5454.method_table).call(null, this__5454.default_dispatch_val)
    }
  }
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_prefer_method$arity$3 = function(mf, dispatch_val_x, dispatch_val_y) {
  var this__5459 = this;
  if(cljs.core.truth_(cljs.core.prefers_STAR_.call(null, dispatch_val_x, dispatch_val_y, this__5459.prefer_table))) {
    throw new Error(cljs.core.str.call(null, "Preference conflict in multimethod '", this__5459.name, "': ", dispatch_val_y, " is already preferred to ", dispatch_val_x));
  }else {
  }
  cljs.core.swap_BANG_.call(null, this__5459.prefer_table, function(old) {
    return cljs.core.assoc.call(null, old, dispatch_val_x, cljs.core.conj.call(null, cljs.core.get.call(null, old, dispatch_val_x, cljs.core.set([])), dispatch_val_y))
  });
  return cljs.core.reset_cache.call(null, this__5459.method_cache, this__5459.method_table, this__5459.cached_hierarchy, this__5459.hierarchy)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_methods$arity$1 = function(mf) {
  var this__5460 = this;
  return cljs.core.deref.call(null, this__5460.method_table)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_prefers$arity$1 = function(mf) {
  var this__5461 = this;
  return cljs.core.deref.call(null, this__5461.prefer_table)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_dispatch$arity$2 = function(mf, args) {
  var this__5462 = this;
  return cljs.core.do_dispatch.call(null, mf, this__5462.dispatch_fn, args)
};
cljs.core.MultiFn;
cljs.core.MultiFn.prototype.call = function() {
  var G__5463__delegate = function(_, args) {
    return cljs.core._dispatch.call(null, this, args)
  };
  var G__5463 = function(_, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return G__5463__delegate.call(this, _, args)
  };
  G__5463.cljs$lang$maxFixedArity = 1;
  G__5463.cljs$lang$applyTo = function(arglist__5464) {
    var _ = cljs.core.first(arglist__5464);
    var args = cljs.core.rest(arglist__5464);
    return G__5463__delegate.call(this, _, args)
  };
  return G__5463
}();
cljs.core.MultiFn.prototype.apply = function(_, args) {
  return cljs.core._dispatch.call(null, this, args)
};
cljs.core.remove_all_methods = function remove_all_methods(multifn) {
  return cljs.core._reset.call(null, multifn)
};
cljs.core.remove_method = function remove_method(multifn, dispatch_val) {
  return cljs.core._remove_method.call(null, multifn, dispatch_val)
};
cljs.core.prefer_method = function prefer_method(multifn, dispatch_val_x, dispatch_val_y) {
  return cljs.core._prefer_method.call(null, multifn, dispatch_val_x, dispatch_val_y)
};
cljs.core.methods$ = function methods$(multifn) {
  return cljs.core._methods.call(null, multifn)
};
cljs.core.get_method = function get_method(multifn, dispatch_val) {
  return cljs.core._get_method.call(null, multifn, dispatch_val)
};
cljs.core.prefers = function prefers(multifn) {
  return cljs.core._prefers.call(null, multifn)
};
goog.provide("cljs.nodejs");
goog.require("cljs.core");
cljs.nodejs.require = require;
cljs.nodejs.process = process;
cljs.core.string_print = cljs.nodejs.require.call(null, "sys").print;
goog.provide("server");
goog.require("cljs.core");
goog.require("cljs.nodejs");
server.express = cljs.nodejs.require.call(null, "express");
server.configure_server = function configure_server(app) {
  return app.use(app.routes)
};
server.init_routes = function init_routes(app) {
  var G__3526__3527 = app;
  G__3526__3527.get("/page/:name", function(req, res) {
    return null
  });
  return G__3526__3527
};
server.start_server = function start_server() {
  var app__3528 = server.express.createServer();
  server.configure_server.call(null, app__3528);
  return app__3528.listen(8080)
};
cljs.core._STAR_main_cli_fn_STAR_ = server.start_server;
goog.provide("cljs.nodejscli");
goog.require("cljs.core");
goog.require("cljs.nodejs");
cljs.core.apply.call(null, cljs.core._STAR_main_cli_fn_STAR_, cljs.core.drop.call(null, 2, cljs.nodejs.process.argv));
