// const low = require('lowdb')
// const FileSync = require('lowdb/adapters/FileSync')

// const adapter = new FileSync('db.json')
// const db = low(adapter);

// // Set some defaults
// db.defaults({ studies: 0, sampleKeys: [] })
// 	.write();

// module.exports = db;

module.exports = function () {
	let printer;
	let start = function () {
		console.log('start');
		// setInterval(() => {

		// }, 200);
	}
	let update = function () {

	}
	let sampleMetadata = function () {
		// keep track of distinct sample meta data fields
	}
	let close = function () {
		console.log('end - save distinct values. save report of duplicates and counts and run time.');
	}
	return {
		start: start,
		update: update,
		close: close
	}
} 