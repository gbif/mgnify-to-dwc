// const value1 = 'test';
// const table = `
// +-${   '-'.padEnd(32, '-')       }-+---------+------------------------+----------------+
// |               Col1               |  Col2   |          Col3          | Numeric Column |
// +----------------------------------+---------+------------------------+----------------+
// | ${   (value1 + '').padEnd(32)  } | Value 2 | 123                    |           10.0 |
// | ${   (value1 + '').padEnd(32)  } | cols    | with a tab or 4 spaces |       -2,027.1 |
// | ${   (value1 + '').padEnd(32)  } |         |                        |                |
// +----------------------------------+---------+------------------------+----------------+
// `;

//console.log(table)

var Table = require('cli-table');
 
// instantiate
var table = new Table({
    head: ['TH 1 label', 'TH 2 label']
  , colWidths: [20, 20]
});
 
// table is an Array, so you can `push`, `unshift`, `splice` and friends
table.push(
    ['First value', 'Second value']
  , ['First value', 'Second value']
);
 
console.log(table.toString());

table[0] = ['First value', 'Second value updated']


let count = 0;
setInterval(x => {
  process.stdout.moveCursor(0, -7);
  process.stdout.cursorTo(0);
  count++;
  table[0] = ['First value', 'count ' + count]
  console.log(table.toString());
}, 200);