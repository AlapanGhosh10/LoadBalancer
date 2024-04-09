const readline = require('readline');
const { exec } = require('child_process');
const http = require('http');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const portNumbers = [];
const responseTime = [];
const memoryLeft = [];
const clockSpeed = [];
const noOfCores = [];
const weights = [];

class WeightedRoundRobinLoadBalancer {
  constructor(weights) {
    this.servers = [];
    this.currentServerIndex = 0;
    this.currentWeightIndex = 0;

    weights.forEach((weight, index) => {
      for (let i = 0; i < weight; i++) {
        this.servers.push(`${portNumbers[index]}`); 
      }
    });
  }

  getNextServer() {
    console.log(this.servers)
    const server = this.servers[this.currentServerIndex];
    
    this.currentWeightIndex++;
    if (this.currentWeightIndex >= this.servers.length) {
      this.currentWeightIndex = 0;
      this.currentServerIndex = (this.currentServerIndex + 1) % this.servers.length;
    }

    return server;
  }
}

function askServers() {
  for(let i = 0 ; i < portNumbers.length ; i++) {
    const curlCommand = 'curl -o /dev/null -s -w \'%{time_total}\' http://localhost:' + portNumbers[i];
  
    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing curl command: ${error}`);
        return;
      }
      
      responseTime.push(JSON.parse(stdout));
    });

    const curlCommand2 = 'curl http://localhost:' + portNumbers[i];
  
    exec(curlCommand2, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing curl command: ${error}`);
        return;
      }
      
      const vals = JSON.parse(stdout);
      memoryLeft.push(vals[0]);
      clockSpeed.push(vals[1]);
      noOfCores.push(vals[2]);
    });
  }
}

function minMaxNormalization(array) {
  const normalizedArray = [];
  const arrayMin = Math.min(...array);
  const arrayMax = Math.max(...array);

  for (let i = 0; i < array.length; i++) {
    let normalizedValue = (array[i] - arrayMin) / (arrayMax - arrayMin);
    if (isNaN(normalizedValue)) {
      normalizedValue = 1;
    }
    if(normalizedValue === 0) {
      normalizedValue = 0.1;
    }
    normalizedArray.push(normalizedValue);
  }

  return normalizedArray;
}

async function promptUser() {
  const numServers = await askQuestion('Enter the number of servers: ');
  
  for (let i = 0; i < numServers; i++) {
    const port = await askQuestion(`Enter port number for server ${i + 1}: `);
    portNumbers.push(parseInt(port));
  }

  rl.close();

  console.log("Checking Servers...")
  setTimeout(() => {
    let nmemoryLeft = minMaxNormalization(memoryLeft)
    let nclockSpeed = minMaxNormalization(clockSpeed)
    let nnoOfCores = minMaxNormalization(noOfCores)
    let nresponseTime = minMaxNormalization(responseTime)

    console.log(portNumbers)
    for(let i = 0 ; i < portNumbers.length ; i++) {
      weights.push((5 * nresponseTime[i] + 2 * nclockSpeed[i] + 2 * nnoOfCores[i] + 1 * nmemoryLeft[i]));
    }
    console.log(weights)
    
    const loadBalancer = new WeightedRoundRobinLoadBalancer(weights);

    const server = http.createServer((req, res) => {
      const nextServer = loadBalancer.getNextServer();
    
      const options = {
        hostname: 'localhost',
        port: nextServer,
        path: req.url,
        method: req.method,
        headers: req.headers
      };
    
      const proxyReq = http.request(options, (proxyRes) => {
        proxyRes.pipe(res);
      });
    
      req.pipe(proxyReq);
    
      console.log(`Redirecting request to Server ${nextServer}`);
    
      proxyReq.end();
    });

  const PORT = 3001;
  server.listen(PORT, () => {
    console.log(`Load balancer running at http://localhost:${PORT}`);
  });

  }, 2000);

}

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

function waitForPromptUser() {
  return new Promise(resolve => {
    promptUser().then(resolve);
  });
}

async function main() {
  await waitForPromptUser();
  await askServers();
}

main();

