const DEFAULT_CONFIG: any = {
  DEFAULT_NODE_ENV: 'development',
  DEFAULT_PATH_TO_CONFIG_FILE: './configs/deployment_config_',
  DEFAULT_ENVIRONMENTS: {
    local: 'local',
    development: 'dev',
    test: 'test',
    production: 'prod'
  },
  DEFAULT_TM_PORTS: {
    local: 3001,
    development: 80,
    test: 80,
    production: 80
  },
  DEFAULT_WS_PORTS: {
    local: 3000,
    development: 3000,
    test: 3000,
    production: 3000
  },
  DEFAULT_MACHINE_TYPES: {
    TM: 'n1-highmem-2',
    WS: 'n1-standard-2',
    MONGO: 'n1-highmem-2',
    REDIS: 'g1-small'
  },
  DEFAULT_DISK_SIZES: {
    TM: '20GB',
    WS: 20,
    MONGO: '30GB',
    REDIS: '10GB'
  },
  DEFAULT_IMAGE_NAME_SUFFIXES: {
    TM: 'tm',
    WS: 'node'
  },
  DEFAULT_MACHINE_SUFFIXES: [
    'TM',
    'WS'
  ],
  DEFAULT_GCP_VARIABLES: {
    GCLOUD_SERVICE_KEY_STG: '',
    ENABLE_AUTOSCALING: true,
    DEFAULT_REGION: 'europe-west1',
    MAX_NODES_PER_POOL: 100,
    MAX_NODES: 5,
    MIN_NODES: 1,
    NUM_NODES: 1,
    MAX_NUMBER_REPLICAS: 5,
    MIN_NUMBER_REPLICAS: 1,
    NUMBER_REPLICAS: 1,
    CPU_PERCENT: 40,
    REDIS_CONTAINER_IMAGE: 'docker.io/redis:4.0.2',
    MONGODB_CONTAINER_IMAGE: 'docker.io/mongo:3.6.3',
    SOURCE_PORT: 80,
    DEFAULT_MONGODB_PORT: 27017,
    DEFAULT_MONGODB_PATH: '/data/db',
    CREATE_CLUSTER__ALLOWED_PARAMS: [
      'IMAGE_TYPE',
      'MACHINE_TYPE',
      'MAX_NODES_PER_POOL',
      'ENABLE_AUTOSCALING',
      'NUM_NODES',
      'ZONE',
      'MAX_NODES',
      'MIN_NODES'
    ],
    FIREWALL_RULE__ALLOWED_PORTS: 'tcp:80,tcp:443'
  },
  DEFAULT_GCP_API: [
    'compute.googleapis.com',
    'containerregistry.googleapis.com',
    'logging.googleapis.com',
    'container.googleapis.com'
  ]
};

export { DEFAULT_CONFIG };
