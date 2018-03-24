Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, "next"); var callThrow = step.bind(null, "throw"); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _atomSelectList = require("atom-select-list");

var _atomSelectList2 = _interopRequireDefault(_atomSelectList);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _tildify = require("tildify");

var _tildify2 = _interopRequireDefault(_tildify);

var _uuidV4 = require("uuid/v4");

var _uuidV42 = _interopRequireDefault(_uuidV4);

var _ws = require("ws");

var _ws2 = _interopRequireDefault(_ws);

var _xmlhttprequest = require("xmlhttprequest");

var _xmlhttprequest2 = _interopRequireDefault(_xmlhttprequest);

var _url = require("url");

var _jupyterlabServices = require("@jupyterlab/services");

var _config = require("./config");

var _config2 = _interopRequireDefault(_config);

var _wsKernel = require("./ws-kernel");

var _wsKernel2 = _interopRequireDefault(_wsKernel);

var _inputView = require("./input-view");

var _inputView2 = _interopRequireDefault(_inputView);

var _store = require("./store");

var _store2 = _interopRequireDefault(_store);

var CustomListView = (function () {
  function CustomListView() {
    var _this = this;

    _classCallCheck(this, CustomListView);

    this.onConfirmed = null;
    this.onCancelled = null;

    this.previouslyFocusedElement = document.activeElement;
    this.selectListView = new _atomSelectList2["default"]({
      itemsClassList: ["mark-active"],
      items: [],
      filterKeyForItem: function filterKeyForItem(item) {
        return item.name;
      },
      elementForItem: function elementForItem(item) {
        var element = document.createElement("li");
        element.textContent = item.name;
        return element;
      },
      didConfirmSelection: function didConfirmSelection(item) {
        if (_this.onConfirmed) _this.onConfirmed(item);
      },
      didCancelSelection: function didCancelSelection() {
        _this.cancel();
        if (_this.onCancelled) _this.onCancelled();
      }
    });
  }

  _createClass(CustomListView, [{
    key: "show",
    value: function show() {
      if (!this.panel) {
        this.panel = atom.workspace.addModalPanel({ item: this.selectListView });
      }
      this.panel.show();
      this.selectListView.focus();
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.cancel();
      return this.selectListView.destroy();
    }
  }, {
    key: "cancel",
    value: function cancel() {
      if (this.panel != null) {
        this.panel.destroy();
      }
      this.panel = null;
      if (this.previouslyFocusedElement) {
        this.previouslyFocusedElement.focus();
        this.previouslyFocusedElement = null;
      }
    }
  }]);

  return CustomListView;
})();

