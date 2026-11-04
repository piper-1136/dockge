<template>
    <div>
        <h2 class="mb-3">
            {{ $t("homePortStatus") }}
            <button class="btn btn-sm btn-outline-secondary ms-2" :disabled="loading" @click="loadAll">
                <font-awesome-icon icon="arrows-rotate" :spin="loading" />
            </button>
        </h2>

        <div v-if="loading && hostEntries.length === 0" class="text-secondary">
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            {{ $t("portChecking") }}
        </div>

        <div v-for="entry in hostEntries" :key="entry.key" class="shadow-box big-padding mb-3 port-host">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="mb-0">
                    <font-awesome-icon icon="server" class="me-2" />
                    {{ entry.name }}
                </h5>
                <div>
                    <span v-if="!entry.error && Object.keys(entry.ports).length === 0" class="badge bg-warning">{{ $t("portNoFile") }}</span>
                    <span v-else-if="entry.error" class="badge bg-danger">{{ $t("portError") }}</span>
                    <span v-else class="badge bg-success">{{ $t("portAllChecked") }}</span>
                </div>
            </div>

            <div v-if="entry.error" class="text-danger small">{{ entry.error }}</div>

            <template v-else-if="Object.keys(entry.ports).length > 0">
                <div class="port-grid">
                    <div v-for="(inUse, port) in sortedPorts(entry.ports)" :key="port" class="port-cell" :class="inUse ? 'port-in-use' : 'port-available'" :title="`${port}: ${inUse ? $t('portInUse') : $t('portAvailable')}`">
                        <div class="port-number">{{ port }}</div>
                        <div class="port-status">{{ inUse ? $t("portInUse") : $t("portAvailable") }}</div>
                    </div>
                </div>
            </template>
        </div>

        <div v-if="!loading && hasQueriedHosts && hostEntries.length === 0" class="text-secondary">
            {{ $t("portNoHost") }}
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            loading: false,
            hasQueriedHosts: false,
            // Flat list of host cards, each: { key, name, ports, error }
            hosts: [],
        };
    },
    computed: {
        hostEntries() {
            return this.hosts;
        },
    },
    mounted() {
        this.loadAll();

        // Reload when the agent list or agent status on the root changes
        this.$watch(() => this.$root.agentList, () => {
            this.loadAll();
        }, { deep: true });

        this.$watch(() => this.$root.agentStatusList, () => {
            this.loadAll();
        }, { deep: true });
    },
    methods: {
        /**
         * Is the given endpoint currently online / reachable
         * @param {string} endpoint Endpoint key
         * @returns {boolean} Whether the endpoint is reachable
         */
        isOnline(endpoint) {
            if (endpoint === "") {
                return true;
            }
            return this.$root.agentStatusList[endpoint] === "online";
        },

        /**
         * Sort ports numerically ascending
         * @param {object} portMap Map of port -> in-use boolean
         * @returns {Array} Sorted array of [port, inUse] entries
         */
        sortedPorts(portMap) {
            const entries = Object.entries(portMap);
            entries.sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10));
            return entries;
        },

        /**
         * Load port configuration from the local server and all online agents.
         * Each source returns a map of hostname -> { port: inUse }.
         */
        loadAll() {
            this.loading = true;

            // Build the list of endpoints to query
            const endpointList = Object.keys(this.$root.agentList);
            const onlineList = endpointList.filter(endpoint => this.isOnline(endpoint));

            // Reset host list to reflect only what we see
            const accumulated = [];

            let done = 0;
            const total = onlineList.length;

            if (total === 0) {
                this.loading = false;
                return;
            }

            for (const endpoint of onlineList) {
                this.$root.emitAgent(endpoint, "getPortConfig", (res) => {
                    if (res && res.ok) {
                        const hosts = res.hosts || {};
                        for (const hostname in hosts) {
                            const ports = hosts[hostname] || {};
                            accumulated.push({
                                key: endpoint + "|" + hostname,
                                name: hostname,
                                ports,
                                error: "",
                            });
                        }
                    } else {
                        const errMsg = (res && res.msg) ? res.msg : this.$t("portError");
                        accumulated.push({
                            key: endpoint + "|_error_",
                            name: this.endpointDisplay(endpoint),
                            ports: {},
                            error: errMsg,
                        });
                    }

                    done++;
                    if (done >= total) {
                        this.hosts = accumulated;
                        this.hasQueriedHosts = true;
                        this.loading = false;
                    }
                });
            }
        },

        /**
         * Get the display name for an endpoint
         * @param {string} endpoint Endpoint key
         * @returns {string} Display name
         */
        endpointDisplay(endpoint) {
            if (endpoint === "") {
                return this.$t("currentEndpoint");
            }
            const agent = this.$root.agentList[endpoint];
            if (!agent) {
                return endpoint;
            }
            return agent.name && agent.name !== "" ? agent.name : endpoint;
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../styles/vars.scss";

.port-host {
    padding: 15px 20px;
}

.port-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
    gap: 8px;
}

.port-cell {
    border-radius: 6px;
    padding: 4px 6px;
    text-align: center;
    border: 1px solid #ddd;
    font-size: 12px;
}

.port-number {
    font-weight: bold;
    font-size: 13px;
}

.port-status {
    font-size: 11px;
    opacity: 0.8;
}

.port-available {
    background-color: rgba(40, 167, 69, 0.12);
    border-color: rgba(40, 167, 69, 0.4);
    color: #1e7e34;

    .dark & {
        color: #5cb85c;
    }
}

.port-in-use {
    background-color: rgba(220, 53, 69, 0.12);
    border-color: rgba(220, 53, 69, 0.4);
    color: #c82333;

    .dark & {
        color: #f08a94;
    }
}
</style>