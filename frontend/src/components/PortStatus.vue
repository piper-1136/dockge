<template>
    <div>
        <h2 class="mb-3">
            {{ $t("homePortStatus") }}
            <button class="btn btn-sm btn-outline-secondary ms-2" :disabled="loading" @click="loadAll">
                <font-awesome-icon icon="arrows-rotate" :spin="loading" />
            </button>
        </h2>

        <div v-if="loading && Object.keys(hostList).length === 0" class="text-secondary">
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            {{ $t("portChecking") }}
        </div>

        <div v-for="(host, endpoint) in hostList" :key="endpoint" class="shadow-box big-padding mb-3 port-host">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="mb-0">
                    <font-awesome-icon icon="server" class="me-2" />
                    {{ host.displayName }}
                    <span v-if="host.hostname" class="text-secondary small">{{ host.hostname }}</span>
                </h5>
                <div>
                    <span v-if="host.loading" class="badge bg-secondary">{{ $t("portChecking") }}</span>
                    <span v-else-if="host.error" class="badge bg-danger">{{ $t("portError") }}</span>
                    <span v-else class="badge bg-success">{{ $t("portAllChecked") }}</span>
                </div>
            </div>

            <div v-if="host.error" class="text-danger small">{{ host.error }}</div>

            <div v-else class="port-grid">
                <div v-for="(inUse, port) in host.ports" :key="port" class="port-cell" :class="inUse ? 'port-in-use' : 'port-available'" :title="`${port}: ${inUse ? $t('portInUse') : $t('portAvailable')}`">
                    <div class="port-number">{{ port }}</div>
                    <div class="port-status">{{ inUse ? $t("portInUse") : $t("portAvailable") }}</div>
                </div>
            </div>
        </div>

        <div v-if="!loading && Object.keys(hostList).length === 0" class="text-secondary">
            {{ $t("portNoHost") }}
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            loading: false,
            hostList: {},
        };
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
         * Is the endpoint currently online / reachable
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
         * Load port status for all hosts (local and all configured agents)
         */
        loadAll() {
            this.loading = true;

            // Build the list of endpoints to query
            const endpointList = Object.keys(this.$root.agentList);

            // Initialize / refresh the host list
            for (const endpoint of endpointList) {
                if (!this.hostList[endpoint]) {
                    this.hostList[endpoint] = {
                        displayName: this.endpointDisplay(endpoint),
                        hostname: "",
                        ports: {},
                        loading: false,
                        error: "",
                    };
                } else {
                    this.hostList[endpoint].loading = false;
                    this.hostList[endpoint].error = "";
                }
            }

            // Remove hosts that are no longer in the agent list
            for (const endpoint of Object.keys(this.hostList)) {
                if (!endpointList.includes(endpoint)) {
                    delete this.hostList[endpoint];
                }
            }

            // Determine which endpoints to query (only online ones)
            const queryList = endpointList.filter(endpoint => this.isOnline(endpoint));

            // Mark offline endpoints as skipped
            for (const endpoint of endpointList) {
                if (!this.isOnline(endpoint) && this.hostList[endpoint]) {
                    this.hostList[endpoint].error = this.$t("portHostOffline");
                }
            }

            if (queryList.length === 0) {
                this.loading = false;
                return;
            }

            let done = 0;
            const total = queryList.length;

            for (const endpoint of queryList) {
                this.hostList[endpoint].loading = true;
                this.$root.emitAgent(endpoint, "getPortStatus", 4000, 4020, (res) => {
                    if (endpoint in this.hostList) {
                        if (res.ok) {
                            this.hostList[endpoint].ports = res.ports;
                            this.hostList[endpoint].hostname = res.hostname;
                        } else {
                            this.hostList[endpoint].error = res.msg || this.$t("portError");
                        }
                        this.hostList[endpoint].loading = false;
                    }

                    done++;
                    if (done >= total) {
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
            const agent = this.$root.agentList[endpoint];
            if (!agent) {
                return endpoint || this.$t("currentEndpoint");
            }
            if (endpoint === "") {
                return agent.name && agent.name !== "" ? agent.name : this.$t("currentEndpoint");
            }
            return agent.name && agent.name !== "" ? agent.name : agent.url;
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