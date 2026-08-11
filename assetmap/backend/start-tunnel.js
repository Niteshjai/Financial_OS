const localtunnel = require('localtunnel');

(async () => {
  const tunnel = await localtunnel({ port: 3000 });

  console.log('✅ Tunnel is live!');
  console.log('🔗 Copy this URL to the Setu Sandbox webhook dashboard:');
  console.log(`\n    ${tunnel.url}/api/consent/callback\n`);

  tunnel.on('close', () => {
    console.log('Tunnel closed.');
  });
})();
