Object.defineProperty(exports, "__esModule", {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _utils = require("./utils");

var _store = require("./store");

var _store2 = _interopRequireDefault(_store);

var iconHTML = "<img src='" + __dirname + "/../static/logo.svg' style='width: 100%;'>";

var regexes = {
  // pretty dodgy, adapted from http://stackoverflow.com/a/8396658
  r: /([^\d\W]|[.])[\w.$]*$/,

  // adapted from http://stackoverflow.com/q/5474008
  python: /([^\d\W]|[\u00A0-\uFFFF])[\w.\u00A0-\uFFFF]*$/,

  // adapted from http://php.net/manual/en/language.variables.basics.php
  php: /[$a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*$/
};

function parseCompletions(results, prefix) {
  var matches = results.matches;
  var cursor_start = results.cursor_start;
  var cursor_end = results.cursor_end;
  var metadata = results.metadata;

  if (metadata && metadata._jupyter_types_experimental) {
    var comps = metadata._jupyter_types_experimental;
    if (comps.length > 0 && comps[0].text != null && comps[0].start != null && comps[0].end != null) {
      return _lodash2["default"].map(comps, function (match) {
        return {
          text: match.text,
          replacementPrefix: prefix.slice(match.start, match.end),
          type: match.type,
          iconHTML: !match.type || match.type === "<unknown>" ? iconHTML : undefined
        };
      });
    }
  }

  var replacementPrefix = prefix.slice(cursor_start, cursor_end);

  return _lodash2["default"].map(matches, function (match) {
    return {
      text: match,
      replacementPrefix: replacementPrefix,
      iconHTML: iconHTML
    };
  });
}

exports["default"] = function () {
  var autocompleteProvider = {
    selector: ".source",
    disableForSelector: ".comment, .string",

    // `excludeLowerPriority: false` won't suppress providers with lower
    // priority.
    // The default provider has a priority of 0.
    inclusionPriority: 1,
    excludeLowerPriority: false,

    // Required: Return a promise, an array of suggestions, or null.
    getSuggestions: function getSuggestions(_ref) {
      var editor = _ref.editor;
      var bufferPosition = _ref.bufferPosition;
      var prefix = _ref.prefix;

      var kernel = _store2["default"].kernel;

      if (!kernel || kernel.executionState !== "idle") {
        return null;
      }

      var line = editor.getTextInBufferRange([[bufferPosition.row, 0], bufferPosition]);

      var regex = regexes[kernel.language];
      if (regex) {
        prefix = _lodash2["default"].head(line.match(regex)) || "";
      } else {
        prefix = line;
      }

      // return if cursor is at whitespace
      if (prefix.trimRight().length < prefix.length) {
        return null;
      }

      var minimumWordLength = atom.config.get("autocomplete-plus.minimumWordLength");
      if (typeof minimumWordLength !== "number") {
        minimumWordLength = 3;
      }

      if (prefix.trim().length < minimumWordLength) {
        return null;
      }

      (0, _utils.log)("autocompleteProvider: request:", line, bufferPosition, prefix);

      return new Promise(function (resolve) {
        return kernel.complete(prefix, function (results) {
          return resolve(parseCompletions(results, prefix));
        });
      });
    }
  };

  return autocompleteProvider;
};

module.exports = exports["default"];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvSHlkcm9nZW4vbGliL2F1dG9jb21wbGV0ZS1wcm92aWRlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7c0JBRWMsUUFBUTs7OztxQkFDRixTQUFTOztxQkFDWCxTQUFTOzs7O0FBc0IzQixJQUFNLFFBQVEsa0JBQWdCLFNBQVMsK0NBQTRDLENBQUM7O0FBRXBGLElBQU0sT0FBTyxHQUFHOztBQUVkLEdBQUMsRUFBRSx1QkFBdUI7OztBQUcxQixRQUFNLEVBQUUsK0NBQStDOzs7QUFHdkQsS0FBRyxFQUFFLDRDQUE0QztDQUNsRCxDQUFDOztBQUVGLFNBQVMsZ0JBQWdCLENBQUMsT0FBc0IsRUFBRSxNQUFjLEVBQUU7TUFDeEQsT0FBTyxHQUF5QyxPQUFPLENBQXZELE9BQU87TUFBRSxZQUFZLEdBQTJCLE9BQU8sQ0FBOUMsWUFBWTtNQUFFLFVBQVUsR0FBZSxPQUFPLENBQWhDLFVBQVU7TUFBRSxRQUFRLEdBQUssT0FBTyxDQUFwQixRQUFROztBQUVuRCxNQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsMkJBQTJCLEVBQUU7QUFDcEQsUUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLDJCQUEyQixDQUFDO0FBQ25ELFFBQ0UsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQ2hCLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxJQUNyQixLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksSUFDdEIsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxJQUFJLEVBQ3BCO0FBQ0EsYUFBTyxvQkFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLFVBQUEsS0FBSztlQUFLO0FBQzVCLGNBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtBQUNoQiwyQkFBaUIsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQztBQUN2RCxjQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7QUFDaEIsa0JBQVEsRUFDTixDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxXQUFXLEdBQUcsUUFBUSxHQUFHLFNBQVM7U0FDbkU7T0FBQyxDQUFDLENBQUM7S0FDTDtHQUNGOztBQUVELE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUM7O0FBRWpFLFNBQU8sb0JBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxVQUFBLEtBQUs7V0FBSztBQUM5QixVQUFJLEVBQUUsS0FBSztBQUNYLHVCQUFpQixFQUFqQixpQkFBaUI7QUFDakIsY0FBUSxFQUFSLFFBQVE7S0FDVDtHQUFDLENBQUMsQ0FBQztDQUNMOztxQkFFYyxZQUFXO0FBQ3hCLE1BQU0sb0JBQW9CLEdBQUc7QUFDM0IsWUFBUSxFQUFFLFNBQVM7QUFDbkIsc0JBQWtCLEVBQUUsbUJBQW1COzs7OztBQUt2QyxxQkFBaUIsRUFBRSxDQUFDO0FBQ3BCLHdCQUFvQixFQUFFLEtBQUs7OztBQUczQixrQkFBYyxFQUFBLHdCQUFDLElBSUEsRUFBaUM7VUFIOUMsTUFBTSxHQURPLElBSUEsQ0FIYixNQUFNO1VBQ04sY0FBYyxHQUZELElBSUEsQ0FGYixjQUFjO1VBQ2QsTUFBTSxHQUhPLElBSUEsQ0FEYixNQUFNOztBQUVOLFVBQU0sTUFBTSxHQUFHLG1CQUFNLE1BQU0sQ0FBQzs7QUFFNUIsVUFBSSxDQUFDLE1BQU0sSUFBSSxNQUFNLENBQUMsY0FBYyxLQUFLLE1BQU0sRUFBRTtBQUMvQyxlQUFPLElBQUksQ0FBQztPQUNiOztBQUVELFVBQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUN2QyxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQ3ZCLGNBQWMsQ0FDZixDQUFDLENBQUM7O0FBRUgsVUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN2QyxVQUFJLEtBQUssRUFBRTtBQUNULGNBQU0sR0FBRyxvQkFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztPQUMxQyxNQUFNO0FBQ0wsY0FBTSxHQUFHLElBQUksQ0FBQztPQUNmOzs7QUFHRCxVQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRTtBQUM3QyxlQUFPLElBQUksQ0FBQztPQUNiOztBQUVELFVBQUksaUJBQWlCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQ3JDLHFDQUFxQyxDQUN0QyxDQUFDO0FBQ0YsVUFBSSxPQUFPLGlCQUFpQixLQUFLLFFBQVEsRUFBRTtBQUN6Qyx5QkFBaUIsR0FBRyxDQUFDLENBQUM7T0FDdkI7O0FBRUQsVUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFHLGlCQUFpQixFQUFFO0FBQzVDLGVBQU8sSUFBSSxDQUFDO09BQ2I7O0FBRUQsc0JBQUksZ0NBQWdDLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQzs7QUFFcEUsYUFBTyxJQUFJLE9BQU8sQ0FBQyxVQUFBLE9BQU87ZUFDeEIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsVUFBQyxPQUFPLEVBQW9CO0FBQ2xELGlCQUFPLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztTQUNuRCxDQUFDO09BQUEsQ0FDSCxDQUFDO0tBQ0g7R0FDRixDQUFDOztBQUVGLFNBQU8sb0JBQW9CLENBQUM7Q0FDN0IiLCJmaWxlIjoiL2hvbWUva25pZWxiby8uYXRvbS9wYWNrYWdlcy9IeWRyb2dlbi9saWIvYXV0b2NvbXBsZXRlLXByb3ZpZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogQGZsb3cgKi9cblxuaW1wb3J0IF8gZnJvbSBcImxvZGFzaFwiO1xuaW1wb3J0IHsgbG9nIH0gZnJvbSBcIi4vdXRpbHNcIjtcbmltcG9ydCBzdG9yZSBmcm9tIFwiLi9zdG9yZVwiO1xuXG50eXBlIEF1dG9jb21wbGV0ZSA9IHtcbiAgZWRpdG9yOiBhdG9tJFRleHRFZGl0b3IsXG4gIGJ1ZmZlclBvc2l0aW9uOiBhdG9tJFBvaW50LFxuICBwcmVmaXg6IHN0cmluZ1xufTtcblxudHlwZSBDb21wbGV0ZVJlcGx5ID0ge1xuICBtYXRjaGVzOiBBcnJheTxzdHJpbmc+LFxuICBjdXJzb3Jfc3RhcnQ6IG51bWJlcixcbiAgY3Vyc29yX2VuZDogbnVtYmVyLFxuICBtZXRhZGF0YT86IHtcbiAgICBfanVweXRlcl90eXBlc19leHBlcmltZW50YWw/OiBBcnJheTx7XG4gICAgICBzdGFydD86IG51bWJlcixcbiAgICAgIGVuZD86IG51bWJlcixcbiAgICAgIHRleHQ/OiBzdHJpbmcsXG4gICAgICB0eXBlPzogc3RyaW5nXG4gICAgfT5cbiAgfVxufTtcblxuY29uc3QgaWNvbkhUTUwgPSBgPGltZyBzcmM9JyR7X19kaXJuYW1lfS8uLi9zdGF0aWMvbG9nby5zdmcnIHN0eWxlPSd3aWR0aDogMTAwJTsnPmA7XG5cbmNvbnN0IHJlZ2V4ZXMgPSB7XG4gIC8vIHByZXR0eSBkb2RneSwgYWRhcHRlZCBmcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzgzOTY2NThcbiAgcjogLyhbXlxcZFxcV118Wy5dKVtcXHcuJF0qJC8sXG5cbiAgLy8gYWRhcHRlZCBmcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xLzU0NzQwMDhcbiAgcHl0aG9uOiAvKFteXFxkXFxXXXxbXFx1MDBBMC1cXHVGRkZGXSlbXFx3LlxcdTAwQTAtXFx1RkZGRl0qJC8sXG5cbiAgLy8gYWRhcHRlZCBmcm9tIGh0dHA6Ly9waHAubmV0L21hbnVhbC9lbi9sYW5ndWFnZS52YXJpYWJsZXMuYmFzaWNzLnBocFxuICBwaHA6IC9bJGEtekEtWl9cXHg3Zi1cXHhmZl1bYS16QS1aMC05X1xceDdmLVxceGZmXSokL1xufTtcblxuZnVuY3Rpb24gcGFyc2VDb21wbGV0aW9ucyhyZXN1bHRzOiBDb21wbGV0ZVJlcGx5LCBwcmVmaXg6IHN0cmluZykge1xuICBjb25zdCB7IG1hdGNoZXMsIGN1cnNvcl9zdGFydCwgY3Vyc29yX2VuZCwgbWV0YWRhdGEgfSA9IHJlc3VsdHM7XG5cbiAgaWYgKG1ldGFkYXRhICYmIG1ldGFkYXRhLl9qdXB5dGVyX3R5cGVzX2V4cGVyaW1lbnRhbCkge1xuICAgIGNvbnN0IGNvbXBzID0gbWV0YWRhdGEuX2p1cHl0ZXJfdHlwZXNfZXhwZXJpbWVudGFsO1xuICAgIGlmIChcbiAgICAgIGNvbXBzLmxlbmd0aCA+IDAgJiZcbiAgICAgIGNvbXBzWzBdLnRleHQgIT0gbnVsbCAmJlxuICAgICAgY29tcHNbMF0uc3RhcnQgIT0gbnVsbCAmJlxuICAgICAgY29tcHNbMF0uZW5kICE9IG51bGxcbiAgICApIHtcbiAgICAgIHJldHVybiBfLm1hcChjb21wcywgbWF0Y2ggPT4gKHtcbiAgICAgICAgdGV4dDogbWF0Y2gudGV4dCxcbiAgICAgICAgcmVwbGFjZW1lbnRQcmVmaXg6IHByZWZpeC5zbGljZShtYXRjaC5zdGFydCwgbWF0Y2guZW5kKSxcbiAgICAgICAgdHlwZTogbWF0Y2gudHlwZSxcbiAgICAgICAgaWNvbkhUTUw6XG4gICAgICAgICAgIW1hdGNoLnR5cGUgfHwgbWF0Y2gudHlwZSA9PT0gXCI8dW5rbm93bj5cIiA/IGljb25IVE1MIDogdW5kZWZpbmVkXG4gICAgICB9KSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcmVwbGFjZW1lbnRQcmVmaXggPSBwcmVmaXguc2xpY2UoY3Vyc29yX3N0YXJ0LCBjdXJzb3JfZW5kKTtcblxuICByZXR1cm4gXy5tYXAobWF0Y2hlcywgbWF0Y2ggPT4gKHtcbiAgICB0ZXh0OiBtYXRjaCxcbiAgICByZXBsYWNlbWVudFByZWZpeCxcbiAgICBpY29uSFRNTFxuICB9KSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICBjb25zdCBhdXRvY29tcGxldGVQcm92aWRlciA9IHtcbiAgICBzZWxlY3RvcjogXCIuc291cmNlXCIsXG4gICAgZGlzYWJsZUZvclNlbGVjdG9yOiBcIi5jb21tZW50LCAuc3RyaW5nXCIsXG5cbiAgICAvLyBgZXhjbHVkZUxvd2VyUHJpb3JpdHk6IGZhbHNlYCB3b24ndCBzdXBwcmVzcyBwcm92aWRlcnMgd2l0aCBsb3dlclxuICAgIC8vIHByaW9yaXR5LlxuICAgIC8vIFRoZSBkZWZhdWx0IHByb3ZpZGVyIGhhcyBhIHByaW9yaXR5IG9mIDAuXG4gICAgaW5jbHVzaW9uUHJpb3JpdHk6IDEsXG4gICAgZXhjbHVkZUxvd2VyUHJpb3JpdHk6IGZhbHNlLFxuXG4gICAgLy8gUmVxdWlyZWQ6IFJldHVybiBhIHByb21pc2UsIGFuIGFycmF5IG9mIHN1Z2dlc3Rpb25zLCBvciBudWxsLlxuICAgIGdldFN1Z2dlc3Rpb25zKHtcbiAgICAgIGVkaXRvcixcbiAgICAgIGJ1ZmZlclBvc2l0aW9uLFxuICAgICAgcHJlZml4XG4gICAgfTogQXV0b2NvbXBsZXRlKTogUHJvbWlzZTxBcnJheTxPYmplY3Q+PiB8IG51bGwge1xuICAgICAgY29uc3Qga2VybmVsID0gc3RvcmUua2VybmVsO1xuXG4gICAgICBpZiAoIWtlcm5lbCB8fCBrZXJuZWwuZXhlY3V0aW9uU3RhdGUgIT09IFwiaWRsZVwiKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBsaW5lID0gZWRpdG9yLmdldFRleHRJbkJ1ZmZlclJhbmdlKFtcbiAgICAgICAgW2J1ZmZlclBvc2l0aW9uLnJvdywgMF0sXG4gICAgICAgIGJ1ZmZlclBvc2l0aW9uXG4gICAgICBdKTtcblxuICAgICAgY29uc3QgcmVnZXggPSByZWdleGVzW2tlcm5lbC5sYW5ndWFnZV07XG4gICAgICBpZiAocmVnZXgpIHtcbiAgICAgICAgcHJlZml4ID0gXy5oZWFkKGxpbmUubWF0Y2gocmVnZXgpKSB8fCBcIlwiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcHJlZml4ID0gbGluZTtcbiAgICAgIH1cblxuICAgICAgLy8gcmV0dXJuIGlmIGN1cnNvciBpcyBhdCB3aGl0ZXNwYWNlXG4gICAgICBpZiAocHJlZml4LnRyaW1SaWdodCgpLmxlbmd0aCA8IHByZWZpeC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGxldCBtaW5pbXVtV29yZExlbmd0aCA9IGF0b20uY29uZmlnLmdldChcbiAgICAgICAgXCJhdXRvY29tcGxldGUtcGx1cy5taW5pbXVtV29yZExlbmd0aFwiXG4gICAgICApO1xuICAgICAgaWYgKHR5cGVvZiBtaW5pbXVtV29yZExlbmd0aCAhPT0gXCJudW1iZXJcIikge1xuICAgICAgICBtaW5pbXVtV29yZExlbmd0aCA9IDM7XG4gICAgICB9XG5cbiAgICAgIGlmIChwcmVmaXgudHJpbSgpLmxlbmd0aCA8IG1pbmltdW1Xb3JkTGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBsb2coXCJhdXRvY29tcGxldGVQcm92aWRlcjogcmVxdWVzdDpcIiwgbGluZSwgYnVmZmVyUG9zaXRpb24sIHByZWZpeCk7XG5cbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+XG4gICAgICAgIGtlcm5lbC5jb21wbGV0ZShwcmVmaXgsIChyZXN1bHRzOiBDb21wbGV0ZVJlcGx5KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUocGFyc2VDb21wbGV0aW9ucyhyZXN1bHRzLCBwcmVmaXgpKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBhdXRvY29tcGxldGVQcm92aWRlcjtcbn1cbiJdfQ==