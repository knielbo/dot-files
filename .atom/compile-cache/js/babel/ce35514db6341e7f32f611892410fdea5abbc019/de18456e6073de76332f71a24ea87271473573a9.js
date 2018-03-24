Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _kernelTransport = require("./kernel-transport");

var _kernelTransport2 = _interopRequireDefault(_kernelTransport);

var _inputView = require("./input-view");

var _inputView2 = _interopRequireDefault(_inputView);

var _utils = require("./utils");

var WSKernel = (function (_KernelTransport) {
  _inherits(WSKernel, _KernelTransport);

  function WSKernel(gatewayName, kernelSpec, grammar, session) {
    var _this = this;

    _classCallCheck(this, WSKernel);

    _get(Object.getPrototypeOf(WSKernel.prototype), "constructor", this).call(this, kernelSpec, grammar);
    this.session = session;
    this.gatewayName = gatewayName;

    this.session.statusChanged.connect(function () {
      return _this.setExecutionState(_this.session.status);
    });
    this.setExecutionState(this.session.status); // Set initial status correctly
  }

  _createClass(WSKernel, [{
    key: "interrupt",
    value: function interrupt() {
      this.session.kernel.interrupt();
    }
  }, {
    key: "shutdown",
    value: function shutdown() {
      this.session.kernel.shutdown();
    }
  }, {
    key: "restart",
    value: function restart(onRestarted) {
      var future = this.session.kernel.restart();
      future.then(function () {
        if (onRestarted) onRestarted();
      });
    }
  }, {
    key: "execute",
    value: function execute(code, onResults) {
      var future = this.session.kernel.requestExecute({ code: code });

      future.onIOPub = function (message) {
        (0, _utils.log)("WSKernel: execute:", message);
        onResults(message, "iopub");
      };

      future.onReply = function (message) {
        return onResults(message, "shell");
      };
      future.onStdin = function (message) {
        return onResults(message, "stdin");
      };
    }
  }, {
    key: "complete",
    value: function complete(code, onResults) {
      this.session.kernel.requestComplete({
        code: code,
        cursor_pos: code.length
      }).then(function (message) {
        return onResults(message, "shell");
      });
    }
  }, {
    key: "inspect",
    value: function inspect(code, cursorPos, onResults) {
      this.session.kernel.requestInspect({
        code: code,
        cursor_pos: cursorPos,
        detail_level: 0
      }).then(function (message) {
        return onResults(message, "shell");
      });
    }
  }, {
    key: "inputReply",
    value: function inputReply(input) {
      this.session.kernel.sendInputReply({ value: input });
    }
  }, {
    key: "promptRename",
    value: function promptRename() {
      var _this2 = this;

      var view = new _inputView2["default"]({
        prompt: "Name your current session",
        defaultText: this.session.path,
        allowCancel: true
      }, function (input) {
        return _this2.session.setPath(input);
      });

      view.attach();
    }
  }, {
    key: "destroy",
    value: function destroy() {
      (0, _utils.log)("WSKernel: destroying jupyter-js-services Session");
      this.session.dispose();
      _get(Object.getPrototypeOf(WSKernel.prototype), "destroy", this).call(this);
    }
  }]);

  return WSKernel;
})(_kernelTransport2["default"]);

