Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*
 * The `HydrogenKernel` class wraps Hydrogen's internal representation of kernels
 * and exposes a small set of methods that should be usable by plugins.
 * @class HydrogenKernel
 */

var HydrogenKernel = (function () {
  function HydrogenKernel(_kernel) {
    _classCallCheck(this, HydrogenKernel);

    this._kernel = _kernel;
    this.destroyed = false;
  }

  _createClass(HydrogenKernel, [{
    key: "_assertNotDestroyed",
    value: function _assertNotDestroyed() {
      // Internal: plugins might hold references to long-destroyed kernels, so
      // all API calls should guard against this case
      if (this.destroyed) {
        throw new Error("HydrogenKernel: operation not allowed because the kernel has been destroyed");
      }
    }

    /*
     * The language of the kernel, as specified in its kernelspec
     */
  }, {
    key: "addMiddleware",

    /*
     * Add a kernel middleware, which allows intercepting and issuing commands to
     * the kernel.
     *
     * If the methods of a `middleware` object are added/modified/deleted after
     * `addMiddleware` has been called, the changes will take effect immediately.
     *
     * @param {HydrogenKernelMiddleware} middleware
     */
    value: function addMiddleware(middleware) {
      this._assertNotDestroyed();
      this._kernel.addMiddleware(middleware);
    }

    /*
     * Calls your callback when the kernel has been destroyed.
     * @param {Function} Callback
     */
  }, {
    key: "onDidDestroy",
    value: function onDidDestroy(callback) {
      this._assertNotDestroyed();
      this._kernel.emitter.on("did-destroy", callback);
    }

    /*
     * Get the [connection file](http://jupyter-notebook.readthedocs.io/en/latest/examples/Notebook/Connecting%20with%20the%20Qt%20Console.html) of the kernel.
     * @return {String} Path to connection file.
     */
  }, {
    key: "getConnectionFile",
    value: function getConnectionFile() {
      this._assertNotDestroyed();

      var connectionFile = this._kernel.transport.connectionFile ? this._kernel.transport.connectionFile : null;
      if (!connectionFile) {
        throw new Error("No connection file for " + this._kernel.kernelSpec.display_name + " kernel found");
      }

      return connectionFile;
    }
  }, {
    key: "language",
    get: function get() {
      this._assertNotDestroyed();
      return this._kernel.language;
    }

    /*
     * The display name of the kernel, as specified in its kernelspec
     */
  }, {
    key: "displayName",
    get: function get() {
      this._assertNotDestroyed();
      return this._kernel.displayName;
    }
  }]);

  return HydrogenKernel;
})();

