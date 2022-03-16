import { ApiCallback } from '@app/machines/PaginatedResponse.machine';
import axios, { CancelTokenSource } from 'axios';
import _ from 'lodash';

import { Sender } from 'xstate';

import {
  Channel,
  Configuration,
  Connector,
  ConnectorCluster,
  ConnectorClustersApi,
  ConnectorDesiredState,
  ConnectorsApi,
  ConnectorType,
  ConnectorTypeAllOf,
  ConnectorTypesApi,
  ObjectReference,
} from '@rhoas/connector-management-sdk';
import {
  KafkaRequest,
  DefaultApi,
  SecurityApi,
} from '@rhoas/kafka-management-sdk';

import { ConnectorNamespacesApi } from '../../../../rh-dev/app-services-sdk-js/packages/connector-management-sdk/dist/generated/api/connector-namespaces-api';
import { ConnectorNamespace } from '../../../../rh-dev/app-services-sdk-js/packages/connector-management-sdk/dist/generated/model/connector-namespace';

type CommonApiProps = {
  accessToken: () => Promise<string>;
  connectorsApiBasePath: string;
};

type ConnectorApiProps = {
  connector: Connector;
} & CommonApiProps;

type ConnectorEditProps = {
  connectorUpdate: { [key: string]: any };
  connectorId: string;
  updatedName?: string;
} & CommonApiProps;

type ConnectorDetailProps = {
  connectorId: string;
} & CommonApiProps;

type ConnectorTypeProps = {
  connectorTypeId: string;
} & CommonApiProps;

export type FetchCallbacks<RawDataType> = (
  onSuccess: (payload?: RawDataType) => void,
  onError: (errorMsg: string) => void
) => () => void;
interface ConnectorWithNameSpace extends Connector {
  namespace_id: string;
}
export const startConnector = ({
  accessToken,
  connectorsApiBasePath,
  connector,
}: ConnectorApiProps) => {
  const connectorsAPI = new ConnectorsApi(
    new Configuration({
      accessToken,
      basePath: connectorsApiBasePath,
    })
  );
  return (callback: Sender<any>) => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    connectorsAPI
      .patchConnector(
        connector.id!,
        {
          desired_state: ConnectorDesiredState.Ready,
        },
        {
          cancelToken: source.token,
          headers: {
            'Content-type': 'application/merge-patch+json',
          },
        }
      )
      .then((response) => {
        callback({
          type: 'connector.actionSuccess',
          connector: response.data,
        });
      })
      .catch((error) => {
        if (!axios.isCancel(error)) {
          callback({
            type: 'connector.actionError',
            error: error.response.data.reason,
          });
        }
      });
    return () => {
      source.cancel('Operation canceled by the user.');
    };
  };
};

export const stopConnector = ({
  accessToken,
  connectorsApiBasePath,
  connector,
}: ConnectorApiProps) => {
  const connectorsAPI = new ConnectorsApi(
    new Configuration({
      accessToken,
      basePath: connectorsApiBasePath,
    })
  );
  return (callback: Sender<any>) => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    connectorsAPI
      .patchConnector(
        connector.id!,
        {
          desired_state: ConnectorDesiredState.Stopped,
        },
        {
          cancelToken: source.token,
          headers: {
            'Content-type': 'application/merge-patch+json',
          },
        }
      )
      .then((response) => {
        callback({
          type: 'connector.actionSuccess',
          connector: response.data,
        });
      })
      .catch((error) => {
        if (!axios.isCancel(error)) {
          callback({
            type: 'connector.actionError',
            error: error.response.data.reason,
          });
        }
      });
    return () => {
      source.cancel('Operation canceled by the user.');
    };
  };
};

export const deleteConnector = ({
  accessToken,
  connectorsApiBasePath,
  connector,
}: ConnectorApiProps) => {
  const connectorsAPI = new ConnectorsApi(
    new Configuration({
      accessToken,
      basePath: connectorsApiBasePath,
    })
  );
  return (callback: Sender<any>) => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    connectorsAPI
      .deleteConnector(connector.id!, {
        cancelToken: source.token,
      })
      .then(() => {
        callback({
          type: 'connector.actionSuccess',
          connector: {
            ...connector,
            status: 'deleting',
            desired_state: 'deleted',
          },
        });
      })
      .catch((error) => {
        if (!axios.isCancel(error)) {
          callback({
            type: 'connector.actionError',
            error: error.response.data.reason,
          });
        }
      });
    return () => {
      source.cancel('Operation canceled by the user.');
    };
  };
};

