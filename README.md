Runs a command and restarts it whenever a file is added, removed,
or edited in the given directory. Can ignore edit events

```
node ./reload.js all path/to/watch command arg0 arg1 arg2
node ./reload.js no-edits path/to/watch_without_edits command arg0 arg1
```
