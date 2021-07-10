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

    var roleToAssume = {
        RoleArn: `arn:aws:iam::${options.account.accountNumber}:role/${options.account.roleName}`,
        RoleSessionName: 'AssumeRoleSession',
        SerialNumber: options.account.mfaSerial,
        TokenCode: options.mfa,
        DurationSeconds: 3600,
    };

    var roleCreds;

    // Create the STS service object    
    var sts = new AWS.STS({ apiVersion: '2011-06-15' });

    //Assume Role
    try {
        const assumedRole = await sts.assumeRole(roleToAssume).promise();

        const spawnProc = spawn("pwsh", [], {
            stdio: "inherit",
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
    
    const credentialsfile = fs.readFileSync(homedir + "\\.aws\\credentials", 'utf-8');
    const credentials = ini.parse(credentialsfile);
    console.log(credentials);
    console.log(credentials.locksmith.beagle_url);
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
                    accountName: b.account_name,
                    mfaSerial: credentials.locksmith.mfa_serial
                }
            }))
    } catch (error) {
        console.error(error);
    }

    return [];
}