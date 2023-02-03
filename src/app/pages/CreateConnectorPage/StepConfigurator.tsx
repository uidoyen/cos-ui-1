import {
  useConfiguratorMachine,
  useCreateConnectorWizardService,
} from '@app/components/CreateConnectorWizard/CreateConnectorWizardContext';
import { JsonSchemaConfigurator } from '@app/components/JsonSchemaConfigurator/JsonSchemaConfigurator';
import { StepBodyLayout } from '@app/components/StepBodyLayout/StepBodyLayout';
import { ConfiguratorActorRef } from '@app/machines/StepConfigurator.machine';
import {
  ConfigurationMode,
  ConnectorConfiguratorComponent,
  ConnectorConfiguratorProps,
} from '@app/machines/StepConfiguratorLoader.machine';
import {
  clearEmptyObjectValues,
  getFilterList,
  mapToObject,
  patchConfigurationObject,
} from '@utils/shared';
import _ from 'lodash';
import React, { ComponentType, FunctionComponent, useCallback } from 'react';

import { useSelector } from '@xstate/react';

import {
  EmptyState,
  EmptyStateIcon,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

import { useTranslation } from '@rhoas/app-services-ui-components';
import { ConnectorTypeAllOf } from '@rhoas/connector-management-sdk';

const ConnectedCustomConfigurator: FunctionComponent<{
  Configurator: ConnectorConfiguratorComponent;
  actor: ConfiguratorActorRef;
  duplicateMode: boolean | undefined;
}> = ({ actor, Configurator, duplicateMode }) => {
  let { activeStep, configuration, connector } = useConfiguratorMachine();

  if (duplicateMode) {
    let combineConfiguration = {};
    if (configuration instanceof Map) {
      combineConfiguration = {
        ...clearEmptyObjectValues(mapToObject(configuration)),
      };
    } else {
      combineConfiguration = {
        ...clearEmptyObjectValues(configuration),
      };
    }
    configuration = new Map(Object.entries(combineConfiguration));
  }
  return (
    <Configurator
      activeStep={activeStep}
      configuration={configuration}
      connector={connector}
      uiPath={
        duplicateMode ? ConfigurationMode.DUPLICATE : ConfigurationMode.CREATE
      }
      onChange={(configuration, isValid) => {
        actor.send({ type: 'change', configuration, isValid });
      }}
    />
  );
};

const ConnectedJsonSchemaConfigurator: FunctionComponent<{
  actor: ConfiguratorActorRef;
  duplicateMode: boolean | undefined;
}> = ({ actor, duplicateMode }) => {
  const { configuration, connector } = useConfiguratorMachine();
  const schema = (connector as ConnectorTypeAllOf).schema!;
  const initialConfiguration = patchConfigurationObject(schema, {} as any);
  return (
    <JsonSchemaConfigurator
      schema={schema}
      configuration={
        configuration
          ? patchConfigurationObject(schema, configuration as any)
          : initialConfiguration
      }
      duplicateMode={duplicateMode || false}
      onChange={(configuration, isValid) =>
        actor.send({ type: 'change', configuration, isValid })
      }
    />
  );
};

export const ConfiguratorCustomStepDescription: FunctionComponent = () => {
  const { t } = useTranslation();
  const { activeStep, connector } = useConfiguratorMachine();
  const configuratorStepDescriptionText =
    activeStep === 1
      ? t('debeziumFilterStepDescription', {
          fields: getFilterList(connector.name!),
        })
      : t('configurationStepDescription');
  return <>{configuratorStepDescriptionText}</>;
};

export type ConfiguratorStepProps = {
  Configurator: ComponentType<ConnectorConfiguratorProps> | false;
};

export const ConfiguratorStep: FunctionComponent = () => {
  const { t } = useTranslation();
  const service = useCreateConnectorWizardService();
  const {
    isLoading,
    hasErrors,
    Configurator,
    configuratorRef,
    hasCustomConfigurator,
    duplicateMode,
    configurationSteps,
    activeConfigurationStep,
  } = useSelector(
    service,
    useCallback(
      (state: typeof service.state) => {
        const isLoading = state.matches({
          configureConnector: 'loadConfigurator',
        });
        const hasErrors = state.matches('failure');
        const hasCustomConfigurator =
          state.context.Configurator !== false &&
          state.context.Configurator !== undefined;
        return {
          isLoading,
          hasErrors,
          hasCustomConfigurator,
          configuration: state.context.connectorConfiguration,
          Configurator: state.context.Configurator,
          duplicateMode: state.context.duplicateMode,
          configuratorRef: state.children
            .configuratorRef as ConfiguratorActorRef,
          configurationSteps: state.context.configurationSteps,
          activeConfigurationStep: state.context.activeConfigurationStep,
        };
      },
      [service]
    )
  );
  return (
    <StepBodyLayout
      title={
        typeof configurationSteps === 'object' &&
        activeConfigurationStep !== undefined
          ? t(configurationSteps[activeConfigurationStep])
          : t('connectorSpecific')
      }
      description={
        hasCustomConfigurator ? (
          <ConfiguratorCustomStepDescription />
        ) : (
          t('configurationStepDescription')
        )
      }
    >
      {(() => {
        switch (true) {
          case isLoading:
            return (
              <EmptyState>
                <EmptyStateIcon variant="container" component={Spinner} />
                <Title size="lg" headingLevel="h4">
                  {t('loading')}
                </Title>
              </EmptyState>
            );
          case hasErrors:
            return (
              <EmptyState>
                <EmptyStateIcon icon={ExclamationCircleIcon} />
                <Title size="lg" headingLevel="h4">
                  {t('errorMessage')}
                </Title>
              </EmptyState>
            );
          case hasCustomConfigurator:
            return (
              <React.Suspense fallback={null}>
                <ConnectedCustomConfigurator
                  actor={configuratorRef}
                  Configurator={Configurator as ConnectorConfiguratorComponent}
                  duplicateMode={duplicateMode}
                />
              </React.Suspense>
            );
          default:
            return (
              <ConnectedJsonSchemaConfigurator
                actor={configuratorRef}
                duplicateMode={duplicateMode}
              />
            );
        }
      })()}
    </StepBodyLayout>
  );
};
