import { ChildProcess } from 'child_process'
import chokidar from 'chokidar'
import { Message, start, State } from './actor'

const args = process.argv.slice(2)

const path = args[0]
const command = args[1]
const commandArgs = args.slice(2)

if (path === undefined || command === undefined) {
    console.log('Usage: node ./reload.js path/to/watch command arg0 arg1')
    process.exit(-1)
}

const [firstState, next] = start(command, commandArgs)
let currentState: State = firstState

addChildHandlers(firstState.child)

const watcher = chokidar.watch(path, {
    ignoreInitial: true
})

watcher.on('add', onWatchChange)
watcher.on('addDir', onWatchChange)
watcher.on('unlink', onWatchChange)
watcher.on('unlinkDir', onWatchChange)

process.once('SIGINT', () => {
    console.log()

    onMessage({
        type: 'shutdown'
    })
})

function onWatchChange() {
    onMessage({ type: 'watchChange' })
}

function onMessage(m: Message) {
    if (currentState.type === 'end') {
        return
    }

    const newState = next(currentState, m)
    
    //console.log(`${currentState.type} + ${m.type} -> ${newState.type}`)

    if (newState.type === 'end') {
        watcher.close()
        return
    }

    if (newState.child !== currentState.child) {
        addChildHandlers(newState.child)
    }

    currentState = newState
}

function addChildHandlers(child: ChildProcess) {
    child.on('error', error => onMessage({
        type: 'error',
        error
    }))

    child.on('exit', (code, signal) => onMessage({
        type: 'exit',
        code,
        signal
    }))

    child.on('spawn', () => onMessage({
        type: 'spawn'
    }))
}
