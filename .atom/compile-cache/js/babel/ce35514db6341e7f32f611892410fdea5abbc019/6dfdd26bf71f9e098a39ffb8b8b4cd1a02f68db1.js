var _atom = require('atom');

// import { isListItem, wrapText } from './functions'

'use babel';

CSON = require('season');
fs = require('fs');
GrammarCompiler = require('./GrammarCompiler');
path = require('path');

module.exports = {
  config: {
    addListItems: {
      title: 'Add new list-items',
      description: 'Automatically add a new list-item after the current (non-empty) one when pressing <kbd>ENTER</kbd>',
      type: 'boolean',
      'default': true
    },

    disableLanguageGfm: {
      title: 'Disable language-gfm',
      description: 'Disable the default `language-gfm` package as this package is intended as its replacement',
      type: 'boolean',
      'default': true
    },

    emphasisShortcuts: {
      title: 'Emphasis shortcuts',
      description: 'Enables keybindings `_` for emphasis, `*` for strong emphasis, and `~` for strike-through on selected text; emphasizing an already emphasized selection will de-emphasize it',
      type: 'boolean',
      'default': true
    },

    indentListItems: {
      title: 'Indent list-items',
      description: 'Automatically in- and outdent list-items by pressing `TAB` and `SHIFT+TAB`',
      type: 'boolean',
      'default': true
    },

    linkShortcuts: {
      title: 'Link shortcuts',
      description: 'Enables keybindings `@` for converting the selected text to a link and `!` for converting the selected text to an image',
      type: 'boolean',
      'default': true
    },

    removeEmptyListItems: {
      title: 'Remove empty list-items',
      description: 'Remove the automatically created empty list-items when left empty, leaving an empty line',
      type: 'boolean',
      'default': true
    }
  },

  subscriptions: null,

  activate: function activate(state) {
    var _this = this;

    this.subscriptions = new _atom.CompositeDisposable();
    this.addCommands();

    /*
    Unless you are an advanced user, there is no need to have both this package
    and the one it replaces (language-gfm) enabled.
     If you are an advanced user, you can easily re-enable language-gfm again.
    */
    if (atom.config.get('language-markdown.disableLanguageGfm')) {
      if (!atom.packages.isPackageDisabled('language-gfm')) {
        atom.packages.disablePackage('language-gfm');
      }
    }

    /*
    I forgot why this action is created inline in activate() and not as a
    separate method, but there was a good reason for it.
    */
    this.subscriptions.add(atom.workspace.observeTextEditors(function (editor) {
      editor.onDidInsertText(function (event) {
        var grammar = editor.getGrammar();

        if (grammar.name !== 'Markdown') return;
        if (!atom.config.get('language-markdown.addListItems')) return;
        if (event.text !== '\n') return;

        /*
        At this point, it is rather tedious (as far as I know) to get to the
        tokenized version of {previousLine}. That is the reason why {tokens} a
        little further down is tokenized. But at this stage, we do need to know
        if {previousLine} was in fact Markdown, or from a different perspective,
        not a piece of embedded code. The reason for that is that the tokenized
        line below is tokenized without any context, so is Markdown by default.
        Therefore we determine if our current position is part of embedded code
        or not.
        */

        var previousRowNumber = event.range.start.row;
        var previousRowRange = editor.buffer.rangeForRow(previousRowNumber);
        if (_this.isEmbeddedCode(editor, previousRowRange)) return;

        var previousLine = editor.getTextInRange(previousRowRange);

        var _grammar$tokenizeLine = grammar.tokenizeLine(previousLine);

        var tokens = _grammar$tokenizeLine.tokens;

        tokens.reverse();
        for (var token of tokens) {
          var isPunctuation = false;
          var isListItem = false;
          var typeOfList = undefined;

          var scopes = token.scopes.reverse();
          for (var scope of scopes) {
            var classes = scope.split('.');

            /*
            A list-item is valid when a punctuation class is immediately
            followed by a non-empty list-item class.
            */
            if (classes.includes('punctuation')) {
              isPunctuation = true;
            } else if (isPunctuation && classes.includes('list')) {
              if (!classes.includes('empty')) {
                isListItem = true;
                typeOfList = 'unordered';
                if (classes.includes('ordered')) {
                  typeOfList = 'ordered';
                }
                if (classes.includes('definition')) {
                  typeOfList = 'definition';
                }
                break;
              } else {
                isListItem = false;
                isPunctuation = false;
                if (atom.config.get('language-markdown.removeEmptyListItems')) {
                  editor.setTextInBufferRange(previousRowRange, '');
                }
              }
            } else {
              isPunctuation = false;
            }
          }

          if (isListItem && typeOfList !== 'definition') {
            var text = token.value;
            if (typeOfList === 'ordered') {
              var _length = text.length;
              var punctuation = text.match(/[^\d]+/);
              var value = parseInt(text) + 1;
              text = value + punctuation;
              if (text.length < _length) {
                for (var j = 0; j < text.length - _length + 1; j++) {
                  text = '0' + text;
                }
              }
            } else {
              text = text.replace('x', ' ');
            }
            editor.insertText(text + '');
            break;
          }
        }
      });
    }));
  },

  addCommands: function addCommands() {
    var _this2 = this;

    this.subscriptions.add(atom.commands.add('atom-text-editor', 'markdown:indent-list-item', function (event) {
      return _this2.indentListItem(event);
    }));
    this.subscriptions.add(atom.commands.add('atom-text-editor', 'markdown:outdent-list-item', function (event) {
      return _this2.outdentListItem(event);
    }));
    this.subscriptions.add(atom.commands.add('atom-text-editor', 'markdown:emphasis', function (event) {
      return _this2.emphasizeSelection(event, '_');
    }));
    this.subscriptions.add(atom.commands.add('atom-text-editor', 'markdown:strong-emphasis', function (event) {
      return _this2.emphasizeSelection(event, '**');
    }));
    this.subscriptions.add(atom.commands.add('atom-text-editor', 'markdown:strike-through', function (event) {
      return _this2.emphasizeSelection(event, '~~');
    }));
    this.subscriptions.add(atom.commands.add('atom-text-editor', 'markdown:link', function (event) {
      return _this2.linkSelection(event);
    }));
    this.subscriptions.add(atom.commands.add('atom-text-editor', 'markdown:image', function (event) {
      return _this2.linkSelection(event, true);
    }));
    this.subscriptions.add(atom.commands.add('atom-text-editor', 'markdown:toggle-task', function (event) {
      return _this2.toggleTask(event);
    }));

    if (atom.inDevMode()) {
      this.subscriptions.add(atom.commands.add('atom-workspace', 'markdown:compile-grammar-and-reload', function () {
        return _this2.compileGrammar();
      }));
    }
  },

  indentListItem: function indentListItem(event) {
    var _getEditorAndPosition2 = this._getEditorAndPosition(event);

    var editor = _getEditorAndPosition2.editor;
    var position = _getEditorAndPosition2.position;

    var indentListItems = atom.config.get('language-markdown.indentListItems');
    if (indentListItems && this.isListItem(editor, position)) {
      editor.indentSelectedRows(position.row);
      return;
    }
    event.abortKeyBinding();
  },

  outdentListItem: function outdentListItem(event) {
    var _getEditorAndPosition3 = this._getEditorAndPosition(event);

    var editor = _getEditorAndPosition3.editor;
    var position = _getEditorAndPosition3.position;

    var indentListItems = atom.config.get('language-markdown.indentListItems');
    if (indentListItems && this.isListItem(editor, position)) {
      editor.outdentSelectedRows(position.row);
      return;
    }
    event.abortKeyBinding();
  },

  emphasizeSelection: function emphasizeSelection(event, token) {
    var didSomeWrapping = false;
    if (atom.config.get('language-markdown.emphasisShortcuts')) {
      var editor = atom.workspace.getActiveTextEditor();
      if (!editor) return;

      var ranges = this.getSelectedBufferRangesReversed(editor);
      for (var range of ranges) {
        var text = editor.getTextInBufferRange(range);
        /*
        Skip texts that contain a line-break, or are empty.
        Multi-line emphasis is not supported 'anyway'.
         If afterwards not a single selection has been wrapped, cancel the event
        and insert the character as normal.
         If two cursors were found, but only one of them was a selection, and the
        other a normal cursor, then the normal cursor is ignored, and the single
        selection will be wrapped.
        */
        if (text.length !== 0 && text.indexOf('\n') === -1) {
          var wrappedText = this.wrapText(text, token);
          editor.setTextInBufferRange(range, wrappedText);
          didSomeWrapping = true;
        }
      }
    }
    if (!didSomeWrapping) {
      event.abortKeyBinding();
    }
    return;
  },

  // TODO: Doesn't place the cursor at the right position afterwards
  linkSelection: function linkSelection(event) {
    var isImage = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    var didSomeWrapping = false;

    if (!atom.config.get('language-markdown.linkShortcuts')) {
      event.abortKeyBinding();
      return;
    }

    var editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    var ranges = this.getSelectedBufferRangesReversed(editor);
    var cursorOffsets = [];
    for (var range of ranges) {
      var text = editor.getTextInBufferRange(range);
      // See {emphasizeSelection}
      if (text.length !== 0 && text.indexOf('\n') === -1) {
        var imageToken = isImage ? '!' : '';
        if (text.match(/[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/)) {
          var newText = imageToken + '[](' + text + ')';
          editor.setTextInBufferRange(range, newText);
          cursorOffsets.push(text.length + 3);
        } else {
          var newText = imageToken + '[' + text + ']()';
          editor.setTextInBufferRange(range, newText);
          cursorOffsets.push(1);
        }
        didSomeWrapping = true;
      }
    }

    if (didSomeWrapping) {
      /*
      Cursors aren't separate entities, but rather simple {Point}s, ie,
      positions in the buffer. There is no way of updating a cursor. Instead,
      we clear all cursors, and then re-create them from where our current
      selections are.
       After the image/link wrapping above, the cursor are positioned after the
      selections, and the desired relative locations for the new cursors are
      stored in {cursorOffsets}. We only need to loop through the current
      selections, and create a new cursor for every selection.
       A selection without a length is a simple cursor that can be re-created at
      that exact location.
       TODO: maybe one of those fancy generators can be used for our
      cursorOffsets?
      */
      var selections = editor.getSelectedBufferRanges();
      var count = 0;
      var offsetCount = 0;
      for (var selection of selections) {
        var start = selection.start;
        var end = selection.end;

        if (start.row === end.row && start.column === end.column) {
          if (count) {
            editor.addCursorAtBufferPosition(start);
          } else {
            editor.setCursorBufferPosition(start);
          }
        } else {
          var position = {
            row: end.row,
            column: end.column - cursorOffsets[offsetCount]
          };
          if (count) {
            editor.addCursorAtBufferPosition(position);
          } else {
            editor.setCursorBufferPosition(position);
          }
          offsetCount++;
        }
        count++;
      }
    } else {
      event.abortKeyBinding();
    }

    return;
  },

  _getEditorAndPosition: function _getEditorAndPosition(event) {
    var editor = atom.workspace.getActiveTextEditor();
    if (editor) {
      var positions = editor.getCursorBufferPositions();
      if (positions) {
        var position = positions[0];
        return { editor: editor, position: position };
      }
    }
    event.abortKeyBinding();
  },

  toggleTask: function toggleTask(event) {
    var editor = atom.workspace.getActiveTextEditor();
    if (!editor) {
      event.abortKeyBinding();
      return;
    }

    var ranges = editor.getSelectedBufferRanges();
    for (var range of ranges) {
      var start = range.start;
      var end = range.end;

      for (var row = start.row; row <= end.row; row++) {
        var listItem = this.isListItem(editor, [row, 0]);
        if (listItem && listItem.includes('task')) {
          var currentLine = editor.lineTextForBufferRow(row);
          var newLine = undefined;
          if (listItem.includes('completed')) {
            newLine = currentLine.replace(/ \[(x|X)\] /, ' [ ] ');
          } else {
            newLine = currentLine.replace(' [ ] ', ' [x] ');
          }
          var newRange = [[row, 0], [row, newLine.length]];
          editor.setTextInBufferRange(newRange, newLine);
        }
      }
    }
    return;
  },

  isListItem: function isListItem(editor, position) {
    if (editor) {
      if (editor.getGrammar().name === 'Markdown') {
        var scopeDescriptor = editor.scopeDescriptorForBufferPosition(position);
        for (var scope of scopeDescriptor.scopes) {
          if (scope.includes('list')) {
            /*
            Return {scope}, which evaluates as {true} and can be used by other
            functions to determine the type of list-item
            */
            return scope;
          }
        }
      }
    }
    return false;
  },

  wrapText: function wrapText(text, token) {
    var length = token.length;
    if (text.substr(0, length) === token && text.substr(-length) === token) {
      return text.substr(length, text.length - length * 2);
    } else {
      return token + text + token;
    }
  },

  isEmbeddedCode: function isEmbeddedCode(editor, range) {
    var scopeDescriptor = editor.scopeDescriptorForBufferPosition(range.end);
    for (var scope of scopeDescriptor.scopes) {
      if (scope.includes('source')) return true;
    }
    return false;
  },

  /*
  Selection are returned in the reverse order that they were created by the
  user. We need them in the reverse order that they appear in the document,
  because we don't need a previous changes selection changing the buffer
  position of our selections.
  */
  getSelectedBufferRangesReversed: function getSelectedBufferRangesReversed(editor) {
    var ranges = editor.getSelectedBufferRanges();
    ranges.sort(function (a, b) {
      if (a.start.row > b.start.row) return -1;
      if (b.start.row > a.start.row) return 1;
      if (a.start.column > b.start.column) return -1;
      return 1;
    });
    return ranges;
  },

  compileGrammar: function compileGrammar() {
    if (atom.inDevMode()) {
      var compiler = new GrammarCompiler();
      compiler.compile();
    }
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvbGFuZ3VhZ2UtbWFya2Rvd24vbGliL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Im9CQUUrQyxNQUFNOzs7O0FBRnJELFdBQVcsQ0FBQTs7QUFLWCxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0FBQ3hCLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDbEIsZUFBZSxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0FBQzlDLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7O0FBRXRCLE1BQU0sQ0FBQyxPQUFPLEdBQUc7QUFDZixRQUFNLEVBQUU7QUFDTixnQkFBWSxFQUFFO0FBQ1osV0FBSyxFQUFFLG9CQUFvQjtBQUMzQixpQkFBVyxFQUFFLG9HQUFvRztBQUNqSCxVQUFJLEVBQUUsU0FBUztBQUNmLGlCQUFTLElBQUk7S0FDZDs7QUFFRCxzQkFBa0IsRUFBRTtBQUNsQixXQUFLLEVBQUUsc0JBQXNCO0FBQzdCLGlCQUFXLEVBQUUsMkZBQTJGO0FBQ3hHLFVBQUksRUFBRSxTQUFTO0FBQ2YsaUJBQVMsSUFBSTtLQUNkOztBQUVELHFCQUFpQixFQUFFO0FBQ2pCLFdBQUssRUFBRSxvQkFBb0I7QUFDM0IsaUJBQVcsRUFBRSw4S0FBOEs7QUFDM0wsVUFBSSxFQUFFLFNBQVM7QUFDZixpQkFBUyxJQUFJO0tBQ2Q7O0FBRUQsbUJBQWUsRUFBRTtBQUNmLFdBQUssRUFBRSxtQkFBbUI7QUFDMUIsaUJBQVcsRUFBRSw0RUFBNEU7QUFDekYsVUFBSSxFQUFFLFNBQVM7QUFDZixpQkFBUyxJQUFJO0tBQ2Q7O0FBRUQsaUJBQWEsRUFBRTtBQUNiLFdBQUssRUFBRSxnQkFBZ0I7QUFDdkIsaUJBQVcsRUFBRSx5SEFBeUg7QUFDdEksVUFBSSxFQUFFLFNBQVM7QUFDZixpQkFBUyxJQUFJO0tBQ2Q7O0FBRUQsd0JBQW9CLEVBQUU7QUFDcEIs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SyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO0FBQ3hDLFVBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFDdkMsVUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO0FBQzlDLGFBQU8sQ0FBQyxDQUFBO0tBQ1QsQ0FBQyxDQUFBO0FBQ0YsV0FBTyxNQUFNLENBQUE7R0FDZDs7QUFFRCxnQkFBYyxFQUFDLDBCQUFHO0FBQ2hCLFFBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFO0FBQ3BCLFVBQU0sUUFBUSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7QUFDdEMsY0FBUSxDQUFDLE9BQU8sRUFBRSxDQUFBO0tBQ25CO0dBQ0Y7Q0FDRixDQUFBIiwiZmlsZSI6Ii9ob21lL2tuaWVsYm8vLmF0b20vcGFja2FnZXMvbGFuZ3VhZ2UtbWFya2Rvd24vbGliL21haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIGJhYmVsJ1xuXG5pbXBvcnQgeyBDb21wb3NpdGVEaXNwb3NhYmxlLCBEaXJlY3RvcnkgfSBmcm9tICdhdG9tJ1xuLy8gaW1wb3J0IHsgaXNMaXN0SXRlbSwgd3JhcFRleHQgfSBmcm9tICcuL2Z1bmN0aW9ucydcblxuQ1NPTiA9IHJlcXVpcmUoJ3NlYXNvbicpXG5mcyA9IHJlcXVpcmUoJ2ZzJylcbkdyYW1tYXJDb21waWxlciA9IHJlcXVpcmUoJy4vR3JhbW1hckNvbXBpbGVyJylcbnBhdGggPSByZXF1aXJlKCdwYXRoJylcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNvbmZpZzoge1xuICAgIGFkZExpc3RJdGVtczoge1xuICAgICAgdGl0bGU6ICdBZGQgbmV3IGxpc3QtaXRlbXMnLFxuICAgICAgZGVzY3JpcHRpb246ICdBdXRvbWF0aWNhbGx5IGFkZCBhIG5ldyBsaXN0LWl0ZW0gYWZ0ZXIgdGhlIGN1cnJlbnQgKG5vbi1lbXB0eSkgb25lIHdoZW4gcHJlc3NpbmcgPGtiZD5FTlRFUjwva2JkPicsXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlXG4gICAgfSxcblxuICAgIGRpc2FibGVMYW5ndWFnZUdmbToge1xuICAgICAgdGl0bGU6ICdEaXNhYmxlIGxhbmd1YWdlLWdmbScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Rpc2FibGUgdGhlIGRlZmF1bHQgYGxhbmd1YWdlLWdmbWAgcGFja2FnZSBhcyB0aGlzIHBhY2thZ2UgaXMgaW50ZW5kZWQgYXMgaXRzIHJlcGxhY2VtZW50JyxcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICB9LFxuXG4gICAgZW1waGFzaXNTaG9ydGN1dHM6IHtcbiAgICAgIHRpdGxlOiAnRW1waGFzaXMgc2hvcnRjdXRzJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRW5hYmxlcyBrZXliaW5kaW5ncyBgX2AgZm9yIGVtcGhhc2lzLCBgKmAgZm9yIHN0cm9uZyBlbXBoYXNpcywgYW5kIGB+YCBmb3Igc3RyaWtlLXRocm91Z2ggb24gc2VsZWN0ZWQgdGV4dDsgZW1waGFzaXppbmcgYW4gYWxyZWFkeSBlbXBoYXNpemVkIHNlbGVjdGlvbiB3aWxsIGRlLWVtcGhhc2l6ZSBpdCcsXG4gICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICBkZWZhdWx0OiB0cnVlXG4gICAgfSxcblxuICAgIGluZGVudExpc3RJdGVtczoge1xuICAgICAgdGl0bGU6ICdJbmRlbnQgbGlzdC1pdGVtcycsXG4gICAgICBkZXNjcmlwdGlvbjogJ0F1dG9tYXRpY2FsbHkgaW4tIGFuZCBvdXRkZW50IGxpc3QtaXRlbXMgYnkgcHJlc3NpbmcgYFRBQmAgYW5kIGBTSElGVCtUQUJgJyxcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICB9LFxuXG4gICAgbGlua1Nob3J0Y3V0czoge1xuICAgICAgdGl0bGU6ICdMaW5rIHNob3J0Y3V0cycsXG4gICAgICBkZXNjcmlwdGlvbjogJ0VuYWJsZXMga2V5YmluZGluZ3MgYEBgIGZvciBjb252ZXJ0aW5nIHRoZSBzZWxlY3RlZCB0ZXh0IHRvIGEgbGluayBhbmQgYCFgIGZvciBjb252ZXJ0aW5nIHRoZSBzZWxlY3RlZCB0ZXh0IHRvIGFuIGltYWdlJyxcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICB9LFxuXG4gICAgcmVtb3ZlRW1wdHlMaXN0SXRlbXM6IHtcbiAgICAgIHRpdGxlOiAnUmVtb3ZlIGVtcHR5IGxpc3QtaXRlbXMnLFxuICAgICAgZGVzY3JpcHRpb246ICdSZW1vdmUgdGhlIGF1dG9tYXRpY2FsbHkgY3JlYXRlZCBlbXB0eSBsaXN0LWl0ZW1zIHdoZW4gbGVmdCBlbXB0eSwgbGVhdmluZyBhbiBlbXB0eSBsaW5lJyxcbiAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICB9XG4gIH0sXG5cbiAgc3Vic2NyaXB0aW9uczogbnVsbCxcblxuICBhY3RpdmF0ZSAoc3RhdGUpIHtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpXG4gICAgdGhpcy5hZGRDb21tYW5kcygpXG5cbiAgICAvKlxuICAgIFVubGVzcyB5b3UgYXJlIGFuIGFkdmFuY2VkIHVzZXIsIHRoZXJlIGlzIG5vIG5lZWQgdG8gaGF2ZSBib3RoIHRoaXMgcGFja2FnZVxuICAgIGFuZCB0aGUgb25lIGl0IHJlcGxhY2VzIChsYW5ndWFnZS1nZm0pIGVuYWJsZWQuXG5cbiAgICBJZiB5b3UgYXJlIGFuIGFkdmFuY2VkIHVzZXIsIHlvdSBjYW4gZWFzaWx5IHJlLWVuYWJsZSBsYW5ndWFnZS1nZm0gYWdhaW4uXG4gICAgKi9cbiAgICBpZiAoYXRvbS5jb25maWcuZ2V0KCdsYW5ndWFnZS1tYXJrZG93bi5kaXNhYmxlTGFuZ3VhZ2VHZm0nKSkge1xuICAgICAgaWYgKCFhdG9tLnBhY2thZ2VzLmlzUGFja2FnZURpc2FibGVkKCdsYW5ndWFnZS1nZm0nKSkge1xuICAgICAgICBhdG9tLnBhY2thZ2VzLmRpc2FibGVQYWNrYWdlKCdsYW5ndWFnZS1nZm0nKVxuICAgICAgfVxuICAgIH1cblxuICAgIC8qXG4gICAgSSBmb3Jnb3Qgd2h5IHRoaXMgYWN0aW9uIGlzIGNyZWF0ZWQgaW5saW5lIGluIGFjdGl2YXRlKCkgYW5kIG5vdCBhcyBhXG4gICAgc2VwYXJhdGUgbWV0aG9kLCBidXQgdGhlcmUgd2FzIGEgZ29vZCByZWFzb24gZm9yIGl0LlxuICAgICovXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChhdG9tLndvcmtzcGFjZS5vYnNlcnZlVGV4dEVkaXRvcnMoZWRpdG9yID0+IHtcbiAgICAgIGVkaXRvci5vbkRpZEluc2VydFRleHQoZXZlbnQgPT4ge1xuICAgICAgICBjb25zdCBncmFtbWFyID0gZWRpdG9yLmdldEdyYW1tYXIoKVxuXG4gICAgICAgIGlmIChncmFtbWFyLm5hbWUgIT09ICdNYXJrZG93bicpIHJldHVyblxuICAgICAgICBpZiAoIWF0b20uY29uZmlnLmdldCgnbGFuZ3VhZ2UtbWFya2Rvd24uYWRkTGlzdEl0ZW1zJykpIHJldHVyblxuICAgICAgICBpZiAoZXZlbnQudGV4dCAhPT0gJ1xcbicpIHJldHVyblxuXG4gICAgICAgIC8qXG4gICAgICAgIEF0IHRoaXMgcG9pbnQsIGl0IGlzIHJhdGhlciB0ZWRpb3VzIChhcyBmYXIgYXMgSSBrbm93KSB0byBnZXQgdG8gdGhlXG4gICAgICAgIHRva2VuaXplZCB2ZXJzaW9uIG9mIHtwcmV2aW91c0xpbmV9LiBUaGF0IGlzIHRoZSByZWFzb24gd2h5IHt0b2tlbnN9IGFcbiAgICAgICAgbGl0dGxlIGZ1cnRoZXIgZG93biBpcyB0b2tlbml6ZWQuIEJ1dCBhdCB0aGlzIHN0YWdlLCB3ZSBkbyBuZWVkIHRvIGtub3dcbiAgICAgICAgaWYge3ByZXZpb3VzTGluZX0gd2FzIGluIGZhY3QgTWFya2Rvd24sIG9yIGZyb20gYSBkaWZmZXJlbnQgcGVyc3BlY3RpdmUsXG4gICAgICAgIG5vdCBhIHBpZWNlIG9mIGVtYmVkZGVkIGNvZGUuIFRoZSByZWFzb24gZm9yIHRoYXQgaXMgdGhhdCB0aGUgdG9rZW5pemVkXG4gICAgICAgIGxpbmUgYmVsb3cgaXMgdG9rZW5pemVkIHdpdGhvdXQgYW55IGNvbnRleHQsIHNvIGlzIE1hcmtkb3duIGJ5IGRlZmF1bHQuXG4gICAgICAgIFRoZXJlZm9yZSB3ZSBkZXRlcm1pbmUgaWYgb3VyIGN1cnJlbnQgcG9zaXRpb24gaXMgcGFydCBvZiBlbWJlZGRlZCBjb2RlXG4gICAgICAgIG9yIG5vdC5cbiAgICAgICAgKi9cblxuICAgICAgICBjb25zdCBwcmV2aW91c1Jvd051bWJlciA9IGV2ZW50LnJhbmdlLnN0YXJ0LnJvd1xuICAgICAgICBjb25zdCBwcmV2aW91c1Jvd1JhbmdlID0gZWRpdG9yLmJ1ZmZlci5yYW5nZUZvclJvdyhwcmV2aW91c1Jvd051bWJlcilcbiAgICAgICAgaWYgKHRoaXMuaXNFbWJlZGRlZENvZGUoZWRpdG9yLCBwcmV2aW91c1Jvd1JhbmdlKSkgcmV0dXJuXG5cbiAgICAgICAgY29uc3QgcHJldmlvdXNMaW5lID0gZWRpdG9yLmdldFRleHRJblJhbmdlKHByZXZpb3VzUm93UmFuZ2UpXG4gICAgICAgIGxldCB7IHRva2VucyB9ID0gZ3JhbW1hci50b2tlbml6ZUxpbmUocHJldmlvdXNMaW5lKVxuICAgICAgICB0b2tlbnMucmV2ZXJzZSgpXG4gICAgICAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgICAgICAgbGV0IGlzUHVuY3R1YXRpb24gPSBmYWxzZVxuICAgICAgICAgIGxldCBpc0xpc3RJdGVtID0gZmFsc2VcbiAgICAgICAgICBsZXQgdHlwZU9mTGlzdFxuXG4gICAgICAgICAgY29uc3Qgc2NvcGVzID0gdG9rZW4uc2NvcGVzLnJldmVyc2UoKVxuICAgICAgICAgIGZvciAoY29uc3Qgc2NvcGUgb2Ygc2NvcGVzKSB7XG4gICAgICAgICAgICBjb25zdCBjbGFzc2VzID0gc2NvcGUuc3BsaXQoJy4nKVxuXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgQSBsaXN0LWl0ZW0gaXMgdmFsaWQgd2hlbiBhIHB1bmN0dWF0aW9uIGNsYXNzIGlzIGltbWVkaWF0ZWx5XG4gICAgICAgICAgICBmb2xsb3dlZCBieSBhIG5vbi1lbXB0eSBsaXN0LWl0ZW0gY2xhc3MuXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgaWYgKGNsYXNzZXMuaW5jbHVkZXMoJ3B1bmN0dWF0aW9uJykpIHtcbiAgICAgICAgICAgICAgaXNQdW5jdHVhdGlvbiA9IHRydWVcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNQdW5jdHVhdGlvbiAmJiBjbGFzc2VzLmluY2x1ZGVzKCdsaXN0JykpIHtcbiAgICAgICAgICAgICAgaWYgKCFjbGFzc2VzLmluY2x1ZGVzKCdlbXB0eScpKSB7XG4gICAgICAgICAgICAgICAgaXNMaXN0SXRlbSA9IHRydWVcbiAgICAgICAgICAgICAgICB0eXBlT2ZMaXN0ID0gJ3Vub3JkZXJlZCdcbiAgICAgICAgICAgICAgICBpZiAoY2xhc3Nlcy5pbmNsdWRlcygnb3JkZXJlZCcpKSB7XG4gICAgICAgICAgICAgICAgICB0eXBlT2ZMaXN0ID0gJ29yZGVyZWQnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjbGFzc2VzLmluY2x1ZGVzKCdkZWZpbml0aW9uJykpIHtcbiAgICAgICAgICAgICAgICAgIHR5cGVPZkxpc3QgPSAnZGVmaW5pdGlvbidcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpc0xpc3RJdGVtID0gZmFsc2VcbiAgICAgICAgICAgICAgICBpc1B1bmN0dWF0aW9uID0gZmFsc2VcbiAgICAgICAgICAgICAgICBpZiAoYXRvbS5jb25maWcuZ2V0KCdsYW5ndWFnZS1tYXJrZG93bi5yZW1vdmVFbXB0eUxpc3RJdGVtcycpKSB7XG4gICAgICAgICAgICAgICAgICBlZGl0b3Iuc2V0VGV4dEluQnVmZmVyUmFuZ2UocHJldmlvdXNSb3dSYW5nZSwgJycpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpc1B1bmN0dWF0aW9uID0gZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoaXNMaXN0SXRlbSAmJiB0eXBlT2ZMaXN0ICE9PSAnZGVmaW5pdGlvbicpIHtcbiAgICAgICAgICAgIGxldCB0ZXh0ID0gdG9rZW4udmFsdWVcbiAgICAgICAgICAgIGlmICh0eXBlT2ZMaXN0ID09PSAnb3JkZXJlZCcpIHtcbiAgICAgICAgICAgICAgY29uc3QgbGVuZ3RoID0gdGV4dC5sZW5ndGhcbiAgICAgICAgICAgICAgY29uc3QgcHVuY3R1YXRpb24gPSB0ZXh0Lm1hdGNoKC9bXlxcZF0rLylcbiAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBwYXJzZUludCh0ZXh0KSArIDFcbiAgICAgICAgICAgICAgdGV4dCA9IHZhbHVlICsgcHVuY3R1YXRpb25cbiAgICAgICAgICAgICAgaWYgKHRleHQubGVuZ3RoIDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0ZXh0Lmxlbmd0aCAtIGxlbmd0aCArIDE7IGorKykge1xuICAgICAgICAgICAgICAgICAgdGV4dCA9ICcwJyArIHRleHRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoJ3gnLCAnICcpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlZGl0b3IuaW5zZXJ0VGV4dCh0ZXh0ICsgJycpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KSlcbiAgfSxcblxuICBhZGRDb21tYW5kcyAoKSB7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChhdG9tLmNvbW1hbmRzLmFkZCgnYXRvbS10ZXh0LWVkaXRvcicsICdtYXJrZG93bjppbmRlbnQtbGlzdC1pdGVtJywgKGV2ZW50KSA9PiB0aGlzLmluZGVudExpc3RJdGVtKGV2ZW50KSkpXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChhdG9tLmNvbW1hbmRzLmFkZCgnYXRvbS10ZXh0LWVkaXRvcicsICdtYXJrZG93bjpvdXRkZW50LWxpc3QtaXRlbScsIChldmVudCkgPT4gdGhpcy5vdXRkZW50TGlzdEl0ZW0oZXZlbnQpKSlcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKGF0b20uY29tbWFuZHMuYWRkKCdhdG9tLXRleHQtZWRpdG9yJywgJ21hcmtkb3duOmVtcGhhc2lzJywgKGV2ZW50KSA9PiB0aGlzLmVtcGhhc2l6ZVNlbGVjdGlvbihldmVudCwgJ18nKSkpXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChhdG9tLmNvbW1hbmRzLmFkZCgnYXRvbS10ZXh0LWVkaXRvcicsICdtYXJrZG93bjpzdHJvbmctZW1waGFzaXMnLCAoZXZlbnQpID0+IHRoaXMuZW1waGFzaXplU2VsZWN0aW9uKGV2ZW50LCAnKionKSkpXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmFkZChhdG9tLmNvbW1hbmRzLmFkZCgnYXRvbS10ZXh0LWVkaXRvcicsICdtYXJrZG93bjpzdHJpa2UtdGhyb3VnaCcsIChldmVudCkgPT4gdGhpcy5lbXBoYXNpemVTZWxlY3Rpb24oZXZlbnQsICd+ficpKSlcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuYWRkKGF0b20uY29tbWFuZHMuYWRkKCdhdG9tLXRleHQtZWRpdG9yJywgJ21hcmtkb3duOmxpbmsnLCAoZXZlbnQpID0+IHRoaXMubGlua1NlbGVjdGlvbihldmVudCkpKVxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoYXRvbS5jb21tYW5kcy5hZGQoJ2F0b20tdGV4dC1lZGl0b3InLCAnbWFya2Rvd246aW1hZ2UnLCAoZXZlbnQpID0+IHRoaXMubGlua1NlbGVjdGlvbihldmVudCwgdHJ1ZSkpKVxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoYXRvbS5jb21tYW5kcy5hZGQoJ2F0b20tdGV4dC1lZGl0b3InLCAnbWFya2Rvd246dG9nZ2xlLXRhc2snLCAoZXZlbnQpID0+IHRoaXMudG9nZ2xlVGFzayhldmVudCkpKVxuXG4gICAgaWYgKGF0b20uaW5EZXZNb2RlKCkpIHtcbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5hZGQoYXRvbS5jb21tYW5kcy5hZGQoJ2F0b20td29ya3NwYWNlJywgJ21hcmtkb3duOmNvbXBpbGUtZ3JhbW1hci1hbmQtcmVsb2FkJywgKCkgPT4gdGhpcy5jb21waWxlR3JhbW1hcigpKSlcbiAgICB9XG4gIH0sXG5cbiAgaW5kZW50TGlzdEl0ZW0gKGV2ZW50KSB7XG4gICAgY29uc3QgeyBlZGl0b3IsIHBvc2l0aW9uIH0gPSB0aGlzLl9nZXRFZGl0b3JBbmRQb3NpdGlvbihldmVudClcbiAgICBjb25zdCBpbmRlbnRMaXN0SXRlbXMgPSBhdG9tLmNvbmZpZy5nZXQoJ2xhbmd1YWdlLW1hcmtkb3duLmluZGVudExpc3RJdGVtcycpXG4gICAgaWYgKGluZGVudExpc3RJdGVtcyAmJiB0aGlzLmlzTGlzdEl0ZW0oZWRpdG9yLCBwb3NpdGlvbikpIHtcbiAgICAgIGVkaXRvci5pbmRlbnRTZWxlY3RlZFJvd3MocG9zaXRpb24ucm93KVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGV2ZW50LmFib3J0S2V5QmluZGluZygpXG4gIH0sXG5cbiAgb3V0ZGVudExpc3RJdGVtIChldmVudCkge1xuICAgIGNvbnN0IHsgZWRpdG9yLCBwb3NpdGlvbiB9ID0gdGhpcy5fZ2V0RWRpdG9yQW5kUG9zaXRpb24oZXZlbnQpXG4gICAgY29uc3QgaW5kZW50TGlzdEl0ZW1zID0gYXRvbS5jb25maWcuZ2V0KCdsYW5ndWFnZS1tYXJrZG93bi5pbmRlbnRMaXN0SXRlbXMnKVxuICAgIGlmIChpbmRlbnRMaXN0SXRlbXMgJiYgdGhpcy5pc0xpc3RJdGVtKGVkaXRvciwgcG9zaXRpb24pKSB7XG4gICAgICBlZGl0b3Iub3V0ZGVudFNlbGVjdGVkUm93cyhwb3NpdGlvbi5yb3cpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgZXZlbnQuYWJvcnRLZXlCaW5kaW5nKClcbiAgfSxcblxuICBlbXBoYXNpemVTZWxlY3Rpb24gKGV2ZW50LCB0b2tlbikge1xuICAgIGxldCBkaWRTb21lV3JhcHBpbmcgPSBmYWxzZVxuICAgIGlmIChhdG9tLmNvbmZpZy5nZXQoJ2xhbmd1YWdlLW1hcmtkb3duLmVtcGhhc2lzU2hvcnRjdXRzJykpIHtcbiAgICAgIGNvbnN0IGVkaXRvciA9IGF0b20ud29ya3NwYWNlLmdldEFjdGl2ZVRleHRFZGl0b3IoKVxuICAgICAgaWYgKCFlZGl0b3IpIHJldHVyblxuXG4gICAgICBjb25zdCByYW5nZXMgPSB0aGlzLmdldFNlbGVjdGVkQnVmZmVyUmFuZ2VzUmV2ZXJzZWQoZWRpdG9yKVxuICAgICAgZm9yIChjb25zdCByYW5nZSBvZiByYW5nZXMpIHtcbiAgICAgICAgY29uc3QgdGV4dCA9IGVkaXRvci5nZXRUZXh0SW5CdWZmZXJSYW5nZShyYW5nZSlcbiAgICAgICAgLypcbiAgICAgICAgU2tpcCB0ZXh0cyB0aGF0IGNvbnRhaW4gYSBsaW5lLWJyZWFrLCBvciBhcmUgZW1wdHkuXG4gICAgICAgIE11bHRpLWxpbmUgZW1waGFzaXMgaXMgbm90IHN1cHBvcnRlZCAnYW55d2F5Jy5cblxuICAgICAgICBJZiBhZnRlcndhcmRzIG5vdCBhIHNpbmdsZSBzZWxlY3Rpb24gaGFzIGJlZW4gd3JhcHBlZCwgY2FuY2VsIHRoZSBldmVudFxuICAgICAgICBhbmQgaW5zZXJ0IHRoZSBjaGFyYWN0ZXIgYXMgbm9ybWFsLlxuXG4gICAgICAgIElmIHR3byBjdXJzb3JzIHdlcmUgZm91bmQsIGJ1dCBvbmx5IG9uZSBvZiB0aGVtIHdhcyBhIHNlbGVjdGlvbiwgYW5kIHRoZVxuICAgICAgICBvdGhlciBhIG5vcm1hbCBjdXJzb3IsIHRoZW4gdGhlIG5vcm1hbCBjdXJzb3IgaXMgaWdub3JlZCwgYW5kIHRoZSBzaW5nbGVcbiAgICAgICAgc2VsZWN0aW9uIHdpbGwgYmUgd3JhcHBlZC5cbiAgICAgICAgKi9cbiAgICAgICAgaWYgKHRleHQubGVuZ3RoICE9PSAwICYmIHRleHQuaW5kZXhPZignXFxuJykgPT09IC0xKSB7XG4gICAgICAgICAgY29uc3Qgd3JhcHBlZFRleHQgPSB0aGlzLndyYXBUZXh0KHRleHQsIHRva2VuKVxuICAgICAgICAgIGVkaXRvci5zZXRUZXh0SW5CdWZmZXJSYW5nZShyYW5nZSwgd3JhcHBlZFRleHQpXG4gICAgICAgICAgZGlkU29tZVdyYXBwaW5nID0gdHJ1ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghZGlkU29tZVdyYXBwaW5nKSB7XG4gICAgICBldmVudC5hYm9ydEtleUJpbmRpbmcoKVxuICAgIH1cbiAgICByZXR1cm5cbiAgfSxcblxuICAvLyBUT0RPOiBEb2Vzbid0IHBsYWNlIHRoZSBjdXJzb3IgYXQgdGhlIHJpZ2h0IHBvc2l0aW9uIGFmdGVyd2FyZHNcbiAgbGlua1NlbGVjdGlvbiAoZXZlbnQsIGlzSW1hZ2UgPSBmYWxzZSkge1xuICAgIGxldCBkaWRTb21lV3JhcHBpbmcgPSBmYWxzZVxuXG4gICAgaWYgKCFhdG9tLmNvbmZpZy5nZXQoJ2xhbmd1YWdlLW1hcmtkb3duLmxpbmtTaG9ydGN1dHMnKSkge1xuICAgICAgZXZlbnQuYWJvcnRLZXlCaW5kaW5nKClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbnN0IGVkaXRvciA9IGF0b20ud29ya3NwYWNlLmdldEFjdGl2ZVRleHRFZGl0b3IoKVxuICAgIGlmICghZWRpdG9yKSByZXR1cm5cblxuICAgIGNvbnN0IHJhbmdlcyA9IHRoaXMuZ2V0U2VsZWN0ZWRCdWZmZXJSYW5nZXNSZXZlcnNlZChlZGl0b3IpXG4gICAgY29uc3QgY3Vyc29yT2Zmc2V0cyA9IFtdXG4gICAgZm9yIChjb25zdCByYW5nZSBvZiByYW5nZXMpIHtcbiAgICAgIGNvbnN0IHRleHQgPSBlZGl0b3IuZ2V0VGV4dEluQnVmZmVyUmFuZ2UocmFuZ2UpXG4gICAgICAvLyBTZWUge2VtcGhhc2l6ZVNlbGVjdGlvbn1cbiAgICAgIGlmICh0ZXh0Lmxlbmd0aCAhPT0gMCAmJiB0ZXh0LmluZGV4T2YoJ1xcbicpID09PSAtMSkge1xuICAgICAgICBjb25zdCBpbWFnZVRva2VuID0gaXNJbWFnZSA/ICchJyA6ICcnXG4gICAgICAgIGlmICh0ZXh0Lm1hdGNoKC9bLWEtekEtWjAtOUA6JS5fXFwrfiM9XXsyLDI1Nn1cXC5bYS16XXsyLDZ9XFxiKFstYS16QS1aMC05QDolX1xcKy5+Iz8mLy89XSopLykpIHtcbiAgICAgICAgICBjb25zdCBuZXdUZXh0ID0gYCR7aW1hZ2VUb2tlbn1bXSgke3RleHR9KWBcbiAgICAgICAgICBlZGl0b3Iuc2V0VGV4dEluQnVmZmVyUmFuZ2UocmFuZ2UsIG5ld1RleHQpXG4gICAgICAgICAgY3Vyc29yT2Zmc2V0cy5wdXNoKHRleHQubGVuZ3RoICsgMylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBuZXdUZXh0ID0gYCR7aW1hZ2VUb2tlbn1bJHt0ZXh0fV0oKWBcbiAgICAgICAgICBlZGl0b3Iuc2V0VGV4dEluQnVmZmVyUmFuZ2UocmFuZ2UsIG5ld1RleHQpXG4gICAgICAgICAgY3Vyc29yT2Zmc2V0cy5wdXNoKDEpXG4gICAgICAgIH1cbiAgICAgICAgZGlkU29tZVdyYXBwaW5nID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChkaWRTb21lV3JhcHBpbmcpIHtcbiAgICAgIC8qXG4gICAgICBDdXJzb3JzIGFyZW4ndCBzZXBhcmF0ZSBlbnRpdGllcywgYnV0IHJhdGhlciBzaW1wbGUge1BvaW50fXMsIGllLFxuICAgICAgcG9zaXRpb25zIGluIHRoZSBidWZmZXIuIFRoZXJlIGlzIG5vIHdheSBvZiB1cGRhdGluZyBhIGN1cnNvci4gSW5zdGVhZCxcbiAgICAgIHdlIGNsZWFyIGFsbCBjdXJzb3JzLCBhbmQgdGhlbiByZS1jcmVhdGUgdGhlbSBmcm9tIHdoZXJlIG91ciBjdXJyZW50XG4gICAgICBzZWxlY3Rpb25zIGFyZS5cblxuICAgICAgQWZ0ZXIgdGhlIGltYWdlL2xpbmsgd3JhcHBpbmcgYWJvdmUsIHRoZSBjdXJzb3IgYXJlIHBvc2l0aW9uZWQgYWZ0ZXIgdGhlXG4gICAgICBzZWxlY3Rpb25zLCBhbmQgdGhlIGRlc2lyZWQgcmVsYXRpdmUgbG9jYXRpb25zIGZvciB0aGUgbmV3IGN1cnNvcnMgYXJlXG4gICAgICBzdG9yZWQgaW4ge2N1cnNvck9mZnNldHN9LiBXZSBvbmx5IG5lZWQgdG8gbG9vcCB0aHJvdWdoIHRoZSBjdXJyZW50XG4gICAgICBzZWxlY3Rpb25zLCBhbmQgY3JlYXRlIGEgbmV3IGN1cnNvciBmb3IgZXZlcnkgc2VsZWN0aW9uLlxuXG4gICAgICBBIHNlbGVjdGlvbiB3aXRob3V0IGEgbGVuZ3RoIGlzIGEgc2ltcGxlIGN1cnNvciB0aGF0IGNhbiBiZSByZS1jcmVhdGVkIGF0XG4gICAgICB0aGF0IGV4YWN0IGxvY2F0aW9uLlxuXG4gICAgICBUT0RPOiBtYXliZSBvbmUgb2YgdGhvc2UgZmFuY3kgZ2VuZXJhdG9ycyBjYW4gYmUgdXNlZCBmb3Igb3VyXG4gICAgICBjdXJzb3JPZmZzZXRzP1xuICAgICAgKi9cbiAgICAgIGNvbnN0IHNlbGVjdGlvbnMgPSBlZGl0b3IuZ2V0U2VsZWN0ZWRCdWZmZXJSYW5nZXMoKVxuICAgICAgbGV0IGNvdW50ID0gMFxuICAgICAgbGV0IG9mZnNldENvdW50ID0gMFxuICAgICAgZm9yIChjb25zdCBzZWxlY3Rpb24gb2Ygc2VsZWN0aW9ucykge1xuICAgICAgICBjb25zdCB7IHN0YXJ0LCBlbmQgfSA9IHNlbGVjdGlvblxuICAgICAgICBpZiAoKHN0YXJ0LnJvdyA9PT0gZW5kLnJvdykgJiYgKHN0YXJ0LmNvbHVtbiA9PT0gZW5kLmNvbHVtbikpIHtcbiAgICAgICAgICBpZiAoY291bnQpIHtcbiAgICAgICAgICAgIGVkaXRvci5hZGRDdXJzb3JBdEJ1ZmZlclBvc2l0aW9uKHN0YXJ0KVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlZGl0b3Iuc2V0Q3Vyc29yQnVmZmVyUG9zaXRpb24oc3RhcnQpXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IHBvc2l0aW9uID0ge1xuICAgICAgICAgICAgcm93OiBlbmQucm93LFxuICAgICAgICAgICAgY29sdW1uOiBlbmQuY29sdW1uIC0gY3Vyc29yT2Zmc2V0c1tvZmZzZXRDb3VudF1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNvdW50KSB7XG4gICAgICAgICAgICBlZGl0b3IuYWRkQ3Vyc29yQXRCdWZmZXJQb3NpdGlvbihwb3NpdGlvbilcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWRpdG9yLnNldEN1cnNvckJ1ZmZlclBvc2l0aW9uKHBvc2l0aW9uKVxuICAgICAgICAgIH1cbiAgICAgICAgICBvZmZzZXRDb3VudCsrXG4gICAgICAgIH1cbiAgICAgICAgY291bnQrKztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZXZlbnQuYWJvcnRLZXlCaW5kaW5nKClcbiAgICB9XG5cbiAgICByZXR1cm5cbiAgfSxcblxuICBfZ2V0RWRpdG9yQW5kUG9zaXRpb24gKGV2ZW50KSB7XG4gICAgY29uc3QgZWRpdG9yID0gYXRvbS53b3Jrc3BhY2UuZ2V0QWN0aXZlVGV4dEVkaXRvcigpXG4gICAgaWYgKGVkaXRvcikge1xuICAgICAgY29uc3QgcG9zaXRpb25zID0gZWRpdG9yLmdldEN1cnNvckJ1ZmZlclBvc2l0aW9ucygpXG4gICAgICBpZiAocG9zaXRpb25zKSB7XG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gcG9zaXRpb25zWzBdXG4gICAgICAgIHJldHVybiB7IGVkaXRvciwgcG9zaXRpb24gfVxuICAgICAgfVxuICAgIH1cbiAgICBldmVudC5hYm9ydEtleUJpbmRpbmcoKVxuICB9LFxuXG4gIHRvZ2dsZVRhc2sgKGV2ZW50KSB7XG4gICAgY29uc3QgZWRpdG9yID0gYXRvbS53b3Jrc3BhY2UuZ2V0QWN0aXZlVGV4dEVkaXRvcigpXG4gICAgaWYgKCFlZGl0b3IpIHtcbiAgICAgIGV2ZW50LmFib3J0S2V5QmluZGluZygpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25zdCByYW5nZXMgPSBlZGl0b3IuZ2V0U2VsZWN0ZWRCdWZmZXJSYW5nZXMoKVxuICAgIGZvciAoY29uc3QgcmFuZ2Ugb2YgcmFuZ2VzKSB7XG4gICAgICBjb25zdCB7IHN0YXJ0LCBlbmQgfSA9IHJhbmdlXG4gICAgICBmb3IgKGxldCByb3cgPSBzdGFydC5yb3c7IHJvdyA8PSBlbmQucm93OyByb3crKykge1xuICAgICAgICBjb25zdCBsaXN0SXRlbSA9IHRoaXMuaXNMaXN0SXRlbShlZGl0b3IsIFtyb3csIDBdKVxuICAgICAgICBpZiAobGlzdEl0ZW0gJiYgbGlzdEl0ZW0uaW5jbHVkZXMoJ3Rhc2snKSkge1xuICAgICAgICAgIGNvbnN0IGN1cnJlbnRMaW5lID0gZWRpdG9yLmxpbmVUZXh0Rm9yQnVmZmVyUm93KHJvdylcbiAgICAgICAgICBsZXQgbmV3TGluZVxuICAgICAgICAgIGlmIChsaXN0SXRlbS5pbmNsdWRlcygnY29tcGxldGVkJykpIHtcbiAgICAgICAgICAgIG5ld0xpbmUgPSBjdXJyZW50TGluZS5yZXBsYWNlKC8gXFxbKHh8WClcXF0gLywgJyBbIF0gJylcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3TGluZSA9IGN1cnJlbnRMaW5lLnJlcGxhY2UoJyBbIF0gJywgJyBbeF0gJylcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgbmV3UmFuZ2UgPSBbW3JvdywgMF0sIFtyb3csIG5ld0xpbmUubGVuZ3RoXV1cbiAgICAgICAgICBlZGl0b3Iuc2V0VGV4dEluQnVmZmVyUmFuZ2UobmV3UmFuZ2UsIG5ld0xpbmUpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuXG4gIH0sXG5cbiAgaXNMaXN0SXRlbSAoZWRpdG9yLCBwb3NpdGlvbikge1xuICAgIGlmIChlZGl0b3IpIHtcbiAgICAgIGlmIChlZGl0b3IuZ2V0R3JhbW1hcigpLm5hbWUgPT09ICdNYXJrZG93bicpIHtcbiAgICAgICAgY29uc3Qgc2NvcGVEZXNjcmlwdG9yID0gZWRpdG9yLnNjb3BlRGVzY3JpcHRvckZvckJ1ZmZlclBvc2l0aW9uKHBvc2l0aW9uKVxuICAgICAgICBmb3IgKGNvbnN0IHNjb3BlIG9mIHNjb3BlRGVzY3JpcHRvci5zY29wZXMpIHtcbiAgICAgICAgICBpZiAoc2NvcGUuaW5jbHVkZXMoJ2xpc3QnKSkge1xuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIFJldHVybiB7c2NvcGV9LCB3aGljaCBldmFsdWF0ZXMgYXMge3RydWV9IGFuZCBjYW4gYmUgdXNlZCBieSBvdGhlclxuICAgICAgICAgICAgZnVuY3Rpb25zIHRvIGRldGVybWluZSB0aGUgdHlwZSBvZiBsaXN0LWl0ZW1cbiAgICAgICAgICAgICovXG4gICAgICAgICAgICByZXR1cm4gc2NvcGU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZVxuICB9LFxuXG4gIHdyYXBUZXh0ICh0ZXh0LCB0b2tlbikge1xuICAgIGNvbnN0IGxlbmd0aCA9IHRva2VuLmxlbmd0aFxuICAgIGlmICgodGV4dC5zdWJzdHIoMCwgbGVuZ3RoKSA9PT0gdG9rZW4pICYmICh0ZXh0LnN1YnN0cigtbGVuZ3RoKSA9PT0gdG9rZW4pKSB7XG4gICAgICByZXR1cm4gdGV4dC5zdWJzdHIobGVuZ3RoLCB0ZXh0Lmxlbmd0aCAtIGxlbmd0aCAqIDIpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0b2tlbiArIHRleHQgKyB0b2tlblxuICAgIH1cbiAgfSxcblxuICBpc0VtYmVkZGVkQ29kZSAoZWRpdG9yLCByYW5nZSkge1xuICAgIGNvbnN0IHNjb3BlRGVzY3JpcHRvciA9IGVkaXRvci5zY29wZURlc2NyaXB0b3JGb3JCdWZmZXJQb3NpdGlvbihyYW5nZS5lbmQpXG4gICAgZm9yIChjb25zdCBzY29wZSBvZiBzY29wZURlc2NyaXB0b3Iuc2NvcGVzKSB7XG4gICAgICBpZiAoc2NvcGUuaW5jbHVkZXMoJ3NvdXJjZScpKSByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2VcbiAgfSxcblxuICAvKlxuICBTZWxlY3Rpb24gYXJlIHJldHVybmVkIGluIHRoZSByZXZlcnNlIG9yZGVyIHRoYXQgdGhleSB3ZXJlIGNyZWF0ZWQgYnkgdGhlXG4gIHVzZXIuIFdlIG5lZWQgdGhlbSBpbiB0aGUgcmV2ZXJzZSBvcmRlciB0aGF0IHRoZXkgYXBwZWFyIGluIHRoZSBkb2N1bWVudCxcbiAgYmVjYXVzZSB3ZSBkb24ndCBuZWVkIGEgcHJldmlvdXMgY2hhbmdlcyBzZWxlY3Rpb24gY2hhbmdpbmcgdGhlIGJ1ZmZlclxuICBwb3NpdGlvbiBvZiBvdXIgc2VsZWN0aW9ucy5cbiAgKi9cbiAgZ2V0U2VsZWN0ZWRCdWZmZXJSYW5nZXNSZXZlcnNlZCAoZWRpdG9yKSB7XG4gICAgY29uc3QgcmFuZ2VzID0gZWRpdG9yLmdldFNlbGVjdGVkQnVmZmVyUmFuZ2VzKClcbiAgICByYW5nZXMuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICBpZiAoYS5zdGFydC5yb3cgPiBiLnN0YXJ0LnJvdykgcmV0dXJuIC0xXG4gICAgICBpZiAoYi5zdGFydC5yb3cgPiBhLnN0YXJ0LnJvdykgcmV0dXJuIDFcbiAgICAgIGlmIChhLnN0YXJ0LmNvbHVtbiA+IGIuc3RhcnQuY29sdW1uKSByZXR1cm4gLTFcbiAgICAgIHJldHVybiAxXG4gICAgfSlcbiAgICByZXR1cm4gcmFuZ2VzXG4gIH0sXG5cbiAgY29tcGlsZUdyYW1tYXIgKCkge1xuICAgIGlmIChhdG9tLmluRGV2TW9kZSgpKSB7XG4gICAgICBjb25zdCBjb21waWxlciA9IG5ldyBHcmFtbWFyQ29tcGlsZXIoKVxuICAgICAgY29tcGlsZXIuY29tcGlsZSgpXG4gICAgfVxuICB9XG59XG4iXX0=