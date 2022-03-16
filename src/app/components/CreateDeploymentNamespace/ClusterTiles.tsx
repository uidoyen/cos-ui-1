import React from 'react';

import { Tile, Flex } from '@patternfly/react-core';

import { useClustersMachine } from '../CreateConnectorWizard/CreateConnectorWizardContext';

export const ClusterTiles = () => {
  const {
    response,
    // selectedId,
    // loading,
    // error,
    // noResults,
    // // results,
    // queryEmpty,
    // // queryResults,
    // firstRequest,
    // onSelect,
    // onQuery,
  } = useClustersMachine();
  console.log('useClustersMachine::', response);

  return (
    <div role="listbox" aria-label="Tiles with extra content">
      <Flex>
        <Flex flex={{ default: 'flex_1' }}>
          <Tile title="Default" isStacked isSelected={false}>
            This is really really long subtext that goes on for so long that it
            has to wrap to the next line. This is really really long subtext
            that goes on for so long that it has to wrap to the next line.
          </Tile>
        </Flex>
        <Flex flex={{ default: 'flex_1' }}>
          <Tile title="Selected" isStacked isSelected>
            This is really really long subtext that goes on for so long that it
            has to wrap to the next line. This is really really long subtext
            that goes on for so long that it has to wrap to the next line.
          </Tile>
        </Flex>
      </Flex>
    </div>
  );
};
