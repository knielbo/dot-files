Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _jmp = require("jmp");

var _uuidV4 = require("uuid/v4");

var _uuidV42 = _interopRequireDefault(_uuidV4);

var _spawnteract = require("spawnteract");

var _config = require("./config");

var _config2 = _interopRequireDefault(_config);

var _kernelTransport = require("./kernel-transport");

var _kernelTransport2 = _interopRequireDefault(_kernelTransport);

var _utils = require("./utils");

var ZMQKernel = (function (_KernelTransport) {
  _inherits(ZMQKernel, _KernelTransport);

  function ZMQKernel(kernelSpec, grammar, options, onStarted) {
    var _this = this;

    _classCallCheck(this, ZMQKernel);

    _get(Object.getPrototypeOf(ZMQKernel.prototype), "constructor", this).call(this, kernelSpec, grammar);
    this.executionCallbacks = {};
    this.options = options || {};

    (0, _spawnteract.launchSpec)(kernelSpec, options).then(function (_ref) {
      var config = _ref.config;
      var connectionFile = _ref.connectionFile;
      var spawn = _ref.spawn;

      _this.connection = config;
      _this.connectionFile = connectionFile;
      _this.kernelProcess = spawn;

      _this.monitorNotifications(spawn);

      _this.connect(function () {
        _this._executeStartupCode();

        if (onStarted) onStarted(_this);
      });
    });
  }

  _createClass(ZMQKernel, [{
    key: "connect",
    value: function connect(done) {
      var scheme = this.connection.signature_scheme.slice("hmac-".length);
      var key = this.connection.key;

      this.shellSocket = new _jmp.Socket("dealer", scheme, key);
      this.controlSocket = new _jmp.Socket("dealer", scheme, key);
      this.stdinSocket = new _jmp.Socket("dealer", scheme, key);
      this.ioSocket = new _jmp.Socket("sub", scheme, key);

      var id = (0, _uuidV42["default"])();
      this.shellSocket.identity = "dealer" + id;
      this.controlSocket.identity = "control" + id;
      this.stdinSocket.identity = "dealer" + id;
      this.ioSocket.identity = "sub" + id;

      var address = this.connection.transport + "://" + this.connection.ip + ":";
      this.shellSocket.connect(address + this.connection.shell_port);
      this.controlSocket.connect(address + this.connection.control_port);
      this.ioSocket.connect(address + this.connection.iopub_port);
      this.ioSocket.subscribe("");
      this.stdinSocket.connect(address + this.connection.stdin_port);

      this.shellSocket.on("message", this.onShellMessage.bind(this));
      this.ioSocket.on("message", this.onIOMessage.bind(this));
      this.stdinSocket.on("message", this.onStdinMessage.bind(this));

      this.monitor(done);
    }
  }, {
    key: "monitorNotifications",
    value: function monitorNotifications(childProcess) {
      var _this2 = this;

      childProcess.stdout.on("data", function (data) {
        data = data.toString();

        if (atom.config.get("Hydrogen.kernelNotifications")) {
          atom.notifications.addInfo(_this2.kernelSpec.display_name, {
            description: data,
            dismissable: true
          });
        } else {
          (0, _utils.log)("ZMQKernel: stdout:", data);
        }
      });

      childProcess.stderr.on("data", function (data) {
        atom.notifications.addError(_this2.kernelSpec.display_name, {
          description: data.toString(),
          dismissable: true
        });
      });
    }
  }, {
    key: "monitor",
    value: function monitor(done) {
      var _this3 = this;

      try {
        (function () {
          var socketNames = ["shellSocket", "controlSocket", "ioSocket"];

          var waitGroup = socketNames.length;

          var onConnect = function onConnect(_ref2) {
            var socketName = _ref2.socketName;
            var socket = _ref2.socket;

            (0, _utils.log)("ZMQKernel: " + socketName + " connected");
            socket.unmonitor();

            waitGroup--;
            if (waitGroup === 0) {
              (0, _utils.log)("ZMQKernel: all main sockets connected");
              _this3.setExecutionState("idle");
              if (done) done();
            }
          };

          var monitor = function monitor(socketName, socket) {
            (0, _utils.log)("ZMQKernel: monitor " + socketName);
            socket.on("connect", onConnect.bind(_this3, { socketName: socketName, socket: socket }));
            socket.monitor();
          };

          monitor("shellSocket", _this3.shellSocket);
          monitor("controlSocket", _this3.controlSocket);
          monitor("ioSocket", _this3.ioSocket);
        })();
      } catch (err) {
        console.error("ZMQKernel:", err);
      }
    }
  }, {
    key: "interrupt",
    value: function interrupt() {
      if (process.platform === "win32") {
        atom.notifications.addWarning("Cannot interrupt this kernel", {
          detail: "Kernel interruption is currently not supported in Windows."
        });
      } else {
        (0, _utils.log)("ZMQKernel: sending SIGINT");
        this.kernelProcess.kill("SIGINT");
      }
    }
  }, {
    key: "_kill",
    value: function _kill() {
      (0, _utils.log)("ZMQKernel: sending SIGKILL");
      this.kernelProcess.kill("SIGKILL");
    }
  }, {
    key: "_executeStartupCode",
    value: function _executeStartupCode() {
      var displayName = this.kernelSpec.display_name;
      var startupCode = _config2["default"].getJson("startupCode")[displayName];
      if (startupCode) {
        (0, _utils.log)("KernelManager: Executing startup code:", startupCode);
        startupCode = startupCode + " \n";
        this.execute(startupCode, function (message, channel) {});
      }
    }
  }, {
    key: "shutdown",
    value: function shutdown() {
      this._socketShutdown();
    }
  }, {
    key: "restart",
    value: function restart(onRestarted) {
      this._socketRestart(onRestarted);
    }
  }, {
    key: "_socketShutdown",
    value: function _socketShutdown() {
      var restart = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

      var requestId = "shutdown_" + (0, _uuidV42["default"])();
      var message = this._createMessage("shutdown_request", requestId);

      message.content = { restart: restart };

      this.shellSocket.send(new _jmp.Message(message));
    }
  }, {
    key: "_socketRestart",
    value: function _socketRestart(onRestarted) {
      if (this.executionState === "restarting") {
        return;
      }
      this.setExecutionState("restarting");
      this._socketShutdown(true);
      this._kill();

      var _launchSpecFromConnectionInfo = (0, _spawnteract.launchSpecFromConnectionInfo)(this.kernelSpec, this.connection, this.connectionFile, this.options);

      var spawn = _launchSpecFromConnectionInfo.spawn;

      this.kernelProcess = spawn;
      this.monitor(function () {
        if (onRestarted) onRestarted();
      });
    }

    // onResults is a callback that may be called multiple times
    // as results come in from the kernel
  }, {
    key: "execute",
    value: function execute(code, onResults) {
      (0, _utils.log)("ZMQKernel.execute:", code);
      var requestId = "execute_" + (0, _uuidV42["default"])();

      var message = this._createMessage("execute_request", requestId);

      message.content = {
        code: code,
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: true
      };

      this.executionCallbacks[requestId] = onResults;

      this.shellSocket.send(new _jmp.Message(message));
    }
  }, {
    key: "complete",
    value: function complete(code, onResults) {
      (0, _utils.log)("ZMQKernel.complete:", code);

      var requestId = "complete_" + (0, _uuidV42["default"])();

      var message = this._createMessage("complete_request", requestId);

      message.content = {
        code: code,
        text: code,
        line: code,
        cursor_pos: code.length
      };

      this.executionCallbacks[requestId] = onResults;

      this.shellSocket.send(new _jmp.Message(message));
    }
  }, {
    key: "inspect",
    value: function inspect(code, cursorPos, onResults) {
      (0, _utils.log)("ZMQKernel.inspect:", code, cursorPos);

      var requestId = "inspect_" + (0, _uuidV42["default"])();

      var message = this._createMessage("inspect_request", requestId);

      message.content = {
        code: code,
        cursor_pos: cursorPos,
        detail_level: 0
      };

      this.executionCallbacks[requestId] = onResults;

      this.shellSocket.send(new _jmp.Message(message));
    }
  }, {
    key: "inputReply",
    value: function inputReply(input) {
      var requestId = "input_reply_" + (0, _uuidV42["default"])();

      var message = this._createMessage("input_reply", requestId);

      message.content = { value: input };

      this.stdinSocket.send(new _jmp.Message(message));
    }
  }, {
    key: "onShellMessage",
    value: function onShellMessage(message) {
      (0, _utils.log)("shell message:", message);

      if (!this._isValidMessage(message)) {
        return;
      }

      var msg_id = message.parent_header.msg_id;

      var callback = undefined;
      if (msg_id) {
        callback = this.executionCallbacks[msg_id];
      }

      if (callback) {
        callback(message, "shell");
      }
    }
  }, {
    key: "onStdinMessage",
    value: function onStdinMessage(message) {
      (0, _utils.log)("stdin message:", message);

      if (!this._isValidMessage(message)) {
        return;
      }

      // input_request messages are attributable to particular execution requests,
      // and should pass through the middleware stack to allow plugins to see them
      var msg_id = message.parent_header.msg_id;

      var callback = undefined;
      if (msg_id) {
        callback = this.executionCallbacks[msg_id];
      }

      if (callback) {
        callback(message, "stdin");
      }
    }
  }, {
    key: "onIOMessage",
    value: function onIOMessage(message) {
      (0, _utils.log)("IO message:", message);

      if (!this._isValidMessage(message)) {
        return;
      }

      var msg_type = message.header.msg_type;

      if (msg_type === "status") {
        var _status = message.content.execution_state;
        this.setExecutionState(_status);
      }

      var msg_id = message.parent_header.msg_id;

      var callback = undefined;
      if (msg_id) {
        callback = this.executionCallbacks[msg_id];
      }

      if (callback) {
        callback(message, "iopub");
      }
    }
  }, {
    key: "_isValidMessage",
    value: function _isValidMessage(message) {
      if (!message) {
        (0, _utils.log)("Invalid message: null");
        return false;
      }

      if (!message.content) {
        (0, _utils.log)("Invalid message: Missing content");
        return false;
      }

      if (message.content.execution_state === "starting") {
        // Kernels send a starting status message with an empty parent_header
        (0, _utils.log)("Dropped starting status IO message");
        return false;
      }

      if (!message.parent_header) {
        (0, _utils.log)("Invalid message: Missing parent_header");
        return false;
      }

      if (!message.parent_header.msg_id) {
        (0, _utils.log)("Invalid message: Missing parent_header.msg_id");
        return false;
      }

      if (!message.parent_header.msg_type) {
        (0, _utils.log)("Invalid message: Missing parent_header.msg_type");
        return false;
      }

      if (!message.header) {
        (0, _utils.log)("Invalid message: Missing header");
        return false;
      }

      if (!message.header.msg_id) {
        (0, _utils.log)("Invalid message: Missing header.msg_id");
        return false;
      }

      if (!message.header.msg_type) {
        (0, _utils.log)("Invalid message: Missing header.msg_type");
        return false;
      }

      return true;
    }
  }, {
    key: "destroy",
    value: function destroy() {
      (0, _utils.log)("ZMQKernel: destroy:", this);

      this.shutdown();

      this._kill();
      _fs2["default"].unlinkSync(this.connectionFile);

      this.shellSocket.close();
      this.controlSocket.close();
      this.ioSocket.close();
      this.stdinSocket.close();

      _get(Object.getPrototypeOf(ZMQKernel.prototype), "destroy", this).call(this);
    }
  }, {
    key: "_getUsername",
    value: function _getUsername() {
      return process.env.LOGNAME || process.env.USER || process.env.LNAME || process.env.USERNAME;
    }
  }, {
    key: "_createMessage",
    value: function _createMessage(msgType) {
      var msgId = arguments.length <= 1 || arguments[1] === undefined ? (0, _uuidV42["default"])() : arguments[1];

      var message = {
        header: {
          username: this._getUsername(),
          session: "00000000-0000-0000-0000-000000000000",
          msg_type: msgType,
          msg_id: msgId,
          date: new Date(),
          version: "5.0"
        },
        metadata: {},
        parent_header: {},
        content: {}
      };

      return message;
    }
  }]);

  return ZMQKernel;
})(_kernelTransport2["default"]);

