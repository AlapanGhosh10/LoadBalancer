const os = require('os');

const cpus = os.cpus();
var http = require('http');


http.createServer(function (req, res) {
  const totalSpeed = cpus.reduce((total, cpu) => {
    return total + cpu.speed / 1000;
  }, 0);
  const avgSpeed = totalSpeed / cpus.length;

  const totalMemoryBytes = os.freemem();
  const totalMemoryGB = totalMemoryBytes / (1024 * 1024 * 1024);

  let params = [];
  params.push(parseFloat(totalMemoryGB.toFixed(2)))
  params.push(parseFloat(avgSpeed.toFixed(2)))
  params.push(cpus.length)

  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify(params));
}).listen(8004);