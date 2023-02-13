"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chokidar_1 = __importDefault(require("chokidar"));
const actor_1 = require("./actor");
const isIn_1 = require("./isIn");
const args = process.argv.slice(2);
const modes = ['all', 'no-edits'];
const mode = args[0];
const path = args[1];
const command = args[2];
const commandArgs = args.slice(3);
if (path === undefined || !(0, isIn_1.isIn)(modes, mode) || command === undefined) {
    console.log('Usage: node ./reload.js [all|no-edits] path/to/watch command arg0 arg1');
    console.log();
    console.log('all');
    console.log('  Track add, remove and edit events');
    console.log();
    console.log('no-edits');
    console.log('  Track only add and remove events');
    console.log();
    process.exit(-1);
}
const [firstState, next] = (0, actor_1.start)(command, commandArgs);
let currentState = firstState;
addChildHandlers(firstState.child);
const watcher = chokidar_1.default.watch(path, {
    ignoreInitial: true
});
watcher.on('add', onWatchChange);
watcher.on('addDir', onWatchChange);
watcher.on('unlink', onWatchChange);
watcher.on('unlinkDir', onWatchChange);
if (mode === 'all') {
    watcher.on('change', onWatchChange);
}
process.once('SIGINT', () => {
    console.log();
    onMessage({
        type: 'shutdown'
    });
});
function onWatchChange() {
    onMessage({ type: 'watchChange' });
}
function onMessage(m) {
    if (currentState.type === 'end') {
        return;
    }
    const newState = next(currentState, m);
    //console.log(`${currentState.type} + ${m.type} -> ${newState.type}`)
    if (newState.type === 'end') {
        watcher.close();
        return;
    }
    if (newState.child !== currentState.child) {
        addChildHandlers(newState.child);
    }
    currentState = newState;
}
function addChildHandlers(child) {
    child.on('error', error => onMessage({
        type: 'error',
        error
    }));
    child.on('exit', (code, signal) => onMessage({
        type: 'exit',
        code,
        signal
    }));
    child.on('spawn', () => onMessage({
        type: 'spawn'
    }));
}
