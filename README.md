# Atom Xterm
There have been many Atom packages that let you run a terminal in a pane tab, rather than some little panel you can't put anywhere you like. This is only the latest.

Thanks to [term3](https://github.com/Floobits/atom-term3), which this is a fork of, all the previous forks ([term2](http://atom.io/packages/term2), [term](http://atom.io/packages/term)), and the rather good [xterm.js](https://xtermjs.org), which is what this package embeds into Atom.

I've only tested this on macOS, but the native bits haven't changed from term3 so they should be okay.

## Why the fork?
Initially it was just to swap out the terminal emulator in term3 for xterm.js, but then it kind of took on a bunch of other things I wanted to do. It modernises the code a bit, removing a bunch of dependencies and giving it a spring clean. I also added basic serialisation, so Atom remembers you had a terminal open and reopens one after you quit and re-open.

## Differences with term3
Selecting text isn't quite as good, because of lack of support in xterm.js. I hear better APIs are coming, but for now, selecting with your mouse copies straight to the clipboard and that's your lot.

## Installation
The usual way:
```console
$ apm install xterm
```

## Key Bindings and Events

| key binding | event | action |
| ----------- | ----- | ------ |
| `ctrl + alt + t` | `xterm:open` | Opens new terminal tab pane |
| `ctrl + alt + up`| `xterm:open-split-up` | Opens new terminal tab pane in up split |
| `ctrl + alt + right`| `xterm:open-split-right` | Opens new terminal tab pane in right split |
| `ctrl + alt + down`| `xterm:open-split-down` | Opens new terminal tab pane in down split |
| `ctrl + alt + left`| `xterm:open-split-left` | Opens new terminal tab pane in left split |
| `ctrl + k, t, t` | `xterm:open` | Opens new terminal tab pane |
| `ctrl + k, t, up`| `xterm:open-split-up` | Opens new terminal tab pane in up split |
| `ctrl + k, t, right`| `xterm:open-split-right` | Opens new terminal tab pane in right split |
| `ctrl + k, t, down`| `xterm:open-split-down` | Opens new terminal tab pane in down split |
| `ctrl + k, t, left`| `xterm:open-split-left` | Opens new terminal tab pane in left split |
| `cmd + k, t, t` | `xterm:open` | Opens new terminal tab pane |
| `cmd + k, t, up`| `xterm:open-split-up` | Opens new terminal tab pane in up split |
| `cmd + k, t, right`| `xterm:open-split-right` | Opens new terminal tab pane in right split |
| `cmd + k, t, down`| `xterm:open-split-down` | Opens new terminal tab pane in down split |
| `cmd + k, t, left`| `xterm:open-split-left` | Opens new terminal tab pane in left split |
| `ctrl + insert` | `xterm:copy` | Copy text (if `ctrl + c` is not working) |
| `shift + insert` | `xterm:paste` | Paste text (if `ctrl + v` is not working) |

## Customize Title

You can customize the title with substitution variables. These are the current variables you can use:

| title variable | value |
| -------------- | ----- |
| `bashName` | current shell's name, (e.g. bash, zsh) |
| `hostName` | OS's host name |
| `platform` | platform name, (e.g. darwin, linux) |
| `home` | home directory of current user |

Default version of **title template** is

```
Terminal ({{ bashName }})
```

(I haven't tested this still works.)

## Additional Features

  - **Run a defined command automatically** when shell session starts.
  - You can customize font-family or font-size (default to Atom settings values)
  - You can define **Terminal Colors** in `config.cson`.
  - Turn on or off **blinking cursor**
  - Change **scrollback** limit
  - Start shell sessions with additional parameters.
  - You can **pipe the text and paths** to the Terminal sessions.
  - Paste from clipboard

## Version History

### 1.1.0
* Upgrade xterm.js to [2.9.2](https://github.com/sourcelair/xterm.js/releases/tag/2.9.2).
  * Most significantly, this changes selection so that it's good now, and copying to clipboard works like elsewhere: select text, use regular "Copy" command or shortcut, and then optionally deselect or whatever.
* Added support for selectively ignoring keystrokes. Have a look at the Settings view. I added this because I use `cmd-a` as a prefix for navigating panes, and normally that would do "Select All" in the terminal before Atom would capture it – so now I can add `cmd-a` to the option in `xterm` settings, and it now doesn't do that. Very handy.

### 1.0.5
* [Replace non-breaking spaces with regular spaces in selection handler](https://github.com/dwb/atom-xterm/pull/2) – thanks [adrianmalacoda](https://github.com/adrianmalacoda) for catching my silly mistake.

### 1.0.4
* Upgrade xterm.js to [2.7.0](https://github.com/sourcelair/xterm.js/releases/tag/2.7.0).
* [Replace non-breaking spaces with regular spaces in selection handler](https://github.com/dwb/atom-xterm/pull/1) – thanks [adrianmalacoda](https://github.com/adrianmalacoda).
* Guess LANG environment variable if required.
* Try to guess shell environment better on macOS.

### 1.0.3
* Don't pass `NODE_ENV` and `NODE_PATH` to terminal processes

### 1.0.2
* Fixed UTF-8 input (assumes UTF-8 locale!)

### 1.0.1
* Fixed paste and scroll command targetting

### 1.0.0
* Initial version with [xterm.js](https://xtermjs.org)

## Known Issues
* Running Neovim ≤ 0.2 (and possibly other fancy GUI-ish terminal apps) inside a terminal immediately pulls focus back to the terminal pane on blur, and Neovim > 0.2 is very broken. (Obviously running Neovim long-term inside a terminal pane in Atom is an odd thing to do, but it's still my editor for git messages).
* The terminal list in the tree view is currently broken.

## Note about colors

Currently, you will need to adjust the colors in `config.cson`
(then you should be able to edit them in the package settings view).

You can add something like (please note the 2 examples of color format):

```cson
xterm:
  colors:
    normalBlack: '#000'
    normalRed:
      red: 255
      blue: 0
      green: 0
      alpha: 1
    normalGreen: ...
    normalYellow: ...
    normalBlue: ...
    normalPurple: ...
    normalCyan: ...
    normalWhite: ...
    brightBlack: ...
    brightRed: ...
    brightGreen: ...
    brightYellow: ...
    brightBlue: ...
    brightPurple: ...
    brightCyan: ...
    brightWhite: ...
    background: ...
    foreground: ...
```

- **Colors are not taken from the Atom theme.**
- I don't know if the alpha channel works, I haven't tested it.

## FAQ

### Why some commands do not work like in my previous terminal ?
Make sure your `PATH` variable is set to what you expect. The best way to have it be set properly is to run Atom with the CLI `atom` command.

### Why do special characters not work?
Same answer, but with your `LANG` variable. I might add some logic to try and guess this if it's not set.

## Versioning

I'll follow [Semantic Versioning 2.0.0](http://semver.org/spec/v2.0.0.html) for the package overall and the service (currently undocumented, but easy code to read if you're interested). I'm not sure there's much point in carefully versioning the overall package, but I might as well. For the purposes of versioning, the public API is the registered commands and config keys with their types. For the service, it's... the service. All "own" properties of the provided object, with their argument types and return type.

---

## [Contributors](https://github.com/dwb/atom-xterm/graphs/contributors)

## [License](LICENSE)
