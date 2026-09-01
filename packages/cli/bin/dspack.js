#!/usr/bin/env node
import { main } from '../src/cli.js';

await main(process.argv.slice(2));