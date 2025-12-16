import { RouterProvider } from 'react-router-dom';

import { appRouter } from './routes/router';
import { logger } from './utils/logger';

function App() {
  logger.debug('[App] Rendering RouterProvider...');

  return <RouterProvider router={appRouter} />;
}

export default App;
