Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createDecoratedClass = (function () { function defineProperties(target, descriptors, initializers) { for (var i = 0; i < descriptors.length; i++) { var descriptor = descriptors[i]; var decorators = descriptor.decorators; var key = descriptor.key; delete descriptor.key; delete descriptor.decorators; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor || descriptor.initializer) descriptor.writable = true; if (decorators) { for (var f = 0; f < decorators.length; f++) { var decorator = decorators[f]; if (typeof decorator === "function") { descriptor = decorator(target, key, descriptor) || descriptor; } else { throw new TypeError("The decorator for method " + descriptor.key + " is of the invalid type " + typeof decorator); } } if (descriptor.initializer !== undefined) { initializers[key] = descriptor; continue; } } Object.defineProperty(target, key, descriptor); } } return function (Constructor, protoProps, staticProps, protoInitializers, staticInitializers) { if (protoProps) defineProperties(Constructor.prototype, protoProps, protoInitializers); if (staticProps) defineProperties(Constructor, staticProps, staticInitializers); return Constructor; }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, "next"); var callThrow = step.bind(null, "throw"); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

function _defineDecoratedPropertyDescriptor(target, key, descriptors) { var _descriptor = descriptors[key]; if (!_descriptor) return; var descriptor = {}; for (var _key in _descriptor) descriptor[_key] = _descriptor[_key]; descriptor.value = descriptor.initializer ? descriptor.initializer.call(target) : undefined; Object.defineProperty(target, key, descriptor); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _atom = require("atom");

var _mobx = require("mobx");

var _lodash = require("lodash");

var _utils = require("./utils");

var _store = require("./store");

var _store2 = _interopRequireDefault(_store);

var _storeWatches = require("./store/watches");

var _storeWatches2 = _interopRequireDefault(_storeWatches);

var _storeOutput = require("./store/output");

var _storeOutput2 = _interopRequireDefault(_storeOutput);

var _pluginApiHydrogenKernel = require("./plugin-api/hydrogen-kernel");

var _pluginApiHydrogenKernel2 = _interopRequireDefault(_pluginApiHydrogenKernel);

var _inputView = require("./input-view");

var _inputView2 = _interopRequireDefault(_inputView);

var _kernelTransport = require("./kernel-transport");

var _kernelTransport2 = _interopRequireDefault(_kernelTransport);

function protectFromInvalidMessages(onResults) {
  var wrappedOnResults = function wrappedOnResults(message, channel) {
    if (!message) {
      (0, _utils.log)("Invalid message: null");
      return;
    }

    if (!message.content) {
      (0, _utils.log)("Invalid message: Missing content");
      return;
    }

    if (message.content.execution_state === "starting") {
      // Kernels send a starting status message with an empty parent_header
      (0, _utils.log)("Dropped starting status IO message");
      return;
    }

    if (!message.parent_header) {
      (0, _utils.log)("Invalid message: Missing parent_header");
      return;
    }

    if (!message.parent_header.msg_id) {
      (0, _utils.log)("Invalid message: Missing parent_header.msg_id");
      return;
    }

    if (!message.parent_header.msg_type) {
      (0, _utils.log)("Invalid message: Missing parent_header.msg_type");
      return;
    }

    if (!message.header) {
      (0, _utils.log)("Invalid message: Missing header");
      return;
    }

    if (!message.header.msg_id) {
      (0, _utils.log)("Invalid message: Missing header.msg_id");
      return;
    }

    if (!message.header.msg_type) {
      (0, _utils.log)("Invalid message: Missing header.msg_type");
      return;
    }

    onResults(message, channel);
  };
  return wrappedOnResults;
}

// Adapts middleware objects provided by plugins to an internal interface. In
// particular, this implements fallthrough logic for when a plugin defines some
// methods (e.g. execute) but doesn't implement others (e.g. interrupt). Note
// that HydrogenKernelMiddleware objects are mutable: they may lose/gain methods
// at any time, including in the middle of processing a request. This class also
// adds basic checks that messages passed via the `onResults` callbacks are not
// missing key mandatory fields specified in the Jupyter messaging spec.

var MiddlewareAdapter = (function () {
  function MiddlewareAdapter(middleware, next) {
    _classCallCheck(this, MiddlewareAdapter);

    this._middleware = middleware;
    this._next = next;
  }

  // The return value of this method gets passed to plugins! For now we just
  // return the MiddlewareAdapter object itself, which is why all private
  // functionality is prefixed with _, and why MiddlewareAdapter is marked as
  // implementing HydrogenKernelMiddlewareThunk. Once multiple plugin API
  // versions exist, we may want to generate a HydrogenKernelMiddlewareThunk
  // specialized for a particular plugin API version.

  _createClass(MiddlewareAdapter, [{
    key: "interrupt",
    value: function interrupt() {
      if (this._middleware.interrupt) {
        this._middleware.interrupt(this._nextAsPluginType);
      } else {
        this._next.interrupt();
      }
    }
  }, {
    key: "shutdown",
    value: function shutdown() {
      if (this._middleware.shutdown) {
        this._middleware.shutdown(this._nextAsPluginType);
      } else {
        this._next.shutdown();
      }
    }
  }, {
    key: "restart",
    value: function restart(onRestarted) {
      if (this._middleware.restart) {
        this._middleware.restart(this._nextAsPluginType, onRestarted);
      } else {
        this._next.restart(onRestarted);
      }
    }
  }, {
    key: "execute",
    value: function execute(code, onResults) {
      // We don't want to repeatedly wrap the onResults callback every time we
      // fall through, but we need to do it at least once before delegating to
      // the KernelTransport.
      var safeOnResults = this._middleware.execute || this._next instanceof _kernelTransport2["default"] ? protectFromInvalidMessages(onResults) : onResults;

      if (this._middleware.execute) {
        this._middleware.execute(this._nextAsPluginType, code, safeOnResults);
      } else {
        this._next.execute(code, safeOnResults);
      }
    }
  }, {
    key: "complete",
    value: function complete(code, onResults) {
      var safeOnResults = this._middleware.complete || this._next instanceof _kernelTransport2["default"] ? protectFromInvalidMessages(onResults) : onResults;

      if (this._middleware.complete) {
        this._middleware.complete(this._nextAsPluginType, code, safeOnResults);
      } else {
        this._next.complete(code, safeOnResults);
      }
    }
  }, {
    key: "inspect",
    value: function inspect(code, cursorPos, onResults) {
      var safeOnResults = this._middleware.inspect || this._next instanceof _kernelTransport2["default"] ? protectFromInvalidMessages(onResults) : onResults;
      if (this._middleware.inspect) {
        this._middleware.inspect(this._nextAsPluginType, code, cursorPos, safeOnResults);
      } else {
        this._next.inspect(code, cursorPos, safeOnResults);
      }
    }
  }, {
    key: "_nextAsPluginType",
    get: function get() {
      if (this._next instanceof _kernelTransport2["default"]) {
        throw new Error("MiddlewareAdapter: _nextAsPluginType must never be called when _next is KernelTransport");
      }
      return this._next;
    }
  }]);

  return MiddlewareAdapter;
})();

var Kernel = (function () {
  var _instanceInitializers = {};
  var _instanceInitializers = {};

  _createDecoratedClass(Kernel, [{
    key: "inspector",
    decorators: [_mobx.observable],
    initializer: function initializer() {
      return { bundle: {} };
    },
    enumerable: true
  }], null, _instanceInitializers);

  function Kernel(kernel) {
    _classCallCheck(this, Kernel);

    _defineDecoratedPropertyDescriptor(this, "inspector", _instanceInitializers);

    this.outputStore = new _storeOutput2["default"]();
    this.watchCallbacks = [];
    this.emitter = new _atom.Emitter();
    this.pluginWrapper = null;

    this.transport = kernel;

    this.watchesStore = new _storeWatches2["default"](this);

    // A MiddlewareAdapter that forwards all requests to `this.transport`.
    // Needed to terminate the middleware chain in a way such that the `next`
    // object passed to the last middleware is not the KernelTransport instance
    // itself (which would be violate isolation of internals from plugins).
    var delegateToTransport = new MiddlewareAdapter({}, this.transport);
    this.middleware = [delegateToTransport];
  }

  _createDecoratedClass(Kernel, [{
    key: "addMiddleware",
    value: function addMiddleware(middleware) {
      this.middleware.unshift(new MiddlewareAdapter(middleware, this.middleware[0]));
    }
  }, {
    key: "setExecutionState",
    value: function setExecutionState(state) {
      this.transport.setExecutionState(state);
    }
  }, {
    key: "setInspectorResult",
    decorators: [_mobx.action],
    value: _asyncToGenerator(function* (bundle, editor) {
      if ((0, _lodash.isEqual)(this.inspector.bundle, bundle)) {
        yield atom.workspace.toggle(_utils.INSPECTOR_URI);
      } else if (bundle.size !== 0) {
        this.inspector.bundle = bundle;
        yield atom.workspace.open(_utils.INSPECTOR_URI, { searchAllPanes: true });
      }
      (0, _utils.focus)(editor);
    })
  }, {
    key: "getPluginWrapper",
    value: function getPluginWrapper() {
      if (!this.pluginWrapper) {
        this.pluginWrapper = new _pluginApiHydrogenKernel2["default"](this);
      }

      return this.pluginWrapper;
    }
  }, {
    key: "addWatchCallback",
    value: function addWatchCallback(watchCallback) {
      this.watchCallbacks.push(watchCallback);
    }
  }, {
    key: "interrupt",
    value: function interrupt() {
      this.firstMiddlewareAdapter.interrupt();
    }
  }, {
    key: "shutdown",
    value: function shutdown() {
      this.firstMiddlewareAdapter.shutdown();
    }
  }, {
    key: "restart",
    value: function restart(onRestarted) {
      this.firstMiddlewareAdapter.restart(onRestarted);
    }
  }, {
    key: "execute",
    value: function execute(code, onResults) {
      var _this = this;

      var wrappedOnResults = this._wrapExecutionResultsCallback(onResults);
      this.firstMiddlewareAdapter.execute(code, function (message, channel) {
        wrappedOnResults(message, channel);

        if (channel == "iopub" && message.header.msg_type === "status" && message.content.execution_state === "idle") {
          _this._callWatchCallbacks();
        }
      });
    }
  }, {
    key: "executeWatch",
    value: function executeWatch(code, onResults) {
      this.firstMiddlewareAdapter.execute(code, this._wrapExecutionResultsCallback(onResults));
    }
  }, {
    key: "_callWatchCallbacks",
    value: function _callWatchCallbacks() {
      this.watchCallbacks.forEach(function (watchCallback) {
        return watchCallback();
      });
    }

    /*
     * Takes a callback that accepts execution results in a hydrogen-internal
     * format and wraps it to accept Jupyter message/channel pairs instead.
     * Kernels and plugins all operate on types specified by the Jupyter messaging
     * protocol in order to maximize compatibility, but hydrogen internally uses
     * its own types.
     */
  }, {
    key: "_wrapExecutionResultsCallback",
    value: function _wrapExecutionResultsCallback(onResults) {
      var _this2 = this;

      return function (message, channel) {
        if (channel === "shell") {
          var _status = message.content.status;

          if (_status === "error" || _status === "ok") {
            onResults({
              data: _status,
              stream: "status"
            });
          } else {
            console.warn("Kernel: ignoring unexpected value for message.content.status");
          }
        } else if (channel === "iopub") {
          if (message.header.msg_type === "execute_input") {
            onResults({
              data: message.content.execution_count,
              stream: "execution_count"
            });
          }

          // TODO(nikita): Consider converting to V5 elsewhere, so that plugins
          // never have to deal with messages in the V4 format
          var result = (0, _utils.msgSpecToNotebookFormat)((0, _utils.msgSpecV4toV5)(message));
          onResults(result);
        } else if (channel === "stdin") {
          if (message.header.msg_type !== "input_request") {
            return;
          }

          var _prompt = message.content.prompt;

          // TODO(nikita): perhaps it would make sense to install middleware for
          // sending input replies
          var inputView = new _inputView2["default"]({ prompt: _prompt }, function (input) {
            return _this2.transport.inputReply(input);
          });

          inputView.attach();
        }
      };
    }
  }, {
    key: "complete",
    value: function complete(code, onResults) {
      this.firstMiddlewareAdapter.complete(code, function (message, channel) {
        if (channel !== "shell") {
          (0, _utils.log)("Invalid reply: wrong channel");
          return;
        }
        onResults(message.content);
      });
    }
  }, {
    key: "inspect",
    value: function inspect(code, cursorPos, onResults) {
      this.firstMiddlewareAdapter.inspect(code, cursorPos, function (message, channel) {
        if (channel !== "shell") {
          (0, _utils.log)("Invalid reply: wrong channel");
          return;
        }
        onResults({
          data: message.content.data,
          found: message.content.found
        });
      });
    }
  }, {
    key: "destroy",
    value: function destroy() {
      (0, _utils.log)("Kernel: Destroying");
      _store2["default"].deleteKernel(this);
      this.transport.destroy();
      if (this.pluginWrapper) {
        this.pluginWrapper.destroyed = true;
      }
      this.emitter.emit("did-destroy");
      this.emitter.dispose();
    }
  }, {
    key: "kernelSpec",
    get: function get() {
      return this.transport.kernelSpec;
    }
  }, {
    key: "grammar",
    get: function get() {
      return this.transport.grammar;
    }
  }, {
    key: "language",
    get: function get() {
      return this.transport.language;
    }
  }, {
    key: "displayName",
    get: function get() {
      return this.transport.displayName;
    }
  }, {
    key: "firstMiddlewareAdapter",
    get: function get() {
      return this.middleware[0];
    }
  }, {
    key: "executionState",
    decorators: [_mobx.computed],
    get: function get() {
      return this.transport.executionState;
    }
  }], null, _instanceInitializers);

  return Kernel;
})();

exports["default"] = Kernel;
module.exports = exports["default"];

// Invariant: the `._next` of each entry in this array must point to the next
// element of the array. The `._next` of the last element must point to
// `this.transport`.
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvSHlkcm9nZW4vbGliL2tlcm5lbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O29CQUV3QixNQUFNOztvQkFDZSxNQUFNOztzQkFDM0IsUUFBUTs7cUJBUXpCLFNBQVM7O3FCQUNFLFNBQVM7Ozs7NEJBRUYsaUJBQWlCOzs7OzJCQUNsQixnQkFBZ0I7Ozs7dUNBQ2IsOEJBQThCOzs7O3lCQUtuQyxjQUFjOzs7OytCQUNSLG9CQUFvQjs7OztBQUdoRCxTQUFTLDBCQUEwQixDQUNqQyxTQUEwQixFQUNUO0FBQ2pCLE1BQU0sZ0JBQWlDLEdBQUcsU0FBcEMsZ0JBQWlDLENBQUksT0FBTyxFQUFFLE9BQU8sRUFBSztBQUM5RCxRQUFJLENBQUMsT0FBTyxFQUFFO0FBQ1osc0JBQUksdUJBQXVCLENBQUMsQ0FBQztBQUM3QixhQUFPO0tBQ1I7O0FBRUQsUUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7QUFDcEIsc0JBQUksa0NBQWtDLENBQUMsQ0FBQztBQUN4QyxhQUFPO0tBQ1I7O0FBRUQsUUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLGVBQWUsS0FBSyxVQUFVLEVBQUU7O0FBRWxELHNCQUFJLG9DQUFvQyxDQUFDLENBQUM7QUFDMUMsYUFBTztLQUNSOztBQUVELFFBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFO0FBQzFCLHNCQUFJLHdDQUF3QyxDQUFDLENBQUM7QUFDOUMsYUFBTztLQUNSOztBQUVELFFBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtBQUNqQyxzQkFBSSwrQ0FBK0MsQ0FBQyxDQUFDO0FBQ3JELGFBQU87S0FDUjs7QUFFRCxRQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUU7QUFDbkMsc0JBQUksaURBQWlELENBQUMsQ0FBQztBQUN2RCxhQUFPO0tBQ1I7O0FBRUQsUUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFN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L0I7OztTQUVXLGVBQVc7QUFDckIsYUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztLQUNoQzs7O1NBRWMsZUFBVztBQUN4QixhQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDO0tBQ25DOzs7U0FFeUIsZUFBc0I7QUFDOUMsYUFBTyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzNCOzs7O1NBU2lCLGVBQVc7QUFDM0IsYUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQztLQUN0Qzs7O1NBMURrQixNQUFNOzs7cUJBQU4sTUFBTSIsImZpbGUiOiIvaG9tZS9rbmllbGJvLy5hdG9tL3BhY2thZ2VzL0h5ZHJvZ2VuL2xpYi9rZXJuZWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBAZmxvdyAqL1xuXG5pbXBvcnQgeyBFbWl0dGVyIH0gZnJvbSBcImF0b21cIjtcbmltcG9ydCB7IG9ic2VydmFibGUsIGFjdGlvbiwgY29tcHV0ZWQgfSBmcm9tIFwibW9ieFwiO1xuaW1wb3J0IHsgaXNFcXVhbCB9IGZyb20gXCJsb2Rhc2hcIjtcblxuaW1wb3J0IHtcbiAgbG9nLFxuICBmb2N1cyxcbiAgbXNnU3BlY1RvTm90ZWJvb2tGb3JtYXQsXG4gIG1zZ1NwZWNWNHRvVjUsXG4gIElOU1BFQ1RPUl9VUklcbn0gZnJvbSBcIi4vdXRpbHNcIjtcbmltcG9ydCBzdG9yZSBmcm9tIFwiLi9zdG9yZVwiO1xuXG5pbXBvcnQgV2F0Y2hlc1N0b3JlIGZyb20gXCIuL3N0b3JlL3dhdGNoZXNcIjtcbmltcG9ydCBPdXRwdXRTdG9yZSBmcm9tIFwiLi9zdG9yZS9vdXRwdXRcIjtcbmltcG9ydCBIeWRyb2dlbktlcm5lbCBmcm9tIFwiLi9wbHVnaW4tYXBpL2h5ZHJvZ2VuLWtlcm5lbFwiO1xuaW1wb3J0IHR5cGUge1xuICBIeWRyb2dlbktlcm5lbE1pZGRsZXdhcmVUaHVuayxcbiAgSHlkcm9nZW5LZXJuZWxNaWRkbGV3YXJlXG59IGZyb20gXCIuL3BsdWdpbi1hcGkvaHlkcm9nZW4tdHlwZXNcIjtcbmltcG9ydCBJbnB1dFZpZXcgZnJvbSBcIi4vaW5wdXQtdmlld1wiO1xuaW1wb3J0IEtlcm5lbFRyYW5zcG9ydCBmcm9tIFwiLi9rZXJuZWwtdHJhbnNwb3J0XCI7XG5pbXBvcnQgdHlwZSB7IFJlc3VsdHNDYWxsYmFjayB9IGZyb20gXCIuL2tlcm5lbC10cmFuc3BvcnRcIjtcblxuZnVuY3Rpb24gcHJvdGVjdEZyb21JbnZhbGlkTWVzc2FnZXMoXG4gIG9uUmVzdWx0czogUmVzdWx0c0NhbGxiYWNrXG4pOiBSZXN1bHRzQ2FsbGJhY2sge1xuICBjb25zdCB3cmFwcGVkT25SZXN1bHRzOiBSZXN1bHRzQ2FsbGJhY2sgPSAobWVzc2FnZSwgY2hhbm5lbCkgPT4ge1xuICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgbG9nKFwiSW52YWxpZCBtZXNzYWdlOiBudWxsXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghbWVzc2FnZS5jb250ZW50KSB7XG4gICAgICBsb2coXCJJbnZhbGlkIG1lc3NhZ2U6IE1pc3NpbmcgY29udGVudFwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAobWVzc2FnZS5jb250ZW50LmV4ZWN1dGlvbl9zdGF0ZSA9PT0gXCJzdGFydGluZ1wiKSB7XG4gICAgICAvLyBLZXJuZWxzIHNlbmQgYSBzdGFydGluZyBzdGF0dXMgbWVzc2FnZSB3aXRoIGFuIGVtcHR5IHBhcmVudF9oZWFkZXJcbiAgICAgIGxvZyhcIkRyb3BwZWQgc3RhcnRpbmcgc3RhdHVzIElPIG1lc3NhZ2VcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFtZXNzYWdlLnBhcmVudF9oZWFkZXIpIHtcbiAgICAgIGxvZyhcIkludmFsaWQgbWVzc2FnZTogTWlzc2luZyBwYXJlbnRfaGVhZGVyXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghbWVzc2FnZS5wYXJlbnRfaGVhZGVyLm1zZ19pZCkge1xuICAgICAgbG9nKFwiSW52YWxpZCBtZXNzYWdlOiBNaXNzaW5nIHBhcmVudF9oZWFkZXIubXNnX2lkXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghbWVzc2FnZS5wYXJlbnRfaGVhZGVyLm1zZ190eXBlKSB7XG4gICAgICBsb2coXCJJbnZhbGlkIG1lc3NhZ2U6IE1pc3NpbmcgcGFyZW50X2hlYWRlci5tc2dfdHlwZVwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIW1lc3NhZ2UuaGVhZGVyKSB7XG4gICAgICBsb2coXCJJbnZhbGlkIG1lc3NhZ2U6IE1pc3NpbmcgaGVhZGVyXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghbWVzc2FnZS5oZWFkZXIubXNnX2lkKSB7XG4gICAgICBsb2coXCJJbnZhbGlkIG1lc3NhZ2U6IE1pc3NpbmcgaGVhZGVyLm1zZ19pZFwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIW1lc3NhZ2UuaGVhZGVyLm1zZ190eXBlKSB7XG4gICAgICBsb2coXCJJbnZhbGlkIG1lc3NhZ2U6IE1pc3NpbmcgaGVhZGVyLm1zZ190eXBlXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIG9uUmVzdWx0cyhtZXNzYWdlLCBjaGFubmVsKTtcbiAgfTtcbiAgcmV0dXJuIHdyYXBwZWRPblJlc3VsdHM7XG59XG5cbi8vIEFkYXB0cyBtaWRkbGV3YXJlIG9iamVjdHMgcHJvdmlkZWQgYnkgcGx1Z2lucyB0byBhbiBpbnRlcm5hbCBpbnRlcmZhY2UuIEluXG4vLyBwYXJ0aWN1bGFyLCB0aGlzIGltcGxlbWVudHMgZmFsbHRocm91Z2ggbG9naWMgZm9yIHdoZW4gYSBwbHVnaW4gZGVmaW5lcyBzb21lXG4vLyBtZXRob2RzIChlLmcuIGV4ZWN1dGUpIGJ1dCBkb2Vzbid0IGltcGxlbWVudCBvdGhlcnMgKGUuZy4gaW50ZXJydXB0KS4gTm90ZVxuLy8gdGhhdCBIeWRyb2dlbktlcm5lbE1pZGRsZXdhcmUgb2JqZWN0cyBhcmUgbXV0YWJsZTogdGhleSBtYXkgbG9zZS9nYWluIG1ldGhvZHNcbi8vIGF0IGFueSB0aW1lLCBpbmNsdWRpbmcgaW4gdGhlIG1pZGRsZSBvZiBwcm9jZXNzaW5nIGEgcmVxdWVzdC4gVGhpcyBjbGFzcyBhbHNvXG4vLyBhZGRzIGJhc2ljIGNoZWNrcyB0aGF0IG1lc3NhZ2VzIHBhc3NlZCB2aWEgdGhlIGBvblJlc3VsdHNgIGNhbGxiYWNrcyBhcmUgbm90XG4vLyBtaXNzaW5nIGtleSBtYW5kYXRvcnkgZmllbGRzIHNwZWNpZmllZCBpbiB0aGUgSnVweXRlciBtZXNzYWdpbmcgc3BlYy5cbmNsYXNzIE1pZGRsZXdhcmVBZGFwdGVyIGltcGxlbWVudHMgSHlkcm9nZW5LZXJuZWxNaWRkbGV3YXJlVGh1bmsge1xuICBfbWlkZGxld2FyZTogSHlkcm9nZW5LZXJuZWxNaWRkbGV3YXJlO1xuICBfbmV4dDogTWlkZGxld2FyZUFkYXB0ZXIgfCBLZXJuZWxUcmFuc3BvcnQ7XG4gIGNvbnN0cnVjdG9yKFxuICAgIG1pZGRsZXdhcmU6IEh5ZHJvZ2VuS2VybmVsTWlkZGxld2FyZSxcbiAgICBuZXh0OiBNaWRkbGV3YXJlQWRhcHRlciB8IEtlcm5lbFRyYW5zcG9ydFxuICApIHtcbiAgICB0aGlzLl9taWRkbGV3YXJlID0gbWlkZGxld2FyZTtcbiAgICB0aGlzLl9uZXh0ID0gbmV4dDtcbiAgfVxuXG4gIC8vIFRoZSByZXR1cm4gdmFsdWUgb2YgdGhpcyBtZXRob2QgZ2V0cyBwYXNzZWQgdG8gcGx1Z2lucyEgRm9yIG5vdyB3ZSBqdXN0XG4gIC8vIHJldHVybiB0aGUgTWlkZGxld2FyZUFkYXB0ZXIgb2JqZWN0IGl0c2VsZiwgd2hpY2ggaXMgd2h5IGFsbCBwcml2YXRlXG4gIC8vIGZ1bmN0aW9uYWxpdHkgaXMgcHJlZml4ZWQgd2l0aCBfLCBhbmQgd2h5IE1pZGRsZXdhcmVBZGFwdGVyIGlzIG1hcmtlZCBhc1xuICAvLyBpbXBsZW1lbnRpbmcgSHlkcm9nZW5LZXJuZWxNaWRkbGV3YXJlVGh1bmsuIE9uY2UgbXVsdGlwbGUgcGx1Z2luIEFQSVxuICAvLyB2ZXJzaW9ucyBleGlzdCwgd2UgbWF5IHdhbnQgdG8gZ2VuZXJhdGUgYSBIeWRyb2dlbktlcm5lbE1pZGRsZXdhcmVUaHVua1xuICAvLyBzcGVjaWFsaXplZCBmb3IgYSBwYXJ0aWN1bGFyIHBsdWdpbiBBUEkgdmVyc2lvbi5cbiAgZ2V0IF9uZXh0QXNQbHVnaW5UeXBlKCk6IEh5ZHJvZ2VuS2VybmVsTWlkZGxld2FyZVRodW5rIHtcbiAgICBpZiAodGhpcy5fbmV4dCBpbnN0YW5jZW9mIEtlcm5lbFRyYW5zcG9ydCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBcIk1pZGRsZXdhcmVBZGFwdGVyOiBfbmV4dEFzUGx1Z2luVHlwZSBtdXN0IG5ldmVyIGJlIGNhbGxlZCB3aGVuIF9uZXh0IGlzIEtlcm5lbFRyYW5zcG9ydFwiXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fbmV4dDtcbiAgfVxuXG4gIGludGVycnVwdCgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fbWlkZGxld2FyZS5pbnRlcnJ1cHQpIHtcbiAgICAgIHRoaXMuX21pZGRsZXdhcmUuaW50ZXJydXB0KHRoaXMuX25leHRBc1BsdWdpblR5cGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9uZXh0LmludGVycnVwdCgpO1xuICAgIH1cbiAgfVxuXG4gIHNodXRkb3duKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLl9taWRkbGV3YXJlLnNodXRkb3duKSB7XG4gICAgICB0aGlzLl9taWRkbGV3YXJlLnNodXRkb3duKHRoaXMuX25leHRBc1BsdWdpblR5cGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9uZXh0LnNodXRkb3duKCk7XG4gICAgfVxuICB9XG5cbiAgcmVzdGFydChvblJlc3RhcnRlZDogP0Z1bmN0aW9uKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX21pZGRsZXdhcmUucmVzdGFydCkge1xuICAgICAgdGhpcy5fbWlkZGxld2FyZS5yZXN0YXJ0KHRoaXMuX25leHRBc1BsdWdpblR5cGUsIG9uUmVzdGFydGVkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbmV4dC5yZXN0YXJ0KG9uUmVzdGFydGVkKTtcbiAgICB9XG4gIH1cblxuICBleGVjdXRlKGNvZGU6IHN0cmluZywgb25SZXN1bHRzOiBSZXN1bHRzQ2FsbGJhY2spOiB2b2lkIHtcbiAgICAvLyBXZSBkb24ndCB3YW50IHRvIHJlcGVhdGVkbHkgd3JhcCB0aGUgb25SZXN1bHRzIGNhbGxiYWNrIGV2ZXJ5IHRpbWUgd2VcbiAgICAvLyBmYWxsIHRocm91Z2gsIGJ1dCB3ZSBuZWVkIHRvIGRvIGl0IGF0IGxlYXN0IG9uY2UgYmVmb3JlIGRlbGVnYXRpbmcgdG9cbiAgICAvLyB0aGUgS2VybmVsVHJhbnNwb3J0LlxuICAgIGxldCBzYWZlT25SZXN1bHRzID1cbiAgICAgIHRoaXMuX21pZGRsZXdhcmUuZXhlY3V0ZSB8fCB0aGlzLl9uZXh0IGluc3RhbmNlb2YgS2VybmVsVHJhbnNwb3J0XG4gICAgICAgID8gcHJvdGVjdEZyb21JbnZhbGlkTWVzc2FnZXMob25SZXN1bHRzKVxuICAgICAgICA6IG9uUmVzdWx0cztcblxuICAgIGlmICh0aGlzLl9taWRkbGV3YXJlLmV4ZWN1dGUpIHtcbiAgICAgIHRoaXMuX21pZGRsZXdhcmUuZXhlY3V0ZSh0aGlzLl9uZXh0QXNQbHVnaW5UeXBlLCBjb2RlLCBzYWZlT25SZXN1bHRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbmV4dC5leGVjdXRlKGNvZGUsIHNhZmVPblJlc3VsdHMpO1xuICAgIH1cbiAgfVxuXG4gIGNvbXBsZXRlKGNvZGU6IHN0cmluZywgb25SZXN1bHRzOiBSZXN1bHRzQ2FsbGJhY2spOiB2b2lkIHtcbiAgICBsZXQgc2FmZU9uUmVzdWx0cyA9XG4gICAgICB0aGlzLl9taWRkbGV3YXJlLmNvbXBsZXRlIHx8IHRoaXMuX25leHQgaW5zdGFuY2VvZiBLZXJuZWxUcmFuc3BvcnRcbiAgICAgICAgPyBwcm90ZWN0RnJvbUludmFsaWRNZXNzYWdlcyhvblJlc3VsdHMpXG4gICAgICAgIDogb25SZXN1bHRzO1xuXG4gICAgaWYgKHRoaXMuX21pZGRsZXdhcmUuY29tcGxldGUpIHtcbiAgICAgIHRoaXMuX21pZGRsZXdhcmUuY29tcGxldGUodGhpcy5fbmV4dEFzUGx1Z2luVHlwZSwgY29kZSwgc2FmZU9uUmVzdWx0cyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX25leHQuY29tcGxldGUoY29kZSwgc2FmZU9uUmVzdWx0cyk7XG4gICAgfVxuICB9XG5cbiAgaW5zcGVjdChjb2RlOiBzdHJpbmcsIGN1cnNvclBvczogbnVtYmVyLCBvblJlc3VsdHM6IFJlc3VsdHNDYWxsYmFjayk6IHZvaWQge1xuICAgIGxldCBzYWZlT25SZXN1bHRzID1cbiAgICAgIHRoaXMuX21pZGRsZXdhcmUuaW5zcGVjdCB8fCB0aGlzLl9uZXh0IGluc3RhbmNlb2YgS2VybmVsVHJhbnNwb3J0XG4gICAgICAgID8gcHJvdGVjdEZyb21JbnZhbGlkTWVzc2FnZXMob25SZXN1bHRzKVxuICAgICAgICA6IG9uUmVzdWx0cztcbiAgICBpZiAodGhpcy5fbWlkZGxld2FyZS5pbnNwZWN0KSB7XG4gICAgICB0aGlzLl9taWRkbGV3YXJlLmluc3BlY3QoXG4gICAgICAgIHRoaXMuX25leHRBc1BsdWdpblR5cGUsXG4gICAgICAgIGNvZGUsXG4gICAgICAgIGN1cnNvclBvcyxcbiAgICAgICAgc2FmZU9uUmVzdWx0c1xuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbmV4dC5pbnNwZWN0KGNvZGUsIGN1cnNvclBvcywgc2FmZU9uUmVzdWx0cyk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEtlcm5lbCB7XG4gIEBvYnNlcnZhYmxlIGluc3BlY3RvciA9IHsgYnVuZGxlOiB7fSB9O1xuICBvdXRwdXRTdG9yZSA9IG5ldyBPdXRwdXRTdG9yZSgpO1xuXG4gIHdhdGNoZXNTdG9yZTogV2F0Y2hlc1N0b3JlO1xuICB3YXRjaENhbGxiYWNrczogQXJyYXk8RnVuY3Rpb24+ID0gW107XG5cbiAgZW1pdHRlciA9IG5ldyBFbWl0dGVyKCk7XG4gIHBsdWdpbldyYXBwZXI6IEh5ZHJvZ2VuS2VybmVsIHwgbnVsbCA9IG51bGw7XG4gIHRyYW5zcG9ydDogS2VybmVsVHJhbnNwb3J0O1xuXG4gIC8vIEludmFyaWFudDogdGhlIGAuX25leHRgIG9mIGVhY2ggZW50cnkgaW4gdGhpcyBhcnJheSBtdXN0IHBvaW50IHRvIHRoZSBuZXh0XG4gIC8vIGVsZW1lbnQgb2YgdGhlIGFycmF5LiBUaGUgYC5fbmV4dGAgb2YgdGhlIGxhc3QgZWxlbWVudCBtdXN0IHBvaW50IHRvXG4gIC8vIGB0aGlzLnRyYW5zcG9ydGAuXG4gIG1pZGRsZXdhcmU6IEFycmF5PE1pZGRsZXdhcmVBZGFwdGVyPjtcblxuICBjb25zdHJ1Y3RvcihrZXJuZWw6IEtlcm5lbFRyYW5zcG9ydCkge1xuICAgIHRoaXMudHJhbnNwb3J0ID0ga2VybmVsO1xuXG4gICAgdGhpcy53YXRjaGVzU3RvcmUgPSBuZXcgV2F0Y2hlc1N0b3JlKHRoaXMpO1xuXG4gICAgLy8gQSBNaWRkbGV3YXJlQWRhcHRlciB0aGF0IGZvcndhcmRzIGFsbCByZXF1ZXN0cyB0byBgdGhpcy50cmFuc3BvcnRgLlxuICAgIC8vIE5lZWRlZCB0byB0ZXJtaW5hdGUgdGhlIG1pZGRsZXdhcmUgY2hhaW4gaW4gYSB3YXkgc3VjaCB0aGF0IHRoZSBgbmV4dGBcbiAgICAvLyBvYmplY3QgcGFzc2VkIHRvIHRoZSBsYXN0IG1pZGRsZXdhcmUgaXMgbm90IHRoZSBLZXJuZWxUcmFuc3BvcnQgaW5zdGFuY2VcbiAgICAvLyBpdHNlbGYgKHdoaWNoIHdvdWxkIGJlIHZpb2xhdGUgaXNvbGF0aW9uIG9mIGludGVybmFscyBmcm9tIHBsdWdpbnMpLlxuICAgIGNvbnN0IGRlbGVnYXRlVG9UcmFuc3BvcnQgPSBuZXcgTWlkZGxld2FyZUFkYXB0ZXIoe30sIHRoaXMudHJhbnNwb3J0KTtcbiAgICB0aGlzLm1pZGRsZXdhcmUgPSBbZGVsZWdhdGVUb1RyYW5zcG9ydF07XG4gIH1cblxuICBnZXQga2VybmVsU3BlYygpOiBLZXJuZWxzcGVjIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc3BvcnQua2VybmVsU3BlYztcbiAgfVxuXG4gIGdldCBncmFtbWFyKCk6IGF0b20kR3JhbW1hciB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNwb3J0LmdyYW1tYXI7XG4gIH1cblxuICBnZXQgbGFuZ3VhZ2UoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc3BvcnQubGFuZ3VhZ2U7XG4gIH1cblxuICBnZXQgZGlzcGxheU5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc3BvcnQuZGlzcGxheU5hbWU7XG4gIH1cblxuICBnZXQgZmlyc3RNaWRkbGV3YXJlQWRhcHRlcigpOiBNaWRkbGV3YXJlQWRhcHRlciB7XG4gICAgcmV0dXJuIHRoaXMubWlkZGxld2FyZVswXTtcbiAgfVxuXG4gIGFkZE1pZGRsZXdhcmUobWlkZGxld2FyZTogSHlkcm9nZW5LZXJuZWxNaWRkbGV3YXJlKSB7XG4gICAgdGhpcy5taWRkbGV3YXJlLnVuc2hpZnQoXG4gICAgICBuZXcgTWlkZGxld2FyZUFkYXB0ZXIobWlkZGxld2FyZSwgdGhpcy5taWRkbGV3YXJlWzBdKVxuICAgICk7XG4gIH1cblxuICBAY29tcHV0ZWRcbiAgZ2V0IGV4ZWN1dGlvblN0YXRlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNwb3J0LmV4ZWN1dGlvblN0YXRlO1xuICB9XG5cbiAgc2V0RXhlY3V0aW9uU3RhdGUoc3RhdGU6IHN0cmluZykge1xuICAgIHRoaXMudHJhbnNwb3J0LnNldEV4ZWN1dGlvblN0YXRlKHN0YXRlKTtcbiAgfVxuXG4gIEBhY3Rpb25cbiAgYXN5bmMgc2V0SW5zcGVjdG9yUmVzdWx0KGJ1bmRsZTogT2JqZWN0LCBlZGl0b3I6ID9hdG9tJFRleHRFZGl0b3IpIHtcbiAgICBpZiAoaXNFcXVhbCh0aGlzLmluc3BlY3Rvci5idW5kbGUsIGJ1bmRsZSkpIHtcbiAgICAgIGF3YWl0IGF0b20ud29ya3NwYWNlLnRvZ2dsZShJTlNQRUNUT1JfVVJJKTtcbiAgICB9IGVsc2UgaWYgKGJ1bmRsZS5zaXplICE9PSAwKSB7XG4gICAgICB0aGlzLmluc3BlY3Rvci5idW5kbGUgPSBidW5kbGU7XG4gICAgICBhd2FpdCBhdG9tLndvcmtzcGFjZS5vcGVuKElOU1BFQ1RPUl9VUkksIHsgc2VhcmNoQWxsUGFuZXM6IHRydWUgfSk7XG4gICAgfVxuICAgIGZvY3VzKGVkaXRvcik7XG4gIH1cblxuICBnZXRQbHVnaW5XcmFwcGVyKCkge1xuICAgIGlmICghdGhpcy5wbHVnaW5XcmFwcGVyKSB7XG4gICAgICB0aGlzLnBsdWdpbldyYXBwZXIgPSBuZXcgSHlkcm9nZW5LZXJuZWwodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucGx1Z2luV3JhcHBlcjtcbiAgfVxuXG4gIGFkZFdhdGNoQ2FsbGJhY2sod2F0Y2hDYWxsYmFjazogRnVuY3Rpb24pIHtcbiAgICB0aGlzLndhdGNoQ2FsbGJhY2tzLnB1c2god2F0Y2hDYWxsYmFjayk7XG4gIH1cblxuICBpbnRlcnJ1cHQoKSB7XG4gICAgdGhpcy5maXJzdE1pZGRsZXdhcmVBZGFwdGVyLmludGVycnVwdCgpO1xuICB9XG5cbiAgc2h1dGRvd24oKSB7XG4gICAgdGhpcy5maXJzdE1pZGRsZXdhcmVBZGFwdGVyLnNodXRkb3duKCk7XG4gIH1cblxuICByZXN0YXJ0KG9uUmVzdGFydGVkOiA/RnVuY3Rpb24pIHtcbiAgICB0aGlzLmZpcnN0TWlkZGxld2FyZUFkYXB0ZXIucmVzdGFydChvblJlc3RhcnRlZCk7XG4gIH1cblxuICBleGVjdXRlKGNvZGU6IHN0cmluZywgb25SZXN1bHRzOiBGdW5jdGlvbikge1xuICAgIGNvbnN0IHdyYXBwZWRPblJlc3VsdHMgPSB0aGlzLl93cmFwRXhlY3V0aW9uUmVzdWx0c0NhbGxiYWNrKG9uUmVzdWx0cyk7XG4gICAgdGhpcy5maXJzdE1pZGRsZXdhcmVBZGFwdGVyLmV4ZWN1dGUoXG4gICAgICBjb2RlLFxuICAgICAgKG1lc3NhZ2U6IE1lc3NhZ2UsIGNoYW5uZWw6IHN0cmluZykgPT4ge1xuICAgICAgICB3cmFwcGVkT25SZXN1bHRzKG1lc3NhZ2UsIGNoYW5uZWwpO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICBjaGFubmVsID09IFwiaW9wdWJcIiAmJlxuICAgICAgICAgIG1lc3NhZ2UuaGVhZGVyLm1zZ190eXBlID09PSBcInN0YXR1c1wiICYmXG4gICAgICAgICAgbWVzc2FnZS5jb250ZW50LmV4ZWN1dGlvbl9zdGF0ZSA9PT0gXCJpZGxlXCJcbiAgICAgICAgKSB7XG4gICAgICAgICAgdGhpcy5fY2FsbFdhdGNoQ2FsbGJhY2tzKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICApO1xuICB9XG5cbiAgZXhlY3V0ZVdhdGNoKGNvZGU6IHN0cmluZywgb25SZXN1bHRzOiBGdW5jdGlvbikge1xuICAgIHRoaXMuZmlyc3RNaWRkbGV3YXJlQWRhcHRlci5leGVjdXRlKFxuICAgICAgY29kZSxcbiAgICAgIHRoaXMuX3dyYXBFeGVjdXRpb25SZXN1bHRzQ2FsbGJhY2sob25SZXN1bHRzKVxuICAgICk7XG4gIH1cblxuICBfY2FsbFdhdGNoQ2FsbGJhY2tzKCkge1xuICAgIHRoaXMud2F0Y2hDYWxsYmFja3MuZm9yRWFjaCh3YXRjaENhbGxiYWNrID0+IHdhdGNoQ2FsbGJhY2soKSk7XG4gIH1cblxuICAvKlxuICAgKiBUYWtlcyBhIGNhbGxiYWNrIHRoYXQgYWNjZXB0cyBleGVjdXRpb24gcmVzdWx0cyBpbiBhIGh5ZHJvZ2VuLWludGVybmFsXG4gICAqIGZvcm1hdCBhbmQgd3JhcHMgaXQgdG8gYWNjZXB0IEp1cHl0ZXIgbWVzc2FnZS9jaGFubmVsIHBhaXJzIGluc3RlYWQuXG4gICAqIEtlcm5lbHMgYW5kIHBsdWdpbnMgYWxsIG9wZXJhdGUgb24gdHlwZXMgc3BlY2lmaWVkIGJ5IHRoZSBKdXB5dGVyIG1lc3NhZ2luZ1xuICAgKiBwcm90b2NvbCBpbiBvcmRlciB0byBtYXhpbWl6ZSBjb21wYXRpYmlsaXR5LCBidXQgaHlkcm9nZW4gaW50ZXJuYWxseSB1c2VzXG4gICAqIGl0cyBvd24gdHlwZXMuXG4gICAqL1xuICBfd3JhcEV4ZWN1dGlvblJlc3VsdHNDYWxsYmFjayhvblJlc3VsdHM6IEZ1bmN0aW9uKSB7XG4gICAgcmV0dXJuIChtZXNzYWdlOiBNZXNzYWdlLCBjaGFubmVsOiBzdHJpbmcpID0+IHtcbiAgICAgIGlmIChjaGFubmVsID09PSBcInNoZWxsXCIpIHtcbiAgICAgICAgY29uc3QgeyBzdGF0dXMgfSA9IG1lc3NhZ2UuY29udGVudDtcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gXCJlcnJvclwiIHx8IHN0YXR1cyA9PT0gXCJva1wiKSB7XG4gICAgICAgICAgb25SZXN1bHRzKHtcbiAgICAgICAgICAgIGRhdGE6IHN0YXR1cyxcbiAgICAgICAgICAgIHN0cmVhbTogXCJzdGF0dXNcIlxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgIFwiS2VybmVsOiBpZ25vcmluZyB1bmV4cGVjdGVkIHZhbHVlIGZvciBtZXNzYWdlLmNvbnRlbnQuc3RhdHVzXCJcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNoYW5uZWwgPT09IFwiaW9wdWJcIikge1xuICAgICAgICBpZiAobWVzc2FnZS5oZWFkZXIubXNnX3R5cGUgPT09IFwiZXhlY3V0ZV9pbnB1dFwiKSB7XG4gICAgICAgICAgb25SZXN1bHRzKHtcbiAgICAgICAgICAgIGRhdGE6IG1lc3NhZ2UuY29udGVudC5leGVjdXRpb25fY291bnQsXG4gICAgICAgICAgICBzdHJlYW06IFwiZXhlY3V0aW9uX2NvdW50XCJcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRPRE8obmlraXRhKTogQ29uc2lkZXIgY29udmVydGluZyB0byBWNSBlbHNld2hlcmUsIHNvIHRoYXQgcGx1Z2luc1xuICAgICAgICAvLyBuZXZlciBoYXZlIHRvIGRlYWwgd2l0aCBtZXNzYWdlcyBpbiB0aGUgVjQgZm9ybWF0XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IG1zZ1NwZWNUb05vdGVib29rRm9ybWF0KG1zZ1NwZWNWNHRvVjUobWVzc2FnZSkpO1xuICAgICAgICBvblJlc3VsdHMocmVzdWx0KTtcbiAgICAgIH0gZWxzZSBpZiAoY2hhbm5lbCA9PT0gXCJzdGRpblwiKSB7XG4gICAgICAgIGlmIChtZXNzYWdlLmhlYWRlci5tc2dfdHlwZSAhPT0gXCJpbnB1dF9yZXF1ZXN0XCIpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IHByb21wdCB9ID0gbWVzc2FnZS5jb250ZW50O1xuXG4gICAgICAgIC8vIFRPRE8obmlraXRhKTogcGVyaGFwcyBpdCB3b3VsZCBtYWtlIHNlbnNlIHRvIGluc3RhbGwgbWlkZGxld2FyZSBmb3JcbiAgICAgICAgLy8gc2VuZGluZyBpbnB1dCByZXBsaWVzXG4gICAgICAgIGNvbnN0IGlucHV0VmlldyA9IG5ldyBJbnB1dFZpZXcoeyBwcm9tcHQgfSwgKGlucHV0OiBzdHJpbmcpID0+XG4gICAgICAgICAgdGhpcy50cmFuc3BvcnQuaW5wdXRSZXBseShpbnB1dClcbiAgICAgICAgKTtcblxuICAgICAgICBpbnB1dFZpZXcuYXR0YWNoKCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGNvbXBsZXRlKGNvZGU6IHN0cmluZywgb25SZXN1bHRzOiBGdW5jdGlvbikge1xuICAgIHRoaXMuZmlyc3RNaWRkbGV3YXJlQWRhcHRlci5jb21wbGV0ZShcbiAgICAgIGNvZGUsXG4gICAgICAobWVzc2FnZTogTWVzc2FnZSwgY2hhbm5lbDogc3RyaW5nKSA9PiB7XG4gICAgICAgIGlmIChjaGFubmVsICE9PSBcInNoZWxsXCIpIHtcbiAgICAgICAgICBsb2coXCJJbnZhbGlkIHJlcGx5OiB3cm9uZyBjaGFubmVsXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBvblJlc3VsdHMobWVzc2FnZS5jb250ZW50KTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cbiAgaW5zcGVjdChjb2RlOiBzdHJpbmcsIGN1cnNvclBvczogbnVtYmVyLCBvblJlc3VsdHM6IEZ1bmN0aW9uKSB7XG4gICAgdGhpcy5maXJzdE1pZGRsZXdhcmVBZGFwdGVyLmluc3BlY3QoXG4gICAgICBjb2RlLFxuICAgICAgY3Vyc29yUG9zLFxuICAgICAgKG1lc3NhZ2U6IE1lc3NhZ2UsIGNoYW5uZWw6IHN0cmluZykgPT4ge1xuICAgICAgICBpZiAoY2hhbm5lbCAhPT0gXCJzaGVsbFwiKSB7XG4gICAgICAgICAgbG9nKFwiSW52YWxpZCByZXBseTogd3JvbmcgY2hhbm5lbFwiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgb25SZXN1bHRzKHtcbiAgICAgICAgICBkYXRhOiBtZXNzYWdlLmNvbnRlbnQuZGF0YSxcbiAgICAgICAgICBmb3VuZDogbWVzc2FnZS5jb250ZW50LmZvdW5kXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICk7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIGxvZyhcIktlcm5lbDogRGVzdHJveWluZ1wiKTtcbiAgICBzdG9yZS5kZWxldGVLZXJuZWwodGhpcyk7XG4gICAgdGhpcy50cmFuc3BvcnQuZGVzdHJveSgpO1xuICAgIGlmICh0aGlzLnBsdWdpbldyYXBwZXIpIHtcbiAgICAgIHRoaXMucGx1Z2luV3JhcHBlci5kZXN0cm95ZWQgPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLmVtaXR0ZXIuZW1pdChcImRpZC1kZXN0cm95XCIpO1xuICAgIHRoaXMuZW1pdHRlci5kaXNwb3NlKCk7XG4gIH1cbn1cbiJdfQ==