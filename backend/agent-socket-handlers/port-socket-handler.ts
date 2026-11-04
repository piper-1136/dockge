import net from "net";
import os from "os";
import { AgentSocketHandler } from "../agent-socket-handler";
import { DockgeServer } from "../dockge-server";
import { callbackError, callbackResult, checkLogin, DockgeSocket, ValidationError } from "../util-server";
import { AgentSocket } from "../../common/agent-socket";

export class PortSocketHandler extends AgentSocketHandler {
    create(socket : DockgeSocket, server : DockgeServer, agentSocket : AgentSocket) {

        // Get port occupancy status for the host this server runs on
        agentSocket.on("getPortStatus", async (startPort : unknown, endPort : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(startPort) !== "number" || typeof(endPort) !== "number") {
                    throw new ValidationError("startPort and endPort must be numbers");
                }

                if (startPort > endPort) {
                    throw new ValidationError("startPort must be less than or equal to endPort");
                }

                callbackResult({
                    ok: true,
                    hostname: os.hostname(),
                    ports: await this.getPortStatusList(startPort, endPort),
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });
    }

    /**
     * Check if a single port is in use by attempting to bind to it.
     * @param port Port number to check
     * @returns true if the port is in use, false otherwise
     */
    async isPortInUse(port : number) : Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();

            server.once("error", () => {
                resolve(true);
            });

            server.listen(port, "0.0.0.0", () => {
                server.close(() => {
                    resolve(false);
                });
            });
        });
    }

    /**
     * Get the occupancy status for a range of ports.
     * @param startPort Starting port number (inclusive)
     * @param endPort Ending port number (inclusive)
     * @returns List of port status objects
     */
    async getPortStatusList(startPort : number, endPort : number) : Promise<Record<string, boolean>> {
        const result : Record<string, boolean> = {};

        for (let port = startPort; port <= endPort; port++) {
            result[port] = await this.isPortInUse(port);
        }

        return result;
    }
}