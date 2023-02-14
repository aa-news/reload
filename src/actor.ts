import { ChildProcess, spawn } from 'child_process'
import { assertNever } from 'assert-never';

export type Message = {
    type: 'spawn'
} | {
    type: 'error'
    error: Error
} | {
    type: 'exit'
    code: number | null
    signal: string | null
} | {
    type: 'watchChange'
} | {
    type: 'shutdown'
};

export type FirstState = {
    type: 'starting'
    child: ChildProcess
    afterRespawn: boolean
};

export type State = FirstState | {
    type: 'end'
} | {
    type: 'running'
    child: ChildProcess
} | {
    type: 'waitingForExit'
    child: ChildProcess
} | {
    type: 'killingToRespawn'
    child: ChildProcess
}

export type Actor = (s: State, m: Message) => State

export function start(command: string, args: string[]): [FirstState, Actor] {
    function runChild(): ChildProcess {
        return spawn(command, args, { stdio: 'inherit' })
    }

    return [
        {
            type: 'starting',
            child: runChild(),
            afterRespawn: false
        },

        (s, m): State => {
            switch (s.type) {
                case 'starting': {
                    switch (m.type) {
                        case 'error': {
                            console.log('Failed to start the child process')
                            console.log(m.error)
        
                            return { type: 'end' }
                        }
        
                        case 'shutdown': {
                            s.child.kill('SIGINT')
        
                            return {
                                type: 'waitingForExit',
                                child: s.child
                            }
                        }
        
                        case 'spawn': {
                            if (s.afterRespawn) {
                                const timeNow = toTimeString(new Date())
                                console.log(bold + `Restarted at ${timeNow}` + end)
                            }

                            return {
                                type: 'running',
                                child: s.child
                            }
                        }
        
                        case 'exit':
                        case 'watchChange':
                            return s
                    }

                    assertNever(m)
                }

                case 'end':
                    return s

                case 'running': {
                    switch (m.type) {
                        case 'error': {
                            console.log('Child process error: ')
                            console.log(m.error)
        
                            s.child.kill('SIGINT')
        
                            return {
                                type: 'waitingForExit',
                                child: s.child
                            }
                        }
        
                        case 'exit': {
                            console.log('Child process exited by itself')
                            return { type: 'end' }
                        }
        
                        case 'shutdown': {
                            s.child.kill('SIGINT')
        
                            return {
                                type: 'waitingForExit',
                                child: s.child
                            }
                        }
        
                        case 'spawn':
                            return s
        
                        case 'watchChange': {
                            s.child.kill('SIGINT')
        
                            return {
                                type: 'killingToRespawn',
                                child: s.child
                            }
                        }
                    }

                    assertNever(m)
                }

                case 'waitingForExit': {
                    switch (m.type) {
                        case 'error': {
                            console.log('Child process error: ')
                            console.log(m.error)
        
                            return s
                        }
        
                        case 'exit':
                            return { type: 'end' }
        
                        case 'shutdown':
                        case 'spawn':
                        case 'watchChange':
                            return s
                    }
                
                    assertNever(m)
                }

                case 'killingToRespawn': {
                    switch (m.type) {
                        case 'error': {
                            console.log('Error while stopping the child process: ')
                            console.log(m.error)
        
                            return { 
                                type: 'waitingForExit',
                                child: s.child
                            }
                        }
        
                        case 'exit': 
                            return {
                                type: 'starting',
                                child: runChild(),
                                afterRespawn: true
                            }
        
                        case 'shutdown':
                            return {
                                type: 'waitingForExit',
                                child: s.child
                            }
        
                        case 'spawn':
                        case 'watchChange':
                            return s
                    }
    
                    assertNever(m)
                }
            }
        }
    ]
}

function toTimeString(d: Date): string {
    return d.toTimeString().split(' ')[0]!
}

//See https://stackoverflow.com/a/33206814/12983861

//\033 is an octal escape sequence, not supported in strict mode
//We must use hexademical instead. 33 in octal is 1b in hexadecimal

const bold = '\x1b[1m'
const end = '\x1b[22m'
