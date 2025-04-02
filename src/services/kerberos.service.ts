import kerberos from "kerberos";
import { logger } from "../utils/logger";

const servicePrincipal = process.env.KERBEROS_SERVICE_PRINCIPAL;
logger.info(`KERBEROS_SERVICE_PRINCIPAL: ${servicePrincipal}`);

async function kerberosClient() {
    if(!servicePrincipal) {
        throw new Error("KERBEROS_SERVICE_PRINCIPAL is not set");
    }
    const client = kerberos.initializeClient(servicePrincipal, {}, (err, client) => {
        if(err) {
            logger.error(err);
            return;
        }

        client.step('', (err, response) => {
            if(err) {
                logger.error(err);
                return;
            }
            console.log(response);
        });
    });

    return client;
}

export default kerberosClient;

