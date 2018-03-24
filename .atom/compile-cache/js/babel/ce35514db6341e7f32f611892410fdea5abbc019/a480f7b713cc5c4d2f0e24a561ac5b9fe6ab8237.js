function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, 'next'); var callThrow = step.bind(null, 'throw'); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

/** @babel */
var fs = undefined;
var fallback = undefined;
var less = undefined;
var mdpdf = undefined;
var os = undefined;
var path = undefined;
var tmp = undefined;
var util = undefined;

function loadDeps() {
  fs = require('fs');
  fallback = require('./fallback');
  less = require('less');
  mdpdf = require('mdpdf');
  os = require('os');
  path = require('path');
  tmp = require('tmp');
  util = require('./util');
}

module.exports = {
  config: {
    'format': {
      'title': 'Page Format',
      'type': 'string',
      'default': 'A4',
      'enum': ['A3', 'A4', 'A5', 'Legal', 'Letter', 'Tabloid']
    },
    'border': {
      'title': 'Border Size',
      'type': 'string',
      'default': '20mm'
    },
    'emoji': {
      'title': 'Enable Emojis',
      'description': 'Convert :tagname: style tags to Emojis',
      'type': 'boolean',
      'default': true
    },
    'forceFallback': {
      'title': 'Force Fallback Mode',
      'description': 'Legacy code. Not all config options supported.',
      'type': 'boolean',
      'default': false
    }
  },

  activate: function activate() {
    loadDeps();
    atom.commands.add('atom-workspace', 'markdown-pdf:convert', this.convert);
  },

  convert: _asyncToGenerator(function* () {
    try {
      var conf = atom.config.get('markdown-pdf');
      if (conf.forceFallback) {
        throw new Error('Forcing fallback mode');
      }
      var activeEditor = atom.workspace.getActiveTextEditor();
      var inPath = activeEditor.getPath();
      var outPath = util.getOutputPath(inPath);
      var debugPath = path.join(os.tmpdir(), 'debug.html');
      var options = {
        debug: debugPath,
        source: inPath,
        destination: outPath,
        ghStyle: true,
        defaultStyle: true,
        noEmoji: !conf.emoji,
        pdf: {
          format: conf.format,
          quality: 100,
          header: {
            height: null
          },
          footer: {
            height: null
          },
          border: {
            top: conf.border,
            left: conf.border,
            bottom: conf.border,
            right: conf.border
          }
        }
      };
      var sheetPath = atom.styles.getUserStyleSheetPath();
      var pathObj = path.parse(sheetPath);
      if (pathObj.ext === '.less') {
        var lessData = fs.readFileSync(sheetPath, 'utf8');
        sheetPath = tmp.tmpNameSync();
        var rendered = yield less.render(lessData);
        fs.writeFileSync(sheetPath, rendered.css, 'utf8');
      }
      options.styles = sheetPath;
      atom.notifications.addInfo('Converting to PDF...', { icon: 'markdown' });
      yield mdpdf.convert(options);
      atom.notifications.addSuccess('Converted successfully.', { detail: 'Output in ' + outPath, icon: 'file-pdf' });
    } catch (err) {
      try {
        console.log(err.stack);
        atom.notifications.addWarning('Attempting conversion with fallback');
        fallback.convert();
      } catch (err) {
        var _ret = (function () {
          var remote = require('remote');
          atom.notifications.addError('Markdown-pdf: Error. Check console for more information.', {
            buttons: [{
              className: 'md-pdf-err',
              onDidClick: function onDidClick() {
                return remote.getCurrentWindow().openDevTools();
              },
              text: 'Open console'
            }]
          });
          console.log(err.stack);
          return {
            v: undefined
          };
        })();

        if (typeof _ret === 'object') return _ret.v;
      }
    }
  })
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvbWFya2Rvd24tcGRmL2xpYi9tYXJrZG93bi1wZGYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsSUFBSSxFQUFFLFlBQUEsQ0FBQztBQUNQLElBQUksUUFBUSxZQUFBLENBQUM7QUFDYixJQUFJLElBQUksWUFBQSxDQUFDO0FBQ1QsSUFBSSxLQUFLLFlBQUEsQ0FBQztBQUNWLElBQUksRUFBRSxZQUFBLENBQUM7QUFDUCxJQUFJLElBQUksWUFBQSxDQUFDO0FBQ1QsSUFBSSxHQUFHLFlBQUEsQ0FBQztBQUNSLElBQUksSUFBSSxZQUFBLENBQUM7O0FBRVQsU0FBUyxRQUFRLEdBQUc7QUFDbEIsSUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNuQixVQUFRLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ2pDLE1BQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdkIsT0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN6QixJQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ25CLE1BQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdkIsS0FBRyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNyQixNQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0NBQzFCOztBQUVELE1BQU0sQ0FBQyxPQUFPLEdBQUc7QUFDZixRQUFNLEVBQUU7QUFDTixZQUFRLEVBQUU7QUFDUixhQUFPLEVBQUUsYUFBYTtBQUN0QixZQUFNLEVBQUUsUUFBUTtBQUNoQixlQUFTLEVBQUUsSUFBSTtBQUNmLFlBQU0sRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDO0tBQ3pEO0FBQ0QsWUFBUSxFQUFFO0FBQ1IsYUFBTyxF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LEVBQUUsVUFBVSxFQUFDLENBQUMsQ0FBQztBQUN2RSxZQUFNLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0IsVUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQzNCLHlCQUF5QixFQUN6QixFQUFFLE1BQU0sRUFBRSxZQUFZLEdBQUcsT0FBTyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FDckQsQ0FBQztLQUNILENBQUMsT0FBTSxHQUFHLEVBQUU7QUFDWCxVQUFJO0FBQ0YsZUFBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDdkIsWUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMscUNBQXFDLENBQUMsQ0FBQztBQUNyRSxnQkFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO09BQ3BCLENBQUMsT0FBTSxHQUFHLEVBQUU7O0FBQ1gsY0FBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLGNBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUN6QiwwREFBMEQsRUFDMUQ7QUFDRSxtQkFBTyxFQUFFLENBQUM7QUFDUix1QkFBUyxFQUFFLFlBQVk7QUFDdkIsd0JBQVUsRUFBRTt1QkFBTSxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxZQUFZLEVBQUU7ZUFBQTtBQUMxRCxrQkFBSSxFQUFFLGNBQWM7YUFDckIsQ0FBQztXQUNILENBQ0YsQ0FBQTtBQUNELGlCQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN2Qjs7WUFBTzs7OztPQUNSO0tBQ0Y7R0FDRixDQUFBO0NBQ0YsQ0FBQSIsImZpbGUiOiIvaG9tZS9rbmllbGJvLy5hdG9tL3BhY2thZ2VzL21hcmtkb3duLXBkZi9saWIvbWFya2Rvd24tcGRmLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqIEBiYWJlbCAqL1xubGV0IGZzO1xubGV0IGZhbGxiYWNrO1xubGV0IGxlc3M7XG5sZXQgbWRwZGY7XG5sZXQgb3M7XG5sZXQgcGF0aDtcbmxldCB0bXA7XG5sZXQgdXRpbDtcblxuZnVuY3Rpb24gbG9hZERlcHMoKSB7XG4gIGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgZmFsbGJhY2sgPSByZXF1aXJlKCcuL2ZhbGxiYWNrJyk7XG4gIGxlc3MgPSByZXF1aXJlKCdsZXNzJyk7XG4gIG1kcGRmID0gcmVxdWlyZSgnbWRwZGYnKTtcbiAgb3MgPSByZXF1aXJlKCdvcycpO1xuICBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuICB0bXAgPSByZXF1aXJlKCd0bXAnKTtcbiAgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29uZmlnOiB7XG4gICAgJ2Zvcm1hdCc6IHtcbiAgICAgICd0aXRsZSc6ICdQYWdlIEZvcm1hdCcsXG4gICAgICAndHlwZSc6ICdzdHJpbmcnLFxuICAgICAgJ2RlZmF1bHQnOiAnQTQnLFxuICAgICAgJ2VudW0nOiBbJ0EzJywgJ0E0JywgJ0E1JywgJ0xlZ2FsJywgJ0xldHRlcicsICdUYWJsb2lkJ11cbiAgICB9LFxuICAgICdib3JkZXInOiB7XG4gICAgICAndGl0bGUnOiAnQm9yZGVyIFNpemUnLFxuICAgICAgJ3R5cGUnOiAnc3RyaW5nJyxcbiAgICAgICdkZWZhdWx0JzogJzIwbW0nXG4gICAgfSxcbiAgICAnZW1vamknOiB7XG4gICAgICAndGl0bGUnOiAnRW5hYmxlIEVtb2ppcycsXG4gICAgICAnZGVzY3JpcHRpb24nOiAnQ29udmVydCA6dGFnbmFtZTogc3R5bGUgdGFncyB0byBFbW9qaXMnLFxuICAgICAgJ3R5cGUnOiAnYm9vbGVhbicsXG4gICAgICAnZGVmYXVsdCc6IHRydWVcbiAgICB9LFxuICAgICdmb3JjZUZhbGxiYWNrJzoge1xuICAgICAgJ3RpdGxlJzogJ0ZvcmNlIEZhbGxiYWNrIE1vZGUnLFxuICAgICAgJ2Rlc2NyaXB0aW9uJzogJ0xlZ2FjeSBjb2RlLiBOb3QgYWxsIGNvbmZpZyBvcHRpb25zIHN1cHBvcnRlZC4nLFxuICAgICAgJ3R5cGUnOiAnYm9vbGVhbicsXG4gICAgICAnZGVmYXVsdCc6IGZhbHNlXG4gICAgfVxuICB9LFxuXG4gIGFjdGl2YXRlOiBmdW5jdGlvbigpIHtcbiAgICBsb2FkRGVwcygpO1xuICAgIGF0b20uY29tbWFuZHMuYWRkKCdhdG9tLXdvcmtzcGFjZScsICdtYXJrZG93bi1wZGY6Y29udmVydCcsIHRoaXMuY29udmVydCk7XG4gIH0sXG5cbiAgY29udmVydDogYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgdHJ5e1xuICAgICAgY29uc3QgY29uZiA9IGF0b20uY29uZmlnLmdldCgnbWFya2Rvd24tcGRmJyk7XG4gICAgICBpZihjb25mLmZvcmNlRmFsbGJhY2spIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3JjaW5nIGZhbGxiYWNrIG1vZGUnKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGFjdGl2ZUVkaXRvciA9IGF0b20ud29ya3NwYWNlLmdldEFjdGl2ZVRleHRFZGl0b3IoKTtcbiAgICAgIGNvbnN0IGluUGF0aCA9IGFjdGl2ZUVkaXRvci5nZXRQYXRoKCk7XG4gICAgICBjb25zdCBvdXRQYXRoID0gdXRpbC5nZXRPdXRwdXRQYXRoKGluUGF0aCk7XG4gICAgICBjb25zdCBkZWJ1Z1BhdGggPSBwYXRoLmpvaW4ob3MudG1wZGlyKCksICdkZWJ1Zy5odG1sJyk7XG4gICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICBkZWJ1ZzogZGVidWdQYXRoLFxuICAgICAgICBzb3VyY2U6IGluUGF0aCxcbiAgICAgICAgZGVzdGluYXRpb246IG91dFBhdGgsXG4gICAgICAgIGdoU3R5bGU6IHRydWUsXG4gICAgICAgIGRlZmF1bHRTdHlsZTogdHJ1ZSxcbiAgICAgICAgbm9FbW9qaTogIWNvbmYuZW1vamksXG4gICAgICAgIHBkZjoge1xuICAgICAgICAgIGZvcm1hdDogY29uZi5mb3JtYXQsXG4gICAgICAgICAgcXVhbGl0eTogMTAwLFxuICAgICAgICAgIGhlYWRlcjoge1xuICAgICAgICAgICAgaGVpZ2h0OiBudWxsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBmb290ZXI6IHtcbiAgICAgICAgICAgIGhlaWdodDogbnVsbFxuICAgICAgICAgIH0sXG4gICAgICAgICAgYm9yZGVyOiB7XG4gICAgICAgICAgICB0b3A6IGNvbmYuYm9yZGVyLFxuICAgICAgICAgICAgbGVmdDogY29uZi5ib3JkZXIsXG4gICAgICAgICAgICBib3R0b206IGNvbmYuYm9yZGVyLFxuICAgICAgICAgICAgcmlnaHQ6IGNvbmYuYm9yZGVyXG4gICAgICAgICAgfSxcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGxldCBzaGVldFBhdGggPSBhdG9tLnN0eWxlcy5nZXRVc2VyU3R5bGVTaGVldFBhdGgoKTtcbiAgICAgIGNvbnN0IHBhdGhPYmogPSBwYXRoLnBhcnNlKHNoZWV0UGF0aCk7XG4gICAgICBpZihwYXRoT2JqLmV4dCA9PT0gJy5sZXNzJykge1xuICAgICAgICBjb25zdCBsZXNzRGF0YSA9IGZzLnJlYWRGaWxlU3luYyhzaGVldFBhdGgsICd1dGY4Jyk7XG4gICAgICAgIHNoZWV0UGF0aCA9IHRtcC50bXBOYW1lU3luYygpO1xuICAgICAgICBjb25zdCByZW5kZXJlZCA9IGF3YWl0IGxlc3MucmVuZGVyKGxlc3NEYXRhKTtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhzaGVldFBhdGgsIHJlbmRlcmVkLmNzcywgJ3V0ZjgnKTtcbiAgICAgIH1cbiAgICAgIG9wdGlvbnMuc3R5bGVzID0gc2hlZXRQYXRoO1xuICAgICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZEluZm8oJ0NvbnZlcnRpbmcgdG8gUERGLi4uJywge2ljb246ICdtYXJrZG93bid9KTtcbiAgICAgIGF3YWl0IG1kcGRmLmNvbnZlcnQob3B0aW9ucyk7XG4gICAgICBhdG9tLm5vdGlmaWNhdGlvbnMuYWRkU3VjY2VzcyhcbiAgICAgICAgJ0NvbnZlcnRlZCBzdWNjZXNzZnVsbHkuJyxcbiAgICAgICAgeyBkZXRhaWw6ICdPdXRwdXQgaW4gJyArIG91dFBhdGgsIGljb246ICdmaWxlLXBkZicgfVxuICAgICAgKTtcbiAgICB9IGNhdGNoKGVycikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc29sZS5sb2coZXJyLnN0YWNrKTtcbiAgICAgICAgYXRvbS5ub3RpZmljYXRpb25zLmFkZFdhcm5pbmcoJ0F0dGVtcHRpbmcgY29udmVyc2lvbiB3aXRoIGZhbGxiYWNrJyk7XG4gICAgICAgIGZhbGxiYWNrLmNvbnZlcnQoKTtcbiAgICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICAgIGNvbnN0IHJlbW90ZSA9IHJlcXVpcmUoJ3JlbW90ZScpO1xuICAgICAgICBhdG9tLm5vdGlmaWNhdGlvbnMuYWRkRXJyb3IoXG4gICAgICAgICAgJ01hcmtkb3duLXBkZjogRXJyb3IuIENoZWNrIGNvbnNvbGUgZm9yIG1vcmUgaW5mb3JtYXRpb24uJyxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBidXR0b25zOiBbe1xuICAgICAgICAgICAgICBjbGFzc05hbWU6ICdtZC1wZGYtZXJyJyxcbiAgICAgICAgICAgICAgb25EaWRDbGljazogKCkgPT4gcmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKS5vcGVuRGV2VG9vbHMoKSxcbiAgICAgICAgICAgICAgdGV4dDogJ09wZW4gY29uc29sZScsXG4gICAgICAgICAgICB9XVxuICAgICAgICAgIH1cbiAgICAgICAgKVxuICAgICAgICBjb25zb2xlLmxvZyhlcnIuc3RhY2spO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iXX0=