exports["default"] = HydrogenKernel;
module.exports = exports["default"];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvSHlkcm9nZW4vbGliL3BsdWdpbi1hcGkvaHlkcm9nZW4ta2VybmVsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0lBV3FCLGNBQWM7QUFJdEIsV0FKUSxjQUFjLENBSXJCLE9BQWUsRUFBRTswQkFKVixjQUFjOztBQUsvQixRQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztBQUN2QixRQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztHQUN4Qjs7ZUFQa0IsY0FBYzs7V0FTZCwrQkFBRzs7O0FBR3BCLFVBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtBQUNsQixjQUFNLElBQUksS0FBSyxDQUNiLDZFQUE2RSxDQUM5RSxDQUFDO09BQ0g7S0FDRjs7Ozs7Ozs7Ozs7Ozs7Ozs7V0EyQlksdUJBQUMsVUFBb0MsRUFBRTtBQUNsRCxVQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztBQUMzQixVQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUN4Qzs7Ozs7Ozs7V0FNVyxzQkFBQyxRQUFrQixFQUFRO0FBQ3JDLFVBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0FBQzNCLFVBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUM7S0FDbEQ7Ozs7Ozs7O1dBTWdCLDZCQUFHO0FBQ2xCLFVBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDOztBQUUzQixVQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxjQUFjLEdBQ3hELElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLGNBQWMsR0FDckMsSUFBSSxDQUFDO0FBQ1QsVUFBSSxDQUFDLGNBQWMsRUFBRTtBQUNuQixjQUFNLElBQUksS0FBSyw2QkFFWCxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxZQUFZLG1CQUV2QyxDQUFDO09BQ0g7O0FBRUQsYUFBTyxjQUFjLENBQUM7S0FDdkI7OztTQXZEVyxlQUFXO0FBQ3JCLFVBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0FBQzNCLGFBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7S0FDOUI7Ozs7Ozs7U0FLYyxlQUFXO0FBQ3hCLFVBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0FBQzNCLGFBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7S0FDakM7OztTQWpDa0IsY0FBYzs7O3FCQUFkLGNBQWMiLCJmaWxlIjoiL2hvbWUva25pZWxiby8uYXRvbS9wYWNrYWdlcy9IeWRyb2dlbi9saWIvcGx1Z2luLWFwaS9oeWRyb2dlbi1rZXJuZWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBAZmxvdyAqL1xuXG5pbXBvcnQgdHlwZSBLZXJuZWwgZnJvbSBcIi4vLi4va2VybmVsXCI7XG5pbXBvcnQgdHlwZSB7IEh5ZHJvZ2VuS2VybmVsTWlkZGxld2FyZSB9IGZyb20gXCIuL2h5ZHJvZ2VuLXR5cGVzXCI7XG5cbi8qXG4gKiBUaGUgYEh5ZHJvZ2VuS2VybmVsYCBjbGFzcyB3cmFwcyBIeWRyb2dlbidzIGludGVybmFsIHJlcHJlc2VudGF0aW9uIG9mIGtlcm5lbHNcbiAqIGFuZCBleHBvc2VzIGEgc21hbGwgc2V0IG9mIG1ldGhvZHMgdGhhdCBzaG91bGQgYmUgdXNhYmxlIGJ5IHBsdWdpbnMuXG4gKiBAY2xhc3MgSHlkcm9nZW5LZXJuZWxcbiAqL1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBIeWRyb2dlbktlcm5lbCB7XG4gIF9rZXJuZWw6IEtlcm5lbDtcbiAgZGVzdHJveWVkOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKF9rZXJuZWw6IEtlcm5lbCkge1xuICAgIHRoaXMuX2tlcm5lbCA9IF9rZXJuZWw7XG4gICAgdGhpcy5kZXN0cm95ZWQgPSBmYWxzZTtcbiAgfVxuXG4gIF9hc3NlcnROb3REZXN0cm95ZWQoKSB7XG4gICAgLy8gSW50ZXJuYWw6IHBsdWdpbnMgbWlnaHQgaG9sZCByZWZlcmVuY2VzIHRvIGxvbmctZGVzdHJveWVkIGtlcm5lbHMsIHNvXG4gICAgLy8gYWxsIEFQSSBjYWxscyBzaG91bGQgZ3VhcmQgYWdhaW5zdCB0aGlzIGNhc2VcbiAgICBpZiAodGhpcy5kZXN0cm95ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJIeWRyb2dlbktlcm5lbDogb3BlcmF0aW9uIG5vdCBhbGxvd2VkIGJlY2F1c2UgdGhlIGtlcm5lbCBoYXMgYmVlbiBkZXN0cm95ZWRcIlxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvKlxuICAgKiBUaGUgbGFuZ3VhZ2Ugb2YgdGhlIGtlcm5lbCwgYXMgc3BlY2lmaWVkIGluIGl0cyBrZXJuZWxzcGVjXG4gICAqL1xuICBnZXQgbGFuZ3VhZ2UoKTogc3RyaW5nIHtcbiAgICB0aGlzLl9hc3NlcnROb3REZXN0cm95ZWQoKTtcbiAgICByZXR1cm4gdGhpcy5fa2VybmVsLmxhbmd1YWdlO1xuICB9XG5cbiAgLypcbiAgICogVGhlIGRpc3BsYXkgbmFtZSBvZiB0aGUga2VybmVsLCBhcyBzcGVjaWZpZWQgaW4gaXRzIGtlcm5lbHNwZWNcbiAgICovXG4gIGdldCBkaXNwbGF5TmFtZSgpOiBzdHJpbmcge1xuICAgIHRoaXMuX2Fzc2VydE5vdERlc3Ryb3llZCgpO1xuICAgIHJldHVybiB0aGlzLl9rZXJuZWwuZGlzcGxheU5hbWU7XG4gIH1cblxuICAvKlxuICAgKiBBZGQgYSBrZXJuZWwgbWlkZGxld2FyZSwgd2hpY2ggYWxsb3dzIGludGVyY2VwdGluZyBhbmQgaXNzdWluZyBjb21tYW5kcyB0b1xuICAgKiB0aGUga2VybmVsLlxuICAgKlxuICAgKiBJZiB0aGUgbWV0aG9kcyBvZiBhIGBtaWRkbGV3YXJlYCBvYmplY3QgYXJlIGFkZGVkL21vZGlmaWVkL2RlbGV0ZWQgYWZ0ZXJcbiAgICogYGFkZE1pZGRsZXdhcmVgIGhhcyBiZWVuIGNhbGxlZCwgdGhlIGNoYW5nZXMgd2lsbCB0YWtlIGVmZmVjdCBpbW1lZGlhdGVseS5cbiAgICpcbiAgICogQHBhcmFtIHtIeWRyb2dlbktlcm5lbE1pZGRsZXdhcmV9IG1pZGRsZXdhcmVcbiAgICovXG4gIGFkZE1pZGRsZXdhcmUobWlkZGxld2FyZTogSHlkcm9nZW5LZXJuZWxNaWRkbGV3YXJlKSB7XG4gICAgdGhpcy5fYXNzZXJ0Tm90RGVzdHJveWVkKCk7XG4gICAgdGhpcy5fa2VybmVsLmFkZE1pZGRsZXdhcmUobWlkZGxld2FyZSk7XG4gIH1cblxuICAvKlxuICAgKiBDYWxscyB5b3VyIGNhbGxiYWNrIHdoZW4gdGhlIGtlcm5lbCBoYXMgYmVlbiBkZXN0cm95ZWQuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IENhbGxiYWNrXG4gICAqL1xuICBvbkRpZERlc3Ryb3koY2FsbGJhY2s6IEZ1bmN0aW9uKTogdm9pZCB7XG4gICAgdGhpcy5fYXNzZXJ0Tm90RGVzdHJveWVkKCk7XG4gICAgdGhpcy5fa2VybmVsLmVtaXR0ZXIub24oXCJkaWQtZGVzdHJveVwiLCBjYWxsYmFjayk7XG4gIH1cblxuICAvKlxuICAgKiBHZXQgdGhlIFtjb25uZWN0aW9uIGZpbGVdKGh0dHA6Ly9qdXB5dGVyLW5vdGVib29rLnJlYWR0aGVkb2NzLmlvL2VuL2xhdGVzdC9leGFtcGxlcy9Ob3RlYm9vay9Db25uZWN0aW5nJTIwd2l0aCUyMHRoZSUyMFF0JTIwQ29uc29sZS5odG1sKSBvZiB0aGUga2VybmVsLlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9IFBhdGggdG8gY29ubmVjdGlvbiBmaWxlLlxuICAgKi9cbiAgZ2V0Q29ubmVjdGlvbkZpbGUoKSB7XG4gICAgdGhpcy5fYXNzZXJ0Tm90RGVzdHJveWVkKCk7XG5cbiAgICBjb25zdCBjb25uZWN0aW9uRmlsZSA9IHRoaXMuX2tlcm5lbC50cmFuc3BvcnQuY29ubmVjdGlvbkZpbGVcbiAgICAgID8gdGhpcy5fa2VybmVsLnRyYW5zcG9ydC5jb25uZWN0aW9uRmlsZVxuICAgICAgOiBudWxsO1xuICAgIGlmICghY29ubmVjdGlvbkZpbGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYE5vIGNvbm5lY3Rpb24gZmlsZSBmb3IgJHtcbiAgICAgICAgICB0aGlzLl9rZXJuZWwua2VybmVsU3BlYy5kaXNwbGF5X25hbWVcbiAgICAgICAgfSBrZXJuZWwgZm91bmRgXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBjb25uZWN0aW9uRmlsZTtcbiAgfVxufVxuIl19