import got from 'got';
import os from 'os';
import ini from 'ini';
import fs from 'fs';
import { promisify } from 'util';
import AWS from 'aws-sdk';
import { spawn } from 'child_process';


export async function setupAws(options) {
    var credentials = new AWS.SharedIniFileCredentials({ profile: 'locksmith' });
    AWS.config.update({ region: 'REGION', credentials: credentials });

    const roleToAssume = {
        RoleArn: `arn:aws:iam::${options.account.accountNumber}:role/${options.account.roleName}`,
        RoleSessionName: 'AssumeRoleSession',
        SerialNumber: options.account.mfaSerial,
        TokenCode: options.mfa,
        DurationSeconds: 3600,
    };

    // Create the STS service object    
    const sts = new AWS.STS({ apiVersion: '2011-06-15' });

    //Assume Role
    try {
        const assumedRole = await sts.assumeRole(roleToAssume).promise();

        const spawnProc = shell({
            env: {
                ...process.env,
                AWS_ACCESS_KEY_ID: assumedRole.Credentials.AccessKeyId,
                AWS_ASSUMED_ROLE_ARN: roleToAssume.RoleArn,
                AWS_SECRET_ACCESS_KEY: assumedRole.Credentials.SecretAccessKey,
                AWS_SECURITY_TOKEN: assumedRole.Credentials.SessionToken,
                AWS_SESSION_ACCOUNT_ID: options.account.accountNumber,
                AWS_SESSION_ACCOUNT_NAME: options.account.accountName,
                AWS_SESSION_EXPIRES: Math.floor(new Date(assumedRole.Credentials.Expiration).getTime() / 1000),
                AWS_SESSION_TOKEN: assumedRole.Credentials.SessionToken,
                AWS_SESSION_USER_ARN: assumedRole.AssumedRoleUser.Arn,
                AWS_SESSION_USER_ID: assumedRole.AssumedRoleUser.AssumedRoleId,
                PS1: "\\[\\e[31m\\]" + options.account.accountNumber + "\\[\\e[m\\]: \\[\\e[33m\\]" + options.account.accountName + " \\[\\e[31m\\]\\w\\[\\e[m\\] $ "
            }
        })

        spawnProc.on('close', (code) => {
            if (code !== 0) {
                console.log(`grep process exited with code ${code}`);
            }
        });
    } catch (err) {
        console.error(err)
    }
}

export async function retrieveBookmarks() {
    const homedir = os.homedir();
    
    const credentialsfile = fs.readFileSync(homedir + "/.aws/credentials", 'utf-8');
    const credentials = ini.parse(credentialsfile);
    try {
        
        const { body } = await got(credentials.locksmith.beagle_url, { 
            username: 'n/a',
            password: credentials.locksmith.beagle_pass,
            responseType: 'json'
        });
    
        return body.bookmarks
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(b => ({
                title: `${b.name}: ${b.account_number}`,
                value: {
                    roleName: b.role_name,
                    accountNumber: b.account_number,
                    accountName: b.name,
                    mfaSerial: credentials.locksmith.mfa_serial
                }
            }))
    } catch (error) {
        console.error(error);
    }

    return [];
}

export function shell(options) {
    const customShell = process.env.LOCKSMITH_SHELL; 
    
    if (customShell) {
        return spawn(customShell, ["-NoExit", "-command", "function prompt { \"PS[$([char]27)[31m$env:AWS_SESSION_ACCOUNT_NAME $([char]27)[33m($env:AWS_SESSION_ACCOUNT_ID#)$([char]27)[0m] >\" }"], {
            ...options,
            stdio: 'inherit'
        })
    }

    if (process.platform !== 'win32') {
        var shell = os.platform() === 'android' ? 'sh' : '/bin/bash'
        return spawn(shell, ['--noprofile', '-l'], {
            ...options,
            stdio: 'inherit'
        })
    }

    return spawn(process.env.comspec || 'cmd.exe', [], {
        ...options,
        stdio: 'inherit'
    })
}