var WSKernelPicker = (function () {
  function WSKernelPicker(onChosen) {
    _classCallCheck(this, WSKernelPicker);

    this._onChosen = onChosen;
    this.listView = new CustomListView();
  }

  _createClass(WSKernelPicker, [{
    key: "toggle",
    value: _asyncToGenerator(function* (_kernelSpecFilter) {
      this.listView.previouslyFocusedElement = document.activeElement;
      this._kernelSpecFilter = _kernelSpecFilter;
      var gateways = _config2["default"].getJson("gateways") || [];
      if (_lodash2["default"].isEmpty(gateways)) {
        atom.notifications.addError("No remote kernel gateways available", {
          description: "Use the Hydrogen package settings to specify the list of remote servers. Hydrogen can use remote kernels on either a Jupyter Kernel Gateway or Jupyter notebook server."
        });
        return;
      }

      this._path = (_store2["default"].filePath || "unsaved") + "-" + (0, _uuidV42["default"])();

      this.listView.onConfirmed = this.onGateway.bind(this);

      yield this.listView.selectListView.update({
        items: gateways,
        infoMessage: "Select a gateway",
        emptyMessage: "No gateways available",
        loadingMessage: null
      });

      this.listView.show();
    })
  }, {
    key: "promptForText",
    value: _asyncToGenerator(function* (prompt) {
      var previouslyFocusedElement = this.listView.previouslyFocusedElement;
      this.listView.cancel();

      var inputPromise = new Promise(function (resolve, reject) {
        var inputView = new _inputView2["default"]({ prompt: prompt }, resolve);
        atom.commands.add(inputView.element, {
          "core:cancel": function coreCancel() {
            inputView.close();
            reject();
          }
        });
        inputView.attach();
      });

      var response = undefined;
      try {
        response = yield inputPromise;
        if (response === "") {
          return null;
        }
      } catch (e) {
        return null;
      }

      // Assume that no response to the prompt will cancel the entire flow, so
      // only restore listView if a response was received
      this.listView.show();
      this.listView.previouslyFocusedElement = previouslyFocusedElement;
      return response;
    })
  }, {
    key: "promptForCookie",
    value: _asyncToGenerator(function* (options) {
      var cookie = yield this.promptForText("Cookie:");
      if (cookie === null) {
        return false;
      }

      if (options.requestHeaders === undefined) {
        options.requestHeaders = {};
      }
      options.requestHeaders.Cookie = cookie;
      options.xhrFactory = function () {
        var request = new _xmlhttprequest2["default"].XMLHttpRequest();
        // Disable protections against setting the Cookie header
        request.setDisableHeaderCheck(true);
        return request;
      };
      options.wsFactory = function (url, protocol) {
        // Authentication requires requests to appear to be same-origin
        var parsedUrl = new _url.URL(url);
        if (parsedUrl.protocol == "wss:") {
          parsedUrl.protocol = "https:";
        } else {
          parsedUrl.protocol = "http:";
        }
        var headers = { Cookie: cookie };
        var origin = parsedUrl.origin;
        var host = parsedUrl.host;
        return new _ws2["default"](url, protocol, { headers: headers, origin: origin, host: host });
      };
      return true;
    })
  }, {
    key: "promptForToken",
    value: _asyncToGenerator(function* (options) {
      var token = yield this.promptForText("Token:");
      if (token === null) {
        return false;
      }

      options.token = token;
      return true;
    })
  }, {
    key: "promptForCredentials",
    value: _asyncToGenerator(function* (options) {
      var _this2 = this;

      yield this.listView.selectListView.update({
        items: [{
          name: "Authenticate with a token",
          action: "token"
        }, {
          name: "Authenticate with a cookie",
          action: "cookie"
        }, {
          name: "Cancel",
          action: "cancel"
        }],
        infoMessage: "Connection to gateway failed. Your settings may be incorrect, the server may be unavailable, or you may lack sufficient privileges to complete the connection.",
        loadingMessage: null,
        emptyMessage: null
      });

      var action = yield new Promise(function (resolve, reject) {
        _this2.listView.onConfirmed = function (item) {
          return resolve(item.action);
        };
        _this2.listView.onCancelled = function () {
          return resolve("cancel");
        };
      });
      if (action === "token") {
        return yield this.promptForToken(options);
      } else if (action === "cookie") {
        return yield this.promptForCookie(options);
      } else {
        // action === "cancel"
        this.listView.cancel();
        return false;
      }
    })
  }, {
    key: "onGateway",
    value: _asyncToGenerator(function* (gatewayInfo) {
      var _this3 = this;

      this.listView.onConfirmed = null;
      yield this.listView.selectListView.update({
        items: [],
        infoMessage: null,
        loadingMessage: "Loading sessions...",
        emptyMessage: "No sessions available"
      });

      var gatewayOptions = Object.assign({
        xhrFactory: function xhrFactory() {
          return new _xmlhttprequest2["default"].XMLHttpRequest();
        },
        wsFactory: function wsFactory(url, protocol) {
          return new _ws2["default"](url, protocol);
        }
      }, gatewayInfo.options);

      var serverSettings = _jupyterlabServices.ServerConnection.makeSettings(gatewayOptions);
      var specModels = undefined;

      try {
        specModels = yield _jupyterlabServices.Kernel.getSpecs(serverSettings);
      } catch (error) {
        // The error types you get back at this stage are fairly opaque. In
        // particular, having invalid credentials typically triggers ECONNREFUSED
        // rather than 403 Forbidden. This does some basic checks and then assumes
        // that all remaining error types could be caused by invalid credentials.
        if (!error.xhr || !error.xhr.responseText) {
          throw error;
        } else if (error.xhr.responseText.includes("ETIMEDOUT")) {
          atom.notifications.addError("Connection to gateway failed");
          this.listView.cancel();
          return;
        } else {
          var promptSucceeded = yield this.promptForCredentials(gatewayOptions);
          if (!promptSucceeded) {
            return;
          }
          serverSettings = _jupyterlabServices.ServerConnection.makeSettings(gatewayOptions);
          yield this.listView.selectListView.update({
            items: [],
            infoMessage: null,
            loadingMessage: "Loading sessions...",
            emptyMessage: "No sessions available"
          });
        }
      }

      try {
        yield* (function* () {
          if (!specModels) {
            specModels = yield _jupyterlabServices.Kernel.getSpecs(serverSettings);
          }

          var kernelSpecs = _lodash2["default"].filter(specModels.kernelspecs, function (spec) {
            return _this3._kernelSpecFilter(spec);
          });

          var kernelNames = _lodash2["default"].map(kernelSpecs, function (specModel) {
            return specModel.name;
          });

          try {
            var sessionModels = yield _jupyterlabServices.Session.listRunning(serverSettings);
            sessionModels = sessionModels.filter(function (model) {
              var name = model.kernel ? model.kernel.name : null;
              return name ? kernelNames.includes(name) : true;
            });
            var items = sessionModels.map(function (model) {
              var name = undefined;
              if (model.path) {
                name = (0, _tildify2["default"])(model.path);
              } else if (model.notebook && model.notebook.path) {
                name = (0, _tildify2["default"])(model.notebook.path);
              } else {
                name = "Session " + model.id;
              }
              return { name: name, model: model, options: serverSettings };
            });
            items.unshift({
              name: "[new session]",
              model: null,
              options: serverSettings,
              kernelSpecs: kernelSpecs
            });
            _this3.listView.onConfirmed = _this3.onSession.bind(_this3, gatewayInfo.name);
            yield _this3.listView.selectListView.update({
              items: items,
              loadingMessage: null
            });
          } catch (error) {
            if (!error.xhr || error.xhr.status !== 403) throw error;
            // Gateways offer the option of never listing sessions, for security
            // reasons.
            // Assume this is the case and proceed to creating a new session.
            _this3.onSession(gatewayInfo.name, {
              name: "[new session]",
              model: null,
              options: serverSettings,
              kernelSpecs: kernelSpecs
            });
          }
        })();
      } catch (e) {
        atom.notifications.addError("Connection to gateway failed");
        this.listView.cancel();
      }
    })
  }, {
    key: "onSession",
    value: _asyncToGenerator(function* (gatewayName, sessionInfo) {
      var _this4 = this;

      if (!sessionInfo.model) {
        if (!sessionInfo.name) {
          yield this.listView.selectListView.update({
            items: [],
            errorMessage: "This gateway does not support listing sessions",
            loadingMessage: null,
            infoMessage: null
          });
        }
        var items = _lodash2["default"].map(sessionInfo.kernelSpecs, function (spec) {
          var options = {
            serverSettings: sessionInfo.options,
            kernelName: spec.name,
            path: _this4._path
          };
          return {
            name: spec.display_name,
            options: options
          };
        });

        this.listView.onConfirmed = this.startSession.bind(this, gatewayName);
        yield this.listView.selectListView.update({
          items: items,
          emptyMessage: "No kernel specs available",
          infoMessage: "Select a session",
          loadingMessage: null
        });
      } else {
        this.onSessionChosen(gatewayName, (yield _jupyterlabServices.Session.connectTo(sessionInfo.model.id, sessionInfo.options)));
      }
    })
  }, {
    key: "startSession",
    value: function startSession(gatewayName, sessionInfo) {
      _jupyterlabServices.Session.startNew(sessionInfo.options).then(this.onSessionChosen.bind(this, gatewayName));
    }
  }, {
    key: "onSessionChosen",
    value: _asyncToGenerator(function* (gatewayName, session) {
      this.listView.cancel();
      var kernelSpec = yield session.kernel.getSpec();
      if (!_store2["default"].grammar) return;

      var kernel = new _wsKernel2["default"](gatewayName, kernelSpec, _store2["default"].grammar, session);
      this._onChosen(kernel);
    })
  }]);

  return WSKernelPicker;
})();

