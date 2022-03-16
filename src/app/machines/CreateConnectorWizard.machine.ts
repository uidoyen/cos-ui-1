import { UserProvidedServiceAccount } from '@apis/api';
import { basicMachine } from '@app/machines/StepBasic.machine';
import { clustersMachine } from '@app/machines/StepClusters.machine';
import { configuratorMachine } from '@app/machines/StepConfigurator.machine';
import {
  configuratorLoaderMachine,
  ConnectorConfiguratorType,
} from '@app/machines/StepConfiguratorLoader.machine';
import { connectorTypesMachine } from '@app/machines/StepConnectorTypes.machine';
import { errorHandlingMachine } from '@app/machines/StepErrorHandling.machine';
import { kafkasMachine } from '@app/machines/StepKafkas.machine';
import { namespacesMachine } from '@app/machines/StepNamespace.machine';
import { reviewMachine } from '@app/machines/StepReview.machine';

import { assign, InterpreterFrom, send } from 'xstate';
import { createModel } from 'xstate/lib/model';

import {
  ConnectorCluster,
  ConnectorType,
} from '@rhoas/connector-management-sdk';
import { KafkaRequest } from '@rhoas/kafka-management-sdk';

const defaultConnectorMCS = {
  id: 'debezium-mongodb-1.9.0.Alpha1',
  kind: 'ConnectorType',
  href: '/api/connector_mgmt/v1/kafka_connector_types/debezium-mongodb-1.9.0.Alpha1',
  name: 'Debezium MongoDB Connector',
  version: '1.9.0.Alpha1',
  channels: ['stable'],
  icon_href: 'http://example.com/images/debezium-mongodb-1.9.0.Alpha1.png',
  labels: ['source', 'debezium', 'mongodb', '1.9.0.Alpha1'],
  schema: {
    $defs: {
      serializer: {
        default: 'JSON',
        enum: ['JSON', 'AVRO', 'JSON_WITHOUT_SCHEMA'],
        type: 'string',
      },
    },
    additionalProperties: true,
    properties: {
      'collection.exclude.list': {
        description:
          'A comma-separated list of regular expressions that match the collection names for which changes are to be excluded',
        type: 'string',
        'x-category': 'FILTERS',
        'x-name': 'collection.exclude.list',
      },
      'collection.include.list': {
        description:
          'A comma-separated list of regular expressions that match the collection names for which changes are to be captured',
        format: 'list,regex',
        title: 'Include Collections',
        type: 'string',
        'x-category': 'FILTERS',
        'x-name': 'collection.include.list',
      },
      data_shape: {
        additionalProperties: false,
        properties: {
          key: {
            $ref: '#/$defs/serializer',
            description: 'The serialization format for the Kafka message key.',
            title: 'Kafka Message Key Format',
            'x-category': 'CONNECTOR',
            'x-name': 'data_shape.key',
          },
          value: {
            $ref: '#/$defs/serializer',
            description:
              'The serialization format for the Kafka message value.',
            title: 'Kafka Message Value Format',
            'x-category': 'CONNECTOR',
            'x-name': 'data_shape.value',
          },
        },
        type: 'object',
      },
      'database.exclude.list': {
        description:
          'A comma-separated list of regular expressions that match the database names for which changes are to be excluded',
        format: 'list,regex',
        title: 'Exclude Databases',
        type: 'string',
        'x-category': 'FILTERS',
        'x-name': 'database.exclude.list',
      },
      'database.include.list': {
        description:
          'A comma-separated list of regular expressions that match the database names for which changes are to be captured',
        format: 'list,regex',
        title: 'Include Databases',
        type: 'string',
        'x-category': 'FILTERS',
        'x-name': 'database.include.list',
      },
      'field.exclude.list': {
        description:
          'A comma-separated list of the fully-qualified names of fields that should be excluded from change event message values',
        title: 'Exclude Fields',
        type: 'string',
        'x-category': 'FILTERS',
        'x-name': 'field.exclude.list',
      },
      'max.batch.size': {
        default: 2048,
        description:
          'Maximum size of each batch of source records. Defaults to 2048.',
        format: 'int32',
        title: 'Change event batch size',
        type: 'integer',
        'x-category': 'ADVANCED',
        'x-name': 'max.batch.size',
      },
      'max.queue.size': {
        default: 8192,
        description:
          'Maximum size of the queue for change events read from the database log but not yet recorded or forwarded. Defaults to 8192, and should always be larger than the maximum batch size.',
        format: 'int32',
        title: 'Change event buffer size',
        type: 'integer',
        'x-category': 'ADVANCED',
        'x-name': 'max.queue.size',
      },
      'mongodb.authsource': {
        default: 'admin',
        description: 'Database containing user credentials.',
        title: 'Credentials Database',
        type: 'string',
        'x-category': 'CONNECTION_ADVANCED',
        'x-name': 'mongodb.authsource',
      },
      'mongodb.hosts': {
        description:
          "The hostname and port pairs (in the form 'host' or 'host:port') of the MongoDB server(s) in the replica set.",
        format: 'list,regex',
        title: 'Hosts',
        type: 'string',
        'x-category': 'CONNECTION',
        'x-name': 'mongodb.hosts',
      },
      'mongodb.name': {
        description:
          'Unique name that identifies the MongoDB replica set or cluster and all recorded offsets, andthat is used as a prefix for all schemas and topics. Each distinct MongoDB installation should have a separate namespace and monitored by at most one Debezium connector.',
        nullable: false,
        title: 'Namespace',
        type: 'string',
        'x-category': 'CONNECTION',
        'x-name': 'mongodb.name',
      },
      'mongodb.password': {
        description:
          'Password to be used when connecting to MongoDB, if necessary.',
        oneOf: [
          {
            description:
              'Password of the database user to be used when connecting to the database.',
            format: 'password',
            type: 'string',
          },
          {
            additionalProperties: true,
            description: 'An opaque reference to the password.',
            properties: {},
            type: 'object',
          },
        ],
        title: 'Password',
        'x-category': 'CONNECTION',
        'x-name': 'mongodb.password',
      },
      'mongodb.user': {
        description: 'Database user for connecting to MongoDB, if necessary.',
        title: 'User',
        type: 'string',
        'x-category': 'CONNECTION',
        'x-name': 'mongodb.user',
      },
      'query.fetch.size': {
        default: 0,
        description:
          'The maximum number of records that should be loaded into memory while streaming.  A value of `0` uses the default JDBC fetch size.',
        format: 'int32',
        title: 'Query fetch size',
        type: 'integer',
        'x-category': 'ADVANCED',
        'x-name': 'query.fetch.size',
      },
      'snapshot.mode': {
        default: 'initial',
        description:
          "The criteria for running a snapshot upon startup of the connector. Options include: 'initial' (the default) to specify the connector should always perform an initial sync when required; 'never' to specify the connector should never perform an initial sync ",
        enum: ['never', 'initial'],
        title: 'Snapshot mode',
        type: 'string',
        'x-category': 'CONNECTOR_SNAPSHOT',
        'x-name': 'snapshot.mode',
      },
    },
    required: ['mongodb.name'],
    title: 'Debezium MongoDB Connector',
    type: 'object',
    'x-className': 'io.debezium.connector.mongodb.MongoDbConnector',
    'x-connector-id': 'mongodb',
    'x-version': '1.9.0.Alpha1',
  },
};
const defaultSelectedKafkaInstance = {
  id: 'c8ocail8ad2m04gkj9jg',
  kind: 'Kafka',
  href: '/api/kafkas_mgmt/v1/kafkas/c8ocail8ad2m04gkj9jg',
  status: 'ready',
  cloud_provider: 'aws',
  multi_az: true,
  region: 'us-east-1',
  owner: 'hchirino_kafka_supporting',
  name: 'hchirino',
  bootstrap_server_host:
    'hchirino-c-ocail-ad-m--gkj-jg.bf2.kafka.rhcloud.com:443',
  created_at: '2022-03-15T16:56:42.832196Z',
  updated_at: '2022-03-15T18:54:16.109361Z',
  version: '3.0.0',
  instance_type: 'eval',
  reauthentication_enabled: true,
  kafka_storage_size: '1000Gi',
};
const defaultNameSpace = {
  id: 'c8nocs791m19io0n1qh0',
  kind: 'ConnectorNamespace',
  href: '/api/connector_mgmt/v1/kafka_connector_namespaces/c8nocs791m19io0n1qh0',
  owner: 'asansari_kafka_supporting',
  created_at: '2022-03-14T23:46:16.13866+05:30',
  modified_at: '2022-03-14T23:46:16.13866+05:30',
  name: 'default-connector-namespace',
  annotations: [
    {
      name: 'connector_mgmt.api.openshift.com/profile',
      value: 'default-profile',
    },
  ],
  version: 5,
  cluster_id: 'c8nocs791m19io0n1qgg',
  tenant: {
    kind: 'organisation',
    id: '13888347',
  },
};
// const defaultConfiguration = {
//   data_shape: { consumes: { format: 'application/octet-stream' } },
//   aws_access_key: 'Access Key',
//   aws_cw_namespace: 'cloud watch',
//   aws_region: 'AWS Region',
//   aws_secret_key: 'Secret Keyy',
//   kafka_topic: 'Topic Names ',
//   error_handler: { stop: {} },
// };
type Context = {
  accessToken: () => Promise<string>;
  connectorsApiBasePath: string;
  kafkaManagementApiBasePath: string;
  selectedKafkaInstance?: KafkaRequest;
  selectedCluster?: ConnectorCluster;
  selectedNamespace?: unknown;
  selectedConnector?: ConnectorType;
  Configurator?: ConnectorConfiguratorType;
  configurationSteps?: string[] | false;
  activeConfigurationStep?: number;
  isConfigurationValid?: boolean;
  connectorConfiguration?: unknown;
  name: string;
  topic: string;
  userServiceAccount: UserProvidedServiceAccount;
  userErrorHandler: string;
  onSave?: () => void;
};