exports["default"] = ZMQKernel;
module.exports = exports["default"];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvSHlkcm9nZW4vbGliL3ptcS1rZXJuZWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7a0JBRWUsSUFBSTs7OzttQkFDYSxLQUFLOztzQkFDdEIsU0FBUzs7OzsyQkFDaUMsYUFBYTs7c0JBRW5ELFVBQVU7Ozs7K0JBQ0Qsb0JBQW9COzs7O3FCQUU1QixTQUFTOztJQWVSLFNBQVM7WUFBVCxTQUFTOztBQVlqQixXQVpRLFNBQVMsQ0FhMUIsVUFBc0IsRUFDdEIsT0FBcUIsRUFDckIsT0FBZSxFQUNmLFNBQW9CLEVBQ3BCOzs7MEJBakJpQixTQUFTOztBQWtCMUIsK0JBbEJpQixTQUFTLDZDQWtCcEIsVUFBVSxFQUFFLE9BQU8sRUFBRTtTQWpCN0Isa0JBQWtCLEdBQVcsRUFBRTtBQWtCN0IsUUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDOztBQUU3QixpQ0FBVyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUNsQyxVQUFDLElBQWlDLEVBQUs7VUFBcEMsTUFBTSxHQUFSLElBQWlDLENBQS9CLE1BQU07VUFBRSxjQUFjLEdBQXhCLElBQWlDLENBQXZCLGNBQWM7VUFBRSxLQUFLLEdBQS9CLElBQWlDLENBQVAsS0FBSzs7QUFDOUIsWUFBSyxVQUFVLEdBQUcsTUFBTSxDQUFDO0FBQ3pCLFlBQUssY0FBYyxHQUFHLGNBQWMsQ0FBQztBQUNyQyxZQUFLLGFBQWEsR0FBRyxLQUFLLENBQUM7O0FBRTNCLFlBQUssb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7O0FBRWpDLFlBQUssT0FBTyxDQUFDLFlBQU07QUFDakIsY0FBSyxtQkFBbUIsRUFBRSxDQUFDOztBQUUzQixZQUFJLFNBQVMsRUFBRSxTQUFTLE9BQU0sQ0FBQztPQUNoQyxDQUFDLENBQUM7S0FDSixDQUNGLENBQUM7R0FDSDs7ZUFwQ2tCLFNBQVM7O1dBc0NyQixpQkFBQyxJQUFlLEVB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RSxFQUFFO0FBQ2pCLGVBQU8sRUFBRSxFQUFFO09BQ1osQ0FBQzs7QUFFRixhQUFPLE9BQU8sQ0FBQztLQUNoQjs7O1NBclprQixTQUFTOzs7cUJBQVQsU0FBUyIsImZpbGUiOiIvaG9tZS9rbmllbGJvLy5hdG9tL3BhY2thZ2VzL0h5ZHJvZ2VuL2xpYi96bXEta2VybmVsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogQGZsb3cgKi9cblxuaW1wb3J0IGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0IHsgTWVzc2FnZSwgU29ja2V0IH0gZnJvbSBcImptcFwiO1xuaW1wb3J0IHY0IGZyb20gXCJ1dWlkL3Y0XCI7XG5pbXBvcnQgeyBsYXVuY2hTcGVjLCBsYXVuY2hTcGVjRnJvbUNvbm5lY3Rpb25JbmZvIH0gZnJvbSBcInNwYXdudGVyYWN0XCI7XG5cbmltcG9ydCBDb25maWcgZnJvbSBcIi4vY29uZmlnXCI7XG5pbXBvcnQgS2VybmVsVHJhbnNwb3J0IGZyb20gXCIuL2tlcm5lbC10cmFuc3BvcnRcIjtcbmltcG9ydCB0eXBlIHsgUmVzdWx0c0NhbGxiYWNrIH0gZnJvbSBcIi4va2VybmVsLXRyYW5zcG9ydFwiO1xuaW1wb3J0IHsgbG9nIH0gZnJvbSBcIi4vdXRpbHNcIjtcblxuZXhwb3J0IHR5cGUgQ29ubmVjdGlvbiA9IHtcbiAgY29udHJvbF9wb3J0OiBudW1iZXIsXG4gIGhiX3BvcnQ6IG51bWJlcixcbiAgaW9wdWJfcG9ydDogbnVtYmVyLFxuICBpcDogc3RyaW5nLFxuICBrZXk6IHN0cmluZyxcbiAgc2hlbGxfcG9ydDogbnVtYmVyLFxuICBzaWduYXR1cmVfc2NoZW1lOiBzdHJpbmcsXG4gIHN0ZGluX3BvcnQ6IG51bWJlcixcbiAgdHJhbnNwb3J0OiBzdHJpbmcsXG4gIHZlcnNpb246IG51bWJlclxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgWk1RS2VybmVsIGV4dGVuZHMgS2VybmVsVHJhbnNwb3J0IHtcbiAgZXhlY3V0aW9uQ2FsbGJhY2tzOiBPYmplY3QgPSB7fTtcbiAgY29ubmVjdGlvbjogQ29ubmVjdGlvbjtcbiAgY29ubmVjdGlvbkZpbGU6IHN0cmluZztcbiAga2VybmVsUHJvY2VzczogY2hpbGRfcHJvY2VzcyRDaGlsZFByb2Nlc3M7XG4gIG9wdGlvbnM6IE9iamVjdDtcblxuICBzaGVsbFNvY2tldDogU29ja2V0O1xuICBjb250cm9sU29ja2V0OiBTb2NrZXQ7XG4gIHN0ZGluU29ja2V0OiBTb2NrZXQ7XG4gIGlvU29ja2V0OiBTb2NrZXQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAga2VybmVsU3BlYzogS2VybmVsc3BlYyxcbiAgICBncmFtbWFyOiBhdG9tJEdyYW1tYXIsXG4gICAgb3B0aW9uczogT2JqZWN0LFxuICAgIG9uU3RhcnRlZDogP0Z1bmN0aW9uXG4gICkge1xuICAgIHN1cGVyKGtlcm5lbFNwZWMsIGdyYW1tYXIpO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICBsYXVuY2hTcGVjKGtlcm5lbFNwZWMsIG9wdGlvbnMpLnRoZW4oXG4gICAgICAoeyBjb25maWcsIGNvbm5lY3Rpb25GaWxlLCBzcGF3biB9KSA9PiB7XG4gICAgICAgIHRoaXMuY29ubmVjdGlvbiA9IGNvbmZpZztcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uRmlsZSA9IGNvbm5lY3Rpb25GaWxlO1xuICAgICAgICB0aGlzLmtlcm5lbFByb2Nlc3MgPSBzcGF3bjtcblxuICAgICAgICB0aGlzLm1vbml0b3JOb3RpZmljYXRpb25zKHNwYXduKTtcblxuICAgICAgICB0aGlzLmNvbm5lY3QoKCkgPT4ge1xuICAgICAgICAgIHRoaXMuX2V4ZWN1dGVTdGFydHVwQ29kZSgpO1xuXG4gICAgICAgICAgaWYgKG9uU3RhcnRlZCkgb25TdGFydGVkKHRoaXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cbiAgY29ubmVjdChkb25lOiA/RnVuY3Rpb24pIHtcbiAgICBjb25zdCBzY2hlbWUgPSB0aGlzLmNvbm5lY3Rpb24uc2lnbmF0dXJlX3NjaGVtZS5zbGljZShcImhtYWMtXCIubGVuZ3RoKTtcbiAgICBjb25zdCB7IGtleSB9ID0gdGhpcy5jb25uZWN0aW9uO1xuXG4gICAgdGhpcy5zaGVsbFNvY2tldCA9IG5ldyBTb2NrZXQoXCJkZWFsZXJcIiwgc2NoZW1lLCBrZXkpO1xuICAgIHRoaXMuY29udHJvbFNvY2tldCA9IG5ldyBTb2NrZXQoXCJkZWFsZXJcIiwgc2NoZW1lLCBrZXkpO1xuICAgIHRoaXMuc3RkaW5Tb2NrZXQgPSBuZXcgU29ja2V0KFwiZGVhbGVyXCIsIHNjaGVtZSwga2V5KTtcbiAgICB0aGlzLmlvU29ja2V0ID0gbmV3IFNvY2tldChcInN1YlwiLCBzY2hlbWUsIGtleSk7XG5cbiAgICBjb25zdCBpZCA9IHY0KCk7XG4gICAgdGhpcy5zaGVsbFNvY2tldC5pZGVudGl0eSA9IGBkZWFsZXIke2lkfWA7XG4gICAgdGhpcy5jb250cm9sU29ja2V0LmlkZW50aXR5ID0gYGNvbnRyb2wke2lkfWA7XG4gICAgdGhpcy5zdGRpblNvY2tldC5pZGVudGl0eSA9IGBkZWFsZXIke2lkfWA7XG4gICAgdGhpcy5pb1NvY2tldC5pZGVudGl0eSA9IGBzdWIke2lkfWA7XG5cbiAgICBjb25zdCBhZGRyZXNzID0gYCR7dGhpcy5jb25uZWN0aW9uLnRyYW5zcG9ydH06Ly8ke3RoaXMuY29ubmVjdGlvbi5pcH06YDtcbiAgICB0aGlzLnNoZWxsU29ja2V0LmNvbm5lY3QoYWRkcmVzcyArIHRoaXMuY29ubmVjdGlvbi5zaGVsbF9wb3J0KTtcbiAgICB0aGlzLmNvbnRyb2xTb2NrZXQuY29ubmVjdChhZGRyZXNzICsgdGhpcy5jb25uZWN0aW9uLmNvbnRyb2xfcG9ydCk7XG4gICAgdGhpcy5pb1NvY2tldC5jb25uZWN0KGFkZHJlc3MgKyB0aGlzLmNvbm5lY3Rpb24uaW9wdWJfcG9ydCk7XG4gICAgdGhpcy5pb1NvY2tldC5zdWJzY3JpYmUoXCJcIik7XG4gICAgdGhpcy5zdGRpblNvY2tldC5jb25uZWN0KGFkZHJlc3MgKyB0aGlzLmNvbm5lY3Rpb24uc3RkaW5fcG9ydCk7XG5cbiAgICB0aGlzLnNoZWxsU29ja2V0Lm9uKFwibWVzc2FnZVwiLCB0aGlzLm9uU2hlbGxNZXNzYWdlLmJpbmQodGhpcykpO1xuICAgIHRoaXMuaW9Tb2NrZXQub24oXCJtZXNzYWdlXCIsIHRoaXMub25JT01lc3NhZ2UuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5zdGRpblNvY2tldC5vbihcIm1lc3NhZ2VcIiwgdGhpcy5vblN0ZGluTWVzc2FnZS5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMubW9uaXRvcihkb25lKTtcbiAgfVxuXG4gIG1vbml0b3JOb3RpZmljYXRpb25zKGNoaWxkUHJvY2VzczogY2hpbGRfcHJvY2VzcyRDaGlsZFByb2Nlc3MpIHtcbiAgICBjaGlsZFByb2Nlc3Muc3Rkb3V0Lm9uKFwiZGF0YVwiLCAoZGF0YTogc3RyaW5nIHwgQnVmZmVyKSA9PiB7XG4gICAgICBkYXRhID0gZGF0YS50b1N0cmluZygpO1xuXG4gICAgICBpZiAoYXRvbS5jb25maWcuZ2V0KFwiSHlkcm9nZW4ua2VybmVsTm90aWZpY2F0aW9uc1wiKSkge1xuICAgICAgICBhdG9tLm5vdGlmaWNhdGlvbnMuYWRkSW5mbyh0aGlzLmtlcm5lbFNwZWMuZGlzcGxheV9uYW1lLCB7XG4gICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEsXG4gICAgICAgICAgZGlzbWlzc2FibGU6IHRydWVcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2coXCJaTVFLZXJuZWw6IHN0ZG91dDpcIiwgZGF0YSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjaGlsZFByb2Nlc3Muc3RkZXJyLm9uKFwiZGF0YVwiLCAoZGF0YTogc3RyaW5nIHwgQnVmZmVyKSA9PiB7XG4gICAgICBhdG9tLm5vdGlmaWNhdGlvbnMuYWRkRXJyb3IodGhpcy5rZXJuZWxTcGVjLmRpc3BsYXlfbmFtZSwge1xuICAgICAgICBkZXNjcmlwdGlvbjogZGF0YS50b1N0cmluZygpLFxuICAgICAgICBkaXNtaXNzYWJsZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBtb25pdG9yKGRvbmU6ID9GdW5jdGlvbikge1xuICAgIHRyeSB7XG4gICAgICBsZXQgc29ja2V0TmFtZXMgPSBbXCJzaGVsbFNvY2tldFwiLCBcImNvbnRyb2xTb2NrZXRcIiwgXCJpb1NvY2tldFwiXTtcblxuICAgICAgbGV0IHdhaXRHcm91cCA9IHNvY2tldE5hbWVzLmxlbmd0aDtcblxuICAgICAgY29uc3Qgb25Db25uZWN0ID0gKHsgc29ja2V0TmFtZSwgc29ja2V0IH0pID0+IHtcbiAgICAgICAgbG9nKFwiWk1RS2VybmVsOiBcIiArIHNvY2tldE5hbWUgKyBcIiBjb25uZWN0ZWRcIik7XG4gICAgICAgIHNvY2tldC51bm1vbml0b3IoKTtcblxuICAgICAgICB3YWl0R3JvdXAtLTtcbiAgICAgICAgaWYgKHdhaXRHcm91cCA9PT0gMCkge1xuICAgICAgICAgIGxvZyhcIlpNUUtlcm5lbDogYWxsIG1haW4gc29ja2V0cyBjb25uZWN0ZWRcIik7XG4gICAgICAgICAgdGhpcy5zZXRFeGVjdXRpb25TdGF0ZShcImlkbGVcIik7XG4gICAgICAgICAgaWYgKGRvbmUpIGRvbmUoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgY29uc3QgbW9uaXRvciA9IChzb2NrZXROYW1lLCBzb2NrZXQpID0+IHtcbiAgICAgICAgbG9nKFwiWk1RS2VybmVsOiBtb25pdG9yIFwiICsgc29ja2V0TmFtZSk7XG4gICAgICAgIHNvY2tldC5vbihcImNvbm5lY3RcIiwgb25Db25uZWN0LmJpbmQodGhpcywgeyBzb2NrZXROYW1lLCBzb2NrZXQgfSkpO1xuICAgICAgICBzb2NrZXQubW9uaXRvcigpO1xuICAgICAgfTtcblxuICAgICAgbW9uaXRvcihcInNoZWxsU29ja2V0XCIsIHRoaXMuc2hlbGxTb2NrZXQpO1xuICAgICAgbW9uaXRvcihcImNvbnRyb2xTb2NrZXRcIiwgdGhpcy5jb250cm9sU29ja2V0KTtcbiAgICAgIG1vbml0b3IoXCJpb1NvY2tldFwiLCB0aGlzLmlvU29ja2V0KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJaTVFLZXJuZWw6XCIsIGVycik7XG4gICAgfVxuICB9XG5cbiAgaW50ZXJydXB0KCkge1xuICAgIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSBcIndpbjMyXCIpIHtcbiAgICAgIGF0b20ubm90aWZpY2F0aW9ucy5hZGRXYXJuaW5nKFwiQ2Fubm90IGludGVycnVwdCB0aGlzIGtlcm5lbFwiLCB7XG4gICAgICAgIGRldGFpbDogXCJLZXJuZWwgaW50ZXJydXB0aW9uIGlzIGN1cnJlbnRseSBub3Qgc3VwcG9ydGVkIGluIFdpbmRvd3MuXCJcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2coXCJaTVFLZXJuZWw6IHNlbmRpbmcgU0lHSU5UXCIpO1xuICAgICAgdGhpcy5rZXJuZWxQcm9jZXNzLmtpbGwoXCJTSUdJTlRcIik7XG4gICAgfVxuICB9XG5cbiAgX2tpbGwoKSB7XG4gICAgbG9nKFwiWk1RS2VybmVsOiBzZW5kaW5nIFNJR0tJTExcIik7XG4gICAgdGhpcy5rZXJuZWxQcm9jZXNzLmtpbGwoXCJTSUdLSUxMXCIpO1xuICB9XG5cbiAgX2V4ZWN1dGVTdGFydHVwQ29kZSgpIHtcbiAgICBjb25zdCBkaXNwbGF5TmFtZSA9IHRoaXMua2VybmVsU3BlYy5kaXNwbGF5X25hbWU7XG4gICAgbGV0IHN0YXJ0dXBDb2RlID0gQ29uZmlnLmdldEpzb24oXCJzdGFydHVwQ29kZVwiKVtkaXNwbGF5TmFtZV07XG4gICAgaWYgKHN0YXJ0dXBDb2RlKSB7XG4gICAgICBsb2coXCJLZXJuZWxNYW5hZ2VyOiBFeGVjdXRpbmcgc3RhcnR1cCBjb2RlOlwiLCBzdGFydHVwQ29kZSk7XG4gICAgICBzdGFydHVwQ29kZSA9IGAke3N0YXJ0dXBDb2RlfSBcXG5gO1xuICAgICAgdGhpcy5leGVjdXRlKHN0YXJ0dXBDb2RlLCAobWVzc2FnZSwgY2hhbm5lbCkgPT4ge30pO1xuICAgIH1cbiAgfVxuXG4gIHNodXRkb3duKCkge1xuICAgIHRoaXMuX3NvY2tldFNodXRkb3duKCk7XG4gIH1cblxuICByZXN0YXJ0KG9uUmVzdGFydGVkOiA/RnVuY3Rpb24pIHtcbiAgICB0aGlzLl9zb2NrZXRSZXN0YXJ0KG9uUmVzdGFydGVkKTtcbiAgfVxuXG4gIF9zb2NrZXRTaHV0ZG93bihyZXN0YXJ0OiA/Ym9vbGVhbiA9IGZhbHNlKSB7XG4gICAgY29uc3QgcmVxdWVzdElkID0gYHNodXRkb3duXyR7djQoKX1gO1xuICAgIGNvbnN0IG1lc3NhZ2UgPSB0aGlzLl9jcmVhdGVNZXNzYWdlKFwic2h1dGRvd25fcmVxdWVzdFwiLCByZXF1ZXN0SWQpO1xuXG4gICAgbWVzc2FnZS5jb250ZW50ID0geyByZXN0YXJ0IH07XG5cbiAgICB0aGlzLnNoZWxsU29ja2V0LnNlbmQobmV3IE1lc3NhZ2UobWVzc2FnZSkpO1xuICB9XG5cbiAgX3NvY2tldFJlc3RhcnQob25SZXN0YXJ0ZWQ6ID9GdW5jdGlvbikge1xuICAgIGlmICh0aGlzLmV4ZWN1dGlvblN0YXRlID09PSBcInJlc3RhcnRpbmdcIikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnNldEV4ZWN1dGlvblN0YXRlKFwicmVzdGFydGluZ1wiKTtcbiAgICB0aGlzLl9zb2NrZXRTaHV0ZG93bih0cnVlKTtcbiAgICB0aGlzLl9raWxsKCk7XG4gICAgY29uc3QgeyBzcGF3biB9ID0gbGF1bmNoU3BlY0Zyb21Db25uZWN0aW9uSW5mbyhcbiAgICAgIHRoaXMua2VybmVsU3BlYyxcbiAgICAgIHRoaXMuY29ubmVjdGlvbixcbiAgICAgIHRoaXMuY29ubmVjdGlvbkZpbGUsXG4gICAgICB0aGlzLm9wdGlvbnNcbiAgICApO1xuICAgIHRoaXMua2VybmVsUHJvY2VzcyA9IHNwYXduO1xuICAgIHRoaXMubW9uaXRvcigoKSA9PiB7XG4gICAgICBpZiAob25SZXN0YXJ0ZWQpIG9uUmVzdGFydGVkKCk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBvblJlc3VsdHMgaXMgYSBjYWxsYmFjayB0aGF0IG1heSBiZSBjYWxsZWQgbXVsdGlwbGUgdGltZXNcbiAgLy8gYXMgcmVzdWx0cyBjb21lIGluIGZyb20gdGhlIGtlcm5lbFxuICBleGVjdXRlKGNvZGU6IHN0cmluZywgb25SZXN1bHRzOiBSZXN1bHRzQ2FsbGJhY2spIHtcbiAgICBsb2coXCJaTVFLZXJuZWwuZXhlY3V0ZTpcIiwgY29kZSk7XG4gICAgY29uc3QgcmVxdWVzdElkID0gYGV4ZWN1dGVfJHt2NCgpfWA7XG5cbiAgICBjb25zdCBtZXNzYWdlID0gdGhpcy5fY3JlYXRlTWVzc2FnZShcImV4ZWN1dGVfcmVxdWVzdFwiLCByZXF1ZXN0SWQpO1xuXG4gICAgbWVzc2FnZS5jb250ZW50ID0ge1xuICAgICAgY29kZSxcbiAgICAgIHNpbGVudDogZmFsc2UsXG4gICAgICBzdG9yZV9oaXN0b3J5OiB0cnVlLFxuICAgICAgdXNlcl9leHByZXNzaW9uczoge30sXG4gICAgICBhbGxvd19zdGRpbjogdHJ1ZVxuICAgIH07XG5cbiAgICB0aGlzLmV4ZWN1dGlvbkNhbGxiYWNrc1tyZXF1ZXN0SWRdID0gb25SZXN1bHRzO1xuXG4gICAgdGhpcy5zaGVsbFNvY2tldC5zZW5kKG5ldyBNZXNzYWdlKG1lc3NhZ2UpKTtcbiAgfVxuXG4gIGNvbXBsZXRlKGNvZGU6IHN0cmluZywgb25SZXN1bHRzOiBSZXN1bHRzQ2FsbGJhY2spIHtcbiAgICBsb2coXCJaTVFLZXJuZWwuY29tcGxldGU6XCIsIGNvZGUpO1xuXG4gICAgY29uc3QgcmVxdWVzdElkID0gYGNvbXBsZXRlXyR7djQoKX1gO1xuXG4gICAgY29uc3QgbWVzc2FnZSA9IHRoaXMuX2NyZWF0ZU1lc3NhZ2UoXCJjb21wbGV0ZV9yZXF1ZXN0XCIsIHJlcXVlc3RJZCk7XG5cbiAgICBtZXNzYWdlLmNvbnRlbnQgPSB7XG4gICAgICBjb2RlLFxuICAgICAgdGV4dDogY29kZSxcbiAgICAgIGxpbmU6IGNvZGUsXG4gICAgICBjdXJzb3JfcG9zOiBjb2RlLmxlbmd0aFxuICAgIH07XG5cbiAgICB0aGlzLmV4ZWN1dGlvbkNhbGxiYWNrc1tyZXF1ZXN0SWRdID0gb25SZXN1bHRzO1xuXG4gICAgdGhpcy5zaGVsbFNvY2tldC5zZW5kKG5ldyBNZXNzYWdlKG1lc3NhZ2UpKTtcbiAgfVxuXG4gIGluc3BlY3QoY29kZTogc3RyaW5nLCBjdXJzb3JQb3M6IG51bWJlciwgb25SZXN1bHRzOiBSZXN1bHRzQ2FsbGJhY2spIHtcbiAgICBsb2coXCJaTVFLZXJuZWwuaW5zcGVjdDpcIiwgY29kZSwgY3Vyc29yUG9zKTtcblxuICAgIGNvbnN0IHJlcXVlc3RJZCA9IGBpbnNwZWN0XyR7djQoKX1gO1xuXG4gICAgY29uc3QgbWVzc2FnZSA9IHRoaXMuX2NyZWF0ZU1lc3NhZ2UoXCJpbnNwZWN0X3JlcXVlc3RcIiwgcmVxdWVzdElkKTtcblxuICAgIG1lc3NhZ2UuY29udGVudCA9IHtcbiAgICAgIGNvZGUsXG4gICAgICBjdXJzb3JfcG9zOiBjdXJzb3JQb3MsXG4gICAgICBkZXRhaWxfbGV2ZWw6IDBcbiAgICB9O1xuXG4gICAgdGhpcy5leGVjdXRpb25DYWxsYmFja3NbcmVxdWVzdElkXSA9IG9uUmVzdWx0cztcblxuICAgIHRoaXMuc2hlbGxTb2NrZXQuc2VuZChuZXcgTWVzc2FnZShtZXNzYWdlKSk7XG4gIH1cblxuICBpbnB1dFJlcGx5KGlucHV0OiBzdHJpbmcpIHtcbiAgICBjb25zdCByZXF1ZXN0SWQgPSBgaW5wdXRfcmVwbHlfJHt2NCgpfWA7XG5cbiAgICBjb25zdCBtZXNzYWdlID0gdGhpcy5fY3JlYXRlTWVzc2FnZShcImlucHV0X3JlcGx5XCIsIHJlcXVlc3RJZCk7XG5cbiAgICBtZXNzYWdlLmNvbnRlbnQgPSB7IHZhbHVlOiBpbnB1dCB9O1xuXG4gICAgdGhpcy5zdGRpblNvY2tldC5zZW5kKG5ldyBNZXNzYWdlKG1lc3NhZ2UpKTtcbiAgfVxuXG4gIG9uU2hlbGxNZXNzYWdlKG1lc3NhZ2U6IE1lc3NhZ2UpIHtcbiAgICBsb2coXCJzaGVsbCBtZXNzYWdlOlwiLCBtZXNzYWdlKTtcblxuICAgIGlmICghdGhpcy5faXNWYWxpZE1lc3NhZ2UobWVzc2FnZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB7IG1zZ19pZCB9ID0gbWVzc2FnZS5wYXJlbnRfaGVhZGVyO1xuICAgIGxldCBjYWxsYmFjaztcbiAgICBpZiAobXNnX2lkKSB7XG4gICAgICBjYWxsYmFjayA9IHRoaXMuZXhlY3V0aW9uQ2FsbGJhY2tzW21zZ19pZF07XG4gICAgfVxuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhtZXNzYWdlLCBcInNoZWxsXCIpO1xuICAgIH1cbiAgfVxuXG4gIG9uU3RkaW5NZXNzYWdlKG1lc3NhZ2U6IE1lc3NhZ2UpIHtcbiAgICBsb2coXCJzdGRpbiBtZXNzYWdlOlwiLCBtZXNzYWdlKTtcblxuICAgIGlmICghdGhpcy5faXNWYWxpZE1lc3NhZ2UobWVzc2FnZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBpbnB1dF9yZXF1ZXN0IG1lc3NhZ2VzIGFyZSBhdHRyaWJ1dGFibGUgdG8gcGFydGljdWxhciBleGVjdXRpb24gcmVxdWVzdHMsXG4gICAgLy8gYW5kIHNob3VsZCBwYXNzIHRocm91Z2ggdGhlIG1pZGRsZXdhcmUgc3RhY2sgdG8gYWxsb3cgcGx1Z2lucyB0byBzZWUgdGhlbVxuICAgIGNvbnN0IHsgbXNnX2lkIH0gPSBtZXNzYWdlLnBhcmVudF9oZWFkZXI7XG4gICAgbGV0IGNhbGxiYWNrO1xuICAgIGlmIChtc2dfaWQpIHtcbiAgICAgIGNhbGxiYWNrID0gdGhpcy5leGVjdXRpb25DYWxsYmFja3NbbXNnX2lkXTtcbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKG1lc3NhZ2UsIFwic3RkaW5cIik7XG4gICAgfVxuICB9XG5cbiAgb25JT01lc3NhZ2UobWVzc2FnZTogTWVzc2FnZSkge1xuICAgIGxvZyhcIklPIG1lc3NhZ2U6XCIsIG1lc3NhZ2UpO1xuXG4gICAgaWYgKCF0aGlzLl9pc1ZhbGlkTWVzc2FnZShtZXNzYWdlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHsgbXNnX3R5cGUgfSA9IG1lc3NhZ2UuaGVhZGVyO1xuXG4gICAgaWYgKG1zZ190eXBlID09PSBcInN0YXR1c1wiKSB7XG4gICAgICBjb25zdCBzdGF0dXMgPSBtZXNzYWdlLmNvbnRlbnQuZXhlY3V0aW9uX3N0YXRlO1xuICAgICAgdGhpcy5zZXRFeGVjdXRpb25TdGF0ZShzdGF0dXMpO1xuICAgIH1cblxuICAgIGNvbnN0IHsgbXNnX2lkIH0gPSBtZXNzYWdlLnBhcmVudF9oZWFkZXI7XG4gICAgbGV0IGNhbGxiYWNrO1xuICAgIGlmIChtc2dfaWQpIHtcbiAgICAgIGNhbGxiYWNrID0gdGhpcy5leGVjdXRpb25DYWxsYmFja3NbbXNnX2lkXTtcbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKG1lc3NhZ2UsIFwiaW9wdWJcIik7XG4gICAgfVxuICB9XG5cbiAgX2lzVmFsaWRNZXNzYWdlKG1lc3NhZ2U6IE1lc3NhZ2UpIHtcbiAgICBpZiAoIW1lc3NhZ2UpIHtcbiAgICAgIGxvZyhcIkludmFsaWQgbWVzc2FnZTogbnVsbFwiKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIW1lc3NhZ2UuY29udGVudCkge1xuICAgICAgbG9nKFwiSW52YWxpZCBtZXNzYWdlOiBNaXNzaW5nIGNvbnRlbnRcIik7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKG1lc3NhZ2UuY29udGVudC5leGVjdXRpb25fc3RhdGUgPT09IFwic3RhcnRpbmdcIikge1xuICAgICAgLy8gS2VybmVscyBzZW5kIGEgc3RhcnRpbmcgc3RhdHVzIG1lc3NhZ2Ugd2l0aCBhbiBlbXB0eSBwYXJlbnRfaGVhZGVyXG4gICAgICBsb2coXCJEcm9wcGVkIHN0YXJ0aW5nIHN0YXR1cyBJTyBtZXNzYWdlXCIpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghbWVzc2FnZS5wYXJlbnRfaGVhZGVyKSB7XG4gICAgICBsb2coXCJJbnZhbGlkIG1lc3NhZ2U6IE1pc3NpbmcgcGFyZW50X2hlYWRlclwiKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIW1lc3NhZ2UucGFyZW50X2hlYWRlci5tc2dfaWQpIHtcbiAgICAgIGxvZyhcIkludmFsaWQgbWVzc2FnZTogTWlzc2luZyBwYXJlbnRfaGVhZGVyLm1zZ19pZFwiKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIW1lc3NhZ2UucGFyZW50X2hlYWRlci5tc2dfdHlwZSkge1xuICAgICAgbG9nKFwiSW52YWxpZCBtZXNzYWdlOiBNaXNzaW5nIHBhcmVudF9oZWFkZXIubXNnX3R5cGVcIik7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFtZXNzYWdlLmhlYWRlcikge1xuICAgICAgbG9nKFwiSW52YWxpZCBtZXNzYWdlOiBNaXNzaW5nIGhlYWRlclwiKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIW1lc3NhZ2UuaGVhZGVyLm1zZ19pZCkge1xuICAgICAgbG9nKFwiSW52YWxpZCBtZXNzYWdlOiBNaXNzaW5nIGhlYWRlci5tc2dfaWRcIik7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFtZXNzYWdlLmhlYWRlci5tc2dfdHlwZSkge1xuICAgICAgbG9nKFwiSW52YWxpZCBtZXNzYWdlOiBNaXNzaW5nIGhlYWRlci5tc2dfdHlwZVwiKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgbG9nKFwiWk1RS2VybmVsOiBkZXN0cm95OlwiLCB0aGlzKTtcblxuICAgIHRoaXMuc2h1dGRvd24oKTtcblxuICAgIHRoaXMuX2tpbGwoKTtcbiAgICBmcy51bmxpbmtTeW5jKHRoaXMuY29ubmVjdGlvbkZpbGUpO1xuXG4gICAgdGhpcy5zaGVsbFNvY2tldC5jbG9zZSgpO1xuICAgIHRoaXMuY29udHJvbFNvY2tldC5jbG9zZSgpO1xuICAgIHRoaXMuaW9Tb2NrZXQuY2xvc2UoKTtcbiAgICB0aGlzLnN0ZGluU29ja2V0LmNsb3NlKCk7XG5cbiAgICBzdXBlci5kZXN0cm95KCk7XG4gIH1cblxuICBfZ2V0VXNlcm5hbWUoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIHByb2Nlc3MuZW52LkxPR05BTUUgfHxcbiAgICAgIHByb2Nlc3MuZW52LlVTRVIgfHxcbiAgICAgIHByb2Nlc3MuZW52LkxOQU1FIHx8XG4gICAgICBwcm9jZXNzLmVudi5VU0VSTkFNRVxuICAgICk7XG4gIH1cblxuICBfY3JlYXRlTWVzc2FnZShtc2dUeXBlOiBzdHJpbmcsIG1zZ0lkOiBzdHJpbmcgPSB2NCgpKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IHtcbiAgICAgIGhlYWRlcjoge1xuICAgICAgICB1c2VybmFtZTogdGhpcy5fZ2V0VXNlcm5hbWUoKSxcbiAgICAgICAgc2Vzc2lvbjogXCIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDBcIixcbiAgICAgICAgbXNnX3R5cGU6IG1zZ1R5cGUsXG4gICAgICAgIG1zZ19pZDogbXNnSWQsXG4gICAgICAgIGRhdGU6IG5ldyBEYXRlKCksXG4gICAgICAgIHZlcnNpb246IFwiNS4wXCJcbiAgICAgIH0sXG4gICAgICBtZXRhZGF0YToge30sXG4gICAgICBwYXJlbnRfaGVhZGVyOiB7fSxcbiAgICAgIGNvbnRlbnQ6IHt9XG4gICAgfTtcblxuICAgIHJldHVybiBtZXNzYWdlO1xuICB9XG59XG4iXX0=