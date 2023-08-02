import yargs from 'yargs';
import * as fs from 'fs'

export type InputParameters = { path: any }

export function inputParameters(): InputParameters {
    const args = <InputParameters>yargs(process.argv.slice(2))
        .options({
            path: {
                alias: 'p',
                description: 'The path which contains git repositories',
                demandOption: true
            }
        })
        .coerce('path', path => {
            const isDirectory = fs.lstatSync(path).isDirectory()
            if (!isDirectory) throw Error('Not a directory')
            return path
        })
        .argv
    return args
}

