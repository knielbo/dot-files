Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createDecoratedClass = (function () { function defineProperties(target, descriptors, initializers) { for (var i = 0; i < descriptors.length; i++) { var descriptor = descriptors[i]; var decorators = descriptor.decorators; var key = descriptor.key; delete descriptor.key; delete descriptor.decorators; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor || descriptor.initializer) descriptor.writable = true; if (decorators) { for (var f = 0; f < decorators.length; f++) { var decorator = decorators[f]; if (typeof decorator === "function") { descriptor = decorator(target, key, descriptor) || descriptor; } else { throw new TypeError("The decorator for method " + descriptor.key + " is of the invalid type " + typeof decorator); } } if (descriptor.initializer !== undefined) { initializers[key] = descriptor; continue; } } Object.defineProperty(target, key, descriptor); } } return function (Constructor, protoProps, staticProps, protoInitializers, staticInitializers) { if (protoProps) defineProperties(Constructor.prototype, protoProps, protoInitializers); if (staticProps) defineProperties(Constructor, staticProps, staticInitializers); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineDecoratedPropertyDescriptor(target, key, descriptors) { var _descriptor = descriptors[key]; if (!_descriptor) return; var descriptor = {}; for (var _key in _descriptor) descriptor[_key] = _descriptor[_key]; descriptor.value = descriptor.initializer ? descriptor.initializer.call(target) : undefined; Object.defineProperty(target, key, descriptor); }

var _mobx = require("mobx");

var _utils = require("./utils");

var KernelTransport = (function () {
  var _instanceInitializers = {};
  var _instanceInitializers = {};

  _createDecoratedClass(KernelTransport, [{
    key: "executionState",
    decorators: [_mobx.observable],
    initializer: function initializer() {
      return "loading";
    },
    enumerable: true
  }, {
    key: "inspector",
    decorators: [_mobx.observable],
    initializer: function initializer() {
      return { bundle: {} };
    },
    enumerable: true
  }], null, _instanceInitializers);

  function KernelTransport(kernelSpec, grammar) {
    _classCallCheck(this, KernelTransport);

    _defineDecoratedPropertyDescriptor(this, "executionState", _instanceInitializers);

    _defineDecoratedPropertyDescriptor(this, "inspector", _instanceInitializers);

    this.kernelSpec = kernelSpec;
    this.grammar = grammar;

    this.language = kernelSpec.language.toLowerCase();
    this.displayName = kernelSpec.display_name;
  }

  _createDecoratedClass(KernelTransport, [{
    key: "setExecutionState",
    decorators: [_mobx.action],
    value: function setExecutionState(state) {
      this.executionState = state;
    }
  }, {
    key: "interrupt",
    value: function interrupt() {
      throw new Error("KernelTransport: interrupt method not implemented");
    }
  }, {
    key: "shutdown",
    value: function shutdown() {
      throw new Error("KernelTransport: shutdown method not implemented");
    }
  }, {
    key: "restart",
    value: function restart(onRestarted) {
      throw new Error("KernelTransport: restart method not implemented");
    }
  }, {
    key: "execute",
    value: function execute(code, onResults) {
      throw new Error("KernelTransport: execute method not implemented");
    }
  }, {
    key: "complete",
    value: function complete(code, onResults) {
      throw new Error("KernelTransport: complete method not implemented");
    }
  }, {
    key: "inspect",
    value: function inspect(code, cursorPos, onResults) {
      throw new Error("KernelTransport: inspect method not implemented");
    }
  }, {
    key: "inputReply",
    value: function inputReply(input) {
      throw new Error("KernelTransport: inputReply method not implemented");
    }
  }, {
    key: "destroy",
    value: function destroy() {
      (0, _utils.log)("KernelTransport: Destroying base kernel");
    }
  }], null, _instanceInitializers);

  return KernelTransport;
})();

exports["default"] = KernelTransport;
module.exports = exports["default"];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvSHlkcm9nZW4vbGliL2tlcm5lbC10cmFuc3BvcnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztvQkFFbUMsTUFBTTs7cUJBRXJCLFNBQVM7O0lBT1IsZUFBZTs7Ozt3QkFBZixlQUFlOzs7O2FBQ0wsU0FBUzs7Ozs7OzthQUNkLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTs7Ozs7QUFPM0IsV0FUUSxlQUFlLENBU3RCLFVBQXNCLEVBQUUsT0FBcUIsRUFBRTswQkFUeEMsZUFBZTs7Ozs7O0FBVWhDLFFBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO0FBQzdCLFFBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDOztBQUV2QixRQUFJLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDbEQsUUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDO0dBQzVDOzt3QkFma0IsZUFBZTs7O1dBa0JqQiwyQkFBQyxLQUFhLEVBQUU7QUFDL0IsVUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7S0FDN0I7OztXQUVRLHFCQUFHO0FBQ1YsWUFBTSxJQUFJLEtBQUssQ0FBQyxtREFBbUQsQ0FBQyxDQUFDO0tBQ3RFOzs7V0FFTyxvQkFBRztBQUNULFlBQU0sSUFBSSxLQUFLLENBQUMsa0RBQWtELENBQUMsQ0FBQztLQUNyRTs7O1dBRU0saUJBQUMsV0FBc0IsRUFBRTtBQUM5QixZQUFNLElBQUksS0FBSyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7S0FDcEU7OztXQUVNLGlCQUFDLElBQVksRUFBRSxTQUEwQixFQUFFO0FBQ2hELFlBQU0sSUFBSSxLQUFLLENBQUMsaURBQWlELENBQUMsQ0FBQztLQUNwRTs7O1dBRU8sa0JBQUMsSUFBWSxFQUFFLFNBQTBCLEVBQUU7QUFDakQsWUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO0tBQ3JFOzs7V0FFTSxpQkFBQyxJQUFZLEVBQUUsU0FBaUIsRUFBRSxTQUEwQixFQUFFO0FBQ25FLFlBQU0sSUFBSSxLQUFLLENBQUMsaURBQWlELENBQUMsQ0FBQztLQUNwRTs7O1dBRVMsb0JBQUMsS0FBYSxFQUFFO0FBQ3hCLFlBQU0sSUFBSSxLQUFLLENBQUMsb0RBQW9ELENBQUMsQ0FBQztLQUN2RTs7O1dBRU0sbUJBQUc7QUFDUixzQkFBSSx5Q0FBeUMsQ0FBQyxDQUFDO0tBQ2hEOzs7U0FwRGtCLGVBQWU7OztxQkFBZixlQUFlIiwiZmlsZSI6Ii9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvSHlkcm9nZW4vbGliL2tlcm5lbC10cmFuc3BvcnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBAZmxvdyAqL1xuXG5pbXBvcnQgeyBvYnNlcnZhYmxlLCBhY3Rpb24gfSBmcm9tIFwibW9ieFwiO1xuXG5pbXBvcnQgeyBsb2cgfSBmcm9tIFwiLi91dGlsc1wiO1xuXG5leHBvcnQgdHlwZSBSZXN1bHRzQ2FsbGJhY2sgPSAoXG4gIG1lc3NhZ2U6IGFueSxcbiAgY2hhbm5lbDogXCJzaGVsbFwiIHwgXCJpb3B1YlwiIHwgXCJzdGRpblwiXG4pID0+IHZvaWQ7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEtlcm5lbFRyYW5zcG9ydCB7XG4gIEBvYnNlcnZhYmxlIGV4ZWN1dGlvblN0YXRlID0gXCJsb2FkaW5nXCI7XG4gIEBvYnNlcnZhYmxlIGluc3BlY3RvciA9IHsgYnVuZGxlOiB7fSB9O1xuXG4gIGtlcm5lbFNwZWM6IEtlcm5lbHNwZWM7XG4gIGdyYW1tYXI6IGF0b20kR3JhbW1hcjtcbiAgbGFuZ3VhZ2U6IHN0cmluZztcbiAgZGlzcGxheU5hbWU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihrZXJuZWxTcGVjOiBLZXJuZWxzcGVjLCBncmFtbWFyOiBhdG9tJEdyYW1tYXIpIHtcbiAgICB0aGlzLmtlcm5lbFNwZWMgPSBrZXJuZWxTcGVjO1xuICAgIHRoaXMuZ3JhbW1hciA9IGdyYW1tYXI7XG5cbiAgICB0aGlzLmxhbmd1YWdlID0ga2VybmVsU3BlYy5sYW5ndWFnZS50b0xvd2VyQ2FzZSgpO1xuICAgIHRoaXMuZGlzcGxheU5hbWUgPSBrZXJuZWxTcGVjLmRpc3BsYXlfbmFtZTtcbiAgfVxuXG4gIEBhY3Rpb25cbiAgc2V0RXhlY3V0aW9uU3RhdGUoc3RhdGU6IHN0cmluZykge1xuICAgIHRoaXMuZXhlY3V0aW9uU3RhdGUgPSBzdGF0ZTtcbiAgfVxuXG4gIGludGVycnVwdCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJLZXJuZWxUcmFuc3BvcnQ6IGludGVycnVwdCBtZXRob2Qgbm90IGltcGxlbWVudGVkXCIpO1xuICB9XG5cbiAgc2h1dGRvd24oKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiS2VybmVsVHJhbnNwb3J0OiBzaHV0ZG93biBtZXRob2Qgbm90IGltcGxlbWVudGVkXCIpO1xuICB9XG5cbiAgcmVzdGFydChvblJlc3RhcnRlZDogP0Z1bmN0aW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiS2VybmVsVHJhbnNwb3J0OiByZXN0YXJ0IG1ldGhvZCBub3QgaW1wbGVtZW50ZWRcIik7XG4gIH1cblxuICBleGVjdXRlKGNvZGU6IHN0cmluZywgb25SZXN1bHRzOiBSZXN1bHRzQ2FsbGJhY2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJLZXJuZWxUcmFuc3BvcnQ6IGV4ZWN1dGUgbWV0aG9kIG5vdCBpbXBsZW1lbnRlZFwiKTtcbiAgfVxuXG4gIGNvbXBsZXRlKGNvZGU6IHN0cmluZywgb25SZXN1bHRzOiBSZXN1bHRzQ2FsbGJhY2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJLZXJuZWxUcmFuc3BvcnQ6IGNvbXBsZXRlIG1ldGhvZCBub3QgaW1wbGVtZW50ZWRcIik7XG4gIH1cblxuICBpbnNwZWN0KGNvZGU6IHN0cmluZywgY3Vyc29yUG9zOiBudW1iZXIsIG9uUmVzdWx0czogUmVzdWx0c0NhbGxiYWNrKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiS2VybmVsVHJhbnNwb3J0OiBpbnNwZWN0IG1ldGhvZCBub3QgaW1wbGVtZW50ZWRcIik7XG4gIH1cblxuICBpbnB1dFJlcGx5KGlucHV0OiBzdHJpbmcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJLZXJuZWxUcmFuc3BvcnQ6IGlucHV0UmVwbHkgbWV0aG9kIG5vdCBpbXBsZW1lbnRlZFwiKTtcbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgbG9nKFwiS2VybmVsVHJhbnNwb3J0OiBEZXN0cm95aW5nIGJhc2Uga2VybmVsXCIpO1xuICB9XG59XG4iXX0=