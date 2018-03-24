var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _atom = require('atom');

'use babel';

CSON = require('season');
fs = require('fs');
path = require('path');

module.exports = (function () {
  function GrammarCompiler() {
    _classCallCheck(this, GrammarCompiler);
  }

  // Loads the basic grammar structure,
  // which includes the grouped parts in the repository,
  // and then loads all grammar subrepositories,
  // and appends them to the main repository,
  // and finally writes {grammar} to {output}

  _createClass(GrammarCompiler, [{
    key: 'compile',
    value: function compile() {
      var input = '../grammars/repositories/markdown.cson';
      var output = '../grammars/language-markdown.json';
      var directories = ['blocks', 'flavors', 'inlines'];
      var inputPath = path.join(__dirname, input);
      var grammar = CSON.readFileSync(inputPath);

      grammar.injections = this.compileInjectionsGrammar();

      for (var i = 0; i < directories.length; i++) {
        var directoryPath = path.join(__dirname, '../grammars/repositories/' + directories[i]);
        var directory = new _atom.Directory(directoryPath);
        var entries = directory.getEntriesSync();
        for (var j = 0; j < entries.length; j++) {
          var entry = entries[j];

          var _CSON$readFileSync = CSON.readFileSync(entry.path);

          var key = _CSON$readFileSync.key;
          var patterns = _CSON$readFileSync.patterns;

          if (key && patterns) {
            grammar.repository[key] = { patterns: patterns };
          }
        }
      }

      grammar.repository['fenced-code-blocks'] = {
        patterns: this.compileFencedCodeGrammar()
      };

      var outputPath = path.join(__dirname, output);
      CSON.writeFileSync(outputPath, grammar, (function () {
        return atom.commands.dispatch('body', 'window:reload');
      })());
    }

    // Reads fixtures from {input},
    // parses {data} to expand shortened syntax,
    // creates and returns patterns from valid items in {data}.
  }, {
    key: 'compileFencedCodeGrammar',
    value: function compileFencedCodeGrammar() {
      var input = '../grammars/fixtures/fenced-code.cson';
      var inputPath = path.join(__dirname, input);
      var data = CSON.readFileSync(inputPath);
      return this.createPatternsFromData(data);
    }

    // Reads fixtures from {input},
    // parses {data} to expand shortened syntax,
    // creates and returns patterns from valid items in {data}.
  }, {
    key: 'compileInjectionsGrammar',
    value: function compileInjectionsGrammar() {
      var directoryPath = path.join(__dirname, '../grammars/injections');
      var directory = new _atom.Directory(directoryPath);
      var entries = directory.getEntriesSync();
      var injections = {};

      for (var j = 0; j < entries.length; j++) {
        var entry = entries[j];

        var _CSON$readFileSync2 = CSON.readFileSync(entry.path);

        var key = _CSON$readFileSync2.key;
        var patterns = _CSON$readFileSync2.patterns;

        if (key && patterns) {
          injections[key] = {
            patterns: patterns
          };
        }
      }

      return injections;
    }

    // Transform an {item} into a {pattern} object,
    // and adds it to the {patterns} array.
  }, {
    key: 'createPatternsFromData',
    value: function createPatternsFromData(data) {
      var patterns = [];
      for (var i = 0; i < data.list.length; i++) {
        var item = this.parseItem(data.list[i]);
        if (item) {
          patterns.push({
            begin: '^\\s*([`~]{3,})\\s*(\\{?)((?:\\.?)(?:' + item.pattern + '))(?=( |$|{))\\s*(\\{?)([^`\\{\\}]*)(\\}?)$',
            beginCaptures: {
              '1': { name: 'punctuation.md' },
              '2': { name: 'punctuation.md' },
              '3': { name: 'language.constant.md' },
              '5': { name: 'punctuation.md' },
              '6': { patterns: [{ include: '#special-attribute-elements' }] },
              '7': { name: 'punctuation.md' }
            },
            end: '^\\s*(\\1)$',
            endCaptures: {
              '1': { name: 'punctuation.md' }
            },
            name: 'fenced.code.md',
            contentName: item.contentName,
            patterns: [{
              include: item.include
            }]
          });
        }
      }
      return patterns;
    }

    // When provided with a valid {item} ({item.pattern} is required),
    // missing {include} and {contentName} are generated.
  }, {
    key: 'parseItem',
    value: function parseItem(item) {
      if (typeof item === 'object' && item.pattern !== null) {
        if (!item.include && !item.contentName) {
          item.include = 'source.' + item.pattern;
          item.contentName = 'source.embedded.' + item.pattern;
        } else if (!item.include) {
          return false;
        }
        return item;
      }
      return false;
    }
  }]);

  return GrammarCompiler;
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvbGFuZ3VhZ2UtbWFya2Rvd24vbGliL0dyYW1tYXJDb21waWxlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O29CQUUwQixNQUFNOztBQUZoQyxXQUFXLENBQUE7O0FBSVgsSUFBSSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUN4QixFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ2xCLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7O0FBRXRCLE1BQU0sQ0FBQyxPQUFPO0FBQ0EsV0FEUyxlQUFlLEdBQ3JCOzBCQURNLGVBQWU7R0FDbkI7Ozs7Ozs7O2VBREksZUFBZTs7V0FRNUIsbUJBQUc7QUFDVCxVQUFNLEtBQUssR0FBRyx3Q0FBd0MsQ0FBQTtBQUN0RCxVQUFNLE1BQU0sR0FBRyxvQ0FBb0MsQ0FBQTtBQUNuRCxVQUFNLFdBQVcsR0FBRyxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7QUFDcEQsVUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDN0MsVUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQTs7QUFFNUMsYUFBTyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTs7QUFFcEQsV0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDM0MsWUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsMkJBQTJCLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDeEYsWUFBTSxTQUFTLEdBQUcsb0JBQWMsYUFBYSxDQUFDLENBQUE7QUFDOUMsWUFBTSxPQUFP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QUNiO0FBQ0QsZUFBTyxJQUFJLENBQUE7T0FDWjtBQUNELGFBQU8sS0FBSyxDQUFBO0tBQ2I7OztTQXRIb0IsZUFBZTtJQXVIckMsQ0FBQSIsImZpbGUiOiIvaG9tZS9rbmllbGJvLy5hdG9tL3BhY2thZ2VzL2xhbmd1YWdlLW1hcmtkb3duL2xpYi9HcmFtbWFyQ29tcGlsZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIGJhYmVsJ1xuXG5pbXBvcnQgeyBEaXJlY3RvcnkgfSBmcm9tICdhdG9tJ1xuXG5DU09OID0gcmVxdWlyZSgnc2Vhc29uJylcbmZzID0gcmVxdWlyZSgnZnMnKVxucGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEdyYW1tYXJDb21waWxlciB7XG4gIGNvbnN0cnVjdG9yICgpIHt9XG5cbiAgLy8gTG9hZHMgdGhlIGJhc2ljIGdyYW1tYXIgc3RydWN0dXJlLFxuICAvLyB3aGljaCBpbmNsdWRlcyB0aGUgZ3JvdXBlZCBwYXJ0cyBpbiB0aGUgcmVwb3NpdG9yeSxcbiAgLy8gYW5kIHRoZW4gbG9hZHMgYWxsIGdyYW1tYXIgc3VicmVwb3NpdG9yaWVzLFxuICAvLyBhbmQgYXBwZW5kcyB0aGVtIHRvIHRoZSBtYWluIHJlcG9zaXRvcnksXG4gIC8vIGFuZCBmaW5hbGx5IHdyaXRlcyB7Z3JhbW1hcn0gdG8ge291dHB1dH1cbiAgY29tcGlsZSAoKSB7XG4gICAgY29uc3QgaW5wdXQgPSAnLi4vZ3JhbW1hcnMvcmVwb3NpdG9yaWVzL21hcmtkb3duLmNzb24nXG4gICAgY29uc3Qgb3V0cHV0ID0gJy4uL2dyYW1tYXJzL2xhbmd1YWdlLW1hcmtkb3duLmpzb24nXG4gICAgY29uc3QgZGlyZWN0b3JpZXMgPSBbJ2Jsb2NrcycsICdmbGF2b3JzJywgJ2lubGluZXMnXVxuICAgIGNvbnN0IGlucHV0UGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsIGlucHV0KVxuICAgIGNvbnN0IGdyYW1tYXIgPSBDU09OLnJlYWRGaWxlU3luYyhpbnB1dFBhdGgpXG5cbiAgICBncmFtbWFyLmluamVjdGlvbnMgPSB0aGlzLmNvbXBpbGVJbmplY3Rpb25zR3JhbW1hcigpXG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRpcmVjdG9yaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBkaXJlY3RvcnlQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2dyYW1tYXJzL3JlcG9zaXRvcmllcy8nICsgZGlyZWN0b3JpZXNbaV0pXG4gICAgICBjb25zdCBkaXJlY3RvcnkgPSBuZXcgRGlyZWN0b3J5KGRpcmVjdG9yeVBhdGgpXG4gICAgICBjb25zdCBlbnRyaWVzID0gZGlyZWN0b3J5LmdldEVudHJpZXNTeW5jKClcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgZW50cmllcy5sZW5ndGg7IGorKykge1xuICAgICAgICBjb25zdCBlbnRyeSA9IGVudHJpZXNbal07XG4gICAgICAgIGNvbnN0IHsga2V5LCBwYXR0ZXJucyB9ID0gQ1NPTi5yZWFkRmlsZVN5bmMoZW50cnkucGF0aClcbiAgICAgICAgaWYgKGtleSAmJiBwYXR0ZXJucykge1xuICAgICAgICAgIGdyYW1tYXIucmVwb3NpdG9yeVtrZXldID0geyBwYXR0ZXJucyB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBncmFtbWFyLnJlcG9zaXRvcnlbJ2ZlbmNlZC1jb2RlLWJsb2NrcyddID0ge1xuICAgICAgcGF0dGVybnM6IHRoaXMuY29tcGlsZUZlbmNlZENvZGVHcmFtbWFyKClcbiAgICB9XG5cbiAgICBjb25zdCBvdXRwdXRQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgb3V0cHV0KVxuICAgIENTT04ud3JpdGVGaWxlU3luYyhvdXRwdXRQYXRoLCBncmFtbWFyLCAoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGF0b20uY29tbWFuZHMuZGlzcGF0Y2goJ2JvZHknLCAnd2luZG93OnJlbG9hZCcpXG4gICAgfSkoKSlcbiAgfVxuXG4gIC8vIFJlYWRzIGZpeHR1cmVzIGZyb20ge2lucHV0fSxcbiAgLy8gcGFyc2VzIHtkYXRhfSB0byBleHBhbmQgc2hvcnRlbmVkIHN5bnRheCxcbiAgLy8gY3JlYXRlcyBhbmQgcmV0dXJucyBwYXR0ZXJucyBmcm9tIHZhbGlkIGl0ZW1zIGluIHtkYXRhfS5cbiAgY29tcGlsZUZlbmNlZENvZGVHcmFtbWFyICgpIHtcbiAgICBjb25zdCBpbnB1dCA9ICcuLi9ncmFtbWFycy9maXh0dXJlcy9mZW5jZWQtY29kZS5jc29uJ1xuICAgIGNvbnN0IGlucHV0UGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsIGlucHV0KVxuICAgIGNvbnN0IGRhdGEgPSBDU09OLnJlYWRGaWxlU3luYyhpbnB1dFBhdGgpXG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlUGF0dGVybnNGcm9tRGF0YShkYXRhKVxuICB9XG5cbiAgLy8gUmVhZHMgZml4dHVyZXMgZnJvbSB7aW5wdXR9LFxuICAvLyBwYXJzZXMge2RhdGF9IHRvIGV4cGFuZCBzaG9ydGVuZWQgc3ludGF4LFxuICAvLyBjcmVhdGVzIGFuZCByZXR1cm5zIHBhdHRlcm5zIGZyb20gdmFsaWQgaXRlbXMgaW4ge2RhdGF9LlxuICBjb21waWxlSW5qZWN0aW9uc0dyYW1tYXIgKCkge1xuICAgIGNvbnN0IGRpcmVjdG9yeVBhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZ3JhbW1hcnMvaW5qZWN0aW9ucycpXG4gICAgY29uc3QgZGlyZWN0b3J5ID0gbmV3IERpcmVjdG9yeShkaXJlY3RvcnlQYXRoKVxuICAgIGNvbnN0IGVudHJpZXMgPSBkaXJlY3RvcnkuZ2V0RW50cmllc1N5bmMoKVxuICAgIGNvbnN0IGluamVjdGlvbnMgPSB7fVxuXG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCBlbnRyaWVzLmxlbmd0aDsgaisrKSB7XG4gICAgICBjb25zdCBlbnRyeSA9IGVudHJpZXNbal07XG4gICAgICBjb25zdCB7IGtleSwgcGF0dGVybnMgfSA9IENTT04ucmVhZEZpbGVTeW5jKGVudHJ5LnBhdGgpXG5cbiAgICAgIGlmIChrZXkgJiYgcGF0dGVybnMpIHtcbiAgICAgICAgaW5qZWN0aW9uc1trZXldID0ge1xuICAgICAgICAgIHBhdHRlcm5zOiBwYXR0ZXJuc1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGluamVjdGlvbnNcbiAgfVxuXG4gIC8vIFRyYW5zZm9ybSBhbiB7aXRlbX0gaW50byBhIHtwYXR0ZXJufSBvYmplY3QsXG4gIC8vIGFuZCBhZGRzIGl0IHRvIHRoZSB7cGF0dGVybnN9IGFycmF5LlxuICBjcmVhdGVQYXR0ZXJuc0Zyb21EYXRhIChkYXRhKSB7XG4gICAgY29uc3QgcGF0dGVybnMgPSBbXVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGF0YS5saXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBpdGVtID0gdGhpcy5wYXJzZUl0ZW0oZGF0YS5saXN0W2ldKVxuICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgcGF0dGVybnMucHVzaCh7XG4gICAgICAgICAgYmVnaW46ICdeXFxcXHMqKFtgfl17Myx9KVxcXFxzKihcXFxcez8pKCg/OlxcXFwuPykoPzonK2l0ZW0ucGF0dGVybisnKSkoPz0oIHwkfHspKVxcXFxzKihcXFxcez8pKFteYFxcXFx7XFxcXH1dKikoXFxcXH0/KSQnLFxuICAgICAgICAgIGJlZ2luQ2FwdHVyZXM6IHtcbiAgICAgICAgICAgICcxJzogeyBuYW1lOiAncHVuY3R1YXRpb24ubWQnIH0sXG4gICAgICAgICAgICAnMic6IHsgbmFtZTogJ3B1bmN0dWF0aW9uLm1kJyB9LFxuICAgICAgICAgICAgJzMnOiB7IG5hbWU6ICdsYW5ndWFnZS5jb25zdGFudC5tZCcgfSxcbiAgICAgICAgICAgICc1JzogeyBuYW1lOiAncHVuY3R1YXRpb24ubWQnIH0sXG4gICAgICAgICAgICAnNic6IHsgcGF0dGVybnM6IFt7IGluY2x1ZGU6ICcjc3BlY2lhbC1hdHRyaWJ1dGUtZWxlbWVudHMnIH1dIH0sXG4gICAgICAgICAgICAnNyc6IHsgbmFtZTogJ3B1bmN0dWF0aW9uLm1kJyB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlbmQ6ICdeXFxcXHMqKFxcXFwxKSQnLFxuICAgICAgICAgIGVuZENhcHR1cmVzOiB7XG4gICAgICAgICAgICAnMSc6IHsgbmFtZTogJ3B1bmN0dWF0aW9uLm1kJyB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBuYW1lOiAnZmVuY2VkLmNvZGUubWQnLFxuICAgICAgICAgIGNvbnRlbnROYW1lOiBpdGVtLmNvbnRlbnROYW1lLFxuICAgICAgICAgIHBhdHRlcm5zOiBbe1xuICAgICAgICAgICAgaW5jbHVkZTogaXRlbS5pbmNsdWRlXG4gICAgICAgICAgfV1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhdHRlcm5zXG4gIH1cblxuICAvLyBXaGVuIHByb3ZpZGVkIHdpdGggYSB2YWxpZCB7aXRlbX0gKHtpdGVtLnBhdHRlcm59IGlzIHJlcXVpcmVkKSxcbiAgLy8gbWlzc2luZyB7aW5jbHVkZX0gYW5kIHtjb250ZW50TmFtZX0gYXJlIGdlbmVyYXRlZC5cbiAgcGFyc2VJdGVtIChpdGVtKSB7XG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JyAmJiBpdGVtLnBhdHRlcm4gIT09IG51bGwpIHtcbiAgICAgIGlmICghaXRlbS5pbmNsdWRlICYmICFpdGVtLmNvbnRlbnROYW1lKSB7XG4gICAgICAgIGl0ZW0uaW5jbHVkZSA9ICdzb3VyY2UuJyArIGl0ZW0ucGF0dGVyblxuICAgICAgICBpdGVtLmNvbnRlbnROYW1lID0gJ3NvdXJjZS5lbWJlZGRlZC4nICsgaXRlbS5wYXR0ZXJuXG4gICAgICB9IGVsc2UgaWYgKCFpdGVtLmluY2x1ZGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgICByZXR1cm4gaXRlbVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuIl19