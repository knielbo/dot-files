Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, "next"); var callThrow = step.bind(null, "throw"); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _kernelspecs = require("kernelspecs");

var kernelspecs = _interopRequireWildcard(_kernelspecs);

var _spawnteract = require("spawnteract");

var _electron = require("electron");

var _zmqKernel = require("./zmq-kernel");

var _zmqKernel2 = _interopRequireDefault(_zmqKernel);

var _kernel = require("./kernel");

var _kernel2 = _interopRequireDefault(_kernel);

var _kernelPicker = require("./kernel-picker");

var _kernelPicker2 = _interopRequireDefault(_kernelPicker);

var _store = require("./store");

var _store2 = _interopRequireDefault(_store);

var _utils = require("./utils");

var ks = kernelspecs;

exports.ks = ks;

var KernelManager = (function () {
  function KernelManager() {
    _classCallCheck(this, KernelManager);

    this.kernelSpecs = null;
  }

  _createClass(KernelManager, [{
    key: "startKernelFor",
    value: function startKernelFor(grammar, editor, filePath, onStarted) {
      var _this = this;

      this.getKernelSpecForGrammar(grammar).then(function (kernelSpec) {
        if (!kernelSpec) {
          var message = "No kernel for grammar `" + grammar.name + "` found";
          var pythonDescription = grammar && /python/g.test(grammar.scopeName) ? "\n\nTo detect your current Python install you will need to run:<pre>python -m pip install ipykernel\npython -m ipykernel install --user</pre>" : "";
          var description = "Check that the language for this file is set in Atom and that you have a Jupyter kernel installed for it." + pythonDescription;
          atom.notifications.addError(message, {
            description: description,
            dismissable: pythonDescription !== ""
          });
          return;
        }

        _this.startKernel(kernelSpec, grammar, editor, filePath, onStarted);
      });
    }
  }, {
    key: "startKernel",
    value: function startKernel(kernelSpec, grammar, editor, filePath, onStarted) {
      var displayName = kernelSpec.display_name;

      // if kernel startup already in progress don't start additional kernel
      if (_store2["default"].startingKernels.get(displayName)) return;

      _store2["default"].startKernel(displayName);

      var currentPath = (0, _utils.getEditorDirectory)(editor);
      var projectPath = undefined;

      (0, _utils.log)("KernelManager: startKernel:", displayName);

      switch (atom.config.get("Hydrogen.startDir")) {
        case "firstProjectDir":
          projectPath = atom.project.getPaths()[0];
          break;
        case "projectDirOfFile":
          projectPath = atom.project.relativizePath(currentPath)[0];
          break;
      }

      var kernelStartDir = projectPath != null ? projectPath : currentPath;
      var options = {
        cwd: kernelStartDir,
        stdio: ["ignore", "pipe", "pipe"]
      };

      var transport = new _zmqKernel2["default"](kernelSpec, grammar, options, function () {
        var kernel = new _kernel2["default"](transport);
        _store2["default"].newKernel(kernel, filePath, editor, grammar);
        if (onStarted) onStarted(kernel);
      });
    }
  }, {
    key: "update",
    value: _asyncToGenerator(function* () {
      var kernelSpecs = yield ks.findAll();
      this.kernelSpecs = _lodash2["default"].map(kernelSpecs, "spec");
      return this.kernelSpecs;
    })
  }, {
    key: "getAllKernelSpecs",
    value: _asyncToGenerator(function* (grammar) {
      if (this.kernelSpecs) return this.kernelSpecs;
      return this.updateKernelSpecs(grammar);
    })
  }, {
    key: "getAllKernelSpecsForGrammar",
    value: _asyncToGenerator(function* (grammar) {
      if (!grammar) return [];

      var kernelSpecs = yield this.getAllKernelSpecs(grammar);
      return kernelSpecs.filter(function (spec) {
        return (0, _utils.kernelSpecProvidesGrammar)(spec, grammar);
      });
    })
  }, {
    key: "getKernelSpecForGrammar",
    value: _asyncToGenerator(function* (grammar) {
      var _this2 = this;

      var kernelSpecs = yield this.getAllKernelSpecsForGrammar(grammar);
      if (kernelSpecs.length <= 1) {
        return kernelSpecs[0];
      }

      if (this.kernelPicker) {
        this.kernelPicker.kernelSpecs = kernelSpecs;
      } else {
        this.kernelPicker = new _kernelPicker2["default"](kernelSpecs);
      }

      return new Promise(function (resolve) {
        if (!_this2.kernelPicker) return resolve(null);
        _this2.kernelPicker.onConfirmed = function (kernelSpec) {
          return resolve(kernelSpec);
        };
        _this2.kernelPicker.toggle();
      });
    })
  }, {
    key: "updateKernelSpecs",
    value: _asyncToGenerator(function* (grammar) {
      var kernelSpecs = yield this.update();

      if (kernelSpecs.length === 0) {
        var message = "No Kernels Installed";

        var options = {
          description: "No kernels are installed on your system so you will not be able to execute code in any language.",
          dismissable: true,
          buttons: [{
            text: "Install Instructions",
            onDidClick: function onDidClick() {
              return _electron.shell.openExternal("https://nteract.gitbooks.io/hydrogen/docs/Installation.html");
            }
          }, {
            text: "Popular Kernels",
            onDidClick: function onDidClick() {
              return _electron.shell.openExternal("https://nteract.io/kernels");
            }
          }, {
            text: "All Kernels",
            onDidClick: function onDidClick() {
              return _electron.shell.openExternal("https://github.com/jupyter/jupyter/wiki/Jupyter-kernels");
            }
          }]
        };
        atom.notifications.addError(message, options);
      } else {
        var message = "Hydrogen Kernels updated:";
        var options = {
          detail: _lodash2["default"].map(kernelSpecs, "display_name").join("\n")
        };
        atom.notifications.addInfo(message, options);
      }
      return kernelSpecs;
    })
  }]);

  return KernelManager;
})();

