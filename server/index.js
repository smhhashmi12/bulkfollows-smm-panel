import { pathToFileURL } from 'url';
import { appReady, handleRequest } from './app.js';

const PORT = process.env.PORT || 4000;
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  appReady
    .then((app) => {
      app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error('Failed to initialize server', error);
      process.exit(1);
    });
}

export default handleRequest;