export const getConnector = ({
  accessToken,
  connectorsApiBasePath,
  connectorId,
}: ConnectorDetailProps): FetchCallbacks<Connector> => {
  const connectorsAPI = new ConnectorsApi(
    new Configuration({
      accessToken,
      basePath: connectorsApiBasePath,
    })
  );
  return (onSuccess, onError) => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    connectorsAPI
      .getConnector(connectorId!, {
        cancelToken: source.token,
      })
      .then((response) => {
        onSuccess(response.data);
      })
      .catch((error) => {
        if (!axios.isCancel(error)) {
          onError(error.response.data.reason);
        }
      });
    return () => {
      source.cancel('Operation canceled by the user.');
    };
  };
};

export const getConnectorTypeDetail = ({
  accessToken,
  connectorsApiBasePath,
  connectorTypeId,
}: ConnectorTypeProps) => {
  const connectorsAPI = new ConnectorTypesApi(
    new Configuration({
      accessToken,
      basePath: connectorsApiBasePath,
    })
  );
  return (callback: any) => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    connectorsAPI
      .getConnectorTypeByID(connectorTypeId, {
        cancelToken: source.token,
      })
      .then((response) => {
        callback(response.data);
      })
      .catch((error) => {
        if (!axios.isCancel(error)) {
          console.log('Error:', error.response.data.reason);
        }
      });
    return () => {
      source.cancel('Operation canceled by the user.');
    };
  };
};

export const fetchConnectors = ({
  accessToken,
  connectorsApiBasePath,
}: CommonApiProps): ApiCallback<Connector, {}> => {
  const connectorsAPI = new ConnectorsApi(
    new Configuration({
      accessToken,
      basePath: connectorsApiBasePath,
    })
  );
  return (request, onSuccess, onError) => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    const { page, size /*, name = '' */ } = request;
    // const query = name.length > 0 ? `name LIKE ${name}` : undefined;
    connectorsAPI
      .listConnectors(`${page}`, `${size}`, {
        cancelToken: source.token,
      })
      .then((response) => {
        onSuccess({
          items: response.data.items || [],
          total: response.data.total,
          page: response.data.page,
          size: response.data.size,
        });
      })
      .catch((error) => {
        if (!axios.isCancel(error)) {
          onError({ error: error.message, page: request.page });
        }
      });
    return () => {
      source.cancel('Operation canceled by the user.');
    };
  };
};

// export const fetchClusters = ({
//   accessToken,
//   connectorsApiBasePath,
// }: CommonApiProps): ApiCallback<ConnectorCluster, {}> => {
//   const connectorsAPI = new ConnectorClustersApi(
//     new Configuration({
//       accessToken,
//       basePath: connectorsApiBasePath,
//     })
//   );