exports.KernelManager = KernelManager;
exports["default"] = new KernelManager();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvSHlkcm9nZW4vbGliL2tlcm5lbC1tYW5hZ2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O3NCQUVjLFFBQVE7Ozs7MkJBQ08sYUFBYTs7SUFBOUIsV0FBVzs7MkJBQ0ksYUFBYTs7d0JBQ2xCLFVBQVU7O3lCQUVWLGNBQWM7Ozs7c0JBQ2pCLFVBQVU7Ozs7NEJBRUosaUJBQWlCOzs7O3FCQUN4QixTQUFTOzs7O3FCQUN3QyxTQUFTOztBQUlyRSxJQUFNLEVBQUUsR0FBRyxXQUFXLENBQUM7Ozs7SUFFakIsYUFBYTtXQUFiLGFBQWE7MEJBQWIsYUFBYTs7U0FDeEIsV0FBVyxHQUF1QixJQUFJOzs7ZUFEM0IsYUFBYTs7V0FJVix3QkFDWixPQUFxQixFQUNyQixNQUF1QixFQUN2QixRQUFnQixFQUNoQixTQUFzQyxFQUN0Qzs7O0FBQ0EsVUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLFVBQVUsRUFBSTtBQUN2RCxZQUFJLENBQUMsVUFBVSxFQUFFO0FBQ2YsY0FBTSxPQUFPLCtCQUE4QixPQUFPLENBQUMsSUFBSSxZQUFVLENBQUM7QUFDbEUsY0FBTSxpQkFBaUIsR0FDckIsT0FBTyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUN4QywrSUFBK0ksR0FDL0ksRUFBRSxDQUFDO0FBQ1QsY0FBTSxXQUFXLGlIQUErRyxpQkFBaUIsQUFBRSxDQUFDO0FBQ3BKLGNBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTtBQUNuQyx1QkFBVyxFQUFYLFdBQVc7QUFDWCx1QkFBVyxFQUFFLGlCQUFpQixLQUFLLEVBQUU7V0FDdEMsQ0FBQyxDQUFDO0FBQ0gsaUJBQU87U0FDUjs7QUFFRCxjQUFLLFdBQVcsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUs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TCxZQUFNLE9BQU8sR0FBRywyQkFBMkIsQ0FBQztBQUM1QyxZQUFNLE9BQU8sR0FBRztBQUNkLGdCQUFNLEVBQUUsb0JBQUUsR0FBRyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ3RELENBQUM7QUFDRixZQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7T0FDOUM7QUFDRCxhQUFPLFdBQVcsQ0FBQztLQUNwQjs7O1NBbkpVLGFBQWE7Ozs7cUJBc0pYLElBQUksYUFBYSxFQUFFIiwiZmlsZSI6Ii9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvSHlkcm9nZW4vbGliL2tlcm5lbC1tYW5hZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogQGZsb3cgKi9cblxuaW1wb3J0IF8gZnJvbSBcImxvZGFzaFwiO1xuaW1wb3J0ICogYXMga2VybmVsc3BlY3MgZnJvbSBcImtlcm5lbHNwZWNzXCI7XG5pbXBvcnQgeyBsYXVuY2hTcGVjIH0gZnJvbSBcInNwYXdudGVyYWN0XCI7XG5pbXBvcnQgeyBzaGVsbCB9IGZyb20gXCJlbGVjdHJvblwiO1xuXG5pbXBvcnQgWk1RS2VybmVsIGZyb20gXCIuL3ptcS1rZXJuZWxcIjtcbmltcG9ydCBLZXJuZWwgZnJvbSBcIi4va2VybmVsXCI7XG5cbmltcG9ydCBLZXJuZWxQaWNrZXIgZnJvbSBcIi4va2VybmVsLXBpY2tlclwiO1xuaW1wb3J0IHN0b3JlIGZyb20gXCIuL3N0b3JlXCI7XG5pbXBvcnQgeyBnZXRFZGl0b3JEaXJlY3RvcnksIGtlcm5lbFNwZWNQcm92aWRlc0dyYW1tYXIsIGxvZyB9IGZyb20gXCIuL3V0aWxzXCI7XG5cbmltcG9ydCB0eXBlIHsgQ29ubmVjdGlvbiB9IGZyb20gXCIuL3ptcS1rZXJuZWxcIjtcblxuZXhwb3J0IGNvbnN0IGtzID0ga2VybmVsc3BlY3M7XG5cbmV4cG9ydCBjbGFzcyBLZXJuZWxNYW5hZ2VyIHtcbiAga2VybmVsU3BlY3M6ID9BcnJheTxLZXJuZWxzcGVjPiA9IG51bGw7XG4gIGtlcm5lbFBpY2tlcjogP0tlcm5lbFBpY2tlcjtcblxuICBzdGFydEtlcm5lbEZvcihcbiAgICBncmFtbWFyOiBhdG9tJEdyYW1tYXIsXG4gICAgZWRpdG9yOiBhdG9tJFRleHRFZGl0b3IsXG4gICAgZmlsZVBhdGg6IHN0cmluZyxcbiAgICBvblN0YXJ0ZWQ6IChrZXJuZWw6IFpNUUtlcm5lbCkgPT4gdm9pZFxuICApIHtcbiAgICB0aGlzLmdldEtlcm5lbFNwZWNGb3JHcmFtbWFyKGdyYW1tYXIpLnRoZW4oa2VybmVsU3BlYyA9PiB7XG4gICAgICBpZiAoIWtlcm5lbFNwZWMpIHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGBObyBrZXJuZWwgZm9yIGdyYW1tYXIgXFxgJHtncmFtbWFyLm5hbWV9XFxgIGZvdW5kYDtcbiAgICAgICAgY29uc3QgcHl0aG9uRGVzY3JpcHRpb24gPVxuICAgICAgICAgIGdyYW1tYXIgJiYgL3B5dGhvbi9nLnRlc3QoZ3JhbW1hci5zY29wZU5hbWUpXG4gICAgICAgICAgICA/IFwiXFxuXFxuVG8gZGV0ZWN0IHlvdXIgY3VycmVudCBQeXRob24gaW5zdGFsbCB5b3Ugd2lsbCBuZWVkIHRvIHJ1bjo8cHJlPnB5dGhvbiAtbSBwaXAgaW5zdGFsbCBpcHlrZXJuZWxcXG5weXRob24gLW0gaXB5a2VybmVsIGluc3RhbGwgLS11c2VyPC9wcmU+XCJcbiAgICAgICAgICAgIDogXCJcIjtcbiAgICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSBgQ2hlY2sgdGhhdCB0aGUgbGFuZ3VhZ2UgZm9yIHRoaXMgZmlsZSBpcyBzZXQgaW4gQXRvbSBhbmQgdGhhdCB5b3UgaGF2ZSBhIEp1cHl0ZXIga2VybmVsIGluc3RhbGxlZCBmb3IgaXQuJHtweXRob25EZXNjcmlwdGlvbn1gO1xuICAgICAgICBhdG9tLm5vdGlmaWNhdGlvbnMuYWRkRXJyb3IobWVzc2FnZSwge1xuICAgICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICAgIGRpc21pc3NhYmxlOiBweXRob25EZXNjcmlwdGlvbiAhPT0gXCJcIlxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnN0YXJ0S2VybmVsKGtlcm5lbFNwZWMsIGdyYW1tYXIsIGVkaXRvciwgZmlsZVBhdGgsIG9uU3RhcnRlZCk7XG4gICAgfSk7XG4gIH1cblxuICBzdGFydEtlcm5lbChcbiAgICBrZXJuZWxTcGVjOiBLZXJuZWxzcGVjLFxuICAgIGdyYW1tYXI6IGF0b20kR3JhbW1hcixcbiAgICBlZGl0b3I6IGF0b20kVGV4dEVkaXRvcixcbiAgICBmaWxlUGF0aDogc3RyaW5nLFxuICAgIG9uU3RhcnRlZDogPyhrZXJuZWw6IFpNUUtlcm5lbCkgPT4gdm9pZFxuICApIHtcbiAgICBjb25zdCBkaXNwbGF5TmFtZSA9IGtlcm5lbFNwZWMuZGlzcGxheV9uYW1lO1xuXG4gICAgLy8gaWYga2VybmVsIHN0YXJ0dXAgYWxyZWFkeSBpbiBwcm9ncmVzcyBkb24ndCBzdGFydCBhZGRpdGlvbmFsIGtlcm5lbFxuICAgIGlmIChzdG9yZS5zdGFydGluZ0tlcm5lbHMuZ2V0KGRpc3BsYXlOYW1lKSkgcmV0dXJuO1xuXG4gICAgc3RvcmUuc3RhcnRLZXJuZWwoZGlzcGxheU5hbWUpO1xuXG4gICAgbGV0IGN1cnJlbnRQYXRoID0gZ2V0RWRpdG9yRGlyZWN0b3J5KGVkaXRvcik7XG4gICAgbGV0IHByb2plY3RQYXRoO1xuXG4gICAgbG9nKFwiS2VybmVsTWFuYWdlcjogc3RhcnRLZXJuZWw6XCIsIGRpc3BsYXlOYW1lKTtcblxuICAgIHN3aXRjaCAoYXRvbS5jb25maWcuZ2V0KFwiSHlkcm9nZW4uc3RhcnREaXJcIikpIHtcbiAgICAgIGNhc2UgXCJmaXJzdFByb2plY3REaXJcIjpcbiAgICAgICAgcHJvamVjdFBhdGggPSBhdG9tLnByb2plY3QuZ2V0UGF0aHMoKVswXTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwicHJvamVjdERpck9mRmlsZVwiOlxuICAgICAgICBwcm9qZWN0UGF0aCA9IGF0b20ucHJvamVjdC5yZWxhdGl2aXplUGF0aChjdXJyZW50UGF0aClbMF07XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGNvbnN0IGtlcm5lbFN0YXJ0RGlyID0gcHJvamVjdFBhdGggIT0gbnVsbCA/IHByb2plY3RQYXRoIDogY3VycmVudFBhdGg7XG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIGN3ZDoga2VybmVsU3RhcnREaXIsXG4gICAgICBzdGRpbzogW1wiaWdub3JlXCIsIFwicGlwZVwiLCBcInBpcGVcIl1cbiAgICB9O1xuXG4gICAgY29uc3QgdHJhbnNwb3J0ID0gbmV3IFpNUUtlcm5lbChrZXJuZWxTcGVjLCBncmFtbWFyLCBvcHRpb25zLCAoKSA9PiB7XG4gICAgICBjb25zdCBrZXJuZWwgPSBuZXcgS2VybmVsKHRyYW5zcG9ydCk7XG4gICAgICBzdG9yZS5uZXdLZXJuZWwoa2VybmVsLCBmaWxlUGF0aCwgZWRpdG9yLCBncmFtbWFyKTtcbiAgICAgIGlmIChvblN0YXJ0ZWQpIG9uU3RhcnRlZChrZXJuZWwpO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlKCkge1xuICAgIGNvbnN0IGtlcm5lbFNwZWNzID0gYXdhaXQga3MuZmluZEFsbCgpO1xuICAgIHRoaXMua2VybmVsU3BlY3MgPSBfLm1hcChrZXJuZWxTcGVjcywgXCJzcGVjXCIpO1xuICAgIHJldHVybiB0aGlzLmtlcm5lbFNwZWNzO1xuICB9XG5cbiAgYXN5bmMgZ2V0QWxsS2VybmVsU3BlY3MoZ3JhbW1hcjogP2F0b20kR3JhbW1hcikge1xuICAgIGlmICh0aGlzLmtlcm5lbFNwZWNzKSByZXR1cm4gdGhpcy5rZXJuZWxTcGVjcztcbiAgICByZXR1cm4gdGhpcy51cGRhdGVLZXJuZWxTcGVjcyhncmFtbWFyKTtcbiAgfVxuXG4gIGFzeW5jIGdldEFsbEtlcm5lbFNwZWNzRm9yR3JhbW1hcihncmFtbWFyOiA/YXRvbSRHcmFtbWFyKSB7XG4gICAgaWYgKCFncmFtbWFyKSByZXR1cm4gW107XG5cbiAgICBjb25zdCBrZXJuZWxTcGVjcyA9IGF3YWl0IHRoaXMuZ2V0QWxsS2VybmVsU3BlY3MoZ3JhbW1hcik7XG4gICAgcmV0dXJuIGtlcm5lbFNwZWNzLmZpbHRlcihzcGVjID0+IGtlcm5lbFNwZWNQcm92aWRlc0dyYW1tYXIoc3BlYywgZ3JhbW1hcikpO1xuICB9XG5cbiAgYXN5bmMgZ2V0S2VybmVsU3BlY0ZvckdyYW1tYXIoZ3JhbW1hcjogYXRvbSRHcmFtbWFyKSB7XG4gICAgY29uc3Qga2VybmVsU3BlY3MgPSBhd2FpdCB0aGlzLmdldEFsbEtlcm5lbFNwZWNzRm9yR3JhbW1hcihncmFtbWFyKTtcbiAgICBpZiAoa2VybmVsU3BlY3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgIHJldHVybiBrZXJuZWxTcGVjc1swXTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5rZXJuZWxQaWNrZXIpIHtcbiAgICAgIHRoaXMua2VybmVsUGlja2VyLmtlcm5lbFNwZWNzID0ga2VybmVsU3BlY3M7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMua2VybmVsUGlja2VyID0gbmV3IEtlcm5lbFBpY2tlcihrZXJuZWxTcGVjcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgaWYgKCF0aGlzLmtlcm5lbFBpY2tlcikgcmV0dXJuIHJlc29sdmUobnVsbCk7XG4gICAgICB0aGlzLmtlcm5lbFBpY2tlci5vbkNvbmZpcm1lZCA9IGtlcm5lbFNwZWMgPT4gcmVzb2x2ZShrZXJuZWxTcGVjKTtcbiAgICAgIHRoaXMua2VybmVsUGlja2VyLnRvZ2dsZSgpO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlS2VybmVsU3BlY3MoZ3JhbW1hcjogP2F0b20kR3JhbW1hcikge1xuICAgIGNvbnN0IGtlcm5lbFNwZWNzID0gYXdhaXQgdGhpcy51cGRhdGUoKTtcblxuICAgIGlmIChrZXJuZWxTcGVjcy5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBcIk5vIEtlcm5lbHMgSW5zdGFsbGVkXCI7XG5cbiAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgIFwiTm8ga2VybmVscyBhcmUgaW5zdGFsbGVkIG9uIHlvdXIgc3lzdGVtIHNvIHlvdSB3aWxsIG5vdCBiZSBhYmxlIHRvIGV4ZWN1dGUgY29kZSBpbiBhbnkgbGFuZ3VhZ2UuXCIsXG4gICAgICAgIGRpc21pc3NhYmxlOiB0cnVlLFxuICAgICAgICBidXR0b25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGV4dDogXCJJbnN0YWxsIEluc3RydWN0aW9uc1wiLFxuICAgICAgICAgICAgb25EaWRDbGljazogKCkgPT5cbiAgICAgICAgICAgICAgc2hlbGwub3BlbkV4dGVybmFsKFxuICAgICAgICAgICAgICAgIFwiaHR0cHM6Ly9udGVyYWN0LmdpdGJvb2tzLmlvL2h5ZHJvZ2VuL2RvY3MvSW5zdGFsbGF0aW9uLmh0bWxcIlxuICAgICAgICAgICAgICApXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0ZXh0OiBcIlBvcHVsYXIgS2VybmVsc1wiLFxuICAgICAgICAgICAgb25EaWRDbGljazogKCkgPT4gc2hlbGwub3BlbkV4dGVybmFsKFwiaHR0cHM6Ly9udGVyYWN0LmlvL2tlcm5lbHNcIilcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRleHQ6IFwiQWxsIEtlcm5lbHNcIixcbiAgICAgICAgICAgIG9uRGlkQ2xpY2s6ICgpID0+XG4gICAgICAgICAgICAgIHNoZWxsLm9wZW5FeHRlcm5hbChcbiAgICAgICAgICAgICAgICBcImh0dHBzOi8vZ2l0aHViLmNvbS9qdXB5dGVyL2p1cHl0ZXIvd2lraS9KdXB5dGVyLWtlcm5lbHNcIlxuICAgICAgICAgICAgICApXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9O1xuICAgICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZEVycm9yKG1lc3NhZ2UsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gXCJIeWRyb2dlbiBLZXJuZWxzIHVwZGF0ZWQ6XCI7XG4gICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICBkZXRhaWw6IF8ubWFwKGtlcm5lbFNwZWNzLCBcImRpc3BsYXlfbmFtZVwiKS5qb2luKFwiXFxuXCIpXG4gICAgICB9O1xuICAgICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZEluZm8obWVzc2FnZSwgb3B0aW9ucyk7XG4gICAgfVxuICAgIHJldHVybiBrZXJuZWxTcGVjcztcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgS2VybmVsTWFuYWdlcigpO1xuIl19