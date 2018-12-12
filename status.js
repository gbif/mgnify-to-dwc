const Table = require("cli-table");
const _ = require("lodash");

// instantiate
var table = new Table({
  head: ["Progress", "Current", "Count"],
  colWidths: [25, 25, 25]
});

module.exports = function() {
  let printer;
  let intervalHandle;
  let state = {
    studyIndex: 0,
    studyCount: 0,
    sampleIndex: 0,
		sampleCount: 0,
		activeStudy: '',
		activeSample: '',
    totalOccurrenceCount: 0,
    totalStudyCount: 0
  };

	let printTable = function() {
		table.push(
			[`Study ${state.studyIndex}/${state.studyCount}`, state.activeStudy, `Total ${state.totalOccurrenceCount}`],
			[`Sample ${state.sampleIndex}/${state.sampleCount}`, state.activeSample, `Study ${state.totalStudyCount}`]
		);
		console.log(table.toString());
		table.pop();
		table.pop();
	}

  let start = function(startState) {
		_.assign(state, startState);
		printTable();
		
    intervalHandle = setInterval(() => {
			process.stdout.moveCursor(0, -7);
			process.stdout.cursorTo(0);
			printTable();
    }, 200);
  };

  let update = function(newState) {
    _.assign(state, newState);
  };

  let close = function() {
    clearInterval(intervalHandle);
  };
  return {
    start: start,
    update: update,
    close: close
  };
};