//   return (request, onSuccess, onError) => {
//     const CancelToken = axios.CancelToken;
//     const source = CancelToken.source();
//     const { page, size } = request;
//     connectorsAPI.listConnectorClusters(`${page}`, `${size}`, {
//       cancelToken: source.token,
//     });
//     axios
//       .create({
//         baseURL: `http://localhost:8000/api/connector_mgmt/v1/`,
//         timeout: 1000,
//         headers: {
//           Authorization:
//             'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICItNGVsY19WZE5fV3NPVVlmMkc0UXhyOEdjd0l4X0t0WFVDaXRhdExLbEx3In0.eyJleHAiOjE2NDczMjYwNTEsImlhdCI6MTY0NzMyNTE1MSwiYXV0aF90aW1lIjoxNjQ2NzI4MTg5LCJqdGkiOiI2MmFmOTA0Ni01MDQ2LTRmMGItYmE0ZS02N2IwMGFlNGFiYmYiLCJpc3MiOiJodHRwczovL3Nzby5yZWRoYXQuY29tL2F1dGgvcmVhbG1zL3JlZGhhdC1leHRlcm5hbCIsImF1ZCI6ImNsb3VkLXNlcnZpY2VzIiwic3ViIjoiZjo1MjhkNzZmZi1mNzA4LTQzZWQtOGNkNS1mZTE2ZjRmZTBjZTY6YXNhbnNhcmlfa2Fma2Ffc3VwcG9ydGluZyIsInR5cCI6IkJlYXJlciIsImF6cCI6ImNsb3VkLXNlcnZpY2VzIiwibm9uY2UiOiIyOTU2NGM2OS04MzdkLTRhMDktODkxMy03ZmJhY2NjMDVlMjAiLCJzZXNzaW9uX3N0YXRlIjoiYmYxYWYzMTgtMzFmMy00ZGM5LTliYTctMjJhMDkzNDA1OTgzIiwiYWNyIjoiMCIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwczovL3Byb2QuZm9vLnJlZGhhdC5jb206MTMzNyIsImh0dHBzOi8vY29uc29sZS5kZXYucmVkaGF0LmNvbSIsImh0dHBzOi8vcWFwcm9kYXV0aC5jb25zb2xlLnJlZGhhdC5jb20iLCJodHRwczovL2dvdi5jb25zb2xlLnJlZGhhdC5jb20iLCJodHRwczovL3FhcHJvZGF1dGguZm9vLnJlZGhhdC5jb20iLCJodHRwczovL2FwaS5jbG91ZC5yZWRoYXQuY29tIiwiaHR0cHM6Ly9xYXByb2RhdXRoLmNsb3VkLnJlZGhhdC5jb20iLCJodHRwczovL2Nsb3VkLm9wZW5zaGlmdC5jb20iLCJodHRwczovL3Byb2QuZm9vLnJlZGhhdC5jb20iLCJodHRwczovL2Nsb3VkLnJlZGhhdC5jb20iLCJodHRwczovL2NvbnNvbGUucmVkaGF0LmNvbSJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiYXV0aGVudGljYXRlZCIsIm9mZmxpbmVfYWNjZXNzIl19LCJzY29wZSI6Im9wZW5pZCBvZmZsaW5lX2FjY2VzcyIsInNpZCI6ImJmMWFmMzE4LTMxZjMtNGRjOS05YmE3LTIyYTA5MzQwNTk4MyIsImFjY291bnRfbnVtYmVyIjoiNjk3ODM5MyIsImlzX2ludGVybmFsIjpmYWxzZSwiaXNfYWN0aXZlIjp0cnVlLCJsYXN0X25hbWUiOiJBbnNhcmkiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJhc2Fuc2FyaV9rYWZrYV9zdXBwb3J0aW5nIiwidHlwZSI6IlVzZXIiLCJsb2NhbGUiOiJlbl9VUyIsImlzX29yZ19hZG1pbiI6ZmFsc2UsImFjY291bnRfaWQiOiI1NDQyMTIyMyIsIm9yZ19pZCI6IjEzODg4MzQ3IiwiZmlyc3RfbmFtZSI6IkFzaGlxdWUiLCJlbWFpbCI6ImFzYW5zYXJpQHJlZGhhdC5jb20iLCJ1c2VybmFtZSI6ImFzYW5zYXJpX2thZmthX3N1cHBvcnRpbmcifQ.jHZ_GI20GQFp1sTrJoRXRPdWyfwKBokRAL7b4w2KezlCxjs8hhQeDE6kilEXoKZy0fDBalqFDeztOTm3yEad8fqxPu8T73zjiicgkrW9Mx87HRo8xtPlqFbL-24xh11wH8VkFcWtiUEsUKw-Z7nPAe49YOM3JJNp9hcOf8IIh8YQrg6zJbk9Yg4zdFWK-eB7-etd6JSUb1wIuFdsG0KFNbbqStPQQlP8jgvchmpi0AwsfpxZFSV6UJv6rOlrsWeuI6GGNUpevLDVPegy3GDhXpBSGoo9Z6O97C-FaPj6eU3U_HCcwqNdH00UO0L_ZXZEEZDDqi5VIgt0A4nBRWNVrrs27Lk7X5Jvwsymi5AYLqm7mH8HFy6nno_g6WSIkGk_8vRUuAnGjo3MCdn3EsHdWij6jQ-vst5Gv6gs3QWd0Id69kPz0cvGdjrPOSML7rYpDGbRfyv4_Ytv8F5vFK_zQH_3k-JY4xWlgHhH_WoReFVDZPjMOM8viiXmKLqBNaelBPkKSyLc0CG6x5c6D4JKusxPCAq0yazSClEkpWHkxFSATByW2cdSzKsOSIpNCKG7XZoG3ZvwaCJRefyvNS8dOlX93zNQARDOA-D2RerjaYYEeVNKyDqidsLW6V6kn5XZ2VXczeZvODmfHSLk2rSN1myY1_SloOYiHMDtdAEi2Rg',
//         },
//       })
//       .get(`kafka_connector_namespaces`)
//       .then((response) => {
//         onSuccess({
//           items: response.data.items || [],
//           total: response.data.total,
//           page: response.data.page,
//           size: response.data.size,
//         });
//       })
//       .catch((error) => {
//         if (!axios.isCancel(error)) {
//           onError({ error: error.message, page: request.page });
//         }
//       });
//     return () => {
//       source.cancel('Operation canceled by the user.');
//     };
//   };
// };