const model = createModel({} as Context, {
  events: {
    isValid: () => ({}),
    isInvalid: () => ({}),
    prev: () => ({}),
    next: () => ({}),
    changedStep: ({ step }: { step: number }) => ({ step }),
    jumpToSelectKafka: () => ({}),
    jumpToSelectNamespace: () => ({}),
    jumpToSelectConnector: () => ({}),
    jumpToConfigureConnector: ({ subStep }: { subStep?: number }) => ({
      subStep,
    }),
    jumpToBasicConfiguration: () => ({}),
    jumpToErrorConfiguration: () => ({}),
    jumpToReviewConfiguration: () => ({}),
  },
  actions: {
    notifySave: () => ({}),
  },
});

export const creationWizardMachine = model.createMachine(
  {
    id: 'creationWizard',
    initial: 'selectConnector',
    context: model.initialContext,
    states: {
      selectConnector: {
        initial: 'selecting',
        invoke: {
          id: 'selectConnectorRef',
          src: connectorTypesMachine,
          data: (context) => ({
            accessToken: context.accessToken,
            connectorsApiBasePath: context.connectorsApiBasePath,
            selectedConnector:
              context.selectedConnector == undefined
                ? defaultConnectorMCS
                : context.selectedConnector,
          }),
          onDone: {
            target: 'selectKafka',
            actions: assign((_context, event) => ({
              selectedConnector: event.data.selectedConnector,
              connectorConfiguration: false,
              activeConfigurationStep: 0,
              isConfigurationValid: false,
              configurationSteps: false,
            })),
          },
          onError: '.error',
        },
        states: {
          error: {},
          selecting: {
            on: {
              isValid: 'valid',
            },
          },
          valid: {
            on: {
              isInvalid: 'selecting',
              next: {
                actions: send('confirm', { to: 'selectConnectorRef' }),
              },
            },
          },
        },
      },
      selectKafka: {
        initial: 'selecting',
        invoke: {
          id: 'selectKafkaInstanceRef',
          src: kafkasMachine,
          data: (context) => ({
            accessToken: context.accessToken,
            connectorsApiBasePath: context.connectorsApiBasePath,
            selectedInstance: defaultSelectedKafkaInstance,
            request: {
              page: 1,
              size: 10,
            },
          }),
          onDone: {
            target: 'selectNamespace',
            actions: assign({
              selectedKafkaInstance: (_, event) => event.data.selectedInstance,
            }),
          },
          onError: '.error',
        },
        states: {
          error: {},
          selecting: {
            on: {
              isValid: 'valid',
            },
          },
          valid: {
            on: {
              isInvalid: 'selecting',
              next: {
                actions: send('confirm', { to: 'selectKafkaInstanceRef' }),
              },
            },
          },
        },
        on: {
          prev: 'selectConnector',
        },
      },
      selectNamespace: {
        initial: 'selecting',
        invoke: {
          id: 'selectNamespaceRef',
          src: namespacesMachine,
          data: (context) => ({
            accessToken: context.accessToken,
            connectorsApiBasePath: context.connectorsApiBasePath,
            selectedNamespace: defaultNameSpace,
          }),
          onDone: {
            target: 'basicConfiguration',
            actions: assign({
              selectedNamespace: (_, event) => event.data.selectedNamespace,
            }),
          },
          onError: '.error',
        },
        states: {
          error: {},
          selecting: {
            on: {
              isValid: 'valid',
            },
          },
          valid: {
            on: {
              isInvalid: 'selecting',
              next: {
                actions: send('confirm', { to: 'selectNamespaceRef' }),
              },
            },
          },
        },
        on: {
          prev: 'selectKafka',
        },
      },
      selectCluster: {
        initial: 'selecting',
        invoke: {
          id: 'selectClusterRef',
          src: clustersMachine,
          data: (context) => ({
            accessToken: context.accessToken,
            connectorsApiBasePath: context.connectorsApiBasePath,
            selectedCluster: context.selectedCluster,
          }),
          onDone: {
            target: 'basicConfiguration',
            actions: assign({
              selectedCluster: (_, event) => event.data.selectedCluster,
            }),
          },
          onError: '.error',
        },
        states: {
          error: {},
          selecting: {
            on: {
              isValid: 'valid',
            },
          },
          valid: {
            on: {
              isInvalid: 'selecting',
              next: {
                actions: send('confirm', { to: 'selectClusterRef' }),
              },
            },
          },
        },
        on: {
          prev: 'selectKafka',
        },
      },
      configureConnector: {
        initial: 'loadConfigurator',
        states: {
          loadConfigurator: {
            invoke: {
              id: 'configuratorLoader',
              src: 'makeConfiguratorLoaderMachine',
              data: (context) => ({
                connector:
                  context.selectedConnector == undefined
                    ? defaultConnectorMCS
                    : context.selectedConnector,
              }),
              onDone: {
                target: 'configure',
                actions: assign((_context, event) => ({
                  Configurator: event.data.Configurator,
                  configurationSteps: event.data.steps,
                })),
              },
              onError: {
                actions: (_context, event) => console.error(event.data.message),
              },
            },
          },
          configure: {
            id: 'configure',
            initial: 'submittable',
            invoke: {
              id: 'configuratorRef',
              src: configuratorMachine,
              data: (context) => ({
                connector:
                  context.selectedConnector == undefined
                    ? defaultConnectorMCS
                    : context.selectedConnector,
                configuration: context.connectorConfiguration,
                steps: context.configurationSteps || ['single step'],
                activeStep: context.activeConfigurationStep || 0,
                isActiveStepValid: context.connectorConfiguration !== false,
              }),
              onDone: [
                {
                  target: '#creationWizard.reviewConfiguration',
                  actions: assign((_, event) => ({
                    connectorConfiguration: event.data.configuration || true,
                  })),
                  cond: (context) => {
                    if (context.configurationSteps) {
                      return true;
                    } else {
                      return false;
                    }
                  },
                },
                {
                  target: '#creationWizard.errorConfiguration',
                  actions: assign((_, event) => ({
                    connectorConfiguration: event.data.configuration || true,
                  })),
                },
              ],
              onError: {
                actions: (_context, event) => console.error(event.data.message),
              },
            },
            states: {
              submittable: {
                on: {
                  isInvalid: 'invalid',
                  next: {
                    actions: send('next', { to: 'configuratorRef' }),
                  },
                },
              },
              invalid: {
                on: {
                  isValid: 'submittable',
                },
              },
            },
            on: {
              prev: [
                {
                  actions: send('prev', { to: 'configuratorRef' }),
                  cond: 'areThereSubsteps',
                },
                { target: '#creationWizard.basicConfiguration' },
              ],
              changedStep: {
                actions: assign({
                  activeConfigurationStep: (_, event) => event.step,
                }),
              },
            },
          },
        },
      },
      basicConfiguration: {
        id: 'configureBasic',
        initial: 'submittable',
        invoke: {
          id: 'basicRef',
          src: basicMachine,
          data: (context) => ({
            accessToken: context.accessToken,
            connectorsApiBasePath: context.connectorsApiBasePath,
            kafkaManagementApiBasePath: context.kafkaManagementApiBasePath,
            kafka: context.selectedKafkaInstance,
            cluster: context.selectedNamespace,
            connectorType: context.selectedConnector,
            initialConfiguration: context.connectorConfiguration,
            name: context.name,
            userServiceAccount: context.userServiceAccount,
            topic: context.topic,
            userErrorHandler: context.userErrorHandler,
          }),
          onDone: {
            target: 'configureConnector',
            actions: [
              assign((_, event) => ({
                name: event.data.name,
                userServiceAccount: event.data.userServiceAccount,
              })),
            ],
          },
          onError: {
            actions: (_context, event) => console.error(event.data.message),
          },
        },
        states: {
          submittable: {
            on: {
              isInvalid: 'invalid',
              next: {
                actions: send('confirm', { to: 'basicRef' }),
              },
            },
          },
          invalid: {
            on: {
              isValid: 'submittable',
            },
          },
        },
        on: {
          prev: 'selectNamespace',
        },
      },
      errorConfiguration: {
        id: 'configureErrorHandler',
        initial: 'submittable',
        invoke: {
          id: 'errorRef',
          src: errorHandlingMachine,
          data: (context) => ({
            accessToken: context.accessToken,
            connectorsApiBasePath: context.connectorsApiBasePath,
            kafkaManagementApiBasePath: context.kafkaManagementApiBasePath,
            kafka: context.selectedKafkaInstance,
            cluster: context.selectedNamespace,
            connector: context.selectedConnector,
            initialConfiguration: context.connectorConfiguration,
            topic: context.topic,
            userErrorHandler: context.userErrorHandler,
          }),
          onDone: {
            target: 'reviewConfiguration',
            actions: [
              assign((_, event) => ({
                topic: event.data.topic,
                userErrorHandler: event.data.userErrorHandler,
              })),
            ],
          },
          onError: {
            actions: (_context, event) => console.error(event.data.message),
          },
        },
        states: {
          submittable: {
            on: {
              isInvalid: 'invalid',
              next: {
                actions: send('confirm', { to: 'errorRef' }),
              },
            },
          },
          invalid: {
            on: {
              isValid: 'submittable',
            },
          },
        },
        on: {
          prev: 'configureConnector',
        },
      },
      reviewConfiguration: {
        id: 'review',
        initial: 'reviewing',
        invoke: {
          id: 'reviewRef',
          src: reviewMachine,
          data: (context) => ({
            accessToken: context.accessToken,
            connectorsApiBasePath: context.connectorsApiBasePath,
            kafkaManagementApiBasePath: context.kafkaManagementApiBasePath,
            kafka: context.selectedKafkaInstance,
            cluster: context.selectedNamespace,
            connectorType: context.selectedConnector,
            initialConfiguration: context.connectorConfiguration,
            name: context.name,
            userServiceAccount: context.userServiceAccount,
            topic: context.topic,
            userErrorHandler: context.userErrorHandler,
          }),
          onDone: {
            target: '#creationWizard.saved',
            actions: [
              assign((_, event) => ({
                connectorConfiguration: event.data,
              })),
              'notifySave',
            ],
          },
          onError: {
            actions: (_context, event) => console.error(event.data.message),
          },
        },
        states: {
          reviewing: {
            on: {
              isValid: 'valid',
            },
          },
          valid: {
            on: {
              isInvalid: 'reviewing',
              next: {
                actions: send('save', { to: 'reviewRef' }),
              },
            },
          },
        },

        on: {
          prev: [
            {
              target: '#creationWizard.configureConnector',
              cond: (context) => {
                if (context.configurationSteps) {
                  return true;
                } else {
                  return false;
                }
              },
            },
            { target: '#creationWizard.errorConfiguration' },
          ],
        },
      },
      saved: {
        id: 'saved',
        type: 'final',
      },
    },
    on: {
      jumpToSelectConnector: {
        target: 'selectConnector',
      },
      jumpToSelectKafka: {
        target: 'selectKafka',
        cond: 'isConnectorSelected',
      },
      jumpToSelectNamespace: {
        target: 'selectNamespace',
        cond: 'isKafkaInstanceSelected',
      },
      jumpToBasicConfiguration: {
        target: 'basicConfiguration',
        cond: 'isNamespaceSelected',
      },
      jumpToConfigureConnector: {
        target: 'configureConnector',
        cond: 'isBasicConfigured',
        actions: assign((_, event) => ({
          activeConfigurationStep: event.subStep || 0,
        })),
      },
      jumpToErrorConfiguration: {
        target: 'errorConfiguration',
        cond: 'isConnectorConfigured',
      },
      jumpToReviewConfiguration: {
        target: 'reviewConfiguration',
        cond: 'isConnectorConfigured',
      },
    },
  },
  {
    guards: {
      isKafkaInstanceSelected: (context) =>
        context.selectedKafkaInstance !== undefined,
      isNamespaceSelected: (context) => context.selectedNamespace !== undefined,
      isConnectorSelected: (context, event) => {
        const subStep = (event as { subStep?: number }).subStep;
        if (subStep) {
          return (
            context.selectedNamespace !== undefined &&
            (context.connectorConfiguration !== undefined ||
              subStep <= context.activeConfigurationStep!)
          );
        }
        return context.selectedNamespace !== undefined;
      },
      isConnectorConfigured: (context) => {
        if (!context.configurationSteps) {
          return (
            context.connectorConfiguration !== undefined &&
            context.connectorConfiguration !== false
          );
        }
        return (
          (context.connectorConfiguration !== undefined &&
            context.connectorConfiguration !== false) ||
          (context.activeConfigurationStep ===
            context.configurationSteps.length - 1 &&
            context.isConfigurationValid === true)
        );
      },
      isBasicConfigured: (context) =>
        context.userServiceAccount === undefined
          ? context.name !== undefined && context.name.length > 0
          : context.name !== undefined &&
            context.name.length > 0 &&
            context.userServiceAccount.clientId?.length > 0 &&
            context.userServiceAccount.clientSecret?.length > 0,

      isErrorHandlerConfigured: (context) =>
        context.userErrorHandler !== undefined &&
        context.userErrorHandler === 'dead_letter_queue'
          ? context.topic !== undefined && context.topic.length > 0
          : (context.topic !== undefined && context.topic.length > 0) ||
            context.userErrorHandler !== undefined,

      areThereSubsteps: (context) => context.activeConfigurationStep! > 0,
    },
    actions: {
      notifySave: (context) => {
        if (context.onSave) {
          context.onSave();
        }
      },
    },
    services: {
      makeConfiguratorLoaderMachine: () => configuratorLoaderMachine,
    },
  }
);

export type CreationWizardMachineInterpreterFromType = InterpreterFrom<
  typeof creationWizardMachine
>;
