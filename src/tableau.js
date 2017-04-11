import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { parseProgram, standardizeProgram } from './program';

const standardProgramToTableau = (p) => {
  return p;
};

let TableauView = ({ tableau }) => (
  <table>
    <thead>
      <tr>
        {Object.keys(tableau.vars).map(varName =>
          <th key={varName}>{varName}</th>
        )}
      </tr>
    </thead>
    <tbody>
    </tbody>
  </table>
);
TableauView.propTypes = {
  tableau: PropTypes.object.isRequired,
};

function mapStateToTableauViewProps(state) {
  const program = parseProgram(state.program);
  const stdProgram = standardizeProgram(program);
  const tableau = standardProgramToTableau(stdProgram);
  console.log(state);
  return {
    tableau: parseProgram(state.program)
  };
}
TableauView = connect(
  mapStateToTableauViewProps,
  null,
)(TableauView);

export { TableauView };
