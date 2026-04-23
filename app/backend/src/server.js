const app = require('./app');
const { initDb, pool } = require('./db');

const PORT = process.env.PORT || 3000;
const DB_INIT_RETRY_DELAY_MS = Number(process.env.DB_INIT_RETRY_DELAY_MS || 3000);
let server;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const bootstrapDatabase = async () => {
  while (!app.locals.isShuttingDown && !app.locals.dbReady) {
    app.locals.dbInitAttempts += 1;

    try {
      await initDb();
      app.locals.dbReady = true;
      app.locals.lastDbError = null;
      console.log(`Base de donnees prete apres ${app.locals.dbInitAttempts} tentative(s).`);
      return;
    } catch (error) {
      app.locals.dbReady = false;
      app.locals.lastDbError = error.message;
      console.error(
        `Echec initialisation BDD tentative ${app.locals.dbInitAttempts}: ${error.message}`
      );

      if (!app.locals.isShuttingDown) {
        await wait(DB_INIT_RETRY_DELAY_MS);
      }
    }
  }
};

const shutdown = (signal) => {
  if (app.locals.isShuttingDown) {
    return;
  }

  app.locals.isShuttingDown = true;
  console.log(`Signal ${signal} reçu, arrêt en cours...`);

  if (!server) {
    process.exit(0);
  }

  const forceExitTimer = setTimeout(() => {
    console.error('Arrêt forcé après dépassement du délai.');
    process.exit(1);
  }, 10000);

  server.close(async () => {
    clearTimeout(forceExitTimer);

    try {
      await pool.end();
      process.exit(0);
    } catch (error) {
      console.error('Erreur pendant la fermeture de la base :', error);
      process.exit(1);
    }
  });
};

server = app.listen(PORT, () => {
  console.log(`Serveur demarre sur le port ${PORT}`);
  void bootstrapDatabase();
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));