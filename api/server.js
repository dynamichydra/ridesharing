require("dotenv").config();

const buildApp = require("./src/app");

const start = async () => {
    const app = await buildApp();

    try {
        await app.listen({
            port: process.env.PORT || 5000,
            host: process.env.HOST || "0.0.0.0",
        });

        console.log("Server running");
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
