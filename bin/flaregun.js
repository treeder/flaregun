#!/usr/bin/env node

import { build } from './build.js'
import { setup } from './setup.js'

let pargs = process.argv
// console.log(pargs)

let command = pargs[2]
let args = pargs.slice(3)
// console.log('command:', command)
// console.log('args:', args)

switch (command) {
  case 'build':
    await build(args)
    break
  case 'setup':
    await setup(args)
    break
  default:
    console.log('no command specified')
}