export const fetchConnectorNamespaces = ({
  accessToken,
  connectorsApiBasePath,
}: CommonApiProps): ApiCallback<ConnectorNamespace, {}> => {
  const namespacesAPI = new ConnectorNamespacesApi(
    new Configuration({
      accessToken,
      basePath: connectorsApiBasePath,
    })
  );
  return (request, onSuccess, onError) => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    const { page, size } = request;
    namespacesAPI
      .listConnectorNamespaces(`${page}`, `${size}`)
      .then((response) => {
        onSuccess({
          items: response.data.items || [],
          total: response.data.total,
          page: response.data.page,
          size: response.data.size,
        });
      })
      .catch((error) => {
        if (!axios.isCancel(error)) {
          onError({ error: error.message, page: request.page });
        }
      });
    return () => {
      source.cancel('Operation canceled by the user.');
    };
  };
};

export const fetchClusters = ({
  accessToken,
  connectorsApiBasePath,
}: CommonApiProps): ApiCallback<ConnectorCluster, {}> => {
  const connectorsAPI = new ConnectorClustersApi(
    new Configuration({
      accessToken,
      basePath: connectorsApiBasePath,
    })
  );
  return (request, onSuccess, onError) => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    const { page, size } = request;
    connectorsAPI
      .listConnectorClusters(`${page}`, `${size}`, {
        cancelToken: source.token,
      })
      .then((response) => {
        console.log(response);
        console.log(onSuccess);

        onSuccess({
          items: response.data.items || [],
          total: response.data.total,
          page: response.data.page,
          size: response.data.size,
        });
      })
      .catch((error) => {
        if (!axios.isCancel(error)) {
          onError({ error: error.message, page: request.page });
        }
      });
    return () => {
      source.cancel('Operation canceled by the user.');
    };
  };
};

export type ConnectorTypesQuery = {
  name?: string;
  categories?: string[];
};

export const fetchConnectorTypes = ({
  accessToken,
}: // connectorsApiBasePath,
CommonApiProps): ApiCallback<ConnectorType, ConnectorTypesQuery> => {
  const connectorsAPI = new ConnectorTypesApi(
    new Configuration({
      accessToken,
      basePath: 'https://wxn4aqqc8bqvxcy6unfe.api.stage.openshift.com',
    })
  );

  return (request, onSuccess, onError) => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    const { page, size, query } = request;
    const { name, categories = [] } = query || {};
    connectorsAPI
      .getConnectorTypes('1', '1000', undefined, undefined, {
        cancelToken: source.token,
      })
      .then((response) => {
        const lcName = name ? name.toLowerCase() : undefined;
        const rawItems = response.data.items || [];
        let filteredItems = lcName
          ? rawItems?.filter((c) =>
              (c as ConnectorTypeAllOf).name?.toLowerCase().includes(lcName)
            )
          : rawItems;
        filteredItems =
          categories.length > 0
            ? filteredItems?.filter(
                (c) =>
                  (
                    (c as ConnectorTypeAllOf).labels?.filter((l) =>
                      categories.includes(l)
                    ) || []
                  ).length > 0
              )
            : filteredItems;
        const total = filteredItems.length;
        const offset = (page - 1) * size;
        const items = filteredItems.slice(offset, offset + size);
        onSuccess({
          items,
          total,
          page,
          size,
        });
      })
      .catch((error) => {
        if (!axios.isCancel(error)) {
          onError({ error: error.message, page: request.page });
        }
      });
    return () => {
      source.cancel('Operation canceled by the user.');
    };
  };
};

