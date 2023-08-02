# gitmanagement


## How to use

First clone the repository.<br>
Then install, build and make the script executable:

```sh
npm i
npm run build
chmod u+x bin/run.js
```

Finally, we can start using it by giving it a directory so the program can start.

```sh
bin/run.js -p "<path>"
```

### Make it run in linux terminal as command

Add following line into at the end of  `~/.bash_aliases` to show git repos in directory `/<absPath>/someDirectory`  with a simple command:

```bash
alias repos=/<path to gitmanagament>/bin/run.js -p /<absPath>/someDirectory
```

Everytime you run repos now, the git management application will run

## TODOs

- [x] start script from CLI with directory (if cached, use cache)
- [x] clean up
- [] add reload command  (optional)
- [x] Add .bashrc commands