exports["default"] = WSKernelPicker;
module.exports = exports["default"];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvSHlkcm9nZW4vbGliL3dzLWtlcm5lbC1waWNrZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OzhCQUUyQixrQkFBa0I7Ozs7c0JBQy9CLFFBQVE7Ozs7dUJBQ0YsU0FBUzs7OztzQkFDZCxTQUFTOzs7O2tCQUNULElBQUk7Ozs7OEJBQ0gsZ0JBQWdCOzs7O21CQUNaLEtBQUs7O2tDQUN5QixzQkFBc0I7O3NCQUVyRCxVQUFVOzs7O3dCQUNSLGFBQWE7Ozs7eUJBQ1osY0FBYzs7OztxQkFDbEIsU0FBUzs7OztJQUVyQixjQUFjO0FBT1AsV0FQUCxjQUFjLEdBT0o7OzswQkFQVixjQUFjOztTQUNsQixXQUFXLEdBQWMsSUFBSTtTQUM3QixXQUFXLEdBQWMsSUFBSTs7QUFNM0IsUUFBSSxDQUFDLHdCQUF3QixHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUM7QUFDdkQsUUFBSSxDQUFDLGNBQWMsR0FBRyxnQ0FBbUI7QUFDdkMsb0JBQWMsRUFBRSxDQUFDLGFBQWEsQ0FBQztBQUMvQixXQUFLLEVBQUUsRUFBRTtBQUNULHNCQUFnQixFQUFFLDBCQUFBLElBQUk7ZUFBSSxJQUFJLENBQUMsSUFBSTtPQUFBO0FBQ25DLG9CQUFjLEVBQUUsd0JBQUEsSUFBSSxFQUFJO0FBQ3RCLFlBQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDN0MsZUFBTyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQ2hDLGVBQU8sT0FBTyxDQUFDO09BQ2hCO0FBQ0QseUJBQW1CLEVBQUUsNkJBQUEsSUFBSSxFQUFJO0FBQzNCLFlBQUksTUFBSyxXQUFXLEVBQUUsTUFBSyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDOUM7QUFDRCx3QkFBa0IsRUFBRSw4QkFBTTtBQUN4QixjQUFLLE1BQU0sRUFBRSxDQUFDO0FBQ2QsWUFBSSxNQUFLLFdBQVcs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Q0FDbkUsQ0FBQztPQUNIO0tBQ0Y7OztXQUVXLHNCQUFDLFdBQW1CLEVBQUUsV0FBZ0IsRUFBRTtBQUNsRCxrQ0FBUSxRQUFRLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FDeEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUM3QyxDQUFDO0tBQ0g7Ozs2QkFFb0IsV0FBQyxXQUFtQixFQUFFLE9BQVksRUFBRTtBQUN2RCxVQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ3ZCLFVBQU0sVUFBVSxHQUFHLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNsRCxVQUFJLENBQUMsbUJBQU0sT0FBTyxFQUFFLE9BQU87O0FBRTNCLFVBQU0sTUFBTSxHQUFHLDBCQUNiLFdBQVcsRUFDWCxVQUFVLEVBQ1YsbUJBQU0sT0FBTyxFQUNiLE9BQU8sQ0FDUixDQUFDO0FBQ0YsVUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUN4Qjs7O1NBcFRrQixjQUFjOzs7cUJBQWQsY0FBYyIsImZpbGUiOiIvaG9tZS9rbmllbGJvLy5hdG9tL3BhY2thZ2VzL0h5ZHJvZ2VuL2xpYi93cy1rZXJuZWwtcGlja2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogQGZsb3cgKi9cblxuaW1wb3J0IFNlbGVjdExpc3RWaWV3IGZyb20gXCJhdG9tLXNlbGVjdC1saXN0XCI7XG5pbXBvcnQgXyBmcm9tIFwibG9kYXNoXCI7XG5pbXBvcnQgdGlsZGlmeSBmcm9tIFwidGlsZGlmeVwiO1xuaW1wb3J0IHY0IGZyb20gXCJ1dWlkL3Y0XCI7XG5pbXBvcnQgd3MgZnJvbSBcIndzXCI7XG5pbXBvcnQgeGhyIGZyb20gXCJ4bWxodHRwcmVxdWVzdFwiO1xuaW1wb3J0IHsgVVJMIH0gZnJvbSBcInVybFwiO1xuaW1wb3J0IHsgS2VybmVsLCBTZXNzaW9uLCBTZXJ2ZXJDb25uZWN0aW9uIH0gZnJvbSBcIkBqdXB5dGVybGFiL3NlcnZpY2VzXCI7XG5cbmltcG9ydCBDb25maWcgZnJvbSBcIi4vY29uZmlnXCI7XG5pbXBvcnQgV1NLZXJuZWwgZnJvbSBcIi4vd3Mta2VybmVsXCI7XG5pbXBvcnQgSW5wdXRWaWV3IGZyb20gXCIuL2lucHV0LXZpZXdcIjtcbmltcG9ydCBzdG9yZSBmcm9tIFwiLi9zdG9yZVwiO1xuXG5jbGFzcyBDdXN0b21MaXN0VmlldyB7XG4gIG9uQ29uZmlybWVkOiA/RnVuY3Rpb24gPSBudWxsO1xuICBvbkNhbmNlbGxlZDogP0Z1bmN0aW9uID0gbnVsbDtcbiAgcHJldmlvdXNseUZvY3VzZWRFbGVtZW50OiA/SFRNTEVsZW1lbnQ7XG4gIHNlbGVjdExpc3RWaWV3OiBTZWxlY3RMaXN0VmlldztcbiAgcGFuZWw6ID9hdG9tJFBhbmVsO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMucHJldmlvdXNseUZvY3VzZWRFbGVtZW50ID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudDtcbiAgICB0aGlzLnNlbGVjdExpc3RWaWV3ID0gbmV3IFNlbGVjdExpc3RWaWV3KHtcbiAgICAgIGl0ZW1zQ2xhc3NMaXN0OiBbXCJtYXJrLWFjdGl2ZVwiXSxcbiAgICAgIGl0ZW1zOiBbXSxcbiAgICAgIGZpbHRlcktleUZvckl0ZW06IGl0ZW0gPT4gaXRlbS5uYW1lLFxuICAgICAgZWxlbWVudEZvckl0ZW06IGl0ZW0gPT4ge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpO1xuICAgICAgICBlbGVtZW50LnRleHRDb250ZW50ID0gaXRlbS5uYW1lO1xuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgIH0sXG4gICAgICBkaWRDb25maXJtU2VsZWN0aW9uOiBpdGVtID0+IHtcbiAgICAgICAgaWYgKHRoaXMub25Db25maXJtZWQpIHRoaXMub25Db25maXJtZWQoaXRlbSk7XG4gICAgICB9LFxuICAgICAgZGlkQ2FuY2VsU2VsZWN0aW9uOiAoKSA9PiB7XG4gICAgICAgIHRoaXMuY2FuY2VsKCk7XG4gICAgICAgIGlmICh0aGlzLm9uQ2FuY2VsbGVkKSB0aGlzLm9uQ2FuY2VsbGVkKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBzaG93KCkge1xuICAgIGlmICghdGhpcy5wYW5lbCkge1xuICAgICAgdGhpcy5wYW5lbCA9IGF0b20ud29ya3NwYWNlLmFkZE1vZGFsUGFuZWwoeyBpdGVtOiB0aGlzLnNlbGVjdExpc3RWaWV3IH0pO1xuICAgIH1cbiAgICB0aGlzLnBhbmVsLnNob3coKTtcbiAgICB0aGlzLnNlbGVjdExpc3RWaWV3LmZvY3VzKCk7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIHRoaXMuY2FuY2VsKCk7XG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0TGlzdFZpZXcuZGVzdHJveSgpO1xuICB9XG5cbiAgY2FuY2VsKCkge1xuICAgIGlmICh0aGlzLnBhbmVsICE9IG51bGwpIHtcbiAgICAgIHRoaXMucGFuZWwuZGVzdHJveSgpO1xuICAgIH1cbiAgICB0aGlzLnBhbmVsID0gbnVsbDtcbiAgICBpZiAodGhpcy5wcmV2aW91c2x5Rm9jdXNlZEVsZW1lbnQpIHtcbiAgICAgIHRoaXMucHJldmlvdXNseUZvY3VzZWRFbGVtZW50LmZvY3VzKCk7XG4gICAgICB0aGlzLnByZXZpb3VzbHlGb2N1c2VkRWxlbWVudCA9IG51bGw7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFdTS2VybmVsUGlja2VyIHtcbiAgX29uQ2hvc2VuOiAoa2VybmVsOiBLZXJuZWwpID0+IHZvaWQ7XG4gIF9rZXJuZWxTcGVjRmlsdGVyOiAoa2VybmVsU3BlYzogS2VybmVsc3BlYykgPT4gYm9vbGVhbjtcbiAgX3BhdGg6IHN0cmluZztcbiAgbGlzdFZpZXc6IEN1c3RvbUxpc3RWaWV3O1xuXG4gIGNvbnN0cnVjdG9yKG9uQ2hvc2VuOiAoa2VybmVsOiBLZXJuZWwpID0+IHZvaWQpIHtcbiAgICB0aGlzLl9vbkNob3NlbiA9IG9uQ2hvc2VuO1xuICAgIHRoaXMubGlzdFZpZXcgPSBuZXcgQ3VzdG9tTGlzdFZpZXcoKTtcbiAgfVxuXG4gIGFzeW5jIHRvZ2dsZShfa2VybmVsU3BlY0ZpbHRlcjogKGtlcm5lbFNwZWM6IEtlcm5lbHNwZWMpID0+IGJvb2xlYW4pIHtcbiAgICB0aGlzLmxpc3RWaWV3LnByZXZpb3VzbHlGb2N1c2VkRWxlbWVudCA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQ7XG4gICAgdGhpcy5fa2VybmVsU3BlY0ZpbHRlciA9IF9rZXJuZWxTcGVjRmlsdGVyO1xuICAgIGNvbnN0IGdhdGV3YXlzID0gQ29uZmlnLmdldEpzb24oXCJnYXRld2F5c1wiKSB8fCBbXTtcbiAgICBpZiAoXy5pc0VtcHR5KGdhdGV3YXlzKSkge1xuICAgICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZEVycm9yKFwiTm8gcmVtb3RlIGtlcm5lbCBnYXRld2F5cyBhdmFpbGFibGVcIiwge1xuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICBcIlVzZSB0aGUgSHlkcm9nZW4gcGFja2FnZSBzZXR0aW5ncyB0byBzcGVjaWZ5IHRoZSBsaXN0IG9mIHJlbW90ZSBzZXJ2ZXJzLiBIeWRyb2dlbiBjYW4gdXNlIHJlbW90ZSBrZXJuZWxzIG9uIGVpdGhlciBhIEp1cHl0ZXIgS2VybmVsIEdhdGV3YXkgb3IgSnVweXRlciBub3RlYm9vayBzZXJ2ZXIuXCJcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX3BhdGggPSBgJHtzdG9yZS5maWxlUGF0aCB8fCBcInVuc2F2ZWRcIn0tJHt2NCgpfWA7XG5cbiAgICB0aGlzLmxpc3RWaWV3Lm9uQ29uZmlybWVkID0gdGhpcy5vbkdhdGV3YXkuYmluZCh0aGlzKTtcblxuICAgIGF3YWl0IHRoaXMubGlzdFZpZXcuc2VsZWN0TGlzdFZpZXcudXBkYXRlKHtcbiAgICAgIGl0ZW1zOiBnYXRld2F5cyxcbiAgICAgIGluZm9NZXNzYWdlOiBcIlNlbGVjdCBhIGdhdGV3YXlcIixcbiAgICAgIGVtcHR5TWVzc2FnZTogXCJObyBnYXRld2F5cyBhdmFpbGFibGVcIixcbiAgICAgIGxvYWRpbmdNZXNzYWdlOiBudWxsXG4gICAgfSk7XG5cbiAgICB0aGlzLmxpc3RWaWV3LnNob3coKTtcbiAgfVxuXG4gIGFzeW5jIHByb21wdEZvclRleHQocHJvbXB0OiBzdHJpbmcpIHtcbiAgICBjb25zdCBwcmV2aW91c2x5Rm9jdXNlZEVsZW1lbnQgPSB0aGlzLmxpc3RWaWV3LnByZXZpb3VzbHlGb2N1c2VkRWxlbWVudDtcbiAgICB0aGlzLmxpc3RWaWV3LmNhbmNlbCgpO1xuXG4gICAgY29uc3QgaW5wdXRQcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgaW5wdXRWaWV3ID0gbmV3IElucHV0Vmlldyh7IHByb21wdCB9LCByZXNvbHZlKTtcbiAgICAgIGF0b20uY29tbWFuZHMuYWRkKGlucHV0Vmlldy5lbGVtZW50LCB7XG4gICAgICAgIFwiY29yZTpjYW5jZWxcIjogKCkgPT4ge1xuICAgICAgICAgIGlucHV0Vmlldy5jbG9zZSgpO1xuICAgICAgICAgIHJlamVjdCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlucHV0Vmlldy5hdHRhY2goKTtcbiAgICB9KTtcblxuICAgIGxldCByZXNwb25zZTtcbiAgICB0cnkge1xuICAgICAgcmVzcG9uc2UgPSBhd2FpdCBpbnB1dFByb21pc2U7XG4gICAgICBpZiAocmVzcG9uc2UgPT09IFwiXCIpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gQXNzdW1lIHRoYXQgbm8gcmVzcG9uc2UgdG8gdGhlIHByb21wdCB3aWxsIGNhbmNlbCB0aGUgZW50aXJlIGZsb3csIHNvXG4gICAgLy8gb25seSByZXN0b3JlIGxpc3RWaWV3IGlmIGEgcmVzcG9uc2Ugd2FzIHJlY2VpdmVkXG4gICAgdGhpcy5saXN0Vmlldy5zaG93KCk7XG4gICAgdGhpcy5saXN0Vmlldy5wcmV2aW91c2x5Rm9jdXNlZEVsZW1lbnQgPSBwcmV2aW91c2x5Rm9jdXNlZEVsZW1lbnQ7XG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9XG5cbiAgYXN5bmMgcHJvbXB0Rm9yQ29va2llKG9wdGlvbnM6IGFueSkge1xuICAgIGNvbnN0IGNvb2tpZSA9IGF3YWl0IHRoaXMucHJvbXB0Rm9yVGV4dChcIkNvb2tpZTpcIik7XG4gICAgaWYgKGNvb2tpZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnJlcXVlc3RIZWFkZXJzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIG9wdGlvbnMucmVxdWVzdEhlYWRlcnMgPSB7fTtcbiAgICB9XG4gICAgb3B0aW9ucy5yZXF1ZXN0SGVhZGVycy5Db29raWUgPSBjb29raWU7XG4gICAgb3B0aW9ucy54aHJGYWN0b3J5ID0gKCkgPT4ge1xuICAgICAgbGV0IHJlcXVlc3QgPSBuZXcgeGhyLlhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAvLyBEaXNhYmxlIHByb3RlY3Rpb25zIGFnYWluc3Qgc2V0dGluZyB0aGUgQ29va2llIGhlYWRlclxuICAgICAgcmVxdWVzdC5zZXREaXNhYmxlSGVhZGVyQ2hlY2sodHJ1ZSk7XG4gICAgICByZXR1cm4gcmVxdWVzdDtcbiAgICB9O1xuICAgIG9wdGlvbnMud3NGYWN0b3J5ID0gKHVybCwgcHJvdG9jb2wpID0+IHtcbiAgICAgIC8vIEF1dGhlbnRpY2F0aW9uIHJlcXVpcmVzIHJlcXVlc3RzIHRvIGFwcGVhciB0byBiZSBzYW1lLW9yaWdpblxuICAgICAgbGV0IHBhcnNlZFVybCA9IG5ldyBVUkwodXJsKTtcbiAgICAgIGlmIChwYXJzZWRVcmwucHJvdG9jb2wgPT0gXCJ3c3M6XCIpIHtcbiAgICAgICAgcGFyc2VkVXJsLnByb3RvY29sID0gXCJodHRwczpcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcnNlZFVybC5wcm90b2NvbCA9IFwiaHR0cDpcIjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGhlYWRlcnMgPSB7IENvb2tpZTogY29va2llIH07XG4gICAgICBjb25zdCBvcmlnaW4gPSBwYXJzZWRVcmwub3JpZ2luO1xuICAgICAgY29uc3QgaG9zdCA9IHBhcnNlZFVybC5ob3N0O1xuICAgICAgcmV0dXJuIG5ldyB3cyh1cmwsIHByb3RvY29sLCB7IGhlYWRlcnMsIG9yaWdpbiwgaG9zdCB9KTtcbiAgICB9O1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYXN5bmMgcHJvbXB0Rm9yVG9rZW4ob3B0aW9uczogYW55KSB7XG4gICAgY29uc3QgdG9rZW4gPSBhd2FpdCB0aGlzLnByb21wdEZvclRleHQoXCJUb2tlbjpcIik7XG4gICAgaWYgKHRva2VuID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgb3B0aW9ucy50b2tlbiA9IHRva2VuO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgYXN5bmMgcHJvbXB0Rm9yQ3JlZGVudGlhbHMob3B0aW9uczogYW55KSB7XG4gICAgYXdhaXQgdGhpcy5saXN0Vmlldy5zZWxlY3RMaXN0Vmlldy51cGRhdGUoe1xuICAgICAgaXRlbXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiQXV0aGVudGljYXRlIHdpdGggYSB0b2tlblwiLFxuICAgICAgICAgIGFjdGlvbjogXCJ0b2tlblwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcIkF1dGhlbnRpY2F0ZSB3aXRoIGEgY29va2llXCIsXG4gICAgICAgICAgYWN0aW9uOiBcImNvb2tpZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcIkNhbmNlbFwiLFxuICAgICAgICAgIGFjdGlvbjogXCJjYW5jZWxcIlxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgaW5mb01lc3NhZ2U6XG4gICAgICAgIFwiQ29ubmVjdGlvbiB0byBnYXRld2F5IGZhaWxlZC4gWW91ciBzZXR0aW5ncyBtYXkgYmUgaW5jb3JyZWN0LCB0aGUgc2VydmVyIG1heSBiZSB1bmF2YWlsYWJsZSwgb3IgeW91IG1heSBsYWNrIHN1ZmZpY2llbnQgcHJpdmlsZWdlcyB0byBjb21wbGV0ZSB0aGUgY29ubmVjdGlvbi5cIixcbiAgICAgIGxvYWRpbmdNZXNzYWdlOiBudWxsLFxuICAgICAgZW1wdHlNZXNzYWdlOiBudWxsXG4gICAgfSk7XG5cbiAgICBjb25zdCBhY3Rpb24gPSBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLmxpc3RWaWV3Lm9uQ29uZmlybWVkID0gaXRlbSA9PiByZXNvbHZlKGl0ZW0uYWN0aW9uKTtcbiAgICAgIHRoaXMubGlzdFZpZXcub25DYW5jZWxsZWQgPSAoKSA9PiByZXNvbHZlKFwiY2FuY2VsXCIpO1xuICAgIH0pO1xuICAgIGlmIChhY3Rpb24gPT09IFwidG9rZW5cIikge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucHJvbXB0Rm9yVG9rZW4ob3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmIChhY3Rpb24gPT09IFwiY29va2llXCIpIHtcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLnByb21wdEZvckNvb2tpZShvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gYWN0aW9uID09PSBcImNhbmNlbFwiXG4gICAgICB0aGlzLmxpc3RWaWV3LmNhbmNlbCgpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIG9uR2F0ZXdheShnYXRld2F5SW5mbzogYW55KSB7XG4gICAgdGhpcy5saXN0Vmlldy5vbkNvbmZpcm1lZCA9IG51bGw7XG4gICAgYXdhaXQgdGhpcy5saXN0Vmlldy5zZWxlY3RMaXN0Vmlldy51cGRhdGUoe1xuICAgICAgaXRlbXM6IFtdLFxuICAgICAgaW5mb01lc3NhZ2U6IG51bGwsXG4gICAgICBsb2FkaW5nTWVzc2FnZTogXCJMb2FkaW5nIHNlc3Npb25zLi4uXCIsXG4gICAgICBlbXB0eU1lc3NhZ2U6IFwiTm8gc2Vzc2lvbnMgYXZhaWxhYmxlXCJcbiAgICB9KTtcblxuICAgIGNvbnN0IGdhdGV3YXlPcHRpb25zID0gT2JqZWN0LmFzc2lnbihcbiAgICAgIHtcbiAgICAgICAgeGhyRmFjdG9yeTogKCkgPT4gbmV3IHhoci5YTUxIdHRwUmVxdWVzdCgpLFxuICAgICAgICB3c0ZhY3Rvcnk6ICh1cmwsIHByb3RvY29sKSA9PiBuZXcgd3ModXJsLCBwcm90b2NvbClcbiAgICAgIH0sXG4gICAgICBnYXRld2F5SW5mby5vcHRpb25zXG4gICAgKTtcblxuICAgIGxldCBzZXJ2ZXJTZXR0aW5ncyA9IFNlcnZlckNvbm5lY3Rpb24ubWFrZVNldHRpbmdzKGdhdGV3YXlPcHRpb25zKTtcbiAgICBsZXQgc3BlY01vZGVscztcblxuICAgIHRyeSB7XG4gICAgICBzcGVjTW9kZWxzID0gYXdhaXQgS2VybmVsLmdldFNwZWNzKHNlcnZlclNldHRpbmdzKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gVGhlIGVycm9yIHR5cGVzIHlvdSBnZXQgYmFjayBhdCB0aGlzIHN0YWdlIGFyZSBmYWlybHkgb3BhcXVlLiBJblxuICAgICAgLy8gcGFydGljdWxhciwgaGF2aW5nIGludmFsaWQgY3JlZGVudGlhbHMgdHlwaWNhbGx5IHRyaWdnZXJzIEVDT05OUkVGVVNFRFxuICAgICAgLy8gcmF0aGVyIHRoYW4gNDAzIEZvcmJpZGRlbi4gVGhpcyBkb2VzIHNvbWUgYmFzaWMgY2hlY2tzIGFuZCB0aGVuIGFzc3VtZXNcbiAgICAgIC8vIHRoYXQgYWxsIHJlbWFpbmluZyBlcnJvciB0eXBlcyBjb3VsZCBiZSBjYXVzZWQgYnkgaW52YWxpZCBjcmVkZW50aWFscy5cbiAgICAgIGlmICghZXJyb3IueGhyIHx8ICFlcnJvci54aHIucmVzcG9uc2VUZXh0KSB7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfSBlbHNlIGlmIChlcnJvci54aHIucmVzcG9uc2VUZXh0LmluY2x1ZGVzKFwiRVRJTUVET1VUXCIpKSB7XG4gICAgICAgIGF0b20ubm90aWZpY2F0aW9ucy5hZGRFcnJvcihcIkNvbm5lY3Rpb24gdG8gZ2F0ZXdheSBmYWlsZWRcIik7XG4gICAgICAgIHRoaXMubGlzdFZpZXcuY2FuY2VsKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHByb21wdFN1Y2NlZWRlZCA9IGF3YWl0IHRoaXMucHJvbXB0Rm9yQ3JlZGVudGlhbHMoZ2F0ZXdheU9wdGlvbnMpO1xuICAgICAgICBpZiAoIXByb21wdFN1Y2NlZWRlZCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzZXJ2ZXJTZXR0aW5ncyA9IFNlcnZlckNvbm5lY3Rpb24ubWFrZVNldHRpbmdzKGdhdGV3YXlPcHRpb25zKTtcbiAgICAgICAgYXdhaXQgdGhpcy5saXN0Vmlldy5zZWxlY3RMaXN0Vmlldy51cGRhdGUoe1xuICAgICAgICAgIGl0ZW1zOiBbXSxcbiAgICAgICAgICBpbmZvTWVzc2FnZTogbnVsbCxcbiAgICAgICAgICBsb2FkaW5nTWVzc2FnZTogXCJMb2FkaW5nIHNlc3Npb25zLi4uXCIsXG4gICAgICAgICAgZW1wdHlNZXNzYWdlOiBcIk5vIHNlc3Npb25zIGF2YWlsYWJsZVwiXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBpZiAoIXNwZWNNb2RlbHMpIHtcbiAgICAgICAgc3BlY01vZGVscyA9IGF3YWl0IEtlcm5lbC5nZXRTcGVjcyhzZXJ2ZXJTZXR0aW5ncyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGtlcm5lbFNwZWNzID0gXy5maWx0ZXIoc3BlY01vZGVscy5rZXJuZWxzcGVjcywgc3BlYyA9PlxuICAgICAgICB0aGlzLl9rZXJuZWxTcGVjRmlsdGVyKHNwZWMpXG4gICAgICApO1xuXG4gICAgICBjb25zdCBrZXJuZWxOYW1lcyA9IF8ubWFwKGtlcm5lbFNwZWNzLCBzcGVjTW9kZWwgPT4gc3BlY01vZGVsLm5hbWUpO1xuXG4gICAgICB0cnkge1xuICAgICAgICBsZXQgc2Vzc2lvbk1vZGVscyA9IGF3YWl0IFNlc3Npb24ubGlzdFJ1bm5pbmcoc2VydmVyU2V0dGluZ3MpO1xuICAgICAgICBzZXNzaW9uTW9kZWxzID0gc2Vzc2lvbk1vZGVscy5maWx0ZXIobW9kZWwgPT4ge1xuICAgICAgICAgIGNvbnN0IG5hbWUgPSBtb2RlbC5rZXJuZWwgPyBtb2RlbC5rZXJuZWwubmFtZSA6IG51bGw7XG4gICAgICAgICAgcmV0dXJuIG5hbWUgPyBrZXJuZWxOYW1lcy5pbmNsdWRlcyhuYW1lKSA6IHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBpdGVtcyA9IHNlc3Npb25Nb2RlbHMubWFwKG1vZGVsID0+IHtcbiAgICAgICAgICBsZXQgbmFtZTtcbiAgICAgICAgICBpZiAobW9kZWwucGF0aCkge1xuICAgICAgICAgICAgbmFtZSA9IHRpbGRpZnkobW9kZWwucGF0aCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtb2RlbC5ub3RlYm9vayAmJiBtb2RlbC5ub3RlYm9vay5wYXRoKSB7XG4gICAgICAgICAgICBuYW1lID0gdGlsZGlmeShtb2RlbC5ub3RlYm9vay5wYXRoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmFtZSA9IGBTZXNzaW9uICR7bW9kZWwuaWR9YDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHsgbmFtZSwgbW9kZWwsIG9wdGlvbnM6IHNlcnZlclNldHRpbmdzIH07XG4gICAgICAgIH0pO1xuICAgICAgICBpdGVtcy51bnNoaWZ0KHtcbiAgICAgICAgICBuYW1lOiBcIltuZXcgc2Vzc2lvbl1cIixcbiAgICAgICAgICBtb2RlbDogbnVsbCxcbiAgICAgICAgICBvcHRpb25zOiBzZXJ2ZXJTZXR0aW5ncyxcbiAgICAgICAgICBrZXJuZWxTcGVjc1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5saXN0Vmlldy5vbkNvbmZpcm1lZCA9IHRoaXMub25TZXNzaW9uLmJpbmQodGhpcywgZ2F0ZXdheUluZm8ubmFtZSk7XG4gICAgICAgIGF3YWl0IHRoaXMubGlzdFZpZXcuc2VsZWN0TGlzdFZpZXcudXBkYXRlKHtcbiAgICAgICAgICBpdGVtczogaXRlbXMsXG4gICAgICAgICAgbG9hZGluZ01lc3NhZ2U6IG51bGxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBpZiAoIWVycm9yLnhociB8fCBlcnJvci54aHIuc3RhdHVzICE9PSA0MDMpIHRocm93IGVycm9yO1xuICAgICAgICAvLyBHYXRld2F5cyBvZmZlciB0aGUgb3B0aW9uIG9mIG5ldmVyIGxpc3Rpbmcgc2Vzc2lvbnMsIGZvciBzZWN1cml0eVxuICAgICAgICAvLyByZWFzb25zLlxuICAgICAgICAvLyBBc3N1bWUgdGhpcyBpcyB0aGUgY2FzZSBhbmQgcHJvY2VlZCB0byBjcmVhdGluZyBhIG5ldyBzZXNzaW9uLlxuICAgICAgICB0aGlzLm9uU2Vzc2lvbihnYXRld2F5SW5mby5uYW1lLCB7XG4gICAgICAgICAgbmFtZTogXCJbbmV3IHNlc3Npb25dXCIsXG4gICAgICAgICAgbW9kZWw6IG51bGwsXG4gICAgICAgICAgb3B0aW9uczogc2VydmVyU2V0dGluZ3MsXG4gICAgICAgICAga2VybmVsU3BlY3NcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZEVycm9yKFwiQ29ubmVjdGlvbiB0byBnYXRld2F5IGZhaWxlZFwiKTtcbiAgICAgIHRoaXMubGlzdFZpZXcuY2FuY2VsKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgb25TZXNzaW9uKGdhdGV3YXlOYW1lOiBzdHJpbmcsIHNlc3Npb25JbmZvOiBhbnkpIHtcbiAgICBpZiAoIXNlc3Npb25JbmZvLm1vZGVsKSB7XG4gICAgICBpZiAoIXNlc3Npb25JbmZvLm5hbWUpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5saXN0Vmlldy5zZWxlY3RMaXN0Vmlldy51cGRhdGUoe1xuICAgICAgICAgIGl0ZW1zOiBbXSxcbiAgICAgICAgICBlcnJvck1lc3NhZ2U6IFwiVGhpcyBnYXRld2F5IGRvZXMgbm90IHN1cHBvcnQgbGlzdGluZyBzZXNzaW9uc1wiLFxuICAgICAgICAgIGxvYWRpbmdNZXNzYWdlOiBudWxsLFxuICAgICAgICAgIGluZm9NZXNzYWdlOiBudWxsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY29uc3QgaXRlbXMgPSBfLm1hcChzZXNzaW9uSW5mby5rZXJuZWxTcGVjcywgc3BlYyA9PiB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgc2VydmVyU2V0dGluZ3M6IHNlc3Npb25JbmZvLm9wdGlvbnMsXG4gICAgICAgICAga2VybmVsTmFtZTogc3BlYy5uYW1lLFxuICAgICAgICAgIHBhdGg6IHRoaXMuX3BhdGhcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBuYW1lOiBzcGVjLmRpc3BsYXlfbmFtZSxcbiAgICAgICAgICBvcHRpb25zXG4gICAgICAgIH07XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5saXN0Vmlldy5vbkNvbmZpcm1lZCA9IHRoaXMuc3RhcnRTZXNzaW9uLmJpbmQodGhpcywgZ2F0ZXdheU5hbWUpO1xuICAgICAgYXdhaXQgdGhpcy5saXN0Vmlldy5zZWxlY3RMaXN0Vmlldy51cGRhdGUoe1xuICAgICAgICBpdGVtczogaXRlbXMsXG4gICAgICAgIGVtcHR5TWVzc2FnZTogXCJObyBrZXJuZWwgc3BlY3MgYXZhaWxhYmxlXCIsXG4gICAgICAgIGluZm9NZXNzYWdlOiBcIlNlbGVjdCBhIHNlc3Npb25cIixcbiAgICAgICAgbG9hZGluZ01lc3NhZ2U6IG51bGxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9uU2Vzc2lvbkNob3NlbihcbiAgICAgICAgZ2F0ZXdheU5hbWUsXG4gICAgICAgIGF3YWl0IFNlc3Npb24uY29ubmVjdFRvKHNlc3Npb25JbmZvLm1vZGVsLmlkLCBzZXNzaW9uSW5mby5vcHRpb25zKVxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBzdGFydFNlc3Npb24oZ2F0ZXdheU5hbWU6IHN0cmluZywgc2Vzc2lvbkluZm86IGFueSkge1xuICAgIFNlc3Npb24uc3RhcnROZXcoc2Vzc2lvbkluZm8ub3B0aW9ucykudGhlbihcbiAgICAgIHRoaXMub25TZXNzaW9uQ2hvc2VuLmJpbmQodGhpcywgZ2F0ZXdheU5hbWUpXG4gICAgKTtcbiAgfVxuXG4gIGFzeW5jIG9uU2Vzc2lvbkNob3NlbihnYXRld2F5TmFtZTogc3RyaW5nLCBzZXNzaW9uOiBhbnkpIHtcbiAgICB0aGlzLmxpc3RWaWV3LmNhbmNlbCgpO1xuICAgIGNvbnN0IGtlcm5lbFNwZWMgPSBhd2FpdCBzZXNzaW9uLmtlcm5lbC5nZXRTcGVjKCk7XG4gICAgaWYgKCFzdG9yZS5ncmFtbWFyKSByZXR1cm47XG5cbiAgICBjb25zdCBrZXJuZWwgPSBuZXcgV1NLZXJuZWwoXG4gICAgICBnYXRld2F5TmFtZSxcbiAgICAgIGtlcm5lbFNwZWMsXG4gICAgICBzdG9yZS5ncmFtbWFyLFxuICAgICAgc2Vzc2lvblxuICAgICk7XG4gICAgdGhpcy5fb25DaG9zZW4oa2VybmVsKTtcbiAgfVxufVxuIl19