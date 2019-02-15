if (process.platform == 'win32') {
  console.error('ERROR! This package cannot work when installed from Windows npm! Please install it again from WSL!')
  process.exit(1)
}