exports["default"] = WSKernel;
module.exports = exports["default"];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvSHlkcm9nZW4vbGliL3dzLWtlcm5lbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OzsrQkFFNEIsb0JBQW9COzs7O3lCQUUxQixjQUFjOzs7O3FCQUNoQixTQUFTOztJQUlSLFFBQVE7WUFBUixRQUFROztBQUloQixXQUpRLFFBQVEsQ0FLekIsV0FBbUIsRUFDbkIsVUFBc0IsRUFDdEIsT0FBcUIsRUFDckIsT0FBZ0IsRUFDaEI7OzswQkFUaUIsUUFBUTs7QUFVekIsK0JBVmlCLFFBQVEsNkNBVW5CLFVBQVUsRUFBRSxPQUFPLEVBQUU7QUFDM0IsUUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7QUFDdkIsUUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7O0FBRS9CLFFBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQzthQUNqQyxNQUFLLGlCQUFpQixDQUFDLE1BQUssT0FBTyxDQUFDLE1BQU0sQ0FBQztLQUFBLENBQzVDLENBQUM7QUFDRixRQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztHQUM3Qzs7ZUFsQmtCLFFBQVE7O1dBb0JsQixxQkFBRztBQUNWLFVBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO0tBQ2pDOzs7V0FFTyxvQkFBRztBQUNULFVBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO0tBQ2hDOzs7V0FFTSxpQkFBQyxXQUFzQixFQUFFO0FBQzlCLFVBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQzdDLFlBQU0sQ0FBQyxJQUFJLENBQUMsWUFBTTtBQUNoQixZQUFJLFdBQVcsRUFBRSxXQUFXLEVBQUUsQ0FBQztPQUNoQyxDQUFDLENBQUM7S0FDSjs7O1dBRU0saUJBQUMsSUFBWSxFQUFFLFNBQTBCLEVBQUU7QUFDaEQsVUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsSUFBSSxFQUFKLElBQUksRUFBRSxDQUFDLENBQUM7O0FBRTVELFlBQU0sQ0FBQyxPQUFPLEdBQUcsVUFBQyxPQUFPLEVBQWM7QUFDckMsd0JBQUksb0JBQW9CLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDbkMsaUJBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7T0FDN0IsQ0FBQzs7QUFFRixZQUFNLENBQUMsT0FBTyxHQUFHLFVBQUMsT0FBTztlQUFjLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO09BQUEsQ0FBQztBQUNuRSxZQUFNLENBQUMsT0FBTyxHQUFHLFVBQUMsT0FBTztlQUFjLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO09BQUEsQ0FBQztLQUNwRTs7O1dBRU8sa0JBQUMsSUFBWSxFQUFFLFNBQTBCLEVBQUU7QUFDakQsVUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQ2hCLGVBQWUsQ0FBQztBQUNmLFlBQUksRUFBSixJQUFJO0FBQ0osa0JBQVUsRUFBRSxJQUFJLENBQUMsTUFBTTtPQUN4QixDQUFDLENBQ0QsSUFBSSxDQUFDLFVBQUMsT0FBTztlQUFjLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO09BQUEsQ0FBQyxDQUFDO0tBQzVEOzs7V0FFTSxpQkFBQyxJQUFZLEVBQUUsU0FBaUIsRUFBRSxTQUEwQixFQUFFO0FBQ25FLFVBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUNoQixjQUFjLENBQUM7QUFDZCxZQUFJLEVBQUosSUFBSTtBQUNKLGtCQUFVLEVBQUUsU0FBUztBQUNyQixvQkFBWSxFQUFFLENBQUM7T0FDaEIsQ0FBQyxDQUNELElBQUksQ0FBQyxVQUFDLE9BQU87ZUFBYyxTQUFTLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQztPQUFBLENBQUMsQ0FBQztLQUM1RDs7O1dBRVMsb0JBQUMsS0FBYSxFQUFFO0FBQ3hCLFVBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0tBQ3REOzs7V0FFVyx3QkFBRzs7O0FBQ2IsVUFBTSxJQUFJLEdBQUcsMkJBQ1g7QUFDRSxjQUFNLEVBQUUsMkJBQTJCO0FBQ25DLG1CQUFXLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJO0FBQzlCLG1CQUFXLEVBQUUsSUFBSTtPQUNsQixFQUNELFVBQUMsS0FBSztlQUFhLE9BQUssT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7T0FBQSxDQUMvQyxDQUFDOztBQUVGLFVBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztLQUNmOzs7V0FFTSxtQkFBRztBQUNSLHNCQUFJLGtEQUFrRCxDQUFDLENBQUM7QUFDeEQsVUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN2QixpQ0F0RmlCLFFBQVEseUNBc0ZUO0tBQ2pCOzs7U0F2RmtCLFFBQVE7OztxQkFBUixRQUFRIiwiZmlsZSI6Ii9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvSHlkcm9nZW4vbGliL3dzLWtlcm5lbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIEBmbG93ICovXG5cbmltcG9ydCBLZXJuZWxUcmFuc3BvcnQgZnJvbSBcIi4va2VybmVsLXRyYW5zcG9ydFwiO1xuaW1wb3J0IHR5cGUgeyBSZXN1bHRzQ2FsbGJhY2sgfSBmcm9tIFwiLi9rZXJuZWwtdHJhbnNwb3J0XCI7XG5pbXBvcnQgSW5wdXRWaWV3IGZyb20gXCIuL2lucHV0LXZpZXdcIjtcbmltcG9ydCB7IGxvZyB9IGZyb20gXCIuL3V0aWxzXCI7XG5cbmltcG9ydCB0eXBlIHsgU2Vzc2lvbiB9IGZyb20gXCJAanVweXRlcmxhYi9zZXJ2aWNlc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXU0tlcm5lbCBleHRlbmRzIEtlcm5lbFRyYW5zcG9ydCB7XG4gIHNlc3Npb246IFNlc3Npb247XG4gIGdhdGV3YXlOYW1lOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgZ2F0ZXdheU5hbWU6IHN0cmluZyxcbiAgICBrZXJuZWxTcGVjOiBLZXJuZWxzcGVjLFxuICAgIGdyYW1tYXI6IGF0b20kR3JhbW1hcixcbiAgICBzZXNzaW9uOiBTZXNzaW9uXG4gICkge1xuICAgIHN1cGVyKGtlcm5lbFNwZWMsIGdyYW1tYXIpO1xuICAgIHRoaXMuc2Vzc2lvbiA9IHNlc3Npb247XG4gICAgdGhpcy5nYXRld2F5TmFtZSA9IGdhdGV3YXlOYW1lO1xuXG4gICAgdGhpcy5zZXNzaW9uLnN0YXR1c0NoYW5nZWQuY29ubmVjdCgoKSA9PlxuICAgICAgdGhpcy5zZXRFeGVjdXRpb25TdGF0ZSh0aGlzLnNlc3Npb24uc3RhdHVzKVxuICAgICk7XG4gICAgdGhpcy5zZXRFeGVjdXRpb25TdGF0ZSh0aGlzLnNlc3Npb24uc3RhdHVzKTsgLy8gU2V0IGluaXRpYWwgc3RhdHVzIGNvcnJlY3RseVxuICB9XG5cbiAgaW50ZXJydXB0KCkge1xuICAgIHRoaXMuc2Vzc2lvbi5rZXJuZWwuaW50ZXJydXB0KCk7XG4gIH1cblxuICBzaHV0ZG93bigpIHtcbiAgICB0aGlzLnNlc3Npb24ua2VybmVsLnNodXRkb3duKCk7XG4gIH1cblxuICByZXN0YXJ0KG9uUmVzdGFydGVkOiA/RnVuY3Rpb24pIHtcbiAgICBjb25zdCBmdXR1cmUgPSB0aGlzLnNlc3Npb24ua2VybmVsLnJlc3RhcnQoKTtcbiAgICBmdXR1cmUudGhlbigoKSA9PiB7XG4gICAgICBpZiAob25SZXN0YXJ0ZWQpIG9uUmVzdGFydGVkKCk7XG4gICAgfSk7XG4gIH1cblxuICBleGVjdXRlKGNvZGU6IHN0cmluZywgb25SZXN1bHRzOiBSZXN1bHRzQ2FsbGJhY2spIHtcbiAgICBjb25zdCBmdXR1cmUgPSB0aGlzLnNlc3Npb24ua2VybmVsLnJlcXVlc3RFeGVjdXRlKHsgY29kZSB9KTtcblxuICAgIGZ1dHVyZS5vbklPUHViID0gKG1lc3NhZ2U6IE1lc3NhZ2UpID0+IHtcbiAgICAgIGxvZyhcIldTS2VybmVsOiBleGVjdXRlOlwiLCBtZXNzYWdlKTtcbiAgICAgIG9uUmVzdWx0cyhtZXNzYWdlLCBcImlvcHViXCIpO1xuICAgIH07XG5cbiAgICBmdXR1cmUub25SZXBseSA9IChtZXNzYWdlOiBNZXNzYWdlKSA9PiBvblJlc3VsdHMobWVzc2FnZSwgXCJzaGVsbFwiKTtcbiAgICBmdXR1cmUub25TdGRpbiA9IChtZXNzYWdlOiBNZXNzYWdlKSA9PiBvblJlc3VsdHMobWVzc2FnZSwgXCJzdGRpblwiKTtcbiAgfVxuXG4gIGNvbXBsZXRlKGNvZGU6IHN0cmluZywgb25SZXN1bHRzOiBSZXN1bHRzQ2FsbGJhY2spIHtcbiAgICB0aGlzLnNlc3Npb24ua2VybmVsXG4gICAgICAucmVxdWVzdENvbXBsZXRlKHtcbiAgICAgICAgY29kZSxcbiAgICAgICAgY3Vyc29yX3BvczogY29kZS5sZW5ndGhcbiAgICAgIH0pXG4gICAgICAudGhlbigobWVzc2FnZTogTWVzc2FnZSkgPT4gb25SZXN1bHRzKG1lc3NhZ2UsIFwic2hlbGxcIikpO1xuICB9XG5cbiAgaW5zcGVjdChjb2RlOiBzdHJpbmcsIGN1cnNvclBvczogbnVtYmVyLCBvblJlc3VsdHM6IFJlc3VsdHNDYWxsYmFjaykge1xuICAgIHRoaXMuc2Vzc2lvbi5rZXJuZWxcbiAgICAgIC5yZXF1ZXN0SW5zcGVjdCh7XG4gICAgICAgIGNvZGUsXG4gICAgICAgIGN1cnNvcl9wb3M6IGN1cnNvclBvcyxcbiAgICAgICAgZGV0YWlsX2xldmVsOiAwXG4gICAgICB9KVxuICAgICAgLnRoZW4oKG1lc3NhZ2U6IE1lc3NhZ2UpID0+IG9uUmVzdWx0cyhtZXNzYWdlLCBcInNoZWxsXCIpKTtcbiAgfVxuXG4gIGlucHV0UmVwbHkoaW5wdXQ6IHN0cmluZykge1xuICAgIHRoaXMuc2Vzc2lvbi5rZXJuZWwuc2VuZElucHV0UmVwbHkoeyB2YWx1ZTogaW5wdXQgfSk7XG4gIH1cblxuICBwcm9tcHRSZW5hbWUoKSB7XG4gICAgY29uc3QgdmlldyA9IG5ldyBJbnB1dFZpZXcoXG4gICAgICB7XG4gICAgICAgIHByb21wdDogXCJOYW1lIHlvdXIgY3VycmVudCBzZXNzaW9uXCIsXG4gICAgICAgIGRlZmF1bHRUZXh0OiB0aGlzLnNlc3Npb24ucGF0aCxcbiAgICAgICAgYWxsb3dDYW5jZWw6IHRydWVcbiAgICAgIH0sXG4gICAgICAoaW5wdXQ6IHN0cmluZykgPT4gdGhpcy5zZXNzaW9uLnNldFBhdGgoaW5wdXQpXG4gICAgKTtcblxuICAgIHZpZXcuYXR0YWNoKCk7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIGxvZyhcIldTS2VybmVsOiBkZXN0cm95aW5nIGp1cHl0ZXItanMtc2VydmljZXMgU2Vzc2lvblwiKTtcbiAgICB0aGlzLnNlc3Npb24uZGlzcG9zZSgpO1xuICAgIHN1cGVyLmRlc3Ryb3koKTtcbiAgfVxufVxuIl19