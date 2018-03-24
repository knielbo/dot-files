Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createDecoratedClass = (function () { function defineProperties(target, descriptors, initializers) { for (var i = 0; i < descriptors.length; i++) { var descriptor = descriptors[i]; var decorators = descriptor.decorators; var key = descriptor.key; delete descriptor.key; delete descriptor.decorators; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor || descriptor.initializer) descriptor.writable = true; if (decorators) { for (var f = 0; f < decorators.length; f++) { var decorator = decorators[f]; if (typeof decorator === "function") { descriptor = decorator(target, key, descriptor) || descriptor; } else { throw new TypeError("The decorator for method " + descriptor.key + " is of the invalid type " + typeof decorator); } } if (descriptor.initializer !== undefined) { initializers[key] = descriptor; continue; } } Object.defineProperty(target, key, descriptor); } } return function (Constructor, protoProps, staticProps, protoInitializers, staticInitializers) { if (protoProps) defineProperties(Constructor.prototype, protoProps, protoInitializers); if (staticProps) defineProperties(Constructor, staticProps, staticInitializers); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineDecoratedPropertyDescriptor(target, key, descriptors) { var _descriptor = descriptors[key]; if (!_descriptor) return; var descriptor = {}; for (var _key in _descriptor) descriptor[_key] = _descriptor[_key]; descriptor.value = descriptor.initializer ? descriptor.initializer.call(target) : undefined; Object.defineProperty(target, key, descriptor); }

var _atom = require("atom");

var _mobx = require("mobx");

var _utils = require("./../utils");

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _config = require("./../config");

var _config2 = _interopRequireDefault(_config);

var _codeManager = require("./../code-manager");

var codeManager = _interopRequireWildcard(_codeManager);

var _markers = require("./markers");

var _markers2 = _interopRequireDefault(_markers);

var _kernelManager = require("./../kernel-manager");

var _kernelManager2 = _interopRequireDefault(_kernelManager);

var _kernel = require("./../kernel");

var _kernel2 = _interopRequireDefault(_kernel);

var commutable = require("@nteract/commutable");

var Store = (function () {
  var _instanceInitializers = {};

  function Store() {
    _classCallCheck(this, Store);

    this.subscriptions = new _atom.CompositeDisposable();
    this.markers = new _markers2["default"]();
    this.runningKernels = (0, _mobx.observable)([]);

    _defineDecoratedPropertyDescriptor(this, "kernelMapping", _instanceInitializers);

    _defineDecoratedPropertyDescriptor(this, "startingKernels", _instanceInitializers);

    _defineDecoratedPropertyDescriptor(this, "editor", _instanceInitializers);

    _defineDecoratedPropertyDescriptor(this, "grammar", _instanceInitializers);

    _defineDecoratedPropertyDescriptor(this, "configMapping", _instanceInitializers);
  }

  _createDecoratedClass(Store, [{
    key: "startKernel",
    decorators: [_mobx.action],
    value: function startKernel(kernelDisplayName) {
      this.startingKernels.set(kernelDisplayName, true);
    }
  }, {
    key: "newKernel",
    decorators: [_mobx.action],
    value: function newKernel(kernel, filePath, editor, grammar) {
      if ((0, _utils.isMultilanguageGrammar)(editor.getGrammar())) {
        var old = this.kernelMapping.get(filePath);
        var newMap = old && old instanceof _kernel2["default"] === false ? old : {};
        newMap[grammar.name] = kernel;
        this.kernelMapping.set(filePath, newMap);
      } else {
        this.kernelMapping.set(filePath, kernel);
      }
      var index = this.runningKernels.findIndex(function (k) {
        return k === kernel;
      });
      if (index === -1) {
        this.runningKernels.push(kernel);
      }
      // delete startingKernel since store.kernel now in place to prevent duplicate kernel
      this.startingKernels["delete"](kernel.kernelSpec.display_name);
    }
  }, {
    key: "deleteKernel",
    decorators: [_mobx.action],
    value: function deleteKernel(kernel) {
      var _this = this;

      this._iterateOverKernels(kernel, function (_, file) {
        _this.kernelMapping["delete"](file);
      }, function (map, _, grammar) {
        map[grammar] = null;
        delete map[grammar];
      });

      this.runningKernels.remove(kernel);
    }
  }, {
    key: "_iterateOverKernels",
    value: function _iterateOverKernels(kernel, func) {
      var func2 = arguments.length <= 2 || arguments[2] === undefined ? func : arguments[2];
      return (function () {
        this.kernelMapping.forEach(function (kernelOrObj, file) {
          if (kernelOrObj === kernel) {
            func(kernel, file);
          }

          if (kernelOrObj instanceof _kernel2["default"] === false) {
            _lodash2["default"].forEach(kernelOrObj, function (k, grammar) {
              if (k === kernel) {
                func2(kernelOrObj, file, grammar);
              }
            });
          }
        });
      }).apply(this, arguments);
    }
  }, {
    key: "getFilesForKernel",
    value: function getFilesForKernel(kernel) {
      var files = [];
      this._iterateOverKernels(kernel, function (_, file) {
        return files.push(file);
      });
      return files;
    }
  }, {
    key: "dispose",
    decorators: [_mobx.action],
    value: function dispose() {
      this.subscriptions.dispose();
      this.markers.clear();
      this.runningKernels.forEach(function (kernel) {
        return kernel.destroy();
      });
      this.runningKernels.clear();
      this.kernelMapping.clear();
    }
  }, {
    key: "updateEditor",
    decorators: [_mobx.action],
    value: function updateEditor(editor) {
      this.editor = editor;
      this.setGrammar(editor);
    }
  }, {
    key: "setGrammar",
    decorators: [_mobx.action],
    value: function setGrammar(editor) {
      if (!editor) {
        this.grammar = null;
        return;
      }

      var grammar = editor.getGrammar();

      if ((0, _utils.isMultilanguageGrammar)(grammar)) {
        var embeddedScope = (0, _utils.getEmbeddedScope)(editor, editor.getCursorBufferPosition());

        if (embeddedScope) {
          var scope = embeddedScope.replace(".embedded", "");
          grammar = atom.grammars.grammarForScopeName(scope);
        }
      }

      this.grammar = grammar;
    }
  }, {
    key: "setConfigValue",
    decorators: [_mobx.action],
    value: function setConfigValue(keyPath, newValue) {
      if (!newValue) {
        newValue = atom.config.get(keyPath);
      }
      this.configMapping.set(keyPath, newValue);
    }
  }, {
    key: "forceEditorUpdate",
    value: function forceEditorUpdate() {
      // Force mobx to recalculate filePath (which depends on editor observable)

      var currentEditor = this.editor;
      this.updateEditor(null);
      this.updateEditor(currentEditor);
    }
  }, {
    key: "kernelMapping",
    decorators: [_mobx.observable],
    initializer: function initializer() {
      return new Map();
    },
    enumerable: true
  }, {
    key: "startingKernels",
    decorators: [_mobx.observable],
    initializer: function initializer() {
      return new Map();
    },
    enumerable: true
  }, {
    key: "editor",
    decorators: [_mobx.observable],
    initializer: function initializer() {
      return atom.workspace.getActiveTextEditor();
    },
    enumerable: true
  }, {
    key: "grammar",
    decorators: [_mobx.observable],
    initializer: null,
    enumerable: true
  }, {
    key: "configMapping",
    decorators: [_mobx.observable],
    initializer: function initializer() {
      return new Map();
    },
    enumerable: true
  }, {
    key: "kernel",
    decorators: [_mobx.computed],
    get: function get() {
      if (!this.filePath) return null;
      var kernel = this.kernelMapping.get(this.filePath);
      if (!kernel || kernel instanceof _kernel2["default"]) return kernel;
      if (this.grammar) return kernel[this.grammar.name];
    }
  }, {
    key: "filePath",
    decorators: [_mobx.computed],
    get: function get() {
      return this.editor ? this.editor.getPath() : null;
    }
  }, {
    key: "notebook",
    decorators: [_mobx.computed],
    get: function get() {
      var editor = this.editor;
      if (!editor) {
        return null;
      }
      // Should we consider starting off with a monocellNotebook ?
      var notebook = commutable.emptyNotebook;
      var cellRanges = codeManager.getCells(editor);
      _lodash2["default"].forEach(cellRanges, function (cell) {
        var start = cell.start;
        var end = cell.end;

        var source = codeManager.getTextInRange(editor, start, end);
        source = source ? source : "";
        var newCell = commutable.emptyCodeCell.set("source", source);
        notebook = commutable.appendCellToNotebook(notebook, newCell);
      });
      return commutable.toJS(notebook);
    }
  }], null, _instanceInitializers);

  return Store;
})();

exports.Store = Store;

var store = new Store();
exports["default"] = store;

// For debugging
window.hydrogen_store = store;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvSHlkcm9nZW4vbGliL3N0b3JlL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O29CQUVvQyxNQUFNOztvQkFDRyxNQUFNOztxQkFDTSxZQUFZOztzQkFDdkQsUUFBUTs7OztzQkFFSCxhQUFhOzs7OzJCQUNILG1CQUFtQjs7SUFBcEMsV0FBVzs7dUJBQ0MsV0FBVzs7Ozs2QkFDVCxxQkFBcUI7Ozs7c0JBQzVCLGFBQWE7Ozs7QUFJaEMsSUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7O0lBRXJDLEtBQUs7OztXQUFMLEtBQUs7MEJBQUwsS0FBSzs7U0FDaEIsYUFBYSxHQUFHLCtCQUF5QjtTQUN6QyxPQUFPLEdBQUcsMEJBQWlCO1NBQzNCLGNBQWMsR0FBNkIsc0JBQVcsRUFBRSxDQUFDOzs7Ozs7Ozs7Ozs7O3dCQUg5QyxLQUFLOzs7V0EyQ0wscUJBQUMsaUJBQXlCLEVBQUU7QUFDckMsVUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDbkQ7Ozs7V0FHUSxtQkFDUCxNQUFjLEVBQ2QsUUFBZ0IsRUFDaEIsTUFBdUIsRUFDdkIsT0FBcUIsRUFDckI7QUFDQSxVQUFJLG1DQUF1QixNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRTtBQUMvQyxZQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM3QyxZQUFNLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRywrQkFBa0IsS0FBSyxLQUFLLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQztBQUNqRSxjQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQztBQUM5QixZQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENB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QztLQUNsQzs7O1NBeENVLEtBQUs7Ozs7O0FBd0tsQixJQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO3FCQUNYLEtBQUs7OztBQUdwQixNQUFNLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyIsImZpbGUiOiIvaG9tZS9rbmllbGJvLy5hdG9tL3BhY2thZ2VzL0h5ZHJvZ2VuL2xpYi9zdG9yZS9pbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIEBmbG93ICovXG5cbmltcG9ydCB7IENvbXBvc2l0ZURpc3Bvc2FibGUgfSBmcm9tIFwiYXRvbVwiO1xuaW1wb3J0IHsgb2JzZXJ2YWJsZSwgY29tcHV0ZWQsIGFjdGlvbiB9IGZyb20gXCJtb2J4XCI7XG5pbXBvcnQgeyBpc011bHRpbGFuZ3VhZ2VHcmFtbWFyLCBnZXRFbWJlZGRlZFNjb3BlIH0gZnJvbSBcIi4vLi4vdXRpbHNcIjtcbmltcG9ydCBfIGZyb20gXCJsb2Rhc2hcIjtcblxuaW1wb3J0IENvbmZpZyBmcm9tIFwiLi8uLi9jb25maWdcIjtcbmltcG9ydCAqIGFzIGNvZGVNYW5hZ2VyIGZyb20gXCIuLy4uL2NvZGUtbWFuYWdlclwiO1xuaW1wb3J0IE1hcmtlclN0b3JlIGZyb20gXCIuL21hcmtlcnNcIjtcbmltcG9ydCBrZXJuZWxNYW5hZ2VyIGZyb20gXCIuLy4uL2tlcm5lbC1tYW5hZ2VyXCI7XG5pbXBvcnQgS2VybmVsIGZyb20gXCIuLy4uL2tlcm5lbFwiO1xuXG5pbXBvcnQgdHlwZSB7IElPYnNlcnZhYmxlQXJyYXkgfSBmcm9tIFwibW9ieFwiO1xuXG5jb25zdCBjb21tdXRhYmxlID0gcmVxdWlyZShcIkBudGVyYWN0L2NvbW11dGFibGVcIik7XG5cbmV4cG9ydCBjbGFzcyBTdG9yZSB7XG4gIHN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpO1xuICBtYXJrZXJzID0gbmV3IE1hcmtlclN0b3JlKCk7XG4gIHJ1bm5pbmdLZXJuZWxzOiBJT2JzZXJ2YWJsZUFycmF5PEtlcm5lbD4gPSBvYnNlcnZhYmxlKFtdKTtcbiAgQG9ic2VydmFibGUga2VybmVsTWFwcGluZzogS2VybmVsTWFwcGluZyA9IG5ldyBNYXAoKTtcbiAgQG9ic2VydmFibGUgc3RhcnRpbmdLZXJuZWxzOiBNYXA8c3RyaW5nLCBib29sZWFuPiA9IG5ldyBNYXAoKTtcbiAgQG9ic2VydmFibGUgZWRpdG9yID0gYXRvbS53b3Jrc3BhY2UuZ2V0QWN0aXZlVGV4dEVkaXRvcigpO1xuICBAb2JzZXJ2YWJsZSBncmFtbWFyOiA/YXRvbSRHcmFtbWFyO1xuICBAb2JzZXJ2YWJsZSBjb25maWdNYXBwaW5nOiBNYXA8c3RyaW5nLCA/bWl4ZWQ+ID0gbmV3IE1hcCgpO1xuXG4gIEBjb21wdXRlZFxuICBnZXQga2VybmVsKCk6ID9LZXJuZWwge1xuICAgIGlmICghdGhpcy5maWxlUGF0aCkgcmV0dXJuIG51bGw7XG4gICAgY29uc3Qga2VybmVsID0gdGhpcy5rZXJuZWxNYXBwaW5nLmdldCh0aGlzLmZpbGVQYXRoKTtcbiAgICBpZiAoIWtlcm5lbCB8fCBrZXJuZWwgaW5zdGFuY2VvZiBLZXJuZWwpIHJldHVybiBrZXJuZWw7XG4gICAgaWYgKHRoaXMuZ3JhbW1hcikgcmV0dXJuIGtlcm5lbFt0aGlzLmdyYW1tYXIubmFtZV07XG4gIH1cblxuICBAY29tcHV0ZWRcbiAgZ2V0IGZpbGVQYXRoKCk6ID9zdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmVkaXRvciA/IHRoaXMuZWRpdG9yLmdldFBhdGgoKSA6IG51bGw7XG4gIH1cblxuICBAY29tcHV0ZWRcbiAgZ2V0IG5vdGVib29rKCkge1xuICAgIGNvbnN0IGVkaXRvciA9IHRoaXMuZWRpdG9yO1xuICAgIGlmICghZWRpdG9yKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgLy8gU2hvdWxkIHdlIGNvbnNpZGVyIHN0YXJ0aW5nIG9mZiB3aXRoIGEgbW9ub2NlbGxOb3RlYm9vayA/XG4gICAgbGV0IG5vdGVib29rID0gY29tbXV0YWJsZS5lbXB0eU5vdGVib29rO1xuICAgIGNvbnN0IGNlbGxSYW5nZXMgPSBjb2RlTWFuYWdlci5nZXRDZWxscyhlZGl0b3IpO1xuICAgIF8uZm9yRWFjaChjZWxsUmFuZ2VzLCBjZWxsID0+IHtcbiAgICAgIGNvbnN0IHsgc3RhcnQsIGVuZCB9ID0gY2VsbDtcbiAgICAgIGxldCBzb3VyY2UgPSBjb2RlTWFuYWdlci5nZXRUZXh0SW5SYW5nZShlZGl0b3IsIHN0YXJ0LCBlbmQpO1xuICAgICAgc291cmNlID0gc291cmNlID8gc291cmNlIDogXCJcIjtcbiAgICAgIGNvbnN0IG5ld0NlbGwgPSBjb21tdXRhYmxlLmVtcHR5Q29kZUNlbGwuc2V0KFwic291cmNlXCIsIHNvdXJjZSk7XG4gICAgICBub3RlYm9vayA9IGNvbW11dGFibGUuYXBwZW5kQ2VsbFRvTm90ZWJvb2sobm90ZWJvb2ssIG5ld0NlbGwpO1xuICAgIH0pO1xuICAgIHJldHVybiBjb21tdXRhYmxlLnRvSlMobm90ZWJvb2spO1xuICB9XG5cbiAgQGFjdGlvblxuICBzdGFydEtlcm5lbChrZXJuZWxEaXNwbGF5TmFtZTogc3RyaW5nKSB7XG4gICAgdGhpcy5zdGFydGluZ0tlcm5lbHMuc2V0KGtlcm5lbERpc3BsYXlOYW1lLCB0cnVlKTtcbiAgfVxuXG4gIEBhY3Rpb25cbiAgbmV3S2VybmVsKFxuICAgIGtlcm5lbDogS2VybmVsLFxuICAgIGZpbGVQYXRoOiBzdHJpbmcsXG4gICAgZWRpdG9yOiBhdG9tJFRleHRFZGl0b3IsXG4gICAgZ3JhbW1hcjogYXRvbSRHcmFtbWFyXG4gICkge1xuICAgIGlmIChpc011bHRpbGFuZ3VhZ2VHcmFtbWFyKGVkaXRvci5nZXRHcmFtbWFyKCkpKSB7XG4gICAgICBjb25zdCBvbGQgPSB0aGlzLmtlcm5lbE1hcHBpbmcuZ2V0KGZpbGVQYXRoKTtcbiAgICAgIGNvbnN0IG5ld01hcCA9IG9sZCAmJiBvbGQgaW5zdGFuY2VvZiBLZXJuZWwgPT09IGZhbHNlID8gb2xkIDoge307XG4gICAgICBuZXdNYXBbZ3JhbW1hci5uYW1lXSA9IGtlcm5lbDtcbiAgICAgIHRoaXMua2VybmVsTWFwcGluZy5zZXQoZmlsZVBhdGgsIG5ld01hcCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMua2VybmVsTWFwcGluZy5zZXQoZmlsZVBhdGgsIGtlcm5lbCk7XG4gICAgfVxuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5ydW5uaW5nS2VybmVscy5maW5kSW5kZXgoayA9PiBrID09PSBrZXJuZWwpO1xuICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgIHRoaXMucnVubmluZ0tlcm5lbHMucHVzaChrZXJuZWwpO1xuICAgIH1cbiAgICAvLyBkZWxldGUgc3RhcnRpbmdLZXJuZWwgc2luY2Ugc3RvcmUua2VybmVsIG5vdyBpbiBwbGFjZSB0byBwcmV2ZW50IGR1cGxpY2F0ZSBrZXJuZWxcbiAgICB0aGlzLnN0YXJ0aW5nS2VybmVscy5kZWxldGUoa2VybmVsLmtlcm5lbFNwZWMuZGlzcGxheV9uYW1lKTtcbiAgfVxuXG4gIEBhY3Rpb25cbiAgZGVsZXRlS2VybmVsKGtlcm5lbDogS2VybmVsKSB7XG4gICAgdGhpcy5faXRlcmF0ZU92ZXJLZXJuZWxzKFxuICAgICAga2VybmVsLFxuICAgICAgKF8sIGZpbGUpID0+IHtcbiAgICAgICAgdGhpcy5rZXJuZWxNYXBwaW5nLmRlbGV0ZShmaWxlKTtcbiAgICAgIH0sXG4gICAgICAobWFwLCBfLCBncmFtbWFyKSA9PiB7XG4gICAgICAgIG1hcFtncmFtbWFyXSA9IG51bGw7XG4gICAgICAgIGRlbGV0ZSBtYXBbZ3JhbW1hcl07XG4gICAgICB9XG4gICAgKTtcblxuICAgIHRoaXMucnVubmluZ0tlcm5lbHMucmVtb3ZlKGtlcm5lbCk7XG4gIH1cblxuICBfaXRlcmF0ZU92ZXJLZXJuZWxzKFxuICAgIGtlcm5lbDogS2VybmVsLFxuICAgIGZ1bmM6IChrZXJuZWw6IEtlcm5lbCB8IEtlcm5lbE9iaiwgZmlsZTogc3RyaW5nKSA9PiBtaXhlZCxcbiAgICBmdW5jMjogKG9iajogS2VybmVsT2JqLCBmaWxlOiBzdHJpbmcsIGdyYW1tYXI6IHN0cmluZykgPT4gbWl4ZWQgPSBmdW5jXG4gICkge1xuICAgIHRoaXMua2VybmVsTWFwcGluZy5mb3JFYWNoKChrZXJuZWxPck9iaiwgZmlsZSkgPT4ge1xuICAgICAgaWYgKGtlcm5lbE9yT2JqID09PSBrZXJuZWwpIHtcbiAgICAgICAgZnVuYyhrZXJuZWwsIGZpbGUpO1xuICAgICAgfVxuXG4gICAgICBpZiAoa2VybmVsT3JPYmogaW5zdGFuY2VvZiBLZXJuZWwgPT09IGZhbHNlKSB7XG4gICAgICAgIF8uZm9yRWFjaChrZXJuZWxPck9iaiwgKGssIGdyYW1tYXIpID0+IHtcbiAgICAgICAgICBpZiAoayA9PT0ga2VybmVsKSB7XG4gICAgICAgICAgICBmdW5jMihrZXJuZWxPck9iaiwgZmlsZSwgZ3JhbW1hcik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGdldEZpbGVzRm9yS2VybmVsKGtlcm5lbDogS2VybmVsKSB7XG4gICAgY29uc3QgZmlsZXMgPSBbXTtcbiAgICB0aGlzLl9pdGVyYXRlT3Zlcktlcm5lbHMoa2VybmVsLCAoXywgZmlsZSkgPT4gZmlsZXMucHVzaChmaWxlKSk7XG4gICAgcmV0dXJuIGZpbGVzO1xuICB9XG5cbiAgQGFjdGlvblxuICBkaXNwb3NlKCkge1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5kaXNwb3NlKCk7XG4gICAgdGhpcy5tYXJrZXJzLmNsZWFyKCk7XG4gICAgdGhpcy5ydW5uaW5nS2VybmVscy5mb3JFYWNoKGtlcm5lbCA9PiBrZXJuZWwuZGVzdHJveSgpKTtcbiAgICB0aGlzLnJ1bm5pbmdLZXJuZWxzLmNsZWFyKCk7XG4gICAgdGhpcy5rZXJuZWxNYXBwaW5nLmNsZWFyKCk7XG4gIH1cblxuICBAYWN0aW9uXG4gIHVwZGF0ZUVkaXRvcihlZGl0b3I6ID9hdG9tJFRleHRFZGl0b3IpIHtcbiAgICB0aGlzLmVkaXRvciA9IGVkaXRvcjtcbiAgICB0aGlzLnNldEdyYW1tYXIoZWRpdG9yKTtcbiAgfVxuXG4gIEBhY3Rpb25cbiAgc2V0R3JhbW1hcihlZGl0b3I6ID9hdG9tJFRleHRFZGl0b3IpIHtcbiAgICBpZiAoIWVkaXRvcikge1xuICAgICAgdGhpcy5ncmFtbWFyID0gbnVsbDtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgZ3JhbW1hciA9IGVkaXRvci5nZXRHcmFtbWFyKCk7XG5cbiAgICBpZiAoaXNNdWx0aWxhbmd1YWdlR3JhbW1hcihncmFtbWFyKSkge1xuICAgICAgY29uc3QgZW1iZWRkZWRTY29wZSA9IGdldEVtYmVkZGVkU2NvcGUoXG4gICAgICAgIGVkaXRvcixcbiAgICAgICAgZWRpdG9yLmdldEN1cnNvckJ1ZmZlclBvc2l0aW9uKClcbiAgICAgICk7XG5cbiAgICAgIGlmIChlbWJlZGRlZFNjb3BlKSB7XG4gICAgICAgIGNvbnN0IHNjb3BlID0gZW1iZWRkZWRTY29wZS5yZXBsYWNlKFwiLmVtYmVkZGVkXCIsIFwiXCIpO1xuICAgICAgICBncmFtbWFyID0gYXRvbS5ncmFtbWFycy5ncmFtbWFyRm9yU2NvcGVOYW1lKHNjb3BlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmdyYW1tYXIgPSBncmFtbWFyO1xuICB9XG5cbiAgQGFjdGlvblxuICBzZXRDb25maWdWYWx1ZShrZXlQYXRoOiBzdHJpbmcsIG5ld1ZhbHVlOiA/bWl4ZWQpIHtcbiAgICBpZiAoIW5ld1ZhbHVlKSB7XG4gICAgICBuZXdWYWx1ZSA9IGF0b20uY29uZmlnLmdldChrZXlQYXRoKTtcbiAgICB9XG4gICAgdGhpcy5jb25maWdNYXBwaW5nLnNldChrZXlQYXRoLCBuZXdWYWx1ZSk7XG4gIH1cblxuICBmb3JjZUVkaXRvclVwZGF0ZSgpIHtcbiAgICAvLyBGb3JjZSBtb2J4IHRvIHJlY2FsY3VsYXRlIGZpbGVQYXRoICh3aGljaCBkZXBlbmRzIG9uIGVkaXRvciBvYnNlcnZhYmxlKVxuXG4gICAgY29uc3QgY3VycmVudEVkaXRvciA9IHRoaXMuZWRpdG9yO1xuICAgIHRoaXMudXBkYXRlRWRpdG9yKG51bGwpO1xuICAgIHRoaXMudXBkYXRlRWRpdG9yKGN1cnJlbnRFZGl0b3IpO1xuICB9XG59XG5cbmNvbnN0IHN0b3JlID0gbmV3IFN0b3JlKCk7XG5leHBvcnQgZGVmYXVsdCBzdG9yZTtcblxuLy8gRm9yIGRlYnVnZ2luZ1xud2luZG93Lmh5ZHJvZ2VuX3N0b3JlID0gc3RvcmU7XG4iXX0=