type KafkaManagementApiProps = {
  accessToken: () => Promise<string>;
  kafkaManagementBasePath: string;
};

export type KafkasQuery = {
  name?: string;
  owner?: string;
  statuses?: string[];
  cloudProviders?: string[];
  regions?: string[];
};

export const fetchKafkaInstances = ({
  accessToken,
  kafkaManagementBasePath,
}: KafkaManagementApiProps): ApiCallback<KafkaRequest, KafkasQuery> => {
  const connectorsAPI = new DefaultApi(
    new Configuration({
      accessToken,
      basePath: kafkaManagementBasePath,
    })
  );
  return (request, onSuccess, onError) => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    const { page, size, query } = request;
    const { name, statuses, owner, cloudProviders, regions } = query || {};
    const nameSearch =
      name && name.length > 0 ? ` name LIKE ${name}` : undefined;
    const ownerSearch =
      owner && owner.length > 0 ? ` owner LIKE ${owner}` : undefined;
    const statusSearch =
      statuses && statuses.length > 0
        ? statuses.map((s) => `status = ${s}`).join(' OR ')
        : undefined;
    const cloudProviderSearch =
      cloudProviders && cloudProviders.length > 0
        ? cloudProviders.map((s) => `cloud_provider = ${s}`).join(' OR ')
        : undefined;
    const regionSearch =
      regions && regions.length > 0
        ? regions.map((s) => `region = ${s}`).join(' OR ')
        : undefined;
    const search = [
      nameSearch,
      ownerSearch,
      statusSearch,
      cloudProviderSearch,
      regionSearch,
    ]
      .filter(Boolean)
      .map((s) => `(${s})`)
      .join(' AND ');
    connectorsAPI
      .getKafkas(
        `${page}`,
        `${size}`,
        undefined,
        search as string | undefined,
        {
          cancelToken: source.token,
        }
      )
      .then((response) => {
        onSuccess({
          items: response.data.items || [],
          total: response.data.total,
          page: response.data.page,
          size: response.data.size,
        });
      })
      .catch((error) => {
        if (!axios.isCancel(error)) {
          onError({ error: error.message, page: request.page });
        }
      });
    return () => {
      source.cancel('Operation canceled by the user.');
    };
  };
};

export type UserProvidedServiceAccount = {
  clientId: string;
  clientSecret: string;
};

export type SaveConnectorProps = {
  kafka: KafkaRequest;
  cluster: ConnectorCluster;
  connectorType: ConnectorType;

  configuration: object;

  name: string;
  userServiceAccount?: UserProvidedServiceAccount;

  topic?: string;
  userErrorHandler?: string;

  kafkaManagementApiBasePath: string;
} & CommonApiProps;

