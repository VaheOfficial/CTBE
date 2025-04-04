import kerberos from 'kerberos';
import { logger } from '../utils/logger';
import { exec } from 'child_process';

process.env.KRB5_KTNAME = '/etc/krb5.keytab';
const servicePrincipal = process.env.KERBEROS_SERVICE_PRINCIPAL;

async function kerberosClient() {
    if(!servicePrincipal) {
        logger.error('KERBEROS_SERVICE_PRINCIPAL is not set');
        return;
    }
    try {
        const client = await kerberos.initializeClient(servicePrincipal);
        logger.info('Kerberos client initialized successfully.');
    } catch (err) {
        logger.error(`Failed to initialize Kerberos client: ${err}`);
    }
}


async function kerberosServer() {
    if(!servicePrincipal) {
        logger.error('KERBEROS_SERVICE_PRINCIPAL is not set');
        return;
    }
    try {
        logger.info(`Using keytab file: ${process.env.KRB5_KTNAME}`);
        exec('klist -k ' + process.env.KRB5_KTNAME, (error, stdout, stderr) => {
            if (error) {
                logger.error(`Failed to execute klist command: ${error}`);
            } else {
                logger.info(`klist output: ${stdout}`);
            }
        });
        const server = await kerberos.initializeServer(servicePrincipal);
        logger.info('Kerberos server initialized successfully.');
    } catch (err) {
        logger.error(`Failed to initialize Kerberos server: ${err}`);
    }
}

export { kerberosClient, kerberosServer };