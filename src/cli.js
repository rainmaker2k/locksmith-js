import arg from 'arg';
import prompts from 'prompts';
import { setupAws, retrieveBookmarks } from './main';


function parseArgumentsIntoOptions(rawArgs) {
    const args = arg(
        {
            '--inception': Boolean,
            '--version': Boolean,
            '-i': '--inception',
        },
        {
            argv: rawArgs.slice(2),
        }
    );
    return {
        inception: args['--inception'] || false,
        version: args['--version'] || false,
    };
}

export async function cli(args) {
    let options = parseArgumentsIntoOptions(args);
    let bookmarks = await retrieveBookmarks();
    const response = await prompts([
        {
            type: 'autocomplete',
            name: 'account',
            message: 'Select account',
            choices: bookmarks
        },
        {
            type: 'text',
            name: 'mfa',
            message: 'MFA Token',
            validate: val => val.match(/^[0-9]{6}$/)
        }
    ]);

    setupAws(response)

    console.log(response);

}