export const saveConnector = ({
  accessToken,
  connectorsApiBasePath,
  kafkaManagementApiBasePath,
  kafka,
  cluster,
  connectorType,
  configuration,
  name,
  userServiceAccount,
  userErrorHandler,
  topic,
}: SaveConnectorProps) => {
  const connectorsAPI = new ConnectorsApi(
    new Configuration({
      accessToken,
      basePath: connectorsApiBasePath,
    })
  );
  const securityAPI = new SecurityApi(
    new Configuration({
      accessToken,
      basePath: kafkaManagementApiBasePath,
    })
  );
  // temp function to test cluster namespaces
  // const getClusterNameSpace = () => {
  //   return axios
  //     .create({
  //       baseURL: `http://localhost:8000/api/connector_mgmt/v1/`,
  //       timeout: 1000,
  //       headers: {
  //         Authorization:
  //           'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICItNGVsY19WZE5fV3NPVVlmMkc0UXhyOEdjd0l4X0t0WFVDaXRhdExLbEx3In0.eyJleHAiOjE2NDY5MDEzNjQsImlhdCI6MTY0NjkwMDQ2NCwiYXV0aF90aW1lIjoxNjQ2NzI4MTg5LCJqdGkiOiJmMDg5MWVhMS1jMDg5LTRlN2MtOGNlZi1mZGNlYzIzZWRhMjgiLCJpc3MiOiJodHRwczovL3Nzby5yZWRoYXQuY29tL2F1dGgvcmVhbG1zL3JlZGhhdC1leHRlcm5hbCIsImF1ZCI6ImNsb3VkLXNlcnZpY2VzIiwic3ViIjoiZjo1MjhkNzZmZi1mNzA4LTQzZWQtOGNkNS1mZTE2ZjRmZTBjZTY6YXNhbnNhcmlfa2Fma2Ffc3VwcG9ydGluZyIsInR5cCI6IkJlYXJlciIsImF6cCI6ImNsb3VkLXNlcnZpY2VzIiwibm9uY2UiOiIyOTU2NGM2OS04MzdkLTRhMDktODkxMy03ZmJhY2NjMDVlMjAiLCJzZXNzaW9uX3N0YXRlIjoiYmYxYWYzMTgtMzFmMy00ZGM5LTliYTctMjJhMDkzNDA1OTgzIiwiYWNyIjoiMCIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwczovL3Byb2QuZm9vLnJlZGhhdC5jb206MTMzNyIsImh0dHBzOi8vY29uc29sZS5kZXYucmVkaGF0LmNvbSIsImh0dHBzOi8vcWFwcm9kYXV0aC5jb25zb2xlLnJlZGhhdC5jb20iLCJodHRwczovL2dvdi5jb25zb2xlLnJlZGhhdC5jb20iLCJodHRwczovL3FhcHJvZGF1dGguZm9vLnJlZGhhdC5jb20iLCJodHRwczovL2FwaS5jbG91ZC5yZWRoYXQuY29tIiwiaHR0cHM6Ly9xYXByb2RhdXRoLmNsb3VkLnJlZGhhdC5jb20iLCJodHRwczovL2Nsb3VkLm9wZW5zaGlmdC5jb20iLCJodHRwczovL3Byb2QuZm9vLnJlZGhhdC5jb20iLCJodHRwczovL2Nsb3VkLnJlZGhhdC5jb20iLCJodHRwczovL2NvbnNvbGUucmVkaGF0LmNvbSJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiYXV0aGVudGljYXRlZCIsIm9mZmxpbmVfYWNjZXNzIl19LCJzY29wZSI6Im9wZW5pZCBvZmZsaW5lX2FjY2VzcyIsInNpZCI6ImJmMWFmMzE4LTMxZjMtNGRjOS05YmE3LTIyYTA5MzQwNTk4MyIsImFjY291bnRfbnVtYmVyIjoiNjk3ODM5MyIsImlzX2ludGVybmFsIjpmYWxzZSwiaXNfYWN0aXZlIjp0cnVlLCJsYXN0X25hbWUiOiJBbnNhcmkiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJhc2Fuc2FyaV9rYWZrYV9zdXBwb3J0aW5nIiwidHlwZSI6IlVzZXIiLCJsb2NhbGUiOiJlbl9VUyIsImlzX29yZ19hZG1pbiI6ZmFsc2UsImFjY291bnRfaWQiOiI1NDQyMTIyMyIsIm9yZ19pZCI6IjEzODg4MzQ3IiwiZmlyc3RfbmFtZSI6IkFzaGlxdWUiLCJlbWFpbCI6ImFzYW5zYXJpQHJlZGhhdC5jb20iLCJ1c2VybmFtZSI6ImFzYW5zYXJpX2thZmthX3N1cHBvcnRpbmcifQ.o1fUfDBueoU2_pQGqD_mMrYkkXyYrDV2GRBwYr_FdcAPJtTUtuJGzTRJ8gCuYfjCskK6nhsw_q6XdM0PXKvhxUrG-qpC6KPqtOSr5qPqo1L55q-h6c1g3lxhHGSjhSmijgUi6YReHwvWJVw2T3YQiiGQcT6pOtg695gIR6nDXurAMy9vx8nP8IcioEMH1NH2zuPPTI88hKQ4ENvMx5KPKmOgFjnQHSpvggQ0fyqBvKogU4GdpF4j9z5yE8KEiVlGNjLqAKHS4q6doomqmHj-2qA8v5MPvvWvAv_z2FzAr3hG5pl3_1FXZXsx774LPahp4VbW0SVCjIB1-bTcg0OkOvj67wali0o6rBF3SZ-g1Y-7Ynwzv0E5HcZLklHbpoRPnRe3Cwdy8xb42rFXebTI0wcdhxNkOyMW_l0r1nBAu42KZHr35gVooV19Ycrn-GbaGbARRSwfaAH6emcgE_Mwdx5255KLnC9a8gzM6eYBAatSBwj8ImJbwKSMQA3Gq-MxJlqrOeALbkxeuNlalOgfYNtl3A7CX-v-IEIfLcUMPXv0NgFqEG7iHg9OEguhUf0kaGdTkWDttMJnBh1PrEYtwY6zIzCxv2pjj916DhofI60eYtpbzL51hzI_X_54ECvMTMeHyAmZawJnu718dD8TMsfYubVr8I50R3rR_oB-8k4',
  //       },
  //     })
  //     .get(`kafka_connector_clusters/c8kc2gn91m1dvupd4i80/namespaces`);
  // };

  const getOrCreateServiceAccount = async (source: CancelTokenSource) => {
    if (userServiceAccount) return Promise.resolve(userServiceAccount);

    // the passed service account info is undefined, we have to create a new SA
    // automatically on behalf of the user
    const response = await securityAPI.createServiceAccount(
      {
        name: `connector-${(connectorType as ObjectReference).id?.replaceAll(
          /[_\.]/g,
          '-'
        )}-${Date.now()}`,
      },
      {
        cancelToken: source.token,
      }
    );
    return {
      clientId: response.data.client_id!,
      clientSecret: response.data.client_secret!,
    };
  };

  return (callback: Sender<any>) => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    const async = true;
    getOrCreateServiceAccount(source)
      .then(({ clientId, clientSecret }) => {
        let connectorConfiguration = {};
        if (userErrorHandler) {
          connectorConfiguration = {
            ...configuration,
            ...{
              error_handler: {
                [userErrorHandler]: topic ? { topic: topic } : {},
              },
            },
          };
        } else {
          connectorConfiguration = configuration;
        }
        const connector: ConnectorWithNameSpace = {
          kind: 'Connector',
          name: name,
          //@ts-expect-error
          namespace_id: cluster.id,
          channel: Channel.Stable,
          // deployment_location: {
          //   kind: 'addon',
          //   cluster_id: cluster.id,
          // },
          desired_state: ConnectorDesiredState.Ready,
          connector_type_id: (connectorType as ObjectReference).id!,
          kafka: {
            id: kafka.id!,
            url: kafka.bootstrap_server_host || 'demo',
          },
          service_account: {
            client_id: clientId,
            client_secret: clientSecret,
          },
          connector: connectorConfiguration,
        };
        connectorsAPI
          .createConnector(async, connector, {
            cancelToken: source.token,
          })
          .then(() => {
            callback({ type: 'success' });
          })
          .catch((error) => {
            if (!axios.isCancel(error)) {
              callback({
                type: 'failure',
                message: error.response.data.reason,
              });
            }
          });
      })
      .catch((error) => {
        if (!axios.isCancel(error)) {
          callback({
            type: 'failure',
            message: error.response.data.reason,
          });
        }
      });

    return () => {
      source.cancel('Operation canceled by the user.');
    };
  };
};

export const updateConnector = ({
  accessToken,
  connectorsApiBasePath,
  connectorUpdate,
  connectorId,
  updatedName,
}: ConnectorEditProps): FetchCallbacks<undefined> => {
  const connectorsAPI = new ConnectorsApi(
    new Configuration({
      accessToken,
      basePath: connectorsApiBasePath,
    })
  );
  return (onSuccess, onError) => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    connectorsAPI
      .patchConnector(
        connectorId,
        {
          ...(updatedName && { name: updatedName }),
          ...(!_.isEmpty(connectorUpdate) && {
            connector: {
              ...connectorUpdate,
            },
          }),
        },
        {
          cancelToken: source.token,
          headers: {
            'Content-type': 'application/merge-patch+json',
          },
        }
      )
      .then(() => {
        onSuccess();
      })
      .catch((error) => {
        if (!axios.isCancel(error)) {
          onError(error.response.data.reason);
        }
      });
    return () => {
      source.cancel('Operation canceled by the user.');
    };
  };
};
