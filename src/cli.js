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

    if (!options.inception && process.env.AWS_SESSION_EXPIRES) {
        console.log(
            "WARNING:\n"+
            "You are running Locksmith from a shell that was spawned " +
            "from Locksmith itself. This is probably not what you want, exit " +
            "this shell and start Locksmith again. If you indeed intended to run " +
            "Locksmith using the currently assumed role, please use the " +
            "-inception argument.")
        
        return;
    }
    
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

    await setupAws(response)

}