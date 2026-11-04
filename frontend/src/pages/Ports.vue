<template>
    <transition name="slide-fade" appear>
        <div>
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1 class="mb-0">{{ $t("portStatus") }}</h1>
            </div>

            <div class="shadow-box big-padding mb-3">
                <div class="row align-items-end">
                    <!-- Host/Endpoint selector -->
                    <div class="col-md-6">
                        <label class="form-label">{{ $t("portHost") }}</label>
                        <select v-model="endpoint" class="form-select" @change="fetchPortStatus">
                            <option v-for="(agent, agentEndpoint) in $root.agentList" :key="agentEndpoint" :value="agentEndpoint" :disabled="$root.agentStatusList[agentEndpoint] != 'online'">
                                <template v-if="agentEndpoint === ''">{{ $t("currentEndpoint") }}</template>
                                <template v-else>{{ (agent.name !== '') ? agent.name : agent.url }}</template>
                                <template v-if="$root.agentStatusList[agentEndpoint]"> ({{ $root.agentStatusList[agentEndpoint] }})</template>
                            </option>
                        </select>
                    </div>

                    <div class="col-md-6">
                        <button class="btn btn-primary" :disabled="processing" @click="fetchPortStatus">
                            <template v-if="processing">
                                <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                {{ $t("portChecking") }}
                            </template>
                            <template v-else>
                                <font-awesome-icon icon="arrows-rotate" class="me-1" />
                                {{ $t("portRefresh") }}
                            </template>
                        </button>
                    </div>
                </div>

                <div v-if="hostname" class="mt-3 text-secondary">
                    <font-awesome-icon icon="server" class="me-1" />
                    {{ $t("portHostname") }}: <strong>{{ hostname }}</strong>
                </div>
            </div>

            <!-- Port Table -->
            <div v-if="!processing" class="shadow-box big-padding">
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th scope="col">{{ $t("portPort") }}</th>
                                <th scope="col" class="text-center">{{ $t("portAvailable") }}</th>
                                <th scope="col" class="text-center">{{ $t("portInUse") }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(inUse, port) in portList" :key="port">
                                <td class="fw-bold">{{ port }}</td>
                                <td class="text-center">
                                    <span v-if="!inUse" class="badge bg-success">{{ $t("portAvailable") }}</span>
                                    <span v-else class="text-secondary">-</span>
                                </td>
                                <td class="text-center">
                                    <span v-if="inUse" class="badge bg-danger">{{ $t("portInUse") }}</span>
                                    <span v-else class="text-secondary">-</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div v-if="!processing && portList && Object.keys(portList).length === 0" class="shadow-box big-padding text-center text-secondary">
                {{ $t("portNoData") }}
            </div>
        </div>
    </transition>
</template>

<script>
export default {
    data() {
        return {
            endpoint: "",
            processing: true,
            portList: {},
            hostname: "",
        };
    },
    mounted() {
        this.fetchPortStatus();
    },
    methods: {
        fetchPortStatus() {
            this.processing = true;
            this.$root.emitAgent(this.endpoint, "getPortStatus", 4000, 4020, (res) => {
                if (res.ok) {
                    this.portList = res.ports;
                    this.hostname = res.hostname;
                } else {
                    this.$root.toastRes(res);
                    this.portList = {};
                    this.hostname = "";
                }
                this.processing = false;
            });
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../styles/vars.scss";

.shadow-box {
    padding: 20px;
}

table {
    font-size: 14px;

    th {
        background-color: rgba(0, 0, 0, 0.03);
    }
}
</style>