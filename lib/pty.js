/* global emit */

'use babel';

// from atom/terminal to reduce cpu usage

import pty from 'ptyw.js';

export default function(ptyCwd, sh, cols, rows, args) {
  let shell;
  const callback = this.async();
  if (sh) {
    shell = sh;
  } else {
    shell = process.env.SHELL;
    if (!shell) {
      // Try to salvage some sort of shell to execute. Horrible code below.
      const path = require('path');
      if (process.platform === 'win32') {
        shell = path.resolve(
          process.env.SystemRoot,
          'System32',
          'WindowsPowerShell',
          'v1.0',
          'powershell.exe',
        );
      } else {
        shell = '/bin/sh';
      }
    }
  }

  const ptyProcess = pty.fork(shell, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: ptyCwd,
    env: process.env,
  });

  ptyProcess.on('data', data =>
    emit('term3:data', new Buffer(data).toString('base64')),
  );

  ptyProcess.on('exit', function() {
    emit('term3:exit');
    return callback();
  });

  return process.on('message', function({ event, cols, rows, text } = {}) {
    switch (event) {
      case 'resize':
        return ptyProcess.resize(cols, rows);
      case 'input':
        return ptyProcess.write(new Buffer(text, 'base64'));
    }
  });
}
