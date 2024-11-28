//  Simple message queuing broker
//  Same as request-reply broker but using shared queue proxy

var zmq = require('zeromq')

async function run() {
  //  Socket facing clients
  var frontend_pubsub = new zmq.XSubscriber();
  console.log('binding frontend_pubsub...');
  await frontend_pubsub.bind('tcp://*:3000');

  //  Socket facing services
  var backend_pubsub = new zmq.XPublisher();
  console.log('binding backend_pubsub...');
  await backend_pubsub.bind('tcp://*:3001');

  var frontend_repreq = new zmq.Router();
  console.log('binding frontend_repreq...');
  await frontend_repreq.bind('tcp://*:3002');

  var backend_repreq  = new zmq.Dealer();
  console.log('binding backend_repreq...');
  await backend_repreq.bind('tcp://*:3003');

  //  Start the proxy
  console.log('starting proxy...');
  const proxy_pubsub = new zmq.Proxy(frontend_pubsub, backend_pubsub);
  const proxy_repreq = new zmq.Proxy(frontend_repreq, backend_repreq);

  proxy_pubsub.run();
  console.log('Proxy_pubsub running...');
  proxy_repreq.run()
  console.log('Proxy_repreq running...');

  process.on('SIGINT', function() {
    frontend_pubsub.close();
    backend_pubsub.close();
    proxy_pubsub.terminate();
    frontend_repreq.close();
    backend_repreq.close();
    proxy_repreq.terminate();
  });
}

run()
