/*
  Purpose of this script is to ensure that a command (usually coming from npm) will always
  run inside a Linux environment even when called from Windows - in this case it will use the
  WSL bash.

  This is done to work around the issue that when working with a Windows editor such as VSCode,
  the MSYS Git will be used, which will call the Windows npm, which will run any scripts in
  package.json in Windows too.

  This can then fail for multiple reasons - from incompatible command-line syntaxes to access
  denied errors caused by accessing ./node_modules/.bin/* symlinks (created under WSL) from
  Windows (which doesn't work, see https://github.com/Microsoft/BashOnWindows/issues/353).

  In order to still allow things to work smoothly, we can use the "common ground" between
  both platforms which will always work in npm scripts, and that is using "node" to run a
  script (in that case, even forward slashes work in the filename).

  To use this script, put the following into your npm scripts:
  node .scripts/ensure_linux.js "whatever command you want to run in Linux"

  This script will pass the given command through to bash. Under Windows, it will detect and
  use the WSL bash or fail if WSL is not installed.
*/

const child_process = require('child_process')
const fs = require('fs')
const path = require('path')

let bashCommand
if (process.platform == 'win32') {
  const paths = [
    path.join(process.env.SystemRoot, 'System32', 'bash.exe'),
    path.join(process.env.SystemRoot, 'SysNative', 'bash.exe')
  ]
  wslBashPath = paths.filter(path => fs.existsSync(path))[0]
  if (!wslBashPath) {
    console.error('Cannot find bash.exe - Make sure you have WSL installed!')
    process.exit(1)
  }
  bashCommand = wslBashPath
} else {
  bashCommand = 'bash'
}

try {
  return child_process.execSync(`${bashCommand} -c \"bash -c '${process.argv.slice(2).join(' ')}'\"`, {stdio: [0, 1, 2]})
} catch(e) {
  if(e.status) process.exit(e.status)
}
